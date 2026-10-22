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
from app.services.form_video import DEFAULT_BUTTON_TEXT as VIDEO_BUTTON_TEXT, normalize_video

MAX_WEIGHT_TIERS = 20
# Nombre propio de un campo en un formulario personalizado (ej. «Dirección» en vez de «Lugar de retiro»).
MAX_FIELD_LABEL = 40

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
    "healthStatus": ("pet", "Estado de salud / Diagnóstico", False, False),
}


DEFAULT_PHASES: dict[str, bool] = {
    "familia": True,
    "angel": True,
    "camino": True,
    "recuerdos": True,
}

DEFAULT_MEMORIES: dict[str, bool] = {
    "allow_photos": True,
    "require_photos": False,
    "allow_dedication": True,
    "require_dedication": False,
    "allow_suggestions": True,
}

DEFAULT_WELCOME_MODAL: dict[str, Any] = {
    "enabled": True,
    "title": "Lamentamos tu pérdida",
    "message": "En estos momentos difíciles, en {empresa} queremos acompañarte y brindarte todo nuestro apoyo. Estamos aquí para ayudarte a honrar la memoria de tu ser querido.",
    "button_text": "Continuar",
    # Botón "Ver video" dentro del mensaje (planes PRO/ULTRA, ver form_video.py)
    "show_video_button": False,
    "video_button_text": VIDEO_BUTTON_TEXT,
    "video": None,
    # Dónde ve la familia el botón del video: "start" = en el mensaje de bienvenida,
    # "end" = en la pantalla final, tras enviar el formulario.
    "video_position": "start",
}

VIDEO_POSITIONS = ("start", "end")


