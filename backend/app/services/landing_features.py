"""Funciones que la web pública muestra al comparar planes.

El SuperAdmin elige cuáles se muestran, con qué nombre, en qué grupo y en qué
orden (Admin → Planes → «Funciones en la web»; sys_saas_config.landing_features).
Qué plan tiene cada una NO se escribe a mano: se calcula de sus módulos y
características (lo mismo que se configura en Admin → Planes), así que al
quitar algo de un plan la web cambia sola.

Claves posibles:
- «módulo:característica» del registro de características (ej. certificados:redes):
  incluida si el módulo está en allowed_modules y la característica no está en false.
- «mod:<módulo>»: incluida si el plan tiene el módulo.
- «core:<x>»: incluida en todos los planes (seguimiento, datos aislados).
- «plan:can_export» (columna del plan) y «plan:web_institucional» (plan ULTRA).
"""
from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app import models
from app.services.plan_features import plan_has

MAX_ITEMS = 60
MAX_LABEL = 70
MAX_DESCRIPTION = 160
GROUPS = ("Esencial", "Operación", "Documentos", "Familias", "Administración", "Integraciones")

DEFAULT_FEATURES: list[dict[str, str]] = [
    {"key": "core:seguimiento", "label": "Seguimiento en línea para las familias", "group": "Esencial",
     "description": "Enlace privado con la línea de tiempo y la evidencia de cada etapa."},
    {"key": "core:datos_aislados", "label": "Datos aislados y privados", "group": "Esencial",
     "description": "Tu información solo la ve tu equipo."},
    {"key": "mod:servicios", "label": "Catálogo de servicios y planes", "group": "Operación"},
    {"key": "operaciones:panel", "label": "Panel de trabajo y trazabilidad", "group": "Operación"},
    {"key": "pagos:ver_historial", "label": "Historial de pagos y cobros", "group": "Operación"},
    {"key": "inventario:productos:catalogo", "label": "Catálogo digital para compartir", "group": "Operación"},
    {"key": "certificados:generar_pdf", "label": "Certificados de cremación", "group": "Documentos"},
    {"key": "certificados:diseno", "label": "Tarjetas de homenaje", "group": "Documentos"},
    {"key": "certificados:redes", "label": "Imágenes con IA para redes sociales", "group": "Documentos"},
    {"key": "certificados:generar_todo", "label": "«Generar todo»: documentos automáticos", "group": "Documentos"},
    {"key": "mascotas:memorial", "label": "Memoriales digitales", "group": "Familias"},
    {"key": "mod:configuracion", "label": "Configuración propia: formulario y flujo", "group": "Administración"},
    {"key": "configuracion:roles", "label": "Roles y permisos por usuario", "group": "Administración"},
    {"key": "plan:can_export", "label": "Exportación de reportes y datos", "group": "Administración"},
    {"key": "integraciones:widget", "label": "Widget embebible para tu sitio web", "group": "Integraciones"},
    {"key": "integraciones:formulario_incrustable", "label": "Formulario incrustable en tu sitio", "group": "Integraciones"},
    {"key": "integraciones:video_bienvenida", "label": "Video de bienvenida en el formulario", "group": "Integraciones"},
    {"key": "plan:web_institucional", "label": "Sitio web institucional incluido", "group": "Integraciones"},
]


def _clean(items: Any) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    seen: set[str] = set()
    for it in items if isinstance(items, list) else []:
        if not isinstance(it, dict):
            continue
        key = str(it.get("key") or "").strip()[:80]
        label = " ".join(str(it.get("label") or "").split())[:MAX_LABEL]
        if not key or not label or key in seen:
            continue
        seen.add(key)
        group = str(it.get("group") or "")
        out.append({
            "key": key,
            "label": label,
            "group": group if group in GROUPS else GROUPS[1],
            "description": " ".join(str(it.get("description") or "").split())[:MAX_DESCRIPTION],
        })
        if len(out) >= MAX_ITEMS:
            break
    return out


def get_landing_features(db: Session) -> list[dict[str, str]]:
    cfg = db.query(models.SaaSConfig).first()
    saved = getattr(cfg, "landing_features", None) if cfg else None
    return _clean(saved) if saved is not None else _clean(DEFAULT_FEATURES)


def set_landing_features(db: Session, items: list[dict]) -> list[dict[str, str]]:
    cfg = db.query(models.SaaSConfig).first()
    if cfg is None:
        cfg = models.SaaSConfig()
        db.add(cfg)
    cfg.landing_features = _clean(items)
    db.commit()
    return get_landing_features(db)


def plan_offers(plan, key: str) -> bool:
    """¿El plan incluye esta función de la web? (de sus módulos y características)."""
    if key.startswith("core:"):
        return True
    if key == "plan:can_export":
        return bool(plan.can_export)
    if key == "plan:web_institucional":
        return (plan.name or "").strip().upper() == "ULTRA"
    modules = set(plan.allowed_modules or [])
    if key.startswith("mod:"):
        return key[4:] in modules
    if key.startswith("integraciones:"):
        return plan_has(plan, key)
    features = plan.features if isinstance(plan.features, dict) else {}
    return key.split(":", 1)[0] in modules and features.get(key) is not False
