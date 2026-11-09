"""Planes de memorial (rec_plans), separados de los planes del SaaS.

- kind «vinzer»: los que Vinzer vende directo a las familias (Recuerdo, Eterno, Infinito).
- kind «partner»: el plan con que nace todo memorial creado por un crematorio.
- kind «legacy»: planes antiguos; un memorial con uno de ellos se rige por Partner.

Precio, moneda, cobro y límites se editan en Admin → Memoriales → «Planes y precios».
Lo que paga cada familia queda congelado en el memorial (`plan_price`, `plan_currency`,
`plan_billing`), así que subir precios solo afecta a los clientes nuevos.
"""
from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.internal.memorials import models as mem_models

KIND_VINZER = "vinzer"
KIND_PARTNER = "partner"
BILLING_YEARLY = "yearly"
BILLING_ONE_TIME = "one_time"
BILLING_INCLUDED = "included"
BILLINGS = (BILLING_YEARLY, BILLING_ONE_TIME, BILLING_INCLUDED)
YEAR_DAYS = 365

# Límites y funciones de un plan (rec_plans.features). Lo que falta toma estos valores (= Partner).
FEATURE_DEFAULTS: dict = {
    "max_images": 3,              # fotos de la galería
    "max_dedications": 20,        # mensajes publicados (velas/flores/besos son ilimitados)
    "max_dedication_chars": 500,  # largo de cada mensaje
    "max_melodies": 1,            # melodías que el dueño puede guardar (elige cuál suena)
    "qr": False,                  # descargar código QR
    "timeline": False,            # línea de tiempo
    "max_timeline": 0,            # momentos de la línea de tiempo
    "max_videos": 0,              # videos de 30 s
    "max_voice": 0,               # audios de su voz de 30 s
    "expired_images": 3,          # lo que se ve con el plan vencido
    "expired_dedications": 5,
}
# Escenarios de diseño incluidos (features.scenarios). Sin dato = solo Santuario Sereno (= Partner).
SCENARIOS = ("normal", "altar", "cielo", "constelacion")
SCENARIO_NAMES = {"normal": "Santuario Sereno", "altar": "Altar de Luz", "cielo": "Jardín Celestial",
                  "constelacion": "Constelación Eterna"}
DEFAULT_SCENARIOS = ["normal"]

INT_FEATURES = {k for k, v in FEATURE_DEFAULTS.items() if isinstance(v, int) and not isinstance(v, bool)}
BOOL_FEATURES = {k for k, v in FEATURE_DEFAULTS.items() if isinstance(v, bool)}
FEATURE_MAX = {
    "max_images": 500, "max_dedications": 5000, "max_dedication_chars": 2000, "max_melodies": 10,
    "max_timeline": 500, "max_videos": 5, "max_voice": 5, "expired_images": 50, "expired_dedications": 100,
}


def clean_scenarios(value) -> list[str]:
    """Lista válida en el orden fijo de SCENARIOS; vacía o inválida = solo Santuario Sereno."""
    chosen = set(value) if isinstance(value, (list, tuple, set)) else set()
    out = [s for s in SCENARIOS if s in chosen]
    return out or list(DEFAULT_SCENARIOS)


def features_of(plan: mem_models.MemorialPlan | None) -> dict:
    raw = (plan.features or {}) if plan else {}
    out = dict(FEATURE_DEFAULTS)
    out["scenarios"] = clean_scenarios(raw.get("scenarios"))
    for k in INT_FEATURES:
        v = raw.get(k)
        if k == "max_dedications" and v is None:
            v = raw.get("velas")  # clave antigua
        if v is not None:
            try:
                out[k] = max(0, int(v))
            except (TypeError, ValueError):
                pass
    for k in BOOL_FEATURES:
        if k in raw:
            out[k] = bool(raw[k])
    return out


def clean_features(data: dict | None, base: dict | None = None) -> dict:
    """Valida lo que llega desde Admin (enteros acotados, booleanos)."""
    out = features_of(None) | {k: v for k, v in (base or {}).items()}
    for k, v in (data or {}).items():
        if k in INT_FEATURES:
            try:
                out[k] = min(max(0, int(v)), FEATURE_MAX[k])
            except (TypeError, ValueError):
                continue
        elif k in BOOL_FEATURES:
            out[k] = bool(v)
        elif k == "scenarios":
            out[k] = clean_scenarios(v)
    out["scenarios"] = clean_scenarios(out.get("scenarios"))
    out.pop("velas", None)
    return {k: out[k] for k in FEATURE_DEFAULTS} | {k: v for k, v in out.items() if k not in FEATURE_DEFAULTS}


def partner_plan(db: Session) -> mem_models.MemorialPlan | None:
    return db.query(mem_models.MemorialPlan).filter(mem_models.MemorialPlan.kind == KIND_PARTNER).order_by(
        mem_models.MemorialPlan.id).first()


def vinzer_plans(db: Session, only_active: bool = True) -> list[mem_models.MemorialPlan]:
    q = db.query(mem_models.MemorialPlan).filter(mem_models.MemorialPlan.kind == KIND_VINZER)
    if only_active:
        q = q.filter(mem_models.MemorialPlan.is_active.is_(True))
    return q.order_by(mem_models.MemorialPlan.sort_order, mem_models.MemorialPlan.price).all()


def get_vinzer_plan(db: Session, key: str | None) -> mem_models.MemorialPlan | None:
    if not key:
        return None
    return db.query(mem_models.MemorialPlan).filter(
        mem_models.MemorialPlan.kind == KIND_VINZER, mem_models.MemorialPlan.name_db == key.strip().lower()
    ).first()


