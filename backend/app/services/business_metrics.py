"""Métricas del negocio para el SuperAdmin (Admin → Comercial → «Métricas del negocio»).

- MRR: lo que factura Vinzer al mes. Por crematorio ACTIVO con plan pagado: el
  precio congelado `contracted_price` (o el de lista del ciclo si no hay) dividido
  por los meses del ciclo. Usa el plan contratado, no la demo.
- Altas, subidas y bajas por mes: sys_tenant_events (services/tenant_events.py).
- En riesgo: crematorios activos sin uso hace INACTIVE_DAYS o más (último uso =
  lo más reciente entre el panel, la última orden y el último cambio registrado).
- Oportunidades: crematorios que usan ≥ 80 % de sus órdenes del mes o de sus
  usuarios, con el plan siguiente sugerido.
"""
from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app import models
from app.services.plan_pricing import CYCLE_MONTHS, cycle_price
from app.utils import tz

INACTIVE_DAYS = 14
NEAR_LIMIT = 0.8
UNLIMITED = 999999
MONTHS_SERIES = 12


def _value(v):
    return getattr(v, "value", v)


def mrr_for(status, plan, contracted_price, cycle) -> float:
    """Equivalente mensual de lo que paga un crematorio (0 si no está activo o es gratis)."""
    if _value(status) != "active" or plan is None or not plan.price:
        return 0.0
    amount = contracted_price or cycle_price(plan, cycle)
    return round(float(amount) / CYCLE_MONTHS.get(cycle or "monthly", 1), 2)


def tenant_mrr(tenant) -> float:
    return mrr_for(tenant.status, tenant.subscription_plan, tenant.contracted_price, tenant.billing_cycle)


def _aware(dt):
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=tz.get_now().tzinfo)


def _month_starts(now: datetime, n: int) -> list[datetime]:
    first = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    out = []
    for i in range(n - 1, -1, -1):
        y, m = first.year, first.month - i
        while m <= 0:
            m += 12
            y -= 1
        out.append(first.replace(year=y, month=m))
    return out


def _next_plan(plans: list, current) -> dict | None:
    """Plan pagado siguiente (por precio) al actual, para sugerirlo."""
    price = (current.price or 0) if current else 0
    higher = [p for p in plans if (p.price or 0) > price]
    if not higher:
        return None
    p = min(higher, key=lambda x: x.price)
    return {"name": p.name, "price": p.price}


