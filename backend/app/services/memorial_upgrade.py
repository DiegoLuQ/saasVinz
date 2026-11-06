"""Mejora de plan de un memorial (sobre todo Partner → plan Vinzer).

Los memoriales que regala un crematorio (Partner) pueden pasar a Recuerdo / Eterno / Infinito.
La familia lo pide desde la gestión (`request_upgrade`): se avisa al SuperAdmin (notificación
`memorial_upgrade` + correo) y la familia sigue por WhatsApp. El pago es manual: el SuperAdmin
cambia el plan en Admin → Memoriales (precio congelado con `memorial_plans.assign`, vigencia
desde hoy) y la familia recibe «Tu memorial ahora es Plan X» (`send_upgraded_email`).
El memorial conserva su crematorio, fotos, mensajes, diseño y enlace.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from app import models
from app.api.internal.memorials import models as mem_models
from app.services import memorial_plans

logger = logging.getLogger(__name__)

DEDUP_HOURS = 24


def _rank(plans: list, key: str | None) -> int:
    keys = [p.name.strip().lower() for p in plans]
    return keys.index(key) if key in keys else -1


def request_upgrade(db: Session, memorial: mem_models.Memorial, plan_key: str) -> dict:
    """Registra la solicitud. Devuelve {plan, price, currency, billing, duplicated}."""
    from app.api.internal.common.models import Notification, NotificationPriority, RecipientType

    key = (plan_key or "").strip().lower()
    target = memorial_plans.get_vinzer_plan(db, key)
    if target is None:
        raise HTTPException(400, "Plan no disponible.")
    current = memorial_plans.plan_of(db, memorial)
    if current is not None and current.kind == memorial_plans.KIND_VINZER:
        plans = memorial_plans.vinzer_plans(db)
        if _rank(plans, key) <= _rank(plans, current.name.strip().lower()):
            raise HTTPException(400, "Elige un plan superior al actual.")

    # Las notificaciones del SuperAdmin (tenant_id NULL) solo se leen/escriben sin RLS
    from app.core.tenant_context import apply_bypass_rls
    apply_bypass_rls(db)
    since = datetime.now() - timedelta(hours=DEDUP_HOURS)
    recent = db.query(Notification).filter(
        Notification.type == "memorial_upgrade", Notification.created_at >= since,
    ).all()
    duplicated = any((n.data or {}).get("memorial_id") == memorial.id and (n.data or {}).get("plan") == key for n in recent)

    out = {"plan": target.name, "price": target.price, "currency": target.currency,
           "billing": target.billing, "duplicated": duplicated}
    if duplicated:
        return out

    pet = memorial.pet.name if memorial.pet else "—"
    tenant = memorial.tenant.name if memorial.tenant else "—"
    from_name = current.name if current else (memorial.plan or "—")
    db.add(Notification(
        title=f"Mejora de memorial: {pet} → {target.name}",
        message=f"La familia de {pet} ({tenant}) quiere pasar de {from_name} a {target.name} "
                f"({target.price:g} {target.currency}). Coordina el pago y cambia el plan en Memoriales.",
        type="memorial_upgrade", recipient_type=RecipientType.admin, priority=NotificationPriority.high,
        action_url="/dashboard/memorials", data={"memorial_id": memorial.id, "plan": key},
    ))
    db.commit()
    return out


async def notify_admin_in_background(memorial_id: int, plan_key: str) -> None:
    from app.core.tenant_context import apply_bypass_rls
    from app.database import SessionLocal
    from app.services.email import notification_recipients, send_action_email

    db = SessionLocal()
    try:
        apply_bypass_rls(db)
        m = db.query(mem_models.Memorial).options(
            joinedload(mem_models.Memorial.pet).joinedload(models.Pet.customer),
            joinedload(mem_models.Memorial.tenant),
        ).filter(mem_models.Memorial.id == memorial_id).first()
        target = memorial_plans.get_vinzer_plan(db, plan_key)
        if not m or not target:
            return
        current = memorial_plans.plan_of(db, m)
        c = m.pet.customer if m.pet else None
        await send_action_email(
            to=notification_recipients(),
            subject=f"Mejora de memorial: {m.pet.name if m.pet else '—'} → {target.name}",
            title="Una familia quiere mejorar su memorial",
            paragraphs=["Coordina el pago por WhatsApp y cambia el plan en Admin → Memoriales: el precio queda congelado "
                        "y la familia recibe un correo de confirmación."],
            rows=[("Mascota", m.pet.name if m.pet else "—"), ("Crematorio", m.tenant.name if m.tenant else "—"),
                  ("Plan actual", current.name if current else (m.plan or "—")),
                  ("Plan pedido", f"{target.name} · {target.price:g} {target.currency}"),
                  ("Familia", c.name if c else "—"), ("Correo", c.email if c and c.email else "—"),
                  ("Teléfono", c.phone if c and c.phone else "—")],
            kicker="Memoriales",
        )
    except Exception:  # noqa: BLE001
        logger.exception("No se pudo avisar la mejora del memorial %s", memorial_id)
    finally:
        db.close()


async def send_upgraded_email(memorial_id: int, from_plan: str) -> None:
    from app.core.tenant_context import apply_bypass_rls
    from app.database import SessionLocal
    from app.services.email import send_action_email
    from app.services.memorial_notifications import _memorial_base_url, build_memorial_urls

    db = SessionLocal()
    try:
        apply_bypass_rls(db)
        m = db.query(mem_models.Memorial).options(
            joinedload(mem_models.Memorial.pet).joinedload(models.Pet.customer),
            joinedload(mem_models.Memorial.tenant),
        ).filter(mem_models.Memorial.id == memorial_id).first()
        c = m.pet.customer if m and m.pet else None
        if not m or not c or not c.email:
            return
        plan = memorial_plans.plan_of(db, m)
        f = memorial_plans.features_of(plan)
        extras = [f"hasta {f['max_images']} fotos", f"{f['max_dedications']} mensajes"]
        if f.get("timeline"):
            extras.append(f"línea de tiempo de {f['max_timeline']} momentos")
        if f.get("max_videos"):
            extras.append("un video y su voz")
        if f.get("qr"):
            extras.append("código QR para imprimir")
        until = "Sin vencimiento" if m.valid_until is None else m.valid_until.strftime("%d/%m/%Y")
        urls = build_memorial_urls(m, m.tenant) if m.tenant else {}
        gestion = f"{_memorial_base_url()}/memorials/m/{m.id_recuerdo}/login"
        await send_action_email(
            to=c.email,
            subject=f"✨ El memorial de {m.pet.name} ahora es Plan {plan.name if plan else ''}",
            title=f"Más espacio para el recuerdo de {m.pet.name}",
            paragraphs=[
                f"Hola {(c.name or '').split(' ')[0] or 'familia'}:",
                f"Su memorial pasó de {from_plan} a Plan {plan.name if plan else ''}. Ahora incluye {', '.join(extras)}.",
                "Conserva todo lo que ya tenía: fotos, mensajes, diseño y el mismo enlace. Entra con tu PIN para aprovecharlo.",
            ],
            rows=[("Mascota", m.pet.name), ("Plan", plan.name if plan else "—"),
                  ("Precio", f"{m.plan_price:g} {m.plan_currency or 'USD'}" if m.plan_price else "—"),
                  ("Vigente hasta", until)],
            button_label="Entrar a mi memorial", button_url=gestion,
            footer=f"Ver el memorial: {urls['public_url']}" if urls.get("public_url") else None,
            kicker="Memorial · Vinzer",
        )
    except Exception:  # noqa: BLE001
        logger.exception("No se pudo enviar el correo de mejora del memorial %s", memorial_id)
    finally:
        db.close()
