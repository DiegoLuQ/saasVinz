import hashlib
import logging
from urllib.parse import urlparse
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.internal.partners.models import Veterinary
from pydantic import BaseModel, EmailStr
from app.auth import verify_password, create_access_token, get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
from app.core.config import settings
from app.core.rate_limiter import limiter
from datetime import timedelta
from typing import Optional

router = APIRouter()

# --- Sesión del portal (cookie httpOnly) ---

VET_SESSION_COOKIE = "vet_token"  # mismo nombre que lee el middleware de Next


def issue_vet_session_token(vet: Veterinary) -> str:
    """JWT de sesión; `ver` permite invalidarlo al cambiar la contraseña."""
    return create_access_token(
        data={"sub": str(vet.id), "role": "veterinary_global", "slug": vet.slug, "ver": vet.token_version or 0},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def set_vet_session_cookie(response: Response, token: str) -> None:
    """Host-only (veterinary.*), httpOnly, SameSite=Lax; Secure solo en producción (dev corre en http)."""
    response.set_cookie(
        VET_SESSION_COOKIE, token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/", httponly=True, secure=settings.IS_PRODUCTION, samesite="lax",
    )


def _session_invalid(detail: str) -> HTTPException:
    # Borra la cookie en la misma respuesta: evita el bucle login <-> dashboard
    # cuando el middleware ve una cookie que el backend ya no acepta.
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={
            "WWW-Authenticate": "Bearer",
            "Set-Cookie": f"{VET_SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
        },
    )


class VeterinaryLogin(BaseModel):
    email: EmailStr
    password: str