def plan_of(db: Session, memorial: mem_models.Memorial) -> mem_models.MemorialPlan | None:
    """Plan que rige el memorial: su plan_id (Vinzer o Partner), si no el plan Vinzer por nombre, si no Partner."""
    p = memorial.memorial_plan if memorial.plan_id else None
    if p is not None and p.kind in (KIND_VINZER, KIND_PARTNER):
        return p
    by_name = get_vinzer_plan(db, memorial.plan)
    return by_name or partner_plan(db)


def is_vinzer(db: Session, memorial: mem_models.Memorial) -> bool:
    p = plan_of(db, memorial)
    return bool(p and p.kind == KIND_VINZER)


def limits(db: Session, memorial: mem_models.Memorial) -> dict:
    return features_of(plan_of(db, memorial))


def check_scenario(db: Session, memorial: mem_models.Memorial, new_scenario: str | None) -> None:
    """400 si se pide cambiar a un escenario que el plan del memorial no incluye. El que ya
    tiene se mantiene aunque el plan no lo incluya (no se cambia nada solo)."""
    if not new_scenario:
        return
    current = (memorial.diseno or {}).get("tipo_diseno") if isinstance(memorial.diseno, dict) else None
    if new_scenario == (current or "normal"):
        return
    plan = plan_of(db, memorial)
    if new_scenario not in features_of(plan)["scenarios"]:
        name = SCENARIO_NAMES.get(new_scenario, new_scenario)
        raise HTTPException(status_code=400, detail=f"El diseño «{name}» no está incluido en el plan {plan.name if plan else 'del memorial'}.")


def discount_of(plan: mem_models.MemorialPlan | None) -> float:
    """Porcentaje de descuento vigente (0 a 95) guardado en default_config o features."""
    if not plan or plan.kind == KIND_PARTNER:
        return 0.0
    cfg = plan.default_config if isinstance(plan.default_config, dict) else {}
    feat = plan.features if isinstance(plan.features, dict) else {}
    raw = cfg.get("discount_percent", feat.get("discount_percent", 0))
    try:
        val = float(raw or 0)
        return round(min(max(0.0, val), 95.0), 2)
    except (TypeError, ValueError):
        return 0.0


def discount_label_of(plan: mem_models.MemorialPlan | None) -> str | None:
    """Etiqueta promocional opcional (p. ej. 'Oferta lanzamiento')."""
    if not plan or plan.kind == KIND_PARTNER:
        return None
    cfg = plan.default_config if isinstance(plan.default_config, dict) else {}
    feat = plan.features if isinstance(plan.features, dict) else {}
    label = str(cfg.get("discount_label") or feat.get("discount_label") or "").strip()
    return label[:40] if label else None


def set_discount(plan: mem_models.MemorialPlan, percent: float | None, label: str | None = None) -> None:
    """Actualiza el porcentaje de descuento y la etiqueta promocional en default_config."""
    cfg = dict(plan.default_config) if isinstance(plan.default_config, dict) else {}
    if percent is not None:
        cfg["discount_percent"] = round(min(max(0.0, float(percent)), 95.0), 2)
    if label is not None:
        clean_lbl = label.strip()[:40]
        if clean_lbl:
            cfg["discount_label"] = clean_lbl
        else:
            cfg.pop("discount_label", None)
    plan.default_config = cfg


def effective_price(plan: mem_models.MemorialPlan | None) -> float:
    """Precio final tras aplicar el descuento vigente."""
    if not plan:
        return 0.0
    base = float(plan.price or 0)
    disc = discount_of(plan)
    if disc <= 0 or base <= 0:
        return base
    discounted = base * (100.0 - disc) / 100.0
    return float(int(discounted + 0.5))


def assign(memorial: mem_models.Memorial, plan: mem_models.MemorialPlan, *, start_period: bool) -> None:
    """Asigna el plan y congela su precio efectivo actual (con descuento si aplica).
    Con `start_period` fija la vigencia (anual = hoy + 1 año; pago único = sin vencimiento)."""
    memorial.plan_id = plan.id
    memorial.plan = plan.name_db
    memorial.plan_price = effective_price(plan)
    memorial.plan_currency = plan.currency or "USD"
    memorial.plan_billing = plan.billing or BILLING_YEARLY
    if plan.billing == BILLING_ONE_TIME:
        memorial.valid_until = None
    elif start_period and plan.billing == BILLING_YEARLY:
        memorial.valid_until = datetime.now() + timedelta(days=YEAR_DAYS)


def serialize(plan: mem_models.MemorialPlan) -> dict:
    base_price = float(plan.price or 0)
    disc = discount_of(plan)
    final_price = effective_price(plan)
    return {
        "id": plan.id,
        "key": plan.name_db,
        "name": plan.name,
        "kind": plan.kind,
        "price": base_price,
        "original_price": base_price,
        "final_price": final_price,
        "discount_percent": disc,
        "discount_label": discount_label_of(plan),
        "currency": plan.currency or "USD",
        "billing": plan.billing,
        "description": plan.description,
        "highlight": bool(plan.highlight),
        "sort_order": plan.sort_order or 0,
        "is_active": bool(plan.is_active),
        "features": features_of(plan),
    }


def contract(memorial: mem_models.Memorial) -> dict | None:
    """Precio congelado del memorial (None si no tiene)."""
    if memorial.plan_price is None:
        return None
    return {"price": memorial.plan_price, "currency": memorial.plan_currency or "USD", "billing": memorial.plan_billing}
