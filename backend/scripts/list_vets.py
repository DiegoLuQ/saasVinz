from app.database import SessionLocal
from app.api.internal.partners.models import Veterinary

db = SessionLocal()
vets = db.query(Veterinary).all()

print(f"Found {len(vets)} veterinaries:")
for v in vets:
    print(f"ID: {v.id} | Name: {v.name} | Email: {v.email} | Slug: {v.slug} | Active: {v.is_active}")
    
db.close()
