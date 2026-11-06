"""Memoriales vendidos directamente por Vinzer (planes Mensual / Anual / Eterno).

Dos caminos con el mismo formulario:
- la familia, en memorial.<dominio>/crear (público con reCAPTCHA, o con un enlace de
  invitación que el SuperAdmin genera en Admin → Memoriales);
- el SuperAdmin, en Admin → Memoriales → «Nuevo memorial».

El memorial nace en el crematorio de Vinzer (`memorial_tenant_id`: slug `MEMORIAL_TENANT_SLUG`, por defecto «vinzer-pet»; si no existe, el tenant 1),
con estado `pending` hasta que el SuperAdmin confirma el pago y lo activa (o activo al
instante si lo crea el SuperAdmin marcando «Activar ahora»). Al activarse se fija la
vigencia del plan y se envía a la familia el correo con el enlace y el PIN.
"""
from __future__ import annotations

import logging
import os
import random
import re
import shutil
import string
from datetime import datetime, timedelta
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app import models
from app.api.internal.memorials import models as mem_models
from app.core.tenant_context import apply_bypass_rls, apply_tenant_rls
from app.services import memorial_melodies as melodies
from app.services import memorial_plans
from app.utils.r2 import normalize_image_url
from app.utils.sanitize import sanitize_text

logger = logging.getLogger(__name__)

# Crematorio dueño de los memoriales que vende Vinzer (mismo que usa /api/public/contact).
MEMORIAL_TENANT_SLUG = os.getenv("MEMORIAL_TENANT_SLUG", "vinzer-pet")
FALLBACK_TENANT_ID = 1
MAX_PHOTOS = 3
MAX_PHOTO_BYTES = 12 * 1024 * 1024
SCENARIOS = ("normal", "altar", "cielo", "constelacion")
THEMES = ("claro", "oscuro", "cielo", "nocturno", "dorado")
EFFECTS = ("ninguna", "nieve", "estrellas", "flores")
SCENARIO_DEFAULTS = {
    "normal": ("claro", "ninguna"),
    "altar": ("oscuro", "ninguna"),
    "cielo": ("cielo", "estrellas"),
    "constelacion": ("nocturno", "estrellas"),
}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def memorial_tenant_id(db: Session) -> int:
    apply_bypass_rls(db)
    t = db.query(models.Tenant.id).filter(models.Tenant.slug == MEMORIAL_TENANT_SLUG).first()
    return t[0] if t else FALLBACK_TENANT_ID


def _pin() -> str:
    return "".join(random.choices(string.digits, k=6))


def available_plans(db: Session) -> list[dict]:
    """Planes Vinzer activos (Recuerdo / Eterno / Infinito), con precio y límites actuales."""
    out = []
    for p in memorial_plans.vinzer_plans(db):
        d = memorial_plans.serialize(p)
        d["max_images"] = d["features"]["max_images"]
        d["days"] = None if p.billing == memorial_plans.BILLING_ONE_TIME else memorial_plans.YEAR_DAYS
        out.append(d)
    return out


def options(db: Session) -> dict:
    """Lo que necesita el formulario: planes, melodías de la biblioteca y límites."""
    apply_bypass_rls(db)
    return {
        "plans": available_plans(db),
        "melodies": melodies.list_melodies(db),
        "scenarios": list(SCENARIOS),
        "themes": list(THEMES),
        "effects": list(EFFECTS),
        "max_photos": MAX_PHOTOS,
    }


def _clean(value, max_len: int) -> str:
    return (sanitize_text(str(value or "")) or "").strip()[:max_len]


def _parse_date(value) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d")
    except ValueError:
        raise HTTPException(400, "Fecha inválida (usa AAAA-MM-DD).")


