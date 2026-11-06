"""Vencimiento de los memoriales con plan anual (Recuerdo, Eterno; también Partner con vigencia).

- `is_expired`: pago único nunca vence; si no, vence con status expired o valid_until pasado.
- Vista reducida (`reduce_public_view`): el memorial no desaparece; mientras está vencido el
  público ve solo `expired_images` fotos y los `expired_dedications` mensajes más recientes
  (límites del plan, editables en Admin). Nada se borra: al renovar vuelve todo.
- Aviso por correo 1 mes antes (`send_expiry_notices`, desde el scheduler diario de memoriales):
  una sola vez por vigencia (`rec_recuerdos.expiry_notice_for` = valid_until avisado).
- Renovación desde Admin (`renew`): +1 año desde la vigencia actual (o desde hoy si ya venció),
  al precio congelado del memorial.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

from sqlalchemy.orm import Session, joinedload

from app import models
from app.api.internal.memorials import models as mem_models
from app.services import memorial_plans

logger = logging.getLogger(__name__)

NOTICE_DAYS = 30


def _naive(dt: datetime | None) -> datetime | None:
    return dt.replace(tzinfo=None) if dt is not None and dt.tzinfo else dt


def is_expired(memorial: mem_models.Memorial, now: datetime | None = None) -> bool:
    if memorial.plan_billing == memorial_plans.BILLING_ONE_TIME:
        return False
    status = getattr(memorial.status, "value", memorial.status)
    if status == "expired":
        return True
    vu = _naive(memorial.valid_until)
    return bool(vu and vu < (now or datetime.now()))


def reduce_public_view(resp, features: dict) -> None:
    """Recorta (en la respuesta, no en la base) fotos y mensajes de un memorial vencido."""
    n_img = max(0, int(features.get("expired_images", 3)))
    n_ded = max(0, int(features.get("expired_dedications", 5)))
    imgs = list(resp.lista_imagenes or [])
    if resp.main_image_url and resp.main_image_url in imgs:
        imgs.remove(resp.main_image_url)
        imgs.insert(0, resp.main_image_url)
    resp.lista_imagenes = imgs[:n_img]
    if resp.mascota is not None:
        pet_imgs = list(resp.mascota.images or [])
        resp.mascota.images = [i for i in pet_imgs if i in resp.lista_imagenes] or pet_imgs[:n_img]
    deds = sorted(resp.dedicatorias or [], key=lambda d: d.fecha, reverse=True)
    resp.dedicatorias = deds[:n_ded]
    resp.dedications_count = len(resp.dedicatorias)
    from app.services.memorial_timeline import EXPIRED_MOMENTS
    resp.timeline = list(resp.timeline or [])[:EXPIRED_MOMENTS]
    resp.videos, resp.voices = [], []
    resp.expired = True


def _plan_label(db: Session, m: mem_models.Memorial) -> str:
    plan = memorial_plans.plan_of(db, m)
    name = plan.name if plan else (m.plan or "")
    if m.plan_price:
        return f"{name} · {m.plan_price:g} {m.plan_currency or 'USD'} / año"
    return name


async def send_expiry_notices(db: Session) -> int:
    """Correo a la familia 30 días antes del vencimiento (planes anuales de Vinzer)."""
    from app.api.internal.common.models import Notification, NotificationPriority, RecipientType
    from app.services.email import send_action_email
    from app.services.memorial_notifications import _memorial_base_url, build_memorial_urls
    from app.services.memorial_signup import _whatsapp_link

    now = datetime.now()
    rows = db.query(mem_models.Memorial).options(
        joinedload(mem_models.Memorial.pet).joinedload(models.Pet.customer),
        joinedload(mem_models.Memorial.tenant),
    ).filter(
        mem_models.Memorial.status == mem_models.MemorialStatus.active,
        mem_models.Memorial.plan_billing == memorial_plans.BILLING_YEARLY,
        mem_models.Memorial.valid_until.isnot(None),
        mem_models.Memorial.valid_until > now,
        mem_models.Memorial.valid_until <= now + timedelta(days=NOTICE_DAYS),
    ).all()

    sent = 0
    for m in rows:
        if m.expiry_notice_for and _naive(m.expiry_notice_for) == _naive(m.valid_until):
            continue
        customer = m.pet.customer if m.pet else None
        pet_name = m.pet.name if m.pet else "tu mascota"
        date_txt = _naive(m.valid_until).strftime("%d/%m/%Y")
        label = _plan_label(db, m)
        if customer and customer.email:
            urls = build_memorial_urls(m, m.tenant) if m.tenant else {}
            wa = _whatsapp_link(db, f"Hola, quiero renovar el memorial de {pet_name} (plan {label}). ID: {m.id_recuerdo}")
            try:
                await send_action_email(
                    to=customer.email,
                    subject=f"🕯️ El memorial de {pet_name} vence el {date_txt}",
                    title=f"La luz de {pet_name} sigue encendida",
                    paragraphs=[
                        f"Hola {(customer.name or '').split(' ')[0] or 'familia'}:",
                        f"El plan del memorial de {pet_name} vence el {date_txt}. Para que siga completo, con todas sus "
                        "fotos y mensajes, puedes renovarlo por un año más al mismo precio que contrataste.",
                        "Si no se renueva, el memorial no desaparece: seguirá en línea mostrando solo algunas fotos y "
                        "mensajes, y al renovarlo vuelve todo.",
                    ],
                    rows=[("Mascota", pet_name), ("Plan", label), ("Vence", date_txt)],
                    button_label="Renovar por WhatsApp" if wa else "Ver el memorial",
                    button_url=wa or urls.get("public_url") or _memorial_base_url(),
                    footer=f"Ver el memorial: {urls.get('public_url', '')}" if urls.get("public_url") else None,
                    kicker="Memorial · Vinzer",
                )
            except Exception:  # noqa: BLE001
                logger.exception("No se pudo enviar el aviso de vencimiento del memorial %s", m.id)
                continue
        db.add(Notification(
            title=f"Memorial por vencer: {pet_name}",
            message=f"Vence el {date_txt} ({label}). " + ("Se avisó a la familia por correo." if customer and customer.email else "La familia no tiene correo."),
            type="memorial_expiring", recipient_type=RecipientType.admin, priority=NotificationPriority.normal,
            action_url="/dashboard/memorials", data={"memorial_id": m.id},
        ))
        m.expiry_notice_for = m.valid_until
        db.commit()
        sent += 1
    return sent


def renew(memorial: mem_models.Memorial) -> datetime:
    """+1 año al precio congelado. Desde la vigencia actual si sigue vigente; si no, desde hoy."""
    now = datetime.now()
    vu = _naive(memorial.valid_until)
    base = vu if vu and vu > now else now
    memorial.valid_until = base + timedelta(days=memorial_plans.YEAR_DAYS)
    memorial.status = mem_models.MemorialStatus.active
    memorial.expiry_notice_for = None
    return memorial.valid_until


async def send_renewed_email(memorial_id: int) -> None:
    from app.core.tenant_context import apply_bypass_rls
    from app.database import SessionLocal
    from app.services.email import send_action_email
    from app.services.memorial_notifications import build_memorial_urls

    db = SessionLocal()
    try:
        apply_bypass_rls(db)
        m = db.query(mem_models.Memorial).options(
            joinedload(mem_models.Memorial.pet).joinedload(models.Pet.customer),
            joinedload(mem_models.Memorial.tenant),
        ).filter(mem_models.Memorial.id == memorial_id).first()
        customer = m.pet.customer if m and m.pet else None
        if not m or not customer or not customer.email:
            return
        urls = build_memorial_urls(m, m.tenant) if m.tenant else {}
        date_txt = _naive(m.valid_until).strftime("%d/%m/%Y") if m.valid_until else "—"
        await send_action_email(
            to=customer.email,
            subject=f"✨ El memorial de {m.pet.name} fue renovado",
            title=f"Gracias por mantener encendida la luz de {m.pet.name}",
            paragraphs=[f"Renovamos su memorial hasta el {date_txt}. Ya se ven de nuevo todas sus fotos y mensajes."],
            rows=[("Mascota", m.pet.name), ("Plan", _plan_label(db, m)), ("Vigente hasta", date_txt)],
            button_label="Ver el memorial" if urls.get("public_url") else None,
            button_url=urls.get("public_url"),
            kicker="Memorial · Vinzer",
        )
    except Exception:  # noqa: BLE001
        logger.exception("No se pudo enviar el correo de renovación del memorial %s", memorial_id)
    finally:
        db.close()
