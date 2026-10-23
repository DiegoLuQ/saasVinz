"""Saldo de las plataformas IA y aviso de saldo bajo.

- `fetch_provider_balances(db)`: saldo en vivo de cada clave guardada en
  «Plataformas IA» (hoy solo OpenRouter lo expone). Lo usa la pestaña Resumen de
  Créditos IA y el aviso.
- `ai_balance_monitor_loop()`: tarea de fondo (cada CHECK_INTERVAL_SECONDS) que
  avisa al SuperAdmin por correo y con una notificación del admin cuando lo
  disponible en una clave baja de `sys_saas_config.ai_balance_alert_usd`, o
  cuando la clave deja de responder. Avisa una sola vez por cruce: el estado por
  clave queda en `ai_balance_alert_state` y se rearma al volver a estar sobre el
  umbral.

"Disponible" = lo menor entre el saldo de la cuenta y lo que le queda al tope
propio de la clave: al llegar a su tope la clave deja de funcionar aunque la
cuenta tenga saldo.
"""
from __future__ import annotations

import asyncio
import html
import logging
from datetime import timedelta

import httpx
from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app import models
from app.utils import tz

logger = logging.getLogger("saas_crematorio.ai_balance")

CHECK_INTERVAL_SECONDS = 6 * 3600
FIRST_CHECK_DELAY_SECONDS = 120
# Identificador fijo del advisory lock (único en la app; backups usa 815001).
ALERT_ADVISORY_LOCK_ID = 815002


async def fetch_provider_balances(db: Session) -> list[dict]:
    """Saldo por clave (varias conexiones pueden compartirla), con la estimación de
    imágenes que alcanzan según el costo promedio de los últimos 30 días."""
    from app.api.internal.creator.ai_providers.models import AiProvider
    from app.utils import secrets_box

    rows = db.query(AiProvider).filter(AiProvider.is_active.is_(True)).order_by(AiProvider.provider, AiProvider.id).all()
    groups: dict[str, dict] = {}
    for p in rows:
        key = secrets_box.decrypt(p.api_key_encrypted) if p.api_key_encrypted else None
        gid = f"{p.provider}:{secrets_box.hint(key) if key else p.id}"
        g = groups.setdefault(gid, {"provider": p.provider, "key_hint": secrets_box.hint(key) if key else None,
                                    "key": key, "connections": [], "models": []})
        g["connections"].append(p.name)
        g["models"].append(p.model)

    since = tz.get_now() - timedelta(days=30)
    gen = models.AiGeneration

    async def fetch(client: httpx.AsyncClient, g: dict) -> dict:
        out = {k: g[k] for k in ("provider", "key_hint", "connections", "models")}
        out["supported"] = g["provider"] == "openrouter" and bool(g["key"])
        # Costo promedio real por generación de imagen con estos modelos (últimos 30 días).
        avg = db.query(func.avg(gen.cost_usd)).filter(
            gen.model.in_(g["models"]), gen.kind == "image", gen.success.is_(True),
            gen.cost_usd > 0, gen.created_at >= since,
        ).scalar()
        recorded = db.query(func.coalesce(func.sum(gen.cost_usd), 0)).filter(gen.model.in_(g["models"])).scalar()
        out["avg_image_cost_usd"] = round(float(avg), 5) if avg else None
        out["recorded_cost_usd"] = round(float(recorded or 0), 4)
        if not out["supported"]:
            return out
        headers = {"Authorization": f"Bearer {g['key']}"}
        try:
            credits, key_info = await asyncio.gather(
                client.get("https://openrouter.ai/api/v1/credits", headers=headers),
                client.get("https://openrouter.ai/api/v1/key", headers=headers),
            )
            if credits.status_code == 200:
                d = credits.json().get("data") or {}
                total, used = float(d.get("total_credits") or 0), float(d.get("total_usage") or 0)
                out["account"] = {"total_usd": total, "used_usd": round(used, 4), "remaining_usd": round(total - used, 4)}
            else:
                out["error"] = f"OpenRouter respondió {credits.status_code} al consultar el saldo"
            if key_info.status_code == 200:
                k = key_info.json().get("data") or {}
                if k.get("limit") is not None:
                    out["key_limit"] = {"limit_usd": float(k["limit"]), "remaining_usd": float(k.get("limit_remaining") or 0),
                                        "used_usd": round(float(k["limit"]) - float(k.get("limit_remaining") or 0), 4)}
        except httpx.HTTPError as e:
            out["error"] = f"No se pudo consultar OpenRouter: {e.__class__.__name__}"
        return out

    async with httpx.AsyncClient(timeout=10) as client:
        return list(await asyncio.gather(*(fetch(client, g) for g in groups.values())))


