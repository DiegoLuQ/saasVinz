from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import os
import uuid
from app.database import get_db
from app import schemas, models, auth

router = APIRouter()

@router.get("", response_model=schemas.SaaSConfigInDB)
def get_saas_config(
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator)
):
    """Retrieve the global SaaS configuration."""
    config = db.query(models.SaaSConfig).first()
    if not config:
        # Create a default one if it doesn't exist
        config = models.SaaSConfig(
            name="SaaS Crematorio",
            slug="saas-crematorio"
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

@router.put("", response_model=schemas.SaaSConfigInDB)
def update_saas_config(
    config_update: schemas.SaaSConfigUpdate,
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator)
):
    """Update the global SaaS configuration."""
    config = db.query(models.SaaSConfig).first()
    if not config:
        config = models.SaaSConfig(name="SaaS Crematorio")
        db.add(config)
    
    update_data = config_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)
    
    db.commit()
    db.refresh(config)
    return config

@router.post("/logo")
async def upload_saas_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator)
):
    """Upload and set the SaaS logo."""
    config = db.query(models.SaaSConfig).first()
    if not config:
        config = models.SaaSConfig(name="SaaS Crematorio")
        db.add(config)
        db.flush()

    # Save to storage/saas
    from app.api.internal.common.media_service import MediaService
    import shutil
    from datetime import datetime
    
    # Temporary save for processing
    temp_dir = "temp_uploads"
    os.makedirs(temp_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1]
    temp_path = os.path.join(temp_dir, f"saas_logo_{uuid.uuid4().hex}{ext}")
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Upload using MediaService.
        # GLOBAL a propósito: logo/config del SaaS (no pertenece a ningún tenant)
        # -> NO se pasa tenant_id (se guarda fuera de tenant_{id}/).
        media_item = MediaService.upload_media(
            db=db,
            local_path=temp_path,
            media_type="image",
            category="saas",
            ratio="original", # Preserve aspect ratio for main logo
            description="SaaS main logo",
            alt_text="SaaS logo",
            processing_mode="original", # Maintain maximum quality
            custom_prefix=config.slug or "saas"
        )
        
        # Update DB
        config.logo = media_item.url
        db.commit()
        db.refresh(config)
        
        return {"logo_url": media_item.url}
    except Exception as e:
        print(f"Error uploading logo: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
