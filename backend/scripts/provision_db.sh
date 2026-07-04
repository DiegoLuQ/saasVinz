#!/bin/bash
# =============================================================================
#  provision_db.sh — Crea el rol de la app y la base de datos (idempotente).
#
#  Lo ejecuta el entrypoint del backend ANTES de las migraciones, usando las
#  credenciales del SUPERUSUARIO (POSTGRES_USER/POSTGRES_PASSWORD). Sustituye al
#  paso manual con setup_production_roles.sql.
#
#  Requiere que POSTGRES_USER tenga privilegios para CREATE ROLE y CREATE
#  DATABASE (superusuario, o CREATEROLE + CREATEDB).
#
#  Se puede desactivar con PROVISION_DB=false.
# =============================================================================
set -e

# Variables requeridas (vienen del .env raíz vía env_file en docker-compose)
: "${POSTGRES_HOST:?Falta POSTGRES_HOST}"
: "${POSTGRES_USER:?Falta POSTGRES_USER}"
: "${POSTGRES_PASSWORD:?Falta POSTGRES_PASSWORD}"
: "${POSTGRES_DB:?Falta POSTGRES_DB}"
: "${APP_USER:?Falta APP_USER}"
: "${APP_USER_PASSWORD:?Falta APP_USER_PASSWORD}"
PORT="${POSTGRES_PORT:-5432}"

export PGPASSWORD="$POSTGRES_PASSWORD"
PSQL_SU="psql -v ON_ERROR_STOP=1 -h $POSTGRES_HOST -p $PORT -U $POSTGRES_USER"

echo "[provision] Rol '$APP_USER' y base '$POSTGRES_DB' en $POSTGRES_HOST..."

# 1) Rol de la app (NO superusuario) + base de datos. Conectado a 'postgres'.
#    CREATE DATABASE no admite bloque transaccional: se usa \gexec condicional.
$PSQL_SU -d postgres <<SQL
DO \$do\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_USER}') THEN
    CREATE ROLE ${APP_USER} LOGIN PASSWORD '${APP_USER_PASSWORD}'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
    RAISE NOTICE 'Rol ${APP_USER} creado.';
  ELSE
    ALTER ROLE ${APP_USER} WITH PASSWORD '${APP_USER_PASSWORD}';
    RAISE NOTICE 'Rol ${APP_USER} ya existía; contraseña actualizada.';
  END IF;
END
\$do\$;

SELECT 'CREATE DATABASE ${POSTGRES_DB} OWNER ${POSTGRES_USER}'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '${POSTGRES_DB}')\gexec

GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${APP_USER};
SQL

# 2) Privilegios del rol de la app DENTRO de la base. Las ALTER DEFAULT
#    PRIVILEGES hacen que las tablas que creen las migraciones (como el
#    superusuario) queden accesibles automáticamente para el rol de la app.
$PSQL_SU -d "$POSTGRES_DB" <<SQL
GRANT USAGE ON SCHEMA public TO ${APP_USER};
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${APP_USER};
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${APP_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${APP_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO ${APP_USER};
SQL

echo "[provision] OK."
