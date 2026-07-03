import sys
import os
# Add the backend directory to the sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models

def seed_plans():
    db = SessionLocal()
    try:
        # GUARD: este seed es SOLO bootstrap inicial. Sus valores (precios,
        # límites, sin plan Track) NO reflejan producción — la DB es la fuente
        # de verdad. Si ya hay planes, abortamos para no pisar datos reales.
        existing = db.query(models.SubscriptionPlan).count()
        if existing > 0:
            print(
                f"ABORTADO: ya existen {existing} planes en la base de datos.\n"
                "Este seed es solo para bootstrap de una DB vacía y sus valores "
                "están desactualizados respecto a producción (falta el plan Track, "
                "precios/límites viejos). Edita los planes vía el panel de admin "
                "o una migración."
            )
            return

        print("Sincronizando Planes de Suscripción...")
        
        # Módulos Base
        base_modules = ["dashboard", "perfil"]
        
        # Módulos Intermedios
        mid_modules = base_modules + ["clientes", "mascotas", "servicios", "ordenes", "productos"]
        
        # Módulos Avanzados
        advanced_modules = mid_modules + ["inventario", "configuracion"]
        
        # Módulos Premium
        premium_modules = advanced_modules + ["certificados", "pagos", "veterinarios", "operaciones"]

        plans_data = [
            {
                "name": "FREE",
                "price": 0.0,
                "annual_price": 0.0,
                "max_pets": 10,
                "max_services": 10,
                "max_plans": 4,
                "max_products": 10,
                "max_orders": 10,
                "max_customers": 10,
                "max_users": 3,
                "max_partners": 5,
                "allowed_modules": mid_modules,
                "can_delete": False,
                "can_export": False,
                "display_order": 1,
                "description": "Ideal para pequeños crematorios que están empezando."
            },
            {
                "name": "NORMAL",
                "price": 29990.0,
                "annual_price": 299900.0,
                "max_pets": 100,
                "max_services": 50,
                "max_plans": 10,
                "max_products": 100,
                "max_orders": 100,
                "max_customers": 200,
                "max_users": 10,
                "max_partners": 15,
                "allowed_modules": advanced_modules,
                "can_delete": True,
                "can_export": False,
                "display_order": 2,
                "description": "Gestión profesional para crematorios con flujo constante."
            },
            {
                "name": "PRO",
                "price": 59990.0,
                "annual_price": 599900.0,
                "max_pets": 1000,
                "max_services": 200,
                "max_plans": 20,
                "max_products": 500,
                "max_orders": 1000,
                "max_customers": 1000,
                "max_users": 30,
                "max_partners": 30,
                "allowed_modules": premium_modules,
                "can_delete": True,
                "can_export": True,
                "display_order": 3,
                "description": "Potencia total para crematorios de alto volumen."
            },
            {
                "name": "ULTRA",
                "price": 99990.0,
                "annual_price": 999900.0,
                "max_pets": 999999,
                "max_services": 999999,
                "max_plans": 999999,
                "max_products": 999999,
                "max_orders": 999999,
                "max_customers": 999999,
                "max_users": 999999,
                "max_partners": 999999,
                "allowed_modules": premium_modules, # ULTRA usually has everything
                "can_delete": True,
                "can_export": True,
                "display_order": 4,
                "description": "Escalabilidad ilimitada para empresas líderes en el mercado."
            }
        ]

        for plan_data in plans_data:
            existing_plan = db.query(models.SubscriptionPlan).filter(models.SubscriptionPlan.name == plan_data["name"]).first()
            if existing_plan:
                print(f"  - Actualizando plan {plan_data['name']}...")
                for key, value in plan_data.items():
                    setattr(existing_plan, key, value)
            else:
                print(f"  - Creando plan {plan_data['name']}...")
                new_plan = models.SubscriptionPlan(**plan_data)
                db.add(new_plan)
        
        db.commit()
        print("Sincronización de planes completada exitosamente.")
        
    except Exception as e:
        db.rollback()
        print(f"Error al sincronizar planes: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_plans()