def normalize_form_config(raw: Any) -> dict:
    """Mezcla lo guardado con los valores por defecto. Obligatorio implica visible."""
    raw = raw if isinstance(raw, dict) else {}
    saved_phases = raw.get("phases") if isinstance(raw.get("phases"), dict) else {}
    phases = {
        key: bool(saved_phases.get(key, def_val))
        for key, def_val in DEFAULT_PHASES.items()
    }
    # Asegurar que al menos una fase esté activa
    if not any(phases.values()):
        phases["familia"] = True

    saved_fields = raw.get("fields") if isinstance(raw.get("fields"), dict) else {}
    fields = {}
    for key, (_section, _label, def_visible, def_required) in DEFAULT_FIELDS.items():
        saved = saved_fields.get(key) if isinstance(saved_fields.get(key), dict) else {}
        visible = bool(saved.get("visible", def_visible))
        required = bool(saved.get("required", def_required)) and visible
        fields[key] = {"visible": visible, "required": required}

    saved_memories = raw.get("memories") if isinstance(raw.get("memories"), dict) else {}
    memories = {
        key: bool(saved_memories.get(key, def_val))
        for key, def_val in DEFAULT_MEMORIES.items()
    }

    delivery_notice = str(raw.get("delivery_notice") or "").strip() or None

    saved_welcome = raw.get("welcome_modal") if isinstance(raw.get("welcome_modal"), dict) else {}
    welcome_modal = {
        "enabled": bool(saved_welcome.get("enabled", DEFAULT_WELCOME_MODAL["enabled"])),
        "title": str(saved_welcome.get("title") or "").strip() or DEFAULT_WELCOME_MODAL["title"],
        "message": str(saved_welcome.get("message") or "").strip() or DEFAULT_WELCOME_MODAL["message"],
        "button_text": str(saved_welcome.get("button_text") or "").strip() or DEFAULT_WELCOME_MODAL["button_text"],
        "video": normalize_video(saved_welcome.get("video")),
        "video_button_text": str(saved_welcome.get("video_button_text") or "").strip()[:40] or VIDEO_BUTTON_TEXT,
        "video_position": saved_welcome.get("video_position") if saved_welcome.get("video_position") in VIDEO_POSITIONS else "start",
    }
    welcome_modal["show_video_button"] = bool(saved_welcome.get("show_video_button")) and welcome_modal["video"] is not None

    saved_custom_forms = raw.get("custom_forms") if isinstance(raw.get("custom_forms"), list) else []
    custom_forms = []
    for cf in saved_custom_forms:
        if isinstance(cf, dict) and cf.get("name"):
            cf_fields_raw = cf.get("fields") if isinstance(cf.get("fields"), dict) else None
            cf_fields = None
            if cf_fields_raw:
                cf_fields = {}
                for k, (_sec, _lbl, def_v, def_r) in DEFAULT_FIELDS.items():
                    if k in cf_fields_raw and isinstance(cf_fields_raw[k], dict):
                        v = bool(cf_fields_raw[k].get("visible", def_v))
                        r = bool(cf_fields_raw[k].get("required", def_r)) and v
                        cf_fields[k] = {"visible": v, "required": r}
                        label = " ".join(str(cf_fields_raw[k].get("label") or "").split())[:MAX_FIELD_LABEL]
                        if label:
                            cf_fields[k]["label"] = label

            cf_welcome_raw = cf.get("welcome_modal") if isinstance(cf.get("welcome_modal"), dict) else None
            cf_welcome = None
            if cf_welcome_raw:
                cf_welcome = {
                    "enabled": bool(cf_welcome_raw.get("enabled", True)),
                    "title": str(cf_welcome_raw.get("title") or "").strip() or None,
                    "message": str(cf_welcome_raw.get("message") or "").strip() or None,
                    "button_text": str(cf_welcome_raw.get("button_text") or "").strip() or None,
                    # None = hereda del mensaje general (video incluido)
                    "show_video_button": (
                        bool(cf_welcome_raw["show_video_button"])
                        if cf_welcome_raw.get("show_video_button") is not None else None
                    ),
                    "video_button_text": str(cf_welcome_raw.get("video_button_text") or "").strip()[:40] or None,
                    "video": normalize_video(cf_welcome_raw.get("video")),
                    "video_position": cf_welcome_raw.get("video_position") if cf_welcome_raw.get("video_position") in VIDEO_POSITIONS else None,
                }

            custom_forms.append({
                "id": str(cf.get("id") or ""),
                "name": str(cf.get("name") or "").strip(),
                "description": str(cf.get("description") or "").strip(),
                "phases": cf.get("phases") if isinstance(cf.get("phases"), dict) else DEFAULT_PHASES,
                "include_health_status": bool(cf.get("include_health_status", False)),
                "delivery_notice": str(cf.get("delivery_notice") or "").strip() or None,
                "fields": cf_fields,
                "welcome_modal": cf_welcome,
                "associated_service_id": str(cf.get("associated_service_id") or "").strip() or None,
                "created_at": cf.get("created_at"),
            })

    return {
        "phases": phases,
        "fields": fields,
        "show_weight_prices": bool(raw.get("show_weight_prices", False)),
        "show_service_prices": bool(raw.get("show_service_prices", False)),
        "memories": memories,
        "delivery_notice": delivery_notice,
        "welcome_modal": welcome_modal,
        "custom_forms": custom_forms,
    }


def form_config_with_meta(raw: Any) -> dict:
    """Configuración + sección/etiqueta de cada campo, para la pantalla de ajustes."""
    cfg = normalize_form_config(raw)
    return {
        "phases": cfg["phases"],
        "fields": [
            {"key": key, "section": section, "label": label, **cfg["fields"][key]}
            for key, (section, label, _v, _r) in DEFAULT_FIELDS.items()
        ],
        "show_weight_prices": cfg["show_weight_prices"],
        "show_service_prices": cfg["show_service_prices"],
        "memories": cfg["memories"],
        "delivery_notice": cfg["delivery_notice"],
        "welcome_modal": cfg["welcome_modal"],
        "custom_forms": cfg["custom_forms"],
    }


# ===== Tramos de peso =====

def get_weight_tiers(db: Session, tenant_id: int) -> list:
    """Tramos ordenados por límite superior; el abierto (NULL) al final."""
    rules = db.query(models.WeightPricing).filter(models.WeightPricing.tenant_id == tenant_id).all()
    return sorted(rules, key=lambda r: (r.max_weight is None, r.max_weight or 0))


def weight_surcharge(tiers: list, weight: float | None) -> float:
    """Recargo por peso (misma regla que calculateWeightPrice del frontend): el
    primer tramo, por máximo ascendente, cuyo máximo cubre el peso. Bajo el
    mínimo del primer tramo no hay recargo. `tiers` viene de get_weight_tiers."""
    if not weight or weight <= 0 or not tiers:
        return 0.0
    if weight < (tiers[0].min_weight or 0):
        return 0.0
    for r in tiers:
        if r.max_weight is None or weight <= r.max_weight:
            return r.price or 0.0
    return 0.0


