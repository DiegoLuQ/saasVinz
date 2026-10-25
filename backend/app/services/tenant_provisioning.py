"""Alta de un crematorio (tenant): un solo camino para el admin y el registro.

Crea el tenant, su usuario administrador (si hay correo), la configuración de
módulos del rol admin, los permisos del usuario y la ficha de facturación.
Lo usan Admin → Crematorios → Nuevo (creator/dashboard/router.py) y el registro
autoservicio FREE (api/public/signup). No hace commit: lo decide quien llama.
"""
from __future__ import annotations

import re
from typing import Optional

from sqlalchemy.orm import Session

from app import models

# Módulos que todo crematorio tiene, además de los de su plan.
BASE_MODULES = ["dashboard", "perfil", "configuracion"]

# Fases iniciales del flujo para los crematorios que se registran solos (luego
# las editan en Configuración → Flujo Operativo). Los creados por el admin
# siguen partiendo sin fases, como antes.
DEFAULT_WORKFLOW = [
    "Recepción y registro del servicio",
    "Retiro y traslado",
    "Identificación y custodia",
    "Cremación",
    "Entrega de cenizas a la familia",
]

SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$")
# Subdominios y rutas propias de Vinzer: un crematorio no puede llamarse así.
RESERVED_SLUGS = {
    "admin", "app", "api", "www", "track", "memorial", "memoriales", "catalogo", "veterinary", "vet",
    "partner", "public", "static", "assets", "mail", "smtp", "vinzer", "soporte", "ayuda", "help",
    "registro", "crear-cuenta", "login", "dashboard", "tenant", "terminos", "privacidad", "blog",
    "guias", "tour", "comparar-planes", "widget", "status", "demo", "test", "pgadmin",
}


def slugify(text: str) -> str:
    import unicodedata
    s = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return re.sub(r"-{2,}", "-", s)[:40].strip("-")


def slug_problem(db: Session, slug: str) -> Optional[str]:
    """Motivo por el que no se puede usar ese slug, o None si está libre."""
    if not SLUG_RE.match(slug or ""):
        return "Usa entre 3 y 40 letras minúsculas, números o guiones (sin guion al inicio ni al final)."
    if slug in RESERVED_SLUGS:
        return "Esa dirección está reservada. Prueba con otra."
    if db.query(models.Tenant.id).filter(models.Tenant.slug == slug).first():
        return "Esa dirección ya está en uso. Prueba con otra."
    return None


def suggest_slug(db: Session, base: str) -> str:
    base = slugify(base) or "crematorio"
    if len(base) < 3:
        base = f"{base}-crematorio"
    candidate = base
    for n in range(2, 200):
        if slug_problem(db, candidate) is None:
            return candidate
        candidate = f"{base[:36]}-{n}"
    import secrets
    return f"{base[:30]}-{secrets.token_hex(3)}"


def provision_tenant(
    db: Session,
    *,
    subscription_plan: Optional[models.SubscriptionPlan],
    admin_name: Optional[str] = None,
    admin_password_hash: Optional[str] = None,
    seed_workflow: bool = False,
    **tenant_fields,
) -> tuple[models.Tenant, Optional[models.User]]:
    """Crea el tenant y lo necesario para que su admin pueda entrar.

    `tenant_fields` son columnas de sys_tenants (name, slug, email, phone… y `plan`,
    el nombre legado del plan). Si hay `email` y `admin_password_hash`, se crea el
    usuario admin con ese correo.
    """
    plan = subscription_plan
    plan_id = tenant_fields.pop("subscription_plan_id", None)
    tenant = models.Tenant(
        status="active",
        country=tenant_fields.pop("country", None) or "Chile",
        subscription_plan_id=plan.id if plan else plan_id,
        plan=tenant_fields.pop("plan", None) or (plan.name if plan else None),
        **tenant_fields,
    )
    db.add(tenant)
    db.flush()

    admin = None
    if tenant.email and admin_password_hash:
        admin = models.User(
            tenant_id=tenant.id,
            email=tenant.email,
            password_hash=admin_password_hash,
            role=models.UserRole.admin,
            name=admin_name or f"Administrador {tenant.name}",
            is_active=True,
        )
        db.add(admin)
        db.flush()

    allowed = list(BASE_MODULES)
    if plan and plan.allowed_modules:
        allowed.extend(plan.allowed_modules)

    # Módulos activos del rol admin en este crematorio.
    for m in db.query(models.Module).all():
        db.add(models.TenantModuleConfig(
            tenant_id=tenant.id, role=models.UserRole.admin, module_key=m.key, is_active=m.key in allowed,
        ))

    # Permisos completos del admin sobre esos módulos (claves antiguas normalizadas).
    if admin:
        for key in dict.fromkeys({"pets": "mascotas", "customers": "clientes"}.get(k, k) for k in allowed):
            db.add(models.UserModulePermission(
                user_id=admin.id, module_key=key, is_active=True,
                actions={"view": True, "create": True, "edit": True, "delete": True},
            ))

    db.add(models.TenantBillingInfo(tenant_id=tenant.id, monthly_price=plan.price if plan else 0.0))

    if seed_workflow:
        # La última fase («Entrega…») avisa a la familia por correo.
        last = len(DEFAULT_WORKFLOW) - 1
        for i, name in enumerate(DEFAULT_WORKFLOW):
            db.add(models.WorkflowStep(tenant_id=tenant.id, name=name, order_index=i, is_active=True, notify_family=i == last))

    db.flush()
    return tenant, admin
