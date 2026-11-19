"""
Endpoints de analítica y telemetría de módulos para SuperAdmin (Creator).
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import models
from app.auth import get_current_creator
from app.database import get_db
from app.services import module_telemetry, plan_impact
from app.utils import tz

router = APIRouter()


class PlanEventCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    plan_id: Optional[int] = None
    notes: Optional[str] = Field(None, max_length=2000)
    event_date: Optional[str] = None  # YYYY-MM-DD opcional para retroactivos


@router.get("/module-stats")
def get_module_stats(
    days: int = Query(30, ge=1, le=365),
    tenant_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator)
):
    """
    Retorna métricas agregadas de uso de módulos por clic en sidebar.
    """
    return module_telemetry.get_stats(db, days=days, tenant_id=tenant_id)


@router.get("/plan-impact")
def get_plan_impact(
    event_id: Optional[int] = Query(None),
    window_days: int = Query(14, ge=3, le=90),
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    """
    Retorna la bitácora de cambios en planes y la comparativa Antes vs. Después
    de ventas, ingresos y upgrades para el hito seleccionado.
    """
    return plan_impact.get_plan_impact_analysis(db, event_id=event_id, window_days=window_days)


@router.post("/plan-events")
def create_plan_event(
    payload: PlanEventCreate,
    db: Session = Depends(get_db),
    creator=Depends(get_current_creator),
):
    """
    Registra manualmente un hito estratégico en planes (ej. cambio de servicio entre planes).
    """
    plan_name = None
    if payload.plan_id:
        plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.id == payload.plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Plan no encontrado")
        plan_name = plan.name

    created_at = tz.get_now()
    if payload.event_date:
        try:
            parsed = datetime.strptime(payload.event_date.strip(), "%Y-%m-%d")
            created_at = parsed.replace(tzinfo=created_at.tzinfo)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha inválido (usa YYYY-MM-DD)")

    event = models.PlanChangeEvent(
        plan_id=payload.plan_id,
        plan_name=plan_name,
        event_type="manual_note",
        title=payload.title.strip(),
        notes=payload.notes.strip() if payload.notes else None,
        changes={},
        created_by=getattr(creator, "id", None),
        created_at=created_at,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return {
        "id": event.id,
        "plan_id": event.plan_id,
        "plan_name": event.plan_name,
        "event_type": event.event_type,
        "title": event.title,
        "notes": event.notes,
        "changes": event.changes or {},
        "created_at": event.created_at.isoformat() if event.created_at else None,
    }


@router.delete("/plan-events/{event_id}")
def delete_plan_event(
    event_id: int,
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    """Elimina una anotación/hito de la bitácora de planes."""
    event = db.query(models.PlanChangeEvent).filter(models.PlanChangeEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Hito no encontrado")
    db.delete(event)
    db.commit()
    return {"success": True}
