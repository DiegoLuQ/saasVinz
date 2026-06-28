
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
import app.models 
from app.api.internal.memorials.models import MemorialPlan

def revert_normal_plan_limit():
    db = SessionLocal()
    try:
        # Find 'normal' plan
        normal = db.query(MemorialPlan).filter(MemorialPlan.name_db == 'normal').first()
        if normal:
             print(f"Plan Normal Limit current: {normal.features.get('velas')}")
             features = dict(normal.features or {})
             features['velas'] = 9
             features['max_dedications'] = 9
             normal.features = features
             from sqlalchemy.orm.attributes import flag_modified
             flag_modified(normal, "features")
             db.commit()
             print(f"Plan Normal Limit REVERTED to: 9")
        else:
             print("Plan Normal not found.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    revert_normal_plan_limit()
