"""Métricas del negocio (SuperAdmin): MRR, crematorios por plan, altas/subidas/bajas
por mes, crematorios en riesgo y oportunidades. Lógica en services/business_metrics.py."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import get_current_creator
from app.database import get_db
from app.services import business_metrics

router = APIRouter()


@router.get("")
def business_summary(db: Session = Depends(get_db), _creator=Depends(get_current_creator)):
    return business_metrics.summary(db)
