"""Descuento por convenio en una orden de cremación.

La orden guarda una copia de las condiciones del convenio (`agreement_terms`) al
asignarlo; el monto se recalcula siempre con esa copia sobre los ítems actuales
de la orden. Así editar el convenio no cambia órdenes ya registradas, pero
cambiar los ítems de la orden sí actualiza su descuento.

Alcance: % en planes, % en ánforas/productos y % en un servicio especial. El
recargo por peso no se descuenta. El descuento manual (%) de la orden se aplica
después, sobre el subtotal ya rebajado (mismo cálculo en el frontend:
`lib/tenant/orders/calculations.ts`).
"""
from typing import Optional


def _pct(v) -> float:
    try:
        return max(0.0, min(100.0, float(v or 0)))
    except (TypeError, ValueError):
        return 0.0


def terms_from(agreement) -> dict:
    """Copia de las condiciones del convenio que queda guardada en la orden."""
    return {
        "rut": agreement.rut,
        "plans_pct": _pct(agreement.plans_discount_pct),
        "products_pct": _pct(agreement.products_discount_pct),
        "special_service_id": agreement.special_service_id,
        "special_service_name": agreement.special_service_name,
        "special_service_pct": _pct(agreement.special_service_discount_pct) if agreement.special_service_id else 0.0,
    }


def compute_discount(terms: Optional[dict], servicios, planes, productos) -> float:
    """Monto a descontar. Ítems: objetos o dicts con precio_venta, cantidad (+ service_id)."""
    if not terms:
        return 0.0

    def g(item, key):
        return item.get(key) if isinstance(item, dict) else getattr(item, key, None)

    def line(item) -> float:
        qty = g(item, "cantidad")
        return float(g(item, "precio_venta") or 0) * float(1 if qty is None else qty)

    plans = sum(line(p) for p in planes or [])
    prods = sum(line(p) for p in productos or [])
    special_id = terms.get("special_service_id")
    special = sum(line(s) for s in servicios or [] if special_id and g(s, "service_id") == special_id)

    amount = (
        plans * _pct(terms.get("plans_pct")) / 100
        + prods * _pct(terms.get("products_pct")) / 100
        + special * _pct(terms.get("special_service_pct")) / 100
    )
    return round(amount, 2)


FEATURE = "clientes:convenios"


def enabled_for(db, tenant_id: int) -> bool:
    """¿El plan del tenant incluye convenios? Sin marcar = incluido (igual que check_feature)."""
    from app import models
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    plan = getattr(tenant, "effective_plan", None) or getattr(tenant, "subscription_plan", None) if tenant else None
    features = plan.features if plan is not None and isinstance(plan.features, dict) else {}
    return features.get(FEATURE) is not False
