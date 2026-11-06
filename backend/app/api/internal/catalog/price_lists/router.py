"""Tablas de precios (promociones / plantillas): Configuración → Formulario y Pesos →
Pesos y precios. Cada tabla tiene sus propios rangos de peso y el precio de cada
plan según el peso. Lógica en app/services/price_lists.py."""
from datetime import date
from typing import Dict, List, Optional

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
from app.services.public_form_config import clean_tier_examples, clean_tier_icon, resolve_tier_inputs

router = APIRouter(prefix="/api/internal/price-lists", tags=["Catálogo - Tablas de precios"])

FORM_FEATURE = check_feature("configuracion:formulario", default=True)
MAX_LISTS = 30
MAX_PRICE = 100_000_000


class PriceListTierIn(BaseModel):
    label: Optional[str] = Field(default=None, max_length=40)
    min_weight: Optional[float] = None
    max_weight: Optional[float] = None
    icon_url: Optional[str] = Field(default=None, max_length=500)
    examples: Optional[str] = Field(default=None, max_length=60)


class PriceListIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    tiers: List[PriceListTierIn] = Field(default_factory=list)
    # {"<id plan>": [precio por posición del rango | null]}; null/vacío = precio base del plan
    plan_prices: Dict[str, List[Optional[float]]] = Field(default_factory=dict)
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None
    is_active: bool = True


def _out(db: Session, pl: models.PriceList) -> dict:
    links = db.query(func.count(CatalogShareToken.id)).filter(
        CatalogShareToken.tenant_id == pl.tenant_id, CatalogShareToken.price_list_id == pl.id,
    ).scalar() or 0
    data = svc.order_payload(db, pl)
    return {
        **data,
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
    if not data.tiers:
        raise HTTPException(status_code=400, detail="Agrega al menos un rango de peso.")
    resolved = resolve_tier_inputs(data.tiers)

    pl.name = name
    pl.valid_from = data.valid_from
    pl.valid_until = data.valid_until
    pl.is_active = data.is_active
    if pl.id is None:
        db.add(pl)
        db.flush()

    # Rangos propios: se reutilizan las filas por posición (conservan su id, igual que la General).
    existing = svc.list_tiers(db, pl)
    rows = []
    for idx, (t, min_w) in enumerate(resolved):
        row = existing[idx] if idx < len(existing) else models.WeightPricing(tenant_id=tenant_id, price_list_id=pl.id)
        row.label = (t.label or "").strip() or None
        row.min_weight = min_w
        row.max_weight = t.max_weight
        row.price = 0  # sin recargo: el peso va en el precio del plan
        row.icon_url = clean_tier_icon(t.icon_url)
        row.examples = clean_tier_examples(t.examples)
        if idx >= len(existing):
            db.add(row)
        rows.append(row)
    for row in existing[len(resolved):]:
        db.delete(row)
    db.flush()

    plan_ids = {p.id for p in db.query(models.Plan.id).filter(models.Plan.tenant_id == tenant_id)}
    prices = {}
    for k, values in (data.plan_prices or {}).items():
        if not str(k).isdigit() or int(k) not in plan_ids:
            continue
        row_prices = {}
        for idx, v in enumerate(values or []):
            if v is None or idx >= len(rows):
                continue
            if v < 0 or v > MAX_PRICE:
                raise HTTPException(status_code=400, detail="Precio fuera de rango")
            row_prices[str(rows[idx].id)] = float(v)
        if row_prices:
            prices[str(int(k))] = row_prices
    pl.plan_prices = prices or None


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
    """Borra la tabla y sus rangos; los enlaces que la usaban vuelven a la General.
    Las solicitudes y órdenes ya creadas conservan sus precios."""
    pl = _get(db, tenant_id, list_id)
    db.query(CatalogShareToken).filter(
        CatalogShareToken.tenant_id == tenant_id, CatalogShareToken.price_list_id == pl.id,
    ).update({CatalogShareToken.price_list_id: None}, synchronize_session=False)
    db.query(models.CremationFinancial).filter(
        models.CremationFinancial.tenant_id == tenant_id, models.CremationFinancial.price_list_id == pl.id,
    ).update({models.CremationFinancial.price_list_id: None}, synchronize_session=False)
    db.query(models.WeightPricing).filter(
        models.WeightPricing.tenant_id == tenant_id, models.WeightPricing.price_list_id == pl.id,
    ).delete(synchronize_session=False)
    from app.services.price_lists import remove_from_form_config
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if tenant:
        remove_from_form_config(tenant, pl.id)
    db.delete(pl)
    db.commit()
