"""Invitación a dejar una reseña en Google, programada después de entregar.

Al finalizar la orden la familia recibe el aviso de fase final (sin reseña: aún
no tiene en sus manos la urna, las cenizas ni el certificado). Esta invitación sale
aparte, 1 o 2 días después (lo elige el crematorio), a las 18:00 hora del
crematorio. Configuración → «Reseñas en Google»; la guarda
`sys_tenants.family_notices.review` = {enabled, delay_days, enabled_at}.

- Característica del plan `configuracion:resena_google`: la decide el SuperAdmin
  (admin → Planes → Configurar Características); sin marcar = NO incluida.
- Necesita el enlace de reseñas del Perfil (`social_media.google_review`) y el
  correo del cliente.
- No se envía si la orden ya no está entregada (cancelada o reabierta), ni para
  órdenes entregadas antes de activar la opción o hace más de MAX_AGE_DAYS.
- Queda en ops_family_notices (kind 'review'); la orden muestra «Google ✓».
  «Enviar ahora» (desde la orden o desde la lista) la adelanta.
- Cada intento queda registrado con su estado: 'sent' = el servidor de correo lo
  aceptó (equivale al «200»: no garantiza que no rebote después) o 'failed' + el
  motivo. La tarea reintenta hasta MAX_ATTEMPTS veces. `tenant_list()` alimenta
  la tabla «Programadas y enviadas» de Configuración → Reseñas en Google.
- La tarea revisa cada 10 min con advisory lock (una sola réplica envía).
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import text
from sqlalchemy.orm import Session

from app import models
from app.utils import tz

logger = logging.getLogger(__name__)

FEATURE_KEY = "configuracion:resena_google"
KIND = "review"
SEND_HOUR = 18
DELAYS = (1, 2)
DEFAULT_DELAY = 1
MAX_AGE_DAYS = 7
MAX_ATTEMPTS = 3
LIST_DAYS = 30
CHECK_INTERVAL_SECONDS = 600
FIRST_CHECK_DELAY_SECONDS = 90
ADVISORY_LOCK_ID = 815004  # backups 815001, saldo IA 815002
FINAL_STATUSES = {"entregado", "completado", "completed", "delivered"}


# ---------------------------------------------------------------------------
# Configuración
# ---------------------------------------------------------------------------
def feature_on(tenant) -> bool:
    from app.services.plan_features import tenant_has
    return bool(tenant) and tenant_has(tenant, FEATURE_KEY)


def review_link(tenant) -> str:
    sm = tenant.social_media if tenant is not None and isinstance(tenant.social_media, dict) else {}
    return (sm.get("google_review") or "").strip()


def config(tenant) -> dict:
    cfg = tenant.family_notices if tenant is not None and isinstance(tenant.family_notices, dict) else {}
    r = cfg.get("review") if isinstance(cfg.get("review"), dict) else {}
    delay = r.get("delay_days")
    return {
        "enabled": bool(r.get("enabled")),
        "delay_days": delay if delay in DELAYS else DEFAULT_DELAY,
        "enabled_at": r.get("enabled_at"),
    }


def save_config(tenant, enabled: bool, delay_days: int) -> dict:
    if delay_days not in DELAYS:
        raise ValueError("Elige 1 o 2 días")
    prev = config(tenant)
    # Desde cuándo cuenta: solo órdenes entregadas después de activarla (no se invita a familias antiguas).
    enabled_at = prev["enabled_at"] if (prev["enabled"] and enabled) else (tz.get_now().isoformat() if enabled else None)
    cfg = dict(tenant.family_notices or {})
    cfg["review"] = {"enabled": bool(enabled), "delay_days": delay_days, "enabled_at": enabled_at}
    tenant.family_notices = cfg
    return config(tenant)


def is_active(tenant) -> bool:
    return feature_on(tenant) and config(tenant)["enabled"] and bool(review_link(tenant))


def _tenant_tz(tenant):
    try:
        return ZoneInfo(getattr(tenant, "timezone", None) or "America/Santiago")
    except Exception:  # noqa: BLE001
        return tz.CHILE_TZ


def due_at(tenant, completed_at: datetime | None) -> datetime | None:
    """Fecha de envío: el día de la entrega + N días, a las 18:00 hora del crematorio."""
    if not completed_at:
        return None
    zone = _tenant_tz(tenant)
    local = tz.to_santiago(completed_at).astimezone(zone)
    day = local.date() + timedelta(days=config(tenant)["delay_days"])
    return datetime(day.year, day.month, day.day, SEND_HOUR, 0, tzinfo=zone)


def _completed_at(cremation) -> datetime | None:
    return cremation.scheduling.completed_at if cremation.scheduling else None


def _notices(db: Session, cremation_ids: list[int]) -> dict[int, list]:
    """Intentos de invitación por orden (más reciente primero)."""
    out: dict[int, list] = {}
    if not cremation_ids:
        return out
    rows = db.query(models.FamilyNotice).filter(
        models.FamilyNotice.cremation_id.in_(cremation_ids),
        models.FamilyNotice.kind == KIND,
    ).order_by(models.FamilyNotice.created_at.desc(), models.FamilyNotice.id.desc()).all()
    for r in rows:
        out.setdefault(r.cremation_id, []).append(r)
    return out


def _sent(db: Session, cremation_id: int, notices: list | None = None):
    rows = notices if notices is not None else _notices(db, [cremation_id]).get(cremation_id, [])
    return next((r for r in rows if (r.status or "sent") == "sent"), None)


def _failed(rows: list) -> list:
    return [r for r in rows if r.status == "failed"]


def _after_enabled(tenant, completed_at: datetime | None) -> bool:
    enabled_at = config(tenant)["enabled_at"]
    if not enabled_at or not completed_at:
        return bool(completed_at)
    try:
        return tz.to_santiago(completed_at) >= tz.to_santiago(datetime.fromisoformat(enabled_at))
    except ValueError:
        return True


def order_status(db: Session, cremation, notices: list | None = None, now: datetime | None = None) -> dict:
    """Para la orden: si se envió (y cuándo), cuándo saldrá o por qué no saldrá.

    `state`: sent | scheduled (aún no llega la hora) | pending (ya toca: sale en la
    próxima revisión, ≤ 10 min) | retrying (falló y se reintentará) | failed (agotó
    los intentos) | skipped (no se enviará: ver `reason`).
    """
    tenant = cremation.tenant
    if not feature_on(tenant):
        return {"available": False}
    rows = notices if notices is not None else _notices(db, [cremation.id]).get(cremation.id, [])
    sent = _sent(db, cremation.id, rows)
    failed = _failed(rows)
    customer = cremation.pet.customer if cremation.pet and cremation.pet.customer else None
    out = {
        "available": True,
        "state": "sent" if sent else "skipped",
        "sent_at": sent.created_at if sent else None,
        "sent_to": sent.sent_to if sent else None,
        "scheduled_for": None,
        "reason": None,
        "attempts": len(failed) + (1 if sent else 0),
        "last_error": failed[0].error if failed and not sent else None,
        "last_attempt_at": rows[0].created_at if rows else None,
        "can_send": bool(review_link(tenant)) and bool(customer and (customer.email or "").strip()),
    }
    if sent:
        return out
    if not review_link(tenant):
        out["reason"] = "no_link"
    elif not (customer and (customer.email or "").strip()):
        out["reason"] = "no_email"
    elif not config(tenant)["enabled"]:
        out["reason"] = "off"
    elif (cremation.status or "").lower() not in FINAL_STATUSES:
        out["reason"] = "not_delivered"
    elif not _after_enabled(tenant, _completed_at(cremation)):
        out["reason"] = "before_enabled"
    else:
        due = due_at(tenant, _completed_at(cremation))
        out["scheduled_for"] = due
        now = now or tz.get_now()
        if len(failed) >= MAX_ATTEMPTS:
            out["state"], out["reason"] = "failed", "max_attempts"
        elif due and now - due > timedelta(days=MAX_AGE_DAYS):
            out["reason"] = "expired"
        elif failed:
            out["state"] = "retrying"
        else:
            out["state"] = "pending" if due and due <= now else "scheduled"
    return out


def tenant_list(db: Session, tenant, state: str | None = None, days: int = LIST_DAYS, limit: int = 300) -> dict:
    """Órdenes con entrega en los últimos `days` días y el estado de su invitación.

    `state` filtra: sent | scheduled (incluye pending y retrying) | failed | skipped.
    """
    from sqlalchemy.orm import joinedload

    now = tz.get_now()
    rows = (
        db.query(models.Cremation)
        .join(models.CremationScheduling, models.CremationScheduling.cremation_id == models.Cremation.id)
        .options(joinedload(models.Cremation.pet).joinedload(models.Pet.customer))
        .filter(models.Cremation.tenant_id == tenant.id,
                models.CremationScheduling.completed_at >= now - timedelta(days=days))
        .order_by(models.CremationScheduling.completed_at.desc())
        .limit(limit)
        .all()
    )
    notices = _notices(db, [c.id for c in rows])
    groups = {"pending": "scheduled", "retrying": "scheduled"}
    items, counts = [], {"sent": 0, "scheduled": 0, "failed": 0, "skipped": 0}
    for c in rows:
        st = order_status(db, c, notices.get(c.id, []), now)
        if not st.get("available"):
            break
        group = groups.get(st["state"], st["state"])
        counts[group] = counts.get(group, 0) + 1
        if state and group != state:
            continue
        customer = c.pet.customer if c.pet and c.pet.customer else None
        items.append({
            "cremation_id": c.id,
            "verification_code": c.verification_code,
            "pet_name": c.pet.name if c.pet else None,
            "owner_name": customer.name if customer else None,
            "email": (customer.email or None) if customer else None,
            "delivered_at": _completed_at(c),
            **{k: v for k, v in st.items() if k != "available"},
        })
    return {"items": items, "counts": counts, "days": days, "max_attempts": MAX_ATTEMPTS,
            "send_hour": SEND_HOUR}


# ---------------------------------------------------------------------------
# Envío
# ---------------------------------------------------------------------------
async def send_review_email(db: Session, cremation_id: int, user_id: int | None = None, force: bool = False) -> dict:
    """Correo que invita a la familia a dejar su opinión en la ficha de Google."""
    from app.services import family_notices as fn

    cremation = fn._load(db, cremation_id)
    if not cremation:
        return {"sent": False, "reason": "not_found"}
    tenant = cremation.tenant
    if not feature_on(tenant):
        return {"sent": False, "reason": "plan"}
    url = review_link(tenant)
    if not url:
        return {"sent": False, "reason": "no_link"}
    customer = fn._customer(cremation)
    if not customer or not (customer.email or "").strip():
        return {"sent": False, "reason": "no_email"}
    if not force:
        if not config(tenant)["enabled"]:
            return {"sent": False, "reason": "off"}
        if (cremation.status or "").lower() not in FINAL_STATUSES:
            return {"sent": False, "reason": "not_delivered"}
        rows = _notices(db, [cremation.id]).get(cremation.id, [])
        if _sent(db, cremation.id, rows):
            return {"sent": False, "reason": "already_sent"}
        if len(_failed(rows)) >= MAX_ATTEMPTS:
            return {"sent": False, "reason": "max_attempts"}

    pet = cremation.pet.name if cremation.pet else "tu mascota"
    first = fn._first_name(customer.name)
    city = (getattr(tenant, "city", None) or "").strip()
    paragraphs = [
        f"Hola, {first}:" if first else "Hola:",
        f"Esperamos que ya tengas contigo a {pet} y sus recuerdos, y que estos días hayan traído un poco de calma a tu familia.",
        f"Para nosotros fue un honor acompañarte. Si sentiste que cuidamos a {pet} con respeto y cariño, tu opinión en Google "
        f"ayuda a otras familias{f' de {city}' if city else ''} a despedir a sus compañeros con confianza.",
        "Solo toma un minuto y significa mucho para nuestro equipo.",
    ]
    from app.services import email as email_service
    to = customer.email.strip()
    try:
        await email_service.send_action_email(
            to=to,
            subject=f"¿Nos cuentas cómo te acompañamos con {pet}? · {tenant.name}",
            title="¿Te acompañamos con tranquilidad?",
            paragraphs=paragraphs,
            button_label="⭐ Dejar mi opinión en Google",
            button_url=url,
            footer=f"Con cariño,\nEl equipo de {tenant.name}.",
            kicker=tenant.name,
            brand=fn.tenant_brand(tenant),
            reply_to=tenant.email or None,
            image_url=fn.pet_photo(cremation),
            preheader="Tu opinión ayuda a otras familias que despiden a su compañero.",
        )
    except Exception as exc:  # noqa: BLE001 - el servidor de correo lo rechazó o no respondió
        error = _error_text(exc)
        logger.warning("Invitación a reseña rechazada (orden %s): %s", cremation.id, error)
        fn._record(db, cremation, KIND, "email", to, None, user_id, status="failed", error=error)
        return {"sent": False, "reason": "smtp_error", "error": error}
    fn._record(db, cremation, KIND, "email", to, None, user_id)
    return {"sent": True, "to": to}


def _error_text(exc: Exception) -> str:
    msg = " ".join(str(exc).split()) or exc.__class__.__name__
    return f"{exc.__class__.__name__}: {msg}"[:300]


def due_orders(db: Session, now: datetime | None = None) -> list[int]:
    """Órdenes entregadas cuya invitación ya debe salir (sin enviar todavía)."""
    now = now or tz.get_now()
    since = now - timedelta(days=MAX_AGE_DAYS + max(DELAYS))
    rows = (
        db.query(models.Cremation)
        .join(models.CremationScheduling, models.CremationScheduling.cremation_id == models.Cremation.id)
        .filter(models.CremationScheduling.completed_at >= since)
        .all()
    )
    out = []
    for c in rows:
        if (c.status or "").lower() not in FINAL_STATUSES or not is_active(c.tenant):
            continue
        done = _completed_at(c)
        if not _after_enabled(c.tenant, done):
            continue
        due = due_at(c.tenant, done)
        if not (due and due <= now and (now - due) <= timedelta(days=MAX_AGE_DAYS)):
            continue
        rows = _notices(db, [c.id]).get(c.id, [])
        if not _sent(db, c.id, rows) and len(_failed(rows)) < MAX_ATTEMPTS:
            out.append(c.id)
    return out


async def run_once() -> int:
    from app.core.tenant_context import apply_bypass_rls
    from app.database import SessionLocal

    db = SessionLocal()
    sent = 0
    try:
        apply_bypass_rls(db)
        if not db.execute(text("SELECT pg_try_advisory_lock(:id)"), {"id": ADVISORY_LOCK_ID}).scalar():
            return 0
        try:
            for oc_id in due_orders(db):
                try:
                    r = await send_review_email(db, oc_id)
                    sent += 1 if r.get("sent") else 0
                except Exception:  # noqa: BLE001 - una orden no detiene a las demás
                    db.rollback()
                    apply_bypass_rls(db)
                    logger.exception("No se pudo enviar la invitación a reseña (orden %s)", oc_id)
        finally:
            db.execute(text("SELECT pg_advisory_unlock(:id)"), {"id": ADVISORY_LOCK_ID})
            db.commit()
    finally:
        db.close()
    if sent:
        logger.info("Invitaciones a reseña de Google enviadas: %s", sent)
    return sent


async def google_review_scheduler_loop() -> None:
    """Bucle de fondo (startup de la app)."""
    await asyncio.sleep(FIRST_CHECK_DELAY_SECONDS)
    while True:
        try:
            await run_once()
        except Exception:  # noqa: BLE001
            logger.exception("Error en la tarea de reseñas de Google")
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)
