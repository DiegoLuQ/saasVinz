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

# Wait for DB to be ready
# Note: Using nc requires knowing the host. In docker-compose usually 'db'.
# If you use a managed DB, this might pass immediately if the port is open.
# We skip this if NO_DB_WAIT is set
if [ -z "$NO_DB_WAIT" ]; then
    # Parse host from SQLALCHEMY_DATABASE_URL if possible, or fallback
    # For simplicity in this script, we'll try to rely on the app's retry logic 
    # OR the 'healthcheck' in docker-compose.
    # But let's add a small sleep just in case.
    echo "Giving DB a moment..."
    sleep 2
fi

# Run Database Setup
# We pipe "yes" to automatically confirm the setup script
if [ "$RUN_MIGRATIONS" != "false" ]; then
    echo "Running Database Setup & Migrations..."
    echo "yes" | python scripts/database/setup_initial_db.py
fi

# Start Uvicorn
echo "Starting Uvicorn Server..."
# exec replaces the shell with the process, handling key signals correctly
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
