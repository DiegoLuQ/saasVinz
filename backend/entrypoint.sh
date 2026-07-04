#!/bin/bash
set -e

# entrypoint.sh
# Orchestrates database setup and application startup

echo "Starting SaaS Crematorio Backend..."

# Function to wait for Postgres
wait_for_postgres() {
    echo "Waiting for PostgreSQL..."
    # You might want to use pg_isready or nc here if available
    # For now, we assume standard network availability or use a loop with python check
    # But since we installed netcat-traditional, we can use nc
    
    # We need host and port from env vars or default
    DB_HOST=${POSTGRES_HOST:-db}
    DB_PORT=${POSTGRES_PORT:-5432}
    
    while ! nc -z $DB_HOST $DB_PORT; do
      sleep 0.5
    done
    echo "PostgreSQL started on $DB_HOST:$DB_PORT"
}

# Esperar a que PostgreSQL acepte conexiones (pg_isready viene en la imagen).
if [ -z "$NO_DB_WAIT" ]; then
    DB_HOST=${POSTGRES_HOST:-db}
    DB_PORT=${POSTGRES_PORT:-5432}
    echo "Esperando a PostgreSQL en $DB_HOST:$DB_PORT..."
    until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "${POSTGRES_USER:-postgres}" >/dev/null 2>&1; do
        sleep 1
    done
    echo "PostgreSQL disponible."
fi

# Provisionar el rol de la app y la base de datos (idempotente).
# Requiere que POSTGRES_USER sea superusuario (o tenga CREATEROLE + CREATEDB).
# Desactivable con PROVISION_DB=false (si provisionas la BD manualmente).
if [ "$PROVISION_DB" != "false" ]; then
    echo "Provisionando rol y base de datos..."
    bash /app/scripts/provision_db.sh
fi

# Aplicar esquema, migraciones y seeds (como superusuario). Requiere que la
# base ya exista (la crea el paso de provisión anterior).
if [ "$RUN_MIGRATIONS" != "false" ]; then
    echo "Running Database Setup & Migrations..."
    echo "yes" | python scripts/database/setup_initial_db.py
fi

# Start Uvicorn
echo "Starting Uvicorn Server..."
# exec replaces the shell with the process, handling key signals correctly
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
