"""Lectura de características del plan (admin → Planes → "Configurar Características").

Para funciones que antes dependían del NOMBRE del plan (widget, formulario
incrustable, video de bienvenida): manda la casilla guardada en
SubscriptionPlan.features; si el plan no la tiene guardada se usa la regla
anterior por nombre, para que nada cambie hasta que el SuperAdmin la marque.
"""

# Casilla → planes que la tenían por nombre (regla anterior / valor por defecto)
NAME_FALLBACK: dict[str, set[str]] = {
    "integraciones:widget": {"PRO", "ULTRA"},
    "integraciones:formulario_incrustable": {"ULTRA"},
    "integraciones:video_bienvenida": {"PRO", "ULTRA"},
}


def plan_has(plan, key: str) -> bool:
    """¿El plan incluye la característica? (usa effective_plan del tenant al llamarla)."""
    if not plan:
        return False
    features = plan.features if isinstance(getattr(plan, "features", None), dict) else {}
    value = features.get(key)
    if isinstance(value, bool):
        return value
    return (plan.name or "").strip().upper() in NAME_FALLBACK.get(key, set())


def tenant_has(tenant, key: str) -> bool:
    return plan_has(tenant.effective_plan if tenant else None, key)
