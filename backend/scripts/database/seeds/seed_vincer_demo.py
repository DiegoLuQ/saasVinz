import os
import sys

# Add the backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app import models
from datetime import datetime

def seed_demo_data():
    db = SessionLocal()
    try:
        from sqlalchemy import text
        db.execute(text("SET app.bypass_rls = 'true'"))
        db.execute(text("SET app.current_tenant_id = ''"))
        print("Iniciando la siembra (seeding) de datos de demostración para Tenant ID 1...")
        
        # 1. Asegurar que existe Tenant ID 1
        tenant = db.query(models.Tenant).filter(models.Tenant.id == 1).first()
        if not tenant:
            print("Error: El Tenant ID 1 no existe en la base de datos.")
            return
        
        print(f"Tenant encontrado: {tenant.name} (Slug: {tenant.slug})")
        
        # 2. Clientes (Customers)
        print("Creando clientes...")
        c1 = db.query(models.Customer).filter(models.Customer.tenant_id == 1, models.Customer.rut == "11.111.111-1").first()
        if not c1:
            c1 = models.Customer(
                tenant_id=1,
                rut="11.111.111-1",
                name="María González",
                email="maria@example.com",
                phone="+56911112222",
                address="Av. Providencia 1234",
                country="Chile",
                region="Metropolitana",
                city="Providencia"
            )
            db.add(c1)
            db.commit()
            db.refresh(c1)
            print(f"  - Cliente creado: {c1.name}")
        else:
            print(f"  - Cliente ya existe: {c1.name}")

        c2 = db.query(models.Customer).filter(models.Customer.tenant_id == 1, models.Customer.rut == "22.222.222-2").first()
        if not c2:
            c2 = models.Customer(
                tenant_id=1,
                rut="22.222.222-2",
                name="Carlos Muñoz",
                email="carlos@example.com",
                phone="+56933334444",
                address="Pasaje Las Flores 56",
                country="Chile",
                region="Metropolitana",
                city="Las Condes"
            )
            db.add(c2)
            db.commit()
            db.refresh(c2)
            print(f"  - Cliente creado: {c2.name}")
        else:
            print(f"  - Cliente ya existe: {c2.name}")

        # 3. Mascotas (Pets)
        print("Creando mascotas...")
        p1 = db.query(models.Pet).filter(models.Pet.tenant_id == 1, models.Pet.customer_id == c1.id, models.Pet.name == "Fido").first()
        if not p1:
            p1 = models.Pet(
                tenant_id=1,
                customer_id=c1.id,
                name="Fido",
                species="Perro",
                breed="Golden Retriever",
                size="Grande",
                age=10,
                status=models.PetStatus.received
            )
            db.add(p1)
            print(f"  - Mascota creada: {p1.name}")
        else:
            print(f"  - Mascota ya existe: {p1.name}")

        p2 = db.query(models.Pet).filter(models.Pet.tenant_id == 1, models.Pet.customer_id == c2.id, models.Pet.name == "Pelusa").first()
        if not p2:
            p2 = models.Pet(
                tenant_id=1,
                customer_id=c2.id,
                name="Pelusa",
                species="Gato",
                breed="Persa",
                size="Pequeño",
                age=5,
                status=models.PetStatus.processing
            )
            db.add(p2)
            print(f"  - Mascota creada: {p2.name}")
        else:
            print(f"  - Mascota ya existe: {p2.name}")

        # 4. Servicios (Services)
        print("Creando servicios...")
        s1 = db.query(models.Service).filter(models.Service.tenant_id == 1, models.Service.name == "Cremación Individual").first()
        if not s1:
            s1 = models.Service(
                tenant_id=1,
                name="Cremación Individual",
                description="Cremación individual de la mascota con entrega de cenizas en urna estándar.",
                price=150000.0,
                cost=50000.0,
                is_active=True
            )
            db.add(s1)
            print(f"  - Servicio creado: {s1.name}")
        else:
            print(f"  - Servicio ya existe: {s1.name}")

        s2 = db.query(models.Service).filter(models.Service.tenant_id == 1, models.Service.name == "Cremación Colectiva").first()
        if not s2:
            s2 = models.Service(
                tenant_id=1,
                name="Cremación Colectiva",
                description="Cremación comunitaria/colectiva, sin entrega de cenizas.",
                price=80000.0,
                cost=25000.0,
                is_active=True
            )
            db.add(s2)
            print(f"  - Servicio creado: {s2.name}")
        else:
            print(f"  - Servicio ya existe: {s2.name}")

        s3 = db.query(models.Service).filter(models.Service.tenant_id == 1, models.Service.name == "Traslado de Mascota").first()
        if not s3:
            s3 = models.Service(
                tenant_id=1,
                name="Traslado de Mascota",
                description="Retiro de la mascota desde clínica veterinaria o domicilio.",
                price=25000.0,
                cost=10000.0,
                is_active=True
            )
            db.add(s3)
            print(f"  - Servicio creado: {s3.name}")
        else:
            print(f"  - Servicio ya existe: {s3.name}")

        db.commit()
        # Refresh to get IDs
        if s1: db.refresh(s1)
        if s2: db.refresh(s2)
        if s3: db.refresh(s3)

        # 5. Planes (Plans)
        print("Creando planes...")
        pl1 = db.query(models.Plan).filter(models.Plan.tenant_id == 1, models.Plan.name == "Plan Memorial Premium").first()
        if not pl1:
            pl1 = models.Plan(
                tenant_id=1,
                name="Plan Memorial Premium",
                description="Incluye cremación individual, traslado prioritario, y ánfora de madera noble.",
                price=220000.0,
                cost=75000.0,
                is_active=True
            )
            db.add(pl1)
            db.commit()
            db.refresh(pl1)
            
            # Asociar servicios al plan
            service1 = db.query(models.Service).filter(models.Service.tenant_id == 1, models.Service.name == "Cremación Individual").first()
            service3 = db.query(models.Service).filter(models.Service.tenant_id == 1, models.Service.name == "Traslado de Mascota").first()
            if service1:
                db.add(models.PlanService(tenant_id=1, plan_id=pl1.id, service_id=service1.id))
            if service3:
                db.add(models.PlanService(tenant_id=1, plan_id=pl1.id, service_id=service3.id))
            print(f"  - Plan creado: {pl1.name} con sus servicios asociados.")
        else:
            print(f"  - Plan ya existe: {pl1.name}")

        pl2 = db.query(models.Plan).filter(models.Plan.tenant_id == 1, models.Plan.name == "Plan Básico").first()
        if not pl2:
            pl2 = models.Plan(
                tenant_id=1,
                name="Plan Básico",
                description="Incluye cremación colectiva y traslado básico.",
                price=95000.0,
                cost=30000.0,
                is_active=True
            )
            db.add(pl2)
            db.commit()
            db.refresh(pl2)
            
            service2 = db.query(models.Service).filter(models.Service.tenant_id == 1, models.Service.name == "Cremación Colectiva").first()
            service3 = db.query(models.Service).filter(models.Service.tenant_id == 1, models.Service.name == "Traslado de Mascota").first()
            if service2:
                db.add(models.PlanService(tenant_id=1, plan_id=pl2.id, service_id=service2.id))
            if service3:
                db.add(models.PlanService(tenant_id=1, plan_id=pl2.id, service_id=service3.id))
            print(f"  - Plan creado: {pl2.name} con sus servicios asociados.")
        else:
            print(f"  - Plan ya existe: {pl2.name}")

        # 6. Categorías, Proveedores y Productos (Inventory)
        print("Creando datos de inventario...")
        cat = db.query(models.Category).filter(models.Category.tenant_id == 1, models.Category.name == "Ánforas").first()
        if not cat:
            cat = models.Category(tenant_id=1, name="Ánforas", description="Ánforas y urnas para cenizas.")
            db.add(cat)
            db.commit()
            db.refresh(cat)
            print(f"  - Categoría creada: {cat.name}")
        
        prov = db.query(models.Provider).filter(models.Provider.tenant_id == 1, models.Provider.name == "Urnas de Chile Ltda").first()
        if not prov:
            prov = models.Provider(tenant_id=1, name="Urnas de Chile Ltda", rut="77.777.777-7", phone="+56988887777", email="contacto@urnas.cl")
            db.add(prov)
            db.commit()
            db.refresh(prov)
            print(f"  - Proveedor creado: {prov.name}")

        prod = db.query(models.Product).filter(models.Product.tenant_id == 1, models.Product.code == "URN-MAD-01").first()
        if not prod:
            prod = models.Product(
                tenant_id=1,
                category_id=cat.id,
                provider_id=prov.id,
                code="URN-MAD-01",
                name="Urna de Madera Noble",
                cost_price=15000.0,
                sale_price=45000.0,
                stock=25,
                description="Urna de madera nativa con acabado mate pulido a mano.",
                availability_status="Disponible",
                is_active=True
            )
            db.add(prod)
            print(f"  - Producto creado: {prod.name}")

        db.commit()
        print("¡Siembra de datos de demostración completada exitosamente!")
    except Exception as e:
        db.rollback()
        print(f"Error al sembrar los datos: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_data()
