import os
import sys

# Add backend directory to sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from sqlalchemy import create_engine, inspect, text
from alembic.config import Config
from alembic.script import ScriptDirectory
from alembic import command
from alembic.util.exc import CommandError
from app.core.config import settings

BASELINE_REVISION = "3bf566cddb7d"

def run_migrations():
    print("===================================================")
    print("   Alembic Migrations Runner")
    print("===================================================")
    
    admin_url = settings.DB_ADMIN_URL or settings.SQLALCHEMY_DATABASE_URL
    engine = create_engine(admin_url)
    
    ini_path = os.path.join(BASE_DIR, "alembic.ini")
    cfg = Config(ini_path)
    script = ScriptDirectory.from_config(cfg)
    
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        # 1. Verificar si la BD ya tiene tablas de negocio (ej. sys_tenants o crm_customers)
        is_existing_db = "sys_tenants" in tables or "crm_customers" in tables
        
        if is_existing_db:
            has_alembic_table = "alembic_version" in tables
            needs_stamp = False
            
            if not has_alembic_table:
                needs_stamp = True
            else:
                with engine.connect() as conn:
                    rows = conn.execute(text("SELECT version_num FROM alembic_version")).fetchall()
                    if not rows:
                        needs_stamp = True
                    else:
                        for (rev,) in rows:
                            try:
                                script.get_revision(rev)
                            except CommandError:
                                print(f"-> Revisión huérfana/antigua detectada en la BD ('{rev}'). Limpiando...")
                                conn.execute(text("DELETE FROM alembic_version WHERE version_num = :rev"), {"rev": rev})
                                conn.commit()
                                needs_stamp = True
            
            if needs_stamp:
                print(f"-> Base de datos existente: Marcando baseline ({BASELINE_REVISION})...")
                command.stamp(cfg, BASELINE_REVISION)
                print("-> Baseline marcado exitosamente.")
        
        # 2. Ejecutar upgrade head
        print("-> Aplicando migraciones pendientes (alembic upgrade head)...")
        try:
            command.upgrade(cfg, "head")
        except CommandError as ce:
            if "Can't locate revision" in str(ce) and is_existing_db:
                print(f"-> Error de revisión no encontrada ({ce}). Reparando con stamp {BASELINE_REVISION}...")
                with engine.connect() as conn:
                    conn.execute(text("DELETE FROM alembic_version"))
                    conn.commit()
                command.stamp(cfg, BASELINE_REVISION)
                print("-> Reintentando upgrade head...")
                command.upgrade(cfg, "head")
            else:
                raise ce

        print("-> Migraciones de Alembic completadas con éxito.")
        print("===================================================")
    except Exception as e:
        print(f"-> Error ejecutando migraciones de Alembic: {e}")
        raise e

if __name__ == "__main__":
    run_migrations()
