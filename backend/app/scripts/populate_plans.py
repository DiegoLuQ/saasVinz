import sys
import os
from datetime import datetime
from app.database import SessionLocal, engine, Base
from app import models

def populate_and_migrate():
    print("Ensuring tables exist...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Tables check/creation DONE.")
    except Exception as e:
        print(f"DATABASE CONNECTION ERROR: {e}")
        return
    
    db = SessionLocal()
    try:
        print("Populating Memorial Plans...")
        
        # 1. Define Plans
        plans_data = [
            {
                "name": "Plan Recuerdo",
                "name_db": "free",
                "price": 0.0,
                "features": {"max_images": 1, "max_dedications": 1, "vigencia_dias": 30, "altar_3d": False},
                "default_config": {"tema": "claro", "tipo_diseno": "editorial", "color_fondo": "#ffffff"}
            },
            {
                "name": "Plan Huella",
                "name_db": "normal",
                "price": 5990.0,
                "features": {"max_images": 1, "max_dedications": 9, "vigencia_dias": None, "altar_3d": False, "velas": 5},
                "default_config": {"tema": "claro", "tipo_diseno": "normal", "color_fondo": "#ffffff"}
            },
            {
                "name": "Plan Vínculo",
                "name_db": "pro",
                "price": 14990.0,
                "features": {"max_images": 3, "max_dedications": 1, "vigencia_dias": None, "altar_3d": False, "velas": 21, "fondo_personalizado": True},
                "default_config": {"tema": "dorado", "tipo_diseno": "carta", "color_fondo": "#ffffff"}
            },
            {
                "name": "Plan Paraíso",
                "name_db": "ultra",
                "price": 19990.0,
                "features": {"max_images": 5, "max_dedications": None, "vigencia_dias": None, "altar_3d": True, "velas": 33, "diseno_premium": True},
                "default_config": {"tema": "oscuro", "tipo_diseno": "cinematico", "color_fondo": "#0a192f"}
            }
        ]

        # 2. Insert or Update Plans
        db_plans = {}
        for p in plans_data:
            plan = db.query(models.MemorialPlan).filter(models.MemorialPlan.name_db == p["name_db"]).first()
            if not plan:
                plan = models.MemorialPlan(**p)
                db.add(plan)
                print(f"  + Created plan: {p['name_db']}")
            else:
                plan.name = p["name"]
                plan.price = p["price"]
                plan.features = p["features"]
                plan.default_config = p["default_config"]
                print(f"  ~ Updated plan: {p['name_db']}")
            
            db.flush()
            db_plans[p["name_db"]] = plan.id

        # 3. Migrate Existing Memorials
        print("\nMigrating existing memorials to new plan system...")
        memorials = db.query(models.Memorial).all()
        count = 0
        for m in memorials:
            # Map legacy strings to name_db
            legacy_plan = (m.plan or "").upper()
            target_name_db = None
            
            if legacy_plan == "RECUERDO":
                target_name_db = "free"
            elif legacy_plan == "NORMAL" or legacy_plan == "HUELLA":
                target_name_db = "normal"
            elif legacy_plan == "PRO" or legacy_plan == "VINCULO":
                target_name_db = "pro"
            elif legacy_plan == "ULTRA" or legacy_plan == "SANTUARIO":
                target_name_db = "ultra"
            
            if target_name_db and target_name_db in db_plans:
                m.plan_id = db_plans[target_name_db]
                m.plan = target_name_db.upper() 
                
                # Update design if it's currently using the old or missing settings
                # We identify current plans and force the new default layout
                target_config = next((p["default_config"] for p in plans_data if p["name_db"] == target_name_db), None)
                if target_config:
                    # Update without losing other potential fields, but forcing tipo_diseno and tema
                    current_diseno = m.diseno or {}
                    current_diseno.update(target_config)
                    m.diseno = current_diseno
                    
                count += 1
        
        db.commit()
        print(f"Finished! {count} memorials migrated.")

    except Exception as e:
        db.rollback()
        print(f"Error during migration: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    populate_and_migrate()
