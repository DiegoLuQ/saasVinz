import hmac
import secrets

from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, auth, schemas
from pydantic import BaseModel, EmailStr
from app.core.config import settings
from app.core.rate_limiter import limiter

router = APIRouter()

class FreeOnboardingRequest(BaseModel):
    business_name: str
    slug: str
    admin_email: EmailStr
    admin_name: str
    phone: str | None = None

def _require_onboarding_key(x_onboarding_key: str | None = Header(default=None)):
    """Endpoint servidor-a-servidor: exige la clave compartida ONBOARDING_API_KEY.
    Sin la variable configurada queda deshabilitado (antes era público y creaba
    cuentas con la contraseña fija "123456")."""
    expected = settings.ONBOARDING_API_KEY
    if not expected:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
    if not x_onboarding_key or not hmac.compare_digest(x_onboarding_key, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autorizado")


@router.post("/free")
@limiter.limit("5/minute")
def create_free_account(
    request: Request,
    data: FreeOnboardingRequest,
    db: Session = Depends(get_db),
    _key: None = Depends(_require_onboarding_key),
):
    """
    Crea una cuenta FREE de forma automatizada.
    Usado por el flujo de WhatsApp (requiere el header X-Onboarding-Key).
    """
    temp_password = secrets.token_urlsafe(9)
    # Sin sesión no hay contexto de tenant: las tablas con RLS rechazarían los inserts.
    from app.core.tenant_context import apply_bypass_rls
    apply_bypass_rls(db)
    # 1. Verificar si el slug ya existe
    existing_tenant = db.query(models.Tenant).filter(models.Tenant.slug == data.slug).first()
    if existing_tenant:
        raise HTTPException(status_code=400, detail="El identificador (slug) ya está en uso. Prueba con otro.")

    # 2. Verificar si el email ya existe
    existing_user = db.query(models.User).filter(models.User.email == data.admin_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado.")

    # 3. Buscar el Plan FREE
    free_plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.name == "FREE").first()
    if not free_plan:
        raise HTTPException(status_code=500, detail="Error de configuración: Plan FREE no encontrado en el sistema.")

    try:
        # 4. Tenant + admin + módulos + permisos (mismo camino que el admin y el
        # registro autoservicio). Antes creaba el usuario con un campo inexistente.
        from app.services.tenant_provisioning import provision_tenant
        new_tenant, new_user = provision_tenant(
            db,
            subscription_plan=free_plan,
            admin_name=data.admin_name,
            admin_password_hash=auth.get_password_hash(temp_password),  # temporal, única por cuenta
            seed_workflow=True,
            name=data.business_name,
            slug=data.slug,
            email=data.admin_email,
            phone=data.phone,
        )
        db.commit()
        db.refresh(new_tenant)
        db.refresh(new_user)

        return {
            "status": "success",
            "message": "Cuenta FREE creada exitosamente",
            "access_url": f"/login?slug={new_tenant.slug}",
            "credentials": {
                "email": new_user.email,
                "password": f"{temp_password} (Cámbiala al ingresar)"
            }
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear la cuenta: {str(e)}")


# ---------------------------------------------------------------------------
# Primeros pasos: tarjeta «Configura tu crematorio» del inicio
# ---------------------------------------------------------------------------
# Cada paso se marca solo con datos reales; no hay nada que tildar a mano. Se
# muestra al admin de los crematorios que se registraron solos o que tienen
# menos de ONBOARDING_DAYS días, hasta completarlo o cerrarlo.

from datetime import timedelta

from sqlalchemy import func as _func

from app.auth import get_current_user
from app.utils import tz

ONBOARDING_DAYS = 90


def _onboarding_steps(db: Session, tenant: models.Tenant) -> list[dict]:
    from app.api.internal.common.models import FormSubmission

    def count(model, *filters):
        return db.query(_func.count(model.id)).filter(model.tenant_id == tenant.id, *filters).scalar() or 0

    return [
        {"key": "datos", "title": "Sube tu logo y completa tus datos",
         "description": "Tu logo y contacto aparecen en certificados, seguimiento y formulario.",
         "href": "/dashboard/configuracion?tab=general",
         "done": bool(tenant.logo_url and tenant.phone and (tenant.address or tenant.city))},
        {"key": "servicios", "title": "Agrega tus servicios y precios",
         "description": "Cremación individual, comunitaria, retiro a domicilio…",
         "href": "/dashboard/gestion-servicios",
         "done": count(models.Service) + count(models.Plan) > 0},
        {"key": "flujo", "title": "Revisa las fases de tu servicio",
         "description": "Son las etapas que la familia ve en el seguimiento.",
         "href": "/dashboard/configuracion?tab=flujo",
         "done": count(models.WorkflowStep, models.WorkflowStep.is_active.is_(True)) > 0},
        {"key": "formulario", "title": "Prueba tu formulario para familias",
         "description": "Copia tu enlace y envíalo de prueba: el registro llega a tu panel.",
         "href": "/dashboard/configuracion?tab=formulario",
         "done": count(FormSubmission) > 0},
        {"key": "orden", "title": "Crea tu primera orden",
         "description": "Desde un registro del formulario o directamente en Recepción.",
         "href": "/dashboard/recepcion-pedidos",
         "done": count(models.CremationOC) > 0},
        {"key": "equipo", "title": "Invita a alguien de tu equipo",
         "description": "Cada persona con su usuario y sus permisos.",
         "href": "/dashboard/roles-modulos",
         "done": count(models.User, models.User.is_active.is_(True)) > 1},
    ]


@router.get("/progress")
def onboarding_progress(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == current_user.tenant_id).first()
    if not tenant or current_user.role != models.UserRole.admin:
        return {"show": False, "steps": [], "done": 0, "total": 0}
    steps = _onboarding_steps(db, tenant)
    done = sum(1 for s in steps if s["done"])
    created = tenant.created_at
    since = tz.get_now() - timedelta(days=ONBOARDING_DAYS)
    if created is not None and created.tzinfo is None:  # columna sin zona horaria
        since = since.replace(tzinfo=None)
    recent = bool(created and created >= since)
    eligible = tenant.signup_source == "self" or recent
    show = eligible and tenant.onboarding_dismissed_at is None and done < len(steps)
    return {"show": show, "steps": steps, "done": done, "total": len(steps)}


@router.post("/dismiss")
def dismiss_onboarding(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role != models.UserRole.admin:
        raise HTTPException(status_code=403, detail="Solo el administrador puede ocultar esta guía")
    tenant = db.query(models.Tenant).filter(models.Tenant.id == current_user.tenant_id).first()
    tenant.onboarding_dismissed_at = tz.get_now()
    db.commit()
    return {"ok": True}
