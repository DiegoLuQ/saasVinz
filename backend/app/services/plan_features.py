"""Lectura de características del plan (admin → Planes → "Configurar Características").

Para funciones que antes dependían del NOMBRE del plan (widget, formulario
incrustable, video de bienvenida): manda la casilla guardada en
SubscriptionPlan.features; si el plan no la tiene guardada se usa la regla
anterior por nombre, para que nada cambie hasta que el SuperAdmin la marque.
"""

# Módulos que ningún plan bloquea. «configuracion» está aquí para que todos los
# planes lleguen a General (logo y datos), Facturación (cambiar de plan) y
# Notificaciones; sus demás pestañas se controlan con características del plan
# (configuracion:flujo, configuracion:formulario, configuracion:creditos_ia…).
PLAN_EXEMPT_MODULES = frozenset({"dashboard", "perfil", "configuracion"})

# Casilla → planes que la tenían por nombre (regla anterior / valor por defecto)
NAME_FALLBACK: dict[str, set[str]] = {
    "integraciones:widget": {"PRO", "ULTRA"},
    "integraciones:formulario_incrustable": {"ULTRA"},
    "integraciones:video_bienvenida": {"PRO", "ULTRA"},
    # Marca blanca: sin «con tecnología de Vinzer» en lo que ve la familia. Por
    # defecto solo FREE muestra la marca (publicidad gratis de Vinzer).
    "configuracion:sin_marca_vinzer": {"TRACK", "NORMAL", "PRO", "ULTRA"},
}


def plan_code(plan) -> str:
    """Código interno fijo del plan (FREE, TRACK, NORMAL, PRO, ULTRA…). La lógica compara
    el código, nunca el nombre: el SuperAdmin puede renombrar el plan sin romper nada.
    Sin código (filas antiguas) = el nombre en mayúsculas, como antes."""
    if not plan:
        return ""
    return ((getattr(plan, "code", None) or getattr(plan, "name", None) or "").strip().upper())


def make_plan_code(name: str, taken: set[str]) -> str:
    """Código para un plan nuevo a partir de su nombre (único, ≤ 20, A-Z 0-9 _)."""
    import re
    base = re.sub(r"[^A-Z0-9_]+", "_", (name or "").strip().upper()).strip("_")[:20] or "PLAN"
    code, n = base, 2
    while code in taken:
        code = f"{base[:20 - len(str(n)) - 1]}_{n}"
        n += 1
    return code


def plan_has(plan, key: str) -> bool:
    """¿El plan incluye la característica? (usa effective_plan del tenant al llamarla)."""
    if not plan:
        return False
    features = plan.features if isinstance(getattr(plan, "features", None), dict) else {}
    value = features.get(key)
    if isinstance(value, bool):
        return value
    return plan_code(plan) in NAME_FALLBACK.get(key, set())


def tenant_has(tenant, key: str) -> bool:
    return plan_has(tenant.effective_plan if tenant else None, key)


def show_vinzer_brand(tenant) -> bool:
    """¿Las páginas y correos para las familias muestran «con tecnología de Vinzer»?
    (seguimiento, formulario, catálogo, avisos). Sí, salvo que el plan tenga marca blanca."""
    return not tenant_has(tenant, "configuracion:sin_marca_vinzer")
