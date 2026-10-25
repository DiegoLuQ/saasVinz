"""Aviso al crematorio cuando se acerca al límite de órdenes del mes de su plan.

Al crearse una orden (venga del panel, de un registro o de cualquier otro lado),
un listener anota el crematorio y, después del commit, revisa el uso del mes:
- desde el 80 % del tope: «Te quedan N órdenes este mes» (nivel warning);
- al 100 %: «Llegaste al límite de órdenes del mes» (nivel reached).
Cada nivel se avisa UNA vez por mes: notificación en el panel (para el dueño,
con «Ver planes») y correo al administrador. El SuperAdmin ve lo mismo en
«Oportunidades» (services/business_metrics.py).
"""
from __future__ import annotations

import asyncio
import logging
import math
import threading

from sqlalchemy import event

logger = logging.getLogger(__name__)
NEAR_LIMIT = 0.8
UNLIMITED = 999999
_registered = False


def _period() -> str:
    from app.utils import tz
    return tz.get_now().strftime("%Y-%m")


def level_for(usage: int, limit: int) -> str | None:
    if not limit or limit <= 0 or limit >= UNLIMITED:
        return None
    if usage >= limit:
        return "reached"
    if usage >= math.ceil(limit * NEAR_LIMIT):
        return "warning"
    return None


def _send_email(to: str, title: str, paragraphs: list[str], url: str) -> None:
    from app.services.email import send_action_email

    def run():
        try:
            asyncio.run(send_action_email(to, title, title, paragraphs, "Ver planes", url,
                                          "Recibes este aviso una vez por mes y por límite.", kicker="Tu plan"))
        except Exception:  # noqa: BLE001
            logger.exception("No se pudo enviar el aviso de límite a %s", to)

    threading.Thread(target=run, daemon=True).start()


def check_orders(db, tenant_id: int) -> str | None:
    """Revisa el uso de órdenes del mes y avisa si cruzó un nivel nuevo. Devuelve el nivel avisado."""
    from app import models
    from app.utils.limit_checker import LimitChecker

    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    plan = tenant.effective_plan if tenant else None
    if not plan:
        return None
    limit = plan.max_orders or 0
    usage = LimitChecker.get_usage(db, tenant_id, "orders")
    level = level_for(usage, limit)
    if not level:
        return None

    key = f"orders:{_period()}:{level}"
    Notification = models.Notification
    already = db.query(Notification.id).filter(
        Notification.tenant_id == tenant_id, Notification.type == "limit_warning",
        Notification.data["key"].as_string() == key,
    ).first()
    if already:
        return None

    left = max(0, limit - usage)
    if level == "reached":
        title = "Llegaste al límite de órdenes del mes"
        message = (f"Usaste las {limit} órdenes de tu plan {plan.name} este mes. Para seguir registrando "
                   "servicios antes del próximo mes, cambia a un plan con más capacidad.")
    else:
        title = f"Te {'queda' if left == 1 else 'quedan'} {left} {'orden' if left == 1 else 'órdenes'} este mes"
        message = (f"Llevas {usage} de {limit} órdenes de tu plan {plan.name} este mes. Si esperas más servicios, "
                   "revisa los planes con más capacidad.")
    url = "/dashboard/configuracion?tab=facturacion"
    db.add(Notification(
        tenant_id=tenant_id, recipient_type=models.RecipientType.tenant, audience="owner",
        type="limit_warning", priority=models.NotificationPriority.high, title=title, message=message,
        action_url=url, data={"key": key, "resource": "orders", "usage": usage, "limit": limit, "level": level},
    ))
    db.commit()

    owner = db.query(models.User).filter(models.User.tenant_id == tenant_id, models.User.role == models.UserRole.admin,
                                         models.User.is_active.is_(True)).order_by(models.User.id).first()
    to = (owner.email if owner else None) or tenant.email
    if to:
        from app.api.internal.auth.router import _tenant_app_url
        _send_email(to, title, [f"Hola {owner.name if owner and owner.name else ''}:".replace("Hola :", "Hola:"), message],
                    f"{_tenant_app_url()}{url}")
    return level


def _after_flush(session, flush_context):
    from app import models
    for obj in session.new:
        if isinstance(obj, models.CremationOC) and obj.tenant_id:
            session.info.setdefault("limit_checks", set()).add(obj.tenant_id)


def _after_commit(session):
    tenant_ids = session.info.pop("limit_checks", None)
    if not tenant_ids:
        return
    from app.core.tenant_context import apply_bypass_rls
    from app.database import SessionLocal
    for tenant_id in tenant_ids:
        db = SessionLocal()
        try:
            apply_bypass_rls(db)
            check_orders(db, tenant_id)
        except Exception:  # noqa: BLE001 - el aviso nunca debe afectar la creación de la orden
            logger.exception("No se pudo revisar el límite de órdenes del crematorio %s", tenant_id)
        finally:
            db.close()


def _after_rollback(session):
    session.info.pop("limit_checks", None)


def register() -> None:
    """Se llama una vez al iniciar la app (app/main.py)."""
    global _registered
    if _registered:
        return
    from app.database import SessionLocal
    event.listen(SessionLocal, "after_flush", _after_flush)
    event.listen(SessionLocal, "after_commit", _after_commit)
    event.listen(SessionLocal, "after_soft_rollback", lambda session, previous: _after_rollback(session))
    _registered = True
