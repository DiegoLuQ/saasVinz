from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import schemas
from app import auth
from typing import List
from datetime import datetime

router = APIRouter()

@router.get("/active", response_model=List[schemas.AnnouncementInDB])
def get_active_announcements(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Returns active announcements for the current tenant.
    Filters out 'show_once' messages already viewed by the user.
    """
    # 1. Base query for active announcements (specific to tenant or global)
    query = db.query(models.TenantAnnouncement).filter(
        models.TenantAnnouncement.is_active == True,
        (models.TenantAnnouncement.tenant_id == current_user.tenant_id) | (models.TenantAnnouncement.tenant_id == None)
    )
    
    announcements = query.all()
    
    # 2. Filter viewed 'show_once' announcements
    viewed_ids = [v.announcement_id for v in db.query(models.UserAnnouncementView).filter(
        models.UserAnnouncementView.user_id == current_user.id
    ).all()]
    
    active_announcements = [
        a for a in announcements 
        if not a.show_once or a.id not in viewed_ids
    ]
    
    # 3. Sort by priority
    active_announcements.sort(key=lambda x: x.priority, reverse=True)
    
    return active_announcements

@router.post("/{announcement_id}/view")
def mark_announcement_as_viewed(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Marks an announcement as viewed by the current user."""
    # Verify announcement exists
    announcement = db.query(models.TenantAnnouncement).filter(models.TenantAnnouncement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=404, detail="Anuncio no encontrado")
        
    # Check if already viewed to avoid duplicates
    existing_view = db.query(models.UserAnnouncementView).filter(
        models.UserAnnouncementView.user_id == current_user.id,
        models.UserAnnouncementView.announcement_id == announcement_id
    ).first()
    
    if not existing_view:
        view = models.UserAnnouncementView(
            user_id=current_user.id,
            announcement_id=announcement_id
        )
        db.add(view)
        db.commit()
        
    return {"detail": "Anuncio marcado como visto"}
