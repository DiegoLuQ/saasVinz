import os
import sys

# Add backend directory to sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from sqlalchemy import create_engine, inspect, text
from alembic.config import Config
from alembic import command
from app.core.config import settings

def run_migrations():
    print("===================================================")
    print("   Alembic Migrations Runner")
    print("===================================================")
    
    # 1. Inspect current database state
    admin_url = settings.DB_ADMIN_URL or settings.SQLALCHEMY_DATABASE_URL
    engine = create_engine(admin_url)
    
    ini_path = os.path.join(BASE_DIR, "alembic.ini")
    cfg = Config(ini_path)
    
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        # Check if database has existing tables (e.g. from an existing DB or backup)
        # but has never been stamped with Alembic
        if "sys_tenants" in tables or "crm_customers" in tables:
            has_alembic_table = "alembic_version" in tables
            has_stamp = False
            if has_alembic_table:
                with engine.connect() as conn:
                    res = conn.execute(text("SELECT version_num FROM alembic_version")).fetchone()
                    has_stamp = bool(res and res[0])
            
            if not has_stamp:
                print("-> Base de datos existente detectada sin versión Alembic.")
                print("-> Marcando baseline inicial (stamp 3bf566cddb7d)...")
                command.stamp(cfg, "3bf566cddb7d")
                print("-> Baseline marcado exitosamente.")
        
        # 2. Run upgrade head
        print("-> Aplicando migraciones pendientes (alembic upgrade head)...")
        command.upgrade(cfg, "head")
        print("-> Migraciones de Alembic completadas con éxito.")
        print("===================================================")
    except Exception as e:
        print(f"-> Error ejecutando migraciones de Alembic: {e}")
        raise e

if __name__ == "__main__":
    run_migrations()
