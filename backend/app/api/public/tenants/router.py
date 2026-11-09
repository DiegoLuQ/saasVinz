from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import Field
from app.core.rate_limiter import limiter
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app import models
from app.core.tenant_context import apply_tenant_rls
from pydantic import BaseModel
from app.services.public_form_config import normalize_form_config, public_weight_tiers
from app.services.form_video import strip_videos, tenant_can_use_form_video

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
    # «Con tecnología de Vinzer» en el pie (services/plan_features.show_vinzer_brand)
    show_vinzer_brand: bool = True
    # Catálogo de recuerdos (productos oficial) para la pantalla final; None = sin enlaces oficiales completos
    souvenir_store_url: str | None = None
    # Este es el formulario oficial: el navegador envía sus métricas (services/form_funnel.py)
    track_form: bool = False

    class Config:
        from_attributes = True

@router.get("/tenant/{slug}", response_model=TenantPublicInfo)
def get_tenant_by_slug(slug: str, token: str | None = None, form: str | None = None, db: Session = Depends(get_db)):
    """`token`: el del enlace del catálogo que abrió el formulario (sus precios de promoción)."""
    tenant = db.query(models.Tenant).filter(models.Tenant.slug == slug).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    if tenant.status in [models.TenantStatus.inactive, models.TenantStatus.suspended]:
        raise HTTPException(status_code=403, detail=f"Acceso denegado. Esta empresa está {tenant.status.value}.")

    apply_tenant_rls(db, tenant.id)
    form_config = normalize_form_config(tenant.form_config)
    if not tenant_can_use_form_video(tenant):
        strip_videos(form_config)  # el video de bienvenida es solo PRO/ULTRA
    info = TenantPublicInfo.model_validate(tenant)
    from app.services.plan_features import show_vinzer_brand
    info.show_vinzer_brand = show_vinzer_brand(tenant)
    from app.services.official_links import store_url
    info.souvenir_store_url = store_url(db, tenant)
    from app.services.form_funnel import is_official
    info.track_form = is_official(tenant, form)
    info.form_config = form_config
    # Con la tabla por plan los tramos no llevan recargo (el precio va en cada plan).
    from app.services.price_lists import effective_for_request
    # Tabla del enlace del catálogo, o la elegida para este formulario en Configuración
    price_list = effective_for_request(db, tenant, token, form)
    info.weight_tiers = public_weight_tiers(
        db, tenant.id,
        include_price=form_config["show_weight_prices"] and form_config["weight_pricing_mode"] != "table",
        price_list=price_list,
    )
    if price_list is not None and isinstance(info.form_config, dict):
        # La tabla del enlace siempre cobra por plan y peso (sus rangos, sin recargo).
        info.form_config = {**info.form_config, "weight_pricing_mode": "table"}
    return info

class FormEventIn(BaseModel):
    session_id: str = Field(..., max_length=40)
    kind: str = Field(..., max_length=30)
    detail: str | None = Field(default=None, max_length=60)
    form: str | None = Field(default=None, max_length=80)


@router.post("/tenant/{slug}/form-events", status_code=204)
@limiter.limit("120/minute")
def track_form_event(request: Request, slug: str, data: FormEventIn, db: Session = Depends(get_db)):
    """Métricas del formulario oficial (hasta dónde llega la familia). Siempre 204:
    los eventos de otros formularios o inválidos se ignoran."""
    from app.services import form_funnel

    tenant = db.query(models.Tenant).filter(models.Tenant.slug == slug).first()
    if tenant:
        apply_tenant_rls(db, tenant.id)
        form_funnel.record(db, tenant, data.form, data.session_id, data.kind, data.detail)
    return Response(status_code=204)


class ServicePublicInfo(BaseModel):
    id: str  # Changed to str for prefixed IDs
    name: str
    description: str | None = None
    price: float
    category: str | None = None
    image_url: str | None = None  # Solo planes (catálogo); servicios/productos lo dejan None
    sub_items: list[dict] | None = None
    is_special: bool = False  # adicional ofrecido tras elegir el plan
    price_on_request: bool = False  # «Precio a cotizar»: el crematorio informa el valor después
    important_note: str | None = None  # nota que la familia debe conocer
    # Precio del plan por tramo {"<id tramo>": precio} (modo «precio por plan y peso»)
    weight_prices: dict | None = None
    max_weight: float | None = None  # kg (planes): el formulario lo oculta en pesos mayores

    class Config:
        from_attributes = True

@router.get("/tenant/{slug}/services", response_model=list[ServicePublicInfo])
def get_tenant_services(slug: str, token: str | None = None, form: str | None = None, db: Session = Depends(get_db)):
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
        # Un especial oculto en el formulario no se publica.
        if s.is_special and not s.show_in_form:
            continue
        all_items.append({
            "id": f"svc_{s.id}",
            "name": s.name,
            "description": s.description,
            "price": s.price,
            "category": "servicio",
            "sub_items": None,
            "is_special": bool(s.is_special),
            "price_on_request": bool(s.price_on_request),
            "important_note": s.important_note,
            "image_url": s.image_url if s.is_special else None,
        })
        
    # Fetch Plans
    plans = db.query(models.Plan).options(
        joinedload(models.Plan.services),
        joinedload(models.Plan.products)
    ).filter(
        models.Plan.tenant_id == tenant.id,
        models.Plan.is_active == True
    ).all()
    
    from app.services.public_form_config import clean_weight_prices, get_weight_tiers, uses_price_table
    from app.services.price_lists import effective_for_request, plan_weight_prices
    price_list = effective_for_request(db, tenant, token, form)  # enlace del catálogo o tabla del formulario
    price_table = uses_price_table(tenant) or price_list is not None
    tier_ids = {t.id for t in get_weight_tiers(db, tenant.id, price_list.id if price_list else None)} if price_table else set()

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
            "sub_items": plan_items,
            "weight_prices": clean_weight_prices(plan_weight_prices(price_list, p), tier_ids) if price_table else None,
            "max_weight": p.max_weight,
        })
        
    # Fetch Products
    products = db.query(models.Product).filter(
        models.Product.tenant_id == tenant.id,
        models.Product.is_active == True
    ).all()
    for pr in products:
        # Un producto especial sin stock (y que no es «a pedido») no se ofrece a la familia.
        if pr.is_special and (pr.stock or 0) <= 0 and not pr.made_to_order:
            continue
        all_items.append({
            "id": f"prod_{pr.id}",
            "name": pr.name,
            "description": pr.description,
            "price": pr.sale_price,
            "category": "producto",
            "sub_items": None,
            # Producto especial: adicional como los servicios especiales, con su nota e imagen
            "is_special": bool(pr.is_special),
            "important_note": pr.note if pr.is_special else None,
            "image_url": pr.image_url if pr.is_special else None,
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
