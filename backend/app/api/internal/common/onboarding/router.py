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
        # 4. Crear Tenant
        new_tenant = models.Tenant(
            name=data.business_name,
            slug=data.slug,
            email=data.admin_email,
            phone=data.phone,
            subscription_plan_id=free_plan.id,
            plan="FREE", # Legacy field
            status=models.TenantStatus.active,
        )
        db.add(new_tenant)
        db.flush() # Para obtener el ID

        # 5. Crear Usuario Admin
        new_user = models.User(
            name=data.admin_name,
            email=data.admin_email,
            hashed_password=auth.get_password_hash(temp_password),  # temporal, única por cuenta
            role=models.UserRole.admin,
            tenant_id=new_tenant.id,
            is_active=True
        )
        db.add(new_user)
        
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
