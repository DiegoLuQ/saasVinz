"""
Servicio de notificaciones para Muros de Recuerdos / Memoriales Digitales.

Funcionalidades:
1. Envío de credenciales y bienvenida a la familia (al activar o solicitar reenvío).
2. Notificación en tiempo real cuando alguien enciende una vela o gesto simbólico (con cooldown anti-spam).
3. Notificación en tiempo real cuando alguien deja una dedicatoria de condolencia.
4. Recordatorio anual de aniversario luctuoso ("Hoy se cumple X año de que tu mascota es un angelito").
"""

from __future__ import annotations

import logging
import re
import unicodedata
from datetime import datetime
from urllib.parse import urlparse

from sqlalchemy.orm import Session, joinedload
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy import extract

from app import models
from app.api.internal.memorials import models as mem_models
from app.core.config import settings
from app.services.email import send_action_email
from app.services.family_notices import tenant_brand
from app.utils import tz

logger = logging.getLogger(__name__)

CANDLE_NOTIFICATION_COOLDOWN_SECONDS = 900  # 15 minutos entre avisos de velas


def slugify(text: str | None) -> str:
    if not text:
        return "memorial"
    text = unicodedata.normalize("NFD", str(text))
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = re.sub(r"[^\w\s-]", "", text.lower().strip())
    return re.sub(r"[-\s]+", "-", text) or "memorial"


def _first_name(name: str | None) -> str:
    return (name or "").strip().split(" ")[0] or "Familia"


def _memorial_base_url() -> str:
    """Obtiene la URL base para memoriales (subdominio memorial.)."""
    parsed = urlparse(settings.FRONTEND_URL)
    host = parsed.netloc
    if host.startswith("www."):
        host = host[4:]
    return f"{parsed.scheme or 'http'}://memorial.{host}"


def build_memorial_urls(memorial: mem_models.Memorial, tenant: models.Tenant) -> dict[str, str]:
    base = _memorial_base_url()
    tenant_slug = slugify(tenant.slug or tenant.name or "memorial")
    pet_name = slugify(memorial.pet.name if memorial.pet else "mascota")
    id_recuerdo = str(memorial.id_recuerdo)

    # Enlace corto (con el largo como respaldo para memoriales sin código)
    public_url = (f"{base}/{tenant_slug}/{pet_name}-{memorial.short_code}" if memorial.short_code
                  else f"{base}/memorials/v/{tenant_slug}/{pet_name}/{id_recuerdo}")
    portal_url = f"{base}/memorials/m/{id_recuerdo}/login"

    return {
        "public_url": public_url,
        "portal_url": portal_url,
    }


def _get_customer(memorial: mem_models.Memorial) -> models.Customer | None:
    if memorial.pet and memorial.pet.customer:
        return memorial.pet.customer
    return None


