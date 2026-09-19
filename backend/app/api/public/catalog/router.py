from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.core.rate_limiter import limiter
from app.core.tenant_context import apply_bypass_rls, apply_tenant_rls
from app.api.internal.catalog.models import CatalogShareToken, Product, Category
from app.utils import tz

router = APIRouter()


@router.get("/{slug}/{token}", response_model=schemas.PublicCatalogResponse)
@limiter.limit("60/minute")
def get_public_catalog(
    request: Request,
    slug: str,
    token: str,
    db: Session = Depends(get_db),
):
    """
    Endpoint público para visualizar el catálogo compartido de un tenant vía token.
    Valida vigencia y genera la lista de productos disponibles con WhatsApp.
    """
    # 1. Resolver Tenant por Slug (Bypass RLS para lookup inicial)
    apply_bypass_rls(db)
    tenant = db.query(models.Tenant).filter(models.Tenant.slug == slug).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Crematorio no encontrado")

    # 2. Buscar Token en inv_catalog_tokens
    share_token = (
        db.query(CatalogShareToken)
        .filter(
            CatalogShareToken.tenant_id == tenant.id,
            CatalogShareToken.token == token,
        )
        .first()
    )

    if not share_token:
        raise HTTPException(status_code=404, detail="Catálogo no encontrado o enlace inválido")

    # Obtener WhatsApp o teléfono del crematorio
    raw_whatsapp = ""
    if tenant.social_media and isinstance(tenant.social_media, dict):
        raw_whatsapp = tenant.social_media.get("whatsapp") or ""
    if not raw_whatsapp and tenant.phone:
        raw_whatsapp = tenant.phone

    clean_whatsapp = "".join(ch for ch in (raw_whatsapp or "") if ch.isdigit())

    # 3. Comprobar si está activo y no expirado
    now = tz.get_now()
    is_expired = False
    if not share_token.is_active:
        is_expired = True
    elif share_token.expires_at and now > share_token.expires_at:
        is_expired = True

    if is_expired:
        return schemas.PublicCatalogResponse(
            is_expired=True,
            tenant_name=tenant.name,
            tenant_slug=tenant.slug,
            tenant_logo=tenant.logo_url,
            tenant_phone=tenant.phone,
            whatsapp=clean_whatsapp,
            expires_at=share_token.expires_at,
            products=[],
        )

    # 4. Registrar vista
    share_token.views_count = (share_token.views_count or 0) + 1
    share_token.last_viewed_at = now
    db.commit()

    # 5. Obtener productos activos del tenant
    apply_tenant_rls(db, tenant.id)
    products = (
        db.query(Product)
        .filter(
            Product.tenant_id == tenant.id,
            Product.is_active == True,
        )
        .order_by(Product.name.asc())
        .all()
    )

    categories = db.query(Category).filter(Category.tenant_id == tenant.id).all()
    categories_map = {c.id: c.name for c in categories}

    product_list = []
    for p in products:
        category_name = categories_map.get(p.category_id) if p.category_id else "General"
        product_list.append(
            schemas.PublicCatalogProduct(
                id=p.id,
                code=p.code or "",
                name=p.name or "",
                sale_price=float(p.sale_price or 0.0),
                discount_percentage=float(getattr(p, "discount_percentage", 0) or 0),
                stock=int(p.stock or 0),
                availability_status=p.availability_status or "Disponible",
                description=p.description or "",
                image_url=p.image_url,
                images=p.images or [],
                category_name=category_name,
            )
        )

    return schemas.PublicCatalogResponse(
        is_expired=False,
        tenant_name=tenant.name,
        tenant_slug=tenant.slug,
        tenant_logo=tenant.logo_url,
        tenant_phone=tenant.phone,
        whatsapp=clean_whatsapp,
        expires_at=share_token.expires_at,
        products=product_list,
    )