def summary(db: Session) -> dict:
    now = tz.get_now()
    tenants = db.query(models.Tenant).options(
        joinedload(models.Tenant.subscription_plan),
    ).all()
    plans = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.is_active.is_(True)).all()

    # --- MRR y crematorios por plan --------------------------------------------
    by_plan: dict[str, dict] = {}
    total_mrr = 0.0
    paying = free = active = 0
    for t in tenants:
        status = _value(t.status)
        plan_name = t.subscription_plan.name if t.subscription_plan else (t.plan or "FREE")
        row = by_plan.setdefault(plan_name, {"plan": plan_name, "tenants": 0, "active": 0, "mrr": 0.0,
                                             "price": t.subscription_plan.price if t.subscription_plan else 0})
        row["tenants"] += 1
        if status != "active":
            continue
        active += 1
        row["active"] += 1
        m = tenant_mrr(t)
        row["mrr"] = round(row["mrr"] + m, 2)
        total_mrr += m
        if m > 0:
            paying += 1
        else:
            free += 1

    # --- Último uso por crematorio ---------------------------------------------
    last_seen = dict(db.query(models.User.tenant_id, func.max(models.User.last_seen_at))
                     .group_by(models.User.tenant_id).all())
    last_order = dict(db.query(models.CremationOC.tenant_id, func.max(models.CremationOC.created_at))
                      .group_by(models.CremationOC.tenant_id).all())
    last_change = dict(db.query(models.AuditLog.tenant_id, func.max(models.AuditLog.created_at))
                       .filter(models.AuditLog.tenant_id.isnot(None))
                       .group_by(models.AuditLog.tenant_id).all())
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    orders_month = dict(db.query(models.CremationOC.tenant_id, func.count(models.CremationOC.id))
                        .filter(models.CremationOC.created_at >= month_start)
                        .group_by(models.CremationOC.tenant_id).all())
    orders_30 = dict(db.query(models.CremationOC.tenant_id, func.count(models.CremationOC.id))
                     .filter(models.CremationOC.created_at >= now - timedelta(days=30))
                     .group_by(models.CremationOC.tenant_id).all())
    users_count = dict(db.query(models.User.tenant_id, func.count(models.User.id))
                       .filter(models.User.is_active.is_(True), models.User.role != models.UserRole.creator)
                       .group_by(models.User.tenant_id).all())
    owners = {}
    for u in db.query(models.User).filter(models.User.role == models.UserRole.admin, models.User.is_active.is_(True)) \
            .order_by(models.User.id).all():
        owners.setdefault(u.tenant_id, u)

    at_risk, opportunities = [], []
    for t in tenants:
        if _value(t.status) != "active" or t.slug == "system-admin":
            continue
        plan = t.subscription_plan
        candidates = [_aware(x) for x in (last_seen.get(t.id), last_order.get(t.id), last_change.get(t.id)) if x]
        last = max(candidates) if candidates else None
        created = _aware(t.created_at)
        owner = owners.get(t.id)
        base = {
            "id": t.id, "name": t.name, "slug": t.slug, "plan": plan.name if plan else (t.plan or "FREE"),
            "mrr": tenant_mrr(t), "email": (owner.email if owner else None) or t.email, "phone": t.phone,
            "contact_name": owner.name if owner else None,
            "last_activity": last, "orders_30d": orders_30.get(t.id, 0),
            "signup_source": t.signup_source,
        }
        reference = last or created
        if reference and now - reference >= timedelta(days=INACTIVE_DAYS):
            at_risk.append({**base, "days_inactive": (now - reference).days, "never_used": last is None})

        reasons = []
        if plan and plan.max_orders and 0 < plan.max_orders < UNLIMITED:
            used = orders_month.get(t.id, 0)
            if used >= plan.max_orders * NEAR_LIMIT:
                reasons.append({"resource": "orders", "label": "Órdenes del mes", "usage": used, "max": plan.max_orders})
        if plan and plan.max_users and 1 < plan.max_users < UNLIMITED:
            used = users_count.get(t.id, 0)
            if used >= plan.max_users * NEAR_LIMIT:
                reasons.append({"resource": "users", "label": "Usuarios", "usage": used, "max": plan.max_users})
        if reasons:
            opportunities.append({**base, "reasons": reasons, "suggested_plan": _next_plan(plans, plan)})

    at_risk.sort(key=lambda r: (-r["mrr"], -r["days_inactive"]))
    opportunities.sort(key=lambda r: -max(x["usage"] / x["max"] for x in r["reasons"]))

    # --- Serie mensual (altas, subidas, bajas) ---------------------------------
    starts = _month_starts(now, MONTHS_SERIES)
    events = db.query(models.TenantEvent).filter(models.TenantEvent.created_at >= starts[0]).all()
    series = []
    for i, start in enumerate(starts):
        end = starts[i + 1] if i + 1 < len(starts) else None
        def in_month(dt):
            dt = _aware(dt)
            return dt is not None and dt >= start and (end is None or dt < end)
        new = [t for t in tenants if in_month(t.created_at)]
        month_events = [e for e in events if in_month(e.created_at)]
        upgrades = sum(1 for e in month_events if e.kind != "created" and (e.to_mrr or 0) > (e.from_mrr or 0))
        downgrades = sum(1 for e in month_events if e.kind != "created" and (e.to_mrr or 0) < (e.from_mrr or 0))
        mrr_delta = round(sum((e.to_mrr or 0) - (e.from_mrr or 0) for e in month_events), 2)
        series.append({
            "month": start.strftime("%Y-%m"), "signups": len(new),
            "self_signups": sum(1 for t in new if t.signup_source == "self"),
            "upgrades": upgrades, "downgrades": downgrades, "mrr_change": mrr_delta,
        })
    first_event = db.query(func.min(models.TenantEvent.created_at)).filter(models.TenantEvent.kind != "created").scalar()

    return {
        "generated_at": now,
        "mrr": round(total_mrr, 2),
        "arr": round(total_mrr * 12, 2),
        "arpa": round(total_mrr / paying, 2) if paying else 0,
        "tenants": {"total": len(tenants), "active": active, "paying": paying, "free": free},
        "by_plan": sorted(by_plan.values(), key=lambda r: r["price"] or 0),
        "series": series,
        "history_since": first_event,
        "at_risk": at_risk,
        "opportunities": opportunities,
        "inactive_days": INACTIVE_DAYS,
    }
