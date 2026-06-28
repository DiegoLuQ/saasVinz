from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
import asyncio
from sqlalchemy.orm import Session
from app.database import get_db, SessionLocal
from app.api.internal.common import models
from app.utils import tz
from app import schemas
from app.auth import get_current_creator, get_current_user
from typing import List

router = APIRouter()

@router.get("/stream")
async def stream_creator_notifications(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Server-Sent Events (SSE) endpoint to stream new notifications to the SuperAdmin dashboard.
    """
    user = get_current_user(db, token=token)
    if user.role != "creator" and user.role != models.UserRole.creator:
        raise HTTPException(
            status_code=403,
            detail="No tienes permisos de SuperAdmin para acceder a este recurso."
        )

    async def event_generator():
        sent_ids = set()
        
        # Send initial unread notifications
        try:
            with SessionLocal() as session:
                initial_notifs = session.query(models.Notification).filter(
                    models.Notification.recipient_type == models.RecipientType.admin,
                    models.Notification.is_read == False
                ).order_by(models.Notification.created_at.desc()).limit(10).all()
                
                for notif in reversed(initial_notifs):
                    notif_data = schemas.NotificationInDB.model_validate(notif).model_dump_json()
                    yield f"event: notification\ndata: {notif_data}\n\n"
                    sent_ids.add(notif.id)
        except Exception:
            pass

        while True:
            try:
                with SessionLocal() as session:
                    new_notifs = session.query(models.Notification).filter(
                        models.Notification.recipient_type == models.RecipientType.admin,
                        models.Notification.is_read == False
                    ).order_by(models.Notification.created_at.desc()).limit(10).all()
                    
                    for notif in reversed(new_notifs):
                        if notif.id not in sent_ids:
                            notif_data = schemas.NotificationInDB.model_validate(notif).model_dump_json()
                            yield f"event: notification\ndata: {notif_data}\n\n"
                            sent_ids.add(notif.id)
            except Exception:
                pass
            
            await asyncio.sleep(5)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("", response_model=schemas.PaginatedNotifications)
def get_creator_notifications(
    skip: int = 0,
    limit: int = 20,
    include_read: bool = False,
    db: Session = Depends(get_db),
    current_creator = Depends(get_current_creator)
):
    """
    Get system-wide notifications for the Creator (SuperAdmin).
    These are notifications where tenant_id is NULL.
    """
    try:
        query = db.query(models.Notification).filter(
            models.Notification.tenant_id == None
        )
        
        if not include_read:
            query = query.filter(models.Notification.is_read == False)
        
        total = query.count()
        items = query.order_by(models.Notification.created_at.desc()).offset(skip).limit(limit).all()
        
        # Process items to ensure R2 URLs are used
        from app.api.internal.common.media_service import MediaService
        processed_items = []
        for item in items:
            # Clone usage if needed, but for response processing we can modify the dict representation or object
            # Since data is JSON, we can check it
            if item.data and isinstance(item.data, dict) and "receipt_url" in item.data:
                # Resolve URL if it's relative
                original_url = item.data["receipt_url"]
                new_url = MediaService.get_public_url(original_url)
                if new_url != original_url:
                    # Create a copy of data to avoid modifying the DB session object directly if unwanted 
                    # (though modifying for display is fine)
                    new_data = item.data.copy()
                    new_data["receipt_url"] = new_url
                    # We can't easily replace item.data on the ORM object without triggering a change
                    # unless we detach it. But simpler is just to return a modified dict list?
                    # Retaining ORM object structure for Pydantic model might be tricky if we don't modify the object.
                    # Let's modify the object in-memory (it won't be committed unless db.commit() is called)
                    item.data = new_data
            processed_items.append(item)
        
        import math
        return {
            "items": processed_items,
            "total": total,
            "page": (skip // limit) + 1,
            "size": limit,
            "pages": math.ceil(total / limit) if limit > 0 else 1
        }
    except Exception as e:
        import traceback
        from datetime import datetime
        error_msg = f"Notifications Error: {str(e)}\n{traceback.format_exc()}"
        with open("critical_error.log", "a") as f:
            f.write(f"\n[{datetime.now()}] {error_msg}\n")
        raise HTTPException(status_code=500, detail=f"Error interno en notificaciones: {str(e)}")

@router.patch("/{notification_id}", response_model=schemas.NotificationInDB)
def mark_creator_notification_read(
    notification_id: int,
    notif_in: schemas.NotificationUpdate,
    db: Session = Depends(get_db),
    current_creator = Depends(get_current_creator)
):
    """
    Mark a system notification as read.
    """
    notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.tenant_id == None
    ).first()
    
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    
    if notif_in.is_read is not None:
        notif.is_read = notif_in.is_read
        
    db.commit()
    db.refresh(notif)
    return notif

@router.post("/mark-all-read")
def mark_all_creator_notifications_read(
    db: Session = Depends(get_db),
    current_creator = Depends(get_current_creator)
):
    """
    Mark all pending system notifications as read.
    """
    db.query(models.Notification).filter(
        models.Notification.tenant_id == None,
        models.Notification.is_read == False
    ).update({models.Notification.is_read: True})
    
    db.commit()
    return {"message": "Todas las notificaciones han sido marcadas como leídas"}

@router.delete("/{notification_id}")
def delete_creator_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_creator = Depends(get_current_creator)
):
    """
    Delete a system notification.
    """
    notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.tenant_id == None
    ).first()
    
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
        
    db.delete(notif)
    db.commit()
    return {"message": "Notificación eliminada exitosamente"}


@router.post("/broadcast", response_model=schemas.NotificationBroadcastResponse)
def broadcast_notification(
    broadcast: schemas.NotificationBroadcast,
    db: Session = Depends(get_db),
    current_creator = Depends(get_current_creator)
):
    """
    Send notifications to multiple recipients (tenants or veterinaries).
    
    Targets:
    - 'all_tenants': Send to all active tenants
    - 'all_veterinaries': Send to all active veterinaries
    - 'specific_tenants': Send to tenant_ids list
    - 'specific_veterinaries': Send to veterinary_ids list
    """
    from datetime import datetime, timedelta
    
    notifications = []
    failed = []
    
    try:
        if broadcast.target == "all_tenants":
            tenants = db.query(models.Tenant).filter(
                models.Tenant.status == 'active'
            ).all()
            
            for tenant in tenants:
                try:
                    notif = models.Notification(
                        recipient_type=models.RecipientType.tenant,
                        tenant_id=tenant.id,
                        veterinary_id=None,
                        type=broadcast.type,
                        title=broadcast.title,
                        message=broadcast.message,
                        priority=broadcast.priority,
                        action_url=broadcast.action_url,
                        data=broadcast.data,
                        expires_at=tz.get_now() + timedelta(days=broadcast.expires_in_days) if broadcast.expires_in_days else None
                    )
                    db.add(notif)
                    notifications.append(notif)
                except Exception as e:
                    failed.append({"tenant_id": tenant.id, "error": str(e)})
        
        elif broadcast.target == "all_veterinaries":
            veterinaries = db.query(models.Veterinary).filter(
                models.Veterinary.is_active == True
            ).all()
            
            for vet in veterinaries:
                try:
                    notif = models.Notification(
                        recipient_type=models.RecipientType.veterinary,
                        tenant_id=None,
                        veterinary_id=vet.id,
                        type=broadcast.type,
                        title=broadcast.title,
                        message=broadcast.message,
                        priority=broadcast.priority,
                        action_url=broadcast.action_url,
                        data=broadcast.data,
                        expires_at=tz.get_now() + timedelta(days=broadcast.expires_in_days) if broadcast.expires_in_days else None
                    )
                    db.add(notif)
                    notifications.append(notif)
                except Exception as e:
                    failed.append({"veterinary_id": vet.id, "error": str(e)})
        
        elif broadcast.target == "specific_tenants":
            if not broadcast.tenant_ids:
                raise HTTPException(status_code=400, detail="tenant_ids requerido para specific_tenants")
            
            for tenant_id in broadcast.tenant_ids:
                tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
                if tenant:
                    try:
                        notif = models.Notification(
                            recipient_type=models.RecipientType.tenant,
                            tenant_id=tenant.id,
                            veterinary_id=None,
                            type=broadcast.type,
                            title=broadcast.title,
                            message=broadcast.message,
                            priority=broadcast.priority,
                            action_url=broadcast.action_url,
                            data=broadcast.data,
                            expires_at=tz.get_now() + timedelta(days=broadcast.expires_in_days) if broadcast.expires_in_days else None
                        )
                        db.add(notif)
                        notifications.append(notif)
                    except Exception as e:
                        failed.append({"tenant_id": tenant_id, "error": str(e)})
                else:
                    failed.append({"tenant_id": tenant_id, "error": "Not found"})
        
        elif broadcast.target == "specific_veterinaries":
            if not broadcast.veterinary_ids:
                raise HTTPException(status_code=400, detail="veterinary_ids requerido para specific_veterinaries")
            
            for vet_id in broadcast.veterinary_ids:
                vet = db.query(models.Veterinary).filter(models.Veterinary.id == vet_id).first()
                if vet:
                    try:
                        notif = models.Notification(
                            recipient_type=models.RecipientType.veterinary,
                            tenant_id=None,
                            veterinary_id=vet.id,
                            type=broadcast.type,
                            title=broadcast.title,
                            message=broadcast.message,
                            priority=broadcast.priority,
                            action_url=broadcast.action_url,
                            data=broadcast.data,
                            expires_at=tz.get_now() + timedelta(days=broadcast.expires_in_days) if broadcast.expires_in_days else None
                        )
                        db.add(notif)
                        notifications.append(notif)
                    except Exception as e:
                        failed.append({"veterinary_id": vet_id, "error": str(e)})
                else:
                    failed.append({"veterinary_id": vet_id, "error": "Not found"})
        
        db.commit()
        
        # Get IDs after commit
        notification_ids = [n.id for n in notifications]
        
        return {
            "message": f"{len(notifications)} notificaciones enviadas exitosamente",
            "count": len(notifications),
            "target": broadcast.target,
            "notification_ids": notification_ids,
            "failed": failed if failed else None
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al enviar notificaciones: {str(e)}")
