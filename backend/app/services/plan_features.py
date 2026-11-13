"""Lectura de características del plan (admin → Planes → "Configurar Características" y Matriz de Planes).

Para funciones que antes dependían del NOMBRE del plan (widget, formulario
incrustable, video de bienvenida): manda la casilla guardada en
SubscriptionPlan.features; si el plan no la tiene guardada se usa la regla
anterior por nombre, para que nada cambie hasta que el SuperAdmin la marque.

También soporta tiempos de vida (trials / vigencia temporal) por módulo o
característica guardados en `SubscriptionPlan.features["__trials__"]`:
  - `mode == "days"`: N días de acceso desde la fecha de alta del tenant (`created_at`).
  - `mode == "until"`: acceso válido hasta una fecha límite (`YYYY-MM-DD`).
"""
from datetime import datetime, timedelta, timezone
import math

# Módulos que ningún plan bloquea. «configuracion» está aquí para que todos los
# planes lleguen a General (logo y datos), Facturación (cambiar de plan) y
# Notificaciones; sus demás pestañas se controlan con características del plan
# (configuracion:flujo, configuracion:formulario, configuracion:creditos_ia…).
PLAN_EXEMPT_MODULES = frozenset({"dashboard", "perfil", "configuracion"})

TRIALS_KEY = "__trials__"
TRIAL_STATUS_KEY = "__trial_status__"