@router.post("/auth/login", tags=["Veterinary - Auth"])
@limiter.limit(settings.RATE_LIMIT_LOGIN)  # antes sin límite: permitía fuerza bruta
def login_for_access_token(
    request: Request,
    response: Response,
    login_data: VeterinaryLogin,
    db: Session = Depends(get_db)
):
    """
    Login endpoint for Global Veterinary Portal.
    """
    vet = db.query(Veterinary).filter(
        Veterinary.email == login_data.email,
        Veterinary.is_active == True
    ).first()
    
    if not vet:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not verify_password(login_data.password, vet.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Sesión en cookie httpOnly (el JWT ya no se entrega a JavaScript).
    set_vet_session_cookie(response, issue_vet_session_token(vet))

    return {
        "veterinary": {
            "id": vet.id,
            "name": vet.name,
            "slug": vet.slug,
            "email": vet.email
        }
    }

# --- Dependencies ---
# --- Recuperación de contraseña ---

logger = logging.getLogger(__name__)

RESET_TOKEN_MINUTES = 30
RESET_ROLE = "vet_password_reset"  # distinto de "veterinary_global": no sirve como sesión
MIN_PASSWORD_LENGTH = 8
_GENERIC_FORGOT_MSG = "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña."


def _password_fingerprint(password_hash: str) -> str:
    """Huella del hash actual: el enlace deja de valer apenas cambia la contraseña (uso único)."""
    return hashlib.sha256((password_hash or "").encode()).hexdigest()[:16]


def _vet_portal_url() -> str:
    if settings.VETERINARY_PORTAL_URL:
        return settings.VETERINARY_PORTAL_URL.rstrip("/")
    parsed = urlparse(settings.FRONTEND_URL)
    host = parsed.netloc
    if host.startswith("www."):
        host = host[4:]
    return f"{parsed.scheme or 'https'}://veterinary.{host}"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


async def _send_reset_email(to_email: str, name: str, url: str) -> None:
    from app.services.email import send_vet_password_reset_email
    try:
        await send_vet_password_reset_email(to_email, name, url)
    except Exception:  # noqa: BLE001 - el endpoint responde igual; se registra el fallo
        logger.exception("No se pudo enviar el correo de restablecimiento de contraseña (veterinaria)")


@router.post("/auth/forgot-password", tags=["Veterinary - Auth"])
@limiter.limit("5/minute")
def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Envía un enlace para restablecer la contraseña. Responde lo mismo exista o
    no el correo, para no revelar qué veterinarias están registradas.
    """
    vet = db.query(Veterinary).filter(
        func.lower(Veterinary.email) == data.email.strip().lower(),
        Veterinary.is_active == True,  # noqa: E712
    ).first()
    if vet:
        token = create_access_token(
            data={"sub": str(vet.id), "role": RESET_ROLE, "pwh": _password_fingerprint(vet.password_hash)},
            expires_delta=timedelta(minutes=RESET_TOKEN_MINUTES),
        )
        url = f"{_vet_portal_url()}/restablecer?token={token}"
        background_tasks.add_task(_send_reset_email, vet.email, vet.name, url)
    return {"detail": _GENERIC_FORGOT_MSG}


@router.post("/auth/reset-password", tags=["Veterinary - Auth"])
@limiter.limit("10/minute")
def reset_password(
    request: Request,
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Define una nueva contraseña con el enlace del correo (30 min, uso único)."""
    invalid = HTTPException(status_code=400, detail="El enlace no es válido o ya venció.")
    payload = decode_access_token(data.token)
    if not payload or payload.get("role") != RESET_ROLE or not payload.get("sub"):
        raise invalid
    if len(data.new_password or "") < MIN_PASSWORD_LENGTH:
        raise HTTPException(status_code=422, detail=f"La contraseña debe tener al menos {MIN_PASSWORD_LENGTH} caracteres.")

    vet = db.query(Veterinary).filter(Veterinary.id == int(payload["sub"])).first()
    if not vet or not vet.is_active or payload.get("pwh") != _password_fingerprint(vet.password_hash):
        raise invalid

    vet.password_hash = get_password_hash(data.new_password)
    vet.token_version = (vet.token_version or 0) + 1  # cierra las sesiones abiertas
    db.commit()
    return {"detail": "Contraseña actualizada. Ya puedes ingresar con tu nueva contraseña."}


from sqlalchemy import func
from sqlalchemy.orm import joinedload
from app.auth import oauth2_scheme, decode_access_token
from app.core.tenant_context import apply_bypass_rls
from app.api.internal.partners.schemas import PartnerLinkResponse
from app import schemas, models
from app.api.internal.partners.models import PartnerLinkV2, PartnerCommission
from app.api.internal.common.models import Notification

def get_current_veterinary(
    request: Request,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
):
    """
    Sesión del portal veterinario (única fuente; el router del dashboard la
    reutiliza). Token por header Authorization (precedencia; scripts/tests) o
    por la cookie httpOnly `vet_token`.

    - Rechaza veterinarias desactivadas y sesiones de una versión anterior de
      la contraseña (`ver` != token_version).
    - Activa bypass de RLS: ptn_partner_links, comisiones y órdenes son tablas
      de tenant y la veterinaria no tiene tenant. TODAS las consultas del
      portal deben filtrar explícitamente por la veterinaria.
    """
    token = token or request.cookies.get(VET_SESSION_COOKIE)
    payload = decode_access_token(token) if token else None
    if not payload or payload.get("role") != "veterinary_global" or not payload.get("sub"):
        raise _session_invalid("Sesión de veterinaria inválida")

    apply_bypass_rls(db)
    vet = db.query(Veterinary).filter(Veterinary.id == int(payload["sub"])).first()
    if not vet or not vet.is_active:
        raise _session_invalid("Cuenta de veterinaria no disponible")
    if int(payload.get("ver", 0)) != (vet.token_version or 0):
        raise _session_invalid("La sesión expiró. Vuelve a ingresar.")
    return vet


@router.post("/auth/logout", tags=["Veterinary - Auth"])
def logout_veterinary(response: Response):
    """Cierra la sesión: borra la cookie httpOnly (JavaScript no puede hacerlo)."""
    response.delete_cookie(VET_SESSION_COOKIE, path="/")
    return {"detail": "Sesión cerrada"}

# --- Consolidated Bootstrap ---
@router.get("/auth/bootstrap", response_model=schemas.VeterinaryBootstrapResponse, tags=["Veterinary - Auth"])
def get_bootstrap_veterinary(
    db: Session = Depends(get_db),
    current_vet: Veterinary = Depends(get_current_veterinary)
):
    """
    Consolidated bootstrap data for Veterinary Portal.
    Returns profile, linked tenants, and commissions in a single request.
    """
    # 1. Vínculos con crematorios: todos los estados (las invitaciones pendientes
    #    deben verse para poder aceptarlas); los contadores usan solo los activos.
    all_links = db.query(PartnerLinkV2).options(
        joinedload(PartnerLinkV2.tenant)
    ).filter(
        PartnerLinkV2.veterinary_id == current_vet.id
    ).order_by(PartnerLinkV2.created_at.desc()).all()
    active_links = [L for L in all_links if getattr(L.status, "value", L.status) == "active"]

    # 2. Comisiones (últimas 50) y totales pendiente / pagado.
    link_ids = [L.id for L in all_links]
    commissions = []
    total_pending = 0.0
    total_paid = 0.0

    if link_ids:
        commissions = db.query(PartnerCommission).filter(
            PartnerCommission.partner_link_id.in_(link_ids)
        ).order_by(PartnerCommission.created_at.desc()).limit(50).all()

        for st, amount in db.query(
            PartnerCommission.status, func.sum(PartnerCommission.amount)
        ).filter(
            PartnerCommission.partner_link_id.in_(link_ids)
        ).group_by(PartnerCommission.status).all():
            value = str(getattr(st, "value", st)).lower()
            if value == "pendiente":
                total_pending = float(amount or 0)
            elif value == "pagado":
                total_paid = float(amount or 0)

    # 3. Notificaciones no leídas DE ESTA veterinaria (antes filtraba por un
    #    campo inexistente, creator_only, y el bootstrap respondía 500).
    notifications = db.query(Notification).filter(
        Notification.veterinary_id == current_vet.id,
        Notification.recipient_type == models.RecipientType.veterinary,
        Notification.is_read == False,  # noqa: E712
    ).order_by(Notification.created_at.desc()).limit(10).all()

    return schemas.VeterinaryBootstrapResponse(
        user=schemas.BootstrapUserData(
            id=current_vet.id,
            email=current_vet.email,
            name=current_vet.name,
            role=models.UserRole.admin, # Placeholder as vets don't have standard roles
            is_active=current_vet.is_active,
            tenant_id=0,
            created_at=current_vet.created_at if hasattr(current_vet, 'created_at') else tz.get_now()
        ),
        veterinary=schemas.CreatorBootstrapVeterinary.model_validate(current_vet),
        links=[PartnerLinkResponse.model_validate(L) for L in all_links],
        commissions=[schemas.PartnerCommissionInDB.model_validate(c) for c in commissions],
        notifications=[schemas.NotificationInDB.model_validate(n) for n in notifications],
        metadata=schemas.BootstrapMetadata(
            unread_notifications=len(notifications),
            total_commission_pending=total_pending,
            total_commission_paid=total_paid,
            active_links_count=len(active_links)
        )
    )
