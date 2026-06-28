"""
SuperAdmin router for global image templates.

Image templates are visual layouts (text + photo placeholder over background)
that tenants can later reuse to generate pet memorial images. Templates are
global (no tenant_id). Once a template has been used by any tenant
(usage_count > 0) it becomes read-only and cannot be edited or deleted.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models
from app.auth import get_current_creator
from app.api.internal.admin.image_templates.schemas import (
    ImageTemplateCreate,
    ImageTemplateUpdate,
    ImageTemplateInDB,
)

router = APIRouter()


def _get_or_404(db: Session, template_id: int) -> models.ImageTemplate:
    tpl = db.query(models.ImageTemplate).filter(models.ImageTemplate.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    return tpl


@router.get("", response_model=List[ImageTemplateInDB])
def list_image_templates(
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    return (
        db.query(models.ImageTemplate)
        .order_by(models.ImageTemplate.created_at.desc())
        .all()
    )


@router.get("/{template_id}", response_model=ImageTemplateInDB)
def get_image_template(
    template_id: int,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    return _get_or_404(db, template_id)


@router.post("", response_model=ImageTemplateInDB)
def create_image_template(
    payload: ImageTemplateCreate,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    tpl = models.ImageTemplate(**payload.model_dump())
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return tpl


@router.patch("/{template_id}", response_model=ImageTemplateInDB)
def update_image_template(
    template_id: int,
    payload: ImageTemplateUpdate,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    tpl = _get_or_404(db, template_id)
    if tpl.is_locked:
        raise HTTPException(
            status_code=409,
            detail=(
                "Esta plantilla ya fue utilizada por uno o más tenants y no "
                "puede editarse. Duplica la plantilla para crear una nueva versión."
            ),
        )

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(tpl, key, value)

    db.commit()
    db.refresh(tpl)
    return tpl


@router.post("/{template_id}/duplicate", response_model=ImageTemplateInDB)
def duplicate_image_template(
    template_id: int,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    src = _get_or_404(db, template_id)
    clone = models.ImageTemplate(
        name=f"{src.name} (copia)",
        description=src.description,
        default_phrase=src.default_phrase,
        supported_ratios=list(src.supported_ratios or []),
        definition=dict(src.definition or {}),
        thumbnail_url=src.thumbnail_url,
        is_active=True,
        usage_count=0,
    )
    db.add(clone)
    db.commit()
    db.refresh(clone)
    return clone


@router.delete("/{template_id}")
def delete_image_template(
    template_id: int,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    tpl = _get_or_404(db, template_id)
    if tpl.is_locked:
        raise HTTPException(
            status_code=409,
            detail=(
                "Esta plantilla ya fue utilizada y no puede eliminarse. "
                "Puedes desactivarla para ocultarla de los tenants."
            ),
        )
    db.delete(tpl)
    db.commit()
    return {"status": "deleted", "message": "Plantilla eliminada correctamente"}
