from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.api.veterinary.auth.router import get_current_veterinary
from datetime import datetime

router = APIRouter()

@router.get("", response_model=schemas.PaginatedNotifications)
def get_veterinary_notifications(
    skip: int = 0,
    limit: int = 15,
    include_read: bool = False,
    db: Session = Depends(get_db),
    current_vet = Depends(get_current_veterinary)
):
    """
    Get notifications for the current veterinary.
    
    Filters:
    - Only notifications where veterinary_id matches current user
    - Only recipient_type = 'veterinary'
    - Excludes expired notifications
    - Optionally excludes read notifications
    """
    query = db.query(models.Notification).filter(
        models.Notification.veterinary_id == current_vet.id,
        models.Notification.recipient_type == models.RecipientType.veterinary
    )
    
    if not include_read:
        query = query.filter(models.Notification.is_read == False)
    
    # Exclude expired notifications
    query = query.filter(
        (models.Notification.expires_at == None) | 
        (models.Notification.expires_at > datetime.utcnow())
    )
    
    total = query.count()
    items = query.order_by(
        models.Notification.priority.desc(),
        models.Notification.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    import math
    return {
        "items": items,
        "total": total,
        "page": (skip // limit) + 1 if limit > 0 else 1,
        "size": limit,
        "pages": math.ceil(total / limit) if limit > 0 else 1
    }

@router.patch("/{notification_id}", response_model=schemas.NotificationInDB)
def mark_veterinary_notification_read(
    notification_id: int,
    notif_in: schemas.NotificationUpdate,
    db: Session = Depends(get_db),
    current_vet = Depends(get_current_veterinary)
):
    """
    Mark a veterinary notification as read/unread.
    Only the owner veterinary can update their own notifications.
    """
    notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.veterinary_id == current_vet.id,
        models.Notification.recipient_type == models.RecipientType.veterinary
    ).first()
    
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    
    if notif_in.is_read is not None:
        notif.is_read = notif_in.is_read
        
    db.commit()
    db.refresh(notif)
    return notif

@router.post("/mark-all-read")
def mark_all_veterinary_notifications_read(
    db: Session = Depends(get_db),
    current_vet = Depends(get_current_veterinary)
):
    """
    Mark all pending veterinary notifications as read.
    """
    updated = db.query(models.Notification).filter(
        models.Notification.veterinary_id == current_vet.id,
        models.Notification.recipient_type == models.RecipientType.veterinary,
        models.Notification.is_read == False
    ).update({models.Notification.is_read: True})
    
    db.commit()
    return {"message": f"{updated} notificaciones marcadas como leídas"}

@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_vet = Depends(get_current_veterinary)
):
    """
    Get the count of unread notifications for quick badge display.
    """
    count = db.query(models.Notification).filter(
        models.Notification.veterinary_id == current_vet.id,
        models.Notification.recipient_type == models.RecipientType.veterinary,
        models.Notification.is_read == False,
        (models.Notification.expires_at == None) | 
        (models.Notification.expires_at > datetime.utcnow())
    ).count()
    
    return {"unread_count": count}
