from fastapi import APIRouter, Depends, HTTPException, status, Request, File, UploadFile
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

def _check_rate_limit(client_ip: str):
    """Raises 429 if client exceeds 5 requests/minute."""
    now = time.time()
    timestamps = _rate_limit_store[client_ip]
    # Purge expired entries
    _rate_limit_store[client_ip] = [t for t in timestamps if now - t < _RATE_LIMIT_WINDOW]
    if len(_rate_limit_store[client_ip]) >= _RATE_LIMIT_MAX:
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
    
    memorials = query.limit(limit).all()
    
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


# Planes de la landing del memorial (USD, venta asistida). Sus límites se leen
# de rec_plans por name_db; los planes previos mantienen su mapeo heredado.
LANDING_MEMORIAL_PLANS = {"mensual", "anual", "eterno"}
MAX_MEMORIAL_DEDICATIONS = 20


def _is_pro_or_ultra_plan(plan_name: str | None) -> bool:
    pn = (plan_name or "").upper().strip()
    return any(k in pn for k in ("PRO", "ULTRA", "VINCULO", "VÍNCULO", "PARAISO", "PARAÍSO", "MENSUAL", "ANUAL", "ETERNO"))


def _landing_plan(memorial: mem_models.Memorial, db: Session):
    """rec_plans del plan Mensual/Anual/Eterno asignado al memorial, si aplica."""
    name = (memorial.plan or "").strip().lower()
    if name not in LANDING_MEMORIAL_PLANS:
        return None
    return db.query(mem_models.MemorialPlan).filter(mem_models.MemorialPlan.name_db == name).first()


def _get_memorial_limit(memorial: mem_models.Memorial, db: Session) -> int:
    """Tope máximo de comentarios/dedicatorias por memorial: máximo 20 comentarios."""
    if memorial.memorial_plan:
        features = memorial.memorial_plan.features or {}
        raw = features.get("velas", features.get("max_dedications", MAX_MEMORIAL_DEDICATIONS))
        return min(int(raw), MAX_MEMORIAL_DEDICATIONS) if raw else MAX_MEMORIAL_DEDICATIONS

    landing = _landing_plan(memorial, db)
    if landing:
        features = landing.features or {}
        raw = features.get("velas", features.get("max_dedications", MAX_MEMORIAL_DEDICATIONS))
        return min(int(raw), MAX_MEMORIAL_DEDICATIONS) if raw else MAX_MEMORIAL_DEDICATIONS

    plan_name = memorial.plan or (memorial.tenant.subscription_plan.name if memorial.tenant and memorial.tenant.subscription_plan else "PRO")
    if _is_pro_or_ultra_plan(plan_name):
        return MAX_MEMORIAL_DEDICATIONS

    pn = plan_name.upper().strip()
    if "NORMAL" in pn or "HUELLA" in pn:
        return min(9, MAX_MEMORIAL_DEDICATIONS)
    return MAX_MEMORIAL_DEDICATIONS

