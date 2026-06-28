"""
Script de DEBUG para simular el bloqueo por suscripción vencida.

Uso (desde C:\\SISTEMAS-PRUEBA\\SaaSCrematorio_V2\\backend):

    # Forzar expiración (4 días atrás, fuera del periodo de gracia de 3 días)
    python scripts/database/force_subscription_expired.py expire <tenant_id_o_slug>

    # Restaurar fecha futura (30 días adelante)
    python scripts/database/force_subscription_expired.py restore <tenant_id_o_slug>

    # Listar tenants con su estado actual
    python scripts/database/force_subscription_expired.py list

Notas:
- El script también asegura que el tenant NO esté en plan "FREE" (los FREE bypasean el check).
  Si está en FREE lo pasa temporalmente a "PRO" al hacer "expire" (y avisa).
- No toca polar_*; solo billing_end_date / plan.
"""
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from datetime import datetime, timedelta
from app.database import SessionLocal
from app import models


def find_tenant(db, identifier: str):
    if identifier.isdigit():
        return db.query(models.Tenant).filter(models.Tenant.id == int(identifier)).first()
    return db.query(models.Tenant).filter(models.Tenant.slug == identifier).first()


def cmd_list(db):
    tenants = db.query(models.Tenant).order_by(models.Tenant.id).all()
    now = datetime.utcnow()
    print(f"{'ID':<4} {'SLUG':<20} {'PLAN':<8} {'BILLING_END':<22} {'STATUS_GRACIA'}")
    print("-" * 80)
    for t in tenants:
        end = t.billing_end_date.strftime('%Y-%m-%d %H:%M') if t.billing_end_date else '-'
        gracia = '-'
        if t.billing_end_date:
            limit = t.billing_end_date + timedelta(days=3)
            if now > limit:
                gracia = f"BLOQUEADO (limit={limit:%Y-%m-%d})"
            elif now > t.billing_end_date:
                gracia = f"EN GRACIA (limit={limit:%Y-%m-%d})"
            else:
                gracia = "VIGENTE"
        print(f"{t.id:<4} {(t.slug or '')[:19]:<20} {(t.plan or '')[:7]:<8} {end:<22} {gracia}")


def cmd_expire(db, identifier: str):
    t = find_tenant(db, identifier)
    if not t:
        print(f"Tenant '{identifier}' no encontrado.")
        return
    original_plan = t.plan
    if (t.plan or '').upper() == 'FREE':
        print(f"⚠️  Tenant {t.id} ({t.slug}) está en FREE — los planes FREE NO se bloquean.")
        print("    Cambiando temporalmente a 'PRO' para que el bloqueo aplique.")
        t.plan = 'PRO'
    new_date = datetime.utcnow() - timedelta(days=4)
    t.billing_end_date = new_date
    db.commit()
    print(f"✅ Tenant {t.id} ({t.slug}):")
    print(f"   plan: {original_plan} → {t.plan}")
    print(f"   billing_end_date → {new_date.isoformat()}  (hace 4 días, fuera de gracia)")
    print("\nAhora recarga el dashboard del tenant. Si el usuario tiene token activo,")
    print("la próxima petición autenticada devolverá HTTP 403 con code=subscription_expired")
    print("y disparará el modal de bloqueo.")


def cmd_restore(db, identifier: str):
    t = find_tenant(db, identifier)
    if not t:
        print(f"Tenant '{identifier}' no encontrado.")
        return
    new_date = datetime.utcnow() + timedelta(days=30)
    t.billing_end_date = new_date
    db.commit()
    print(f"✅ Tenant {t.id} ({t.slug}): billing_end_date → {new_date.isoformat()}  (30 días adelante)")
    print("   Nota: si cambiaste plan FREE→PRO con 'expire', restaura el plan manualmente si lo necesitas.")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    cmd = sys.argv[1].lower()
    db = SessionLocal()
    try:
        if cmd == 'list':
            cmd_list(db)
        elif cmd == 'expire' and len(sys.argv) >= 3:
            cmd_expire(db, sys.argv[2])
        elif cmd == 'restore' and len(sys.argv) >= 3:
            cmd_restore(db, sys.argv[2])
        else:
            print(__doc__)
    finally:
        db.close()


if __name__ == '__main__':
    main()