def validate(db: Session, data: dict, photos: list[UploadFile]) -> dict:
    """Valida y normaliza los datos del formulario. Lanza 400 con un mensaje claro."""
    family = data.get("family") or {}
    pet = data.get("pet") or {}
    design = data.get("design") or {}
    out = {
        "family_name": _clean(family.get("name"), 120),
        "email": _clean(family.get("email"), 160).lower(),
        "phone": _clean(family.get("phone"), 30),
        "pet_name": _clean(pet.get("name"), 60),
        "species": _clean(pet.get("species"), 40) or "Mascota",
        "birth_date": _parse_date(pet.get("birth_date")),
        "death_date": _parse_date(pet.get("death_date")),
        "message": _clean(data.get("message"), 1000),
        "plan": str(data.get("plan") or "").strip().lower(),
    }
    if not out["family_name"]:
        raise HTTPException(400, "Falta el nombre de la familia.")
    if not EMAIL_RE.match(out["email"]):
        raise HTTPException(400, "Correo inválido: ahí te llegará el PIN del memorial.")
    if not out["pet_name"]:
        raise HTTPException(400, "Falta el nombre de la mascota.")
    if out["plan"] not in {p["key"] for p in available_plans(db)}:
        raise HTTPException(400, "Elige uno de los planes disponibles.")
    if out["birth_date"] and out["death_date"] and out["birth_date"] > out["death_date"]:
        raise HTTPException(400, "La fecha de nacimiento no puede ser posterior a la de partida.")

    scenario = design.get("scenario") if design.get("scenario") in SCENARIOS else "normal"
    theme_default, effect_default = SCENARIO_DEFAULTS[scenario]
    melody_id = design.get("melody_id")
    melody = None
    if melody_id:
        try:
            item = melodies.get_melody(db, int(melody_id))
        except (TypeError, ValueError):
            item = None
        if not item:
            raise HTTPException(400, "La melodía elegida ya no está disponible.")
        melody = {"media_id": item.id, "activa": bool(design.get("melody_on", True)), "favoritas": [item.id]}
    out["diseno"] = {
        "tipo_diseno": scenario,
        "tema": design.get("theme") if design.get("theme") in THEMES else theme_default,
        "particulas": design.get("effect") if design.get("effect") in EFFECTS else effect_default,
        **({melodies.DISENO_KEY: melody} if melody else {}),
    }

    photos = [p for p in (photos or []) if p and p.filename]
    if not photos:
        raise HTTPException(400, "Sube al menos una foto de tu mascota.")
    if len(photos) > MAX_PHOTOS:
        raise HTTPException(400, f"Máximo {MAX_PHOTOS} fotos.")
    for p in photos:
        if not (p.content_type or "").startswith("image/"):
            raise HTTPException(400, "Solo se aceptan imágenes (JPG, PNG, WebP o HEIC).")
    out["photos"] = photos
    return out


def _upload_photos(db: Session, photos: list[UploadFile], pet_name: str, tenant_id: int) -> list[str]:
    """Optimiza (cuadrado 1:1, WebP liviano, igual que las fotos que sube la familia en la gestión) y sube a R2."""
    from app.api.internal.common.media_service import MediaService

    urls: list[str] = []
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    prefix = re.sub(r"[\W_]+", "_", pet_name.lower()) or "pet"
    for f in photos:
        path = os.path.join(temp_dir, f"{uuid4()}_{os.path.basename(f.filename or 'foto')}")
        try:
            with open(path, "wb") as buf:
                shutil.copyfileobj(f.file, buf)
            if os.path.getsize(path) > MAX_PHOTO_BYTES:
                raise HTTPException(400, "Cada foto debe pesar menos de 12 MB.")
            item = MediaService.upload_media(
                db=db, local_path=path, media_type="image", category="recuerdos", ratio="1:1",
                description=f"Imagen para memorial de {pet_name}", alt_text=f"Foto memorial {pet_name}",
                processing_mode="optimized", custom_prefix=prefix, tenant_id=tenant_id,
            )
            urls.append(normalize_image_url(item.url))
        finally:
            if os.path.exists(path):
                os.remove(path)
    return urls


