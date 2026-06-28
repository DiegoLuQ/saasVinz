from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.internal.common.media_service import MediaService
from app.api.internal.common.models import MediaLibrary
import os
import uuid

router = APIRouter(prefix="/media", tags=["Media Library"])

@router.post("/upload")
async def upload_media(
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
    media_type = "image" if ext.lower() in [".jpg", ".jpeg", ".png", ".webp"] else "video"
    if ext.lower() not in [".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov", ".avi"]:
         os.remove(temp_path)
         raise HTTPException(status_code=400, detail="Unsupported file format")

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
async def media_facets(db: Session = Depends(get_db)):
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

@router.delete("/{media_id}")
async def delete_media(
    media_id: int,
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
