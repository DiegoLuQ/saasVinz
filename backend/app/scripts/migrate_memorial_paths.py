import os
import sys

# Add backend root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from app.database import SessionLocal
from app.api.internal.memorials.models import Memorial
from app.models import Pet
import json

def clean_path(url: str) -> str:
    if not url: return url
    if url.startswith("http"): return url
    
    clean_url = url.replace("\\", "/").lstrip("/")
    prefixes_to_strip = ["app/static/storage/", "static/storage/", "app/static/", "static/", "storage/"]
    for prefix in prefixes_to_strip:
        if clean_url.startswith(prefix):
            clean_url = clean_url[len(prefix):]
            break
    return clean_url

def migrate():
    db = SessionLocal()
    try:
        # 1. Migrate Memorials
        memorials = db.query(Memorial).all()
        print(f"Migrating {len(memorials)} memorials...")
        for m in memorials:
            changed = False
            
            # Clean main_image_url
            if m.main_image_url:
                new_main = clean_path(m.main_image_url)
                if new_main != m.main_image_url:
                    print(f"Memorial {m.id}: {m.main_image_url} -> {new_main}")
                    m.main_image_url = new_main
                    changed = True
            
            # Clean lista_imagenes
            if m.lista_imagenes:
                new_list = [clean_path(img) for img in m.lista_imagenes]
                if new_list != m.lista_imagenes:
                    print(f"Memorial {m.id}: Updated lista_imagenes")
                    m.lista_imagenes = new_list
                    changed = True
                    
            if changed:
                db.add(m)

        # 2. Migrate Pets
        pets = db.query(Pet).all()
        print(f"\nMigrating {len(pets)} pets...")
        for p in pets:
            changed = False
            
            # Clean image_url
            if p.image_url:
                new_url = clean_path(p.image_url)
                if new_url != p.image_url:
                    print(f"Pet {p.id}: {p.image_url} -> {new_url}")
                    p.image_url = new_url
                    changed = True
            
            # Clean images
            if p.images:
                new_imgs = [clean_path(img) for img in p.images]
                if new_imgs != p.images:
                    print(f"Pet {p.id}: Updated images gallery")
                    p.images = new_imgs
                    changed = True
                    
            if changed:
                db.add(p)

        db.commit()
        print("\n✅ Migration completed successfully.")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error during migration: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
