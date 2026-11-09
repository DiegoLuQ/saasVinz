from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Request, File, UploadFile, Form
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app import models, auth
from . import models as mem_models
from . import schemas as mem_schemas
from uuid import UUID, uuid4
from datetime import datetime, timedelta
import random
import string
import os
import shutil

router = APIRouter()

from app.utils.r2 import normalize_image_url
from app.utils.sanitize import sanitize_text
from collections import defaultdict
import time
from app.api.internal.common.media_service import MediaService
from app.core.rate_limiter import limiter
from .services import merge_diseno
from app.services import memorial_melodies as melodies
from app.api.internal.admin.rbac.router import check_permission

# ─── Rate Limiting (in-memory, per-IP) ───
_rate_limit_store: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT_MAX = 5       # max requests
_RATE_LIMIT_WINDOW = 60   # seconds

# Guardado automático de la gestión (cada cambio de apariencia = 1 PATCH): con el PIN correcto
_MANAGE_SAVES_MAX = 60    # por minuto, por memorial + IP


def _check_rate_limit(client_ip: str, limit: int = _RATE_LIMIT_MAX):
    """Raises 429 if `client_ip` (o la clave dada) supera `limit` solicitudes por minuto."""
    now = time.time()
    if len(_rate_limit_store) > 500:
        stale_keys = [k for k, v in list(_rate_limit_store.items()) if not v or now - v[-1] >= _RATE_LIMIT_WINDOW]
        for k in stale_keys:
            _rate_limit_store.pop(k, None)
    timestamps = _rate_limit_store[client_ip]
    # Purge expired entries
    _rate_limit_store[client_ip] = [t for t in timestamps if now - t < _RATE_LIMIT_WINDOW]
    if len(_rate_limit_store[client_ip]) >= limit:
        raise HTTPException(
            status_code=429,
            detail="Demasiadas solicitudes. Intenta de nuevo en un minuto."
        )
    _rate_limit_store[client_ip].append(now)

def _load_memorial_scoped(db: Session, recuerdo_uuid: UUID, with_dedications: bool = False):
    """
    Resuelve un memorial público/familiar y acota la sesión RLS al tenant dueño.

    Los endpoints públicos llegan sin tenant en contexto (deny-all). El memorial
    vive en una tabla sin RLS, pero la mascota (crm_pets) sí está protegida: sin
    contexto, los joinedload devolvían pet=None (500 en el público, pérdida
    silenciosa de fotos en la gestión familiar). Aquí declaramos el tenant del
    propio memorial — la sesión solo puede leer datos de ese crematorio, nunca
    de otros (no es un bypass global).
    """
    from app.core.tenant_context import apply_tenant_rls
    owner = db.query(
        mem_models.Memorial.id, mem_models.Memorial.id_tenant
    ).filter(mem_models.Memorial.id_recuerdo == recuerdo_uuid).first()

    if not owner:
        raise HTTPException(status_code=404, detail="Memorial no encontrado.")

    apply_tenant_rls(db, owner.id_tenant)

    opts = [
        joinedload(mem_models.Memorial.pet),
        joinedload(mem_models.Memorial.tenant).joinedload(models.Tenant.subscription_plan),
    ]
    if with_dedications:
        opts.append(joinedload(mem_models.Memorial.dedications))

    return db.query(mem_models.Memorial).options(*opts).filter(
        mem_models.Memorial.id == owner.id
    ).first()


def get_random_pin():
    return ''.join(random.choices(string.digits, k=6))

