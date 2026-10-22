"""
Endpoint público de planes de suscripción para la landing comercial.

Razón de existir: la sección de precios de la landing tenía los topes y los
precios escritos a mano en el JSX y se desvió de la BD (PRO anunciaba 80
órdenes / 10 usuarios cuando el sistema aplica 60 / 4, y el precio anual se
calculaba en el navegador ignorando `annual_price`, que es el campo que usa
facturación para cobrar). Exponer los planes desde aquí cierra esa deriva:
la web muestra exactamente lo que `LimitChecker` aplica.

Solo lectura, sin autenticación y sin datos sensibles: no se exponen los IDs
de Polar/Stripe ni nada que no sea público por naturaleza.
"""
from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.core.rate_limiter import limiter
from app.api.internal.admin.models import SaaSConfig, SubscriptionPlan

router = APIRouter()

# Módulos que la landing traduce a "sí / no" en la tabla comparativa.
# Se derivan de `allowed_modules`, que es lo que realmente controla el acceso.
_FEATURE_MODULES = {
    "certificados": "certificates",
    "configuracion": "config",
    "operaciones": "operations",
    "veterinarios": "veterinaries",
    "memoriales": "memorials",
    "pagos": "payments",
}

# El widget embebible es una característica del plan (admin → Configurar Características),
# con la regla anterior por nombre si el plan no la tiene guardada.
from app.services.plan_features import plan_has
from app.services.landing_features import get_landing_features, plan_offers


class PublicPlan(BaseModel):
    name: str
    description: Optional[str] = None
    display_order: int

    price: float
    annual_price: Optional[float] = None
    # Ahorro anual en pesos respecto de pagar 12 meses sueltos. None si el plan
    # no tiene precio anual definido en la BD (hoy: FREE y Track).
    annual_savings: Optional[float] = None

    # Topes mensuales (se cuentan por mes calendario en LimitChecker).
    max_pets: int
    max_orders: int
    max_customers: int

    # Topes totales acumulados, NO mensuales.
    max_users: int
    max_partners: int
    max_services: int
    max_products: int

    can_export: bool
    has_certificates: bool
    has_config: bool
    has_operations: bool
    has_veterinaries: bool
    has_memorials: bool
    has_payments: bool
    has_widget: bool
    # Módulos y características del plan tal como los deja el SuperAdmin
    # (Admin → Planes): la landing arma con ellos la comparación entre planes.
    modules: List[str] = []
    features: dict[str, bool] = {}
    # Claves de «Funciones en la web» que el plan incluye (ver /plans/highlights).
    offers: List[str] = []
    # Créditos IA (1 crédito = 1 diseño con IA): incluidos al mes, precio del
    # crédito adicional (USD por plan × tipo de cambio fijo) e intentos por diseño.
    ai_monthly_credits: int = 0
    ai_extra_credit_usd: Optional[float] = None
    ai_extra_credit_clp: Optional[int] = None
    ai_attempts_per_credit: int = 3


def _features(plan: SubscriptionPlan) -> dict[str, bool]:
    """Características con valor explícito (falta = permitida) + integraciones, que
    sin valor guardado usan la regla anterior por nombre de plan (plan_has)."""
    raw = plan.features if isinstance(plan.features, dict) else {}
    out = {k: v for k, v in raw.items() if isinstance(v, bool)}
    for key in ("integraciones:widget", "integraciones:formulario_incrustable", "integraciones:video_bienvenida"):
        out[key] = plan_has(plan, key)
    return out


def _serialize(plan: SubscriptionPlan, highlight_keys: List[str] | None = None, ai: dict | None = None) -> PublicPlan:
    modules = set(plan.allowed_modules or [])

    annual = plan.annual_price
    # annual_price = 0 en FREE es un precio real ($0), no "sin precio anual".
    # Solo se calcula ahorro cuando hay un plan de pago con anual definido.
    savings = None
    if annual and plan.price:
        raw = (plan.price * 12) - annual
        savings = raw if raw > 0 else None

    return PublicPlan(
        name=plan.name,
        description=plan.description,
        display_order=plan.display_order or 0,
        price=plan.price or 0.0,
        annual_price=annual,
        annual_savings=savings,
        max_pets=plan.max_pets or 0,
        max_orders=plan.max_orders or 0,
        max_customers=plan.max_customers or 0,
        max_users=plan.max_users or 0,
        max_partners=plan.max_partners or 0,
        max_services=plan.max_services or 0,
        max_products=plan.max_products or 0,
        can_export=bool(plan.can_export),
        has_certificates="certificados" in modules,
        has_config="configuracion" in modules,
        has_operations="operaciones" in modules,
        has_veterinaries="veterinarios" in modules,
        has_memorials="memoriales" in modules,
        has_payments="pagos" in modules,
        has_widget=plan_has(plan, "integraciones:widget"),
        modules=sorted(modules),
        features=_features(plan),
        offers=[k for k in (highlight_keys or []) if plan_offers(plan, k)],
        **_ai_credit_fields(plan, ai or {}),
    )


def _ai_context(db: Session) -> dict:
    from app.services import ai_credits
    reference, attempts, _days = ai_credits._config(db)
    cfg = db.query(SaaSConfig).first()
    rate = (cfg.usd_clp_rate if cfg else None) or ai_credits.DEFAULT_USD_CLP_RATE
    return {"reference": reference, "attempts": attempts, "rate": rate}


def _ai_credit_fields(plan: SubscriptionPlan, ai: dict) -> dict:
    from app.services.ai_credits import to_clp
    if not ai:
        return {}
    own = getattr(plan, "ai_extra_credit_price_usd", None)
    unit = float(own) if own is not None else ai["reference"]
    return {
        "ai_monthly_credits": int(getattr(plan, "ai_monthly_credits", 0) or 0),
        "ai_extra_credit_usd": unit,
        "ai_extra_credit_clp": to_clp(unit, ai["rate"]) if unit else None,
        "ai_attempts_per_credit": int(ai["attempts"] or 3),
    }


@router.get("/plans", response_model=List[PublicPlan])
@limiter.limit("60/minute")
def list_public_plans(request: Request, response: Response, db: Session = Depends(get_db)):
    """
    Devuelve los planes activos, ordenados como se muestran en la landing.

    Cacheado 5 minutos: los precios cambian por migración, no por request.
    """
    plans = (
        db.query(SubscriptionPlan)
        .filter(SubscriptionPlan.is_active == True)  # noqa: E712
        .order_by(SubscriptionPlan.display_order.asc(), SubscriptionPlan.price.asc())
        .all()
    )

    response.headers["Cache-Control"] = "public, max-age=60"
    keys = [f["key"] for f in get_landing_features(db)]
    ai = _ai_context(db)
    return [_serialize(p, keys, ai) for p in plans]


@router.get("/plans/annual-discount")
@limiter.limit("60/minute")
def public_annual_discount(request: Request, response: Response, db: Session = Depends(get_db)):
    """Descuento por pago anual y si se anuncia como precio de lanzamiento
    (Configuración de Planes del SuperAdmin). Lo usa la landing."""
    from app.services.plan_pricing import get_annual_discount

    response.headers["Cache-Control"] = "public, max-age=60"
    return get_annual_discount(db)


@router.get("/plans/highlights")
@limiter.limit("60/minute")
def public_plan_highlights(request: Request, response: Response, db: Session = Depends(get_db)):
    """Funciones que la web muestra al comparar planes, en orden, con su nombre
    público y grupo. Cada plan de /plans trae en `offers` las que incluye."""
    response.headers["Cache-Control"] = "public, max-age=60"
    return get_landing_features(db)
