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
    print(f"DEBUG: list_public_memorials called with limit={limit}")
    query = db.query(mem_models.Memorial).options(
        joinedload(mem_models.Memorial.pet),
        joinedload(mem_models.Memorial.tenant)
    ).filter(
        mem_models.Memorial.es_privado == False,
        mem_models.Memorial.status == mem_models.MemorialStatus.active
    ).order_by(mem_models.Memorial.fecha.desc())
    
    memorials = query.limit(limit).all()
    print(f"DEBUG: Found {len(memorials)} public memorials")
    for m in memorials:
        print(f"DEBUG: Memorial ID={m.id_recuerdo} Pet={m.pet.name if m.pet else 'None'}")
    
    return [
        mem_schemas.MemorialCardResponse(
            id_recuerdo=m.id_recuerdo,
            pet_name=m.pet.name if m.pet else "Mascota",
            pet_image_url=normalize_image_url(m.main_image_url or (m.pet.image_url if m.pet else None)),
            pet_birth_date=m.pet.birth_date if m.pet else None,
            pet_death_date=m.pet.death_date if m.pet else None,
            tenant_name=m.tenant.name if m.tenant else "Empresa"
        )
        for m in memorials
    ]

def _get_memorial_limit(memorial: mem_models.Memorial, db: Session) -> int:
    # 1. Check if linked to a specific plan
    if memorial.memorial_plan:
         features = memorial.memorial_plan.features or {}
         return features.get("velas", features.get("max_dedications", 0))
    
    # 2. Fallback to name matching in MemorialPlan (legacy support)
    plan_name = memorial.plan or (memorial.tenant.subscription_plan.name if memorial.tenant and memorial.tenant.subscription_plan else "FREE")
    
    # Map common names to name_db
    pn = plan_name.upper().strip()
    db_name = None
    if "HUELLA" in pn or "NORMAL" in pn: db_name = "normal"
    elif "VINCULO" in pn or "VÍNCULO" in pn or "PRO" in pn: db_name = "pro"
    elif "PARAISO" in pn or "PARAÍSO" in pn or "ULTRA" in pn: db_name = "ultra"
    elif "RECUERDO" in pn or "FREE" in pn: db_name = "free"
    
    if db_name:
         m_plan = db.query(mem_models.MemorialPlan).filter(mem_models.MemorialPlan.name_db == db_name).first()
         if m_plan:
              features = m_plan.features or {}
              return features.get("velas", features.get("max_dedications", 0))
              
    # 3. Hardcoded Fallback (only if DB lookup fails)
    if "ULTRA" in pn or "PARAISO" in pn: return 33
    if "PRO" in pn or "VINCULO" in pn: return 21
    if "NORMAL" in pn or "HUELLA" in pn: return 9
    return 0

def _get_memorial_img_limit(memorial: mem_models.Memorial, db: Session) -> int:
    # 1. Check if linked to a specific plan (MemorialPlan in DB)
    print(f"[LIMIT DEBUG] memorial_plan={memorial.memorial_plan}, memorial.plan={memorial.plan!r}")
    if memorial.memorial_plan:
         features = memorial.memorial_plan.features or {}
         result = features.get("max_images", 3)
         print(f"[LIMIT DEBUG] -> via memorial_plan features={features}, returns {result}")
         return result
    
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
    print(f"[LIMIT DEBUG] tenant_sub_plan={tenant_sub_plan!r}, tenant_legacy_plan={tenant_legacy_plan!r}, final plan_name={plan_name!r}, pn={pn!r}")

    # Plan Tier mapping: ULTRA/PARAISO=5, PRO/VINCULO=3, NORMAL/HUELLA=2, FREE/RECUERDO=1
    if "ULTRA" in pn or "PARAISO" in pn: return 5
    if "PRO" in pn or "VINCULO" in pn: return 3
    if "NORMAL" in pn or "HUELLA" in pn: return 2
    if "RECUERDO" in pn or "FREE" in pn: return 1
    return 3 # Default to PRO/VINCULO tier


def _apply_memorial_limit(memorial: mem_models.Memorial, db: Session):
    limit = _get_memorial_limit(memorial, db)
    setattr(memorial, "dedication_limit", limit)
    
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
            
    return memorial

