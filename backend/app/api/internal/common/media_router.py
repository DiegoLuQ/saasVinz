from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Body, Request
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_creator, get_token_from_request
from app.api.internal.common.media_service import MediaService
from app.api.internal.common.models import MediaLibrary, MediaCategory
import os
import re
import uuid

router = APIRouter(prefix="/media", tags=["Media Library"])


def _optional_creator(db: Session = Depends(get_db), token=Depends(get_token_from_request)):
    """SuperAdmin si hay sesión válida de creador; None en cualquier otro caso.
    Solo el listado lo usa: sin sesión se entregan únicamente recursos globales."""
    if not token:
        return None
    try:
        return get_current_creator(db, token)
    except HTTPException:
        return None


def _slugify_category_key(text: str) -> str:
    """Convierte un label en un slug técnico ASCII para usar como `key`."""
    import unicodedata
    normalized = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "_", normalized.lower()).strip("_")
    return slug[:50]

@router.post("/upload")
async def upload_media(
    current_creator=Depends(get_current_creator),
    file: UploadFile = File(...),
    category: str = Form("gallery"),
    ratio: str = Form("original"),
    description: str = Form(None),
    alt_text: str = Form(None),
    processing_mode: str = Form("optimized"),
    db: Session = Depends(get_db)
):
    # Guardar archivo temporalmente
    temp_dir = "temp_uploads"
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
        
    ext = os.path.splitext(file.filename)[1]
    temp_filename = f"{uuid.uuid4()}{ext}"
    temp_path = os.path.join(temp_dir, temp_filename)
    
    with open(temp_path, "wb") as f:
        f.write(await file.read())
        
    # Identificar tipo
    ext_clean = ext.lower()
    image_exts = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"]
    video_exts = [".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"]

    if ext_clean in image_exts:
        media_type = "image"
    elif ext_clean in video_exts:
        media_type = "video"
    else:
        os.remove(temp_path)
        raise HTTPException(status_code=400, detail=f"Unsupported file format '{ext}'")

    try:
        media_item = MediaService.upload_media(
            db=db,
            local_path=temp_path,
            media_type=media_type,
            category=category,
            ratio=ratio,
            description=description,
            alt_text=alt_text,
            processing_mode=processing_mode
            # Biblioteca de medios del SuperAdmin = GLOBAL (sin tenant_id):
            # este router lo usa el panel admin, que no tiene tenant en contexto.
            # Las subidas por tenant se segregan en sus endpoints de negocio.
        )
        return media_item
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
@router.get("")
async def list_media(
    category: str = None,
    media_type: str = None,
    tenant_id: int = None,
    global_only: bool = False,
    page: int = 1,
    page_size: int = 24,
    creator=Depends(_optional_creator),
    db: Session = Depends(get_db)
):
    """
    Listado paginado y filtrado en el servidor. Devuelve solo la página pedida
    para que la biblioteca escale aunque tenga miles de archivos.
    Para los desplegables de filtro usar /media/facets (no esta lista).
    """
    from app import models as app_models

    page = max(1, page)
    page_size = min(max(1, page_size), 100)  # tope defensivo

    # Sin sesión de SuperAdmin (p. ej. la gestión pública del memorial pide los
    # fondos globales) solo se exponen recursos globales, nunca archivos de tenants.
    if creator is None:
        global_only = True
        tenant_id = None

    query = db.query(MediaLibrary)
    if category:
        query = query.filter(MediaLibrary.category == category)
    if media_type:
        query = query.filter(MediaLibrary.media_type == media_type)
    if global_only:
        query = query.filter(MediaLibrary.tenant_id.is_(None))
    elif tenant_id is not None:
        query = query.filter(MediaLibrary.tenant_id == tenant_id)

    total = query.count()
    items = (
        query.order_by(MediaLibrary.created_at.desc(), MediaLibrary.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # Nombre del tenant solo para los items de esta página (1 consulta, sin N+1).
    tenant_ids = {it.tenant_id for it in items if it.tenant_id is not None}
    names = {}
    if tenant_ids:
        rows = db.query(app_models.Tenant.id, app_models.Tenant.name).filter(
            app_models.Tenant.id.in_(tenant_ids)
        ).all()
        names = {tid: name for tid, name in rows}

    result_items = [{
        "id": it.id,
        "tenant_id": it.tenant_id,
        "tenant_name": names.get(it.tenant_id) if it.tenant_id else None,
        "url": it.url,
        "media_type": it.media_type,
        "category": it.category,
        "ratio": it.ratio,
        "description": it.description,
        "alt_text": it.alt_text,
        "file_size": it.file_size,
        "width": it.width,
        "height": it.height,
        "duration": it.duration,
        "thumbnail_url": it.thumbnail_url,
        "theme_config": it.theme_config,
        "created_at": it.created_at,
    } for it in items]

    return {
        "items": result_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size if total else 0,
    }


@router.get("/facets")
async def media_facets(current_creator=Depends(get_current_creator), db: Session = Depends(get_db)):
    """
    Devuelve las opciones de filtro (empresas y categorías) con sus contadores
    sobre TODA la biblioteca, independiente de la página. Tres consultas agregadas
    baratas; alimenta los desplegables sin traer las imágenes.
    """
    from sqlalchemy import func
    from app import models as app_models

    total = db.query(func.count(MediaLibrary.id)).scalar() or 0

    # Conteo por tenant (NULL = global)
    tenant_rows = (
        db.query(MediaLibrary.tenant_id, func.count(MediaLibrary.id))
        .group_by(MediaLibrary.tenant_id)
        .all()
    )
    global_count = sum(c for tid, c in tenant_rows if tid is None)
    tenant_counts = {tid: c for tid, c in tenant_rows if tid is not None}

    names = {}
    if tenant_counts:
        rows = db.query(app_models.Tenant.id, app_models.Tenant.name).filter(
            app_models.Tenant.id.in_(tenant_counts.keys())
        ).all()
        names = {tid: name for tid, name in rows}

    tenants = sorted(
        [{"id": tid, "name": names.get(tid, f"Empresa {tid}"), "count": c} for tid, c in tenant_counts.items()],
        key=lambda x: x["name"].lower(),
    )

    # Conteo por categoría
    cat_rows = (
        db.query(MediaLibrary.category, func.count(MediaLibrary.id))
        .group_by(MediaLibrary.category)
        .all()
    )
    categories = sorted(
        [{"value": cat, "count": c} for cat, c in cat_rows if cat],
        key=lambda x: x["value"],
    )

    return {
        "total": total,
        "global_count": global_count,
        "tenants": tenants,
        "categories": categories,
    }

# ===== Categorías de la biblioteca (gestión SuperAdmin) =====

def _serialize_category(c: MediaCategory) -> dict:
    return {
        "id": c.id,
        "key": c.key,
        "label": c.label,
        "sort_order": c.sort_order,
        "is_active": c.is_active,
    }


@router.get("/categories")
async def list_categories(current_creator=Depends(get_current_creator), include_inactive: bool = False, db: Session = Depends(get_db)):
    """Categorías del selector de subida. Por defecto solo las activas."""
    query = db.query(MediaCategory)
    if not include_inactive:
        query = query.filter(MediaCategory.is_active.is_(True))
    cats = query.order_by(MediaCategory.sort_order, MediaCategory.label).all()
    return [_serialize_category(c) for c in cats]


@router.post("/categories")
async def create_category(
    current_creator=Depends(get_current_creator),
    label: str = Form(...),
    key: str = Form(None),
    sort_order: int = Form(None),
    db: Session = Depends(get_db),
):
    label = (label or "").strip()
    if not label:
        raise HTTPException(status_code=400, detail="El nombre de la categoría es obligatorio.")

    final_key = _slugify_category_key(key) if key else _slugify_category_key(label)
    if not final_key:
        raise HTTPException(status_code=400, detail="No se pudo generar una clave válida para la categoría.")

    if db.query(MediaCategory).filter(MediaCategory.key == final_key).first():
        raise HTTPException(status_code=409, detail=f"Ya existe una categoría con la clave '{final_key}'.")

    if sort_order is None:
        max_order = db.query(func.max(MediaCategory.sort_order)).scalar() or 0
        sort_order = max_order + 10

    cat = MediaCategory(key=final_key, label=label[:120], sort_order=sort_order, is_active=True)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return _serialize_category(cat)


@router.put("/categories/{category_id}")
async def update_category(
    category_id: int,
    current_creator=Depends(get_current_creator),
    label: str = Form(None),
    sort_order: int = Form(None),
    is_active: bool = Form(None),
    db: Session = Depends(get_db),
):
    cat = db.query(MediaCategory).filter(MediaCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada.")

    if label is not None and label.strip():
        cat.label = label.strip()[:120]
    if sort_order is not None:
        cat.sort_order = sort_order
    if is_active is not None:
        cat.is_active = is_active

    db.commit()
    db.refresh(cat)
    return _serialize_category(cat)


@router.delete("/categories/{category_id}")
async def delete_category(category_id: int, current_creator=Depends(get_current_creator), db: Session = Depends(get_db)):
    cat = db.query(MediaCategory).filter(MediaCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada.")

    # No borrar si hay archivos usando la categoría: se perdería su clasificación.
    # El admin debe reasignar esos archivos a otra categoría primero (modal Editar).
    in_use = db.query(func.count(MediaLibrary.id)).filter(MediaLibrary.category == cat.key).scalar() or 0
    if in_use > 0:
        raise HTTPException(
            status_code=409,
            detail=f"No se puede eliminar: {in_use} archivo(s) usan esta categoría. Reasígnalos a otra categoría primero.",
        )

    db.delete(cat)
    db.commit()
    return {"message": "Categoría eliminada."}


@router.delete("/{media_id}")
async def delete_media(
    media_id: int,
    current_creator=Depends(get_current_creator),
    db: Session = Depends(get_db)
):
    media_item = db.query(MediaLibrary).filter(MediaLibrary.id == media_id).first()
    if not media_item:
        raise HTTPException(status_code=404, detail="Media not found")
    
    # Delete from storage (R2 or Local) and DB via Service
    result = MediaService.delete_media(db, media_item)
    
    if not result:
        raise HTTPException(status_code=500, detail="Error deleting media")
    
    return {"message": "Media deleted successfully"}

@router.put("/{media_id}")
async def update_media(
    media_id: int,
    current_creator=Depends(get_current_creator),
    category: str = Form(None),
    description: str = Form(None),
    alt_text: str = Form(None),
    db: Session = Depends(get_db)
):
    media_item = db.query(MediaLibrary).filter(MediaLibrary.id == media_id).first()
    if not media_item:
        raise HTTPException(status_code=404, detail="Media not found")
    
    if category:
        media_item.category = category
    if description is not None:
        media_item.description = description
    if alt_text is not None:
        media_item.alt_text = alt_text
        
    db.commit()
    db.refresh(media_item)
    return media_item


@router.put("/{media_id}/theme")
async def update_media_theme(
    media_id: int,
    current_creator=Depends(get_current_creator),
    theme_config: dict = Body(...),
    db: Session = Depends(get_db)
):
    """
    Actualiza la configuración de tema visual de un fondo de pantalla.
    Ejemplo body: {"mode": "dark", "title_color": "#fff", "text_color": "#e2e8f0", "accent_color": "#c3b091"}
    """
    media_item = db.query(MediaLibrary).filter(MediaLibrary.id == media_id).first()
    if not media_item:
        raise HTTPException(status_code=404, detail="Media not found")
    
    media_item.theme_config = theme_config
    db.commit()
    db.refresh(media_item)
    return {
        "id": media_item.id,
        "url": media_item.url,
        "theme_config": media_item.theme_config,
    }


# ---------------------------------------------------------------------------
# ¿Dónde se usa este archivo? (ojo en la biblioteca del SuperAdmin)
# ---------------------------------------------------------------------------

def _media_key(url: str) -> str:
    """Ruta del archivo sin dominio: las tablas guardan la URL completa pero el
    dominio del bucket puede cambiar entre entornos."""
    from urllib.parse import urlparse
    path = urlparse(url).path if "://" in url else url
    return path.lstrip("/")


@router.get("/{media_id}/usage")
async def media_usage(
    media_id: int,
    current_creator=Depends(get_current_creator),
    db: Session = Depends(get_db),
):
    """A qué crematorio, mascota, orden, solicitud, memorial o elemento del
    catálogo pertenece un archivo. Se calcula buscando su ruta en las tablas que
    guardan imágenes (la biblioteca no guarda esa relación)."""
    from sqlalchemy import text
    from app.core.tenant_context import apply_bypass_rls

    item = db.query(MediaLibrary).filter(MediaLibrary.id == media_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Media not found")

    apply_bypass_rls(db)
    key = _media_key(item.url)
    like = f"%{key}%"
    rows = lambda sql: db.execute(text(sql), {"like": like}).mappings().all()  # noqa: E731

    tenant = None
    if item.tenant_id:
        t = db.execute(text("SELECT id, name, slug FROM sys_tenants WHERE id = :id"), {"id": item.tenant_id}).mappings().first()
        tenant = dict(t) if t else None

    usages: list[dict] = []

    # Mascotas (foto principal o galería) + sus órdenes
    for p in rows("""
        SELECT p.id, p.name, c.name AS owner, p.tenant_id
        FROM crm_pets p LEFT JOIN crm_customers c ON c.id = p.customer_id
        WHERE p.image_url LIKE :like OR p.images::text LIKE :like
    """):
        orders = db.execute(text(
            "SELECT id, oc_number, status FROM oc_cremations WHERE pet_id = :pid ORDER BY id"
        ), {"pid": p["id"]}).mappings().all()
        usages.append({
            "kind": "mascota", "label": p["name"], "detail": f"Tutor: {p['owner']}" if p["owner"] else None,
            "tenant_id": p["tenant_id"], "pet_id": p["id"],
            "orders": [{"id": o["id"], "oc_number": o["oc_number"], "status": o["status"]} for o in orders],
        })

    # Solicitudes web
    for s in rows("""
        SELECT id, pet_data->>'name' AS pet, owner_data->>'fullName' AS owner, status, tenant_id
        FROM web_form_submissions WHERE images::text LIKE :like
    """):
        usages.append({"kind": "solicitud", "label": f"Solicitud #{s['id']} · {s['pet'] or 'sin nombre'}",
                       "detail": f"Tutor: {s['owner']} · {s['status']}" if s["owner"] else s["status"],
                       "tenant_id": s["tenant_id"], "submission_id": s["id"]})

    # Evidencias del flujo de la orden
    for e in rows("""
        SELECT e.cremation_id, o.oc_number, o.tenant_id, w.name AS step
        FROM ops_order_evidence e
        JOIN oc_cremations o ON o.id = e.cremation_id
        LEFT JOIN ops_workflow_steps w ON w.id = e.step_id
        WHERE e.photo_url LIKE :like
        UNION ALL
        SELECT t.cremation_id, o.oc_number, o.tenant_id, 'Evidencia técnica'
        FROM oc_cremation_technical t JOIN oc_cremations o ON o.id = t.cremation_id
        WHERE t.evidence_url LIKE :like
        UNION ALL
        SELECT d.cremation_id, o.oc_number, o.tenant_id, 'Fotos de la orden'
        FROM oc_details d JOIN oc_cremations o ON o.id = d.cremation_id
        WHERE d.images::text LIKE :like
    """):
        usages.append({"kind": "orden", "label": f"Orden OC {e['oc_number']}", "detail": e["step"],
                       "tenant_id": e["tenant_id"], "cremation_id": e["cremation_id"]})

    # Memoriales
    for m in rows("""
        SELECT r.id, r.id_recuerdo, p.name AS pet, r.id_tenant AS tenant_id
        FROM rec_recuerdos r LEFT JOIN crm_pets p ON p.id = r.id_mascota
        WHERE r.main_image_url LIKE :like OR r.lista_imagenes::text LIKE :like OR r.imagen_ia LIKE :like
    """):
        usages.append({"kind": "memorial", "label": f"Memorial de {m['pet'] or 'mascota'}",
                       "detail": None, "tenant_id": m["tenant_id"], "memorial_uuid": str(m["id_recuerdo"]) if m["id_recuerdo"] else None})

    # Catálogo
    for c in rows("""
        SELECT 'Producto' AS what, name, tenant_id FROM inv_products WHERE image_url LIKE :like OR images::text LIKE :like
        UNION ALL
        SELECT 'Plan', name, tenant_id FROM srv_plans WHERE image_url LIKE :like
    """):
        usages.append({"kind": "catalogo", "label": c["name"], "detail": c["what"], "tenant_id": c["tenant_id"]})

    # Identidad y diseños
    for d in rows("""
        SELECT 'Logo del crematorio' AS what, name, id AS tenant_id FROM sys_tenants WHERE logo_url LIKE :like
        UNION ALL
        SELECT 'Plantilla de certificado', name, tenant_id FROM ops_certificate_templates
            WHERE header_logo_url LIKE :like OR background_logo_url LIKE :like
        UNION ALL
        SELECT 'Tarjeta de homenaje', name, tenant_id FROM ops_farewell_templates WHERE preview_url LIKE :like
    """):
        usages.append({"kind": "diseno", "label": d["name"], "detail": d["what"], "tenant_id": d["tenant_id"]})

    # Nombre del crematorio de cada uso (puede diferir del dueño del archivo)
    tenant_ids = {u["tenant_id"] for u in usages if u.get("tenant_id")}
    names = {}
    if tenant_ids:
        for t in db.execute(text("SELECT id, name FROM sys_tenants WHERE id = ANY(:ids)"), {"ids": list(tenant_ids)}).mappings():
            names[t["id"]] = t["name"]
    for u in usages:
        u["tenant_name"] = names.get(u.get("tenant_id"))

    return {
        "media": {"id": item.id, "category": item.category, "description": item.description,
                  "created_at": item.created_at, "file_size": item.file_size},
        "tenant": tenant,
        "usages": usages,
    }
