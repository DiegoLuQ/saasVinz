"""Cálculo del resumen del dashboard del tenant.

Única fuente de verdad para /dashboard/summary, /dashboard/trend y el bloque
`dashboard` del bootstrap: antes cada uno tenía su propia copia y los números
de ingresos ya no coincidían entre sí.
"""
from datetime import datetime, timedelta
from typing import List, Optional, Sequence

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app import models
from app.api.internal.operations import schemas
from app.utils import tz
from app.utils.limit_checker import LimitChecker

# Estado final único = entregado (se incluyen alias/legacy por compatibilidad)
FINAL_STATUSES = ('entregado', 'delivered', 'completado', 'completed')
CANCELED_STATUSES = ('cancelado', 'canceled', 'cancelled', 'rejected', 'rechazado', 'rechazado_por_cliente')
CLOSED_STATUSES = FINAL_STATUSES + CANCELED_STATUSES

ACTIVE_LIST_LIMIT = 8
MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]


def _month_start(year: int, month: int) -> datetime:
    while month <= 0:
        month += 12
        year -= 1
    while month > 12:
        month -= 12
        year += 1
    return datetime(year, month, 1, tzinfo=tz.CHILE_TZ)


def _items_sum(model):
    return (
        select(func.coalesce(func.sum(model.precio_venta), 0.0))
        .where(model.cremation_id == models.CremationOC.id)
        .correlate(models.CremationOC)
        .scalar_subquery()
    )


def _order_revenue_expr():
    """total_price de la OC si está seteado; si no, suma de servicios + planes + productos."""
    items = _items_sum(models.ServicioOC) + _items_sum(models.PlanOC) + _items_sum(models.ProductoOC)
    return case(
        (models.CremationFinancial.total_price > 0, models.CremationFinancial.total_price),
        else_=items,
    )


def _revenue_query(db: Session, tenant_id: int):
    return (
        db.query(func.count(models.CremationOC.id), func.coalesce(func.sum(_order_revenue_expr()), 0.0))
        .outerjoin(models.CremationFinancial, models.CremationFinancial.cremation_id == models.CremationOC.id)
        .filter(models.CremationOC.tenant_id == tenant_id)
    )


def delivered_between(db: Session, tenant_id: int, start: datetime, end: datetime) -> tuple[int, float]:
    """(cantidad, ingresos) de órdenes entregadas en [start, end).
    Fecha de cierre = scheduling.completed_at; si falta, la de creación."""
    closed_at = func.coalesce(models.CremationScheduling.completed_at, models.CremationOC.created_at)
    count, revenue = (
        _revenue_query(db, tenant_id)
        .outerjoin(models.CremationScheduling, models.CremationScheduling.cremation_id == models.CremationOC.id)
        .filter(
            models.CremationOC.status.in_(FINAL_STATUSES),
            closed_at >= start,
            closed_at < end,
        )
        .one()
    )
    return int(count or 0), float(revenue or 0.0)


def pending_revenue(db: Session, tenant_id: int) -> float:
    """Monto de órdenes aún abiertas (ni entregadas ni canceladas)."""
    _, revenue = _revenue_query(db, tenant_id).filter(
        models.CremationOC.status.notin_(CLOSED_STATUSES)
    ).one()
    return float(revenue or 0.0)


def build_trend(db: Session, tenant_id: int, months: int = 6) -> List[dict]:
    now = tz.get_now()
    trend = []
    for i in range(months - 1, -1, -1):
        start = _month_start(now.year, now.month - i)
        end = _month_start(start.year, start.month + 1)
        count, revenue = delivered_between(db, tenant_id, start, end)
        trend.append({"month": MONTHS_ES[start.month - 1], "cremations": count, "revenue": revenue})
    return trend


def _format_time(dt: Optional[datetime], today) -> str:
    if not dt:
        return "N/A"
    local = tz.to_santiago(dt)
    return local.strftime("%H:%M") if local.date() == today else local.strftime("%d/%m %H:%M")


def _format_orders(orders: Sequence[models.CremationOC], today) -> List[schemas.DashboardRecentActivity]:
    formatted = []
    for c in orders:
        pet = c.pet
        customer = pet.customer if pet else None
        tech = c.technical

        main_service_name = "Servicio"
        if c.servicios:
            main_service_name = c.servicios[0].service.name if c.servicios[0].service else "Servicio"
        elif c.planes:
            main_service_name = c.planes[0].plan.name if c.planes[0].plan else "Plan de Cremación"

        scheduled_at = c.scheduling.scheduled_at if c.scheduling else None
        formatted.append(schemas.DashboardRecentActivity(
            id=c.id,
            pet=pet.name if pet else "Desconocida",
            pet_image=(pet.images[0] if pet.images else None) if pet else None,
            client=customer.name if customer else "Desconocido",
            service_name=main_service_name,
            amount=c.financial.total_price if c.financial and c.financial.total_price else 0.0,
            status=c.status or "",
            step_name=tech.step.name if tech and tech.step else None,
            time=_format_time(scheduled_at or (tech.start_at if tech else None), today),
        ))
    return formatted


