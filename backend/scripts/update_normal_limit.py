
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
import app.models 
from app.api.internal.memorials.models import MemorialPlan

def update_normal_plan_limit():
    db = SessionLocal()
    try:
        # Find 'normal' plan
        normal = db.query(MemorialPlan).filter(MemorialPlan.name_db == 'normal').first()
        if normal:
             print(f"Plan Normal Limit current: {normal.features.get('velas')}")
             features = dict(normal.features or {})
             features['velas'] = 5
             features['max_dedications'] = 5
             normal.features = features
             from sqlalchemy.orm.attributes import flag_modified
             flag_modified(normal, "features")
             db.commit()
             print(f"Plan Normal Limit UPDATED to: 5")
        else:
             print("Plan Normal not found.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    update_normal_plan_limit()
