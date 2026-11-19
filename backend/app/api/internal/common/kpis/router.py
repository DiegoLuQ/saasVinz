"""Indicadores del crematorio (KPIs). Solo administración (admin / contabilidad /
creator, igual que los montos del Dashboard) y plan con `dashboard:metricas`."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import models
from app.api.deps import get_current_user, get_tenant_id
from app.api.deps_features import check_feature
from app.database import get_db
from app.services import kpis, tenant_plan_impact
from app.utils import tz
from app.utils.time import get_tenant_timezone_str

router = APIRouter()
OWNER_ROLES = ("admin", "contabilidad", "creator")


def _owner(user: models.User) -> None:
    role = getattr(user.role, "value", user.role)
    if (str(role or "")).strip().lower() not in OWNER_ROLES:
        raise HTTPException(status_code=403, detail="Solo la administración puede ver los indicadores")


@router.get("")
def get_kpis(
    year: Optional[int] = Query(default=None, ge=2000, le=2100),
    month: Optional[int] = Query(default=None, ge=1, le=12),
    status: Optional[str] = Query(default="entregados"),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
    _: bool = Depends(check_feature("dashboard:metricas", default=True)),
):
    _owner(current_user)
    tz_name = get_tenant_timezone_str(db, tenant_id)
    years = kpis.available_years(db, tenant_id, tz_name)
    data = kpis.compute(db, tenant_id, year or years[0], month, status=status)
    data["years"] = years
    return data


class TenantPlanEventCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    plan_id: Optional[int] = None
    notes: Optional[str] = Field(None, max_length=2000)
    event_date: Optional[str] = None  # YYYY-MM-DD opcional para cambios pasados


@router.get("/plan-impact")
def get_tenant_plan_impact_endpoint(
    event_id: Optional[int] = Query(default=None),
    window_days: int = Query(default=14, ge=3, le=90),
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
    _: bool = Depends(check_feature("dashboard:metricas", default=True)),
):
    """Bitácora de cambios en planes del crematorio y comparativa Antes vs. Después."""
    _owner(current_user)
    return tenant_plan_impact.get_tenant_plan_impact(
        db, tenant_id=tenant_id, event_id=event_id, window_days=window_days
    )


@router.post("/plan-events")
def create_tenant_plan_event(
    payload: TenantPlanEventCreate,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
    _: bool = Depends(check_feature("dashboard:metricas", default=True)),
):
    """Anota manualmente un cambio de estrategia en planes del crematorio."""
    _owner(current_user)
    plan_name = None
    if payload.plan_id:
        plan = (
            db.query(models.Plan)
            .filter(models.Plan.id == payload.plan_id, models.Plan.tenant_id == tenant_id)
            .first()
        )
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

    event = models.TenantPlanChangeEvent(
        tenant_id=tenant_id,
        plan_id=payload.plan_id,
        plan_name=plan_name,
        event_type="manual_note",
        title=payload.title.strip(),
        notes=payload.notes.strip() if payload.notes else None,
        changes={},
        created_by=getattr(current_user, "id", None),
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
def delete_tenant_plan_event(
    event_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    current_user: models.User = Depends(get_current_user),
    _: bool = Depends(check_feature("dashboard:metricas", default=True)),
):
    """Elimina una anotación de la bitácora de planes del crematorio."""
    _owner(current_user)
    event = (
        db.query(models.TenantPlanChangeEvent)
        .filter(
            models.TenantPlanChangeEvent.id == event_id,
            models.TenantPlanChangeEvent.tenant_id == tenant_id,
        )
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Hito no encontrado")
    db.delete(event)
    db.commit()
    return {"success": True}
