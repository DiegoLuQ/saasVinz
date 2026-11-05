"""Tablas de precios por peso (promociones / plantillas): Configuración →
Formulario y Pesos → Pesos y precios. Lógica en app/services/price_lists.py."""
from datetime import date
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import auth, models
from app.api.deps import get_tenant_id
from app.api.deps_features import check_feature
from app.api.internal.admin.rbac.router import check_permission
from app.api.internal.catalog.models import CatalogShareToken
from app.core.tenant_context import apply_tenant_rls
from app.database import get_db
from app.services import price_lists as svc

router = APIRouter(prefix="/api/internal/price-lists", tags=["Catálogo - Tablas de precios"])

FORM_FEATURE = check_feature("configuracion:formulario", default=True)
MAX_LISTS = 30


class PriceListIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    tier_prices: Optional[Dict[str, Any]] = None
    plan_prices: Optional[Dict[str, Dict[str, Any]]] = None
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None
    is_active: bool = True


def _out(db: Session, pl: models.PriceList) -> dict:
    links = db.query(func.count(CatalogShareToken.id)).filter(
        CatalogShareToken.tenant_id == pl.tenant_id, CatalogShareToken.price_list_id == pl.id,
    ).scalar() or 0
    return {
        "id": pl.id,
        "name": pl.name,
        "tier_prices": pl.tier_prices or {},
        "plan_prices": pl.plan_prices or {},
        "valid_from": pl.valid_from,
        "valid_until": pl.valid_until,
        "is_active": pl.is_active,
        "status": svc.status_of(pl),
        "links": links,
    }


def _apply(db: Session, tenant_id: int, pl: models.PriceList, data: PriceListIn) -> None:
    name = " ".join(data.name.split())
    if not name:
        raise HTTPException(status_code=400, detail="Escribe un nombre para la tabla.")
    if name.lower() == "general":
        raise HTTPException(status_code=400, detail="«General» es la tabla principal: usa otro nombre.")
    clash = db.query(models.PriceList).filter(
        models.PriceList.tenant_id == tenant_id,
        func.lower(models.PriceList.name) == name.lower(),
        models.PriceList.id != (pl.id or 0),
    ).first()
    if clash:
        raise HTTPException(status_code=400, detail=f"Ya existe una tabla llamada «{name}».")
    if data.valid_from and data.valid_until and data.valid_until < data.valid_from:
        raise HTTPException(status_code=400, detail="La fecha «hasta» no puede ser anterior a «desde».")
    pl.name = name
    pl.tier_prices, pl.plan_prices = svc.clean_payload(db, tenant_id, data.tier_prices, data.plan_prices)
    pl.valid_from = data.valid_from
    pl.valid_until = data.valid_until
    pl.is_active = data.is_active


@router.get("")
def list_price_lists(
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: models.User = Depends(auth.get_current_user),
):
    rows = db.query(models.PriceList).filter(models.PriceList.tenant_id == tenant_id) \
        .order_by(models.PriceList.created_at.asc()).all()
    return [_out(db, pl) for pl in rows]


@router.post("")
def create_price_list(
    data: PriceListIn,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: models.User = Depends(check_permission("configuracion", "edit")),
    _f: bool = Depends(FORM_FEATURE),
):
    count = db.query(func.count(models.PriceList.id)).filter(models.PriceList.tenant_id == tenant_id).scalar() or 0
    if count >= MAX_LISTS:
        raise HTTPException(status_code=400, detail=f"Máximo {MAX_LISTS} tablas de precios.")
    pl = models.PriceList(tenant_id=tenant_id)
    _apply(db, tenant_id, pl, data)
    db.add(pl)
    db.commit()
    apply_tenant_rls(db, tenant_id)
    db.refresh(pl)
    return _out(db, pl)


def _get(db: Session, tenant_id: int, list_id: int) -> models.PriceList:
    pl = db.query(models.PriceList).filter(
        models.PriceList.id == list_id, models.PriceList.tenant_id == tenant_id,
    ).first()
    if not pl:
        raise HTTPException(status_code=404, detail="Tabla de precios no encontrada")
    return pl


@router.put("/{list_id}")
def update_price_list(
    list_id: int,
    data: PriceListIn,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: models.User = Depends(check_permission("configuracion", "edit")),
    _f: bool = Depends(FORM_FEATURE),
):
    pl = _get(db, tenant_id, list_id)
    _apply(db, tenant_id, pl, data)
    db.commit()
    apply_tenant_rls(db, tenant_id)
    db.refresh(pl)
    return _out(db, pl)


@router.delete("/{list_id}", status_code=204)
def delete_price_list(
    list_id: int,
    db: Session = Depends(get_db),
    tenant_id: int = Depends(get_tenant_id),
    _: models.User = Depends(check_permission("configuracion", "edit")),
    _f: bool = Depends(FORM_FEATURE),
):
    """Borra la tabla; los enlaces que la usaban vuelven a la General.
    Las solicitudes y órdenes ya creadas conservan sus precios."""
    pl = _get(db, tenant_id, list_id)
    db.query(CatalogShareToken).filter(
        CatalogShareToken.tenant_id == tenant_id, CatalogShareToken.price_list_id == pl.id,
    ).update({CatalogShareToken.price_list_id: None}, synchronize_session=False)
    db.delete(pl)
    db.commit()
