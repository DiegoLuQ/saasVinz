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

OWNER_ROLES = ('admin', 'contabilidad', 'creator')

ACTIVE_LIST_LIMIT = 8
MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]


def _is_owner_user(current_user: Optional[models.User]) -> bool:
    if not current_user:
        return True
    role = (getattr(current_user, "role", None) or "").strip().lower()
    return role in OWNER_ROLES


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


def build_trend(
    db: Session,
    tenant_id: int,
    months: int = 6,
    current_user: Optional[models.User] = None,
) -> List[dict]:
    is_owner = _is_owner_user(current_user)
    now = tz.get_now()
    trend = []
    for i in range(months - 1, -1, -1):
        start = _month_start(now.year, now.month - i)
        end = _month_start(start.year, start.month + 1)
        count, revenue = delivered_between(db, tenant_id, start, end)
        trend.append({
            "month": MONTHS_ES[start.month - 1],
            "cremations": count,
            "revenue": revenue if is_owner else 0.0,
        })
    return trend


def _format_time(dt: Optional[datetime], today) -> str:
    if not dt:
        return "N/A"
    local = tz.to_santiago(dt)
    return local.strftime("%H:%M") if local.date() == today else local.strftime("%d/%m %H:%M")


def _format_orders(
    orders: Sequence[models.CremationOC],
    today,
    is_owner: bool = True,
    now: Optional[datetime] = None,
) -> List[schemas.DashboardRecentActivity]:
    if now is None:
        now = tz.get_now()
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
        is_overdue = bool(
            scheduled_at
            and tz.to_santiago(scheduled_at) < now
            and (c.status or "").lower() not in CLOSED_STATUSES
        )

        formatted.append(schemas.DashboardRecentActivity(
            id=c.id,
            pet=pet.name if pet else "Desconocida",
            pet_species=pet.species if pet else None,
            pet_image=(pet.images[0] if pet.images else None) if pet else None,
            client=customer.name if customer else "Desconocido",
            service_name=main_service_name,
            amount=float(c.financial.total_price if c.financial and c.financial.total_price else 0.0) if is_owner else 0.0,
            status=c.status or "",
            step_name=tech.step.name if tech and tech.step else None,
            time=_format_time(scheduled_at or (tech.start_at if tech else None), today),
            verification_code=c.verification_code,
            is_overdue=is_overdue,
            scheduled_at_iso=scheduled_at.isoformat() if scheduled_at else None,
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
    current_user: Optional[models.User] = None,
) -> schemas.DashboardSummarySchema:
    """Resumen del dashboard. `include_lists=False` omite las listas de órdenes
    (el bootstrap solo necesita límites e ingresos)."""
    is_owner = _is_owner_user(current_user)
    tenant_id = tenant.id
    plan = tenant.effective_plan
    now = tz.get_now()
    today = now.date()

    month_start = _month_start(now.year, now.month)
    cremations_this_month, monthly_revenue_raw = delivered_between(db, tenant_id, month_start, now + timedelta(seconds=1))

    # Mes anterior hasta el mismo punto del mes (comparación justa mes-a-la-fecha)
    prev_start = _month_start(now.year, now.month - 1)
    prev_cutoff = min(prev_start + (now - month_start), month_start)
    cremations_previous_month, prev_month_revenue_raw = delivered_between(db, tenant_id, prev_start, prev_cutoff)

    pending_revenue_raw = pending_revenue(db, tenant_id)

    monthly_revenue = monthly_revenue_raw if is_owner else 0.0
    pending_revenue_val = pending_revenue_raw if is_owner else 0.0
    previous_month_revenue = prev_month_revenue_raw if is_owner else 0.0

    # Órdenes de veterinarias en el mes
    month_end = now + timedelta(seconds=1)
    partner_orders_this_month = (
        db.query(func.count(models.CremationOC.id))
        .filter(
            models.CremationOC.tenant_id == tenant_id,
            models.CremationOC.partner_link_id.isnot(None),
            models.CremationOC.created_at >= month_start,
            models.CremationOC.created_at < month_end,
            models.CremationOC.status.notin_(CANCELED_STATUSES),
        )
        .scalar() or 0
    )

    # Comisiones pendientes a veterinarias
    if is_owner:
        pending_commissions_amount = float(
            db.query(func.coalesce(func.sum(models.PartnerCommission.amount), 0.0))
            .join(models.PartnerLink, models.PartnerLink.id == models.PartnerCommission.partner_link_id)
            .filter(
                models.PartnerLink.tenant_id == tenant_id,
                func.lower(models.PartnerCommission.status).in_(('pendiente', 'pending')),
            )
            .scalar() or 0.0
        )
    else:
        pending_commissions_amount = 0.0

    def _created_between(model, start, end) -> int:
        return db.query(func.count(model.id)).filter(
            model.tenant_id == tenant_id, model.created_at >= start, model.created_at < end
        ).scalar() or 0

    usage = {name: LimitChecker.get_usage(db, tenant_id, name) for name in LimitChecker.RESOURCE_CONFIG}

    def limit(name: str) -> schemas.DashboardLimitItem:
        # Mascotas y clientes no son límite de los planes: max 0 = sin límite.
        if name in ("pets", "customers"):
            return schemas.DashboardLimitItem(usage=usage[name], max=0)
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

    # Mini embudo operativo (pipeline counts)
    por_iniciar_count = (
        db.query(func.count(models.CremationOC.id))
        .filter(
            models.CremationOC.tenant_id == tenant_id,
            models.CremationOC.status.notin_(CLOSED_STATUSES),
            models.CremationOC.status.notin_(('en_proceso', 'processing', 'in_progress', 'ready')),
        )
        .scalar() or 0
    )

    en_planta_count = (
        db.query(func.count(models.CremationOC.id))
        .filter(
            models.CremationOC.tenant_id == tenant_id,
            models.CremationOC.status.in_(('en_proceso', 'processing', 'in_progress', 'ready')),
        )
        .scalar() or 0
    )

    atrasadas_count = (
        db.query(func.count(models.CremationOC.id))
        .join(models.CremationScheduling, models.CremationScheduling.cremation_id == models.CremationOC.id)
        .filter(
            models.CremationOC.tenant_id == tenant_id,
            models.CremationOC.status.notin_(CLOSED_STATUSES),
            models.CremationScheduling.scheduled_at.isnot(None),
            models.CremationScheduling.scheduled_at < now,
        )
        .scalar() or 0
    )

    pipeline_counts = schemas.DashboardPipelineCounts(
        por_iniciar=por_iniciar_count,
        en_planta=en_planta_count,
        atrasadas=atrasadas_count,
    )

    recent: List[schemas.DashboardRecentActivity] = []
    today_list: List[schemas.DashboardRecentActivity] = []
    overdue_list: List[schemas.DashboardRecentActivity] = []
    low_stock_list: List[schemas.DashboardLowStockProduct] = []

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

        overdue_orders = (
            _orders_query(db, tenant_id)
            .join(models.CremationScheduling, models.CremationScheduling.cremation_id == models.CremationOC.id)
            .filter(
                models.CremationOC.status.notin_(CLOSED_STATUSES),
                models.CremationScheduling.scheduled_at.isnot(None),
                models.CremationScheduling.scheduled_at < now,
            )
            .order_by(models.CremationScheduling.scheduled_at.asc())
            .limit(10)
            .all()
        )

        today_list = _format_orders(today_orders, today, is_owner=is_owner, now=now)
        recent = _format_orders(active_orders, today, is_owner=is_owner, now=now)
        overdue_list = _format_orders(overdue_orders, today, is_owner=is_owner, now=now)

        low_stock_raw = (
            db.query(models.Product)
            .options(joinedload(models.Product.category))
            .filter(
                models.Product.tenant_id == tenant_id,
                models.Product.is_active == True,
                models.Product.stock <= 3,
            )
            .order_by(models.Product.stock.asc())
            .limit(6)
            .all()
        )
        low_stock_list = [
            schemas.DashboardLowStockProduct(
                id=p.id,
                name=p.name,
                code=p.code,
                stock=p.stock or 0,
                category_name=p.category.name if p.category else None,
                image_url=p.image_url,
            )
            for p in low_stock_raw
        ]

    return schemas.DashboardSummarySchema(
        stats=schemas.DashboardStatData(
            total_customers=total_customers,
            total_pets=total_pets,
            total_orders=total_delivered,
            total_services=usage["services"],
            total_users=usage["users"],
            cremations_this_month=cremations_this_month,
            monthly_revenue=monthly_revenue,
            pending_revenue=pending_revenue_val,
            previous_month_revenue=previous_month_revenue,
            new_pets_this_month=_created_between(models.Pet, month_start, month_end),
            new_pets_previous_month=_created_between(models.Pet, prev_start, prev_cutoff),
            new_customers_this_month=_created_between(models.Customer, month_start, month_end),
            new_customers_previous_month=_created_between(models.Customer, prev_start, prev_cutoff),
            cremations_previous_month=cremations_previous_month,
            partner_orders_this_month=partner_orders_this_month,
            pending_commissions_amount=pending_commissions_amount,
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
        overdue_cremations=overdue_list,
        pipeline_counts=pipeline_counts,
        low_stock_products=low_stock_list,
        active_count=active_count,
    )
