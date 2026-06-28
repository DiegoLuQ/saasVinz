"""
Recreates the creator@saascrematorio.cl SuperAdmin user and its core system-admin tenant.
Ensures password is 'admin123' as per AUDITORIA.md.
"""
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from app.database import SessionLocal
from app import models
from app.auth import get_password_hash

def main():
    db = SessionLocal()
    try:
        print("[..] Checking system core structures...")

        # 1. Ensure FREE plan exists
        free_plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.name == "FREE").first()
        if not free_plan:
            print("  - Creating FREE subscription plan...")
            free_plan = models.SubscriptionPlan(
                name="FREE", max_pets=10, max_services=10, max_plans=4, max_products=10,
                max_orders=10, max_customers=10, max_users=3,
                allowed_modules=["dashboard", "perfil", "clientes", "mascotas", "servicios", "ordenes"],
                can_delete=True, can_export=False, price=0.0
            )
            db.add(free_plan)
            db.commit()
            db.refresh(free_plan)
        else:
            print("  [OK] FREE subscription plan exists.")

        # 2. Ensure system-admin Tenant exists
        system_tenant = db.query(models.Tenant).filter(models.Tenant.slug == "system-admin").first()
        if not system_tenant:
            print("  - Re-creating system-admin tenant...")
            system_tenant = models.Tenant(
                id=1,  # Keep ID 1 for system core
                name="SaaS Crematorio System", 
                short_name="System", 
                slug="system-admin",
                rut="00.000.000-0", 
                email="system@saascrematorio.cl",
                status=models.TenantStatus.active, 
                subscription_plan_id=free_plan.id, 
                plan="FREE"
            )
            db.add(system_tenant)
            db.commit()
            db.refresh(system_tenant)
        else:
            print("  [OK] system-admin tenant exists.")

        # 3. Recreate Creator User
        creator_email = "creator@saascrematorio.cl"
        creator_user = db.query(models.User).filter(models.User.email == creator_email).first()
        
        # We delete if it exists just to be absolutely clean and secure
        if creator_user:
            print("  - Found existing creator user, deleting to perform fresh registration...")
            db.delete(creator_user)
            db.commit()

        print("  - Creating Super Creator user with password 'admin123'...")
        creator_user = models.User(
            tenant_id=system_tenant.id,
            name="Super Creator",
            email=creator_email,
            password_hash=get_password_hash("admin123"),
            role=models.UserRole.creator,
            is_active=True
        )
        db.add(creator_user)
        db.commit()
        print("  [OK] Super Creator user created successfully.")

        # 4. Modules verification
        modules_data = [
            {"key": "dashboard", "name": "Dashboard", "icon": "LayoutDashboard"},
            {"key": "perfil", "name": "Perfil", "icon": "User"},
            {"key": "clientes", "name": "Clientes", "icon": "Users"},
            {"key": "mascotas", "name": "Mascotas", "icon": "Bone"},
            {"key": "servicios", "name": "Servicios", "icon": "Package"},
            {"key": "ordenes", "name": "Órdenes", "icon": "FileText"},
            {"key": "productos", "name": "Productos", "icon": "ShoppingCart"},
        ]
        for mod_data in modules_data:
            if not db.query(models.Module).filter(models.Module.key == mod_data["key"]).first():
                db.add(models.Module(**mod_data))
                print(f"  - Module '{mod_data['key']}' created.")
        db.commit()
        print("[SUCCESS] All system core and creator credentials have been fully restored.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to restore creator user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