@router.get("", response_model=list[mem_schemas.MemorialCardResponse])
@router.get("/", response_model=list[mem_schemas.MemorialCardResponse], include_in_schema=False)
def list_public_memorials(
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """List public memorials for the gallery"""
    limit = max(1, min(limit, 50))  # tope defensivo
    query = db.query(mem_models.Memorial).options(
        joinedload(mem_models.Memorial.pet),
        joinedload(mem_models.Memorial.tenant)
    ).filter(
        mem_models.Memorial.es_privado == False,
        mem_models.Memorial.status == mem_models.MemorialStatus.active
    ).order_by(mem_models.Memorial.fecha.desc())
    
    from app.core.tenant_context import apply_bypass_rls, clear_rls
    apply_bypass_rls(db)
    try:
        memorials = query.limit(limit).all()
    finally:
        clear_rls(db)
    
    return [
        mem_schemas.MemorialCardResponse(
            id_recuerdo=m.id_recuerdo,
            pet_name=m.pet.name if m.pet else "Mascota",
            pet_image_url=normalize_image_url(m.main_image_url or (m.pet.image_url if m.pet else None)),
            pet_birth_date=m.pet.birth_date if m.pet else None,
            pet_death_date=m.pet.death_date if m.pet else None,
            tenant_name=m.tenant.name if m.tenant else "Empresa",
            tenant_logo_url=normalize_image_url(m.tenant.logo_url) if m.tenant and m.tenant.logo_url else None,
        )
        for m in memorials
    ]


@router.get("/melodies")
def list_memorial_melodies(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Melodías disponibles (las sube el SuperAdmin a la Biblioteca). Todos los planes."""
    return melodies.list_melodies(db)


@router.put("/{recuerdo_uuid}/melody", response_model=mem_schemas.MemorialManageResponse)
def set_memorial_melody(
    recuerdo_uuid: UUID,
    body: mem_schemas.MemorialMelodyUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
    _: bool = Depends(check_permission("mascotas", "edit")),
):
    """Melodía del memorial: solo la elige y activa el crematorio (no la familia)."""
    memorial = db.query(mem_models.Memorial).options(
        joinedload(mem_models.Memorial.pet),
        joinedload(mem_models.Memorial.tenant).joinedload(models.Tenant.subscription_plan),
        joinedload(mem_models.Memorial.dedications),
    ).filter(
        mem_models.Memorial.id_recuerdo == recuerdo_uuid,
        mem_models.Memorial.id_tenant == current_user.tenant_id,
    ).first()
    if not memorial:
        raise HTTPException(status_code=404, detail="Memorial no encontrado o no pertenece a su cuenta.")

    if body.media_id is None:
        value = None
    else:
        if not melodies.get_melody(db, body.media_id):
            raise HTTPException(status_code=404, detail="La melodía ya no está disponible.")
        value = {"media_id": body.media_id, "activa": bool(body.activa)}

    memorial.diseno = merge_diseno(memorial.diseno, {melodies.DISENO_KEY: value})
    db.commit()
    db.refresh(memorial)

    memorial.lista_imagenes = [normalize_image_url(img) for img in (memorial.lista_imagenes or [])]
    memorial.main_image_url = normalize_image_url(memorial.main_image_url)
    return _apply_memorial_limit(memorial, db)


@router.get("/crematorios", response_model=list[mem_schemas.PublicCrematoriumResponse])
def list_public_crematoria(limit: int = 24, db: Session = Depends(get_db)):
    """Crematorios activos con al menos un memorial público y vigente (landing).
    Solo datos que ya son visibles en las tarjetas públicas: nombre, logo y ubicación."""
    from sqlalchemy import func
    limit = max(1, min(limit, 48))
    rows = (
        db.query(models.Tenant, func.count(mem_models.Memorial.id))
        .join(mem_models.Memorial, mem_models.Memorial.id_tenant == models.Tenant.id)
        .filter(
            mem_models.Memorial.es_privado == False,
            mem_models.Memorial.status == mem_models.MemorialStatus.active,
            models.Tenant.status == models.TenantStatus.active,
        )
        .group_by(models.Tenant.id)
        .order_by(func.count(mem_models.Memorial.id).desc(), models.Tenant.name.asc())
        .limit(limit)
        .all()
    )
    return [
        mem_schemas.PublicCrematoriumResponse(
            name=t.name,
            logo_url=normalize_image_url(t.logo_url) if t.logo_url else None,
            city=t.city,
            region=t.region,
            memorials_count=count,
        )
        for t, count in rows
    ]


def _is_pro_or_ultra_plan(plan_name: str | None) -> bool:
    pn = (plan_name or "").upper().strip()
    return any(k in pn for k in ("PRO", "ULTRA", "VINCULO", "VÍNCULO", "PARAISO", "PARAÍSO", "MENSUAL", "ANUAL", "ETERNO", "RECUERDO", "INFINITO", "PARTNER"))


def _get_memorial_limit(memorial: mem_models.Memorial, db: Session) -> int:
    """Mensajes publicados que permite el plan del memorial (app/services/memorial_plans.py)."""
    from app.services import memorial_plans
    return memorial_plans.limits(db, memorial)["max_dedications"]


# Clave de `diseno` con la que la familia publica los mensajes sin aprobarlos uno a uno.
AUTO_PUBLISH_KEY = "auto_publicar_mensajes"

# Fotos de un memorial creado por un crematorio (incluido en su plan, sin plan de memorial vendido).
TENANT_MEMORIAL_MAX_IMAGES = 3


def _get_memorial_img_limit(memorial: mem_models.Memorial, db: Session) -> int:
    """Máximo de fotos del memorial (gestión, subida de la familia y vista pública):
    - con un plan de memorial vendido por Vinzer (Mensual / Anual / Eterno, `rec_plans.features.max_images`;
      hoy 3 / 5 / 8) manda ese plan, aunque el memorial sea de un crematorio;
    - memorial de un crematorio sin plan vendido: TENANT_MEMORIAL_MAX_IMAGES (3), sea cual sea el plan del crematorio."""
    from app.services import memorial_plans
    return memorial_plans.limits(db, memorial)["max_images"]


_MAX_LIT_STARS = 60          # estrellas con nombre que se dibujan en Constelación
_RITUALS_PER_IP_HOUR = 30     # tope antiabuso por memorial e IP


def _ritual_state(memorial_id: int, db: Session) -> dict:
    """Totales por tipo de ritual + últimas estrellas encendidas (con nombre)."""
    from sqlalchemy import func
    rows = db.query(mem_models.Ritual.kind, func.count(mem_models.Ritual.id)).filter(
        mem_models.Ritual.id_recuerdo == memorial_id
    ).group_by(mem_models.Ritual.kind).all()
    counts = {k.value: 0 for k in mem_models.RitualKind}
    counts.update({kind: n for kind, n in rows})

    stars = db.query(mem_models.Ritual.id, mem_models.Ritual.name).filter(
        mem_models.Ritual.id_recuerdo == memorial_id,
        mem_models.Ritual.kind == mem_models.RitualKind.estrella.value,
    ).order_by(mem_models.Ritual.id.desc()).limit(_MAX_LIT_STARS).all()
    return {"counts": counts, "stars": [{"id": sid, "name": name} for sid, name in stars]}


def _apply_memorial_limit(memorial: mem_models.Memorial, db: Session):
    limit = _get_memorial_limit(memorial, db)
    setattr(memorial, "dedication_limit", limit)
    # Fotos permitidas por el plan (el frontend ya no infiere límites por nombre)
    setattr(memorial, "img_limit", _get_memorial_img_limit(memorial, db))
    from app.services import memorial_plans
    plan = memorial_plans.plan_of(db, memorial)
    setattr(memorial, "plan_features", memorial_plans.features_of(plan))
    setattr(memorial, "is_vinzer_plan", bool(plan and plan.kind == memorial_plans.KIND_VINZER))
    # Nombre configurado del plan (Admin → Memoriales → Planes y precios), p. ej. «Partner»
    setattr(memorial, "plan_name", plan.name if plan else None)
    from app.services import memorial_expiry
    setattr(memorial, "expired", memorial_expiry.is_expired(memorial))
    from app.services import memorial_timeline
    setattr(memorial, "timeline", memorial_timeline.public_list(db, memorial))
    from app.services import memorial_media
    videos, voices = memorial_media.public_lists(db, memorial)
    setattr(memorial, "videos", videos)
    setattr(memorial, "voices", voices)
    # Contadores de rituales (velas, flores, estrellas, besos) para la prueba social
    state = _ritual_state(memorial.id, db)
    setattr(memorial, "ritual_counts", state["counts"])
    setattr(memorial, "lit_stars", state["stars"])
    
    # Count approved + pending dedications for accurate limit enforcement
    count = db.query(mem_models.Dedication).filter(
        mem_models.Dedication.id_recuerdo == memorial.id,
        (mem_models.Dedication.estado == mem_models.DedicationStatus.aprobado) | 
        (mem_models.Dedication.estado == mem_models.DedicationStatus.pendiente)
    ).count()
    setattr(memorial, "dedications_count", count)
    
    # Inject wallpaper theme_config if it exists
    diseno = memorial.diseno or {}
    portada_url = diseno.get("portada_url")
    if portada_url:
        from app.api.internal.common.models import MediaLibrary
        filename = portada_url.split("/")[-1]
        # Igualdad exacta primero; el «termina en /archivo» (LIKE sin índice) solo como respaldo
        media_item = db.query(MediaLibrary).filter(MediaLibrary.url == portada_url).first() or \
            db.query(MediaLibrary).filter(MediaLibrary.url.endswith("/" + filename)).first()
        if media_item and media_item.theme_config:
            diseno_copy = dict(diseno)
            diseno_copy["theme_config"] = media_item.theme_config
            # Set to non-persistent attribute so it doesn't trigger a database update
            # during read requests. Pydantic will serialize it normally.
            memorial.diseno = diseno_copy
            
    # Resolve owner/tutor dedication from cremation order (OC) or initial form
    owner_ded = None
    if memorial.id_mascota:
        oc = db.query(models.CremationOC).options(
            joinedload(models.CremationOC.details)
        ).filter(
            models.CremationOC.pet_id == memorial.id_mascota,
            models.CremationOC.tenant_id == memorial.id_tenant
        ).order_by(models.CremationOC.id.desc()).first()
        if oc and oc.details and oc.details.dedication:
            owner_ded = (oc.details.dedication or "").strip() or None
        if not owner_ded:
            sub = db.query(models.FormSubmission).filter(
                models.FormSubmission.tenant_id == memorial.id_tenant,
                models.FormSubmission.pet_id == memorial.id_mascota,
            ).order_by(models.FormSubmission.id.desc()).first()
            if sub and sub.pet_data and isinstance(sub.pet_data, dict):
                owner_ded = (sub.pet_data.get("dedication") or "").strip() or None
    setattr(memorial, "owner_dedication", owner_ded)

    # Melodía elegida por el crematorio (URL resuelta desde la biblioteca).
    setattr(memorial, "melody", melodies.resolve(db, memorial.diseno))

    return memorial

@router.post("", response_model=mem_schemas.MemorialManageResponse)
def create_memorial(
    memorial_in: mem_schemas.MemorialCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # 1. Restricción exclusiva a planes de crematorio PRO y ULTRA (+ feature flag)
    tenant = current_user.tenant
    plan = (tenant.effective_plan if tenant else None) or (tenant.subscription_plan if tenant else None)
    plan_name = (plan.name if plan else None) or (tenant.plan if tenant else None) or "FREE"
    features = plan.features if plan and isinstance(plan.features, dict) else {}

    if not _is_pro_or_ultra_plan(plan_name) or ("mascotas:memorial" in features and not features.get("mascotas:memorial")):
        raise HTTPException(
            status_code=403,
            detail="El módulo de Memorial Conmemorativo está disponible exclusivamente para planes de crematorio PRO y ULTRA."
        )

    # 2. Check if pet belongs to tenant
    pet = db.query(models.Pet).filter(
        models.Pet.id == memorial_in.id_mascota,
        models.Pet.tenant_id == current_user.tenant_id
    ).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada.")

    # 3. Check if memorial already exists
    existing = db.query(mem_models.Memorial).filter(
        mem_models.Memorial.id_mascota == memorial_in.id_mascota,
        mem_models.Memorial.id_tenant == current_user.tenant_id
    ).first()
    if existing:
        existing_mem = db.query(mem_models.Memorial).options(
            joinedload(mem_models.Memorial.pet),
            joinedload(mem_models.Memorial.tenant).joinedload(models.Tenant.subscription_plan),
            joinedload(mem_models.Memorial.dedications),
        ).filter(mem_models.Memorial.id == existing.id).first()
        if not existing_mem.access_key:
            existing_mem.access_key = get_random_pin()
            db.commit()
            db.refresh(existing_mem)
        existing_mem.lista_imagenes = [normalize_image_url(img) for img in (existing_mem.lista_imagenes or [])]
        existing_mem.main_image_url = normalize_image_url(existing_mem.main_image_url)
        return _apply_memorial_limit(existing_mem, db)

    # 4. Validez por defecto: 1 año desde la creación.
    now = datetime.now()
    valid_until = now + timedelta(days=365)

    # 5. Fotos: plan Partner (un plan Vinzer lo sube después)
    img_limit = TENANT_MEMORIAL_MAX_IMAGES

    db_memorial = mem_models.Memorial(
        id_mascota=memorial_in.id_mascota,
        id_tenant=current_user.tenant_id,
        msg_despedida=sanitize_text(memorial_in.msg_despedida),
        diseno=memorial_in.diseno or {},
        es_privado=memorial_in.es_privado,
        access_key=get_random_pin(),
        lista_imagenes=[normalize_image_url(img) for img in (pet.images or [])][:img_limit],
        main_image_url=normalize_image_url(pet.image_url),
        valid_until=valid_until,
        plan=plan_name # Snapshot feature tier
    )
    # Plan Partner (límites del memorial de crematorio, editables en Admin); la familia puede subir a un plan Vinzer
    from app.services import memorial_plans
    partner = memorial_plans.partner_plan(db)
    if partner:
        db_memorial.plan_id = partner.id
        db_memorial.plan_price, db_memorial.plan_currency, db_memorial.plan_billing = 0, partner.currency or "USD", memorial_plans.BILLING_INCLUDED
    # Escenario: solo uno que incluya el plan Partner (si no, el primero permitido)
    allowed = memorial_plans.features_of(partner)["scenarios"]
    diseno = dict(db_memorial.diseno or {})
    if diseno.get("tipo_diseno") not in allowed:
        diseno["tipo_diseno"] = allowed[0]
        db_memorial.diseno = diseno
    db.add(db_memorial)
    db.commit()
    db.refresh(db_memorial)
    
    # Re-fetch with joined loads to satisfy response model (computed properties)
    memorial = db.query(mem_models.Memorial).options(
        joinedload(mem_models.Memorial.pet),
        joinedload(mem_models.Memorial.tenant).joinedload(models.Tenant.subscription_plan),
        joinedload(mem_models.Memorial.dedications),
    ).filter(mem_models.Memorial.id == db_memorial.id).first()

    return _apply_memorial_limit(memorial, db)

@router.get("/code/{code}")
def resolve_memorial_code(code: str, db: Session = Depends(get_db)):
    """Enlace corto → UUID del memorial (la página pública sigue usando el UUID para la API).
    Público: el código ya está en el enlace compartido; los privados siguen pidiendo su PIN."""
    row = db.query(mem_models.Memorial.id_recuerdo).filter(
        mem_models.Memorial.short_code == (code or "").strip().lower()[:12]
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Memorial no encontrado.")
    return {"id_recuerdo": str(row[0])}


@router.get("/{recuerdo_uuid}", response_model=mem_schemas.MemorialPublicResponse)
def get_public_memorial(
    recuerdo_uuid: UUID,
    db: Session = Depends(get_db)
):
    memorial = _load_memorial_scoped(db, recuerdo_uuid, with_dedications=True)

    # Lifecycle Check
    if memorial.status == mem_models.MemorialStatus.active and memorial.valid_until:
        if memorial.valid_until < datetime.now():
            # Auto-expire
            memorial.status = mem_models.MemorialStatus.expired
            db.commit() # Save the state change
            db.refresh(memorial)

    # We only block if 'archived' (deleted/banned).
    if memorial.status == mem_models.MemorialStatus.archived:
        raise HTTPException(status_code=403, detail="Este memorial ha sido archivado.")

    if memorial.es_privado:
        raise HTTPException(status_code=403, detail="Este memorial es privado.")

    # Normalize before returning
    memorial.lista_imagenes = [normalize_image_url(img) for img in (memorial.lista_imagenes or [])]
    memorial.main_image_url = normalize_image_url(memorial.main_image_url)

    from app.services.catalog_funnel import record_link_view
    record_link_view(db, memorial.id_tenant, "memorial", str(memorial.id_recuerdo))
    result = _apply_memorial_limit(memorial, db)
    # Al público solo se le entrega la melodía si el crematorio la dejó activa.
    if not (result.melody or {}).get("activa"):
        result.melody = None
    if getattr(result, "expired", False):
        # Vencido: el memorial sigue en línea con solo algunas fotos y mensajes.
        # Se recorta la respuesta (nunca las relaciones ORM, que borrarían datos).
        from app.services import memorial_expiry
        resp = mem_schemas.MemorialPublicResponse.model_validate(result)
        memorial_expiry.reduce_public_view(resp, result.plan_features or {})
        # JSONResponse: devolver el modelo haría que FastAPI lo re-valide y perdería los alias
        from fastapi.encoders import jsonable_encoder
        from fastapi.responses import JSONResponse
        return JSONResponse(jsonable_encoder(resp, by_alias=True))
    return result


@router.get("/{recuerdo_uuid}/og-image.jpg")
@limiter.limit("60/minute")
def get_memorial_og_image(
    request: Request,
    recuerdo_uuid: UUID,
    db: Session = Depends(get_db)
):
    """Tarjeta JPEG con la foto de la mascota para el preview al compartir el
    memorial (WhatsApp no previsualiza los .webp guardados en R2)."""
    from fastapi import Response
    from app.api.public.tracking.router import _compose_og_card

    memorial = _load_memorial_scoped(db, recuerdo_uuid)
    if (not memorial or memorial.es_privado
            or memorial.status == mem_models.MemorialStatus.archived):
        raise HTTPException(status_code=404, detail="Sin imagen disponible")

    image_url = normalize_image_url(
        memorial.main_image_url or (memorial.pet.image_url if memorial.pet else None)
    )
    if not image_url or not str(image_url).lower().startswith(("http://", "https://")):
        raise HTTPException(status_code=404, detail="Sin imagen disponible")

    try:
        import requests
        resp = requests.get(image_url, timeout=8)
        if resp.status_code != 200 or not resp.content:
            raise HTTPException(status_code=404, detail="Sin imagen disponible")
        jpeg = _compose_og_card(resp.content)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generando og-image de memorial: {e}")
        raise HTTPException(status_code=404, detail="Sin imagen disponible")

    return Response(
        content=jpeg,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.post("/{recuerdo_uuid}/rituals", response_model=mem_schemas.RitualStateResponse)
@limiter.limit("10/minute")
def create_ritual(
    request: Request,
    recuerdo_uuid: UUID,
    ritual_in: mem_schemas.RitualCreate,
    db: Session = Depends(get_db)
):
    """Registra un gesto del visitante (vela, flor, estrella, beso) y devuelve
    los contadores actualizados. Público y sin login, como las dedicatorias."""
    import hashlib
    from app.core.client_ip import get_client_ip
    from app.core.config import settings
    from app.utils import tz

    memorial = _load_memorial_scoped(db, recuerdo_uuid)
    if (memorial.es_privado
            or memorial.status != mem_models.MemorialStatus.active
            or (memorial.valid_until and memorial.valid_until < datetime.now())):
        raise HTTPException(status_code=403, detail="Este memorial no recibe rituales en este momento.")

    ip_hash = hashlib.sha256(f"{settings.SECRET_KEY}:{get_client_ip(request)}".encode()).hexdigest()
    recent = db.query(mem_models.Ritual).filter(
        mem_models.Ritual.id_recuerdo == memorial.id,
        mem_models.Ritual.ip_hash == ip_hash,
        mem_models.Ritual.created_at >= tz.get_now() - timedelta(hours=1),
    ).count()
    if recent >= _RITUALS_PER_IP_HOUR:
        raise HTTPException(status_code=429, detail="Gracias por tanto cariño. Intenta de nuevo más tarde.")

    name = None
    if ritual_in.kind == mem_models.RitualKind.estrella and ritual_in.name:
        name = (sanitize_text(ritual_in.name) or "").strip()[:40] or None

    db.add(mem_models.Ritual(
        id_recuerdo=memorial.id,
        kind=ritual_in.kind.value,
        name=name,
        ip_hash=ip_hash,
    ))
    db.commit()

    # Sin correo a la familia por cada gesto (decisión: no cargar el servidor ni llenar su bandeja)
    return _ritual_state(memorial.id, db)


def _check_message_length(db: Session, memorial: mem_models.Memorial, text: str) -> None:
    from app.services import memorial_plans
    max_chars = memorial_plans.limits(db, memorial)["max_dedication_chars"]
    if len((text or "").strip()) > max_chars:
        raise HTTPException(status_code=400, detail=f"El mensaje puede tener hasta {max_chars} caracteres.")


def _family_memorial(db: Session, recuerdo_uuid: UUID, request: Request) -> mem_models.Memorial:
    """Memorial de la gestión familiar, autenticado con su PIN (cabecera access-key)."""
    memorial = _load_memorial_scoped(db, recuerdo_uuid, with_dedications=True)
    access_key = (request.headers.get("access-key") or "").strip()
    if not memorial.access_key or memorial.access_key.strip() != access_key:
        raise HTTPException(status_code=401, detail="No autorizado.")
    return memorial


@router.get("/{recuerdo_uuid}/manage/melodies")
def family_melody_options(recuerdo_uuid: UUID, request: Request, db: Session = Depends(get_db)):
    """Melodías de la biblioteca + las guardadas por la familia (planes Vinzer)."""
    from app.services import memorial_plans
    memorial = _family_memorial(db, recuerdo_uuid, request)
    from app.core.tenant_context import apply_bypass_rls
    apply_bypass_rls(db)
    cfg = (memorial.diseno or {}).get(melodies.DISENO_KEY) or {}
    return {
        "enabled": memorial_plans.is_vinzer(db, memorial),
        "max": memorial_plans.limits(db, memorial)["max_melodies"],
        "favorites": melodies.favorite_ids(memorial.diseno),
        "media_id": cfg.get("media_id") if isinstance(cfg, dict) else None,
        "activa": bool(cfg.get("activa")) if isinstance(cfg, dict) else False,
        "melodies": melodies.list_melodies(db),
    }


@router.put("/{recuerdo_uuid}/manage/melody", response_model=mem_schemas.MemorialManageResponse)
@limiter.limit("30/minute")
def family_set_melody(
    request: Request,
    recuerdo_uuid: UUID,
    body: mem_schemas.FamilyMelodyUpdate,
    db: Session = Depends(get_db),
):
    """La familia de un memorial Vinzer guarda hasta N melodías (según su plan) y elige cuál suena.
    En los memoriales de crematorios la melodía la sigue eligiendo el crematorio."""
    from app.services import memorial_plans
    memorial = _family_memorial(db, recuerdo_uuid, request)
    if not memorial_plans.is_vinzer(db, memorial):
        raise HTTPException(status_code=403, detail="La melodía de este memorial la elige el crematorio.")
    max_m = memorial_plans.limits(db, memorial)["max_melodies"]
    favs: list[int] = []
    for i in body.favorites + ([body.media_id] if body.media_id else []):
        if i not in favs:
            favs.append(i)
    if len(favs) > max_m:
        raise HTTPException(status_code=400, detail=f"Tu plan permite guardar hasta {max_m} melodía{'s' if max_m != 1 else ''}.")
    from app.core.tenant_context import apply_bypass_rls, apply_tenant_rls
    apply_bypass_rls(db)
    for i in favs:
        if not melodies.get_melody(db, i):
            raise HTTPException(status_code=404, detail="Una de las melodías ya no está disponible.")
    apply_tenant_rls(db, memorial.id_tenant)
    value = ({"media_id": body.media_id, "activa": bool(body.activa), "favoritas": favs} if body.media_id
             else ({"media_id": None, "activa": False, "favoritas": favs} if favs else None))
    memorial.diseno = merge_diseno(memorial.diseno, {melodies.DISENO_KEY: value})
    db.commit()
    db.refresh(memorial)
    memorial.lista_imagenes = [normalize_image_url(img) for img in (memorial.lista_imagenes or [])]
    memorial.main_image_url = normalize_image_url(memorial.main_image_url)
    return _apply_memorial_limit(memorial, db)


# ---------------- Línea de tiempo (Eterno / Infinito) ----------------

def _upload_timeline_photo(db: Session, memorial: mem_models.Memorial, file: UploadFile) -> str:
    """Foto propia del momento (no cuenta para la galería). WebP optimizado, proporción original."""
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(400, "La foto debe ser una imagen.")
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, f"{uuid4()}_{os.path.basename(file.filename or 'foto')}")
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    try:
        pet = memorial.pet.name if memorial.pet else "Mascota"
        item = MediaService.upload_media(
            db=db, local_path=temp_path, media_type="image", category="recuerdos", ratio="original",
            description=f"Momento de la línea de tiempo de {pet}", alt_text=f"Momento de {pet}",
            processing_mode="optimized", custom_prefix="timeline", tenant_id=memorial.id_tenant,
        )
        return normalize_image_url(item.url)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def _drop_timeline_photo(db: Session, url: str | None) -> None:
    if not url:
        return
    try:
        MediaService.delete_media_by_url(db, url)
    except Exception as e:  # noqa: BLE001 — el momento se borra igual
        import logging
        logging.getLogger(__name__).warning("No se pudo borrar la foto del momento: %s", e)


def _timeline_out(db: Session, memorial: mem_models.Memorial) -> dict:
    from app.services import memorial_timeline as tl
    enabled, cap = tl.settings(db, memorial)
    return {"enabled": enabled, "max": cap, "max_text": tl.MAX_TEXT, "max_title": tl.MAX_TITLE,
            "moments": [tl.serialize(m) for m in tl.moments(db, memorial.id)]}


@router.get("/{recuerdo_uuid}/manage/timeline")
def family_timeline(recuerdo_uuid: UUID, request: Request, db: Session = Depends(get_db)):
    memorial = _family_memorial(db, recuerdo_uuid, request)
    return _timeline_out(db, memorial)


@router.post("/{recuerdo_uuid}/manage/timeline")
@limiter.limit("30/minute")
def add_timeline_moment(
    recuerdo_uuid: UUID,
    request: Request,
    titulo: str = Form(...),
    texto: str | None = Form(None),
    fecha: str | None = Form(None),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    from app.services import memorial_timeline as tl
    memorial = _family_memorial(db, recuerdo_uuid, request)
    tl.check_can_add(db, memorial)
    data = tl.clean(titulo, texto, fecha)
    image_url = _upload_timeline_photo(db, memorial, file) if file and file.filename else None
    db.add(mem_models.TimelineMoment(id_recuerdo=memorial.id, image_url=image_url, **data))
    db.commit()
    return _timeline_out(db, memorial)


@router.patch("/{recuerdo_uuid}/manage/timeline/{moment_id}")
@limiter.limit("60/minute")
def update_timeline_moment(
    recuerdo_uuid: UUID,
    moment_id: int,
    request: Request,
    titulo: str = Form(...),
    texto: str | None = Form(None),
    fecha: str | None = Form(None),
    remove_photo: bool = Form(False),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    from app.services import memorial_timeline as tl
    memorial = _family_memorial(db, recuerdo_uuid, request)
    m = db.query(mem_models.TimelineMoment).filter(
        mem_models.TimelineMoment.id == moment_id, mem_models.TimelineMoment.id_recuerdo == memorial.id).first()
    if not m:
        raise HTTPException(404, "Momento no encontrado.")
    data = tl.clean(titulo, texto, fecha)
    m.titulo, m.texto, m.fecha = data["titulo"], data["texto"], data["fecha"]
    old = m.image_url
    if file and file.filename:
        m.image_url = _upload_timeline_photo(db, memorial, file)
    elif remove_photo:
        m.image_url = None
    db.commit()
    if old and old != m.image_url:
        _drop_timeline_photo(db, old)
        db.commit()
    return _timeline_out(db, memorial)


@router.delete("/{recuerdo_uuid}/manage/timeline/{moment_id}")
def delete_timeline_moment(recuerdo_uuid: UUID, moment_id: int, request: Request, db: Session = Depends(get_db)):
    memorial = _family_memorial(db, recuerdo_uuid, request)
    m = db.query(mem_models.TimelineMoment).filter(
        mem_models.TimelineMoment.id == moment_id, mem_models.TimelineMoment.id_recuerdo == memorial.id).first()
    if not m:
        raise HTTPException(404, "Momento no encontrado.")
    url = m.image_url
    db.delete(m)
    db.commit()
    _drop_timeline_photo(db, url)
    db.commit()
    return _timeline_out(db, memorial)


@router.post("/{recuerdo_uuid}/manage/upgrade-request")
@limiter.limit("5/hour")
def family_upgrade_request(
    recuerdo_uuid: UUID,
    body: mem_schemas.UpgradeRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """La familia pide mejorar el plan (p. ej. memorial de cortesía Partner → Eterno).
    Avisa al SuperAdmin; el pago y el cambio de plan se hacen desde Admin."""
    from app.services import memorial_upgrade
    memorial = _family_memorial(db, recuerdo_uuid, request)
    out = memorial_upgrade.request_upgrade(db, memorial, body.plan)
    if not out["duplicated"]:
        background_tasks.add_task(memorial_upgrade.notify_admin_in_background, memorial.id, body.plan.strip().lower())
    return out


# ---------------- Video y voz (Infinito) ----------------

def _media_out(db: Session, memorial: mem_models.Memorial) -> dict:
    from app.services import memorial_media as mm
    c = mm.caps(db, memorial)
    rows = [mm.serialize(r) for r in mm.items(db, memorial.id)]
    return {"max_videos": c[mm.KIND_VIDEO], "max_voice": c[mm.KIND_VOICE], "max_seconds": mm.MAX_SECONDS,
            "videos": [r for r in rows if r["kind"] == mm.KIND_VIDEO],
            "voices": [r for r in rows if r["kind"] == mm.KIND_VOICE]}


@router.get("/{recuerdo_uuid}/manage/media")
def family_media(recuerdo_uuid: UUID, request: Request, db: Session = Depends(get_db)):
    memorial = _family_memorial(db, recuerdo_uuid, request)
    return _media_out(db, memorial)


@router.post("/{recuerdo_uuid}/manage/media")
@limiter.limit("10/minute")
def add_family_media(
    recuerdo_uuid: UUID,
    request: Request,
    kind: str = Form(...),
    titulo: str | None = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    from app.services import memorial_media as mm
    memorial = _family_memorial(db, recuerdo_uuid, request)
    mm.add(db, memorial, kind, file, titulo)
    return _media_out(db, memorial)


@router.delete("/{recuerdo_uuid}/manage/media/{media_id}")
def delete_family_media(recuerdo_uuid: UUID, media_id: int, request: Request, db: Session = Depends(get_db)):
    from app.services import memorial_media as mm
    memorial = _family_memorial(db, recuerdo_uuid, request)
    row = db.query(mem_models.MemorialMedia).filter(
        mem_models.MemorialMedia.id == media_id, mem_models.MemorialMedia.id_recuerdo == memorial.id).first()
    if not row:
        raise HTTPException(404, "Archivo no encontrado.")
    mm.remove(db, row)
    return _media_out(db, memorial)


@router.post("/{recuerdo_uuid}/dedicatorias", response_model=mem_schemas.DedicationResponse)
def create_dedication(
    recuerdo_uuid: UUID,
    dedication_in: mem_schemas.DedicationCreate,
    db: Session = Depends(get_db)
):
    memorial = db.query(mem_models.Memorial).options(
        joinedload(mem_models.Memorial.tenant).joinedload(models.Tenant.subscription_plan)
    ).filter(mem_models.Memorial.id_recuerdo == recuerdo_uuid).first()
    
    if not memorial:
        raise HTTPException(status_code=404, detail="Memorial no encontrado.")

    # Mensajes que permite el plan del memorial (Partner 20, Recuerdo 30, Eterno 50, Infinito 100)
    max_dedications = _get_memorial_limit(memorial, db)
    
    approved_count = db.query(mem_models.Dedication).filter(
        mem_models.Dedication.id_recuerdo == memorial.id,
        (mem_models.Dedication.estado == mem_models.DedicationStatus.aprobado) | 
        (mem_models.Dedication.estado == mem_models.DedicationStatus.pendiente)
    ).count()
    
    if approved_count >= max_dedications:
        raise HTTPException(
            status_code=400,
            detail=f"Este memorial ha alcanzado el límite máximo de {max_dedications} comentarios."
        )
    _check_message_length(db, memorial, dedication_in.mensaje)
    from app.services import memorial_expiry
    if memorial_expiry.is_expired(memorial):
        raise HTTPException(status_code=400, detail="El periodo de este memorial venció: por ahora no recibe mensajes nuevos.")
    # La familia puede elegir publicar los mensajes sin revisarlos (gestión → «Publicar automáticamente»)
    auto_publish = (memorial.diseno or {}).get(AUTO_PUBLISH_KEY) is True
    db_dedication = mem_models.Dedication(
        id_recuerdo=memorial.id,
        mensajero=sanitize_text(dedication_in.mensajero) or dedication_in.mensajero,
        mensaje=sanitize_text(dedication_in.mensaje) or dedication_in.mensaje,
        estado=mem_models.DedicationStatus.aprobado if auto_publish else mem_models.DedicationStatus.pendiente
    )
    db.add(db_dedication)
    db.commit()
    db.refresh(db_dedication)

    return db_dedication

@router.post("/{recuerdo_uuid}/login", response_model=mem_schemas.MemorialManageResponse)
@limiter.limit("20/minute")
def login_memorial(
    request: Request,
    recuerdo_uuid: UUID,
    login_in: mem_schemas.PinLoginRequest,
    db: Session = Depends(get_db)
):
    memorial = _load_memorial_scoped(db, recuerdo_uuid, with_dedications=True)

    if not memorial.access_key:
        memorial.access_key = get_random_pin()
        db.commit()
        db.refresh(memorial)

    entered_pin = (login_in.pin or "").strip()
    stored_pin = (memorial.access_key or "").strip()

    if not stored_pin or entered_pin != stored_pin:
        raise HTTPException(
            status_code=401,
            detail=f"Clave de acceso incorrecta. Verifica el PIN de {len(stored_pin)} dígitos asignado en el panel del crematorio."
        )

    # Normalize before returning
    memorial.lista_imagenes = [normalize_image_url(img) for img in (memorial.lista_imagenes or [])]
    memorial.main_image_url = normalize_image_url(memorial.main_image_url)

    return _apply_memorial_limit(memorial, db)

@router.patch("/{recuerdo_uuid}/manage", response_model=mem_schemas.MemorialManageResponse)
def update_memorial_settings(
    recuerdo_uuid: UUID,
    memorial_up: mem_schemas.MemorialUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    access_key = (request.headers.get("access-key") or "").strip()
    memorial = _load_memorial_scoped(db, recuerdo_uuid, with_dedications=True)

    if not memorial.access_key:
        memorial.access_key = get_random_pin()
        db.commit()
        db.refresh(memorial)

    from app.core.client_ip import get_client_ip
    client_ip = get_client_ip(request)
    if (memorial.access_key or "").strip() != access_key:
        # PIN errado: límite estricto (5/min por IP) contra adivinar el PIN
        _check_rate_limit(f"pin:{client_ip}")
        raise HTTPException(status_code=401, detail="No autorizado.")

    # PIN correcto: la página guarda sola en cada cambio de diseño, así que el límite es amplio
    _check_rate_limit(f"manage:{recuerdo_uuid}:{client_ip}", _MANAGE_SAVES_MAX)

    update_data = memorial_up.model_dump(exclude_unset=True)

    # Actualizar correo del cliente o fecha de fallecimiento si se proveen
    if "customer_email" in update_data and update_data["customer_email"] is not None:
        new_email = str(update_data.pop("customer_email")).strip()
        if memorial.pet and memorial.pet.customer:
            memorial.pet.customer.email = new_email

    if "death_date" in update_data and update_data["death_date"] is not None:
        new_dd = update_data.pop("death_date")
        if memorial.pet:
            memorial.pet.death_date = new_dd

    # Sanitize msg_despedida if provided
    if "msg_despedida" in update_data and update_data["msg_despedida"] is not None:
        update_data["msg_despedida"] = sanitize_text(update_data["msg_despedida"])
    
    # 1. Image Limit Enforcement for main_image_url
    if "main_image_url" in update_data:
        limit = _get_memorial_img_limit(memorial, db)
        allowed_pet_images = [normalize_image_url(img) for img in (memorial.pet.images or [])[:limit]] if memorial.pet else []
        raw_pet_images = (memorial.pet.images or [])[:limit] if memorial.pet else []
        allowed_mem_images = [normalize_image_url(img) for img in (memorial.lista_imagenes or [])]
        raw_mem_images = memorial.lista_imagenes or []
        
        all_allowed = set(allowed_pet_images + raw_pet_images + allowed_mem_images + raw_mem_images)
        if memorial.pet and memorial.pet.image_url:
            all_allowed.add(memorial.pet.image_url)
            all_allowed.add(normalize_image_url(memorial.pet.image_url))
        
        if update_data["main_image_url"] and update_data["main_image_url"] not in all_allowed:
            if memorial.pet and update_data["main_image_url"] in (memorial.pet.images or []):
                raise HTTPException(
                    status_code=400, 
                    detail=f"La imagen seleccionada de la mascota excede el límite de su plan ({limit})."
                )
            raise HTTPException(
                status_code=400,
                detail="La imagen seleccionada no es válida o no pertenece a este memorial."
            )

    # El diseño se combina: la familia solo envía sus claves y no debe borrar
    # las que fijó el crematorio/admin (ni viceversa).
    if "diseno" in update_data:
        # La melodía es solo del crematorio (PUT /{uuid}/melody): aquí se ignora.
        incoming = {k: v for k, v in (update_data["diseno"] or {}).items() if k != melodies.DISENO_KEY}
        # Solo los escenarios que incluye el plan del memorial (Admin → Memoriales → Planes)
        from app.services import memorial_plans
        memorial_plans.check_scenario(db, memorial, incoming.get("tipo_diseno"))
        update_data["diseno"] = merge_diseno(memorial.diseno, incoming)

    for key, value in update_data.items():
        setattr(memorial, key, value)

    # --- Sync pet images to lista_imagenes on every save ---
    if memorial.pet:
        img_limit = _get_memorial_img_limit(memorial, db)
        pet_images = [normalize_image_url(img) for img in (memorial.pet.images or [])][:img_limit]

        # Identify custom uploaded images (not from pet gallery) to preserve them
        raw_pet_images = set(memorial.pet.images or [])
        custom_uploaded = [
            img for img in (memorial.lista_imagenes or [])
            if img not in raw_pet_images and normalize_image_url(img) not in [normalize_image_url(p) for p in raw_pet_images]
        ]

        memorial.lista_imagenes = pet_images + custom_uploaded

        # Refresh main_image_url if not explicitly set in this request
        if "main_image_url" not in update_data:
            if not memorial.main_image_url or memorial.main_image_url not in memorial.lista_imagenes:
                memorial.main_image_url = normalize_image_url(memorial.pet.image_url)

    db.commit()
    db.refresh(memorial)

    # Normalize before returning
    memorial.lista_imagenes = [normalize_image_url(img) for img in (memorial.lista_imagenes or [])]
    memorial.main_image_url = normalize_image_url(memorial.main_image_url)
    
    return _apply_memorial_limit(memorial, db)

@router.get("/{recuerdo_uuid}/manage", response_model=mem_schemas.MemorialManageResponse)
def get_memorial_settings(
    recuerdo_uuid: UUID,
    request: Request,
    db: Session = Depends(get_db)
):
    access_key = (request.headers.get("access-key") or "").strip()
    memorial = _load_memorial_scoped(db, recuerdo_uuid, with_dedications=True)

    if not memorial.access_key:
        memorial.access_key = get_random_pin()
        db.commit()
        db.refresh(memorial)

    if (memorial.access_key or "").strip() != access_key:
        raise HTTPException(status_code=401, detail="No autorizado.")

    # Normalize before returning
    memorial.lista_imagenes = [normalize_image_url(img) for img in (memorial.lista_imagenes or [])]
    memorial.main_image_url = normalize_image_url(memorial.main_image_url)

    return _apply_memorial_limit(memorial, db)

@router.post("/{recuerdo_uuid}/reset-pin", response_model=mem_schemas.MemorialManageResponse)
def reset_memorial_pin(
    recuerdo_uuid: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Permite al crematorio dueño regenerar o verificar el PIN de acceso del memorial."""
    memorial = db.query(mem_models.Memorial).options(
        joinedload(mem_models.Memorial.pet),
        joinedload(mem_models.Memorial.tenant).joinedload(models.Tenant.subscription_plan),
        joinedload(mem_models.Memorial.dedications),
    ).filter(
        mem_models.Memorial.id_recuerdo == recuerdo_uuid,
        mem_models.Memorial.id_tenant == current_user.tenant_id
    ).first()

    if not memorial:
        raise HTTPException(status_code=404, detail="Memorial no encontrado o no pertenece a su cuenta.")

    memorial.access_key = get_random_pin()
    db.commit()
    db.refresh(memorial)

    memorial.lista_imagenes = [normalize_image_url(img) for img in (memorial.lista_imagenes or [])]
    memorial.main_image_url = normalize_image_url(memorial.main_image_url)

    return _apply_memorial_limit(memorial, db)

@router.patch("/dedications/{dedication_id}", response_model=mem_schemas.DedicationResponse)
def update_dedication(
    dedication_id: int,
    dedication_up: mem_schemas.DedicationUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    access_key = (request.headers.get("access-key") or "").strip()
    dedication = db.query(mem_models.Dedication).join(mem_models.Memorial).filter(
        mem_models.Dedication.id_dedicatoria == dedication_id
    ).first()
    
    if not dedication:
        raise HTTPException(status_code=404, detail="Dedicatoria no encontrada.")
        
    if (dedication.memorial.access_key or "").strip() != access_key:
        raise HTTPException(status_code=401, detail="No autorizado.")

    update_data = dedication_up.model_dump(exclude_unset=True)
    if update_data.get("mensaje"):
        _check_message_length(db, dedication.memorial, update_data["mensaje"])
    for key, value in update_data.items():
        if key == "estado":
            setattr(dedication, "estado", value)
        else:
            setattr(dedication, key, value)
            
    db.commit()
    db.refresh(dedication)
    return dedication

@router.delete("/dedications/{dedication_id}")
def delete_dedication(
    dedication_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    access_key = (request.headers.get("access-key") or "").strip()
    dedication = db.query(mem_models.Dedication).join(mem_models.Memorial).filter(
        mem_models.Dedication.id_dedicatoria == dedication_id
    ).first()
    
    if not dedication:
        raise HTTPException(status_code=404, detail="Dedicatoria no encontrada.")
        
    if (dedication.memorial.access_key or "").strip() != access_key:
        raise HTTPException(status_code=401, detail="No autorizado.")

    db.delete(dedication)
    db.commit()
    return {"message": "Dedicatoria eliminada correctamente"}

@router.post("/{recuerdo_uuid}/images", response_model=mem_schemas.MemorialManageResponse)
async def upload_memorial_image(
    recuerdo_uuid: UUID,
    file: UploadFile = File(...),
    request: Request = None,
    db: Session = Depends(get_db)
):
    access_key = (request.headers.get("access-key") or "").strip()
    memorial = _load_memorial_scoped(db, recuerdo_uuid)

    if (memorial.access_key or "").strip() != access_key:
        raise HTTPException(status_code=401, detail="No autorizado.")

    # Check Plan limits
    limit = _get_memorial_img_limit(memorial, db)
    current_images = memorial.lista_imagenes or []
    if len(current_images) >= limit:
        raise HTTPException(
            status_code=400, 
            detail=f"Ha alcanzado el límite de imágenes para su plan ({limit})."
        )

    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, f"{uuid4()}_{file.filename}")
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        def slugify(text):
            import re
            text = text.lower()
            return re.sub(r'[\W_]+', '_', text)

        pet_name = slugify(memorial.pet.name) if memorial.pet else "pet"
        
        # Upload using MediaService (enforces 1:1 and 1024x1024)
        media_item = MediaService.upload_media(
            db=db,
            local_path=temp_path,
            media_type="image",
            category="recuerdos",
            ratio="1:1",
            description=f"Imagen para memorial de {memorial.pet.name if memorial.pet else 'Mascota'}",
            alt_text=f"Foto memorial {memorial.pet.name if memorial.pet else 'Mascota'}",
            processing_mode="optimized",
            custom_prefix=pet_name,
            tenant_id=memorial.id_tenant
        )

        # Update Memorial logic
        if memorial.lista_imagenes is None:
            memorial.lista_imagenes = []
        
        new_list = [normalize_image_url(img) for img in (memorial.lista_imagenes or [])]
        new_list.append(normalize_image_url(media_item.url))
        memorial.lista_imagenes = new_list

        if not memorial.main_image_url:
            memorial.main_image_url = normalize_image_url(media_item.url)
        else:
            memorial.main_image_url = normalize_image_url(memorial.main_image_url)

        db.commit()
        db.refresh(memorial)
        
        memorial.lista_imagenes = [normalize_image_url(img) for img in (memorial.lista_imagenes or [])]
        memorial.main_image_url = normalize_image_url(memorial.main_image_url)
        
        return _apply_memorial_limit(memorial, db)

    except Exception as e:
        if os.path.exists(temp_path): os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path): os.remove(temp_path)

@router.delete("/{recuerdo_uuid}/images", response_model=mem_schemas.MemorialManageResponse)
def delete_memorial_image(
    recuerdo_uuid: UUID,
    url: str,
    request: Request,
    db: Session = Depends(get_db)
):
    access_key = (request.headers.get("access-key") or "").strip()
    memorial = _load_memorial_scoped(db, recuerdo_uuid)

    if (memorial.access_key or "").strip() != access_key:
        raise HTTPException(status_code=401, detail="No autorizado.")

    current_images = list(memorial.lista_imagenes or [])
    if url in current_images:
        current_images.remove(url)
        memorial.lista_imagenes = current_images
    else:
        raise HTTPException(status_code=404, detail="Imagen no encontrada en el memorial.")
    
    if memorial.main_image_url == url:
        memorial.main_image_url = current_images[0] if current_images else None

    from app.api.internal.common.models import MediaLibrary
    
    media_item = db.query(MediaLibrary).filter(MediaLibrary.url == url).first()
    if media_item:
        MediaService.delete_media(db, media_item)
    else:
        MediaService.delete_media_by_url(db, url)

    db.commit()
    db.refresh(memorial)

    memorial.lista_imagenes = [normalize_image_url(img) for img in (memorial.lista_imagenes or [])]
    memorial.main_image_url = normalize_image_url(memorial.main_image_url)
    
    return _apply_memorial_limit(memorial, db)


@router.post("/{recuerdo_uuid}/send-credentials")
async def send_credentials_endpoint(
    recuerdo_uuid: UUID,
    payload: mem_schemas.SendCredentialsRequest = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Reenvía a la familia el correo con las credenciales, link y PIN del memorial."""
    memorial = db.query(mem_models.Memorial).filter(
        mem_models.Memorial.id_recuerdo == recuerdo_uuid
    ).first()
    if not memorial:
        raise HTTPException(status_code=404, detail="Memorial no encontrado.")

    from app.services.memorial_notifications import send_memorial_welcome_email
    target_email = payload.email if payload and payload.email else None
    if current_user.role != "creator" and memorial.id_tenant != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Memorial no encontrado.")
    from app.core.tenant_context import apply_tenant_rls
    apply_tenant_rls(db, memorial.id_tenant)
    result = await send_memorial_welcome_email(db, memorial.id, to_email=target_email)
    if not result.get("sent"):
        raise HTTPException(
            status_code=400,
            detail=f"No se pudo enviar el correo: {result.get('reason', 'Verifica el correo del cliente')}"
        )
    return {"success": True, "email": result.get("email")}


@router.post("/cron/anniversaries")
async def trigger_anniversary_check(
    current_user: models.User = Depends(auth.get_current_creator),
    db: Session = Depends(get_db)
):
    """Revisa memoriales y envía recordatorios anuales de angelitos."""
    from app.services.memorial_notifications import check_and_send_anniversary_reminders
    result = await check_and_send_anniversary_reminders(db)
    return {"success": True, **result}
