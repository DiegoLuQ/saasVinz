"""Tablas de precios por peso con nombre (promociones / plantillas).

- Usan los MISMOS rangos de peso de la General (srv_weight_pricing); solo cambian
  precios. Celda vacía = precio de la General.
- Modo recargo (form_config.weight_pricing_mode = "surcharge"): `tier_prices`
  reemplaza el recargo de cada tramo.
- Modo tabla ("table"): `plan_prices[plan][tramo]` reemplaza el precio del plan
  en ese tramo (`srv_plans.weight_prices` es la General).
- Cada enlace del catálogo de planes elige su tabla (`inv_catalog_tokens.price_list_id`,
  NULL = General). El formulario abierto desde ese enlace muestra esos precios y
  la solicitud los congela (snapshot), así la orden creada desde ella los conserva.
- Vigencia: `valid_from` / `valid_until` (fechas, incluidas) e `is_active`. Fuera de
  vigencia el enlace usa la General automáticamente.
"""
from datetime import date
from typing import Any, Optional

from sqlalchemy.orm import Session

from app import models
from app.services.public_form_config import clean_weight_prices, plan_price_for_tier
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


def tier_price(pl: Optional[models.PriceList], tier) -> float:
    """Recargo de un tramo con la tabla (vacío = el de la General)."""
    general = float(tier.price or 0)
    if not pl or not isinstance(pl.tier_prices, dict):
        return general
    value = pl.tier_prices.get(str(tier.id))
    return float(value) if value is not None else general


def plan_weight_prices(pl: Optional[models.PriceList], plan) -> dict:
    """{"<tramo>": precio} del plan: los de la General con los de la tabla encima."""
    base = dict(plan.weight_prices) if isinstance(plan.weight_prices, dict) else {}
    if pl and isinstance(pl.plan_prices, dict):
        base.update(pl.plan_prices.get(str(plan.id)) or {})
    return base


def plan_price(pl: Optional[models.PriceList], plan, tier_id: Any, table: bool) -> float:
    """Precio del plan en un tramo (modo tabla) con la tabla; si no, el de la General."""
    if not pl or not table or tier_id is None:
        return plan_price_for_tier(plan, tier_id, table)
    value = (pl.plan_prices or {}).get(str(plan.id), {}).get(str(tier_id)) if isinstance(pl.plan_prices, dict) else None
    return float(value) if value is not None else plan_price_for_tier(plan, tier_id, table)


def clean_payload(db: Session, tenant_id: int, tier_prices: Any, plan_prices: Any) -> tuple:
    """Deja solo tramos y planes existentes del tenant con montos válidos."""
    tier_ids = {t.id for t in db.query(models.WeightPricing.id).filter(models.WeightPricing.tenant_id == tenant_id)}
    tiers = clean_weight_prices(tier_prices, tier_ids)
    plans_out = {}
    if isinstance(plan_prices, dict):
        plan_ids = {p.id for p in db.query(models.Plan.id).filter(models.Plan.tenant_id == tenant_id)}
        for k, v in plan_prices.items():
            if str(k).isdigit() and int(k) in plan_ids:
                row = clean_weight_prices(v, tier_ids)
                if row:
                    plans_out[str(int(k))] = row
    return tiers, (plans_out or None)

