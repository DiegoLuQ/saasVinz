from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import schemas
from app import auth
from typing import List

router = APIRouter()

@router.get("/active", response_model=List[schemas.AnnouncementInDB])
def get_active_announcements(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
):
    """
    Get active announcements for the current tenant based on:
    - Global announcements (no targeting)
    - Specific tenant announcements (tenant_id matches)
    - Announcements targeted to tenant's current status
    - Announcements targeted to tenant's subscription plan
    
    Filters out 'show_once' messages already viewed by the user.
    """
    # Get current tenant info
    tenant = db.query(models.Tenant).filter(models.Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant no encontrado")
    
    # Query announcements that match the various targeting rules
    announcements = db.query(models.TenantAnnouncement).filter(
        models.TenantAnnouncement.is_active == True,
        (
            # Specific to this tenant
            (models.TenantAnnouncement.tenant_id == current_user.tenant_id) |
            (
                # System-wide announcements (not specific to another tenant)
                (models.TenantAnnouncement.tenant_id == None) & (
                    # Global (no specific targeting)
                    ((models.TenantAnnouncement.target_status == None) & (models.TenantAnnouncement.target_plan_id == None)) |
                    # Status-targeted
                    (models.TenantAnnouncement.target_status == tenant.status) |
                    # Plan-targeted
                    (models.TenantAnnouncement.target_plan_id == tenant.subscription_plan_id)
                )
            )
        )
    ).order_by(models.TenantAnnouncement.priority.desc()).all()
    
    # Filter viewed 'show_once' announcements
    viewed_ids = [v.announcement_id for v in db.query(models.UserAnnouncementView).filter(
        models.UserAnnouncementView.user_id == current_user.id
    ).all()]
    
    active_announcements = [
        a for a in announcements 
        if not a.show_once or a.id not in viewed_ids
    ]
    
    return active_announcements

@router.post("/{announcement_id}/view")
def mark_announcement_as_viewed(
    announcement_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_admin)
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
