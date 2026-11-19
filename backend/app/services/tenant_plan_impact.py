"""
Analítica de impacto de cambios en los planes propios del crematorio (`srv_plans`).
Registra automáticamente qué servicios, productos o precios cambiaron en un plan
y compara las órdenes e ingresos Antes vs. Después de cada hito.
"""
from datetime import datetime, timedelta
from typing import Any, Optional
from sqlalchemy.orm import Session

from app import models
from app.utils import tz

CANCELLED_STATUSES = {"cancelado", "cancelled", "anulado"}


def snapshot_tenant_plan(plan: models.Plan) -> dict[str, Any]:
    """Captura una foto comparable de un plan del crematorio."""
    services_map = {s.id: s.name for s in (plan.services or []) if s.id}
    products_map = {p.id: p.name for p in (plan.products or []) if p.id}
    return {
        "name": plan.name,
        "price": float(plan.price or 0),
        "max_weight": plan.max_weight,
        "is_active": bool(plan.is_active),
        "services": services_map,
        "products": products_map,
    }


def record_tenant_plan_diff_event(
    db: Session,
    tenant_id: int,
    plan: models.Plan,
    before: dict[str, Any],
    user_id: Optional[int] = None,
) -> Optional[models.TenantPlanChangeEvent]:
    """
    Compara `before` contra el estado actualizado de `plan` y guarda un evento
    en `srv_plan_change_events` si cambiaron servicios, productos, precio o peso máx.
    """
    after = snapshot_tenant_plan(plan)

    old_svcs: dict[int, str] = before.get("services") or {}
    new_svcs: dict[int, str] = after.get("services") or {}
    added_services = [new_svcs[sid] for sid in new_svcs if sid not in old_svcs]
    removed_services = [old_svcs[sid] for sid in old_svcs if sid not in new_svcs]

    old_prods: dict[int, str] = before.get("products") or {}
    new_prods: dict[int, str] = after.get("products") or {}
    added_products = [new_prods[pid] for pid in new_prods if pid not in old_prods]
    removed_products = [old_prods[pid] for pid in old_prods if pid not in new_prods]

    price_before = float(before.get("price") or 0)
    price_after = float(after.get("price") or 0)
    price_changed = abs(price_after - price_before) > 0.01

    if not added_services and not removed_services and not added_products and not removed_products and not price_changed:
        return None

    parts: list[str] = []
    if added_services:
        parts.append(f"+{len(added_services)} servicio{'s' if len(added_services) > 1 else ''}")
    if removed_services:
        parts.append(f"-{len(removed_services)} servicio{'s' if len(removed_services) > 1 else ''}")
    if added_products:
        parts.append(f"+{len(added_products)} producto{'s' if len(added_products) > 1 else ''}")
    if removed_products:
        parts.append(f"-{len(removed_products)} producto{'s' if len(removed_products) > 1 else ''}")
    if price_changed:
        parts.append(f"precio ${int(price_before):,} → ${int(price_after):,}".replace(",", "."))

    title = f"Plan {plan.name}: {', '.join(parts)}"

    changes_payload: dict[str, Any] = {}
    if added_services:
        changes_payload["added_services"] = added_services
    if removed_services:
        changes_payload["removed_services"] = removed_services
    if added_products:
        changes_payload["added_products"] = added_products
    if removed_products:
        changes_payload["removed_products"] = removed_products
    if price_changed:
        changes_payload["price_before"] = price_before
        changes_payload["price_after"] = price_after

    event = models.TenantPlanChangeEvent(
        tenant_id=tenant_id,
        plan_id=plan.id,
        plan_name=plan.name,
        event_type="auto_diff",
        title=title[:200],
        changes=changes_payload,
        created_by=user_id,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def _serialize_event(ev: models.TenantPlanChangeEvent) -> dict[str, Any]:
    return {
        "id": ev.id,
        "plan_id": ev.plan_id,
        "plan_name": ev.plan_name,
        "event_type": ev.event_type,
        "title": ev.title,
        "notes": ev.notes,
        "changes": ev.changes or {},
        "created_at": ev.created_at.isoformat() if ev.created_at else None,
    }


def _compute_orders_window(
    db: Session,
    tenant_id: int,
    start_dt: datetime,
    end_dt: datetime,
    plans_by_id: dict[int, models.Plan],
) -> dict[str, Any]:
    """Calcula órdenes, ingresos y ticket promedio por plan en [start_dt, end_dt)."""
    rows = (
        db.query(models.PlanOC, models.CremationOC)
        .join(models.CremationOC, models.PlanOC.cremation_id == models.CremationOC.id)
        .filter(
            models.CremationOC.tenant_id == tenant_id,
            models.CremationOC.created_at >= start_dt,
            models.CremationOC.created_at < end_dt,
        )
        .all()
    )

    by_plan: dict[str, dict[str, Any]] = {}
    for p in plans_by_id.values():
        by_plan[p.name] = {
            "plan_id": p.id,
            "plan_name": p.name,
            "orders": 0,
            "revenue": 0.0,
        }

    seen_cremations: set[int] = set()
    total_revenue = 0.0

    for plan_oc, cremation in rows:
        status_norm = str(cremation.status or "").strip().lower()
        if status_norm in CANCELLED_STATUSES:
            continue

        seen_cremations.add(cremation.id)
        qty = max(1, int(plan_oc.cantidad or 1))
        line_rev = float(plan_oc.precio_venta or 0) * qty
        total_revenue += line_rev

        p = plans_by_id.get(plan_oc.plan_id) if plan_oc.plan_id else None
        p_name = p.name if p else (plan_oc.plan_name or "Otro plan")

        if p_name not in by_plan:
            by_plan[p_name] = {
                "plan_id": plan_oc.plan_id or 0,
                "plan_name": p_name,
                "orders": 0,
                "revenue": 0.0,
            }
        by_plan[p_name]["orders"] += qty
        by_plan[p_name]["revenue"] += line_rev

    total_orders = len(seen_cremations)
    avg_ticket = round(total_revenue / total_orders, 0) if total_orders > 0 else 0.0

    return {
        "by_plan": by_plan,
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 0),
        "avg_ticket": avg_ticket,
    }