def submission_weight_charge(db: Session, tenant_id: int, pet: dict | None) -> dict | None:
    """Recargo por peso de una solicitud del formulario público: el precio guardado
    al enviarla (snapshot del tramo) o, en solicitudes antiguas sin snapshot, el del
    tramo vigente; con peso exacto en kg, la misma regla que weight_surcharge.
    None si no corresponde recargo."""
    pet = pet or {}
    tier = pet.get("weightTier") if isinstance(pet.get("weightTier"), dict) else None
    price = None
    if tier and tier.get("price") is not None:
        price = float(tier.get("price") or 0)
    else:
        tier_id = pet.get("weightTierId") or (tier or {}).get("id")
        if tier_id is not None and str(tier_id).isdigit():
            row = db.query(models.WeightPricing).filter(
                models.WeightPricing.id == int(tier_id), models.WeightPricing.tenant_id == tenant_id,
            ).first()
            price = float(row.price or 0) if row else None
        elif _filled(pet.get("weightKg")):
            try:
                kg = float(str(pet.get("weightKg")).replace(",", "."))
            except ValueError:
                kg = 0
            price = weight_surcharge(get_weight_tiers(db, tenant_id), kg)
    if not price or price <= 0:
        return None
    size = pet.get("size") or ""
    return {"label": f"Recargo por peso{f' ({size})' if size else ''}", "price": price}


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


def apply_form_config_to_submission(
    db: Session, 
    tenant: models.Tenant, 
    owner: dict, 
    pet: dict, 
    form_preset_id: str | None = None,
    photo_count: int = 0,
) -> None:
    """Valida obligatorios según la configuración del tenant y completa
    pet["size"] / pet["weightTier"] a partir del tramo elegido (snapshot del
    servidor: no se confía en etiquetas enviadas por el cliente).

    pet["size"] es lo que muestran la ficha de la solicitud y la mascota creada
    al aprobarla.
    """
    norm = normalize_form_config(tenant.form_config)
    phases = norm["phases"]
    cfg = norm["fields"]

    if form_preset_id:
        for cf in norm.get("custom_forms", []):
            if cf.get("id") == form_preset_id or cf.get("name", "").lower() == form_preset_id.lower():
                if isinstance(cf.get("phases"), dict):
                    phases = {**phases, **cf["phases"]}
                if isinstance(cf.get("fields"), dict):
                    cfg = {**cfg, **cf["fields"]}
                if cf.get("include_health_status"):
                    cfg["healthStatus"] = {**cfg.get("healthStatus", {}), "visible": True, "required": True}
                break

    # Fotos (fase Recuerdos): "Al menos una foto obligatoria" se exige también aquí,
    # no solo en el navegador. El máximo (3) lo controla enforce_max_files.
    mem = norm["memories"]
    if phases.get("recuerdos", True) and mem.get("allow_photos") and mem.get("require_photos") and photo_count < 1:
        raise HTTPException(status_code=400, detail="Sube al menos una fotografía de tu mascota.")

    # Peso: solo si la fase de la mascota (Ángel) está activa
    if phases.get("angel", True):
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
                # Precio al momento del envío: el registro no cambia si luego se editan los tramos.
                "price": tier.price or 0,
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
        "healthStatus": _filled(pet.get("healthStatus")),
    }

    missing = []
    for k, c in cfg.items():
        section = DEFAULT_FIELDS[k][0]
        phase_active = (section == "owner" and phases.get("familia", True)) or \
                       (section == "pet" and phases.get("angel", True))
        if phase_active and c["required"] and not present[k]:
            missing.append(c.get("label") or DEFAULT_FIELDS[k][1])

    if missing:
        raise HTTPException(status_code=400, detail=f"Faltan campos obligatorios: {', '.join(missing)}")

    # Nombres propios del formulario usado: el detalle del registro los muestra igual
    # que los vio la familia (ej. «Dirección» en vez de «Lugar de retiro»).
    labels = {k: c["label"] for k, c in cfg.items() if c.get("label")}
    if labels:
        owner["formLabels"] = labels
