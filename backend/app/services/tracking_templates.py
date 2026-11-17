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
from sqlalchemy import text

FEATURE_KEY = "configuracion:diseno_seguimiento"
DEFAULT_TEMPLATE = "classic"
BUILTIN_TEMPLATES = ("classic", "warm", "modern")
VALID_TEMPLATES = ("classic", "warm", "modern", "celestial")

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


def _has_table(db: Session, table_name: str) -> bool:
    """Verifica en pg_class si una tabla existe sin lanzar excepción ni abortar la transacción."""
    try:
        res = db.execute(
            text("SELECT 1 FROM pg_class WHERE relname = :t AND relkind = 'r'"),
            {"t": table_name}
        ).scalar()
        return bool(res)
    except Exception:
        db.rollback()
        return False


def _has_column(db: Session, table_name: str, column_name: str) -> bool:
    """Verifica en pg_attribute si una columna existe sin lanzar excepción ni abortar la transacción."""
    try:
        res = db.execute(
            text(
                "SELECT 1 FROM pg_attribute "
                "WHERE attrelid = :t::regclass AND attname = :c AND NOT attisdropped"
            ),
            {"t": table_name, "c": column_name}
        ).scalar()
        return bool(res)
    except Exception:
        db.rollback()
        return False


def get_all_valid_template_slugs(db: Session) -> set[str]:
    """Retorna el conjunto de slugs de plantillas válidas (incorporadas + BD activas)."""
    valid = set(BUILTIN_TEMPLATES)
    valid.add("celestial")

    if not _has_table(db, "sys_tracking_custom_templates"):
        return valid

    try:
        from app import models
        custom_slugs = (
            db.query(models.TrackingCustomTemplate.slug)
            .filter(models.TrackingCustomTemplate.is_active == True)
            .all()
        )
        for row in custom_slugs:
            if row[0]:
                valid.add(row[0].strip().lower())
    except Exception:
        db.rollback()
    return valid


def normalize_template(db: Session, value: str | None, fallback: str = DEFAULT_TEMPLATE) -> str:
    v = (value or "").strip().lower()
    valid = get_all_valid_template_slugs(db)
    return v if v in valid else fallback


def get_global_default_template(db: Session) -> str:
    if not _has_table(db, "sys_saas_config") or not _has_column(db, "sys_saas_config", "default_tracking_template"):
        return DEFAULT_TEMPLATE

    try:
        from app import models
        cfg = db.query(models.SaaSConfig).first()
        raw = getattr(cfg, "default_tracking_template", None) if cfg else None
        return normalize_template(db, raw, DEFAULT_TEMPLATE)
    except Exception:
        db.rollback()
        return DEFAULT_TEMPLATE


def can_customize_tracking_design(tenant) -> bool:
    try:
        from app.services.plan_features import tenant_has
        return bool(tenant) and tenant_has(tenant, FEATURE_KEY)
    except Exception:
        return False


def get_tenant_plan_name(tenant) -> str:
    if not tenant:
        return ""
    try:
        return (
            getattr(getattr(tenant, "effective_plan", None) or getattr(tenant, "subscription_plan", None), "name", "")
            or getattr(tenant, "plan", "")
            or ""
        ).upper()
    except Exception:
        return (getattr(tenant, "plan", "") or "").upper()


def resolve_tracking_template(db: Session, tenant) -> str:
    global_default = get_global_default_template(db)
    if not tenant or not can_customize_tracking_design(tenant):
        return global_default

    if not _has_column(db, "sys_tenants", "tracking_template"):
        return global_default

    try:
        custom = getattr(tenant, "tracking_template", None)
        return normalize_template(db, custom, global_default)
    except Exception:
        db.rollback()
        return global_default


def resolve_tracking_template_config(db: Session, template_slug: str) -> Optional[dict]:
    """
    Busca la configuración visual completa de la plantilla (recursos, fondos, elemento y colores).
    Si es una plantilla personalizada o celestial, retorna su configuración dinámica.
    """
    slug = (template_slug or "").strip().lower()
    if slug in ("classic", "warm", "modern"):
        return None

    if _has_table(db, "sys_tracking_custom_templates"):
        try:
            from app import models
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
            db.rollback()

    # Respaldo celestial por defecto (hardcoded seguro si la tabla aún no existe)
    if slug == "celestial":
        return {
            "name": "Santuario Angelical / Celestial",
            "slug": "celestial",
            "element_url": "/tracking/elementos/alas_elemento.webp",
            "background_mobile_url": "/tracking/fondos/movil/fondo_cielo_flores_1_9_16.webp",
            "background_desktop_url": "/tracking/fondos/desktop/fondo_cielo_flores_1_16_9.webp",
            "theme_config": {
                "accent_color": "#D97706",
                "title_color_light": "#3E2723",
                "title_color_dark": "#FDF6E2",
                "subtitle_color_light": "#78350F",
                "subtitle_color_dark": "#FDE68A",
            },
        }

    return None


def get_template_catalog(db: Session, tenant=None) -> list[dict]:
    """
    Genera el catálogo completo de plantillas disponibles para el selector del tenant.
    Evalúa si el plan del tenant tiene acceso a cada plantilla personalizada.
    """
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

    # 2. Custom templates activas de la BD (si la tabla existe)
    if _has_table(db, "sys_tracking_custom_templates"):
        try:
            from app import models
            custom_templates = (
                db.query(models.TrackingCustomTemplate)
                .filter(models.TrackingCustomTemplate.is_active == True)
                .all()
            )
            tenant_plan = get_tenant_plan_name(tenant)

            for c in custom_templates:
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
            db.rollback()

    return catalog
