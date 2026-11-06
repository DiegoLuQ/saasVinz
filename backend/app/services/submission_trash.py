"""Papelera de registros web (solicitudes del formulario).

«Eliminar» deja el registro con status 'deleted': se conservan datos y fotos,
sale de la bandeja y de la campana, y se puede restaurar. El borrado definitivo
(fila + fotos que nadie más usa) es `purge_submission` y solo se permite desde
la papelera."""
from sqlalchemy.orm import Session

from app import models
from app.utils import tz

DELETED = "deleted"
PROCESSED = "processed"
PENDING = "pending"


def _remove_bell(db: Session, tenant_id: int, submission_id: int) -> None:
    for n in db.query(models.Notification).filter(
        models.Notification.tenant_id == tenant_id,
        models.Notification.type == "new_submission",
    ).all():
        if isinstance(n.data, dict) and n.data.get("submission_id") == submission_id:
            db.delete(n)


def has_order(db: Session, submission: models.FormSubmission) -> bool:
    if not submission.pet_id:
        return False
    return db.query(models.Cremation.id).filter(
        models.Cremation.tenant_id == submission.tenant_id,
        models.Cremation.pet_id == submission.pet_id,
    ).first() is not None


def soft_delete(db: Session, submission: models.FormSubmission, user_id: int | None) -> None:
    if submission.status == DELETED:
        return
    submission.status = DELETED
    submission.deleted_at = tz.get_now()
    submission.deleted_by = user_id
    _remove_bell(db, submission.tenant_id, submission.id)
    db.commit()


def restore(db: Session, submission: models.FormSubmission) -> str:
    """Vuelve a pendiente; si ya generó una orden, a 'processed' (no se duplica)."""
    submission.status = PROCESSED if has_order(db, submission) else PENDING
    submission.deleted_at = None
    submission.deleted_by = None
    db.commit()
    return submission.status
