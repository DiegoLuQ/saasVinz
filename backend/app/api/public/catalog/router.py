from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app import models, schemas
from app.core.rate_limiter import limiter
from app.core.tenant_context import apply_bypass_rls, apply_tenant_rls
from app.api.internal.catalog.models import CatalogShareToken, Product, Category, Plan
from app.utils import tz

router = APIRouter()

# Redes que se exponen en el catálogo público (social_media también guarda datos internos)
PUBLIC_SOCIAL_KEYS = ("instagram", "facebook", "tiktok", "website")


@router.get("/{slug}/{token}", response_model=schemas.PublicCatalogResponse)
@limiter.limit("60/minute")
def get_public_catalog(
    request: Request,
    slug: str,
    token: str,
    preview: bool = False,
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
    # Celular chileno sin código de país (9 1234 5678): wa.me exige el 56 delante
    if len(clean_whatsapp) == 9 and clean_whatsapp.startswith("9"):
        clean_whatsapp = f"56{clean_whatsapp}"

    # Datos de presentación del tenant (comunes a todas las respuestas)
    public_social = None
    if isinstance(tenant.social_media, dict):
        public_social = {
            k: v for k, v in tenant.social_media.items()
            if k in PUBLIC_SOCIAL_KEYS and isinstance(v, str) and v.strip()
        } or None
    tenant_info = dict(
        tenant_name=tenant.name,
        tenant_slug=tenant.slug,
        tenant_logo=tenant.logo_url,
        tenant_phone=tenant.phone,
        tenant_email=tenant.email,
        tenant_address=tenant.address,
        tenant_city=tenant.city,
        tenant_social=public_social,
        catalog_tagline=tenant.catalog_tagline,
        catalog_intro=tenant.catalog_intro,
        whatsapp=clean_whatsapp,
        expires_at=share_token.expires_at,
    )

    # 3. Comprobar si está activo y no expirado
    now = tz.get_now()
    is_expired = False
    if not share_token.is_active:
        is_expired = True
    elif share_token.expires_at and now > share_token.expires_at:
        is_expired = True

    catalog_type = share_token.catalog_type or "products"

    if is_expired:
        return schemas.PublicCatalogResponse(
            catalog_type=catalog_type,
            is_expired=True,
            **tenant_info,
            products=[],
        )

    # 4. Registrar vista (la previsualización del enlace, preview=1, no cuenta)
    if not preview:
        share_token.views_count = (share_token.views_count or 0) + 1
        share_token.last_viewed_at = now
        db.commit()

    apply_tenant_rls(db, tenant.id)

    # 5a. Catálogo de planes (compartido desde Gestión de Servicios)
    if catalog_type == "plans":
        return schemas.PublicCatalogResponse(
            catalog_type="plans",
            is_expired=False,
            **tenant_info,
            plans=_active_plans(db, tenant.id),
        )

    # 5b. Obtener productos activos del tenant
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
        catalog_type="products",
        is_expired=False,
        **tenant_info,
        products=product_list,
    )


def _active_plans(db: Session, tenant_id: int) -> list:
    """Planes activos con su portada y los servicios/productos activos que incluyen.

    Orden: el definido por el tenant (sort_order), luego precio y nombre. Los
    servicios salen en el orden configurado en el plan, con su marca de opcional.
    """
    plans = (
        db.query(Plan)
        .options(
            selectinload(Plan.services),
            selectinload(Plan.products),
            selectinload(Plan.plan_links),
        )
        .filter(Plan.tenant_id == tenant_id, Plan.is_active == True)
        .order_by(Plan.sort_order.asc(), Plan.price.asc(), Plan.name.asc())
        .all()
    )
    result = []
    for p in plans:
        optional_ids = set(p.optional_service_ids)
        result.append(
            schemas.PublicCatalogPlan(
                id=p.id,
                name=p.name or "",
                description=p.description,
                price=float(p.price or 0.0),
                price_label=p.price_label,
                important_note=p.important_note,
                is_featured=bool(p.is_featured),
                image_url=p.image_url,
                services=[
                    schemas.PublicCatalogPlanItem(
                        name=s.name or "", description=s.description, is_optional=s.id in optional_ids
                    )
                    for s in p.services
                    if s.tenant_id == tenant_id and s.is_active
                ],
                products=[
                    schemas.PublicCatalogPlanItem(name=pr.name or "", description=pr.description, image_url=pr.image_url)
                    for pr in sorted(p.products, key=lambda x: (x.name or "").lower())
                    if pr.tenant_id == tenant_id and pr.is_active
                ],
            )
        )
    return result


