"""Avisos a la familia y encuesta de satisfacción.

- Al entrar la orden a una fase con `notify_family` se envía un correo a la
  familia (correo del cliente) con la marca del crematorio y el link de
  seguimiento. Al concluir, si el crematorio lo activó (`sys_tenants.family_notices
  .on_finish`), un correo de agradecimiento con la encuesta.
- El operador también puede avisar por WhatsApp desde la orden: se arma el
  mensaje con el link y se abre wa.me (sin API de Meta); queda registrado.
- Cada aviso queda en ops_family_notices (no se repite el correo automático de
  la misma fase). El plan puede apagarlo con la característica
  `operaciones:avisos_familia` (sin marcar = incluido).

Los correos salen de la cuenta de Vinzer con la marca del crematorio y las
respuestas llegan al correo del crematorio (Reply-To).
"""
from __future__ import annotations

import logging
from urllib.parse import quote, urlparse

from sqlalchemy.orm import Session

from app import models
from app.core.config import settings

logger = logging.getLogger(__name__)

FEATURE_KEY = "operaciones:avisos_familia"


def feature_on(tenant) -> bool:
    plan = tenant.effective_plan if tenant else None
    features = plan.features if plan is not None and isinstance(plan.features, dict) else {}
    value = features.get(FEATURE_KEY)
    return value if isinstance(value, bool) else True


def notices_config(tenant) -> dict:
    cfg = tenant.family_notices if tenant is not None and isinstance(tenant.family_notices, dict) else {}
    return {"on_finish": bool(cfg.get("on_finish", False))}


def _tracking_base() -> str:
    if settings.TRACKING_BASE_URL:
        return settings.TRACKING_BASE_URL.rstrip("/")
    parsed = urlparse(settings.FRONTEND_URL)
    host = parsed.netloc[4:] if parsed.netloc.startswith("www.") else parsed.netloc
    return f"{parsed.scheme or 'https'}://track.{host}"


def tracking_url(tenant, cremation) -> str | None:
    token = cremation.details.tracking_token if cremation.details else None
    if not token:
        return None
    pet = quote((cremation.pet.name if cremation.pet else "") or "mascota")
    return f"{_tracking_base()}/{tenant.slug}/track/{pet}/{token}"


def _social(tenant) -> list[dict]:
    sm = tenant.social_media if isinstance(tenant.social_media, dict) else {}
    return [{"name": k.capitalize(), "link": v} for k, v in sm.items()
            if k in ("instagram", "facebook", "tiktok") and isinstance(v, str) and v.strip()]


def _show_brand(tenant) -> bool:
    from app.services.plan_features import show_vinzer_brand
    return show_vinzer_brand(tenant)


def tenant_brand(tenant) -> dict:
    """Marca del crematorio para la plantilla de correo (email.render_vinzer_email)."""
    sm = tenant.social_media if isinstance(tenant.social_media, dict) else {}
    web = (sm.get("website") or "").strip()
    if web and not web.startswith(("http://", "https://")):
        web = "https://" + web
    return {
        "name": tenant.name, "logo": tenant.logo_url or None, "eslogan": None,
        "whatsapp": tenant.phone or None, "correo": tenant.email or None,
        "web": web or None, "redes": _social(tenant), "powered_by": _show_brand(tenant),
    }


def _customer(cremation):
    return cremation.pet.customer if cremation.pet and cremation.pet.customer else None


def _first_name(name: str | None) -> str:
    return (name or "").strip().split(" ")[0]


def _already_sent(db: Session, cremation_id: int, kind: str, step_id: int | None) -> bool:
    q = db.query(models.FamilyNotice.id).filter(
        models.FamilyNotice.cremation_id == cremation_id,
        models.FamilyNotice.kind == kind,
        models.FamilyNotice.channel == "email",
    )
    if step_id is not None:
        q = q.filter(models.FamilyNotice.step_id == step_id)
    return q.first() is not None


def _record(db: Session, cremation, kind: str, channel: str, sent_to: str | None, step_id=None, user_id=None) -> None:
    db.add(models.FamilyNotice(
        tenant_id=cremation.tenant_id, cremation_id=cremation.id, step_id=step_id,
        kind=kind, channel=channel, sent_to=(sent_to or "")[:255] or None, created_by=user_id,
    ))
    db.commit()


async def _send(tenant, to: str, subject: str, title: str, paragraphs: list[str], button: str, url: str | None, footer: str) -> None:
    from app.services.email import send_action_email
    await send_action_email(
        to, subject, title, paragraphs, button if url else None, url, footer,
        kicker=tenant.name, brand=tenant_brand(tenant), reply_to=tenant.email or None,
    )


def _load(db: Session, cremation_id: int):
    from sqlalchemy.orm import joinedload
    return db.query(models.Cremation).options(
        joinedload(models.Cremation.pet).joinedload(models.Pet.customer),
        joinedload(models.Cremation.details),
        joinedload(models.Cremation.tenant),
    ).filter(models.Cremation.id == cremation_id).first()


