import sys
import os
import time

# Add the backend directory to the sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from sqlalchemy import text
from app.database import engine, SessionLocal
from scripts.database import seed_core, seed_plans

def read_sql_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return f.read()

def run_setup():
    print("===================================================")
    print("   SaaS Crematorio - Database Setup Script")
    print("===================================================")
    print("Warning: This script will initialize the database schema and apply migrations.")
    print("Ensure you are connected to the CORRECT database.")
    
    # Use Admin URL for underprivileged migrations
    from app.core.config import settings
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    admin_url = settings.DB_ADMIN_URL
    admin_engine = create_engine(admin_url)
    AdminSession = sessionmaker(autocommit=False, autoflush=False, bind=admin_engine)
    
    print(f"Database URL (Admin): {admin_url.split('@')[-1]}") # Hide credentials
    print("===================================================")
    
    # 1. Initialize Schema (init_database.sql)
    print("\n[1/5] Initializing Base Schema...")
    init_script_path = os.path.join(os.path.dirname(__file__), 'init_database.sql')
    if os.path.exists(init_script_path):
        try:
            with admin_engine.connect() as connection:
                connection.execute(text(read_sql_file(init_script_path)))
                connection.commit()
            print("  -> Base schema initialized successfully.")
        except Exception as e:
            print(f"  -> Error initializing schema: {e}")
            return
    else:
        print(f"  -> Error: {init_script_path} not found.")
        return

    # 2. Create App User (Optional/Privileged)
    print("\n[2/5] Creating App User...")
    user_script_path = os.path.join(os.path.dirname(__file__), 'sql/create_app_user.sql')
    if os.path.exists(user_script_path):
        try:
            with admin_engine.connect() as connection:
                # This might fail if the current user doesn't have superuser rights
                # We split by 'DO $$' to try executing it as a block if needed, 
                # but SQLAlchemy usually handles DO blocks fine if passing raw text.
                connection.execute(text(read_sql_file(user_script_path)))
                connection.commit()
            print("  -> App user created/updated.")
        except Exception as e:
            print(f"  -> Warning: Could not create app user: {e}")
            print("     Continuing with schema setup...")

    # 3. Apply Migrations (sql/*.sql)
    print("\n[3/5] Applying Migrations from sql/...")
    sql_dir = os.path.join(os.path.dirname(__file__), 'sql')
    if os.path.exists(sql_dir):
        migration_files = sorted([f for f in os.listdir(sql_dir) if f.endswith('.sql') and f != 'create_app_user.sql'])
        
        with admin_engine.connect() as connection:
            for sql_file in migration_files:
                print(f"  -> Applying {sql_file}...")
                full_path = os.path.join(sql_dir, sql_file)
                try:
                    connection.execute(text(read_sql_file(full_path)))
                    connection.commit()
                except Exception as e:
                    print(f"     -> Error applying {sql_file}: {e}")
                    # We continue? Usually DB migrations should stop on error, but for setup we might retry.
                    # For now, we continue but log error.
    else:
        print("  -> No sql/ directory found.")

    # 4. Seed Core Data (Plans, Modules, System Tenant)
    print("\n[4/5] Seeding System Core Data...")
    db = AdminSession()
    try:
        seed_core.seed_system_core(db)
        print("  -> System Core seeded.")
    except Exception as e:
        print(f"  -> Error seeding core: {e}")
    finally:
        db.close()

    # 5. Seed Plans (Detailed Plan Configuration)
    # The seed_plans might use its own engine/session internally, but we can try to pass one if needed.
    # Currently it seems it uses app.database.SessionLocal. we override it for this process.
    import scripts.database.seed_plans as seed_plans_mod
    seed_plans_mod.SessionLocal = AdminSession 
    
    print("\n[5/5] Seeding Subscription Plans...")
    try:
        seed_plans_mod.seed_plans()
        print("  -> Plans seeded.")
    except Exception as e:
        print(f"  -> Error seeding plans: {e}")

    print("\n===================================================")
    print("   Setup Complete!")
    print("===================================================")

if __name__ == "__main__":
    confirm = input("Are you sure you want to run the setup? This handles DB Schema & Seeds. (yes/no): ")
    if confirm.lower() == "yes":
        run_setup()
    else:
        print("Setup cancelled.")