def create(db: Session, v: dict, *, source: str, activate: bool = False, invite=None) -> mem_models.Memorial:
    """Crea cliente (o reutiliza el del mismo correo), mascota y memorial en el crematorio de Vinzer."""
    tid = memorial_tenant_id(db)
    apply_tenant_rls(db, tid)

    customer = db.query(models.Customer).filter(
        models.Customer.tenant_id == tid, models.Customer.email == v["email"]
    ).first()
    if not customer:
        customer = models.Customer(tenant_id=tid, name=v["family_name"], email=v["email"], phone=v["phone"] or None)
        db.add(customer)
        db.flush()
    elif v["phone"] and not customer.phone:
        customer.phone = v["phone"]

    # Misma familia + mismo nombre de mascota (único por cliente): si ya tiene memorial, no se duplica
    pet = db.query(models.Pet).filter(
        models.Pet.tenant_id == tid, models.Pet.customer_id == customer.id, models.Pet.name == v["pet_name"]
    ).first() if customer.id else None
    if pet and db.query(mem_models.Memorial.id).filter(mem_models.Memorial.id_mascota == pet.id).first():
        db.rollback()
        raise HTTPException(409, f"Ya existe un memorial de {v['pet_name']} con este correo. "
                                 "Escríbenos por WhatsApp y te ayudamos.")

    urls = _upload_photos(db, v["photos"], v["pet_name"], tid)
    if pet:
        pet.species = v["species"]
        pet.birth_date = v["birth_date"] or pet.birth_date
        pet.death_date = v["death_date"] or pet.death_date
        pet.image_url, pet.images = urls[0], urls
    else:
        pet = models.Pet(
            tenant_id=tid, customer_id=customer.id, name=v["pet_name"], species=v["species"],
            birth_date=v["birth_date"], death_date=v["death_date"], image_url=urls[0], images=urls,
        )
        db.add(pet)
    db.flush()
    diseno = dict(v["diseno"])
    diseno["origen"] = source  # web | invitacion | admin
    memorial = mem_models.Memorial(
        id_mascota=pet.id,
        id_tenant=tid,
        access_key=_pin(),
        status=mem_models.MemorialStatus.pending,
        msg_despedida=v["message"] or f"En memoria de {v['pet_name']}. Siempre en nuestros corazones.",
        es_privado=False,
        diseno=diseno,
        lista_imagenes=urls,
        main_image_url=urls[0],
    )
    # Precio congelado al momento de pedirlo; la vigencia corre al activarse
    memorial_plans.assign(memorial, memorial_plans.get_vinzer_plan(db, v["plan"]), start_period=False)
    db.add(memorial)
    db.flush()
    if activate:
        activate_memorial(memorial)
    if invite is not None:
        invite.used_at = datetime.now()
        invite.memorial_id = memorial.id
    db.commit()
    db.refresh(memorial)
    return memorial


def activate_memorial(memorial: mem_models.Memorial) -> None:
    """pending → active. Anual: vence en 1 año; pago único: sin vencimiento; incluido: no se toca."""
    memorial.status = mem_models.MemorialStatus.active
    billing = memorial.plan_billing
    if billing == memorial_plans.BILLING_ONE_TIME:
        memorial.valid_until = None
    elif billing == memorial_plans.BILLING_YEARLY:
        memorial.valid_until = datetime.now() + timedelta(days=memorial_plans.YEAR_DAYS)


# ----------------------------- correos y avisos -----------------------------

def _whatsapp_link(db: Session, text_msg: str) -> str | None:
    from urllib.parse import quote

    from app.api.internal.admin.models import SaaSConfig
    cfg = db.query(SaaSConfig).first()
    digits = re.sub(r"\D", "", (cfg.whatsapp if cfg else "") or "")
    if not digits:
        return None
    if len(digits) == 9:  # celular chileno sin código de país
        digits = "56" + digits
    return f"https://wa.me/{digits}?text={quote(text_msg)}"


