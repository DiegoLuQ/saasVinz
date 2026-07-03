"""
Endpoints públicos para el Motor de Widgets Embebibles.

Seguridad:
  - La petición debe traer una API key (query param `api_key` o header `X-API-Key`).
  - La clave se resuelve bajo bypass RLS (es única globalmente) y luego se fija
    el tenant de la clave para TODAS las consultas siguientes (aislamiento).
  - Validación de Origin ESTRICTA: el host del header Origin/Referer debe estar
    en `allowed_domains`. Sin dominios autorizados, se deniega.
  - Se devuelve `Access-Control-Allow-Origin` con el origin validado para que el
    navegador permita leer la respuesta desde el sitio del cliente.

Nota: el widget consume estos endpoints con un GET simple + query param (sin
headers personalizados) para evitar el preflight CORS.
"""
import hashlib
import json
from typing import Optional
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Request, Response, Query, Header
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app import models
from app.utils import tz
from app.core.client_ip import get_client_ip
from app.core.rate_limiter import limiter
from app.core.tenant_context import apply_bypass_rls, apply_tenant_rls
from app.api.internal.integrations.models import TenantApiKey

router = APIRouter()

# Segundos entre actualizaciones de last_used_at: evita un UPDATE+commit por
# request en el hot path (el dato es informativo, no necesita precisión).
LAST_USED_THROTTLE_SECONDS = 300

# TTL del catálogo en el navegador/CDN. El catálogo cambia poco y cada page
# view del sitio del cliente golpea este endpoint.
CATALOG_MAX_AGE_SECONDS = 300


def _widget_rate_key(request: Request) -> str:
    """Rate limit por API key (no solo por IP): un sitio comprometido no debe
    poder martillar la API; sin key, cae al límite por IP."""
    key = request.headers.get("x-api-key") or request.query_params.get("api_key")
    if key:
        return f"widget:{key.strip()}"
    return get_client_ip(request)


def _host_from_origin(origin: Optional[str]) -> Optional[str]:
    if not origin:
        return None
    value = origin.strip().lower()
    if "://" not in value:
        value = "//" + value
    parsed = urlparse(value)
    host = (parsed.netloc or parsed.path).split("@")[-1].split(":")[0].strip("/")
    return host or None


