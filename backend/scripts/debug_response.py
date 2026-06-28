
import sys
import os
import json
from uuid import UUID

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
import app.models 
from app.api.internal.memorials.models import Memorial
from app.api.internal.admin.models import Tenant, SubscriptionPlan
from app.api.internal.memorials.schemas import MemorialPublicResponse
from app.api.internal.memorials.router import _apply_memorial_limit
from sqlalchemy.orm import joinedload

def debug_response():
    db = SessionLocal()
    uuid_str = "230527e5-5eeb-4c74-a36e-0c333bd616cd"
    try:
        m = db.query(Memorial).options(
            joinedload(Memorial.tenant).joinedload(Tenant.subscription_plan),
            joinedload(Memorial.memorial_plan)
        ).filter(Memorial.id_recuerdo == UUID(uuid_str)).first()
        
        if not m:
            print("Memorial not found")
            return

        # Prepare object like the router does
        # 1. Apply limit (this adds .dedication_limit attribute)
        m = _apply_memorial_limit(m, db)
        
        # 2. Serialize using Pydantic Schema
        # We need to make sure the data passed matches the schema
        # The schema uses specifics like 'dedicatorias' vs 'dedications', etc.
        
        # Manually constructing dict to see what Pydantic sees
        print(f"--- INTERNAL ATTRIBUTES ---")
        print(f"dedication_limit: {getattr(m, 'dedication_limit', 'MISSING')}")
        print(f"dedications_count: {getattr(m, 'dedications_count', 'MISSING')}")
        print(f"plan: {m.plan}")
        
        dedicatorias = m.dedicatorias 
        print(f"Dedicatorias Count (Raw): {len(dedicatorias)}")
        for d in dedicatorias:
            # Inspection of available attributes
            print(f" - Dedication Object: {d.__dict__}")

        # Try to use Pydantic schema if possible to simulate JSON
        try:
            print("\n--- PYDANTIC SERIALIZATION ---")
            resp = MemorialPublicResponse.from_orm(m)
            json_output = resp.json()
            parsed = json.loads(json_output)
            print(json.dumps(parsed, indent=2))
        except Exception as e:
            print(f"Pydantic Error: {e}")
            
    except Exception as e:
        print(e)
    finally:
        db.close()

if __name__ == "__main__":
    debug_response()
