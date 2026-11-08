"""Enlaces oficiales del crematorio (Configuración → «Enlaces oficiales»).

El crematorio elige su formulario oficial (principal o uno personalizado), su
catálogo de planes oficial y su catálogo de productos oficial
(`sys_tenants.official_links` = {"form", "plans_token_id", "products_token_id"}).
Los catálogos elegidos dejan de vencer.

Con los tres configurados se activa la «tiendita de recuerdos»: botón en la
pantalla final del formulario, bloque de productos en el correo de confirmación
y botón en el seguimiento. Si falta alguno no aparece nada y el panel muestra
una miniguía (`status()["missing"]`).
"""
import random
from urllib.parse import urlparse

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.api.internal.catalog.models import CatalogShareToken, Product
from app.services.public_form_config import normalize_form_config

MAX_SOUVENIRS = 6
LABELS = {
    "form": "Formulario oficial",
    "plans": "Catálogo de planes oficial",
    "products": "Catálogo de productos oficial",
}


def _host() -> tuple[str, str]:
    parsed = urlparse(settings.FRONTEND_URL)
    host = parsed.netloc[4:] if parsed.netloc.startswith("www.") else parsed.netloc
    return parsed.scheme or "https", host


def catalog_url(slug: str, token: str) -> str:
    scheme, host = _host()
    return f"{scheme}://catalogo.{host}/{slug}/{token}"


def _config(tenant) -> dict:
    raw = tenant.official_links if isinstance(getattr(tenant, "official_links", None), dict) else {}
    return {
        "form": raw.get("form") or None,
        "plans_token_id": raw.get("plans_token_id"),
        "products_token_id": raw.get("products_token_id"),
    }


def _valid_token(db: Session, tenant_id: int, token_id, kind: str):
    if not token_id:
        return None
    try:
        tid = int(token_id)
    except (TypeError, ValueError):
        return None
    return db.query(CatalogShareToken).filter(
        CatalogShareToken.id == tid,
        CatalogShareToken.tenant_id == tenant_id,
        CatalogShareToken.catalog_type == kind,
        CatalogShareToken.is_active.is_(True),
    ).first()


def form_options(tenant) -> list[dict]:
    cfg = normalize_form_config(tenant.form_config)
    out = [{"id": "main", "name": "Formulario principal"}]
    for f in cfg.get("custom_forms", []) or []:
        if f.get("id"):
            out.append({"id": str(f["id"]), "name": f.get("name") or "Formulario personalizado"})
    return out


def status(db: Session, tenant) -> dict:
    cfg = _config(tenant)
    forms = {f["id"]: f for f in form_options(tenant)}
    form = forms.get(str(cfg["form"])) if cfg["form"] else None
    plans = _valid_token(db, tenant.id, cfg["plans_token_id"], "plans")
    products = _valid_token(db, tenant.id, cfg["products_token_id"], "products")

    def link(t):
        return {"id": t.id, "name": t.name, "url": catalog_url(tenant.slug, t.token)} if t else None

    missing = [k for k, v in (("form", form), ("plans", plans), ("products", products)) if not v]
    return {
        "form": form,
        "plans": link(plans),
        "products": link(products),
        "missing": missing,
        "missing_labels": [LABELS[k] for k in missing],
        "complete": not missing,
    }


def with_ref(url: str | None, ref: str | None) -> str | None:
    """Catálogo ligado a la orden: ?ref=<token de seguimiento / código del registro>
    (el carrito del catálogo queda asociado a esa mascota, services/product_requests.py)."""
    if not url or not ref:
        return url
    from urllib.parse import quote
    return f"{url}{'&' if '?' in url else '?'}ref={quote(str(ref), safe='')}"


def products_catalog_url(db: Session, tenant) -> str | None:
    """Catálogo de productos del crematorio para los avisos: el oficial o, si no hay,
    el enlace de productos activo y vigente más reciente. None = no tiene."""
    from datetime import datetime, timezone
    tok = _valid_token(db, tenant.id, _config(tenant)["products_token_id"], "products")
    if tok is None:
        now = datetime.now(timezone.utc)
        for t in db.query(CatalogShareToken).filter(
            CatalogShareToken.tenant_id == tenant.id,
            CatalogShareToken.catalog_type == "products",
            CatalogShareToken.is_active.is_(True),
        ).order_by(CatalogShareToken.created_at.desc()).all():
            if t.expires_at is None or t.expires_at > now:
                tok = t
                break
    return catalog_url(tenant.slug, tok.token) if tok is not None else None


def store_url(db: Session, tenant) -> str | None:
    """Catálogo de recuerdos (productos oficial), solo con los tres enlaces configurados."""
    st = status(db, tenant)
    return st["products"]["url"] if st["complete"] else None


def souvenir_products(db: Session, tenant_id: int, limit: int = MAX_SOUVENIRS, diverse: bool = False) -> list[Product]:
    """Hasta `limit` productos para mostrar: el más vendido siempre (compras reales; si
    nadie ha comprado, el de etiqueta «Más vendido») y el resto al azar. Solo activos,
    con foto y con stock o «a pedido». `diverse` = el resto de categorías distintas
    primero (p. ej. un relicario, una ánfora y un huellero)."""
    from app.api.internal.operations.models import ProductoOC, CremationOC

    products = [
        p for p in db.query(Product).filter(Product.tenant_id == tenant_id, Product.is_active.isnot(False)).all()
        if (p.image_url or "").startswith("http") and ((p.stock or 0) > 0 or p.made_to_order)
    ]
    if not products:
        return []
    sold = dict(
        db.query(ProductoOC.product_id, func.coalesce(func.sum(ProductoOC.cantidad), 0))
        .join(CremationOC, CremationOC.id == ProductoOC.cremation_id)
        .filter(CremationOC.tenant_id == tenant_id,
                func.lower(func.coalesce(CremationOC.status, "")) != "cancelado",
                ProductoOC.product_id.in_([p.id for p in products]))
        .group_by(ProductoOC.product_id).all()
    )
    best = max(products, key=lambda p: (sold.get(p.id) or 0, p.id))
    if not sold.get(best.id):
        tagged = [p for p in products if (p.badge or "").strip().lower() == "más vendido"]
        best = tagged[0] if tagged else None
    rest = [p for p in products if best is None or p.id != best.id]
    random.shuffle(rest)
    if diverse:
        seen = {best.category_id} if best else set()
        first, later = [], []
        for p in rest:
            if p.category_id not in seen:
                seen.add(p.category_id)
                first.append(p)
            else:
                later.append(p)
        rest = first + later
    chosen = ([best] if best else []) + rest
    return chosen[:limit]


def save(db: Session, tenant, data: dict) -> dict:
    """Guarda la elección (valida pertenencia y tipo). Los catálogos elegidos dejan de vencer."""
    from fastapi import HTTPException

    form = (str(data.get("form")).strip() if data.get("form") else None) or None
    if form and form not in {f["id"] for f in form_options(tenant)}:
        raise HTTPException(status_code=400, detail="El formulario elegido no existe.")
    out = {"form": form, "plans_token_id": None, "products_token_id": None}
    for key, kind in (("plans_token_id", "plans"), ("products_token_id", "products")):
        if data.get(key):
            tok = _valid_token(db, tenant.id, data[key], kind)
            if not tok:
                raise HTTPException(status_code=400, detail=f"El enlace elegido como {LABELS[kind].lower()} no es válido.")
            tok.expires_at = None  # el enlace oficial no vence
            out[key] = tok.id
    tenant.official_links = out
    db.commit()
    return status(db, tenant)
