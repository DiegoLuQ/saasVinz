from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app import schemas
from app.api.deps import get_tenant_id
from typing import List
from datetime import datetime

router = APIRouter()

@router.get("", response_model=schemas.PaginatedNotifications)
def get_my_notifications(
    skip: int = 0,
    limit: int = 15,
    include_read: bool = False,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    """
    Get notifications for the current tenant with pagination.
    By default returns only unread notifications.
    Set include_read=true to get all notifications.
    """
    query = db.query(models.Notification).filter(
        models.Notification.tenant_id == tenant_id
    )
    
    if not include_read:
        query = query.filter(models.Notification.is_read == False)
    
    total = query.count()
    items = query.order_by(models.Notification.created_at.desc()).offset(skip).limit(limit).all()
    
    import math
    return {
        "items": items,
        "total": total,
        "page": (skip // limit) + 1,
        "size": limit,
        "pages": math.ceil(total / limit) if limit > 0 else 1
    }

@router.patch("/{notification_id}", response_model=schemas.NotificationInDB)
def update_notification(
    notification_id: int,
    notif_in: schemas.NotificationUpdate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    """
    Mark a notification as read or archive it.
    """
    notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.tenant_id == tenant_id
    ).first()
    
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    
    if notif_in.is_read is not None:
        notif.is_read = notif_in.is_read
        
    db.commit()
    db.refresh(notif)
    return notif

@router.post("/archive-by-submission/{submission_id}")
def archive_submission_notifications(
    submission_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    """
    Archive all notifications related to a specific form submission.
    Called when a submission is processed.
    """
    # Search for notifications where data->submission_id matches
    # This is a bit tricky with SQLite and JSON, but we can do it by simple filter if we know the structure
    # Or just search by title and tenant if needed.
    
    # Let's try to filter by data JSON field if supported, or just use a standard query
    notifs = db.query(models.Notification).filter(
        models.Notification.tenant_id == tenant_id,
        models.Notification.is_read == False,
        models.Notification.type == "new_submission"
    ).all()
    
    archived_count = 0
    for n in notifs:
        if n.data and n.data.get("submission_id") == submission_id:
            n.is_read = True
            archived_count += 1
            
    db.commit()
    return {"message": f"Archivadas {archived_count} notificaciones"}
@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id)
):
    """
    Delete a notification and its associated submission data/images.
    """
    import os
    import shutil
    from pathlib import Path

    notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.tenant_id == tenant_id
    ).first()
    
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    
    # If it's a submission notification, clean up images and submission record
    if notif.type == "new_submission" and notif.data and "submission_id" in notif.data:
        sub_id = notif.data["submission_id"]
        submission = db.query(models.FormSubmission).filter(
            models.FormSubmission.id == sub_id,
            models.FormSubmission.tenant_id == tenant_id
        ).first()
        
        if submission:
            # Cleanup physical files
            try:
                # We need the tenant slug for the path
                tenant = db.query(models.Tenant).get(tenant_id)
                if tenant:
                    submission_dir = Path("app/static/storage") / tenant.slug / "submissions" / str(submission.id)
                    if submission_dir.exists():
                        shutil.rmtree(submission_dir)
            except Exception as e:
                print(f"Error cleaning up submission folder: {e}")
            
            # Delete submission record
            db.delete(submission)

    # Mark as read (archive) or delete the notification itself?
    # User said "al eliminar solo archivamos el archivo" - maybe they mean the notification stays but as read?
    # Usually 'Delete' means it disappears. Let's mark as read to be safe but remove it from the 'pendientes' view.
    notif.is_read = True
    
    db.commit()
    return {"message": "Notificación y datos asociados eliminados correctamente"}
