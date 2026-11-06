"""Tablas de precios con nombre (promociones / plantillas).

- Independientes de la General: cada tabla tiene sus PROPIOS rangos de peso
  (filas de srv_weight_pricing con price_list_id) y el precio final de cada plan
  en cada rango (`plan_prices` = {"<plan>": {"<tramo de la tabla>": precio}}).
  Siempre funcionan como «precio por plan y peso» (sin recargo), aunque la General
  esté en modo recargo. Celda vacía = precio base del plan.
- Cada enlace del catálogo de planes elige su tabla (`inv_catalog_tokens.price_list_id`,
  NULL = General). El catálogo y el formulario abierto desde ese enlace muestran sus
  rangos y precios; la solicitud los congela (snapshot) y la orden creada desde ella
  recuerda la tabla (`oc_financial.price_list_id`) para recalcular con sus rangos.
- Vigencia: `valid_from` / `valid_until` (fechas, incluidas) e `is_active`. Fuera de
  vigencia el enlace usa la General automáticamente (las órdenes ya creadas no cambian).
"""
from datetime import date
from typing import Any, Optional

from sqlalchemy.orm import Session

from app import models
from app.services.public_form_config import (
    clean_weight_prices, get_weight_tiers, plan_price_for_tier, tier_range_text,
)
from app.utils import tz


def today() -> date:
    return tz.get_now().date()


def is_effective(pl: Optional[models.PriceList], on: Optional[date] = None) -> bool:
    if not pl or not pl.is_active:
        return False
    on = on or today()
    if pl.valid_from and on < pl.valid_from:
        return False
    if pl.valid_until and on > pl.valid_until:
        return False
    return True


def status_of(pl: models.PriceList) -> str:
    """activa | programada | vencida | pausada (para mostrar en el panel)."""
    if not pl.is_active:
        return "pausada"
    on = today()
    if pl.valid_from and on < pl.valid_from:
        return "programada"
    if pl.valid_until and on > pl.valid_until:
        return "vencida"
    return "activa"


def effective_for_token(db: Session, token) -> Optional[models.PriceList]:
    """Tabla vigente de un enlace del catálogo (None = General)."""
    pl_id = getattr(token, "price_list_id", None)
    if not pl_id:
        return None
    pl = db.query(models.PriceList).filter(
        models.PriceList.id == pl_id, models.PriceList.tenant_id == token.tenant_id,
    ).first()
    return pl if is_effective(pl) else None


def effective_for_form(db: Session, tenant, form_id: Optional[str] = None) -> Optional[models.PriceList]:
    """Tabla vigente elegida en Configuración para el formulario (None = General)."""
    from app.services.public_form_config import form_price_list_id
    pl_id = form_price_list_id(getattr(tenant, "form_config", None), form_id)
    if not pl_id:
        return None
    pl = db.query(models.PriceList).filter(
        models.PriceList.id == pl_id, models.PriceList.tenant_id == tenant.id,
    ).first()
    return pl if is_effective(pl) else None


def effective_for_request(db: Session, tenant, token: Optional[str] = None, form_id: Optional[str] = None) -> Optional[models.PriceList]:
    """La tabla del enlace del catálogo manda; si no, la del formulario."""
    return effective_for_token_str(db, tenant.id, token) or effective_for_form(db, tenant, form_id)


def remove_from_form_config(tenant, list_id: int) -> None:
    """Al borrar una tabla, los formularios que la usaban vuelven a la General."""
    from sqlalchemy.orm.attributes import flag_modified
    cfg = tenant.form_config if isinstance(tenant.form_config, dict) else None
    if not cfg:
        return
    changed = False
    new = dict(cfg)
    if new.get("price_list_id") == list_id:
        new["price_list_id"] = None
        changed = True
    forms = []
    for cf in new.get("custom_forms") or []:
        if isinstance(cf, dict) and cf.get("price_list_id") == list_id:
            cf = {**cf, "price_list_id": None}
            changed = True
        forms.append(cf)
    if changed:
        new["custom_forms"] = forms
        tenant.form_config = new
        flag_modified(tenant, "form_config")


def effective_for_token_str(db: Session, tenant_id: int, token: Optional[str]) -> Optional[models.PriceList]:
    """Tabla vigente del enlace del catálogo cuyo token abrió el formulario (None = General)."""
    if not token:
        return None
    from app.api.internal.catalog.models import CatalogShareToken
    t = db.query(CatalogShareToken).filter(
        CatalogShareToken.token == token, CatalogShareToken.tenant_id == tenant_id,
        CatalogShareToken.is_active == True,  # noqa: E712
    ).first()
    return effective_for_token(db, t) if t else None


def list_tiers(db: Session, pl: models.PriceList) -> list:
    """Rangos propios de la tabla, ordenados como los de la General."""
    return get_weight_tiers(db, pl.tenant_id, pl.id)


def tier_ids(db: Session, tenant_id: int, pl: Optional[models.PriceList]) -> set:
    return {t.id for t in get_weight_tiers(db, tenant_id, pl.id if pl else None)}


def plan_weight_prices(pl: Optional[models.PriceList], plan) -> dict:
    """{"<tramo>": precio} del plan: los de la tabla (si hay) o los de la General."""
    if pl is not None:
        row = (pl.plan_prices or {}).get(str(plan.id)) if isinstance(pl.plan_prices, dict) else None
        return dict(row) if isinstance(row, dict) else {}
    return dict(plan.weight_prices) if isinstance(plan.weight_prices, dict) else {}


def plan_price(pl: Optional[models.PriceList], plan, tier_id: Any, table: bool) -> float:
    """Precio del plan en un tramo. Con tabla: su celda o el precio base del plan."""
    if pl is None:
        return plan_price_for_tier(plan, tier_id, table)
    base = float(plan.price or 0.0)
    if tier_id is None:
        return base
    value = plan_weight_prices(pl, plan).get(str(tier_id))
    return float(value) if value is not None else base


def order_payload(db: Session, pl: Optional[models.PriceList]) -> Optional[dict]:
    """Lo que necesita el formulario de orden para recalcular con la tabla."""
    if pl is None:
        return None
    tiers = list_tiers(db, pl)
    ids = {t.id for t in tiers}
    return {
        "id": pl.id,
        "name": pl.name,
        "tiers": [{"id": t.id, "label": t.label, "min_weight": t.min_weight or 0,
                   "max_weight": t.max_weight, "price": 0, "icon_url": t.icon_url, "examples": t.examples,
                   "range_text": tier_range_text(t.min_weight, t.max_weight)} for t in tiers],
        "plan_prices": {k: (clean_weight_prices(v, ids) or {})
                        for k, v in (pl.plan_prices or {}).items() if isinstance(v, dict)},
    }
