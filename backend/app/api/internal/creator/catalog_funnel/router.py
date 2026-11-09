"""KPIs del catálogo de planes (SuperAdmin): enlaces creados por crematorio y el
embudo vistas → tamaño → solicitar → formulario → enviado → orden.
Lógica en services/catalog_funnel.py."""
from datetime import date, datetime, time, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth import get_current_creator
from app.core.tenant_context import apply_bypass_rls
from app.database import get_db
from app.services import catalog_funnel
from app.utils import tz

router = APIRouter()


def _start(d: Optional[date]) -> Optional[datetime]:
    return datetime.combine(d, time.min, tzinfo=tz.get_now().tzinfo) if d else None


@router.get("")
def catalog_funnel_report(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    tenant_id: Optional[int] = Query(None),
    tracking_stage: str = Query("in_progress", pattern="^(in_progress|delivered|all)$"),
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    apply_bypass_rls(db)
    # date_to es inclusivo: se cuenta hasta el final de ese día
    end = _start(date_to + timedelta(days=1)) if date_to else None
    return catalog_funnel.report(db, _start(date_from), end, tenant_id, tracking_stage)


@router.get("/form")
def official_form_funnel(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    tenant_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    """Hasta dónde llegan las familias en el formulario oficial de cada crematorio (services/form_funnel.py)."""
    from app.services import form_funnel

    apply_bypass_rls(db)
    end = _start(date_to + timedelta(days=1)) if date_to else None
    return form_funnel.report(db, _start(date_from), end, tenant_id)


@router.get("/tenant/{tenant_id}")
def tenant_tracking_detail(
    tenant_id: int,
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    tracking_stage: str = Query("in_progress", pattern="^(in_progress|delivered|all)$"),
    db: Session = Depends(get_db),
    _creator=Depends(get_current_creator),
):
    """Detalle de un crematorio: enlaces, aperturas de seguimiento/memorial, avisos (services/tenant_tracking.py)."""
    from app.services import tenant_tracking

    apply_bypass_rls(db)
    end = _start(date_to + timedelta(days=1)) if date_to else None
    data = tenant_tracking.detail(db, tenant_id, _start(date_from), end, tracking_stage)
    if data is None:
        raise HTTPException(status_code=404, detail="Crematorio no encontrado")
    return data
