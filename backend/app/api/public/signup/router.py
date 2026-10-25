"""Registro autoservicio del plan FREE (vinzer.cl/crear-cuenta).

1. POST /signup: valida (reCAPTCHA, dirección libre, términos aceptados) y envía
   un enlace de confirmación al correo. Aún no se crea nada: los datos viajan
   cifrados en el propio enlace (Fernet, vence en CONFIRM_TTL_HOURS), así no
   quedan cuentas a medias ni hay que limpiar registros sin confirmar.
2. POST /signup/confirm (desde app.<dominio>/confirmar-cuenta): crea el
   crematorio FREE con su admin, deja la sesión iniciada y avisa al SuperAdmin.

Si el correo ya tiene cuenta, se responde igual que siempre y al correo le llega
un aviso con el enlace para recuperar la contraseña (no se revela quién está
registrado).
"""
import json
import logging
import re

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import auth, models, schemas
from app.core.rate_limiter import limiter
from app.core.tenant_context import apply_bypass_rls
from app.database import get_db
from app.services.recaptcha import verify_recaptcha
from app.services.tenant_provisioning import slug_problem, suggest_slug, provision_tenant
from app.utils import secrets_box, tz

logger = logging.getLogger(__name__)
router = APIRouter()

CONFIRM_TTL_HOURS = 48
MIN_PASSWORD_LENGTH = 8
# Versión vigente de los Términos y la Política de Privacidad (fecha de la última
# modificación). Debe coincidir con LEGAL_VERSION en frontend lib/vinzer/legal.ts.
TERMS_VERSION = "2026-10-23"
# Créditos IA (bolsillo extra, no vencen) que recibe cada crematorio al registrarse solo.
WELCOME_AI_CREDITS = 1


def _app_url() -> str:
    from app.api.internal.auth.router import _tenant_app_url
    return _tenant_app_url()


# Mismas reglas que el formulario (frontend lib/vinzer/signupFields.ts).
# Código de país de Sudamérica → (mín, máx) dígitos del número sin el código.
PHONE_RULES = {
    "+56": (9, 9), "+54": (10, 11), "+591": (8, 8), "+55": (10, 11), "+57": (10, 10), "+593": (9, 9),
    "+592": (7, 7), "+595": (9, 9), "+51": (9, 9), "+597": (7, 7), "+598": (8, 8), "+58": (10, 10),
}
EMAIL_MAX = 100
EMAIL_RE = re.compile(r"^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$")
# Nombres: texto normal; se rechazan caracteres que sirven para inyectar código.
NAME_FORBIDDEN = re.compile(r'[<>"`{}\\;=\x00-\x1f\x7f]')


class SignupRequest(BaseModel):
    business_name: str = Field(..., min_length=2, max_length=80)
    slug: str = Field(..., min_length=3, max_length=40)
    admin_name: str = Field(..., min_length=2, max_length=80)
    email: EmailStr = Field(..., max_length=EMAIL_MAX)
    phone: str = Field(..., max_length=16)
    password: str = Field(..., max_length=128)
    accept_terms: bool
    recaptcha_token: str = ""

    @field_validator("business_name", "admin_name")
    @classmethod
    def _plain_text(cls, v: str) -> str:
        v = " ".join(v.split())
        if NAME_FORBIDDEN.search(v):
            raise ValueError("Usa solo letras, números y signos comunes (sin < > \" ` { } ; =).")
        return v

    @field_validator("email", mode="before")
    @classmethod
    def _email_format(cls, v: str) -> str:
        v = str(v or "").strip().lower()
        if len(v) > EMAIL_MAX or not EMAIL_RE.match(v):
            raise ValueError("Correo inválido: usa el formato nombre@dominio.cl (máximo 100 caracteres).")
        return v

    @field_validator("phone")
    @classmethod
    def _phone_format(cls, v: str) -> str:
        v = v.replace(" ", "")
        code = next((c for c in sorted(PHONE_RULES, key=len, reverse=True) if v.startswith(c)), None)
        digits = v[len(code):] if code else ""
        if not code or not digits.isdigit() or not (PHONE_RULES[code][0] <= len(digits) <= PHONE_RULES[code][1]):
            raise ValueError("Celular inválido: elige el código de tu país y escribe solo los dígitos del número.")
        return f"{code}{digits}"


