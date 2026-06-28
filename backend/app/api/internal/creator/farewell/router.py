"""
SuperAdmin (Creator) router for managing GLOBAL farewell templates.

Global templates have tenant_id = NULL and are visible to every tenant
through the regular tenant farewell endpoint.
"""
import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from app.auth import get_current_creator
from app.core.config import settings
from app.utils.r2 import upload_file_to_r2
from app.api.internal.common.media_service import MediaService

router = APIRouter()


@router.post("/upload-background")
async def upload_farewell_background(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    """Sube una imagen de fondo para plantillas de despedida globales.

    Devuelve la URL pública R2. El SuperAdmin luego hace PATCH sobre la
    plantilla con `config.backgroundImage.url` apuntando a esa URL.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    safe_name = (file.filename or "background").replace("\\", "/").split("/")[-1]
    temp_path = os.path.join(temp_dir, f"{uuid.uuid4().hex}_{safe_name}")

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Utilizar MediaService para optimizar, subir a R2 e insertar el registro en la base de datos
        # Se guarda bajo la categoría "backgrounds" para que se liste en la biblioteca de medios.
        # GLOBAL a propósito: fondos de plantillas de despedida globales (SuperAdmin)
        # -> NO se pasa tenant_id (compartidos por todos los tenants).
        media_item = MediaService.upload_media(
            db=db,
            local_path=temp_path,
            media_type="image",
            category="backgrounds",
            ratio="original",
            description=f"Fondo de despedida: {safe_name}",
            alt_text="Fondo de plantilla de despedida global",
            processing_mode="original"
        )

        return {"url": media_item.url}
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


@router.get("", response_model=List[schemas.FarewellTemplate])
def list_global_farewell_templates(
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    """List all global farewell templates (tenant_id IS NULL)."""
    return (
        db.query(models.FarewellTemplate)
        .filter(models.FarewellTemplate.tenant_id.is_(None))
        .order_by(models.FarewellTemplate.created_at.desc())
        .all()
    )


@router.get("/{template_id}", response_model=schemas.FarewellTemplate)
def get_global_farewell_template(
    template_id: int,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    db_template = (
        db.query(models.FarewellTemplate)
        .filter(
            models.FarewellTemplate.id == template_id,
            models.FarewellTemplate.tenant_id.is_(None),
        )
        .first()
    )
    if not db_template:
        raise HTTPException(status_code=404, detail="Plantilla global no encontrada")
    return db_template


@router.post("", response_model=schemas.FarewellTemplate)
def create_global_farewell_template(
    template_in: schemas.FarewellTemplateCreate,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    """Create a new global template. tenant_id is forced to NULL."""
    db_template = models.FarewellTemplate(
        **template_in.dict(),
        tenant_id=None,
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template


@router.patch("/{template_id}", response_model=schemas.FarewellTemplate)
def update_global_farewell_template(
    template_id: int,
    template_update: schemas.FarewellTemplateUpdate,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    db_template = (
        db.query(models.FarewellTemplate)
        .filter(
            models.FarewellTemplate.id == template_id,
            models.FarewellTemplate.tenant_id.is_(None),
        )
        .first()
    )
    if not db_template:
        raise HTTPException(status_code=404, detail="Plantilla global no encontrada")

    update_data = template_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_template, key, value)

    db.commit()
    db.refresh(db_template)
    return db_template


@router.delete("/{template_id}")
def delete_global_farewell_template(
    template_id: int,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    db_template = (
        db.query(models.FarewellTemplate)
        .filter(
            models.FarewellTemplate.id == template_id,
            models.FarewellTemplate.tenant_id.is_(None),
        )
        .first()
    )
    if not db_template:
        raise HTTPException(status_code=404, detail="Plantilla global no encontrada")

    db.delete(db_template)
    db.commit()
    return {"status": "deleted", "message": "Plantilla global eliminada correctamente"}