def get_tenant_plan_impact(
    db: Session,
    tenant_id: int,
    event_id: Optional[int] = None,
    window_days: int = 14,
) -> dict[str, Any]:
    """
    Retorna la bitácora de cambios en planes del crematorio y la comparativa
    Antes vs. Después para el hito seleccionado (o el más reciente).
    """
    window_days = max(3, min(int(window_days or 14), 90))
    now = tz.get_now()

    events = (
        db.query(models.TenantPlanChangeEvent)
        .filter(models.TenantPlanChangeEvent.tenant_id == tenant_id)
        .order_by(models.TenantPlanChangeEvent.created_at.desc())
        .limit(25)
        .all()
    )

    selected_event: Optional[models.TenantPlanChangeEvent] = None
    if event_id is not None:
        selected_event = next((e for e in events if e.id == event_id), None)
        if not selected_event:
            selected_event = (
                db.query(models.TenantPlanChangeEvent)
                .filter(
                    models.TenantPlanChangeEvent.tenant_id == tenant_id,
                    models.TenantPlanChangeEvent.id == event_id,
                )
                .first()
            )
    elif events:
        selected_event = events[0]

    pivot_dt = selected_event.created_at if selected_event else (now - timedelta(days=window_days))
    if pivot_dt.tzinfo is None and now.tzinfo is not None:
        pivot_dt = pivot_dt.replace(tzinfo=now.tzinfo)

    before_start = pivot_dt - timedelta(days=window_days)
    before_end = pivot_dt
    after_start = pivot_dt
    after_end = min(now, pivot_dt + timedelta(days=window_days))

    effective_after_days = max(1.0, (after_end - after_start).total_seconds() / 86400.0)
    effective_before_days = float(window_days)

    plans = (
        db.query(models.Plan)
        .filter(models.Plan.tenant_id == tenant_id)
        .order_by(models.Plan.sort_order.asc(), models.Plan.id.asc())
        .all()
    )
    plans_by_id = {p.id: p for p in plans}

    before_m = _compute_orders_window(db, tenant_id, before_start, before_end, plans_by_id)
    after_m = _compute_orders_window(db, tenant_id, after_start, after_end, plans_by_id)

    daily_rev_b = before_m["total_revenue"] / effective_before_days
    daily_rev_a = after_m["total_revenue"] / effective_after_days
    daily_rev_delta_pct = (
        round(((daily_rev_a - daily_rev_b) / daily_rev_b) * 100, 1)
        if daily_rev_b > 0
        else (100.0 if daily_rev_a > 0 else 0.0)
    )

    daily_ord_b = before_m["total_orders"] / effective_before_days
    daily_ord_a = after_m["total_orders"] / effective_after_days
    daily_ord_delta_pct = (
        round(((daily_ord_a - daily_ord_b) / daily_ord_b) * 100, 1)
        if daily_ord_b > 0
        else (100.0 if daily_ord_a > 0 else 0.0)
    )

    all_plan_names = list(dict.fromkeys(list(before_m["by_plan"].keys()) + list(after_m["by_plan"].keys())))
    tot_ord_b = sum(v["orders"] for v in before_m["by_plan"].values())
    tot_ord_a = sum(v["orders"] for v in after_m["by_plan"].values())

    plan_rows = []
    for p_name in all_plan_names:
        b = before_m["by_plan"].get(p_name, {"plan_id": 0, "orders": 0, "revenue": 0.0})
        a = after_m["by_plan"].get(p_name, {"plan_id": 0, "orders": 0, "revenue": 0.0})
        p_obj = next((p for p in plans if p.name == p_name), None)

        rate_b = b["orders"] / effective_before_days
        rate_a = a["orders"] / effective_after_days
        delta_pct = round(((rate_a - rate_b) / rate_b) * 100, 1) if rate_b > 0 else (100.0 if rate_a > 0 else 0.0)

        plan_rows.append({
            "plan_id": p_obj.id if p_obj else (a.get("plan_id") or b.get("plan_id") or 0),
            "plan_name": p_name,
            "price": float(p_obj.price or 0) if p_obj else 0.0,
            "before": {
                "orders": b["orders"],
                "revenue": round(b["revenue"], 0),
                "share_pct": round((b["orders"] / tot_ord_b) * 100, 1) if tot_ord_b > 0 else 0.0,
            },
            "after": {
                "orders": a["orders"],
                "revenue": round(a["revenue"], 0),
                "share_pct": round((a["orders"] / tot_ord_a) * 100, 1) if tot_ord_a > 0 else 0.0,
            },
            "daily_rate_delta_pct": delta_pct,
        })

    return {
        "window_days": window_days,
        "effective_after_days": round(effective_after_days, 1),
        "pivot_date": pivot_dt.isoformat(),
        "selected_event": _serialize_event(selected_event) if selected_event else None,
        "events": [_serialize_event(e) for e in events],
        "summary": {
            "before": {
                "orders": before_m["total_orders"],
                "revenue": before_m["total_revenue"],
                "avg_ticket": before_m["avg_ticket"],
                "daily_revenue": round(daily_rev_b, 0),
            },
            "after": {
                "orders": after_m["total_orders"],
                "revenue": after_m["total_revenue"],
                "avg_ticket": after_m["avg_ticket"],
                "daily_revenue": round(daily_rev_a, 0),
            },
            "daily_revenue_delta_pct": daily_rev_delta_pct,
            "daily_orders_delta_pct": daily_ord_delta_pct,
        },
        "plans": plan_rows,
    }
