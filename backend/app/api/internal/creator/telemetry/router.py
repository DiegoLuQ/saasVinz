"""
Endpoints de analítica y telemetría de módulos para SuperAdmin (Creator).
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import get_current_creator
from app.database import get_db
from app.services import module_telemetry

router = APIRouter()


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