async def send_memorial_welcome_email(
    db: Session,
    memorial_id: int,
    to_email: str | None = None,
) -> dict:
    """
    Envía a la familia las credenciales de su memorial digital con su PIN de acceso,
    enlace público y datos de soporte (crematorio / contacto@vinzer.cl).
    """
    memorial = db.query(mem_models.Memorial).options(
        joinedload(mem_models.Memorial.pet).joinedload(models.Pet.customer),
        joinedload(mem_models.Memorial.tenant),
    ).filter(mem_models.Memorial.id == memorial_id).first()

    if not memorial or not memorial.pet or not memorial.tenant:
        return {"sent": False, "reason": "not_found"}

    customer = _get_customer(memorial)
    target_email = (to_email or (customer.email if customer else "") or "").strip()

    if not target_email:
        return {"sent": False, "reason": "no_email"}

    tenant = memorial.tenant
    pet = memorial.pet
    urls = build_memorial_urls(memorial, tenant)
    pin = memorial.access_key or "------"
    first_name = _first_name(customer.name if customer else None)

    subject = f"🕊️ Memorial digital de {pet.name} — Credenciales de acceso"
    title = f"El santuario conmemorativo de {pet.name} está listo"

    paragraphs = [
        f"Hola {first_name}:",
        f"Con profundo respeto y cariño, hemos preparado un espacio digital único y perpetuo para honrar la vida y el recuerdo inolvidable de {pet.name}.",
        f"A través de este santuario virtual, tu familia y amigos podrán encender velas, dejar flores y compartir palabras de apoyo en su honor.",
        f"Tu código PIN privado de administración es: {pin}",
        "Con este código puedes ingresar como administrador para moderar dedicatorias recibidas (aprobar o eliminar mensajes) y personalizar la música o detalles de su altar.",
    ]

    support_info = f"{tenant.email or ''} · WhatsApp: {tenant.phone or ''} o soporte central en contacto@vinzer.cl"
    footer = (
        f"En caso de extravío de este PIN o cualquier consulta, puedes responder a este correo, "
        f"contactar al crematorio vía WhatsApp o escribirnos a contacto@vinzer.cl."
    )

    rows = [
        ("Mascota", pet.name),
        ("PIN de Administración", pin),
        ("Soporte y Contacto", support_info),
    ]

    try:
        await send_action_email(
            to=target_email,
            subject=subject,
            title=title,
            paragraphs=paragraphs,
            button_label=f"Visitar Memorial de {pet.name}",
            button_url=urls["public_url"],
            footer=footer,
            kicker=f"Memorial · {tenant.name}",
            brand=tenant_brand(tenant),
            reply_to=tenant.email or None,
            rows=rows,
        )
        return {"sent": True, "email": target_email}
    except Exception as e:
        logger.error(f"Error enviando correo de bienvenida de memorial {memorial_id}: {e}")
        return {"sent": False, "reason": str(e)}


async def send_candle_notification_email(
    db: Session,
    memorial_id: int,
    ritual_kind: str = "vela",
    visitor_name: str | None = None,
) -> dict:
    """
    Avisa a la familia cuando alguien enciende una vela o deja un gesto simbólico en el memorial.
    Incluye un cooldown de 15 minutos para evitar spam.
    """
    memorial = db.query(mem_models.Memorial).options(
        joinedload(mem_models.Memorial.pet).joinedload(models.Pet.customer),
        joinedload(mem_models.Memorial.tenant),
    ).filter(mem_models.Memorial.id == memorial_id).first()

    if not memorial or not memorial.pet or not memorial.tenant:
        return {"sent": False, "reason": "not_found"}

    customer = _get_customer(memorial)
    target_email = (customer.email if customer else "").strip()
    if not target_email:
        return {"sent": False, "reason": "no_email"}

    # Cooldown anti-spam
    diseno = memorial.diseno if isinstance(memorial.diseno, dict) else {}
    last_notified_str = diseno.get("last_candle_notified_at")
    now = datetime.now()

    if last_notified_str:
        try:
            last_dt = datetime.fromisoformat(last_notified_str)
            if (now - last_dt).total_seconds() < CANDLE_NOTIFICATION_COOLDOWN_SECONDS:
                return {"sent": False, "reason": "cooldown_active"}
        except Exception:
            pass

    # Actualizar timestamp de notificación
    diseno["last_candle_notified_at"] = now.isoformat()
    memorial.diseno = diseno
    flag_modified(memorial, "diseno")
    db.commit()

    tenant = memorial.tenant
    pet = memorial.pet
    urls = build_memorial_urls(memorial, tenant)
    first_name = _first_name(customer.name if customer else None)

    kind_label = "una vela virtual"
    icon = "🕯️"
    if ritual_kind == "flor":
        kind_label = "una flor de recuerdo"
        icon = "🌸"
    elif ritual_kind == "estrella":
        kind_label = f"una estrella celestial{' (' + visitor_name + ')' if visitor_name else ''}"
        icon = "✨"
    elif ritual_kind == "beso":
        kind_label = "un abrazo y un beso al cielo"
        icon = "🕊️"

    subject = f"{icon} Han encendido {kind_label} en memoria de {pet.name}"
    title = f"Un nuevo gesto de amor para {pet.name}"

    paragraphs = [
        f"Hola {first_name}:",
        f"Alguien ha visitado con mucho cariño el santuario conmemorativo de {pet.name} y ha encendido {kind_label} en su honor.",
        f"Su luz y el amor que compartieron juntos siguen brillando en el corazón de quienes le recuerdan.",
    ]

    footer = (
        f"Memorial conmemorativo ofrecido por {tenant.name}. "
        f"Si deseas desactivar o consultar tus opciones de notificación, contáctanos a contacto@vinzer.cl."
    )

    try:
        await send_action_email(
            to=target_email,
            subject=subject,
            title=title,
            paragraphs=paragraphs,
            button_label=f"Ver Santuario de {pet.name}",
            button_url=urls["public_url"],
            footer=footer,
            kicker="Condolencias y Amor",
            brand=tenant_brand(tenant),
            reply_to=tenant.email or None,
        )
        return {"sent": True, "email": target_email}
    except Exception as e:
        logger.error(f"Error enviando aviso de vela para memorial {memorial_id}: {e}")
        return {"sent": False, "reason": str(e)}


