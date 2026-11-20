"""Temporadas de precios de los planes SaaS («Lanzamiento», «Regular», «Black Friday»…).

Admin → Planes → «Temporadas de precios». Cada temporada (sys_price_seasons) tiene
un precio mensual por plan, su % de descuento anual, el aviso «precio de lanzamiento»
y, opcional, otra temporada de referencia cuyo precio la web muestra tachado.

Una sola está vigente (`is_current`) y la activa el SuperAdmin a mano. Activarla
COPIA sus precios a sys_subscription_plans (price, annual_price = mensual × 12 ×
(1 − %)) y su % / aviso a sys_saas_config: la landing, /comparar-planes, la
facturación del crematorio, el admin y el PDF siguen leyendo el plan como siempre.
Editar el precio de un plan o el descuento anual desde las otras tarjetas se guarda
también en la temporada vigente (las dos fuentes nunca se desfasan).

Los crematorios que ya contrataron no cambian: su monto quedó en
sys_tenants.contracted_price (para siempre) y `contracted_season` guarda el nombre
de la temporada con que contrataron (plan_pricing.lock_contracted_price).
Polar.sh queda fuera por ahora (sus productos tienen precio propio).
"""
from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app import models
from app.services.plan_pricing import MAX_ANNUAL_DISCOUNT, annual_price_for
from app.utils import tz

MAX_SEASONS = 20
MAX_NAME = 60


def _plans(db: Session) -> list:
    return db.query(models.SubscriptionPlan).order_by(
        models.SubscriptionPlan.display_order.asc(), models.SubscriptionPlan.price.asc()).all()


def current(db: Session):
    return db.query(models.PriceSeason).filter(models.PriceSeason.is_current.is_(True)).first()


def current_name(db: Session) -> str | None:
    s = current(db)
    return s.name if s else None


def _price_of(season, plan) -> float:
    """Precio mensual del plan en la temporada (sin dato = el precio actual del plan)."""
    raw = (season.prices or {}).get(str(plan.id)) if season else None
    try:
        return float(raw) if raw is not None else float(plan.price or 0)
    except (TypeError, ValueError):
        return float(plan.price or 0)


def serialize(season, plans: list) -> dict:
    rows = []
    for p in plans:
        monthly = _price_of(season, p)
        rows.append({
            "plan_id": p.id, "name": p.name, "code": getattr(p, "code", None), "is_active": p.is_active,
            "monthly": monthly, "annual": annual_price_for(monthly, season.annual_discount_pct),
        })
    return {
        "id": season.id, "name": season.name, "annual_discount_pct": season.annual_discount_pct,
        "launch": bool(season.launch), "compare_season_id": season.compare_season_id,
        "is_current": bool(season.is_current),
        "activated_at": season.activated_at.isoformat() if season.activated_at else None,
        "rows": rows,
    }


def list_seasons(db: Session) -> list[dict]:
    plans = _plans(db)
    seasons = db.query(models.PriceSeason).order_by(
        models.PriceSeason.is_current.desc(), models.PriceSeason.id.asc()).all()
    return [serialize(s, plans) for s in seasons]


def _clean(db: Session, payload: dict, season_id: int | None = None) -> dict:
    name = " ".join(str(payload.get("name") or "").split())[:MAX_NAME]
    if not name:
        raise HTTPException(status_code=400, detail="La temporada necesita un nombre")
    q = db.query(models.PriceSeason).filter(models.PriceSeason.name.ilike(name))
    if season_id:
        q = q.filter(models.PriceSeason.id != season_id)
    if q.first():
        raise HTTPException(status_code=400, detail=f"Ya existe una temporada «{name}»")
    try:
        pct = int(payload.get("annual_discount_pct") or 0)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Descuento anual inválido")
    if not 0 <= pct <= MAX_ANNUAL_DISCOUNT:
        raise HTTPException(status_code=400, detail=f"El descuento anual debe estar entre 0 y {MAX_ANNUAL_DISCOUNT} %")
    plan_ids = {p.id for p in db.query(models.SubscriptionPlan.id).all()}
    prices: dict[str, float] = {}
    for k, v in (payload.get("prices") or {}).items():
        try:
            pid, amount = int(k), float(v)
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Precio inválido")
        if pid not in plan_ids:
            continue
        if amount < 0 or amount > 100_000_000:
            raise HTTPException(status_code=400, detail="Precio fuera de rango")
        prices[str(pid)] = float(round(amount))
    compare = payload.get("compare_season_id")
    if compare in ("", None):
        compare = None
    else:
        compare = int(compare)
        if compare == season_id or not db.get(models.PriceSeason, compare):
            raise HTTPException(status_code=400, detail="Temporada de referencia inválida")
    return {"name": name, "annual_discount_pct": pct, "launch": bool(payload.get("launch")),
            "prices": prices, "compare_season_id": compare}


