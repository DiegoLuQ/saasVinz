"""Indicadores del crematorio (KPIs). Solo administración (admin / contabilidad /
creator, igual que los montos del Dashboard) y plan con `dashboard:metricas`."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models
from app.api.deps import get_current_user, get_tenant_id
from app.api.deps_features import check_feature
from app.database import get_db
from app.services import kpis
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
