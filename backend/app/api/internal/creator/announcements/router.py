from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import schemas
from app import auth
from typing import List

router = APIRouter()

@router.get("", response_model=List[schemas.AnnouncementInDB])
def list_announcements(
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator)
):
    """List all announcements (SuperAdmin only)"""
    return db.query(models.TenantAnnouncement).order_by(models.TenantAnnouncement.created_at.desc()).all()

@router.post("", response_model=schemas.AnnouncementInDB)
def create_announcement(
    announcement_data: schemas.AnnouncementCreate,
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator)
):
    """Create a new global or targeted announcement"""
    new_announcement = models.TenantAnnouncement(**announcement_data.dict())
    db.add(new_announcement)
    db.commit()
    db.refresh(new_announcement)
    return new_announcement

@router.put("/{announcement_id}", response_model=schemas.AnnouncementInDB)
def update_announcement(
    announcement_id: int,
    announcement_data: schemas.AnnouncementCreate,
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator)
):
    """Update an existing announcement"""
    announcement = db.query(models.TenantAnnouncement).filter(models.TenantAnnouncement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Anuncio no encontrado")
        
    for key, value in announcement_data.dict().items():
        setattr(announcement, key, value)
        
    db.commit()
    db.refresh(announcement)
    return announcement

@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator)
):
    """Delete an announcement"""
    announcement = db.query(models.TenantAnnouncement).filter(models.TenantAnnouncement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Anuncio no encontrado")
        
    # Also delete logs of views for this announcement
    db.query(models.UserAnnouncementView).filter(models.UserAnnouncementView.announcement_id == announcement_id).delete()
    
    db.delete(announcement)
    db.commit()
    return None

