"""Precio anual de los planes y precio congelado de cada crematorio.

- El descuento anual es uno solo para todos los planes y lo define el
  SuperAdmin (sys_saas_config.annual_discount_pct; `annual_discount_launch`
  = mostrarlo como "precio de lanzamiento para los primeros crematorios").
- sys_subscription_plans.annual_price se recalcula al cambiar el descuento o el
  precio mensual de un plan: mensual × 12 × (1 − %). Es el valor que leen el
  cobro (billing/change-plan-request, Polar), la landing y las páginas de planes.
- Lo que paga un crematorio queda congelado en sys_tenants.contracted_price
  (monto por ciclo) al aprobarse su contratación o al sincronizar Polar, así un
  cambio posterior del descuento o del precio no le afecta.
"""
from sqlalchemy.orm import Session

from app import models

DEFAULT_ANNUAL_DISCOUNT = 25
MAX_ANNUAL_DISCOUNT = 60

CYCLE_MONTHS = {"monthly": 1, "bimonthly": 2, "semiannual": 6, "annual": 12}


def _config(db: Session):
    return db.query(models.SaaSConfig).first()


def get_annual_discount(db: Session) -> dict:
    cfg = _config(db)
    pct = cfg.annual_discount_pct if cfg and cfg.annual_discount_pct is not None else DEFAULT_ANNUAL_DISCOUNT
    launch = bool(cfg.annual_discount_launch) if cfg and cfg.annual_discount_launch is not None else True
    return {"pct": int(pct), "launch": launch}


def annual_price_for(monthly: float | None, pct: int) -> float | None:
    """Precio anual de un plan de pago; None para planes gratuitos."""
    if not monthly or monthly <= 0:
        return None
    return float(round(monthly * 12 * (1 - pct / 100)))


def apply_annual_price(db: Session, plan) -> None:
    if plan.price and plan.price > 0:
        plan.annual_price = annual_price_for(plan.price, get_annual_discount(db)["pct"])


def set_annual_discount(db: Session, pct: int, launch: bool) -> dict:
    """Guarda el descuento y recalcula el precio anual de todos los planes."""
    cfg = _config(db)
    if cfg is None:
        cfg = models.SaaSConfig(name="Vinzer")
        db.add(cfg)
    cfg.annual_discount_pct = pct
    cfg.annual_discount_launch = launch
    for plan in db.query(models.SubscriptionPlan).all():
        if plan.price and plan.price > 0:
            plan.annual_price = annual_price_for(plan.price, pct)
    db.commit()
    return {"pct": pct, "launch": launch}


def cycle_price(plan, cycle: str | None) -> float:
    """Monto por ciclo a precio de lista actual (para una contratación nueva)."""
    if not plan or not plan.price:
        return 0.0
    if cycle == "annual":
        return float(plan.annual_price or plan.price * 12)
    return float(plan.price * CYCLE_MONTHS.get(cycle or "monthly", 1))


def lock_contracted_price(tenant, amount: float | None, cycle: str | None) -> None:
    """Congela lo que paga el crematorio por ciclo (y su equivalente mensual / MRR)."""
    if not amount or amount <= 0:
        return
    tenant.contracted_price = float(amount)
    if tenant.billing_info is not None:
        tenant.billing_info.monthly_price = float(amount) / CYCLE_MONTHS.get(cycle or "monthly", 1)
