import os
import sys
from datetime import datetime, timedelta

# Add the backend directory to path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../'))
sys.path.insert(0, backend_dir)

from app.database import SessionLocal
from app.core.tenant_context import apply_bypass_rls
from app import models
from app.auth import get_password_hash
from sqlalchemy import text

def seed_vinzer_pet():
    db = SessionLocal()
    try:
        apply_bypass_rls(db)
        print("Iniciando la siembra (seeding) de datos para el tenant 'vinzer-pet'...")

        # 1. Asegurar plan de suscripción activo
        plan_pro = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.name == "PRO").first()
        if not plan_pro:
            plan_pro = db.query(models.SubscriptionPlan).first()

        # 2. Crear Tenant vinzer-pet
        tenant = db.query(models.Tenant).filter(models.Tenant.slug == "vinzer-pet").first()
        if not tenant:
            print("Creando Tenant: Vinzer Pet (vinzer-pet)...")
            tenant = models.Tenant(
                name="Vinzer Pet Crematorio",
                short_name="Vinzer Pet",
                slug="vinzer-pet",
                rut="76.123.456-7",
                email="admin@vinzer.cl",
                phone="+56998239540",
                status=models.TenantStatus.active,
                subscription_plan_id=plan_pro.id if plan_pro else None,
                plan="PRO"
            )
            db.add(tenant)
            db.commit()
            db.refresh(tenant)
        else:
            print(f"Tenant 'vinzer-pet' ya existe (ID: {tenant.id})")

        # 3. Crear Admin User para el Tenant
        admin_user = db.query(models.User).filter(models.User.email == "admin@vinzer.cl", models.User.tenant_id == tenant.id).first()
        if not admin_user:
            print("Creando usuario Administrador: admin@vinzer.cl...")
            admin_user = models.User(
                tenant_id=tenant.id,
                name="Administrador Vinzer",
                email="admin@vinzer.cl",
                password_hash=get_password_hash("juan123"),
                role=models.UserRole.admin,
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)

        # 4. Crear Pasos de Flujo de Trabajo (Workflow Steps)
        print("Registrando pasos de flujo de trabajo...")
        steps_data = [
            ("Registro de Servicio", 0),
            ("Retiro / Logística", 1),
            ("En Custodia", 2),
            ("Proceso de Cremación", 3),
            ("Entrega de Cenizas", 4)
        ]
        steps = []
        for name, idx in steps_data:
            step = db.query(models.WorkflowStep).filter(
                models.WorkflowStep.tenant_id == tenant.id,
                models.WorkflowStep.name == name
            ).first()
            if not step:
                step = models.WorkflowStep(
                    tenant_id=tenant.id,
                    name=name,
                    order_index=idx,
                    is_active=True
                )
                db.add(step)
                db.commit()
                db.refresh(step)
            steps.append(step)

        # 5. Clientes (Customers)
        print("Registrando clientes...")
        customers_data = [
            {"rut": "12.345.678-9", "name": "Juan Pérez", "email": "juan.perez@example.com", "phone": "+56912345678", "city": "Santiago"},
            {"rut": "9.876.543-2", "name": "María Rojas", "email": "maria.rojas@example.com", "phone": "+56987654321", "city": "Valparaíso"},
            {"rut": "15.678.123-K", "name": "Diego Torres", "email": "diego.torres@example.com", "phone": "+56955554433", "city": "Concepción"}
        ]
        customers = {}
        for c_data in customers_data:
            customer = db.query(models.Customer).filter(
                models.Customer.tenant_id == tenant.id,
                models.Customer.rut == c_data["rut"]
            ).first()
            if not customer:
                customer = models.Customer(
                    tenant_id=tenant.id,
                    rut=c_data["rut"],
                    name=c_data["name"],
                    email=c_data["email"],
                    phone=c_data["phone"],
                    address="Calle Principal 123",
                    country="Chile",
                    region="Metropolitana",
                    city=c_data["city"]
                )
                db.add(customer)
                db.commit()
                db.refresh(customer)
            customers[c_data["name"]] = customer

        # 6. Mascotas (Pets)
        print("Registrando mascotas...")
        pets_data = [
            {"name": "Toby", "species": "Perro", "breed": "Golden Retriever", "size": "Grande", "age": 11, "owner": "Juan Pérez", "status": models.PetStatus.delivered},
            {"name": "Pelusa", "species": "Gato", "breed": "Angora", "size": "Pequeño", "age": 4, "owner": "María Rojas", "status": models.PetStatus.processing},
            {"name": "Luna", "species": "Perro", "breed": "Beagle", "size": "Mediano", "age": 8, "owner": "Diego Torres", "status": models.PetStatus.received},
            {"name": "Rocky", "species": "Perro", "breed": "Boxer", "size": "Grande", "age": 9, "owner": "Juan Pérez", "status": models.PetStatus.received}
        ]
        pets = {}
        for p_data in pets_data:
            owner = customers[p_data["owner"]]
            pet = db.query(models.Pet).filter(
                models.Pet.tenant_id == tenant.id,
                models.Pet.customer_id == owner.id,
                models.Pet.name == p_data["name"]
            ).first()
            if not pet:
                pet = models.Pet(
                    tenant_id=tenant.id,
                    customer_id=owner.id,
                    name=p_data["name"],
                    species=p_data["species"],
                    breed=p_data["breed"],
                    size=p_data["size"],
                    age=p_data["age"],
                    status=p_data["status"]
                )
                db.add(pet)
                db.commit()
                db.refresh(pet)
            pets[p_data["name"]] = pet

        # 7. Categorías e Inventario
        print("Registrando categorías y proveedores...")
        cat_anforas = db.query(models.Category).filter(models.Category.tenant_id == tenant.id, models.Category.name == "Ánforas").first()
        if not cat_anforas:
            cat_anforas = models.Category(tenant_id=tenant.id, name="Ánforas", description="Ánforas y urnas para cenizas.")
            db.add(cat_anforas)
            db.commit()
            db.refresh(cat_anforas)

        prov_vinzer = db.query(models.Provider).filter(models.Provider.tenant_id == tenant.id, models.Provider.name == "Urnas y Recuerdos Vinzer").first()
        if not prov_vinzer:
            prov_vinzer = models.Provider(tenant_id=tenant.id, name="Urnas y Recuerdos Vinzer", rut="77.111.222-3", phone="+56911223344", email="proveedor@vinzer.cl")
            db.add(prov_vinzer)
            db.commit()
            db.refresh(prov_vinzer)

        print("Registrando productos...")
        products_data = [
            {"code": "URN-ROB-01", "name": "Urna de Roble Tallada", "cost": 20000.0, "sale": 65000.0},
            {"code": "REL-PLT-01", "name": "Relicario de Plata para Cenizas", "cost": 15000.0, "sale": 35000.0},
            {"code": "URN-ECO-01", "name": "Urna Ecológica Biodegradable", "cost": 8000.0, "sale": 25000.0},
            {"code": "URN-CER-02", "name": "Ánfora de Cerámica Esmaltada", "cost": 12000.0, "sale": 38000.0},
            {"code": "URN-CRZ-03", "name": "Relicario de Cuarzo Rosa", "cost": 18000.0, "sale": 45000.0},
            {"code": "URN-MAR-04", "name": "Urna de Mármol Pulido", "cost": 35000.0, "sale": 95000.0}
        ]
        products = {}
        for prod_d in products_data:
            product = db.query(models.Product).filter(
                models.Product.tenant_id == tenant.id,
                models.Product.code == prod_d["code"]
            ).first()
            if not product:
                product = models.Product(
                    tenant_id=tenant.id,
                    category_id=cat_anforas.id,
                    provider_id=prov_vinzer.id,
                    code=prod_d["code"],
                    name=prod_d["name"],
                    cost_price=prod_d["cost"],
                    sale_price=prod_d["sale"],
                    stock=25,
                    description=f"{prod_d['name']} de alta calidad.",
                    availability_status="Disponible",
                    is_active=True
                )
                db.add(product)
                db.commit()
                db.refresh(product)
            products[prod_d["name"]] = product

        # 8. Servicios y Planes
        print("Registrando servicios...")
        services_data = [
            {"name": "Cremación Individual Premium", "desc": "Cremación individual con entrega de cenizas en urna de roble y memorial virtual.", "price": 160000.0, "cost": 40000.0},
            {"name": "Cremación Colectiva", "desc": "Cremación comunitaria con esparcimiento de cenizas en jardín memorial.", "price": 70000.0, "cost": 18000.0},
            {"name": "Traslado Especial Domicilio/Clínica", "desc": "Servicio de retiro y custodia de mascota.", "price": 30000.0, "cost": 12000.0},
            {"name": "Cremación Express 12 Horas", "desc": "Servicio prioritario de cremación con entrega ultra rápida.", "price": 220000.0, "cost": 60000.0},
            {"name": "Ceremonia de Despedida Presencial", "desc": "Espacio de ceremonia privada de 30 minutos antes del proceso.", "price": 50000.0, "cost": 15000.0},
            {"name": "Huella de Arcilla en Relieve", "desc": "Recuerdo físico de la huella de la mascota.", "price": 20000.0, "cost": 5000.0},
            {"name": "Álbum Fotográfico Conmemorativo", "desc": "Álbum impreso con momentos de la mascota y del homenaje.", "price": 15000.0, "cost": 4000.0}
        ]
        services = {}
        for s_data in services_data:
            service = db.query(models.Service).filter(
                models.Service.tenant_id == tenant.id,
                models.Service.name == s_data["name"]
            ).first()
            if not service:
                service = models.Service(
                    tenant_id=tenant.id,
                    name=s_data["name"],
                    description=s_data["desc"],
                    price=s_data["price"],
                    cost=s_data["cost"],
                    is_active=True
                )
                db.add(service)
                db.commit()
                db.refresh(service)
            services[s_data["name"]] = service

        print("Registrando planes...")
        plans_data = [
            {"name": "Plan Vinzer Eterno", "desc": "Plan integral con cremación individual y traslado prioritario.", "price": 190000.0, "cost": 52000.0, "srvs": ["Cremación Individual Premium", "Traslado Especial Domicilio/Clínica"]},
            {"name": "Plan Vinzer Básico", "desc": "Plan económico con cremación colectiva y traslado básico.", "price": 90000.0, "cost": 30000.0, "srvs": ["Cremación Colectiva", "Traslado Especial Domicilio/Clínica"]}
        ]
        plans = {}
        for pl_d in plans_data:
            plan = db.query(models.Plan).filter(
                models.Plan.tenant_id == tenant.id,
                models.Plan.name == pl_d["name"]
            ).first()
            if not plan:
                plan = models.Plan(
                    tenant_id=tenant.id,
                    name=pl_d["name"],
                    description=pl_d["desc"],
                    price=pl_d["price"],
                    cost=pl_d["cost"],
                    is_active=True
                )
                db.add(plan)
                db.commit()
                db.refresh(plan)
                for sname in pl_d["srvs"]:
                    srv = services[sname]
                    db.add(models.PlanService(tenant_id=tenant.id, plan_id=plan.id, service_id=srv.id))
                db.commit()
            plans[pl_d["name"]] = plan

        # 9. Órdenes / Cremaciones (Operations)
        print("Registrando Órdenes de Cremación y Operaciones...")

        # --- ORDEN 1: COMPLETADO (delibered / entregado) ---
        c1 = db.query(models.CremationOC).filter(
            models.CremationOC.tenant_id == tenant.id,
            models.CremationOC.status == "entregado",
            models.CremationOC.pet_id == pets["Toby"].id
        ).first()
        if not c1:
            print("  - Creando Orden Completada (Toby)...")
            c1 = models.CremationOC(
                tenant_id=tenant.id,
                pet_id=pets["Toby"].id,
                oc_number=1001,
                cremation_type="Individual",
                status="entregado",
                verification_code="VNC-TOBY77",
                weight=32.5
            )
            db.add(c1)
            db.commit()
            db.refresh(c1)

            # Tablas asociadas
            db.add(models.PlanOC(tenant_id=tenant.id, cremation_id=c1.id, plan_id=plans["Plan Vinzer Eterno"].id, cantidad=1, precio_costo=52000.0, precio_venta=190000.0, es_principal=True))
            db.add(models.ProductoOC(tenant_id=tenant.id, cremation_id=c1.id, product_id=products["Urna de Roble Tallada"].id, cantidad=1, precio_costo=20000.0, precio_venta=65000.0))
            db.add(models.CremationDetails(tenant_id=tenant.id, cremation_id=c1.id, notes="Proceso finalizado. Cenizas entregadas en urna de roble."))
            db.add(models.CremationFinancial(tenant_id=tenant.id, cremation_id=c1.id, total_price=255000.0, total_cost=72000.0))
            db.add(models.CremationLogistics(tenant_id=tenant.id, cremation_id=c1.id, region="Metropolitana", city="Santiago", address="Av. Vitacura 9900", pickup_address="Av. Vitacura 9900"))
            db.add(models.CremationScheduling(tenant_id=tenant.id, cremation_id=c1.id, scheduled_at=datetime.utcnow() - timedelta(days=2), completed_at=datetime.utcnow() - timedelta(days=1)))
            db.add(models.CremationTechnical(cremation_id=c1.id, step_id=steps[4].id, operator_id=admin_user.id, furnace_id="Horno-A", start_at=datetime.utcnow() - timedelta(days=2), end_at=datetime.utcnow() - timedelta(days=2), temperature=850.0))
            db.commit()

        # --- ORDEN 2: EN PROCESO (en_proceso) ---
        c2 = db.query(models.CremationOC).filter(
            models.CremationOC.tenant_id == tenant.id,
            models.CremationOC.status == "en_proceso",
            models.CremationOC.pet_id == pets["Pelusa"].id
        ).first()
        if not c2:
            print("  - Creando Orden En Proceso (Pelusa)...")
            c2 = models.CremationOC(
                tenant_id=tenant.id,
                pet_id=pets["Pelusa"].id,
                oc_number=1002,
                cremation_type="Individual",
                status="en_proceso",
                verification_code="VNC-PELU33",
                weight=4.2
            )
            db.add(c2)
            db.commit()
            db.refresh(c2)

            # Tablas asociadas
            db.add(models.ServicioOC(tenant_id=tenant.id, cremation_id=c2.id, service_id=services["Cremación Individual Premium"].id, cantidad=1, precio_costo=40000.0, precio_venta=160000.0, es_principal=True))
            db.add(models.CremationDetails(tenant_id=tenant.id, cremation_id=c2.id, notes="Mascota ingresada en cámara fría. Esperando turno."))
            db.add(models.CremationFinancial(tenant_id=tenant.id, cremation_id=c2.id, total_price=160000.0, total_cost=40000.0))
            db.add(models.CremationLogistics(tenant_id=tenant.id, cremation_id=c2.id, region="Metropolitana", city="Valparaíso", address="Plaza Sotomayor 44", pickup_address="Plaza Sotomayor 44"))
            db.add(models.CremationScheduling(tenant_id=tenant.id, cremation_id=c2.id, scheduled_at=datetime.utcnow()))
            db.add(models.CremationTechnical(cremation_id=c2.id, step_id=steps[2].id))
            db.commit()

        # --- ORDEN 3: CANCELADA (cancelado) ---
        c3 = db.query(models.CremationOC).filter(
            models.CremationOC.tenant_id == tenant.id,
            models.CremationOC.status == "cancelado",
            models.CremationOC.pet_id == pets["Rocky"].id
        ).first()
        if not c3:
            print("  - Creando Orden Cancelada (Rocky)...")
            c3 = models.CremationOC(
                tenant_id=tenant.id,
                pet_id=pets["Rocky"].id,
                oc_number=1003,
                cremation_type="Colectiva",
                status="cancelado",
                verification_code="VNC-ROCK12",
                weight=28.0
            )
            db.add(c3)
            db.commit()
            db.refresh(c3)

            # Tablas asociadas
            db.add(models.PlanOC(tenant_id=tenant.id, cremation_id=c3.id, plan_id=plans["Plan Vinzer Básico"].id, cantidad=1, precio_costo=30000.0, precio_venta=90000.0, es_principal=True))
            db.add(models.CremationDetails(tenant_id=tenant.id, cremation_id=c3.id, notes="El cliente canceló el servicio y decidió retirar el cuerpo."))
            db.add(models.CremationFinancial(tenant_id=tenant.id, cremation_id=c3.id, total_price=90000.0, total_cost=30000.0))
            db.add(models.CremationScheduling(tenant_id=tenant.id, cremation_id=c3.id, scheduled_at=datetime.utcnow() - timedelta(days=5)))
            db.commit()

        # --- ORDEN 4: PENDIENTE / RECIBIDA (received) ---
        c4 = db.query(models.CremationOC).filter(
            models.CremationOC.tenant_id == tenant.id,
            models.CremationOC.status == "received",
            models.CremationOC.pet_id == pets["Luna"].id
        ).first()
        if not c4:
            print("  - Creando Orden Pendiente (Luna)...")
            c4 = models.CremationOC(
                tenant_id=tenant.id,
                pet_id=pets["Luna"].id,
                oc_number=1004,
                cremation_type="Colectiva",
                status="received",
                verification_code="VNC-LUNA45",
                weight=14.0
            )
            db.add(c4)
            db.commit()
            db.refresh(c4)

            # Tablas asociadas
            db.add(models.PlanOC(tenant_id=tenant.id, cremation_id=c4.id, plan_id=plans["Plan Vinzer Básico"].id, cantidad=1, precio_costo=30000.0, precio_venta=90000.0, es_principal=True))
            db.add(models.CremationDetails(tenant_id=tenant.id, cremation_id=c4.id, notes="Mascota en tránsito hacia el crematorio."))
            db.add(models.CremationFinancial(tenant_id=tenant.id, cremation_id=c4.id, total_price=90000.0, total_cost=30000.0))
            db.add(models.CremationScheduling(tenant_id=tenant.id, cremation_id=c4.id, scheduled_at=datetime.utcnow() + timedelta(days=1)))
            db.commit()

        print("¡Siembra de datos para 'vinzer-pet' completada exitosamente!")
    except Exception as e:
        db.rollback()
        print(f"Error al sembrar los datos: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_vinzer_pet()