def create(db: Session, payload: dict) -> dict:
    if db.query(models.PriceSeason).count() >= MAX_SEASONS:
        raise HTTPException(status_code=400, detail=f"Máximo {MAX_SEASONS} temporadas")
    data = _clean(db, payload)
    base = current(db)
    if not data["prices"]:  # sin precios = copia de la vigente (o de los planes)
        data["prices"] = {str(p.id): _price_of(base, p) for p in _plans(db)}
    season = models.PriceSeason(**data, is_current=False)
    db.add(season)
    db.commit()
    return serialize(season, _plans(db))


def update(db: Session, season_id: int, payload: dict) -> dict:
    season = db.get(models.PriceSeason, season_id)
    if not season:
        raise HTTPException(status_code=404, detail="Temporada no encontrada")
    data = _clean(db, payload, season_id)
    for k, v in data.items():
        setattr(season, k, v)
    season.updated_at = tz.get_now()
    if season.is_current:
        _materialize(db, season)
    db.commit()
    return serialize(season, _plans(db))


def delete(db: Session, season_id: int) -> None:
    season = db.get(models.PriceSeason, season_id)
    if not season:
        raise HTTPException(status_code=404, detail="Temporada no encontrada")
    if season.is_current:
        raise HTTPException(status_code=409, detail="No se puede eliminar la temporada vigente: activa otra primero")
    db.query(models.PriceSeason).filter(models.PriceSeason.compare_season_id == season.id).update(
        {models.PriceSeason.compare_season_id: None})
    db.delete(season)
    db.commit()


def activate(db: Session, season_id: int) -> dict:
    """Deja vigente la temporada y copia sus precios a los planes."""
    season = db.get(models.PriceSeason, season_id)
    if not season:
        raise HTTPException(status_code=404, detail="Temporada no encontrada")
    if not season.is_current:
        db.query(models.PriceSeason).filter(models.PriceSeason.is_current.is_(True)).update(
            {models.PriceSeason.is_current: False})
        db.flush()
        season.is_current = True
        season.activated_at = tz.get_now()
    _materialize(db, season)
    db.commit()
    return serialize(season, _plans(db))


def _materialize(db: Session, season) -> None:
    cfg = db.query(models.SaaSConfig).first()
    if cfg is None:
        cfg = models.SaaSConfig(name="Vinzer")
        db.add(cfg)
    cfg.annual_discount_pct = season.annual_discount_pct
    cfg.annual_discount_launch = bool(season.launch)
    for plan in _plans(db):
        monthly = _price_of(season, plan)
        plan.price = monthly
        if monthly > 0:
            plan.annual_price = annual_price_for(monthly, season.annual_discount_pct)


# ===== Sincronía con las otras tarjetas de Admin → Planes =====

def sync_plan_price(db: Session, plan) -> None:
    """El precio mensual editado en la tarjeta del plan queda también en la temporada vigente."""
    season = current(db)
    if season and plan.id is not None:
        prices = dict(season.prices or {})
        prices[str(plan.id)] = float(plan.price or 0)
        season.prices = prices


def sync_discount(db: Session, pct: int, launch: bool) -> None:
    season = current(db)
    if season:
        season.annual_discount_pct = pct
        season.launch = bool(launch)


# ===== Web: precio tachado =====

def compare_prices(db: Session) -> dict[int, dict]:
    """{plan_id: {"monthly", "annual"}} de la temporada de referencia de la vigente, solo
    cuando es mayor que el precio actual (ej. ~~$292.000~~ $119.000 en el Lanzamiento)."""
    season = current(db)
    ref = db.get(models.PriceSeason, season.compare_season_id) if season and season.compare_season_id else None
    if not ref:
        return {}
    out = {}
    for plan in _plans(db):
        monthly = _price_of(ref, plan)
        if plan.price and monthly > float(plan.price):
            annual = annual_price_for(monthly, ref.annual_discount_pct)
            out[plan.id] = {"monthly": monthly,
                            "annual": annual if annual and plan.annual_price and annual > float(plan.annual_price) else None}
    return out


def public_info(db: Session) -> dict:
    """Nombre de la temporada vigente y de la de referencia (para la etiqueta en la web)."""
    season = current(db)
    ref = db.get(models.PriceSeason, season.compare_season_id) if season and season.compare_season_id else None
    return {"season": season.name if season else None, "compare_season": ref.name if ref else None}


def payload_from(raw: Any) -> dict:
    return raw if isinstance(raw, dict) else {}