def available_usd(item: dict) -> float | None:
    """Lo que realmente queda para gastar con esa clave (None = no se sabe)."""
    values = [x["remaining_usd"] for x in (item.get("account"), item.get("key_limit")) if x]
    return min(values) if values else None


def _status(item: dict, threshold: float) -> str:
    if item.get("error"):
        return "error"
    left = available_usd(item)
    return "low" if left is not None and left < threshold else "ok"


def _alert_text(item: dict, status: str) -> tuple[str, str]:
    name = ", ".join(dict.fromkeys(item.get("connections") or [])) or "OpenRouter"
    if status == "error":
        return (f"La IA no puede consultar su saldo: {name}",
                f"{item.get('error')}. Revisa la clave en Configuración Global → Plataformas IA; "
                "si dejó de funcionar, las generaciones con IA de los crematorios fallarán.")
    left = available_usd(item) or 0
    usd = f"USD {left:.2f}".replace(".", ",")
    by_cap = item.get("key_limit") and (not item.get("account") or item["key_limit"]["remaining_usd"] <= item["account"]["remaining_usd"])
    avg = item.get("avg_image_cost_usd")
    images = f" (≈ {int(left / avg)} imágenes)" if avg else ""
    where = ("Sube el tope de la clave en openrouter.ai/settings/keys: la cuenta tiene saldo, pero la clave llegó casi a su límite."
             if by_cap else "Recarga saldo en openrouter.ai/settings/credits.")
    return (f"Saldo bajo en OpenRouter: quedan {usd}",
            f"{name}: quedan {usd}{images}. {where} Si se agota, la IA de los crematorios deja de funcionar.")


async def _send_email(title: str, message: str) -> None:
    from fastapi_mail import MessageSchema, MessageType
    from app.services.email import fm, notification_recipients
    body = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: #b45309; padding: 20px 24px;"><h1 style="color: #fff; font-size: 18px; margin: 0;">{html.escape(title)}</h1></div>
        <div style="padding: 22px 24px; color: #0f172a; font-size: 14px; line-height: 1.6;">
            <p style="margin: 0 0 14px 0;">{html.escape(message)}</p>
            <p style="margin: 0; font-size: 12px; color: #64748b;">Aviso automático de Vinzer · Créditos IA → Resumen muestra el saldo en vivo.</p>
        </div>
    </div>"""
    await fm.send_message(MessageSchema(subject=title, recipients=notification_recipients(), body=body, subtype=MessageType.html))


async def check_balances_and_alert(db: Session) -> list[dict]:
    """Revisa el saldo y avisa de los cruces nuevos. Devuelve los avisos enviados."""
    from app.api.internal.common.models import Notification, NotificationPriority, RecipientType

    config = db.query(models.SaaSConfig).first()
    threshold = float(config.ai_balance_alert_usd or 0) if config else 0
    if not config or threshold <= 0:
        return []

    items = [i for i in await fetch_provider_balances(db) if i.get("supported")]
    previous = dict(config.ai_balance_alert_state or {})
    state, sent = {}, []
    for item in items:
        key = item.get("key_hint") or "?"
        status = _status(item, threshold)
        state[key] = status
        if status == "ok" or previous.get(key) == status:
            continue
        title, message = _alert_text(item, status)
        db.add(Notification(
            title=title, message=message, type="ai_balance", recipient_type=RecipientType.admin,
            priority=NotificationPriority.high, action_url="/dashboard/creditos-ia",
            data={"key_hint": key, "status": status, "available_usd": available_usd(item)},
        ))
        try:
            await _send_email(title, message)
        except Exception:  # noqa: BLE001 - la notificación del admin queda igual
            logger.exception("No se pudo enviar el correo de saldo bajo")
        sent.append({"key_hint": key, "status": status, "title": title})
    config.ai_balance_alert_state = state
    db.commit()
    return sent


async def _run_once() -> None:
    from app.core.tenant_context import apply_bypass_rls
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        apply_bypass_rls(db)
        # Una sola réplica revisa (mismo esquema que los backups).
        if not db.execute(text("SELECT pg_try_advisory_lock(:id)"), {"id": ALERT_ADVISORY_LOCK_ID}).scalar():
            return
        try:
            sent = await check_balances_and_alert(db)
            if sent:
                logger.warning("Aviso de saldo IA enviado: %s", sent)
        finally:
            db.execute(text("SELECT pg_advisory_unlock(:id)"), {"id": ALERT_ADVISORY_LOCK_ID})
            db.commit()
    finally:
        db.close()


async def ai_balance_monitor_loop() -> None:
    """Bucle infinito: corre en background desde el startup de la app."""
    await asyncio.sleep(FIRST_CHECK_DELAY_SECONDS)
    while True:
        try:
            await _run_once()
        except Exception:
            logger.exception("Error revisando el saldo de las plataformas IA")
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)