async def after_create(memorial_id: int, activated: bool) -> None:
    """Tarea de fondo (sesión propia): correo a la familia + aviso al SuperAdmin."""
    from sqlalchemy.orm import joinedload

    from app.api.internal.common.models import Notification, NotificationPriority, RecipientType
    from app.database import SessionLocal
    from app.services.email import notification_recipients, send_action_email
    from app.services.memorial_notifications import _memorial_base_url, send_memorial_welcome_email

    db = SessionLocal()
    try:
        apply_bypass_rls(db)
        m = db.query(mem_models.Memorial).options(
            joinedload(mem_models.Memorial.pet).joinedload(models.Pet.customer)
        ).filter(mem_models.Memorial.id == memorial_id).first()
        if not m or not m.pet:
            return
        pet = m.pet
        customer = pet.customer
        plan = memorial_plans.plan_of(db, m)
        period = {"yearly": " / año", "one_time": " pago único"}.get(m.plan_billing or "", "")
        plan_label = (f"{plan.name} · {m.plan_price:g} {m.plan_currency or 'USD'}{period}"
                      if plan and m.plan_price is not None else (m.plan or "—"))
        gestion = f"{_memorial_base_url()}/memorials/m/{m.id_recuerdo}/login"

        if activated:
            await send_memorial_welcome_email(db, m.id)
        elif customer and customer.email:
            wa = _whatsapp_link(db, f"Hola, creé el memorial de {pet.name} (plan {plan_label}) y quiero coordinar el pago.")
            try:
                await send_action_email(
                    to=customer.email,
                    subject=f"🕊️ Recibimos el memorial de {pet.name}",
                    title=f"El memorial de {pet.name} está creado",
                    paragraphs=[
                        f"Hola {(customer.name or '').split(' ')[0] or 'familia'}:",
                        f"Gracias por confiarnos el recuerdo de {pet.name}. Su memorial ya está creado y se publicará "
                        "en cuanto confirmemos el pago del plan elegido.",
                        "Te escribiremos por WhatsApp para coordinarlo. Mientras tanto puedes entrar con tu PIN y "
                        "seguir ajustando fotos, diseño y música.",
                        f"Tu PIN de administración es: {m.access_key}",
                    ],
                    rows=[("Mascota", pet.name), ("Plan", plan_label), ("PIN", m.access_key or "—")],
                    button_label="Coordinar el pago por WhatsApp" if wa else "Entrar a mi memorial",
                    button_url=wa or gestion,
                    footer=f"Para editar tu memorial entra a {gestion} con tu PIN. Guarda este correo.",
                    kicker="Memorial · Vinzer",
                )
            except Exception:  # noqa: BLE001
                logger.exception("No se pudo enviar el correo de memorial recibido (%s)", memorial_id)

        origen = (m.diseno or {}).get("origen", "web")
        try:
            db.add(Notification(
                title=f"Nuevo memorial: {pet.name} ({plan_label})",
                message=(f"{customer.name if customer else '—'} ({customer.email if customer else '—'}) creó un memorial "
                         f"desde {origen}. " + ("Ya está activo." if activated else "Pendiente de pago: actívalo en Memoriales.")),
                type="memorial_lead", recipient_type=RecipientType.admin,
                priority=NotificationPriority.normal if activated else NotificationPriority.high,
                action_url="/dashboard/memorials", data={"memorial_id": m.id},
            ))
            db.commit()
        except Exception:  # noqa: BLE001
            db.rollback()
            logger.exception("No se pudo crear la notificación del memorial %s", memorial_id)

        if not activated and origen != "admin":
            try:
                await send_action_email(
                    to=notification_recipients(),
                    subject=f"Nuevo memorial por cobrar: {pet.name}",
                    title=f"Memorial de {pet.name} pendiente de pago",
                    paragraphs=["Una familia creó un memorial. Coordina el pago y actívalo en Admin → Memoriales."],
                    rows=[("Mascota", pet.name), ("Plan", plan_label),
                          ("Familia", customer.name if customer else "—"),
                          ("Correo", customer.email if customer else "—"),
                          ("Teléfono", (customer.phone if customer else None) or "—"),
                          ("Origen", origen)],
                    kicker="Memoriales",
                )
            except Exception:  # noqa: BLE001
                logger.exception("No se pudo avisar al SuperAdmin del memorial %s", memorial_id)
    finally:
        db.close()


async def send_welcome_in_background(memorial_id: int) -> None:
    """Correo con enlace y PIN al activar un memorial (sesión propia)."""
    from app.database import SessionLocal
    from app.services.memorial_notifications import send_memorial_welcome_email

    db = SessionLocal()
    try:
        apply_bypass_rls(db)
        await send_memorial_welcome_email(db, memorial_id)
    except Exception:  # noqa: BLE001
        logger.exception("No se pudo enviar el correo de activación del memorial %s", memorial_id)
    finally:
        db.close()
