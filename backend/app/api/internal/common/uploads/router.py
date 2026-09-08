from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import shutil
import os
import uuid
from typing import List
from app.api.deps import get_tenant_id
from app.database import get_db
from app.api.internal.common.media_service import MediaService
from app.utils.upload_validation import read_and_validate_image

router = APIRouter()


@router.get("/test")
def test_upload():
    return {"status": "ok", "message": "Upload router is active"}

@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    tenant_id: int = Depends(get_tenant_id),
    db: Session = Depends(get_db)
):
    # Validar por contenido real (magic bytes) + tamaño, no por content_type/filename.
    content, ext = await read_and_validate_image(file)
    try:
        # Temporary save for processing (nombre seguro derivado del tipo real)
        temp_dir = "temp_uploads"
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, f"{uuid.uuid4().hex}.{ext}")

        with open(temp_path, "wb") as buffer:
            buffer.write(content)

        try:
            # Upload using MediaService
            media_item = MediaService.upload_media(
                db=db,  # MediaService registra el archivo en MediaLibrary: la sesión es obligatoria
                local_path=temp_path,
                media_type="image",
                category="disenos",
                ratio="original",
                description="Upload genérico de diseño",
                alt_text="Diseño subido",
                processing_mode="optimized",
                tenant_id=tenant_id
            )
            return {
                "url": media_item.url,
                "filename": os.path.basename(media_item.url)
            }
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
    except Exception as e:
        print(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al subir la imagen")

@router.post("/evidence")
async def upload_evidence(
    file: UploadFile = File(...),
    tenant_id: int = Depends(get_tenant_id),
    db: Session = Depends(get_db)
):
    content, ext = await read_and_validate_image(file)
    try:
        temp_dir = "temp_uploads"
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, f"{uuid.uuid4().hex}.{ext}")

        with open(temp_path, "wb") as buffer:
            buffer.write(content)

        try:
            media_item = MediaService.upload_media(
                db=db,
                local_path=temp_path,
                media_type="image",
                category="workflow_evidence",
                ratio="original",
                description="Evidencia fotográfica de recepción",
                alt_text="Evidencia fotográfica",
                processing_mode="optimized",
                tenant_id=tenant_id
            )
            return {
                "url": media_item.url,
                "filename": os.path.basename(media_item.url)
            }
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
    except Exception as e:
        print(f"Error uploading evidence: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al subir la evidencia fotográfica")