class ConfirmRequest(BaseModel):
    token: str = Field(..., max_length=4000)


@router.get("/signup/slug")
@limiter.limit("30/minute")
def check_slug(request: Request, name: str = "", slug: str = "", db: Session = Depends(get_db)):
    """Con `slug`: si está libre. Con `name`: una dirección libre sugerida."""
    if slug:
        problem = slug_problem(db, slug.strip().lower())
        return {"slug": slug, "available": problem is None, "problem": problem}
    return {"slug": suggest_slug(db, name), "available": True, "problem": None}


async def _send_confirm_email(to: str, name: str, business: str, url: str) -> None:
    from app.services.email import send_action_email
    try:
        await send_action_email(
            to, "Confirma tu cuenta de Vinzer", "Confirma tu correo",
            [f"Hola {name}:", f"Recibimos el registro de «{business}» en Vinzer. Confirma tu correo para activar tu cuenta gratuita y entrar a tu panel."],
            "Activar mi cuenta", url,
            f"El enlace vence en {CONFIRM_TTL_HOURS} horas. Si no fuiste tú, ignora este correo: no se creará ninguna cuenta.",
            kicker="Bienvenido a Vinzer",
        )
    except Exception:  # noqa: BLE001 - la respuesta es la misma; se registra el fallo
        logger.exception("No se pudo enviar el correo de confirmación de registro")


async def _send_already_registered_email(to: str) -> None:
    from app.services.email import send_action_email
    try:
        await send_action_email(
            to, "Ya tienes una cuenta en Vinzer", "Ya tienes una cuenta",
            ["Alguien intentó crear una cuenta de Vinzer con este correo, pero ya está registrado.",
             "Si fuiste tú y no recuerdas tu contraseña, puedes crear una nueva."],
            "Recuperar mi contraseña", f"{_app_url()}/olvide-contrasena",
            "Si no fuiste tú, ignora este correo: tu cuenta sigue igual.",
            kicker="Tu cuenta",
        )
    except Exception:  # noqa: BLE001
        logger.exception("No se pudo enviar el aviso de cuenta existente")


