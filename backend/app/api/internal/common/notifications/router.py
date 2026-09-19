import math
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import auth
from app import models
from app import schemas
from app.database import get_db
from app.api.deps import get_tenant_id
from app.api.internal.admin.rbac.router import check_permission
from app.api.internal.common.notifications import audience as aud

router = APIRouter()


def _serialize(notifs, read_set):
    """El `is_read` que ve el usuario es el suyo (o global si quedó resuelta)."""
    return [
        schemas.NotificationInDB.model_validate(n).model_copy(update={"is_read": n.is_read or n.id in read_set})
        for n in notifs
    ]


def _get_visible(db: Session, user: models.User, notification_id: int) -> models.Notification:
    audiences = aud.user_audiences(db, user)
    notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.tenant_id == user.tenant_id,
        models.Notification.audience.in_(audiences),
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    return notif


@router.get("", response_model=schemas.PaginatedNotifications)
def get_my_notifications(
    skip: int = 0,
    limit: int = 15,
    include_read: bool = False,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Notificaciones del tenant visibles para el usuario actual (según su rol),
    paginadas. Por defecto solo las no leídas por él; include_read=true trae todas
    menos las que él descartó.
    """
    audiences = aud.user_audiences(db, current_user)
    query = aud.visible_notifications(db, current_user, audiences, include_read=include_read)

    total = query.count()
    items = query.order_by(models.Notification.created_at.desc()).offset(skip).limit(limit).all()
    read_set = aud.read_ids(db, current_user.id, [n.id for n in items])

    return {
        "items": _serialize(items, read_set),
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
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Marca la notificación como leída/no leída SOLO para el usuario actual."""
    notif = _get_visible(db, current_user, notification_id)

    if notif_in.is_read is not None:
        aud.mark_for_user(db, notif.id, current_user.id, read=notif_in.is_read)

    db.commit()
    db.refresh(notif)
    read_set = aud.read_ids(db, current_user.id, [notif.id])
    return _serialize([notif], read_set)[0]


@router.post("/archive-by-submission/{submission_id}")
def archive_submission_notifications(
    submission_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _perm: bool = Depends(check_permission("ordenes", "view")),
):
    """
    Resuelve (para todos) las notificaciones de una solicitud web ya procesada:
    la solicitud dejó de estar pendiente, así que el aviso no aplica a nadie.
    """
    notifs = db.query(models.Notification).filter(
        models.Notification.tenant_id == tenant_id,
        models.Notification.is_read == False,  # noqa: E712
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
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    - Solicitud web: elimina la solicitud y sus imágenes (requiere permiso de
      borrar órdenes) y la notificación queda resuelta para todos.
    - Cualquier otra: se descarta solo para el usuario actual; el resto del
      equipo (y el dueño) la sigue viendo.
    """
    notif = _get_visible(db, current_user, notification_id)

    submission = None
    if notif.type == "new_submission" and notif.data and "submission_id" in notif.data:
        submission = db.query(models.FormSubmission).filter(
            models.FormSubmission.id == notif.data["submission_id"],
            models.FormSubmission.tenant_id == tenant_id
        ).first()

    if submission:
        check_permission("ordenes", "delete")(db=db, current_user=current_user)
        try:
            tenant = db.query(models.Tenant).get(tenant_id)
            if tenant:
                submission_dir = Path("app/static/storage") / tenant.slug / "submissions" / str(submission.id)
                if submission_dir.exists():
                    shutil.rmtree(submission_dir)
        except Exception as e:
            print(f"Error cleaning up submission folder: {e}")
        db.delete(submission)
        notif.is_read = True
        db.commit()
        return {"message": "Notificación y datos asociados eliminados correctamente"}

    aud.mark_for_user(db, notif.id, current_user.id, dismissed=True)
    db.commit()
    return {"message": "Notificación descartada"}
