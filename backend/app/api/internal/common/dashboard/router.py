from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.database import get_db
from app import models
from app.api.deps import get_tenant_id
from datetime import datetime, timedelta
from app.utils import tz

router = APIRouter()

@router.get("/trend")
def get_dashboard_trend(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    today = tz.get_now().date()
    trend_data = []
    months_spanish = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    
    for i in range(5, -1, -1):
        current_year = today.year
        current_month = today.month - i
        while current_month <= 0:
            current_month += 12
            current_year -= 1
            
        month_start = datetime(current_year, current_month, 1).date()
        if current_month == 12:
            next_month_start = datetime(current_year + 1, 1, 1).date()
        else:
            next_month_start = datetime(current_year, current_month + 1, 1).date()
            
        month_label = months_spanish[current_month - 1]
        
        cremations_query = db.query(models.CremationOC).join(
            models.CremationScheduling, models.CremationOC.id == models.CremationScheduling.cremation_id
        ).options(
            joinedload(models.CremationOC.financial),
            joinedload(models.CremationOC.servicios).joinedload(models.ServicioOC.service),
            joinedload(models.CremationOC.planes).joinedload(models.PlanOC.plan),
            joinedload(models.CremationOC.productos)
        ).filter(
            models.CremationOC.tenant_id == tenant_id,
            # Estado final único = entregado (se incluyen alias/legacy por compatibilidad)
            models.CremationOC.status.in_(['entregado', 'delivered', 'completado', 'completed']),
            models.CremationScheduling.completed_at >= month_start,
            models.CremationScheduling.completed_at < next_month_start
        )
        
        cremations_count = cremations_query.count()
        
        revenue = 0.0
        for cremation in cremations_query.all():
            if cremation.financial and cremation.financial.total_price and cremation.financial.total_price > 0:
                revenue += cremation.financial.total_price
            else:
                revenue_from_services = sum(s.precio_venta for s in cremation.servicios) if cremation.servicios else 0
                revenue_from_plans = sum(p.precio_venta for p in cremation.planes) if cremation.planes else 0
                revenue_from_products = sum(pr.precio_venta for pr in cremation.productos) if cremation.productos else 0
                revenue += (revenue_from_services + revenue_from_plans + revenue_from_products)
                
        trend_data.append({
            "month": month_label,
            "cremations": cremations_count,
            "revenue": revenue
        })
        
    return trend_data

@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    # --- NUEVA LÓGICA DE LÍMITES Y USO ---
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.id == tenant.subscription_plan_id).first() if tenant else None
    
    today = tz.get_now().date()
    start_of_month = today.replace(day=1)

    # 1. Uso Mensual (Reinician)
    monthly_pets = db.query(models.Pet).filter(
        models.Pet.tenant_id == tenant_id,
        models.Pet.created_at >= start_of_month
    ).count()

    monthly_customers = db.query(models.Customer).filter(
        models.Customer.tenant_id == tenant_id,
        models.Customer.created_at >= start_of_month
    ).count()

    # Query for all monthly orders created in the current month
    monthly_orders = db.query(models.CremationOC).filter(
        models.CremationOC.tenant_id == tenant_id,
        models.CremationOC.created_at >= start_of_month
    ).count()

    # 2. Uso Total (No reinician)
    total_services = db.query(models.Service).filter(models.Service.tenant_id == tenant_id).count()
    total_products = db.query(models.Product).filter(models.Product.tenant_id == tenant_id).count()
    total_plans = db.query(models.Plan).filter(models.Plan.tenant_id == tenant_id).count()
    total_users_count = db.query(models.User).filter(models.User.tenant_id == tenant_id).count()

    # Conteos para las cards actuales
    total_customers_total = db.query(models.Customer).filter(models.Customer.tenant_id == tenant_id).count()
    total_pets_total = db.query(models.Pet).filter(models.Pet.tenant_id == tenant_id).count()
    total_orders_total = db.query(models.CremationOC).filter(
        models.CremationOC.tenant_id == tenant_id,
        models.CremationOC.status == 'completado'
    ).count()
    
    # Filtrar por mes actual y estatus completado para ingresos
    # Monthly revenue query with partitioning
    monthly_cremations_query = db.query(models.CremationOC).join(
        models.CremationScheduling, models.CremationOC.id == models.CremationScheduling.cremation_id
    ).options(
        joinedload(models.CremationOC.financial),
        joinedload(models.CremationOC.servicios).joinedload(models.ServicioOC.service),
        joinedload(models.CremationOC.planes).joinedload(models.PlanOC.plan),
        joinedload(models.CremationOC.productos)
    ).filter(
        models.CremationOC.tenant_id == tenant_id,
        # Estado final único = entregado (se incluyen alias/legacy por compatibilidad)
        models.CremationOC.status.in_(['entregado', 'delivered', 'completado', 'completed']),
        models.CremationScheduling.completed_at >= start_of_month
    )

    cremations_this_month = monthly_cremations_query.count()

    # Ingresos Mensuales
    monthly_revenue = 0
    completed_cremations = monthly_cremations_query.all()
    for cremation in completed_cremations:
        if cremation.financial and cremation.financial.total_price and cremation.financial.total_price > 0:
            monthly_revenue += cremation.financial.total_price
        else:
            # Fallback a suma de items si total_price no está seteado
            revenue_from_services = sum(s.precio_venta for s in cremation.servicios) if cremation.servicios else 0
            revenue_from_plans = sum(p.precio_venta for p in cremation.planes) if cremation.planes else 0
            revenue_from_products = sum(pr.precio_venta for pr in cremation.productos) if cremation.productos else 0
            monthly_revenue += (revenue_from_services + revenue_from_plans + revenue_from_products)

    # Actividad Reciente (Últimas 5 cremaciones pendientes o en proceso)
    recent_cremations = db.query(models.CremationOC).options(
        joinedload(models.CremationOC.scheduling),
        joinedload(models.CremationOC.financial),
        joinedload(models.CremationOC.technical).joinedload(models.CremationTechnical.step),
        joinedload(models.CremationOC.servicios).joinedload(models.ServicioOC.service),
        joinedload(models.CremationOC.planes).joinedload(models.PlanOC.plan)
    ).filter(
        models.CremationOC.tenant_id == tenant_id,
        models.CremationOC.status.in_(['pendiente', 'en_proceso', 'pending', 'processing'])
    ).order_by(models.CremationOC.id.desc()).limit(5).all()

    # Formatear cremaciones recientes para el frontend
    formatted_recent = []
    for c in recent_cremations:
        pet = db.query(models.Pet).filter(models.Pet.id == c.pet_id, models.Pet.tenant_id == tenant_id).first()
        # Tomar el nombre del primer servicio o plan como referencia principal para la lista
        main_service_name = "Servicio"
        if c.servicios:
            main_service_name = c.servicios[0].service.name if c.servicios[0].service else "Servicio"
        elif c.planes:
            main_service_name = c.planes[0].plan.name if c.planes[0].plan else "Plan de Cremación"
            
        customer = db.query(models.Customer).filter(models.Customer.id == pet.customer_id, models.Customer.tenant_id == tenant_id).first() if pet else None
        
        formatted_recent.append({
            "id": c.id,
            "pet": pet.name if pet else "Desconocida",
            "pet_image": (pet.images[0] if pet.images else None) if pet else None,
            "client": customer.name if customer else "Desconocido",
            "service_name": main_service_name,
            "amount": c.financial.total_price if c.financial else 0.0,
            "status": c.status,
            "step_name": c.technical.step.name if c.technical and c.technical.step else None,
            "time": c.scheduling.scheduled_at.strftime("%H:%M") if c.scheduling and c.scheduling.scheduled_at else (c.technical.start_at.strftime("%H:%M") if c.technical and c.technical.start_at else "N/A")
        })

    return {
        "stats": {
            "total_customers": total_customers_total,
            "total_pets": total_pets_total,
            "total_orders": total_orders_total,
            "total_services": total_services,
            "total_users": total_users_count,
            "cremations_this_month": cremations_this_month,
            "monthly_revenue": monthly_revenue
        },
        "limits": {
            "pets": {"usage": monthly_pets, "max": plan.max_pets if plan else 0},
            "customers": {"usage": monthly_customers, "max": plan.max_customers if plan else 0},
            "orders": {"usage": monthly_orders, "max": plan.max_orders if plan else 0},
            "services": {"usage": total_services, "max": plan.max_services if plan else 0},
            "products": {"usage": total_products, "max": plan.max_products if plan else 0},
            "plans": {"usage": total_plans, "max": plan.max_plans if plan else 0},
            "users": {"usage": total_users_count, "max": plan.max_users if plan else 0}
        },
        "recent_cremations": formatted_recent
    }