async def send_dedication_notification_email(
    db: Session,
    memorial_id: int,
    mensajero: str,
    mensaje: str,
) -> dict:
    """
    Avisa a la familia cuando un ser querido deja una dedicatoria / mensaje de apoyo.
    Le recuerda a la familia que pueden ingresar con su PIN para aprobarla.
    """
    memorial = db.query(mem_models.Memorial).options(
        joinedload(mem_models.Memorial.pet).joinedload(models.Pet.customer),
        joinedload(mem_models.Memorial.tenant),
    ).filter(mem_models.Memorial.id == memorial_id).first()

    if not memorial or not memorial.pet or not memorial.tenant:
        return {"sent": False, "reason": "not_found"}

    customer = _get_customer(memorial)
    target_email = (customer.email if customer else "").strip()
    if not target_email:
        return {"sent": False, "reason": "no_email"}

    tenant = memorial.tenant
    pet = memorial.pet
    urls = build_memorial_urls(memorial, tenant)
    pin = memorial.access_key or "------"
    first_name = _first_name(customer.name if customer else None)

    subject = f"💌 Nueva dedicatoria de apoyo en el memorial de {pet.name}"
    title = f"Mensaje de consuelo de parte de {mensajero}"

    paragraphs = [
        f"Hola {first_name}:",
        f"Has recibido un nuevo mensaje de consuelo y cariño para {pet.name}:",
        f"«{mensaje}»",
        f"Como administrador del memorial, puedes ingresar con tu PIN privado ({pin}) para revisar y aprobar este mensaje para que sea visible en el muro.",
    ]

    footer = (
        f"Para aprobar o moderar dedicatorias, ingresa al portal de gestión con tu PIN. "
        f"Dudas o soporte: {tenant.email or 'contacto@vinzer.cl'}."
    )

    rows = [
        ("Mensajero", mensajero),
        ("Mascota", pet.name),
        ("PIN de Aprobación", pin),
    ]

    try:
        await send_action_email(
            to=target_email,
            subject=subject,
            title=title,
            paragraphs=paragraphs,
            button_label="Revisar y Aprobar con mi PIN",
            button_url=urls["portal_url"],
            footer=footer,
            kicker="Nueva Dedicatoria",
            brand=tenant_brand(tenant),
            reply_to=tenant.email or None,
            rows=rows,
        )
        return {"sent": True, "email": target_email}
    except Exception as e:
        logger.error(f"Error enviando aviso de dedicatoria para memorial {memorial_id}: {e}")
        return {"sent": False, "reason": str(e)}


