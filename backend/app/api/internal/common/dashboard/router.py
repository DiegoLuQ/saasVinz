from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.api.deps import get_tenant_id
from app.api.internal.admin.rbac.router import check_permission
from app.api.internal.common.dashboard import services
from app.api.internal.operations.schemas import DashboardSummarySchema

router = APIRouter()

@router.get("/trend")
def get_dashboard_trend(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _perm: bool = Depends(check_permission("dashboard", "view"))
):
    return services.build_trend(db, tenant_id)

@router.get("/summary", response_model=DashboardSummarySchema)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _perm: bool = Depends(check_permission("dashboard", "view"))
):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
    return services.build_dashboard_summary(db, tenant)

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
            "url": f"/dashboard/recepcion-pedidos/registro?id={o.id}"
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

