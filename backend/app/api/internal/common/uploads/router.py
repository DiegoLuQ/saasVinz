from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
import shutil
import os
import uuid
from typing import List
from app.api.deps import get_tenant_id
from app.api.internal.common.media_service import MediaService
from app.utils.upload_validation import read_and_validate_image

router = APIRouter()


@router.get("/test")
def test_upload():
    return {"status": "ok", "message": "Upload router is active"}

@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    tenant_id: int = Depends(get_tenant_id)
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
                db=None, # Generic uploads might not need DB if we just want URL, but MediaLibrary is standard now
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
