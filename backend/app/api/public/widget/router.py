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
from urllib.parse import quote, urlparse

from fastapi import APIRouter, Depends, HTTPException, Request, Response, Query, Header
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload, selectinload

from app.database import get_db
from app import models
from app.core.config import settings
from app.utils import tz
from app.utils.r2 import normalize_image_url
from app.core.client_ip import get_client_ip
from app.core.rate_limiter import limiter
from app.core.tenant_context import apply_bypass_rls, apply_tenant_rls
from app.api.internal.integrations.models import TenantApiKey
from app.api.internal.integrations.services import tenant_can_use_widget, tenant_can_use_form_embed
from app.services.family_notices import _tracking_base
from app.services.memorial_notifications import _memorial_base_url, slugify

router = APIRouter()

# Segundos entre actualizaciones de last_used_at: evita un UPDATE+commit por
# request en el hot path (el dato es informativo, no necesita precisión).
LAST_USED_THROTTLE_SECONDS = 300

# TTL del catálogo en el navegador/CDN. El catálogo cambia poco y cada page
# view del sitio del cliente golpea este endpoint.
CATALOG_MAX_AGE_SECONDS = 300

_MESES_CORTOS = (
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
)


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


def _public_image_url(request: Request, raw_url: Optional[str]) -> Optional[str]:
    """Garantiza URL absoluta para imágenes consumidas desde sitios externos."""
    if not raw_url or not isinstance(raw_url, str):
        return None
    norm = normalize_image_url(raw_url.strip())
    if not norm:
        return None
    if norm.startswith(("http://", "https://")):
        return norm
    base = str(request.base_url).rstrip("/")
    path = norm if norm.startswith("/") else f"/{norm}"
    return f"{base}{path}"


def _format_death_date(death_date, precision: Optional[str] = "day") -> tuple[Optional[str], Optional[str]]:
    """Formatea la fecha de fallecimiento según precisión ('day', 'month', 'year').
    Retorna (texto_legible, iso_parcial) o (None, None) si no tiene fecha."""
    if not death_date:
        return None, None
    try:
        prec = (precision or "day").strip().lower()
        year = death_date.year
        month = death_date.month
        day = death_date.day
        mes_txt = _MESES_CORTOS[month - 1] if 1 <= month <= 12 else ""
        if prec == "year":
            return f"{year:04d}", f"{year:04d}"
        if prec == "month":
            return f"{mes_txt} {year:04d}", f"{year:04d}-{month:02d}"
        return f"{day:02d} {mes_txt} {year:04d}", f"{year:04d}-{month:02d}-{day:02d}"
    except Exception:
        return None, None


def _frontend_root_url() -> str:
    parsed = urlparse(settings.FRONTEND_URL)
    host = parsed.netloc[4:] if parsed.netloc.startswith("www.") else parsed.netloc
    return f"{parsed.scheme or 'https'}://{host}".rstrip("/")


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

    # 1b. Gating por plan en runtime: si el tenant baja de PRO/ULTRA (o vence
    #     su demo), sus claves dejan de funcionar aunque sigan activas.
    if not tenant_can_use_widget(key.tenant):
        raise HTTPException(status_code=403, detail="El plan del crematorio no incluye el widget.")

    # 2. Validación de Origin contra la whitelist del tenant.
    #    - Si la petición trae Origin/Referer (navegador embebiendo el widget),
    #      DEBE estar en la whitelist: protege contra incrustación no autorizada.
    #    - Si NO trae Origin (navegación directa, curl, server-to-server), se
    #      permite: no es un escenario de incrustación y el Origin no es
    #      verificable fuera del navegador.
    allowed = [d.lower() for d in (key.allowed_domains or [])]
    if not allowed:
        # Una clave sin dominios queda inactiva para cualquier cliente
        # (también curl / server-to-server), no solo para navegadores.
        raise HTTPException(status_code=403, detail="API key sin dominios autorizados.")
    origin_header = request.headers.get("origin")
    origin_host = _host_from_origin(origin_header) or _host_from_origin(
        request.headers.get("referer")
    )

    is_dev_local_origin = (
        not settings.IS_PRODUCTION
        and (
            origin_header == "null"
            or origin_host in ("null", "localhost", "127.0.0.1")
            or (origin_host and origin_host.endswith(".lvh.me"))
        )
    )

    if origin_host:
        if origin_host not in allowed and not is_dev_local_origin:
            raise HTTPException(status_code=403, detail="Origen no autorizado para esta API key.")
        # Cabeceras CORS para el origin validado (permite leer la respuesta).
        if origin_header:
            response.headers["Access-Control-Allow-Origin"] = origin_header
            response.headers["Vary"] = "Origin"
    elif is_dev_local_origin and origin_header:
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