@router.post("/signup")
@limiter.limit("3/minute;15/hour")
async def signup(request: Request, data: SignupRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if not await verify_recaptcha(data.recaptcha_token):
        raise HTTPException(status_code=403, detail="Verificación de seguridad fallida. Recarga la página e inténtalo de nuevo.")
    if not data.accept_terms:
        raise HTTPException(status_code=422, detail="Debes aceptar los Términos y la Política de Privacidad.")
    if len(data.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(status_code=422, detail=f"La contraseña debe tener al menos {MIN_PASSWORD_LENGTH} caracteres.")
    slug = data.slug.strip().lower()
    problem = slug_problem(db, slug)
    if problem:
        raise HTTPException(status_code=422, detail=problem)

    email = data.email.strip().lower()
    sent_msg = {"detail": f"Te enviamos un correo a {email} para confirmar tu cuenta. Revisa también la carpeta de spam."}
    if db.query(models.User.id).filter(func.lower(models.User.email) == email).first():
        background_tasks.add_task(_send_already_registered_email, email)
        return sent_msg

    payload = {
        "v": 1, "business": data.business_name.strip(), "slug": slug, "name": data.admin_name.strip(),
        "email": email, "phone": data.phone.strip(), "pwh": auth.get_password_hash(data.password),
        "terms": TERMS_VERSION,
    }
    token = secrets_box.encrypt(json.dumps(payload))
    url = f"{_app_url()}/confirmar-cuenta?t={token}"
    background_tasks.add_task(_send_confirm_email, email, payload["name"], payload["business"], url)
    return sent_msg


async def _notify_superadmin(tenant_id: int, business: str, slug: str, name: str, email: str, phone: str) -> None:
    from app.database import SessionLocal
    from app.api.internal.common.models import Notification, NotificationPriority, RecipientType
    from app.services.email import send_action_email, notification_recipients

    db = SessionLocal()
    try:
        apply_bypass_rls(db)
        db.add(Notification(
            title=f"Nuevo crematorio registrado: {business}",
            message=f"{name} ({email}, {phone}) creó una cuenta FREE con la dirección «{slug}».",
            type="tenant_signup", recipient_type=RecipientType.admin, priority=NotificationPriority.normal,
            action_url=f"/dashboard/tenants/{slug}", data={"tenant_id": tenant_id, "slug": slug},
        ))
        db.commit()
    except Exception:  # noqa: BLE001
        logger.exception("No se pudo crear la notificación de registro")
    finally:
        db.close()
    try:
        await send_action_email(
            notification_recipients(), f"Nuevo crematorio en Vinzer: {business}", "Nuevo crematorio registrado",
            [f"Crematorio: {business} (dirección «{slug}»)", f"Responsable: {name}", f"Correo: {email}", f"Teléfono: {phone}",
             "Se registró solo en el plan FREE. Es un buen momento para escribirle y ayudarlo a empezar."],
            kicker="Nuevo registro",
        )
    except Exception:  # noqa: BLE001
        logger.exception("No se pudo enviar el aviso de nuevo registro")


@router.post("/signup/confirm", response_model=schemas.Token)
@limiter.limit("10/minute")
def confirm_signup(
    request: Request, response: Response, data: ConfirmRequest,
    background_tasks: BackgroundTasks, db: Session = Depends(get_db),
):
    raw = secrets_box.decrypt(data.token, ttl=CONFIRM_TTL_HOURS * 3600)
    try:
        p = json.loads(raw) if raw else None
    except ValueError:
        p = None
    if not p or p.get("v") != 1:
        raise HTTPException(status_code=400, detail=f"El enlace no es válido o venció ({CONFIRM_TTL_HOURS} h). Vuelve a registrarte.")

    apply_bypass_rls(db)
    existing = db.query(models.User).filter(func.lower(models.User.email) == p["email"]).first()
    if existing:
        # Segundo clic en el mismo enlace: la cuenta ya existe.
        raise HTTPException(status_code=409, detail="Tu cuenta ya está activa. Inicia sesión con tu correo y contraseña.")

    plan = db.query(models.SubscriptionPlan).filter(func.upper(models.SubscriptionPlan.name) == "FREE").first()
    if not plan:
        logger.error("Registro autoservicio: no existe el plan FREE")
        raise HTTPException(status_code=500, detail="No pudimos crear tu cuenta. Escríbenos y te ayudamos.")

    # La dirección pudo ocuparse entre el registro y la confirmación: se usa otra parecida.
    slug = p["slug"] if slug_problem(db, p["slug"]) is None else suggest_slug(db, p["slug"])
    tenant, admin = provision_tenant(
        db,
        subscription_plan=plan,
        admin_name=p["name"],
        admin_password_hash=p["pwh"],
        seed_workflow=True,
        name=p["business"],
        slug=slug,
        email=p["email"],
        phone=p["phone"],
        signup_source="self",
        family_notices={"on_finish": True},  # agradecimiento + encuesta al concluir
        terms_accepted_at=tz.get_now(),
        terms_version=p.get("terms"),
    )
    db.commit()
    db.refresh(admin)

    # Regalo de bienvenida: créditos IA para probar la ilustración de su primera mascota.
    if WELCOME_AI_CREDITS > 0:
        from app.services import ai_credits
        try:
            ai_credits.grant_extra(db, tenant, WELCOME_AI_CREDITS, reason="gift",
                                   note="Bienvenida: crédito para probar el diseño con IA", user_id=None)
        except Exception:  # noqa: BLE001 - el registro no falla por el regalo
            db.rollback()
            logger.exception("No se pudo regalar el crédito IA de bienvenida")

    admin.last_seen_at = tz.get_now()
    db.commit()
    access_token = auth.create_access_token_for_user(admin)
    refresh_token = auth.create_refresh_token(db, admin, request)
    auth.set_auth_cookies(response, access_token, refresh_token)
    background_tasks.add_task(_notify_superadmin, tenant.id, tenant.name, tenant.slug, admin.name, admin.email, tenant.phone or "")
    return {"access_token": access_token, "token_type": "bearer", "user": admin}
