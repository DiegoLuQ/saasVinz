"""Avisos a la familia desde el panel y resumen de la encuesta de satisfacción.

Prefijo /api/internal/operations (mismo que el panel de trabajo). La lógica de
envío vive en app/services/family_notices.py.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models
from app.api.deps import get_current_user, get_tenant_id
from app.database import get_db
from app.services import family_notices as fn

router = APIRouter()


def _order(db: Session, cremation_id: int, tenant_id: int):
    c = db.query(models.Cremation).filter(models.Cremation.id == cremation_id, models.Cremation.tenant_id == tenant_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    return c


@router.get("/ops/orders/{cremation_id}/family-notices")
def list_family_notices(
    cremation_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
):
    """Avisos enviados a la familia de esta orden y con qué datos de contacto se cuenta."""
    c = _order(db, cremation_id, tenant_id)
    customer = c.pet.customer if c.pet and c.pet.customer else None
    rows = db.query(models.FamilyNotice).filter(models.FamilyNotice.cremation_id == c.id) \
        .order_by(models.FamilyNotice.created_at.desc()).all()
    steps = {s.id: s.name for s in db.query(models.WorkflowStep).filter(models.WorkflowStep.tenant_id == tenant_id).all()}
    return {
        "enabled": fn.feature_on(c.tenant),
        "email": (customer.email or None) if customer else None,
        "phone": (customer.phone or None) if customer else None,
        "notices": [{
            "id": r.id, "kind": r.kind, "channel": r.channel, "sent_to": r.sent_to,
            "step_id": r.step_id, "step_name": steps.get(r.step_id), "created_at": r.created_at,
        } for r in rows],
    }


class NoticeRequest(BaseModel):
    step_id: Optional[int] = None


@router.post("/ops/orders/{cremation_id}/family-notices/whatsapp")
def whatsapp_notice(
    cremation_id: int,
    data: NoticeRequest,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
):
    """Arma el mensaje de WhatsApp (link wa.me) y lo deja registrado."""
    c = _order(db, cremation_id, tenant_id)
    if not fn.feature_on(c.tenant):
        raise HTTPException(status_code=403, detail="Los avisos a la familia no están incluidos en tu plan")
    step_id = data.step_id or (c.technical.step_id if c.technical else None)  # sin indicar = fase actual
    result = fn.whatsapp_message(db, c.id, step_id)
    if not result.get("url"):
        raise HTTPException(status_code=422, detail="El cliente no tiene un celular válido registrado")
    fn.record_whatsapp(db, c.id, step_id, current_user.id)
    return result


@router.post("/ops/orders/{cremation_id}/family-notices/email")
async def email_notice(
    cremation_id: int,
    data: NoticeRequest,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
):
    """Envía (o reenvía) el correo a la familia: de la fase indicada o, si la orden
    está entregada, el de agradecimiento con la encuesta."""
    c = _order(db, cremation_id, tenant_id)
    if c.status in ("entregado", "completado") and not data.step_id:
        result = await fn.send_finish_email(db, c.id, current_user.id, force=True)
    else:
        step_id = data.step_id or (c.technical.step_id if c.technical else None)
        if not step_id:
            raise HTTPException(status_code=422, detail="La orden aún no tiene una fase")
        result = await fn.send_step_email(db, c.id, step_id, current_user.id, force=True)
    if not result.get("sent"):
        reasons = {"no_email": "El cliente no tiene correo registrado",
                   "plan": "Los avisos a la familia no están incluidos en tu plan"}
        raise HTTPException(status_code=422, detail=reasons.get(result.get("reason"), "No se pudo enviar el aviso"))
    return result


class NoticesConfig(BaseModel):
    on_finish: bool


@router.get("/family-notices/config")
def get_notices_config(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
):
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    return {**fn.notices_config(tenant), "enabled": fn.feature_on(tenant)}


@router.put("/family-notices/config")
def update_notices_config(
    data: NoticesConfig,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in (models.UserRole.admin, models.UserRole.creator):
        raise HTTPException(status_code=403, detail="Solo el administrador puede cambiar los avisos")
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    tenant.family_notices = {**(tenant.family_notices or {}), "on_finish": data.on_finish}
    db.commit()
    return {**fn.notices_config(tenant), "enabled": fn.feature_on(tenant)}


@router.get("/feedback/summary")
def feedback_summary(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
):
    """Promedio de la encuesta de las familias, distribución y últimos comentarios."""
    fb = models.ServiceFeedback
    avg, count = db.query(func.avg(fb.rating), func.count(fb.id)).filter(fb.tenant_id == tenant_id).one()
    dist = dict(db.query(fb.rating, func.count(fb.id)).filter(fb.tenant_id == tenant_id).group_by(fb.rating).all())
    recent = db.query(fb, models.Pet.name).join(models.Cremation, models.Cremation.id == fb.cremation_id) \
        .outerjoin(models.Pet, models.Pet.id == models.Cremation.pet_id) \
        .filter(fb.tenant_id == tenant_id).order_by(fb.created_at.desc()).limit(5).all()
    return {
        "average": round(float(avg), 2) if avg else None,
        "count": count,
        "distribution": {str(i): dist.get(i, 0) for i in range(1, 6)},
        "recent": [{"rating": r.rating, "comment": r.comment, "pet_name": pet, "created_at": r.created_at,
                    "cremation_id": r.cremation_id} for r, pet in recent],
    }
