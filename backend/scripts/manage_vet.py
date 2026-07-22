from sqlalchemy import create_engine, text
from passlib.context import CryptContext

# DB URL from .env
DATABASE_URL = "postgresql://vinzer_boss:vinzer_boss_123@localhost:5432/v3_saas"

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

try:
    engine = create_engine(DATABASE_URL)
    conn = engine.connect()

    print("--- Existing Veterinaries ---")
    result = conn.execute(text("SELECT id, name, email, slug FROM sys_veterinaries"))
    vets = result.fetchall()
    
    found_target = False
    
    if not vets:
        print("No veterinaries found.")
    else:
        for v in vets:
            print(f"ID: {v.id} | Name: {v.name} | Email: {v.email} | Slug: {v.slug}")
            if v.email == "vet@central.cl":
                found_target = True

    target_email = "vet@central.cl"
    target_pass = "123456"
    hashed = get_password_hash(target_pass)

    if found_target:
        print(f"\nFound {target_email}. Updating password to '{target_pass}'...")
        conn.execute(text("UPDATE sys_veterinaries SET password_hash = :p WHERE email = :e"), {"p": hashed, "e": target_email})
        conn.commit()
        print("Password updated successfully.")
    else:
        print(f"\nUser {target_email} NOT found. Creating...")
        # Check if slug exists to avoid unique constraint error
        slug = "vet-central"
        slug_taken = any(v.slug == slug for v in vets)
        if slug_taken:
            slug = "vet-central-new"
        
        conn.execute(text("""
            INSERT INTO sys_veterinaries (name, rut, slug, email, password_hash, is_active, country, created_at, updated_at)
            VALUES ('Veterinaria Central', '77.888.999-0', :s, :e, :p, true, 'Chile', now(), now())
        """), {"s": slug, "e": target_email, "p": hashed})
        conn.commit()
        print(f"User created with password '{target_pass}'.")

    conn.close()
    print("\n--- Done ---")

except Exception as e:
    print(f"Error: {e}")