@router.get("/search")
def search_global(
    q: str,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    if not q or len(q.strip()) < 2:
        return {"pets": [], "customers": [], "orders": [], "services": []}
        
    query = q.strip()
    search_pattern = f"%{query}%"

    from sqlalchemy import or_

    # 1. Mascotas (CRM)
    pets = db.query(models.Pet).filter(
        models.Pet.tenant_id == tenant_id,
        or_(
            models.Pet.name.ilike(search_pattern),
            models.Pet.species.ilike(search_pattern),
            models.Pet.breed.ilike(search_pattern)
        )
    ).limit(5).all()

    # 2. Clientes (CRM)
    customers = db.query(models.Customer).filter(
        models.Customer.tenant_id == tenant_id,
        or_(
            models.Customer.name.ilike(search_pattern),
            models.Customer.email.ilike(search_pattern),
            models.Customer.phone.ilike(search_pattern),
            models.Customer.rut.ilike(search_pattern)
        )
    ).limit(5).all()

    # 3. Órdenes / Cremaciones (Operations)
    orders_query = db.query(models.CremationOC).outerjoin(
        models.Pet, models.CremationOC.pet_id == models.Pet.id
    ).outerjoin(
        models.Customer, models.Pet.customer_id == models.Customer.id
    ).outerjoin(
        models.CremationDetails, models.CremationOC.id == models.CremationDetails.cremation_id
    ).filter(
        models.CremationOC.tenant_id == tenant_id
    )
    
    oc_filter = None
    try:
        oc_num_val = int(query.replace("OC-", "").replace("CREM-", "").strip())
        oc_filter = (models.CremationOC.oc_number == oc_num_val)
    except ValueError:
        pass

    filters = [
        models.CremationOC.cremation_type.ilike(search_pattern),
        models.CremationOC.status.ilike(search_pattern),
        models.Pet.name.ilike(search_pattern),
        models.Customer.name.ilike(search_pattern),
        models.CremationOC.verification_code.ilike(search_pattern),
        models.CremationDetails.tracking_token.ilike(search_pattern)
    ]
    if oc_filter is not None:
        filters.append(oc_filter)
        
    orders = orders_query.filter(or_(*filters)).limit(5).all()

    # 4. Servicios (Catalog)
    services = db.query(models.Service).filter(
        models.Service.tenant_id == tenant_id,
        models.Service.is_active == True,
        or_(
            models.Service.name.ilike(search_pattern),
            models.Service.description.ilike(search_pattern)
        )
    ).limit(5).all()

    # Formatear resultados
    formatted_pets = []
    for p in pets:
        owner_name = p.customer.name if p.customer else "Sin dueño"
        formatted_pets.append({
            "id": p.id,
            "name": p.name,
            "subtitle": f"{p.species or ''} • {p.breed or ''} (Dueño: {owner_name})".strip(" • "),
            "url": "/dashboard/mascotas"
        })

    formatted_customers = []
    for c in customers:
        formatted_customers.append({
            "id": c.id,
            "name": c.name,
            "subtitle": f"{c.email or ''} • RUT: {c.rut or ''}".strip(" • "),
            "url": "/dashboard/clientes"
        })

    formatted_orders = []
    for o in orders:
        pet_name = o.pet.name if o.pet else "N/A"
        cust_name = o.pet.customer.name if o.pet and o.pet.customer else "N/A"
        status_lbl = (o.status or "pendiente").capitalize()
        num_lbl = f"OC-{o.oc_number}" if o.oc_number else f"OC-ID:{o.id}"
        tracking_lbl = f" • Track: {o.verification_code}" if o.verification_code else ""
        formatted_orders.append({
            "id": o.id,
            "name": num_lbl,
            "subtitle": f"{o.cremation_type or 'Cremación'} de {pet_name} (Cliente: {cust_name}) • Estatus: {status_lbl}{tracking_lbl}",
            "url": f"/dashboard/asignacion-servicios/registro?id={o.id}"
        })

    formatted_services = []
    for s in services:
        price_lbl = f"${s.price:,.0f}" if s.price else "Sin precio"
        formatted_services.append({
            "id": s.id,
            "name": s.name,
            "subtitle": f"Servicio • Costo: {price_lbl}",
            "url": "/dashboard/gestion-servicios"
        })

    return {
        "pets": formatted_pets,
        "customers": formatted_customers,
        "orders": formatted_orders,
        "services": formatted_services
    }

