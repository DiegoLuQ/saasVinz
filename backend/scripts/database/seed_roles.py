"""Crea la tabla sys_roles (si no existe) y la siembra desde el enum UserRole.
La autorización sigue usando el enum; esta tabla solo controla visibilidad/asignabilidad.

Uso:
    python scripts/database/seed_roles.py
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy import text
from app.database import engine
from app import models

# key -> (label, is_system)
LABELS = {
    "admin": ("Administrador", True),
    "creator": ("SuperAdmin", True),
    "recepcion": ("Recepción", False),
    "operador_cremacion": ("Operador Cremación", False),
    "contabilidad": ("Contabilidad", False),
    "marketing": ("Marketing", False),
    "auditor": ("Auditor", False),
    "operator": ("Operador", False),
    "driver": ("Chofer", False),
}


def main():
    # Crea la tabla con el engine directo (sin los hooks de RLS de SessionLocal)
    models.Role.__table__.create(bind=engine, checkfirst=True)

    with engine.begin() as conn:
        for role in models.UserRole:
            key = role.value
            label, is_system = LABELS.get(key, (key.replace("_", " ").capitalize(), False))
            exists = conn.execute(text("SELECT 1 FROM sys_roles WHERE key = :k"), {"k": key}).fetchone()
            if exists:
                continue
            conn.execute(
                text("INSERT INTO sys_roles (key, label, is_system, is_enabled) VALUES (:k, :l, :s, true)"),
                {"k": key, "l": label, "s": is_system},
            )

        rows = conn.execute(text("SELECT key, label, is_system, is_enabled FROM sys_roles ORDER BY is_system DESC, key")).fetchall()
        print("sys_roles:")
        for r in rows:
            print(f"  {r[0]:<22} label={r[1]:<22} system={r[2]} enabled={r[3]}")


if __name__ == "__main__":
    main()
