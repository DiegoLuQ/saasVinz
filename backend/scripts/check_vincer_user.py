import os
import sys
from sqlalchemy import create_engine, text

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
    sys.exit(1)

try:
    engine = create_engine(db_url)
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1 FROM pg_roles WHERE rolname = 'vincer_boss'")).scalar()
        if result:
            print("VINCER_BOSS_EXISTS")
        else:
            print("VINCER_BOSS_NOT_FOUND")
except Exception as e:
    print(f"Error: {e}")