async def check_and_send_anniversary_reminders(db: Session) -> dict:
    """
    Tarea programada (diaria):
    Revisa los memoriales activos cuya fecha de fallecimiento (death_date) coincida
    con el día y mes actual, y envía un correo conmemorativo ("Hoy se cumple X año...").
    """
    now_dt = tz.get_now()
    current_month = now_dt.month
    current_day = now_dt.day
    current_year = now_dt.year

    # Buscar mascotas con death_date en este mismo mes y día, pero de años anteriores
    matching_pets = db.query(models.Pet).filter(
        models.Pet.death_date.isnot(None),
        extract("month", models.Pet.death_date) == current_month,
        extract("day", models.Pet.death_date) == current_day,
        extract("year", models.Pet.death_date) < current_year,
    ).all()

    if not matching_pets:
        return {"processed": 0, "sent": 0}

    pet_ids = [p.id for p in matching_pets]
    memorials = db.query(mem_models.Memorial).options(
        joinedload(mem_models.Memorial.pet).joinedload(models.Pet.customer),
        joinedload(mem_models.Memorial.tenant),
    ).filter(
        mem_models.Memorial.id_mascota.in_(pet_ids),
        mem_models.Memorial.status == mem_models.MemorialStatus.active,
    ).all()

    sent_count = 0

    for memorial in memorials:
        pet = memorial.pet
        if not pet or not pet.death_date:
            continue

        death_year = pet.death_date.year
        years = current_year - death_year
        if years < 1:
            continue

        # Evitar enviar más de una vez en el mismo año
        diseno = memorial.diseno if isinstance(memorial.diseno, dict) else {}
        if diseno.get("last_anniversary_notified_year") == current_year:
            continue

        customer = _get_customer(memorial)
        target_email = (customer.email if customer else "").strip()
        if not target_email:
            continue

        tenant = memorial.tenant
        if not tenant:
            continue

        urls = build_memorial_urls(memorial, tenant)
        first_name = _first_name(customer.name if customer else None)
        year_str = f"{years} año" if years == 1 else f"{years} años"

        subject = f"🌈🕊️ En memoria de {pet.name}: hoy se cumple {year_str} de su partida"
        title = f"Hoy recordamos con amor a {pet.name}"

        paragraphs = [
            f"Hola {first_name}:",
            f"Hoy se cumple {year_str} desde que {pet.name} cruzó el puente del arcoíris y se convirtió en un angelito.",
            "Sabemos que el amor verdadero trasciende el tiempo y que su huella permanece imborrable en tu corazón y en cada recuerdo que compartieron juntos.",
            "En este día especial, te acompañamos con nuestro más cálido afecto. Te invitamos a visitar su santuario conmemorativo, encender una velita en su honor y revivir los hermosos momentos de alegría que llenaron sus vidas.",
        ]

        footer = (
            f"Con todo nuestro cariño, el equipo de {tenant.name}. "
            f"En caso de consultas sobre su santuario digital, puedes responder a este correo o escribir a contacto@vinzer.cl."
        )

        rows = [
            ("Angelito", pet.name),
            ("Tiempo en el cielo", year_str),
            ("Soporte", "contacto@vinzer.cl"),
        ]

        try:
            await send_action_email(
                to=target_email,
                subject=subject,
                title=title,
                paragraphs=paragraphs,
                button_label=f"Visitar Santuario de {pet.name}",
                button_url=urls["public_url"],
                footer=footer,
                kicker=f"Aniversario Luctuoso · {tenant.name}",
                brand=tenant_brand(tenant),
                reply_to=tenant.email or None,
                rows=rows,
            )

            # Marcar que ya se envió este año
            diseno["last_anniversary_notified_year"] = current_year
            memorial.diseno = diseno
            flag_modified(memorial, "diseno")
            db.commit()

            sent_count += 1
        except Exception as e:
            logger.error(f"Error enviando correo de aniversario de memorial {memorial.id}: {e}")

    return {"processed": len(memorials), "sent": sent_count}


import asyncio

async def memorial_anniversary_scheduler_loop() -> None:
    """Revisa periodicamente si es horario de manana (09:00 - 12:00 CLT) para enviar aniversarios."""
    while True:
        try:
            from app.database import SessionLocal
            from app.core.tenant_context import apply_bypass_rls
            now_dt = tz.get_now()
            if 9 <= now_dt.hour <= 12:
                db = SessionLocal()
                try:
                    apply_bypass_rls(db)
                    await check_and_send_anniversary_reminders(db)
                    from app.services.memorial_expiry import send_expiry_notices
                    await send_expiry_notices(db)
                finally:
                    db.close()
        except Exception as e:
            logger.error(f"Error en memorial_anniversary_scheduler_loop: {e}")
        await asyncio.sleep(3600)

