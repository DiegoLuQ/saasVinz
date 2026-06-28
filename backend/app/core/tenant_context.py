import contextvars
from typing import Optional

from sqlalchemy import text

# Context variable to store the current tenant ID
tenant_id_context: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("tenant_id", default=None)

def set_tenant_id(tenant_id: str) -> contextvars.Token:
    """Sets the current tenant ID in the context."""
    return tenant_id_context.set(str(tenant_id))

def get_tenant_id() -> Optional[str]:
    """Retrieves the current tenant ID from the context."""
    return tenant_id_context.get()

def reset_tenant_id(token: contextvars.Token):
    """Resets the tenant ID in the context using the token returned by set_tenant_id."""
    tenant_id_context.reset(token)


# =====================================================================
# Helpers centralizados de contexto RLS (PostgreSQL session GUCs)
# Único lugar donde se declaran app.current_tenant_id / app.bypass_rls.
# Las políticas (007_strict_rls_policies.sql) son deny-all si no se
# declara un tenant válido y bypass != 'true'.
# =====================================================================

def apply_tenant_rls(db, tenant_id) -> None:
    """Activa el aislamiento por tenant en la sesión de BD indicada."""
    # Persistimos la intención en la sesión para poder re-aplicarla en cada
    # transacción nueva (ver listener after_begin en database.py). Sin esto, un
    # commit() devuelve la conexión al pool (checkin -> deny-all) y la siguiente
    # sentencia (p.ej. el refresh tras un create) queda bloqueada por RLS.
    db.info["rls_context"] = {"mode": "tenant", "tenant_id": str(tenant_id)}
    # set_config(..., false) = nivel sesión (sobrevive al commit), mismo patrón
    # que los listeners checkout/checkin de database.py. SET con bind param solo
    # funciona porque psycopg2 interpola client-side; set_config es el camino
    # soportado por el protocolo y portable a psycopg3.
    db.execute(
        text("SELECT set_config('app.current_tenant_id', :tid, false)"),
        {"tid": str(tenant_id)},
    )
    db.execute(text("SELECT set_config('app.bypass_rls', 'false', false)"))


def apply_bypass_rls(db) -> None:
    """Activa el bypass de RLS (solo creator/superadmin) en la sesión de BD."""
    db.info["rls_context"] = {"mode": "bypass"}
    db.execute(text("SELECT set_config('app.bypass_rls', 'true', false)"))
    db.execute(text("SELECT set_config('app.current_tenant_id', '', false)"))


def clear_rls(db) -> None:
    """Restablece el contexto a deny-all (sin tenant, sin bypass)."""
    db.info.pop("rls_context", None)
    db.execute(text("SELECT set_config('app.current_tenant_id', '', false)"))
    db.execute(text("SELECT set_config('app.bypass_rls', 'false', false)"))
