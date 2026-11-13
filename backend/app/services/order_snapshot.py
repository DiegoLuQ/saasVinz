"""Copia de lo vendido en cada orden (planes y servicios).

Así se pueden editar deliberadamente los planes y servicios del catálogo sin alterar
las órdenes ya creadas:

- `oc_plans`: nombre y grupo del plan + `included_services` = los servicios del plan
  en ese momento ([{service_id, name, optional, position}]; `optional` = extra
  opcional, NO incluido). Las ánforas/insumos ya quedaban fijas como líneas de
  `oc_products` con `plan_id`.
- `oc_services`: nombre, `is_special` y `price_on_request` del servicio al venderse
  (el indicador «servicios especiales» usa esta copia, no el valor actual).

Se llena sola al INSERTAR la fila (listener `before_insert`, registrado en main.py),
cubre todos los caminos (crear/editar orden, procesar registro, futuros). Al editar
una orden, `CremationService.update` borra y recrea las filas: `keep_*` guarda la
copia de las que siguen (mismo plan / servicio) para no reemplazarla por el contenido
actual. Cambiar de plan = copia del plan nuevo. Las órdenes anteriores a la migración
d3f5a7b9c148 se rellenaron con el contenido de ese momento (`snapshot_source='backfill'`).
"""
from __future__ import annotations

import logging

from sqlalchemy import event, text

logger = logging.getLogger(__name__)

PLAN_FIELDS = ("plan_name", "plan_group", "included_services", "snapshot_source")
SERVICE_FIELDS = ("service_name", "is_special", "price_on_request")


def plan_snapshot(conn, plan_id: int | None) -> dict:
    """Contenido actual del plan (para copiarlo a la orden)."""
    if not plan_id:
        return {"plan_name": None, "plan_group": None, "included_services": [], "snapshot_source": "order"}
    row = conn.execute(text("SELECT name, group_name FROM srv_plans WHERE id = :id"), {"id": plan_id}).first()
    services = conn.execute(text("""
        SELECT s.id, s.name, COALESCE(ps.is_optional, false), ps.sort_order
        FROM srv_plan_services ps JOIN srv_services s ON s.id = ps.service_id
        WHERE ps.plan_id = :id ORDER BY ps.sort_order, ps.id
    """), {"id": plan_id}).all()
    return {
        "plan_name": (row[0] or "")[:150] or None if row else None,
        "plan_group": row[1] if row else None,
        "included_services": [{"service_id": sid, "name": name, "optional": bool(opt), "position": pos or 0}
                              for sid, name, opt, pos in services],
        "snapshot_source": "order",
    }


def service_snapshot(conn, service_id: int | None) -> dict:
    if not service_id:
        return {"service_name": None, "is_special": False, "price_on_request": False}
    row = conn.execute(text("SELECT name, is_special, price_on_request FROM srv_services WHERE id = :id"),
                       {"id": service_id}).first()
    if not row:
        return {"service_name": None, "is_special": False, "price_on_request": False}
    return {"service_name": (row[0] or "")[:150] or None, "is_special": bool(row[1]), "price_on_request": bool(row[2])}


def _fill_plan(mapper, connection, target) -> None:
    if target.snapshot_source:  # ya trae su copia (se conservó al editar la orden)
        return
    try:
        for k, v in plan_snapshot(connection, target.plan_id).items():
            setattr(target, k, v)
    except Exception:  # noqa: BLE001 - la copia nunca impide guardar la orden
        logger.exception("No se pudo copiar el plan %s a la orden", target.plan_id)


def _fill_service(mapper, connection, target) -> None:
    if target.service_name is not None or target.is_special is not None:
        return
    try:
        for k, v in service_snapshot(connection, target.service_id).items():
            setattr(target, k, v)
    except Exception:  # noqa: BLE001
        logger.exception("No se pudo copiar el servicio %s a la orden", target.service_id)


def keep_plans(rows) -> dict:
    """Copias de las líneas de plan de una orden, por plan_id (antes de borrarlas al editar)."""
    return {r.plan_id: {k: getattr(r, k) for k in PLAN_FIELDS} for r in rows if r.snapshot_source}


def keep_services(rows) -> dict:
    return {r.service_id: {k: getattr(r, k) for k in SERVICE_FIELDS} for r in rows if r.service_name is not None}


def plan_included(line) -> list[str]:
    """Nombres de los servicios INCLUIDOS de una línea de plan (sin los opcionales).
    Sin copia (caso raro) = el plan en vivo."""
    if line.included_services is not None:
        return [s.get("name") for s in line.included_services if s.get("name") and not s.get("optional")]
    plan = getattr(line, "plan", None)
    return [s.name for s in (plan.services if plan else []) or [] if s and s.name]


def register() -> None:
    from app import models
    if not event.contains(models.PlanOC, "before_insert", _fill_plan):
        event.listen(models.PlanOC, "before_insert", _fill_plan)
    if not event.contains(models.ServicioOC, "before_insert", _fill_service):
        event.listen(models.ServicioOC, "before_insert", _fill_service)
