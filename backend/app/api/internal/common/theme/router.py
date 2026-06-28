from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_tenant_id
from app import models
from app import schemas
from datetime import datetime
from app.utils import tz

router = APIRouter()

@router.get("/config", response_model=schemas.ThemeConfigInDB)
async def get_theme_config(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    """Get theme configuration for the current tenant"""
    config = db.query(models.ThemeConfig).filter(
        models.ThemeConfig.tenant_id == tenant_id
    ).first()
    
    # If no config exists, create default one
    if not config:
        config = models.ThemeConfig(
            tenant_id=tenant_id,
            theme_mode="auto",
            auto_light_start="06:00",
            auto_light_end="18:00"
        )
        db.add(config)
        db.flush()  # Get auto-generated ID without ending transaction
        # Capture data before commit expires the instance
        result = {
            "id": config.id,
            "tenant_id": config.tenant_id,
            "theme_mode": config.theme_mode,
            "auto_light_start": config.auto_light_start,
            "auto_light_end": config.auto_light_end,
            "custom_theme_colors": config.custom_theme_colors,
        }
        db.commit()
        return result
    
    return config

@router.patch("/config", response_model=schemas.ThemeConfigInDB)
async def update_theme_config(
    config_update: schemas.ThemeConfigUpdate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    """Update theme configuration for the current tenant"""
    config = db.query(models.ThemeConfig).filter(
        models.ThemeConfig.tenant_id == tenant_id
    ).first()
    
    # If no config exists, create it
    if not config:
        config = models.ThemeConfig(tenant_id=tenant_id)
        db.add(config)
    
    # Update fields
    update_data = config_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)
    
    db.flush()  # Persist changes, get generated values
    # Capture data before commit expires the instance
    result = {
        "id": config.id,
        "tenant_id": config.tenant_id,
        "theme_mode": config.theme_mode,
        "auto_light_start": config.auto_light_start,
        "auto_light_end": config.auto_light_end,
        "custom_theme_colors": config.custom_theme_colors,
    }
    db.commit()
    
    return result
