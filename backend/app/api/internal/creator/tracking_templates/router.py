from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, List
import os
import uuid
import re
import shutil
from app.database import get_db
from app import models, auth
from app.core.tenant_context import apply_bypass_rls

router = APIRouter()


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-") or f"template-{uuid.uuid4().hex[:6]}"


@router.get("")
def list_tracking_templates(
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator),
):
    """Lista todas las plantillas (predefinidas del sistema + personalizadas de la BD)."""
    apply_bypass_rls(db)
    from app.services.tracking_templates import TEMPLATE_CATALOG

    custom_templates = (
        db.query(models.TrackingCustomTemplate)
        .order_by(models.TrackingCustomTemplate.created_at.desc())
        .all()
    )

    result = []
    # 1. Built-in templates
    for tpl in TEMPLATE_CATALOG:
        if tpl["id"] != "celestial":  # Celestial is managed in custom_templates now
            result.append({
                "id": None,
                "slug": tpl["id"],
                "name": tpl["name"],
                "description": tpl["description"],
                "is_active": True,
                "is_built_in": True,
                "allowed_plans": ["Track", "NORMAL", "PRO", "ULTRA"],
                "background_mobile_url": None,
                "background_desktop_url": None,
                "element_url": None,
                "preview_image_url": None,
                "theme_config": {"accent_color": tpl.get("accent", "#0284C7")},
            })

    # 2. Custom templates from DB
    for c in custom_templates:
        result.append({
            "id": c.id,
            "slug": c.slug,
            "name": c.name,
            "description": c.description,
            "is_active": c.is_active,
            "is_built_in": False,
            "allowed_plans": c.allowed_plans or ["PRO", "ULTRA"],
            "background_mobile_url": c.background_mobile_url,
            "background_desktop_url": c.background_desktop_url,
            "element_url": c.element_url,
            "preview_image_url": c.preview_image_url or c.background_mobile_url,
            "theme_config": c.theme_config or {},
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })

    return {"templates": result}


@router.post("")
def create_tracking_template(
    payload: dict,
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator),
):
    """Crea una nueva plantilla personalizada de tracking."""
    apply_bypass_rls(db)
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="El nombre de la plantilla es obligatorio.")

    raw_slug = payload.get("slug")
    slug = _slugify(raw_slug or name)

    # Check slug collision
    existing = (
        db.query(models.TrackingCustomTemplate)
        .filter(models.TrackingCustomTemplate.slug == slug)
        .first()
    )
    if existing:
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"

    allowed_plans = payload.get("allowed_plans") or ["PRO", "ULTRA"]
    if isinstance(allowed_plans, str):
        allowed_plans = [p.strip() for p in allowed_plans.split(",") if p.strip()]

    tpl = models.TrackingCustomTemplate(
        slug=slug,
        name=name,
        description=payload.get("description"),
        is_active=bool(payload.get("is_active", True)),
        allowed_plans=allowed_plans,
        background_mobile_url=payload.get("background_mobile_url"),
        background_desktop_url=payload.get("background_desktop_url"),
        element_url=payload.get("element_url"),
        preview_image_url=payload.get("preview_image_url") or payload.get("background_mobile_url"),
        theme_config=payload.get("theme_config") or {},
    )
    db.add(tpl)
    db.commit()
    db.refresh(tpl)

    return {
        "success": True,
        "message": f"Plantilla '{tpl.name}' creada exitosamente.",
        "template": {
            "id": tpl.id,
            "slug": tpl.slug,
            "name": tpl.name,
            "description": tpl.description,
            "is_active": tpl.is_active,
            "allowed_plans": tpl.allowed_plans,
            "background_mobile_url": tpl.background_mobile_url,
            "background_desktop_url": tpl.background_desktop_url,
            "element_url": tpl.element_url,
            "theme_config": tpl.theme_config,
        },
    }


@router.put("/{template_id}")
def update_tracking_template(
    template_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator),
):
    """Actualiza una plantilla de tracking existente."""
    apply_bypass_rls(db)
    tpl = db.query(models.TrackingCustomTemplate).filter(models.TrackingCustomTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada.")

    if "name" in payload and payload["name"]:
        tpl.name = payload["name"].strip()
    if "description" in payload:
        tpl.description = payload["description"]
    if "is_active" in payload:
        tpl.is_active = bool(payload["is_active"])
    if "allowed_plans" in payload and isinstance(payload["allowed_plans"], list):
        tpl.allowed_plans = payload["allowed_plans"]
    if "background_mobile_url" in payload:
        tpl.background_mobile_url = payload["background_mobile_url"]
    if "background_desktop_url" in payload:
        tpl.background_desktop_url = payload["background_desktop_url"]
    if "element_url" in payload:
        tpl.element_url = payload["element_url"]
    if "preview_image_url" in payload:
        tpl.preview_image_url = payload["preview_image_url"]
    if "theme_config" in payload and isinstance(payload["theme_config"], dict):
        tpl.theme_config = payload["theme_config"]

    db.commit()
    db.refresh(tpl)
    return {"success": True, "message": "Plantilla actualizada.", "template": {
        "id": tpl.id,
        "slug": tpl.slug,
        "name": tpl.name,
        "is_active": tpl.is_active,
        "allowed_plans": tpl.allowed_plans,
    }}


@router.patch("/{template_id}/toggle-active")
def toggle_template_active(
    template_id: int,
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator),
):
    """Activa o desactiva rápidamente una plantilla."""
    apply_bypass_rls(db)
    tpl = db.query(models.TrackingCustomTemplate).filter(models.TrackingCustomTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada.")

    tpl.is_active = not tpl.is_active
    db.commit()
    return {"success": True, "is_active": tpl.is_active, "slug": tpl.slug}


@router.delete("/{template_id}")
def delete_tracking_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator),
):
    """Elimina una plantilla personalizada de tracking."""
    apply_bypass_rls(db)
    tpl = db.query(models.TrackingCustomTemplate).filter(models.TrackingCustomTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada.")

    db.delete(tpl)
    db.commit()
    return {"success": True, "message": "Plantilla eliminada correctamente."}


@router.post("/upload-asset")
async def upload_tracking_asset(
    file: UploadFile = File(...),
    asset_type: str = Form("element"),  # element, mobile_bg, desktop_bg, preview
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator),
):
    """Sube un recurso (fondo o elemento decorativo en webp/png) para plantillas de tracking."""
    apply_bypass_rls(db)
    from app.api.internal.common.media_service import MediaService

    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1] or ".webp"
    temp_path = os.path.join(temp_dir, f"track_tpl_{asset_type}_{uuid.uuid4().hex}{ext}")

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        media_item = MediaService.upload_media(
            db=db,
            local_path=temp_path,
            media_type="image",
            category="tracking_assets",
            ratio="original",
            description=f"Tracking template asset: {asset_type}",
            alt_text=f"Tracking asset {asset_type}",
            processing_mode="original",
            custom_prefix=f"tpl_{asset_type}",
        )
        return {"url": media_item.url, "asset_type": asset_type}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir el archivo: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
