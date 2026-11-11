"""Avisos a la familia (etapas y agradecimiento final).

- Al avanzar de fase el panel pregunta (modal, manual) si avisar a la familia:
  correo con la foto de la mascota, la etapa, la hora, la marca del crematorio, el
  link de seguimiento y su catálogo de productos (si tiene), o WhatsApp si no hay
  correo. Ya no se envía solo al avanzar. Al concluir, si el crematorio lo activó (`sys_tenants.family_notices
  .on_finish`), un correo de agradecimiento que invita a dejar una reseña en Google
  (si el crematorio tiene el enlace; ya no hay encuesta).
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
    address_parts = [p.strip() for p in (getattr(tenant, "address", None), getattr(tenant, "city", None)) if p and p.strip()]
    address_line = ", ".join(address_parts) if address_parts else None
    return {
        "name": tenant.name, "logo": tenant.logo_url or None, "eslogan": None,
        "whatsapp": tenant.phone or None, "correo": tenant.email or None,
        "address": address_line,
        "web": web or None, "redes": _social(tenant), "powered_by": _show_brand(tenant),
    }


def _no_reply_note(tenant) -> str:
    """Pie de los avisos automáticos: no se responden; se indica cómo contactar al crematorio."""
    ways = []
    if (tenant.phone or "").strip():
        ways.append(f"por WhatsApp o teléfono al {tenant.phone.strip()}")
    if (tenant.email or "").strip():
        ways.append(f"al correo {tenant.email.strip()}")
    contact = f"contacta a {tenant.name} " + " o ".join(ways) if ways else f"contacta directamente a {tenant.name}"
    return f"Este es un mensaje automático, por favor no lo respondas. Si tienes dudas, {contact}."


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


MAX_MESSAGE = 1000


def default_step_message(customer_name: str | None, pet: str, step_name: str) -> str:
    """Mensaje que el panel propone (editable) al avanzar de etapa."""
    hello = f"Hola {_first_name(customer_name)}".strip()
    return (f"{hello}, te contamos con mucho cariño que el servicio de {pet} avanzó a la etapa «{step_name}». "
            "Cada paso lo cuidamos con el respeto y la dedicación que merece.")


def _clean_message(message: str | None) -> str | None:
    text = (message or "").strip()
    return text[:MAX_MESSAGE] if text else None


async def send_step_email(db: Session, cremation_id: int, step_id: int, user_id: int | None = None, force: bool = False,
                          message: str | None = None) -> dict:
    """Correo «tu servicio avanzó a la fase X». `force` = aviso manual desde la orden;
    `message` = texto escrito en el panel (reemplaza el saludo y el primer párrafo)."""
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
    from app.services.email import send_action_email
    await send_action_email(
        customer.email.strip(),
        f"{pet}: {step.name} · {tenant.name}",
        f"Seguimos acompañando a {pet}",
        [*([p.strip() for p in _clean_message(message).split("\n") if p.strip()] if _clean_message(message) else
           [f"Hola {_first_name(customer.name)}:".replace("Hola :", "Hola:"),
            f"Queremos contarte, con mucho cariño, que el servicio de {pet} avanzó a una nueva etapa. "
            "Cada paso lo cuidamos con el respeto y la dedicación que merece."]),
         "Sabemos que no es un momento fácil. Puedes seguir el proceso cuando lo necesites desde el enlace de "
         "seguimiento, donde verás cada etapa con su horario y, cuando corresponda, fotos y notas de nuestro equipo.",
         "Estamos aquí para lo que necesites."],
        "Ver el seguimiento de " + pet, url,
        f"Recibes este correo porque {tenant.name} atiende el servicio de {pet}. {_no_reply_note(tenant)}",
        kicker=tenant.name, brand=tenant_brand(tenant), reply_to=tenant.email or None,
        highlight={"label": "Etapa actual", "value": step.name, "meta": _now_text(db, tenant.id)},
        image_url=pet_photo(cremation),
        products=_catalog_block(db, tenant, pet, cremation.details.tracking_token if cremation.details else None),
    )
    _record(db, cremation, "step", "email", customer.email, step.id, user_id)
    return {"sent": True, "to": customer.email}


async def send_finish_email(db: Session, cremation_id: int, user_id: int | None = None, force: bool = False) -> dict:
    """Correo de agradecimiento y entrega formal con enlace de seguimiento y reseña de Google."""
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

    sm = tenant.social_media if isinstance(tenant.social_media, dict) else {}
    google_review_url = (sm.get("google_review") or "").strip()

    review_card = None
    if google_review_url:
        city_phrase = f"de {tenant.city.strip()} " if getattr(tenant, "city", None) and tenant.city.strip() else ""
        review_card = {
            "title": "¿Te brindamos tranquilidad en este proceso?",
            "text": (
                f"Cuando tengas un momento de calma, compartir tu experiencia o una foto de sus recuerdos en Google "
                f"ayudará a otras familias {city_phrase}a despedir a sus compañeros con confianza."
            ),
            "button_label": "💬 Compartir mi opinión en Google",
            "url": google_review_url,
            "stars": "⭐ ⭐ ⭐ ⭐ ⭐",
        }

    first_name = _first_name(customer.name)
    greeting = f"Hola, {first_name}:" if first_name else "Hola:"

    paragraphs = [
        greeting,
        f"Te escribimos con profundo respeto y gratitud para contarte que hemos completado formalmente la entrega del ánfora y los recuerdos de {pet}.",
        f"Agradecemos de corazón la confianza que depositaste en nosotros en un momento tan sensible. Cuidamos a {pet} con la máxima dedicación, cariño y transparencia en cada etapa del camino, y esperamos haber sido un verdadero apoyo y consuelo para tu familia.",
        "Para que conserves su memoria intacta, en el siguiente enlace podrás descargar su Certificado Oficial de Cremación, su fotografía conmemorativa en alta resolución y volver a ver el registro completo de su homenaje cuando lo desees:",
    ]

    button_label = f"🐾 Ver recuerdos y certificado de {pet}" if url else None
    footer = f"Con todo nuestro cariño y respeto,\nEl equipo de {tenant.name}."

    from app.services.email import send_action_email
    await send_action_email(
        to=customer.email.strip(),
        subject=f"{pet} ya descansa en casa · {tenant.name}",
        title=f"{pet} ya descansa en casa",
        paragraphs=paragraphs,
        button_label=button_label,
        button_url=url,
        footer=footer,
        kicker=f"Servicio conmemorativo completado · {tenant.name}",
        brand=tenant_brand(tenant),
        reply_to=tenant.email or None,
        image_url=pet_photo(cremation),
        preheader="Servicio conmemorativo completado con amor y respeto.",
        review_card=review_card,
    )
    _record(db, cremation, "finish", "email", customer.email, None, user_id)
    return {"sent": True, "to": customer.email}


def pet_photo(cremation) -> str | None:
    """Foto principal de la mascota (URL absoluta) o None."""
    pet = cremation.pet
    if not pet:
        return None
    for u in [pet.image_url, *((pet.images or []) if isinstance(pet.images, list) else [])]:
        if isinstance(u, str) and u.startswith(("http://", "https://")):
            return u
    return None


def _now_text(db: Session, tenant_id: int) -> str:
    from app.utils.time import get_tenant_now
    return get_tenant_now(db, tenant_id).strftime("%d-%m-%Y · %H:%M hrs")


def _catalog_block(db: Session, tenant, pet: str, ref: str | None = None) -> dict | None:
    """Catálogo de productos al final del correo; None si el crematorio no tiene."""
    try:
        from app.services import official_links
        url = official_links.with_ref(official_links.products_catalog_url(db, tenant), ref)
        if not url:
            return None
        from app.services.form_submission_notifications import format_clp
        # Solo 3 (más vendido + categorías distintas): el correo no se alarga en el celular
        items = official_links.souvenir_products(db, tenant.id, limit=3, diverse=True)
        return {
            "title": f"Recuerdos para honrar a {pet}",
            "subtitle": f"Si lo deseas, puedes revisar con calma los relicarios y recuerdos para llevar a {pet} siempre cerca.",
            "items": [{"name": p.name, "price": format_clp(p.sale_price) if (p.sale_price or 0) > 0 else "",
                       "image_url": p.image_url} for p in items],
            "button_label": "Ver catálogo completo de recuerdos",
            "url": url,
            "soft": True,
        }
    except Exception:  # noqa: BLE001 - el catálogo es opcional
        logger.warning("No se pudo armar el catálogo del aviso (tenant %s)", tenant.id, exc_info=True)
        return None


def _wa_phone(raw: str | None) -> str | None:
    digits = "".join(ch for ch in (raw or "") if ch.isdigit())
    if len(digits) == 9 and digits.startswith("9"):  # celular chileno sin código
        digits = "56" + digits
    return digits if len(digits) >= 10 else None


def whatsapp_message(db: Session, cremation_id: int, step_id: int | None, message: str | None = None) -> dict:
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
    if _clean_message(message):
        body = _clean_message(message)
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
