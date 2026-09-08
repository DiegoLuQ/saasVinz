"""
Corrige el `display_order` de los planes de suscripción.

Motivo: la landing ordena las tarjetas por `display_order`. En la base de datos
revisada, **Track quedó con display_order = 4, empatado con ULTRA**, por lo que
se renderiza al final en vez de entre FREE y NORMAL, que es su posición
comercial (es el escalón entre el plan gratuito y el profesional).

Este script SOLO toca `display_order`. No modifica precios, topes ni módulos.

Uso:
    python scripts/database/fix_plan_display_order.py            # muestra el cambio, no escribe
    python scripts/database/fix_plan_display_order.py --apply    # aplica
"""
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import app.models  # noqa: F401  (registra todos los mappers de SQLAlchemy)
from app.database import SessionLocal
from app.api.internal.admin.models import SubscriptionPlan

# Orden comercial de menor a mayor.
DESIRED_ORDER = {
    "FREE": 1,
    "TRACK": 2,
    "NORMAL": 3,
    "PRO": 4,
    "ULTRA": 5,
}


def main(apply_changes: bool):
    db = SessionLocal()
    try:
        plans = db.query(SubscriptionPlan).all()
        changes = []

        for plan in plans:
            desired = DESIRED_ORDER.get((plan.name or "").upper())
            if desired is None:
                print(f"  - {plan.name}: sin orden definido, se deja como está ({plan.display_order})")
                continue
            if plan.display_order != desired:
                changes.append((plan, plan.display_order, desired))

        if not changes:
            print("Nada que corregir: el display_order ya es el esperado.")
            return

        print("Cambios pendientes:")
        for plan, current, desired in changes:
            print(f"  - {plan.name}: {current} -> {desired}")

        if not apply_changes:
            print("\nModo simulación. Vuelve a ejecutar con --apply para escribir.")
            return

        for plan, _, desired in changes:
            plan.display_order = desired
        db.commit()
        print(f"\nListo: {len(changes)} plan(es) actualizados.")

    finally:
        db.close()


if __name__ == "__main__":
    main(apply_changes="--apply" in sys.argv)