# Casilla → planes que la tenían por nombre (regla anterior / valor por defecto)
NAME_FALLBACK: dict[str, set[str]] = {
    "integraciones:widget": {"PRO", "ULTRA"},
    "integraciones:formulario_incrustable": {"ULTRA"},
    "integraciones:video_bienvenida": {"PRO", "ULTRA"},
    # Marca blanca: sin «con tecnología de Vinzer» en lo que ve la familia. Por
    # defecto solo FREE muestra la marca (publicidad gratis de Vinzer).
    "configuracion:sin_marca_vinzer": {"TRACK", "NORMAL", "PRO", "ULTRA"},
    # Planes comerciales y catálogos de servicios
    "servicios:planes:gestionar": {"TRACK", "NORMAL", "PRO", "ULTRA"},
    "servicios:planes:catalogo": {"TRACK", "NORMAL", "PRO", "ULTRA"},
    "servicios:planes:descargar_pdf": {"TRACK", "NORMAL", "PRO", "ULTRA"},
    "configuracion:enlaces_oficiales": {"TRACK", "NORMAL", "PRO", "ULTRA"},
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


def get_plan_trials(plan) -> dict[str, dict]:
    """Devuelve el mapa de configuraciones de tiempo de vida (`__trials__`) del plan."""
    if not plan:
        return {}
    features = getattr(plan, "features", None)
    if not isinstance(features, dict):
        return {}
    raw = features.get(TRIALS_KEY)
    if not isinstance(raw, dict):
        return {}
    return {k: v for k, v in raw.items() if isinstance(v, dict)}


def _to_utc(dt) -> datetime | None:
    if dt is None:
        return None
    if isinstance(dt, str):
        try:
            s = dt.strip()
            if len(s) == 10:  # YYYY-MM-DD -> fin del día UTC
                return datetime.fromisoformat(s + "T23:59:59+00:00")
            return datetime.fromisoformat(s.replace("Z", "+00:00"))
        except Exception:
            return None
    if isinstance(dt, datetime):
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    return None


def evaluate_trial_rule(rule: dict | None, tenant=None, now: datetime | None = None) -> dict | None:
    """Evalúa una regla `{mode: 'days'|'until', days?: int, until?: str}` para un tenant."""
    if not isinstance(rule, dict):
        return None
    mode = rule.get("mode")
    if mode not in ("days", "until"):
        return None

    now_utc = _to_utc(now) or datetime.now(timezone.utc)
    expires_at: datetime | None = None

    if mode == "days":
        days = int(rule.get("days") or 0)
        if days <= 0:
            return None
        start_dt = _to_utc(getattr(tenant, "created_at", None)) if tenant is not None else None
        if start_dt is None:
            # Sin tenant (consulta estática del plan): reporta la regla como activa
            return {
                "mode": "days",
                "days": days,
                "is_trial": True,
                "expired": False,
                "days_left": days,
                "expires_at": None,
            }
        expires_at = start_dt + timedelta(days=days)
    elif mode == "until":
        until_str = str(rule.get("until") or "").strip()
        expires_at = _to_utc(until_str)
        if expires_at is None:
            return None

    diff_sec = (expires_at - now_utc).total_seconds()
    expired = diff_sec < 0
    days_left = 0 if expired else max(1, math.ceil(diff_sec / 86400.0))

    return {
        "mode": mode,
        "days": rule.get("days"),
        "until": rule.get("until"),
        "is_trial": True,
        "expired": expired,
        "days_left": days_left,
        "expires_at": expires_at.isoformat(),
    }


def get_key_trial_status(plan, key: str, tenant=None) -> dict | None:
    """Evalúa si `key` (ej. 'mascotas:memorial' o 'module:operaciones') tiene tiempo de vida.
    Si es una característica (`modulo:feat`) y no tiene regla propia, hereda la de `module:<modulo>`."""
    trials = get_plan_trials(plan)
    if not trials:
        return None
    rule = trials.get(key)
    if not rule and ":" in key and not key.startswith("module:"):
        mod_key = key.split(":", 1)[0]
        rule = trials.get(f"module:{mod_key}")
    return evaluate_trial_rule(rule, tenant=tenant)


def is_module_trial_expired(plan, module_key: str, tenant=None) -> bool:
    if module_key in PLAN_EXEMPT_MODULES:
        return False
    st = get_key_trial_status(plan, f"module:{module_key}", tenant=tenant)
    return bool(st and st.get("expired"))


def effective_allowed_modules(plan, tenant=None) -> list[str]:
    """Módulos permitidos por el plan descontando aquellos cuyo tiempo de vida venció para el tenant."""
    if not plan:
        return []
    raw = list(getattr(plan, "allowed_modules", None) or [])
    if tenant is None:
        return raw
    return [m for m in raw if not is_module_trial_expired(plan, m, tenant=tenant)]


def plan_has(plan, key: str, default: bool | None = None) -> bool:
    """¿El plan incluye la característica? (usa effective_plan del tenant al llamarla)."""
    if not plan:
        return False
    features = plan.features if isinstance(getattr(plan, "features", None), dict) else {}
    value = features.get(key)
    if isinstance(value, bool):
        return value
    if default is not None:
        return default
    return plan_code(plan) in NAME_FALLBACK.get(key, set())


def tenant_has(tenant, key: str, default: bool | None = None) -> bool:
    plan = tenant.effective_plan if tenant else None
    if not plan:
        return False
    if not plan_has(plan, key, default=default):
        return False
    st = get_key_trial_status(plan, key, tenant=tenant)
    if st and st.get("expired"):
        return False
    return True


def build_tenant_effective_features(plan, tenant) -> dict:
    """Construye el diccionario `features` efectivo para enviar al frontend del tenant en `/bootstrap`:
    - Si un módulo o característica con trial ya expiró para este tenant, su flag pasa a `False`.
    - Adjunta `__trial_status__` con `{is_trial, expired, days_left, expires_at, mode}` por clave."""
    if not plan:
        return {}
    raw_features = plan.features if isinstance(getattr(plan, "features", None), dict) else {}
    result = dict(raw_features)
    trials = get_plan_trials(plan)
    if not trials:
        return result

    trial_status_map: dict[str, dict] = {}
    for k, rule in trials.items():
        st = evaluate_trial_rule(rule, tenant=tenant)
        if not st:
            continue
        trial_status_map[k] = st
        if st.get("expired"):
            if k.startswith("module:"):
                mod_prefix = k.split(":", 1)[1] + ":"
                for feat_key in list(result.keys()):
                    if feat_key.startswith(mod_prefix) and isinstance(result.get(feat_key), bool):
                        result[feat_key] = False
            else:
                result[k] = False

    # También propagar estado de trial de módulo a sus features hijas si están activas
    for feat_key, val in list(result.items()):
        if feat_key.startswith("__") or not isinstance(val, bool):
            continue
        if feat_key not in trial_status_map and ":" in feat_key:
            mod_key = feat_key.split(":", 1)[0]
            mod_st = trial_status_map.get(f"module:{mod_key}")
            if mod_st:
                trial_status_map[feat_key] = mod_st
                if mod_st.get("expired"):
                    result[feat_key] = False

    result[TRIAL_STATUS_KEY] = trial_status_map
    return result


def show_vinzer_brand(tenant) -> bool:
    """¿Las páginas y correos para las familias muestran «con tecnología de Vinzer»?
    (seguimiento, formulario, catálogo, avisos). Sí, salvo que el plan tenga marca blanca."""
    return not tenant_has(tenant, "configuracion:sin_marca_vinzer")
