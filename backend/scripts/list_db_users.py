import os
import sys

# Add the backend directory to the sys.path to find modules if needed,
# though here we just need sqlalchemy which should be in venv.

# 1. Read .env manually to find connection string
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../.env'))
db_url = None

if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if line.startswith('SQLALCHEMY_DATABASE_URL='):
                db_url = line.split('=', 1)[1].strip()
                break

if not db_url:
    print("Error: SQLALCHEMY_DATABASE_URL not found in .env")
    # Fallback to the one I saw in context if file read fails logic
    # db_url = "postgresql://usuario_pro:diego123@127.0.0.1:5432/v3_saas"
    sys.exit(1)

print(f"Connecting to database...")

try:
    from sqlalchemy import create_engine, text
    
    engine = create_engine(db_url)
    
    with engine.connect() as connection:
        # Query users and their privileges
        query = text("""
            SELECT usename, usesuper, usecreatedb, usebypassrls 
            FROM pg_catalog.pg_user 
            ORDER BY usename;
        """)
        
        result = connection.execute(query).fetchall()
        
        print("\n" + "="*65)
        print(f"{'USUARIO':<20} | {'SUPERUSER':<10} | {'CREATEDB':<10} | {'BYPASSRLS':<10}")
        print("="*65)
        
        for row in result:
            # Handle row access safely (SQLAlchemy 1.4+ behaviors)
            try:
                username = row.usename
                is_super = row.usesuper
                can_create_db = row.usecreatedb
                bypass_rls = row.usebypassrls
            except AttributeError:
                # Fallback for tuple-like rows
                username = row[0]
                is_super = row[1]
                can_create_db = row[2]
                bypass_rls = row[3]
                
            print(f"{username:<20} | {'✅' if is_super else '❌':<10} | {'✅' if can_create_db else '❌':<10} | {'✅' if bypass_rls else '❌':<10}")
            
        print("="*65 + "\n")

except ImportError:
    print("Error: sqlalchemy is not installed. Please run 'pip install sqlalchemy psycopg2-binary'")
except Exception as e:
    print(f"Connection Error: {e}")
