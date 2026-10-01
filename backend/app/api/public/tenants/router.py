from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app import models
from app.core.tenant_context import apply_tenant_rls
from pydantic import BaseModel
from app.services.public_form_config import normalize_form_config, public_weight_tiers

router = APIRouter()

class TenantPublicInfo(BaseModel):
    id: int
    name: str
    slug: str
    logo_url: str | None = None
    social_media: dict | None = None
    phone: str | None = None
    email: str | None = None
    # public_token NO se expone: es la credencial del enlace permanente del
    # formulario y solo la entrega la sesión interna del tenant.
    # Formulario público: campos visibles/obligatorios y tramos de peso
    # (el precio del tramo solo viaja si el crematorio lo habilitó).
    form_config: dict | None = None
    weight_tiers: list[dict] = []

    class Config:
        from_attributes = True

@router.get("/tenant/{slug}", response_model=TenantPublicInfo)
def get_tenant_by_slug(slug: str, db: Session = Depends(get_db)):
    tenant = db.query(models.Tenant).filter(models.Tenant.slug == slug).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    if tenant.status in [models.TenantStatus.inactive, models.TenantStatus.suspended]:
        raise HTTPException(status_code=403, detail=f"Acceso denegado. Esta empresa está {tenant.status.value}.")

    apply_tenant_rls(db, tenant.id)
    form_config = normalize_form_config(tenant.form_config)
    info = TenantPublicInfo.model_validate(tenant)
    info.form_config = form_config
    info.weight_tiers = public_weight_tiers(db, tenant.id, include_price=form_config["show_weight_prices"])
    return info

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


def resolve_farewell_template(db: Session, tenant_id: int):
    """
    Tarjeta de homenaje de un tenant (formulario público y expediente):
    la asignada por el SuperAdmin (`tenant.form_farewell_template_id`) >
    su copia exclusiva más reciente > global predeterminada > global
    "Plantilla Formulario" (legado, por nombre) > primera global.
    ops_farewell_templates tiene RLS: el llamador debe haber fijado el tenant
    (o bypass) para que se vean las exclusivas.
    """
    FT = models.FarewellTemplate
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if tenant and tenant.form_farewell_template_id:
        chosen = db.query(FT).filter(
            FT.id == tenant.form_farewell_template_id,
            (FT.tenant_id == tenant_id) | (FT.tenant_id.is_(None)),
        ).first()
        if chosen:
            return chosen
    return (
        db.query(FT).filter(FT.tenant_id == tenant_id, FT.is_locked == True).order_by(FT.id.desc()).first()  # noqa: E712
        or db.query(FT).filter(FT.tenant_id.is_(None), FT.is_default == True).first()  # noqa: E712
        or db.query(FT).filter(FT.tenant_id.is_(None), FT.name.ilike("%Plantilla Formulario%")).first()
        or db.query(FT).filter(FT.tenant_id.is_(None)).order_by(FT.id).first()
    )


@router.get("/tenant/{slug}/farewell-template")
def get_tenant_farewell_template(slug: str, db: Session = Depends(get_db)):
    """Retorna la plantilla de despedida para la previsualización del formulario público."""
    tenant = db.query(models.Tenant).filter(models.Tenant.slug == slug).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    # RLS: sin fijar el tenant solo se verían las plantillas globales
    apply_tenant_rls(db, tenant.id)
    template = resolve_farewell_template(db, tenant.id)
    if not template:
        return None

    return {
        "id": template.id,
        "name": template.name,
        "config": template.config,
    }