async def send_step_email(db: Session, cremation_id: int, step_id: int, user_id: int | None = None, force: bool = False) -> dict:
    """Correo «tu servicio avanzó a la fase X». `force` = reenvío manual desde la orden."""
    cremation = _load(db, cremation_id)
    step = db.query(models.WorkflowStep).filter(models.WorkflowStep.id == step_id).first()
    if not cremation or not step:
        return {"sent": False, "reason": "not_found"}
    tenant = cremation.tenant
    customer = _customer(cremation)
    if not feature_on(tenant):
        return {"sent": False, "reason": "plan"}
    if not force and not step.notify_family:
        return {"sent": False, "reason": "step_off"}
    if not customer or not (customer.email or "").strip():
        return {"sent": False, "reason": "no_email"}
    if not force and _already_sent(db, cremation.id, "step", step.id):
        return {"sent": False, "reason": "already_sent"}

    pet = cremation.pet.name if cremation.pet else "tu mascota"
    url = tracking_url(tenant, cremation)
    await _send(
        tenant, customer.email.strip(),
        f"{pet}: {step.name} · {tenant.name}",
        f"Novedades sobre {pet}",
        [f"Hola {_first_name(customer.name)}:".replace("Hola :", "Hola:"),
         f"Te contamos que el servicio de {pet} avanzó a la etapa «{step.name}».",
         "En el enlace de seguimiento puedes ver cada paso del proceso, con sus horarios y, cuando corresponda, fotos y notas de nuestro equipo."],
        "Ver el seguimiento", url,
        f"Recibes este correo porque {tenant.name} atiende el servicio de {pet}. Si tienes dudas, responde este correo.",
    )
    _record(db, cremation, "step", "email", customer.email, step.id, user_id)
    return {"sent": True, "to": customer.email}


async def send_finish_email(db: Session, cremation_id: int, user_id: int | None = None, force: bool = False) -> dict:
    """Correo de agradecimiento con el enlace a la encuesta, al concluir la orden."""
    cremation = _load(db, cremation_id)
    if not cremation:
        return {"sent": False, "reason": "not_found"}
    tenant = cremation.tenant
    customer = _customer(cremation)
    if not feature_on(tenant):
        return {"sent": False, "reason": "plan"}
    if not force and not notices_config(tenant)["on_finish"]:
        return {"sent": False, "reason": "finish_off"}
    if not customer or not (customer.email or "").strip():
        return {"sent": False, "reason": "no_email"}
    if not force and _already_sent(db, cremation.id, "finish", None):
        return {"sent": False, "reason": "already_sent"}

    pet = cremation.pet.name if cremation.pet else "tu mascota"
    url = tracking_url(tenant, cremation)
    await _send(
        tenant, customer.email.strip(),
        f"Gracias por confiarnos a {pet} · {tenant.name}",
        f"Gracias por confiarnos a {pet}",
        [f"Hola {_first_name(customer.name)}:".replace("Hola :", "Hola:"),
         f"Hemos concluido el servicio de {pet}. Sabemos que es un momento difícil y agradecemos que nos hayas permitido acompañarte.",
         "Nos ayudaría mucho saber cómo fue tu experiencia: es una sola pregunta y toma menos de un minuto."],
        "Contar mi experiencia", f"{url}?encuesta=1" if url else None,
        f"Recibes este correo porque {tenant.name} atendió el servicio de {pet}. Si tienes dudas, responde este correo.",
    )
    _record(db, cremation, "finish", "email", customer.email, None, user_id)
    return {"sent": True, "to": customer.email}


def _wa_phone(raw: str | None) -> str | None:
    digits = "".join(ch for ch in (raw or "") if ch.isdigit())
    if len(digits) == 9 and digits.startswith("9"):  # celular chileno sin código
        digits = "56" + digits
    return digits if len(digits) >= 10 else None


def whatsapp_message(db: Session, cremation_id: int, step_id: int | None) -> dict:
    """Mensaje y enlace wa.me para avisar a la familia desde la orden."""
    cremation = _load(db, cremation_id)
    if not cremation:
        return {"url": None, "reason": "not_found"}
    tenant = cremation.tenant
    customer = _customer(cremation)
    phone = _wa_phone(customer.phone if customer else None)
    if not phone:
        return {"url": None, "reason": "no_phone"}
    step = db.query(models.WorkflowStep).filter(models.WorkflowStep.id == step_id).first() if step_id else None
    pet = cremation.pet.name if cremation.pet else "tu mascota"
    url = tracking_url(tenant, cremation)
    hello = f"Hola {_first_name(customer.name)}".strip() if customer else "Hola"
    if cremation.status in ("entregado", "completado"):
        body = f"{hello}, te escribimos de {tenant.name}. Hemos concluido el servicio de {pet}. Gracias por confiar en nosotros."
    elif step:
        body = f"{hello}, te escribimos de {tenant.name}. El servicio de {pet} avanzó a la etapa «{step.name}»."
    else:
        body = f"{hello}, te escribimos de {tenant.name} sobre el servicio de {pet}."
    if url:
        body += f" Puedes seguirlo aquí: {url}"
    return {"url": f"https://wa.me/{phone}?text={quote(body)}", "phone": phone, "message": body}


def record_whatsapp(db: Session, cremation_id: int, step_id: int | None, user_id: int | None) -> None:
    cremation = _load(db, cremation_id)
    if cremation:
        customer = _customer(cremation)
        kind = "finish" if cremation.status in ("entregado", "completado") else "step"
        _record(db, cremation, kind, "whatsapp", customer.phone if customer else None, step_id, user_id)


async def notify_in_background(cremation_id: int, step_id: int | None, finished: bool, user_id: int | None) -> None:
    """Tarea de fondo tras avanzar / concluir una orden (sesión propia, sin RLS)."""
    from app.core.tenant_context import apply_bypass_rls
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        apply_bypass_rls(db)
        if finished:
            result = await send_finish_email(db, cremation_id, user_id)
        else:
            result = await send_step_email(db, cremation_id, step_id, user_id)
        if result.get("sent"):
            logger.info("Aviso a la familia enviado (orden %s): %s", cremation_id, result)
    except Exception:  # noqa: BLE001 - un fallo del correo nunca debe afectar la orden
        logger.exception("No se pudo enviar el aviso a la familia (orden %s)", cremation_id)
    finally:
        db.close()
