"""Historial automático de altas, cambios de plan y de estado de los crematorios.

Listeners de la sesión:
- `before_flush`: para cada Tenant que cambia `subscription_plan_id` o `status`,
  lee los valores anteriores (de la historia del objeto o, si no están cargados,
  de la base, que aún no se actualizó) y prepara el evento con el MRR antes y
  después (services/business_metrics.mrr_for).
- `after_flush`: agrega las altas (ya tienen id) y escribe todo en sys_tenant_events.
Así se registra el cambio venga de donde venga (admin, aprobación de pago, Polar,
registro, desactivación). Se escribe dentro de un SAVEPOINT: si fallara, la
operación del negocio sigue sin enterarse.
"""
from __future__ import annotations

import logging

from sqlalchemy import event, inspect, text

logger = logging.getLogger(__name__)
_registered = False
_KEY = "tenant_event_rows"


def _value(v):
    return getattr(v, "value", v)


def _before_flush(session, flush_context, instances):
    from app import models
    from app.services.business_metrics import mrr_for

    rows = session.info.setdefault(_KEY, [])
    with session.no_autoflush:
        for obj in list(session.dirty):
            if not isinstance(obj, models.Tenant) or obj.id is None:
                continue
            state = inspect(obj)
            plan_h = state.attrs.subscription_plan_id.history
            status_h = state.attrs.status.history
            if not (plan_h.has_changes() or status_h.has_changes()):
                continue
            # Valores anteriores tal como están en la base (aún sin el UPDATE).
            old = session.connection().execute(
                text("SELECT subscription_plan_id, status, contracted_price, billing_cycle FROM sys_tenants WHERE id = :id"),
                {"id": obj.id},
            ).first()
            if old is None:
                continue
            old_pid, old_status, old_price, old_cycle = old
            new_pid, new_status = obj.subscription_plan_id, _value(obj.status)
            if old_pid == new_pid and _value(old_status) == new_status:
                continue
            old_plan = session.get(models.SubscriptionPlan, old_pid) if old_pid else None
            new_plan = session.get(models.SubscriptionPlan, new_pid) if new_pid else None
            before = mrr_for(old_status, old_plan, old_price, old_cycle)
            after = mrr_for(new_status, new_plan, obj.contracted_price, obj.billing_cycle)
            if old_pid != new_pid:
                rows.append({"tenant_id": obj.id, "kind": "plan_change",
                             "from_value": old_plan.name if old_plan else None,
                             "to_value": new_plan.name if new_plan else None, "from_mrr": before, "to_mrr": after})
            else:
                rows.append({"tenant_id": obj.id, "kind": "status_change", "from_value": _value(old_status),
                             "to_value": new_status, "from_mrr": before, "to_mrr": after})


def _after_flush(session, flush_context):
    from app import models
    from app.services.business_metrics import mrr_for

    rows = session.info.pop(_KEY, None) or []
    with session.no_autoflush:
        for obj in session.new:
            if isinstance(obj, models.Tenant) and obj.id:
                p = session.get(models.SubscriptionPlan, obj.subscription_plan_id) if obj.subscription_plan_id else None
                rows.append({"tenant_id": obj.id, "kind": "created", "from_value": None,
                             "to_value": p.name if p else obj.plan, "from_mrr": 0.0,
                             "to_mrr": mrr_for(obj.status or "active", p, obj.contracted_price, obj.billing_cycle)})
    if not rows:
        return
    conn = session.connection()
    savepoint = conn.begin_nested()
    try:
        conn.execute(models.TenantEvent.__table__.insert(), rows)
        savepoint.commit()
    except Exception:  # noqa: BLE001 - el historial nunca debe romper la operación
        savepoint.rollback()
        logger.exception("No se pudo registrar el evento del crematorio")


def _after_rollback(session, previous_transaction):
    session.info.pop(_KEY, None)


def register() -> None:
    """Se llama una vez al iniciar la app (app/main.py)."""
    global _registered
    if _registered:
        return
    from app.database import SessionLocal
    event.listen(SessionLocal, "before_flush", _before_flush)
    event.listen(SessionLocal, "after_flush", _after_flush)
    event.listen(SessionLocal, "after_soft_rollback", _after_rollback)
    _registered = True