def _serialize_catalog(db: Session, tenant_id: int, request: Optional[Request] = None) -> dict:
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

    form_url = None
    if tenant and tenant.slug and tenant.public_token:
        form_url = f"{_frontend_root_url()}/{quote(tenant.slug)}/form?token={quote(tenant.public_token)}"

    return {
        "tenant": {
            "name": tenant.name if tenant else None,
            "slug": tenant.slug if tenant else None,
            "phone": (tenant.phone or "").strip() or None if tenant else None,
            "form_url": form_url,
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
                "imagen": _public_image_url(request, p.image_url) if request else p.image_url,
            }
            for p in products
        ],
        "plans": [
            {
                "id": pl.id,
                "nombre": pl.name,
                "descripcion": pl.description,
                "precio": pl.price,
                "imagen": _public_image_url(request, pl.image_url) if request else pl.image_url,
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
    return _catalog_response(request, response, _serialize_catalog(db, key.tenant_id, request))


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
    data = _serialize_catalog(db, key.tenant_id, request)
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


def _serialize_recent_pets(
    db: Session,
    tenant_id: int,
    limit: int = 8,
    request: Optional[Request] = None,
) -> dict:
    """Consulta y serializa las últimas mascotas del tenant para el widget En Memoria."""
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()

    pets = (
        db.query(models.Pet)
        .filter(models.Pet.tenant_id == tenant_id)
        .order_by(models.Pet.created_at.desc(), models.Pet.id.desc())
        .limit(limit)
        .all()
    )

    pet_ids = [p.id for p in pets]

    # Buscar memoriales públicos activos asociados a estas mascotas (opcional)
    memorials_by_pet: dict[int, models.Memorial] = {}
    if pet_ids:
        memorials = (
            db.query(models.Memorial)
            .filter(
                models.Memorial.id_tenant == tenant_id,
                models.Memorial.id_mascota.in_(pet_ids),
                models.Memorial.status == models.MemorialStatus.active,
                models.Memorial.es_privado.is_(False),
            )
            .all()
        )
        for m in memorials:
            memorials_by_pet[m.id_mascota] = m

    # Fallback de fotos desde detalles de la cremación si la mascota no tiene image_url directa
    cremation_imgs_by_pet: dict[int, str] = {}
    if pet_ids:
        cremations = (
            db.query(models.Cremation)
            .options(joinedload(models.Cremation.details))
            .filter(
                models.Cremation.tenant_id == tenant_id,
                models.Cremation.pet_id.in_(pet_ids),
            )
            .order_by(models.Cremation.created_at.desc())
            .all()
        )
        for c in cremations:
            if c.pet_id not in cremation_imgs_by_pet and c.details and isinstance(c.details.images, list) and c.details.images:
                first_img = next((img for img in c.details.images if isinstance(img, str) and img.strip()), None)
                if first_img:
                    cremation_imgs_by_pet[c.pet_id] = first_img

    items = []
    mem_base = _memorial_base_url()
    tenant_slug = slugify(tenant.slug or tenant.name or "memorial") if tenant else "memorial"

    for p in pets:
        raw_img = p.image_url
        if not raw_img and isinstance(p.images, list) and p.images:
            raw_img = next((i for i in p.images if isinstance(i, str) and i.strip()), None)
        if not raw_img:
            raw_img = cremation_imgs_by_pet.get(p.id)

        mem = memorials_by_pet.get(p.id)
        if not raw_img and mem:
            raw_img = mem.main_image_url or (mem.lista_imagenes[0] if isinstance(mem.lista_imagenes, list) and mem.lista_imagenes else None)

        death_label, death_iso = _format_death_date(p.death_date, getattr(p, "death_date_precision", "day"))

        mem_url = None
        if mem and mem.id_recuerdo:
            pet_slug = slugify(p.name or "mascota")
            mem_url = f"{mem_base}/memorials/v/{tenant_slug}/{pet_slug}/{mem.id_recuerdo}"

        raw_breed = (p.breed or "").strip()
        clean_breed = None if not raw_breed or raw_breed.upper() == "N/A" else raw_breed

        items.append({
            "id": p.id,
            "nombre": (p.name or "Mascota").strip(),
            "especie": (p.species or "").strip() or None,
            "raza": clean_breed,
            "imagen": _public_image_url(request, raw_img) if request else normalize_image_url(raw_img),
            "fecha_fallecimiento": death_label,
            "fecha_fallecimiento_iso": death_iso,
            "memorial_url": mem_url,
        })

    return {
        "tenant": {
            "name": tenant.name if tenant else None,
            "slug": tenant.slug if tenant else None,
        },
        "total": len(items),
        "mascotas": items,
    }


@router.get("/recent-pets")
@limiter.limit("60/minute", key_func=_widget_rate_key)
def get_recent_pets(
    request: Request,
    response: Response,
    limit: int = Query(8, ge=1, le=24),
    key: TenantApiKey = Depends(validate_widget_key),
    db: Session = Depends(get_db),
):
    """
    Últimas mascotas registradas del crematorio con foto, nombre y fecha de
    fallecimiento (si está disponible). No expone datos personales del tutor.
    """
    payload = _serialize_recent_pets(db, key.tenant_id, limit, request)
    return _catalog_response(request, response, payload)


@router.get("/form-embed/config")
@limiter.limit("60/minute", key_func=_widget_rate_key)
def get_form_embed_config(
    request: Request,
    key: TenantApiKey = Depends(validate_widget_key),
):
    """
    Configuración del formulario incrustable (iframe). La consume el middleware
    de Next (server-side) para resolver el tenant de la clave y armar el header
    `Content-Security-Policy: frame-ancestors` con los dominios autorizados.
    Exclusivo del plan ULTRA.
    """
    if not tenant_can_use_form_embed(key.tenant):
        raise HTTPException(status_code=403, detail="El formulario incrustable está disponible solo en el plan ULTRA.")
    return {
        "tenant_slug": key.tenant.slug,
        "allowed_domains": key.allowed_domains or [],
    }


@router.get("/tracking/{tracking_code}")
@limiter.limit("30/minute", key_func=_widget_rate_key)
def get_tracking_stub(
    request: Request,
    tracking_code: str,
    key: TenantApiKey = Depends(validate_widget_key),
    db: Session = Depends(get_db),
):
    """
    Seguimiento enriquecido para el widget embebible. Busca la orden o solicitud
    por código dentro del tenant de la API key y devuelve estado, etapa real del
    flujo, progreso, foto de la mascota y enlace directo al portal ceremonial.
    """
    tenant_id = key.tenant_id
    code = (tracking_code or "").strip()
    if not code:
        raise HTTPException(status_code=404, detail="No se encontró un seguimiento con ese código.")

    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    steps = (
        db.query(models.WorkflowStep)
        .filter(models.WorkflowStep.tenant_id == tenant_id, models.WorkflowStep.is_active.is_(True))
        .order_by(models.WorkflowStep.order_index)
        .all()
    )
    total_steps = len(steps)

    cremation = (
        db.query(models.Cremation)
        .outerjoin(
            models.CremationDetails,
            models.Cremation.id == models.CremationDetails.cremation_id,
        )
        .options(
            joinedload(models.Cremation.technical),
            joinedload(models.Cremation.evidence),
            joinedload(models.Cremation.details),
            joinedload(models.Cremation.pet),
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

    if cremation:
        pet = cremation.pet
        pet_name = (pet.name if pet and pet.name else "Mascota").strip()
        pet_species = (pet.species if pet and pet.species else None)
        raw_img = (pet.image_url if pet else None)
        if not raw_img and pet and isinstance(pet.images, list) and pet.images:
            raw_img = next((i for i in pet.images if isinstance(i, str) and i.strip()), None)
        if not raw_img and cremation.details and isinstance(cremation.details.images, list) and cremation.details.images:
            raw_img = next((i for i in cremation.details.images if isinstance(i, str) and i.strip()), None)

        is_finished = (cremation.status or "").lower() in ("delivered", "entregado", "completado")
        current_step_id = cremation.technical.step_id if cremation.technical else None
        evidence_step_ids = {ev.step_id for ev in (cremation.evidence or [])}

        current_stage_name = "Recepción"
        completed_count = 0

        if total_steps > 0:
            current_idx = -1
            for idx, s in enumerate(steps):
                if s.id == current_step_id:
                    current_idx = idx
                    break

            if is_finished:
                completed_count = total_steps
                current_stage_name = steps[-1].name
            elif current_idx >= 0:
                completed_count = current_idx
                current_stage_name = steps[current_idx].name
            else:
                completed_count = sum(1 for s in steps if s.id in evidence_step_ids)
                current_stage_name = steps[min(completed_count, total_steps - 1)].name

        progress = 100 if is_finished else (round((completed_count / total_steps) * 100) if total_steps > 0 else 20)
        status_label = "Servicio Finalizado" if is_finished else "Acompañando el proceso"

        token_for_url = (
            cremation.verification_code
            or (cremation.details.tracking_token if cremation.details else None)
            or code
        )
        track_url = (
            f"{_tracking_base()}/{quote(tenant.slug)}/track/{quote(pet_name)}/{quote(token_for_url)}"
            if tenant and tenant.slug
            else None
        )

        return {
            "found": True,
            "codigo": code,
            "mascota": pet_name,
            "especie": pet_species,
            "imagen": _public_image_url(request, raw_img),
            "status": status_label,
            "etapa": current_stage_name,
            "progreso": progress,
            "pasos_completados": completed_count,
            "total_pasos": total_steps,
            "tracking_url": track_url,
        }

    # Fallback: Solicitud de formulario aún pendiente de aprobación
    submission = (
        db.query(models.FormSubmission)
        .filter(
            models.FormSubmission.tenant_id == tenant_id,
            models.FormSubmission.code == code,
            models.FormSubmission.status != "deleted",
        )
        .first()
    )
    if submission:
        pet_data = submission.pet_data or {}
        pet_name = (pet_data.get("name") or "Mascota").strip()
        pet_species = pet_data.get("type") or pet_data.get("species") or None
        raw_img = (
            submission.images[0]
            if isinstance(submission.images, list) and submission.images
            else None
        )
        first_stage = steps[0].name if steps else "Solicitud recibida"
        track_url = (
            f"{_tracking_base()}/{quote(tenant.slug)}/track/{quote(pet_name)}/{quote(code)}"
            if tenant and tenant.slug
            else None
        )
        return {
            "found": True,
            "codigo": code,
            "mascota": pet_name,
            "especie": pet_species,
            "imagen": _public_image_url(request, raw_img),
            "status": "Solicitud en recepción",
            "etapa": first_stage,
            "progreso": 10,
            "pasos_completados": 0,
            "total_pasos": total_steps,
            "tracking_url": track_url,
        }

    raise HTTPException(
        status_code=404,
        detail="No se encontró un seguimiento con ese código.",
    )
