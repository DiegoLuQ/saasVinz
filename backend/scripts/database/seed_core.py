from app.database import SessionLocal
from app import models
from app.auth import get_password_hash
from app.api.internal.partners.models import Veterinary, PartnerLinkV2, PartnerLinkStatus

def seed_system_core(db):
    """Seeds basic system data (Plans, Modules, Creator)."""
    # 1. Plan FREE
    free_plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.name == "FREE").first()
    if not free_plan:
        print("  - Creando plan FREE...")
        free_plan = models.SubscriptionPlan(
            name="FREE", max_pets=10, max_services=10, max_plans=4, max_products=10,
            max_orders=10, max_customers=10, max_users=3,
            allowed_modules=["dashboard", "perfil", "clientes", "mascotas", "servicios", "ordenes"],
            can_delete=True, can_export=False, price=0.0
        )
        db.add(free_plan)
        db.commit()
        db.refresh(free_plan)

    # 2. System Tenant
    system_tenant = db.query(models.Tenant).filter(models.Tenant.slug == "system-admin").first()
    if not system_tenant:
        print("  - Creando System Tenant...")
        system_tenant = models.Tenant(
            name="SaaS Crematorio System", short_name="System", slug="system-admin",
            rut="00.000.000-0", email="system@saascrematorio.cl",
            status=models.TenantStatus.active, subscription_plan_id=free_plan.id, plan="FREE"
        )
        db.add(system_tenant)
        db.commit()
        db.refresh(system_tenant)

    # 3. Creator User
    creator_email = "creator@saascrematorio.cl"
    creator_user = db.query(models.User).filter(models.User.email == creator_email).first()
    if not creator_user:
        print("  - Creando Creator User (juan123)...")
        creator_user = models.User(
            tenant_id=system_tenant.id, name="Super Creator", email=creator_email,
            password_hash=get_password_hash("juan123"), role=models.UserRole.creator, is_active=True
        )
        db.add(creator_user)

    # 4. Modules
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
            print(f"  - Módulo {mod_data['key']} creado.")

    db.commit()

def seed_huellas_requested(db):
    """Seeds the specifically requested Huellas Tenant and Veterinary."""
    free_plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.name == "FREE").first()
    
    # Huellas Tenant
    tenant_email = "admin@huellas.cl"
    db_tenant = db.query(models.Tenant).filter(models.Tenant.email == tenant_email).first()
    if not db_tenant:
        print("  - Creando Tenant Huellas (admin@huellas.cl / juan123)...")
        db_tenant = models.Tenant(
            name="Huellas SaaS", short_name="Huellas", slug="huellas",
            rut="12.345.678-K", email=tenant_email, phone="+56912345678",
            status=models.TenantStatus.active, subscription_plan_id=free_plan.id, plan="FREE"
        )
        db.add(db_tenant)
        db.commit()
        db.refresh(db_tenant)

        db.add(models.User(
            tenant_id=db_tenant.id, name="Juan Admin", email=tenant_email,
            password_hash=get_password_hash("juan123"), role=models.UserRole.admin, is_active=True
        ))

    # Veterinary Central
    vet_email = "vet@central.cl"
    db_vet = db.query(Veterinary).filter(Veterinary.email == vet_email).first()
    if not db_vet:
        print("  - Creando Veterinaria Central (vet@central.cl / juan123)...")
        db_vet = Veterinary(
            name="Veterinaria Central", rut="77.888.999-0", slug="vet-central",
            email=vet_email, password_hash=get_password_hash("juan123"),
            phone="+56999998888", is_active=True
        )
        db.add(db_vet)
        db.commit()
        db.refresh(db_vet)

        # Link
        db.add(PartnerLinkV2(
            tenant_id=db_tenant.id, veterinary_id=db_vet.id,
            status=PartnerLinkStatus.active, slug_publico="central-link", percentage_comision=10.0
        ))

    db.commit()