@router.post("", response_model=mem_schemas.MemorialManageResponse)
def create_memorial(
    memorial_in: mem_schemas.MemorialCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # 1. Restricción por feature flag del plan (configurable desde admin -> Planes
    #    -> "Configurar Características"). Reemplaza el antiguo candado por nombre de plan.
    tenant = current_user.tenant
    # Para control de acceso (features/límites) usamos effective_plan: respeta el
    # plan demo si está vigente, igual que check_permission. La facturación sigue
    # usando subscription_plan en otro lado.
    plan = (tenant.effective_plan if tenant else None) or (tenant.subscription_plan if tenant else None)
    # Nombre del plan para los límites/snapshot (con fallbacks: plan efectivo ->
    # plan legacy del tenant -> FREE). Necesario más abajo (límite de imágenes).
    plan_name = (plan.name if plan else None) or (tenant.plan if tenant else None) or "FREE"
    features = plan.features if plan and isinstance(plan.features, dict) else {}
    if not features.get("mascotas:memorial", False):
        raise HTTPException(
            status_code=403,
            detail="Tu plan no incluye la función de memoriales. Actívala desde la configuración del plan."
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
        return db.query(mem_models.Memorial).options(
            joinedload(mem_models.Memorial.pet),
            joinedload(mem_models.Memorial.tenant)
        ).filter(mem_models.Memorial.id == existing.id).first()

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
        joinedload(mem_models.Memorial.tenant)
    ).filter(mem_models.Memorial.id == db_memorial.id).first()
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

    # Allow viewing if it's the owner (logic needed), but for public view:
    # If expired, we might want to return it BUT the frontend handles the "Expired" view?
    # Or should we block it? 
    # User said: "Si valid_until < now(): Mostrar Memorial Expirado".
    # So we MUST return the valid object so the frontend knows it exists but is expired.
    
    # We only block if 'archived' (deleted/banned).
    if memorial.status == mem_models.MemorialStatus.archived:
        raise HTTPException(status_code=403, detail="Este memorial ha sido archivado.")

    if memorial.es_privado:
        # Check if auth header or session logic allows (handled in frontend login usually)
        # But this endpoint is public. Private memorials need pin.
        # Logic for private is: if private, usually require header. 
        # But currrently it just raises 403.
        raise HTTPException(status_code=403, detail="Este memorial es privado.")

    # Normalize before returning
    memorial.lista_imagenes = [normalize_image_url(img) for img in (memorial.lista_imagenes or [])]
    memorial.main_image_url = normalize_image_url(memorial.main_image_url)

    return _apply_memorial_limit(memorial, db)

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

    # Check limits
    tenant_plan = memorial.tenant.subscription_plan.name if (memorial.tenant and memorial.tenant.subscription_plan) else "FREE"
    plan_name = memorial.plan or tenant_plan
    
    max_dedications = _get_memorial_limit(memorial, db)
    
    approved_count = db.query(mem_models.Dedication).filter(
        mem_models.Dedication.id_recuerdo == memorial.id,
        (mem_models.Dedication.estado == mem_models.DedicationStatus.aprobado) | 
        (mem_models.Dedication.estado == mem_models.DedicationStatus.pendiente)
    ).count()
    
    if approved_count >= max_dedications:
        raise HTTPException(
            status_code=400, 
            detail=f"Este memorial ha llegado al límite de dedicatorias ({max_dedications}). Plan: {plan_name}"
        )

    db_dedication = mem_models.Dedication(
        id_recuerdo=memorial.id,
        mensajero=dedication_in.mensajero,
        mensaje=dedication_in.mensaje,
        estado=mem_models.DedicationStatus.pendiente
    )
    db.add(db_dedication)
    db.commit()
    db.refresh(db_dedication)
    return db_dedication

@router.post("/{recuerdo_uuid}/login", response_model=mem_schemas.MemorialManageResponse)
def login_memorial(
    recuerdo_uuid: UUID,
    login_in: mem_schemas.PinLoginRequest,
    db: Session = Depends(get_db)
):
    memorial = _load_memorial_scoped(db, recuerdo_uuid, with_dedications=True)

    if memorial.access_key != login_in.pin:
        raise HTTPException(status_code=401, detail="Clave de acceso incorrecta.")

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
    access_key = request.headers.get("access-key")
    memorial = _load_memorial_scoped(db, recuerdo_uuid)

    if memorial.access_key != access_key:
        raise HTTPException(status_code=401, detail="No autorizado.")

    # Rate limiting per IP
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)

    update_data = memorial_up.model_dump(exclude_unset=True)

    # Sanitize msg_despedida if provided
    if "msg_despedida" in update_data and update_data["msg_despedida"] is not None:
        update_data["msg_despedida"] = sanitize_text(update_data["msg_despedida"])
    
    # 1. Image Limit Enforcement for main_image_url
    if "main_image_url" in update_data:
        limit = _get_memorial_img_limit(memorial, db)
        # Combined pool of allowed images:
        # 1. Pet's filtered gallery (first N)
        # 2. Memorial's custom uploaded list
        allowed_pet_images = (memorial.pet.images or [])[:limit] if memorial.pet else []
        allowed_mem_images = memorial.lista_imagenes or []
        
        all_allowed = set(allowed_pet_images + allowed_mem_images)
        
        if update_data["main_image_url"] and update_data["main_image_url"] not in all_allowed:
            # If the image exists in pet.images but was after the limit
            if memorial.pet and update_data["main_image_url"] in (memorial.pet.images or []):
                raise HTTPException(
                    status_code=400, 
                    detail=f"La imagen seleccionada de la mascota excede el límite de su plan ({limit})."
                )
            # For other images (like if they try to set a random external URL if we want to block that)
            # Actually, if it's not in our allowed sets, we block it for consistency
            raise HTTPException(
                status_code=400,
                detail="La imagen seleccionada no es válida o no pertenece a este memorial."
            )

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
    access_key = request.headers.get("access-key")
    memorial = _load_memorial_scoped(db, recuerdo_uuid, with_dedications=True)

    if memorial.access_key != access_key:
        raise HTTPException(status_code=401, detail="No autorizado.")

    # Normalize before returning
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
    access_key = request.headers.get("access-key")
    dedication = db.query(mem_models.Dedication).join(mem_models.Memorial).filter(
        mem_models.Dedication.id_dedicatoria == dedication_id
    ).first()
    
    if not dedication:
        raise HTTPException(status_code=404, detail="Dedicatoria no encontrada.")
        
    if dedication.memorial.access_key != access_key:
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
    access_key = request.headers.get("access-key")
    dedication = db.query(mem_models.Dedication).join(mem_models.Memorial).filter(
        mem_models.Dedication.id_dedicatoria == dedication_id
    ).first()
    
    if not dedication:
        raise HTTPException(status_code=404, detail="Dedicatoria no encontrada.")
        
    if dedication.memorial.access_key != access_key:
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
    access_key = request.headers.get("access-key")
    memorial = _load_memorial_scoped(db, recuerdo_uuid)

    if memorial.access_key != access_key:
        raise HTTPException(status_code=401, detail="No autorizado.")

    # Check Plan limits
    limit = _get_memorial_img_limit(memorial, db)
    current_images = memorial.lista_imagenes or []
    plan_display = memorial.plan or (memorial.tenant.subscription_plan.name if memorial.tenant and memorial.tenant.subscription_plan else None) or (memorial.tenant.plan if memorial.tenant else "FREE")
    print(f"[IMG UPLOAD] memorial.plan={memorial.plan!r}, tenant.sub_plan={memorial.tenant.subscription_plan.name if memorial.tenant and memorial.tenant.subscription_plan else None!r}, tenant.plan={memorial.tenant.plan if memorial.tenant else None!r} -> resolved={plan_display!r}, limit={limit}, current={len(current_images)}")
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
        
        # Guardar URL en la lista
        new_list = [normalize_image_url(img) for img in (memorial.lista_imagenes or [])]
        new_list.append(normalize_image_url(media_item.url))
        memorial.lista_imagenes = new_list

        # Si no tiene imagen principal, asignar esta
        if not memorial.main_image_url:
            memorial.main_image_url = normalize_image_url(media_item.url)
        else:
            memorial.main_image_url = normalize_image_url(memorial.main_image_url)

        db.commit()
        db.refresh(memorial)
        
        # Normalize response object
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
    access_key = request.headers.get("access-key")
    memorial = _load_memorial_scoped(db, recuerdo_uuid)

    if memorial.access_key != access_key:
        raise HTTPException(status_code=401, detail="No autorizado.")

    # 1. Remove from list in DB
    current_images = list(memorial.lista_imagenes or [])
    if url in current_images:
        current_images.remove(url)
        memorial.lista_imagenes = current_images
    else:
        # Check if the URL is correctly passed (Frontend might send full path)
        raise HTTPException(status_code=404, detail="Imagen no encontrada en el memorial.")
    
    # 2. If it was main image, reset to first available or None
    if memorial.main_image_url == url:
        memorial.main_image_url = current_images[0] if current_images else None

    # 3. Physically delete from storage (supports R2 and MediaLibrary)
    from app.api.internal.common.models import MediaLibrary
    
    media_item = db.query(MediaLibrary).filter(MediaLibrary.url == url).first()
    if media_item:
        MediaService.delete_media(db, media_item)
    else:
        # Legacy fallback
        MediaService.delete_media_by_url(db, url)

    db.commit()
    db.refresh(memorial)

    # Normalize before returning
    memorial.lista_imagenes = [normalize_image_url(img) for img in (memorial.lista_imagenes or [])]
    memorial.main_image_url = normalize_image_url(memorial.main_image_url)
    
    return _apply_memorial_limit(memorial, db)
