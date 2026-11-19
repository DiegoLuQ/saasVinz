"""
Servicio de analítica de impacto de cambios en planes (Packaging & Strategy Impact).
Registra automáticamente cambios en módulos/precios/límites de planes y compara
ventas, ingresos y upgrades antes vs. después de cada hito.
"""
from datetime import datetime, timedelta
from typing import Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models
from app.api.internal.creator.subscriptions.models import PaymentStatus
from app.utils import tz


LIMIT_FIELDS = (
    "max_pets",
    "max_services",
    "max_plans",
    "max_products",
    "max_orders",
    "max_customers",
    "max_users",
    "max_partners",
    "can_delete",
    "can_export",
)


def snapshot_plan(plan: models.SubscriptionPlan) -> dict[str, Any]:
    """Captura una foto comparable de los atributos clave de un plan."""
    snap: dict[str, Any] = {
        "name": plan.name,
        "price": float(plan.price or 0),
        "allowed_modules": sorted(set(plan.allowed_modules or [])),
    }
    for field in LIMIT_FIELDS:
        snap[field] = getattr(plan, field, None)
    return snap


def record_plan_diff_event(
    db: Session,
    plan: models.SubscriptionPlan,
    before: dict[str, Any],
    user_id: Optional[int] = None,
) -> Optional[models.PlanChangeEvent]:
    """
    Compara `before` contra el estado actual de `plan` y guarda un evento
    en `sys_plan_change_events` si hubo cambios en módulos, precio o límites.
    """
    after = snapshot_plan(plan)

    old_mods = set(before.get("allowed_modules") or [])
    new_mods = set(after.get("allowed_modules") or [])
    added_modules = sorted(new_mods - old_mods)
    removed_modules = sorted(old_mods - new_mods)

    price_before = before.get("price", 0)
    price_after = after.get("price", 0)
    price_changed = abs(price_after - price_before) > 0.01

    limits_changed: dict[str, dict[str, Any]] = {}
    for field in LIMIT_FIELDS:
        if before.get(field) != after.get(field):
            limits_changed[field] = {"before": before.get(field), "after": after.get(field)}

    if not added_modules and not removed_modules and not price_changed and not limits_changed:
        return None

    parts: list[str] = []
    if added_modules:
        parts.append(f"+{len(added_modules)} módulo{'s' if len(added_modules) > 1 else ''}")
    if removed_modules:
        parts.append(f"-{len(removed_modules)} módulo{'s' if len(removed_modules) > 1 else ''}")
    if price_changed:
        parts.append(f"precio ${int(price_before):,} → ${int(price_after):,}".replace(",", "."))
    if limits_changed:
        parts.append(f"{len(limits_changed)} límite{'s' if len(limits_changed) > 1 else ''}")

    title = f"Plan {plan.name}: {', '.join(parts)}"

    changes_payload: dict[str, Any] = {}
    if added_modules:
        changes_payload["added_modules"] = added_modules
    if removed_modules:
        changes_payload["removed_modules"] = removed_modules
    if price_changed:
        changes_payload["price_before"] = price_before
        changes_payload["price_after"] = price_after
    if limits_changed:
        changes_payload["limits_changed"] = limits_changed

    event = models.PlanChangeEvent(
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


def _serialize_event(ev: models.PlanChangeEvent) -> dict[str, Any]:
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


def _compute_window_metrics(
    db: Session,
    start_dt: datetime,
    end_dt: datetime,
    plans_by_id: dict[int, models.SubscriptionPlan],
) -> dict[str, Any]:
    """Calcula ventas por plan, ingresos y upgrades dentro de [start_dt, end_dt)."""
    # 1. Suscripciones nuevas/activadas en la ventana
    subs = (
        db.query(models.TenantSubscription)
        .filter(
            models.TenantSubscription.created_at >= start_dt,
            models.TenantSubscription.created_at < end_dt,
        )
        .all()
    )

    # 2. Transacciones completadas en la ventana
    txns = (
        db.query(models.BillingTransaction)
        .filter(
            models.BillingTransaction.payment_status == PaymentStatus.COMPLETED,
            func.coalesce(models.BillingTransaction.payment_date, models.BillingTransaction.created_at) >= start_dt,
            func.coalesce(models.BillingTransaction.payment_date, models.BillingTransaction.created_at) < end_dt,
        )
        .all()
    )

    by_plan: dict[str, dict[str, Any]] = {}
    for p in plans_by_id.values():
        key = p.name
        by_plan[key] = {
            "plan_id": p.id,
            "plan_name": p.name,
            "subscriptions": 0,
            "payments": 0,
            "revenue": 0.0,
        }

    for s in subs:
        p = plans_by_id.get(s.subscription_plan_id)
        if not p:
            continue
        by_plan[p.name]["subscriptions"] += 1

    upgrades_count = 0
    total_revenue = 0.0
    total_payments = 0

    for t in txns:
        amt = float(t.amount or 0)
        total_revenue += amt
        total_payments += 1

        if t.target_plan_id is not None:
            upgrades_count += 1

        plan_id = t.target_plan_id or (t.subscription.subscription_plan_id if t.subscription else None)
        p = plans_by_id.get(plan_id) if plan_id else None
        if not p and t.tenant and t.tenant.subscription_plan_id:
            p = plans_by_id.get(t.tenant.subscription_plan_id)
        if p and p.name in by_plan:
            by_plan[p.name]["payments"] += 1
            by_plan[p.name]["revenue"] += amt

    total_subs = sum(v["subscriptions"] for v in by_plan.values())
    return {
        "by_plan": by_plan,
        "total_subscriptions": total_subs,
        "total_payments": total_payments,
        "total_revenue": round(total_revenue, 2),
        "upgrades": upgrades_count,
    }


def get_plan_impact_analysis(
    db: Session,
    event_id: Optional[int] = None,
    window_days: int = 14,
) -> dict[str, Any]:
    """
    Devuelve la línea de tiempo de cambios en planes y la comparativa
    Antes vs. Después para el hito seleccionado (o el más reciente).
    """
    window_days = max(3, min(int(window_days or 14), 90))
    now = tz.get_now()

    events = (
        db.query(models.PlanChangeEvent)
        .order_by(models.PlanChangeEvent.created_at.desc())
        .limit(25)
        .all()
    )

    selected_event: Optional[models.PlanChangeEvent] = None
    if event_id is not None:
        selected_event = next((e for e in events if e.id == event_id), None)
        if not selected_event:
            selected_event = db.query(models.PlanChangeEvent).filter(models.PlanChangeEvent.id == event_id).first()
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

    plans = db.query(models.SubscriptionPlan).order_by(models.SubscriptionPlan.display_order.asc()).all()
    plans_by_id = {p.id: p for p in plans}

    before_metrics = _compute_window_metrics(db, before_start, before_end, plans_by_id)
    after_metrics = _compute_window_metrics(db, after_start, after_end, plans_by_id)

    # Normalizar ritmo diario para comparaciones justas cuando el hito es reciente
    daily_rev_before = before_metrics["total_revenue"] / effective_before_days
    daily_rev_after = after_metrics["total_revenue"] / effective_after_days
    daily_rev_delta_pct = (
        round(((daily_rev_after - daily_rev_before) / daily_rev_before) * 100, 1)
        if daily_rev_before > 0
        else (100.0 if daily_rev_after > 0 else 0.0)
    )

    daily_subs_before = before_metrics["total_subscriptions"] / effective_before_days
    daily_subs_after = after_metrics["total_subscriptions"] / effective_after_days
    daily_subs_delta_pct = (
        round(((daily_subs_after - daily_subs_before) / daily_subs_before) * 100, 1)
        if daily_subs_before > 0
        else (100.0 if daily_subs_after > 0 else 0.0)
    )

    plan_breakdown = []
    tot_subs_b = before_metrics["total_subscriptions"] or 0
    tot_subs_a = after_metrics["total_subscriptions"] or 0

    for p in plans:
        b = before_metrics["by_plan"].get(p.name, {"subscriptions": 0, "payments": 0, "revenue": 0.0})
        a = after_metrics["by_plan"].get(p.name, {"subscriptions": 0, "payments": 0, "revenue": 0.0})

        # Usar suscripciones o pagos (lo que sea mayor como señal de actividad por plan)
        vol_b = b["subscriptions"]
        vol_a = a["subscriptions"]
        rate_b = vol_b / effective_before_days
        rate_a = vol_a / effective_after_days
        delta_pct = round(((rate_a - rate_b) / rate_b) * 100, 1) if rate_b > 0 else (100.0 if rate_a > 0 else 0.0)

        plan_breakdown.append({
            "plan_id": p.id,
            "plan_name": p.name,
            "price": float(p.price or 0),
            "before": {
                "subscriptions": vol_b,
                "payments": b["payments"],
                "revenue": round(b["revenue"], 2),
                "share_pct": round((vol_b / tot_subs_b) * 100, 1) if tot_subs_b > 0 else 0.0,
            },
            "after": {
                "subscriptions": vol_a,
                "payments": a["payments"],
                "revenue": round(a["revenue"], 2),
                "share_pct": round((vol_a / tot_subs_a) * 100, 1) if tot_subs_a > 0 else 0.0,
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
                "subscriptions": before_metrics["total_subscriptions"],
                "payments": before_metrics["total_payments"],
                "revenue": before_metrics["total_revenue"],
                "upgrades": before_metrics["upgrades"],
                "daily_revenue": round(daily_rev_before, 2),
            },
            "after": {
                "subscriptions": after_metrics["total_subscriptions"],
                "payments": after_metrics["total_payments"],
                "revenue": after_metrics["total_revenue"],
                "upgrades": after_metrics["upgrades"],
                "daily_revenue": round(daily_rev_after, 2),
            },
            "daily_revenue_delta_pct": daily_rev_delta_pct,
            "daily_subscriptions_delta_pct": daily_subs_delta_pct,
        },
        "plans": plan_breakdown,
    }
