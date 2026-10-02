"""Configuración del formulario público (el que se envía a la familia).

Cada crematorio decide qué campos opcionales de "Datos del cliente" y "Datos
de la mascota" se muestran y cuáles son obligatorios. Se guarda en
sys_tenants.form_config; NULL o claves ausentes = DEFAULT_FIELDS, que
reproducen el formulario tal como estaba antes de esta configuración.

Campos fijos (siempre visibles y obligatorios, no configurables): nombre y
teléfono del cliente; nombre y especie de la mascota.

También concentra los tramos de peso (srv_weight_pricing), definidos como
"hasta X kg": el tramo i cubre (max anterior, max_i]; el último puede ser
abierto (max_weight NULL).
"""
from typing import Any
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app import models

MAX_WEIGHT_TIERS = 12

# key -> (sección, etiqueta, visible por defecto, obligatorio por defecto)
DEFAULT_FIELDS: dict[str, tuple[str, str, bool, bool]] = {
    # Datos del cliente
    "rut": ("owner", "RUT", False, False),
    "email": ("owner", "Email", False, False),
    "contactPreference": ("owner", "Preferencia de contacto", True, False),
    "pickup": ("owner", "Lugar de retiro", True, True),
    "address": ("owner", "Dirección de entrega", True, True),
    "comments": ("owner", "Comentarios / referencias", True, False),
    # Datos de la mascota
    "nickname": ("pet", "Cómo le decían (apodo)", False, False),
    "breed": ("pet", "Raza", False, False),
    "weight": ("pet", "Tamaño / peso", True, True),
    "age": ("pet", "Edad", True, True),
    "birthDate": ("pet", "Fecha de nacimiento", False, False),
    "deathDate": ("pet", "Fecha de fallecimiento", False, False),
}


def normalize_form_config(raw: Any) -> dict:
    """Mezcla lo guardado con los valores por defecto. Obligatorio implica visible."""
    raw = raw if isinstance(raw, dict) else {}
    saved_fields = raw.get("fields") if isinstance(raw.get("fields"), dict) else {}
    fields = {}
    for key, (_section, _label, def_visible, def_required) in DEFAULT_FIELDS.items():
        saved = saved_fields.get(key) if isinstance(saved_fields.get(key), dict) else {}
        visible = bool(saved.get("visible", def_visible))
        required = bool(saved.get("required", def_required)) and visible
        fields[key] = {"visible": visible, "required": required}
    return {"fields": fields, "show_weight_prices": bool(raw.get("show_weight_prices", False))}


def form_config_with_meta(raw: Any) -> dict:
    """Configuración + sección/etiqueta de cada campo, para la pantalla de ajustes."""
    cfg = normalize_form_config(raw)
    return {
        "fields": [
            {"key": key, "section": section, "label": label, **cfg["fields"][key]}
            for key, (section, label, _v, _r) in DEFAULT_FIELDS.items()
        ],
        "show_weight_prices": cfg["show_weight_prices"],
    }


# ===== Tramos de peso =====

def get_weight_tiers(db: Session, tenant_id: int) -> list:
    """Tramos ordenados por límite superior; el abierto (NULL) al final."""
    rules = db.query(models.WeightPricing).filter(models.WeightPricing.tenant_id == tenant_id).all()
    return sorted(rules, key=lambda r: (r.max_weight is None, r.max_weight or 0))


def _fmt_kg(value: float) -> str:
    return f"{value:g}".replace(".", ",")


def tier_range_text(min_weight: float | None, max_weight: float | None) -> str:
    """Texto del rango tal como lo escribió el crematorio: "0 – 4 kg", "4,1 – 7 kg",
    "Desde 7,1 kg" (último abierto)."""
    if max_weight is None:
        return f"Desde {_fmt_kg(min_weight or 0)} kg"
    return f"{_fmt_kg(min_weight or 0)} – {_fmt_kg(max_weight)} kg"


def public_weight_tiers(db: Session, tenant_id: int, include_price: bool) -> list[dict]:
    tiers = []
    for r in get_weight_tiers(db, tenant_id):
        item = {
            "id": r.id,
            "label": r.label,
            "min_weight": r.min_weight or 0,
            "max_weight": r.max_weight,
            "range_text": tier_range_text(r.min_weight, r.max_weight),
        }
        if include_price:
            item["price"] = r.price or 0
        tiers.append(item)
    return tiers


# ===== Validación del envío =====

def _filled(value: Any) -> bool:
    return value is not None and str(value).strip() != ""


def apply_form_config_to_submission(db: Session, tenant: models.Tenant, owner: dict, pet: dict) -> None:
    """Valida obligatorios según la configuración del tenant y completa
    pet["size"] / pet["weightTier"] a partir del tramo elegido (snapshot del
    servidor: no se confía en etiquetas enviadas por el cliente).

    pet["size"] es lo que muestran la ficha de la solicitud y la mascota creada
    al aprobarla.
    """
    cfg = normalize_form_config(tenant.form_config)["fields"]

    # Peso: tramo del tenant (weightTierId) o peso exacto (weightKg).
    tier_id = pet.get("weightTierId")
    weight_kg = pet.get("weightKg")
    if _filled(tier_id):
        tier = db.query(models.WeightPricing).filter(
            models.WeightPricing.id == int(tier_id),
            models.WeightPricing.tenant_id == tenant.id,
        ).first() if str(tier_id).isdigit() else None
        if not tier:
            raise HTTPException(status_code=400, detail="El rango de peso seleccionado ya no existe. Recarga el formulario.")
        range_text = tier_range_text(tier.min_weight, tier.max_weight)
        pet["weightTier"] = {
            "id": tier.id, "label": tier.label,
            "min_weight": tier.min_weight or 0, "max_weight": tier.max_weight,
        }
        pet["size"] = f"{tier.label} ({range_text})" if tier.label else range_text
    elif _filled(weight_kg):
        try:
            kg = float(str(weight_kg).replace(",", "."))
        except ValueError:
            raise HTTPException(status_code=400, detail="Peso inválido")
        if kg <= 0 or kg > 200:
            raise HTTPException(status_code=400, detail="Peso fuera de rango (0-200 kg)")
        pet["size"] = f"{_fmt_kg(kg)} kg"
    elif _filled(pet.get("weightRange")) and not _filled(pet.get("size")):
        # Borradores antiguos con los rangos fijos previos.
        legacy = {"small": "Pequeño (0 – 10 kg)", "medium": "Mediano (10 – 25 kg)",
                  "large": "Grande (25 – 45 kg)", "giant": "Gigante (45+ kg)"}
        pet["size"] = legacy.get(pet["weightRange"], pet["weightRange"])

    present = {
        "rut": _filled(owner.get("rut")),
        "email": _filled(owner.get("email")),
        "contactPreference": _filled(owner.get("contactPreference")),
        "pickup": _filled(owner.get("veterinary")),
        "address": _filled(owner.get("address")),
        "comments": _filled(owner.get("comments")),
        "nickname": _filled(pet.get("nickname")),
        "breed": _filled(pet.get("breed")),
        "weight": _filled(pet.get("size")),
        "age": _filled(pet.get("age")),
        "birthDate": _filled(pet.get("birthDate")),
        "deathDate": _filled(pet.get("deathDate")),
    }
    missing = [DEFAULT_FIELDS[k][1] for k, c in cfg.items() if c["required"] and not present[k]]
    if missing:
        raise HTTPException(status_code=400, detail=f"Faltan campos obligatorios: {', '.join(missing)}")
