-- ==========================================================
-- SCRIPT DE CREACIÓN DE USUARIO VINZER_BOSS (NO-SUPERUSER)
-- ==========================================================
-- NOTA: Este script DEBE ser ejecutado por un Superusuario (postgres)

DO $$ 
BEGIN 
    -- 0. Limpiar usuario anterior si existe
    DROP ROLE IF EXISTS huellas_app;
    RAISE NOTICE 'Anterior usuario huellas_app eliminado (si existía).';

    -- 1. Crear el nuevo rol vinzer_boss
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'vinzer_boss') THEN
        CREATE ROLE vinzer_boss WITH LOGIN PASSWORD 'diego123.';
        RAISE NOTICE 'Usuario vinzer_boss creado exitosamente.';
    ELSE
        ALTER ROLE vinzer_boss WITH PASSWORD 'diego123.';
        RAISE NOTICE 'Usuario vinzer_boss ya existe. Contraseña actualizada.';
    END IF;
END $$;

-- 2. Permisos de Conexión (Dinámico para la base de datos actual)
DO $$
BEGIN
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO vinzer_boss', current_database());
END $$;

-- 3. Permisos en el esquema public
GRANT USAGE ON SCHEMA public TO vinzer_boss;

-- 4. Permisos de Datos (Tablas actuales)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vinzer_boss;

-- 5. Permisos de Secuencias (para IDs autoincrementales)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vinzer_boss;

-- 6. PERMISOS FUTUROS
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO vinzer_boss;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO vinzer_boss;

DO $$ 
BEGIN 
    RAISE NOTICE 'Identidad VINZER configurada en la base de datos.';
END $$;
