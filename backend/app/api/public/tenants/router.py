from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app import models
from pydantic import BaseModel

router = APIRouter()

class TenantPublicInfo(BaseModel):
    id: int
    name: str
    slug: str
    logo_url: str | None = None
    social_media: dict | None = None
    phone: str | None = None
    email: str | None = None

    class Config:
        from_attributes = True

@router.get("/tenant/{slug}", response_model=TenantPublicInfo)
def get_tenant_by_slug(slug: str, db: Session = Depends(get_db)):
    tenant = db.query(models.Tenant).filter(models.Tenant.slug == slug).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
        
    if tenant.status in [models.TenantStatus.inactive, models.TenantStatus.suspended]:
        raise HTTPException(status_code=403, detail=f"Acceso denegado. Esta empresa está {tenant.status.value}.")
        
    return tenant

class ServicePublicInfo(BaseModel):
    id: str  # Changed to str for prefixed IDs
    name: str
    description: str | None = None
    price: float
    category: str | None = None
    image_url: str | None = None  # Solo planes (catálogo); servicios/productos lo dejan None
    sub_items: list[dict] | None = None

    class Config:
        from_attributes = True

@router.get("/tenant/{slug}/services", response_model=list[ServicePublicInfo])
def get_tenant_services(slug: str, db: Session = Depends(get_db)):
    tenant = db.query(models.Tenant).filter(models.Tenant.slug == slug).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
        
    if tenant.status in [models.TenantStatus.inactive, models.TenantStatus.suspended]:
        raise HTTPException(status_code=403, detail=f"Acceso denegado. Esta empresa está {tenant.status.value}.")
    
    # Configurar tenant_id en la sesión para que RLS permita leer las tablas del inquilino
    from app.core.tenant_context import apply_tenant_rls
    apply_tenant_rls(db, tenant.id)

    all_items = []
    
    # Fetch Services
    services = db.query(models.Service).filter(
        models.Service.tenant_id == tenant.id, 
        models.Service.is_active == True
    ).all()
    for s in services:
        all_items.append({
            "id": f"svc_{s.id}",
            "name": s.name,
            "description": s.description,
            "price": s.price,
            "category": "servicio",
            "sub_items": None
        })
        
    # Fetch Plans
    plans = db.query(models.Plan).options(
        joinedload(models.Plan.services),
        joinedload(models.Plan.products)
    ).filter(
        models.Plan.tenant_id == tenant.id,
        models.Plan.is_active == True
    ).all()
    
    for p in plans:
        # Load associated items (services + products)
        plan_items = []
        for svc in p.services:
            plan_items.append({"id": f"svc_{svc.id}", "name": svc.name, "type": "servicio"})
        for prod in p.products:
            plan_items.append({"id": f"prod_{prod.id}", "name": prod.name, "type": "producto"})
            
        all_items.append({
            "id": f"plan_{p.id}",
            "name": p.name,
            "description": p.description,
            "price": p.price,
            "category": "plan",
            "image_url": p.image_url,
            "sub_items": plan_items
        })
        
    # Fetch Products
    products = db.query(models.Product).filter(
        models.Product.tenant_id == tenant.id,
        models.Product.is_active == True
    ).all()
    for pr in products:
        all_items.append({
            "id": f"prod_{pr.id}",
            "name": pr.name,
            "description": pr.description,
            "price": pr.sale_price,
            "category": "producto",
            "sub_items": None
        })
    

    return all_items
