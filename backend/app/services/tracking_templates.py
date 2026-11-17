"""Plantillas visuales para la página pública de seguimiento (/public/[slug]/track/...).

- El SuperAdmin define en `sys_saas_config.default_tracking_template` la plantilla
  por defecto global (`classic`, `warm`, `modern`, etc.).
- Los planes Track y NORMAL heredan siempre la plantilla por defecto global.
- Los planes con la característica `configuracion:diseno_seguimiento` (PRO y ULTRA)
  pueden elegir entre los diseños permitidos según su plan desde Configuración.
- El SuperAdmin puede crear y activar/desactivar plantillas en `sys_tracking_custom_templates`.
"""
from __future__ import annotations

from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

FEATURE_KEY = "configuracion:diseno_seguimiento"
DEFAULT_TEMPLATE = "classic"
BUILTIN_TEMPLATES = ("classic", "warm", "modern")

TEMPLATE_CATALOG = [
    {
        "id": "classic",
        "name": "Clásico / Operativo",
        "description": "Cielo sereno con nubes suaves, alas conmemorativas, línea de tiempo vertical y modo día/noche.",
        "accent": "#0284C7",
    },
    {
        "id": "warm",
        "name": "Emocional / Santuario",
        "description": "Estética editorial cálida en crema y dorado suave, retrato en marco relicario y enfoque en el homenaje.",
        "accent": "#C6A56A",
    },
    {
        "id": "modern",
        "name": "Moderno / Contemporáneo",
        "description": "Tarjetas limpias de alto contraste, barra de progreso horizontal y galería de evidencia estilo contemporáneo.",
        "accent": "#10B981",
    },
    {
        "id": "celestial",
        "name": "Santuario Angelical / Celestial",
        "description": "Alas conmemorativas de ángel, cielo dorado con flores, caligrafía emotiva y tarjetas en cristal.",
        "accent": "#D97706",
    },
]


def get_all_valid_template_slugs(db: Session) -> set[str]:
    """Retorna el conjunto de slugs de plantillas válidas (incorporadas + BD activas)."""
    from app import models
    from app.core.tenant_context import apply_bypass_rls

    valid = set(BUILTIN_TEMPLATES)
    valid.add("celestial")
    try:
        apply_bypass_rls(db)
        custom_slugs = (
            db.query(models.TrackingCustomTemplate.slug)
            .filter(models.TrackingCustomTemplate.is_active == True)
            .all()
        )
        for row in custom_slugs:
            if row[0]:
                valid.add(row[0].strip().lower())
    except Exception:
        pass
    return valid


def normalize_template(db: Session, value: str | None, fallback: str = DEFAULT_TEMPLATE) -> str:
    v = (value or "").strip().lower()
    valid = get_all_valid_template_slugs(db)
    return v if v in valid else fallback


def get_global_default_template(db: Session) -> str:
    from app import models
    cfg = db.query(models.SaaSConfig).first()
    raw = getattr(cfg, "default_tracking_template", None) if cfg else None
    return normalize_template(db, raw, DEFAULT_TEMPLATE)


def can_customize_tracking_design(tenant) -> bool:
    from app.services.plan_features import tenant_has
    return bool(tenant) and tenant_has(tenant, FEATURE_KEY)


def get_tenant_plan_name(tenant) -> str:
    if not tenant:
        return ""
    return (
        getattr(getattr(tenant, "effective_plan", None) or getattr(tenant, "subscription_plan", None), "name", "")
        or getattr(tenant, "plan", "")
        or ""
    ).upper()


def resolve_tracking_template(db: Session, tenant) -> str:
    global_default = get_global_default_template(db)
    if not tenant or not can_customize_tracking_design(tenant):
        return global_default
    custom = getattr(tenant, "tracking_template", None)
    return normalize_template(db, custom, global_default)


def resolve_tracking_template_config(db: Session, template_slug: str) -> Optional[dict]:
    """
    Busca la configuración visual completa de la plantilla (recursos, fondos, elemento y colores).
    Si es una plantilla personalizada o celestial, retorna su configuración dinámica.
    """
    from app import models
    from app.core.tenant_context import apply_bypass_rls

    slug = (template_slug or "").strip().lower()
    if slug in ("classic", "warm", "modern"):
        return None

    try:
        apply_bypass_rls(db)
        tpl = (
            db.query(models.TrackingCustomTemplate)
            .filter(models.TrackingCustomTemplate.slug == slug)
            .first()
        )
        if tpl:
            return {
                "name": tpl.name,
                "slug": tpl.slug,
                "element_url": tpl.element_url or "/tracking/elementos/alas_elemento.webp",
                "background_mobile_url": tpl.background_mobile_url or "/tracking/fondos/movil/fondo_cielo_flores_1_9_16.webp",
                "background_desktop_url": tpl.background_desktop_url or "/tracking/fondos/desktop/fondo_cielo_flores_1_16_9.webp",
                "theme_config": tpl.theme_config or {},
            }
    except Exception:
        pass

    # Respaldo celestial por defecto
    if slug == "celestial":
        return {
            "name": "Santuario Angelical / Celestial",
            "slug": "celestial",
            "element_url": "/tracking/elementos/alas_elemento.webp",
            "background_mobile_url": "/tracking/fondos/movil/fondo_cielo_flores_1_9_16.webp",
            "background_desktop_url": "/tracking/fondos/desktop/fondo_cielo_flores_1_16_9.webp",
            "theme_config": {
                "accent_color": "#D97706",
                "halo_style": "gold",
            },
        }

    return None


def get_template_catalog(db: Session, tenant=None) -> list[dict]:
    """
    Genera el catálogo completo de plantillas disponibles para el selector del tenant.
    Evalúa si el plan del tenant tiene acceso a cada plantilla personalizada.
    """
    from app import models
    from app.core.tenant_context import apply_bypass_rls

    catalog = []
    # 1. Built-in
    for tpl in TEMPLATE_CATALOG:
        catalog.append({
            "id": tpl["id"],
            "name": tpl["name"],
            "description": tpl["description"],
            "accent": tpl.get("accent", "#0284C7"),
            "is_custom": False,
            "locked": False,
        })

    # 2. Custom templates activas de la BD
    try:
        apply_bypass_rls(db)
        custom_templates = (
            db.query(models.TrackingCustomTemplate)
            .filter(models.TrackingCustomTemplate.is_active == True)
            .all()
        )
        tenant_plan = get_tenant_plan_name(tenant)

        for c in custom_templates:
            # Celestial is already in TEMPLATE_CATALOG, don't duplicate
            if c.slug == "celestial":
                continue

            allowed_plans = [p.upper() for p in (c.allowed_plans or ["PRO", "ULTRA"])]
            is_allowed = (
                not tenant
                or "ALL" in allowed_plans
                or "TODOS" in allowed_plans
                or tenant_plan in allowed_plans
            )

            catalog.append({
                "id": c.slug,
                "name": c.name,
                "description": c.description or "Plantilla visual personalizada de alta definición.",
                "accent": (c.theme_config or {}).get("accent_color", "#D97706"),
                "preview_image_url": c.preview_image_url or c.background_mobile_url,
                "is_custom": True,
                "locked": not is_allowed,
                "required_plans": c.allowed_plans,
            })
    except Exception:
        pass

    return catalog