def validate_widget_key(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    api_key: Optional[str] = Query(None),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> TenantApiKey:
    """
    Valida API key + Origin y deja la sesión fijada al tenant de la clave.
    Devuelve el objeto TenantApiKey (ya con tenant RLS aplicada).
    """
    key_value = (x_api_key or api_key or "").strip()
    if not key_value:
        raise HTTPException(status_code=401, detail="Falta la API key.")

    # 1. Búsqueda global de la clave (única) bajo bypass RLS.
    apply_bypass_rls(db)
    key = (
        db.query(TenantApiKey)
        .filter(TenantApiKey.api_key == key_value, TenantApiKey.is_active.is_(True))
        .first()
    )
    if not key:
        raise HTTPException(status_code=401, detail="API key inválida o inactiva.")

    # 2. Validación de Origin contra la whitelist del tenant.
    #    - Si la petición trae Origin/Referer (navegador embebiendo el widget),
    #      DEBE estar en la whitelist: protege contra incrustación no autorizada.
    #    - Si NO trae Origin (navegación directa, curl, server-to-server), se
    #      permite: no es un escenario de incrustación y el Origin no es
    #      verificable fuera del navegador.
    allowed = [d.lower() for d in (key.allowed_domains or [])]
    origin_header = request.headers.get("origin")
    origin_host = _host_from_origin(origin_header) or _host_from_origin(
        request.headers.get("referer")
    )

    if origin_host:
        if origin_host not in allowed:
            raise HTTPException(status_code=403, detail="Origen no autorizado para esta API key.")
        # Cabeceras CORS para el origin validado (permite leer la respuesta).
        if origin_header:
            response.headers["Access-Control-Allow-Origin"] = origin_header
            response.headers["Vary"] = "Origin"

    # 4. Marcar uso (best-effort, con throttle para no escribir en cada request)
    #    y fijar tenant para consultas siguientes.
    now = tz.get_now()
    if not key.last_used_at or (now - key.last_used_at).total_seconds() > LAST_USED_THROTTLE_SECONDS:
        key.last_used_at = now
        db.commit()
    apply_tenant_rls(db, key.tenant_id)
    return key


def _catalog_response(request: Request, response: Response, payload: dict):
    """Aplica Cache-Control + ETag. Devuelve 304 si el cliente ya tiene la versión."""
    etag = '"' + hashlib.md5(
        json.dumps(payload, sort_keys=True, default=str).encode()
    ).hexdigest() + '"'
    response.headers["Cache-Control"] = f"public, max-age={CATALOG_MAX_AGE_SECONDS}"
    response.headers["ETag"] = etag
    if request.headers.get("if-none-match") == etag:
        # Conservar cabeceras ya fijadas (CORS del origin validado + caché).
        return Response(status_code=304, headers=dict(response.headers))
    return payload


def _serialize_catalog(db: Session, tenant_id: int) -> dict:
    """Consulta y serializa el catálogo activo de un tenant (campos públicos)."""
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()

    services = (
        db.query(models.Service)
        .filter(models.Service.tenant_id == tenant_id, models.Service.is_active.is_(True))
        .all()
    )
    products = (
        db.query(models.Product)
        .filter(models.Product.tenant_id == tenant_id, models.Product.is_active.is_(True))
        .all()
    )
    plans = (
        db.query(models.Plan)
        .options(selectinload(models.Plan.services))
        .filter(models.Plan.tenant_id == tenant_id, models.Plan.is_active.is_(True))
        .all()
    )

    return {
        "tenant": {
            "name": tenant.name if tenant else None,
            "slug": tenant.slug if tenant else None,
        },
        "services": [
            {"id": s.id, "nombre": s.name, "descripcion": s.description, "precio": s.price}
            for s in services
        ],
        "products": [
            {
                "id": p.id,
                "nombre": p.name,
                "descripcion": p.description,
                "precio": p.sale_price,
                "imagen": p.image_url,
            }
            for p in products
        ],
        "plans": [
            {
                "id": pl.id,
                "nombre": pl.name,
                "descripcion": pl.description,
                "precio": pl.price,
                "imagen": pl.image_url,
                "servicios": [s.name for s in (pl.services or [])],
            }
            for pl in plans
        ],
    }


@router.get("/products-services")
@limiter.limit("60/minute", key_func=_widget_rate_key)
def get_products_services(
    request: Request,
    response: Response,
    key: TenantApiKey = Depends(validate_widget_key),
    db: Session = Depends(get_db),
):
    """Lista productos, servicios y planes ACTIVOS del tenant (estructura plana)."""
    return _catalog_response(request, response, _serialize_catalog(db, key.tenant_id))


@router.get("/catalog")
@limiter.limit("60/minute", key_func=_widget_rate_key)
def get_catalog_grouped(
    request: Request,
    response: Response,
    key: TenantApiKey = Depends(validate_widget_key),
    db: Session = Depends(get_db),
):
    """
    Catálogo activo del tenant ORGANIZADO EN GRUPOS (planes, servicios, productos).
    Pensado para iterar fácilmente: cada grupo trae tipo, título, total e items.
    """
    data = _serialize_catalog(db, key.tenant_id)
    grupos = [
        {"tipo": "planes", "titulo": "Planes", "total": len(data["plans"]), "items": data["plans"]},
        {"tipo": "servicios", "titulo": "Servicios", "total": len(data["services"]), "items": data["services"]},
        {"tipo": "productos", "titulo": "Productos", "total": len(data["products"]), "items": data["products"]},
    ]
    payload = {
        "tenant": data["tenant"],
        "total": len(data["plans"]) + len(data["services"]) + len(data["products"]),
        "grupos": grupos,
    }
    return _catalog_response(request, response, payload)


@router.get("/tracking/{tracking_code}")
@limiter.limit("30/minute", key_func=_widget_rate_key)
def get_tracking_stub(
    request: Request,
    tracking_code: str,
    key: TenantApiKey = Depends(validate_widget_key),
    db: Session = Depends(get_db),
):
    """
    STUB de seguimiento. Busca la cremación por código dentro del tenant de la
    API key y devuelve un estado básico. El diseño/timeline final se hará luego.
    """
    tenant_id = key.tenant_id
    code = (tracking_code or "").strip()

    cremation = (
        db.query(models.Cremation)
        .outerjoin(
            models.CremationDetails,
            models.Cremation.id == models.CremationDetails.cremation_id,
        )
        .filter(
            models.Cremation.tenant_id == tenant_id,
            or_(
                models.Cremation.verification_code == code,
                models.CremationDetails.tracking_token == code,
            ),
        )
        .first()
    )

    if not cremation:
        raise HTTPException(
            status_code=404,
            detail="No se encontró un seguimiento con ese código.",
        )

    return {
        "found": True,
        "codigo": code,
        "status": cremation.status or "En proceso",
        "etapa": cremation.status or "Recepción",
    }