# ---------------------------------------------------------------------------
# Imagen de previsualización (Open Graph) para compartir el catálogo por WhatsApp
# ---------------------------------------------------------------------------
_OG_W, _OG_H = 1200, 630
_OG_BG = (251, 249, 246)      # marfil del catálogo
_OG_RING = (166, 124, 55)     # dorado antiguo


def _compose_logo_card(image_bytes: bytes) -> bytes:
    """Logo del tenant -> tarjeta 1200x630 JPEG: logo centrado en un círculo blanco
    sobre el fondo marfil del catálogo. WhatsApp no previsualiza .webp (formato en
    que se guardan los logos), por eso se entrega JPEG."""
    import io
    from PIL import Image, ImageDraw, ImageOps

    logo = Image.open(io.BytesIO(image_bytes))
    try:
        logo = ImageOps.exif_transpose(logo)
    except Exception:
        pass
    logo = logo.convert("RGBA")

    # Recortar el margen vacío (transparente o blanco) que traen muchos logos
    from PIL import ImageChops
    flat = Image.new("RGB", logo.size, (255, 255, 255))
    flat.paste(logo, mask=logo.getchannel("A"))
    bbox = ImageChops.difference(flat, Image.new("RGB", logo.size, (255, 255, 255))).convert("L").point(
        lambda v: 255 if v > 12 else 0
    ).getbbox()
    if bbox:
        logo = logo.crop(bbox)

    card = Image.new("RGB", (_OG_W, _OG_H), _OG_BG)
    draw = ImageDraw.Draw(card)

    # Círculo blanco con anillo dorado fino
    diameter = 440
    cx, cy = _OG_W // 2, _OG_H // 2
    box = [cx - diameter // 2, cy - diameter // 2, cx + diameter // 2, cy + diameter // 2]
    draw.ellipse([box[0] - 6, box[1] - 6, box[2] + 6, box[3] + 6], fill=_OG_RING)
    draw.ellipse(box, fill=(255, 255, 255))

    # Logo contenido (sin recortar) dentro del círculo, respetando transparencia
    inner = int(diameter * 0.66)
    logo = ImageOps.contain(logo, (inner, inner), Image.Resampling.LANCZOS)
    card.paste(logo, (cx - logo.width // 2, cy - logo.height // 2), logo)

    out = io.BytesIO()
    card.save(out, format="JPEG", quality=88, optimize=True)
    return out.getvalue()


@router.get("/{slug}/{token}/og-image.jpg")
@limiter.limit("60/minute")
def get_catalog_og_image(
    request: Request,
    slug: str,
    token: str,
    db: Session = Depends(get_db),
):
    """Tarjeta JPEG con el logo del tenant para el preview del enlace del catálogo."""
    apply_bypass_rls(db)
    tenant = db.query(models.Tenant).filter(models.Tenant.slug == slug).first()
    if not tenant or not tenant.logo_url:
        raise HTTPException(status_code=404, detail="Sin imagen disponible")

    exists = db.query(CatalogShareToken.id).filter(
        CatalogShareToken.tenant_id == tenant.id,
        CatalogShareToken.token == token,
    ).first()
    if not exists:
        raise HTTPException(status_code=404, detail="Sin imagen disponible")

    logo_url = str(tenant.logo_url)
    if not logo_url.lower().startswith(("http://", "https://")):
        raise HTTPException(status_code=404, detail="Sin imagen disponible")

    try:
        import requests
        resp = requests.get(logo_url, timeout=8)
        if resp.status_code != 200 or not resp.content:
            raise HTTPException(status_code=404, detail="Sin imagen disponible")
        jpeg = _compose_logo_card(resp.content)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generando og-image de catálogo: {e}")
        raise HTTPException(status_code=404, detail="Sin imagen disponible")

    return Response(
        content=jpeg,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=3600"},
    )
