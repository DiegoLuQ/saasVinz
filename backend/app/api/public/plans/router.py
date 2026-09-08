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
from app.api.internal.admin.models import SubscriptionPlan

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

# El widget embebible se habilita por nombre de plan, no por módulo.
# Debe seguir igual que WIDGET_ALLOWED_PLANS en integrations/services.py.
_WIDGET_PLANS = {"PRO", "ULTRA"}


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


def _serialize(plan: SubscriptionPlan) -> PublicPlan:
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
        has_widget=(plan.name or "").upper() in _WIDGET_PLANS,
    )


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

    response.headers["Cache-Control"] = "public, max-age=300"
    return [_serialize(p) for p in plans]