def _orders_query(db: Session, tenant_id: int):
    return db.query(models.CremationOC).options(
        joinedload(models.CremationOC.scheduling),
        joinedload(models.CremationOC.financial),
        joinedload(models.CremationOC.technical).joinedload(models.CremationTechnical.step),
        selectinload(models.CremationOC.servicios).joinedload(models.ServicioOC.service),
        selectinload(models.CremationOC.planes).joinedload(models.PlanOC.plan),
        selectinload(models.CremationOC.pet).selectinload(models.Pet.customer),
    ).filter(models.CremationOC.tenant_id == tenant_id)


def build_dashboard_summary(
    db: Session,
    tenant: models.Tenant,
    include_lists: bool = True,
) -> schemas.DashboardSummarySchema:
    """Resumen del dashboard. `include_lists=False` omite las listas de órdenes
    (el bootstrap solo necesita límites e ingresos)."""
    tenant_id = tenant.id
    plan = tenant.effective_plan
    now = tz.get_now()
    today = now.date()

    month_start = _month_start(now.year, now.month)
    cremations_this_month, monthly_revenue = delivered_between(db, tenant_id, month_start, now + timedelta(seconds=1))

    # Mes anterior hasta el mismo punto del mes (comparación justa mes-a-la-fecha)
    prev_start = _month_start(now.year, now.month - 1)
    prev_cutoff = min(prev_start + (now - month_start), month_start)
    _, previous_month_revenue = delivered_between(db, tenant_id, prev_start, prev_cutoff)

    usage = {name: LimitChecker.get_usage(db, tenant_id, name) for name in LimitChecker.RESOURCE_CONFIG}

    def limit(name: str) -> schemas.DashboardLimitItem:
        field = LimitChecker.RESOURCE_CONFIG[name]["limit_field"]
        return schemas.DashboardLimitItem(usage=usage[name], max=(getattr(plan, field, 0) or 0) if plan else 0)

    total_customers = db.query(func.count(models.Customer.id)).filter(models.Customer.tenant_id == tenant_id).scalar() or 0
    total_pets = db.query(func.count(models.Pet.id)).filter(models.Pet.tenant_id == tenant_id).scalar() or 0
    total_delivered = db.query(func.count(models.CremationOC.id)).filter(
        models.CremationOC.tenant_id == tenant_id,
        models.CremationOC.status.in_(FINAL_STATUSES),
    ).scalar() or 0

    active_filter = models.CremationOC.status.notin_(CLOSED_STATUSES)
    active_count = db.query(func.count(models.CremationOC.id)).filter(
        models.CremationOC.tenant_id == tenant_id, active_filter
    ).scalar() or 0

    recent: List[schemas.DashboardRecentActivity] = []
    today_list: List[schemas.DashboardRecentActivity] = []
    if include_lists:
        day_start = datetime(today.year, today.month, today.day, tzinfo=tz.CHILE_TZ)
        today_orders = (
            _orders_query(db, tenant_id)
            .join(models.CremationScheduling, models.CremationScheduling.cremation_id == models.CremationOC.id)
            .filter(
                models.CremationScheduling.scheduled_at >= day_start,
                models.CremationScheduling.scheduled_at < day_start + timedelta(days=1),
                models.CremationOC.status.notin_(CANCELED_STATUSES),
            )
            .order_by(models.CremationScheduling.scheduled_at.asc())
            .all()
        )
        today_ids = [c.id for c in today_orders]

        active_q = _orders_query(db, tenant_id).filter(active_filter)
        if today_ids:
            active_q = active_q.filter(models.CremationOC.id.notin_(today_ids))
        active_orders = active_q.order_by(models.CremationOC.id.desc()).limit(ACTIVE_LIST_LIMIT).all()

        today_list = _format_orders(today_orders, today)
        recent = _format_orders(active_orders, today)

    return schemas.DashboardSummarySchema(
        stats=schemas.DashboardStatData(
            total_customers=total_customers,
            total_pets=total_pets,
            total_orders=total_delivered,
            total_services=usage["services"],
            total_users=usage["users"],
            cremations_this_month=cremations_this_month,
            monthly_revenue=monthly_revenue,
            pending_revenue=pending_revenue(db, tenant_id),
            previous_month_revenue=previous_month_revenue,
        ),
        limits=schemas.DashboardLimitsData(
            pets=limit("pets"),
            customers=limit("customers"),
            orders=limit("orders"),
            services=limit("services"),
            products=limit("products"),
            plans=limit("plans"),
            partners=limit("partners"),
            users=limit("users"),
        ),
        recent_cremations=recent,
        today_cremations=today_list,
        active_count=active_count,
    )
