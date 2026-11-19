"""Plantillas de formulario para las familias (las diseña el SuperAdmin).

Admin → Configuración → «Plantillas de formulario» edita la lista; se guarda en
sys_saas_config.form_templates (NULL = DEFAULT_TEMPLATES, hoy «Formulario Huella»).
Cada crematorio ve las activas en Configuración → Formulario y Pesos → Enlaces y,
con «Crear desde plantilla», arma un formulario personalizado nuevo (copia: editar
la plantilla después no cambia los formularios ya creados). El formulario
principal (Clásico) nunca se toca.

Plantilla: id, name, description, active, phases {fase: visible}, phase_order,
phase_labels {fase: {name, phrase}} y fields {campo: {visible, required}}.
Las reglas de orden y nombres son las de public_form_config (clean_phase_order…).
"""
from __future__ import annotations

import re
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.services.public_form_config import (
    DEFAULT_FIELDS, NEVER_REQUIRED, PHASE_DEFAULT_NAMES, PHASE_KEYS,
    clean_phase_labels, clean_phase_order,
)

MAX_TEMPLATES = 8
MAX_NAME = 60
MAX_DESCRIPTION = 250

# Fase donde vive cada sección de campos (los ocultos conservan la suya)
SECTION_PHASE = {"owner": "familia", "pet": "angel"}

HUELLA = {
    "id": "huella",
    "name": "Formulario Huella",
    "description": "Cuéntanos de tu compañero, honra su memoria y elige cómo despedirlo. "
                   "Al final te pedimos tus datos para coordinar el retiro.",
    "active": True,
    "phases": {"familia": True, "angel": True, "camino": True, "recuerdos": True},
    "phase_order": ["angel", "recuerdos", "camino", "familia"],
    "phase_labels": {
        "angel": {"name": "Tu compañero", "phrase": "Empecemos por quien más importa: cuéntanos de tu compañero de vida."},
        "recuerdos": {"name": "Su recuerdo", "phrase": "Una foto y unas palabras para honrar su memoria."},
        "camino": {"name": "Su despedida", "phrase": "Elige cómo quieres despedirlo."},
        "familia": {"name": "Tus datos", "phrase": "Por último, tus datos para coordinar el retiro y acompañarte."},
    },
    "fields": {
        "nickname": {"visible": False, "required": False},
        "breed": {"visible": False, "required": False},
        "weight": {"visible": True, "required": True},
        "age": {"visible": True, "required": False},
        "birthDate": {"visible": False, "required": False},
        "deathDate": {"visible": True, "required": False},
        "healthStatus": {"visible": False, "required": False},
        "email": {"visible": True, "required": True},
        "rut": {"visible": True, "required": False},
        "contactPreference": {"visible": True, "required": False},
        "pickup": {"visible": True, "required": True},
        "address": {"visible": True, "required": False},
        "comments": {"visible": True, "required": False},
    },
}
DEFAULT_TEMPLATES = [HUELLA]


def _line(value: Any, limit: int) -> str:
    return " ".join(str(value or "").split())[:limit]


def _slug(value: str) -> str:
    import unicodedata
    s = unicodedata.normalize("NFD", value.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:40]


def clean_template(raw: Any) -> dict:
    """Valida una plantilla (400 con el motivo si no sirve)."""
    if not isinstance(raw, dict):
        raise HTTPException(status_code=400, detail="Plantilla inválida")
    name = _line(raw.get("name"), MAX_NAME)
    if not name:
        raise HTTPException(status_code=400, detail="Cada plantilla necesita un nombre")
    saved_phases = raw.get("phases") if isinstance(raw.get("phases"), dict) else {}
    phases = {k: bool(saved_phases.get(k, True)) for k in PHASE_KEYS}
    if not any(phases.values()):
        raise HTTPException(status_code=400, detail=f"«{name}»: debe tener al menos una fase visible")
    saved_fields = raw.get("fields") if isinstance(raw.get("fields"), dict) else {}
    fields = {}
    for key, (_sec, _lbl, def_v, def_r) in DEFAULT_FIELDS.items():
        f = saved_fields.get(key) if isinstance(saved_fields.get(key), dict) else {}
        visible = bool(f.get("visible", def_v))
        fields[key] = {"visible": visible,
                       "required": bool(f.get("required", def_r)) and visible and key not in NEVER_REQUIRED}
    return {
        "id": _slug(str(raw.get("id") or "")) or _slug(name) or "plantilla",
        "name": name,
        "description": _line(raw.get("description"), MAX_DESCRIPTION),
        "active": bool(raw.get("active", True)),
        "phases": phases,
        "phase_order": clean_phase_order(raw.get("phase_order")),
        "phase_labels": clean_phase_labels(raw.get("phase_labels")),
        "fields": fields,
    }


def clean(payload: Any) -> list[dict]:
    if not isinstance(payload, list):
        raise HTTPException(status_code=400, detail="Formato inválido")
    if len(payload) > MAX_TEMPLATES:
        raise HTTPException(status_code=400, detail=f"Máximo {MAX_TEMPLATES} plantillas")
    out, ids = [], set()
    for raw in payload:
        t = clean_template(raw)
        base, n = t["id"], 2
        while t["id"] in ids:  # ids únicos
            t["id"] = f"{base}-{n}"[:40]
            n += 1
        ids.add(t["id"])
        out.append(t)
    return out


def get(db: Session) -> tuple[list[dict], bool]:
    """(plantillas, es_la_lista_original)."""
    from app import models
    cfg = db.query(models.SaaSConfig).first()
    data = getattr(cfg, "form_templates", None) if cfg else None
    if isinstance(data, list):
        try:
            return clean(data), False
        except HTTPException:
            pass
    return clean(DEFAULT_TEMPLATES), True


def save(db: Session, payload: Any | None) -> tuple[list[dict], bool]:
    """Guarda la lista; None vuelve a la original."""
    from app import models
    cfg = db.query(models.SaaSConfig).first()
    if not cfg:
        cfg = models.SaaSConfig(name="SaaS Crematorio")
        db.add(cfg)
    cfg.form_templates = clean(payload) if payload is not None else None
    db.commit()
    return get(db)


def active(db: Session) -> list[dict]:
    return [t for t in get(db)[0] if t["active"]]


def catalog() -> dict:
    """Campos configurables y fases (para el editor del SuperAdmin)."""
    return {
        "fields": [{"key": k, "section": sec, "label": lbl, "phase": SECTION_PHASE[sec],
                    "never_required": k in NEVER_REQUIRED}
                   for k, (sec, lbl, _v, _r) in DEFAULT_FIELDS.items()],
        "phases": [{"key": k, "name": PHASE_DEFAULT_NAMES[k]} for k in PHASE_KEYS],
        "max": MAX_TEMPLATES,
    }
