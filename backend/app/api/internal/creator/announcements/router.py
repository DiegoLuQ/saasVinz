from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
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
    """List all announcements (SuperAdmin only) with read count"""
    rows = db.query(models.TenantAnnouncement).order_by(models.TenantAnnouncement.created_at.desc()).all()
    view_counts = dict(
        db.query(models.UserAnnouncementView.announcement_id, func.count(models.UserAnnouncementView.id))
        .group_by(models.UserAnnouncementView.announcement_id)
        .all()
    )
    result = []
    for ann in rows:
        dto = schemas.AnnouncementInDB.model_validate(ann)
        dto.views_count = int(view_counts.get(ann.id, 0) or 0)
        result.append(dto)
    return result

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


@router.patch("/{announcement_id}/toggle", response_model=schemas.AnnouncementInDB)
def toggle_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_creator: models.User = Depends(auth.get_current_creator)
):
    """Toggle announcement is_active status"""
    announcement = db.query(models.TenantAnnouncement).filter(models.TenantAnnouncement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Anuncio no encontrado")
    announcement.is_active = not bool(announcement.is_active)
    db.commit()
    db.refresh(announcement)
    views_count = db.query(func.count(models.UserAnnouncementView.id)).filter(
        models.UserAnnouncementView.announcement_id == announcement.id
    ).scalar() or 0
    dto = schemas.AnnouncementInDB.model_validate(announcement)
    dto.views_count = int(views_count)
    return dto

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