def _get_memorial_img_limit(memorial: mem_models.Memorial, db: Session) -> int:
    # 1. Check if linked to a specific plan (MemorialPlan in DB)
    if memorial.memorial_plan:
         features = memorial.memorial_plan.features or {}
         result = features.get("max_images", 3)
         return result

    # 1b. Planes Mensual / Anual / Eterno
    landing = _landing_plan(memorial, db)
    if landing:
         return (landing.features or {}).get("max_images", 3)

    # 2. Fallback to name matching (priority order):
    #    a) memorial.plan (snapshot at creation)
    #    b) tenant.subscription_plan.name (new subscription system)
    #    c) tenant.plan (deprecated legacy field, defaults to "FREE")
    tenant_sub_plan = (memorial.tenant.subscription_plan.name
                       if memorial.tenant and memorial.tenant.subscription_plan else None)
    tenant_legacy_plan = (memorial.tenant.plan
                          if memorial.tenant and memorial.tenant.plan else None)
    
    plan_name = memorial.plan or tenant_sub_plan or tenant_legacy_plan or "FREE"
    pn = plan_name.upper().strip()

    # Plan Tier mapping: ULTRA/PARAISO=5, PRO/VINCULO=3, NORMAL/HUELLA=2, FREE/RECUERDO=1
    if "ULTRA" in pn or "PARAISO" in pn: return 5
    if "PRO" in pn or "VINCULO" in pn: return 3
    if "NORMAL" in pn or "HUELLA" in pn: return 2
    if "RECUERDO" in pn or "FREE" in pn: return 1
    return 3 # Default to PRO/VINCULO tier


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
        media_item = db.query(MediaLibrary).filter(
            (MediaLibrary.url == portada_url) |
            (MediaLibrary.url.endswith("/" + filename))
        ).first()
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
        mem_models.Memorial.id_mascota == memorial_in.id_mascota
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

    # 5. Define image limits based on plan
    pn = plan_name.upper().strip()
    if "ULTRA" in pn or "PARAISO" in pn: img_limit = 5
    elif "NORMAL" in pn or "HUELLA" in pn: img_limit = 2
    elif "FREE" in pn or "RECUERDO" in pn: img_limit = 1
    else: img_limit = 3 # PRO/VINCULO default

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
    db.add(db_memorial)
    db.commit()
    db.refresh(db_memorial)
    
    # Re-fetch with joined loads to satisfy response model (computed properties)
    memorial = db.query(mem_models.Memorial).options(
        joinedload(mem_models.Memorial.pet),
        joinedload(mem_models.Memorial.tenant).joinedload(models.Tenant.subscription_plan),
        joinedload(mem_models.Memorial.dedications),
    ).filter(mem_models.Memorial.id == db_memorial.id).first()

    # Enviar credenciales a la familia si tiene email
    import asyncio
    from app.services.memorial_notifications import send_memorial_welcome_email
    try:
        asyncio.create_task(send_memorial_welcome_email(db, db_memorial.id))
    except Exception as _e:
        pass

    return _apply_memorial_limit(memorial, db)

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

    result = _apply_memorial_limit(memorial, db)
    # Al público solo se le entrega la melodía si el crematorio la dejó activa.
    if not (result.melody or {}).get("activa"):
        result.melody = None
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
@limiter.limit("20/minute")
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

    # Notificar a la familia por email (con cooldown anti-spam)
    import asyncio
    from app.services.memorial_notifications import send_candle_notification_email
    try:
        asyncio.create_task(send_candle_notification_email(
            db, memorial.id, ritual_in.kind.value, name
        ))
    except Exception:
        pass

    return _ritual_state(memorial.id, db)


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

    # Check limits (Tope máximo de 20 comentarios por memorial)
    max_dedications = min(_get_memorial_limit(memorial, db), MAX_MEMORIAL_DEDICATIONS)
    
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

    db_dedication = mem_models.Dedication(
        id_recuerdo=memorial.id,
        mensajero=sanitize_text(dedication_in.mensajero) or dedication_in.mensajero,
        mensaje=sanitize_text(dedication_in.mensaje) or dedication_in.mensaje,
        estado=mem_models.DedicationStatus.pendiente
    )
    db.add(db_dedication)
    db.commit()
    db.refresh(db_dedication)

    # Notificar a la familia por email sobre la nueva dedicatoria
    import asyncio
    from app.services.memorial_notifications import send_dedication_notification_email
    try:
        asyncio.create_task(send_dedication_notification_email(
            db, memorial.id, db_dedication.mensajero, db_dedication.mensaje
        ))
    except Exception:
        pass

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

    if (memorial.access_key or "").strip() != access_key:
        raise HTTPException(status_code=401, detail="No autorizado.")

    # Rate limiting per IP
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)

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
    result = await send_memorial_welcome_email(db, memorial.id, to_email=target_email)
    if not result.get("sent"):
        raise HTTPException(
            status_code=400,
            detail=f"No se pudo enviar el correo: {result.get('reason', 'Verifica el correo del cliente')}"
        )
    return {"success": True, "email": result.get("email")}


@router.post("/cron/anniversaries")
async def trigger_anniversary_check(
    db: Session = Depends(get_db)
):
    """Revisa memoriales y envía recordatorios anuales de angelitos."""
    from app.services.memorial_notifications import check_and_send_anniversary_reminders
    result = await check_and_send_anniversary_reminders(db)
    return {"success": True, **result}
