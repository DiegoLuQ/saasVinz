-- =============================================================================
--  Provisión de la BD de Vincer dentro del Postgres compartido del VPS
--  (contenedor evolution_postgres). Ejecutar como SUPERUSUARIO (usuario_pro).
--
--  Crea:
--    1) El rol de la APP `vincer_app` — usuario NORMAL: el RLS se aplica sobre
--       él, garantizando el aislamiento multi-tenant. NO debe ser superusuario
--       ni tener BYPASSRLS.
--    2) La base de datos `v3_saas` propiedad del superusuario.
--
--  El superusuario `usuario_pro` (ya existente) se usa como DB_ADMIN para los
--  respaldos (ignora RLS por ser superusuario).
--
--  Uso (desde el host del VPS):
--    docker exec -i -e PGPASSWORD=<pass_usuario_pro> evolution_postgres \
--      psql -U usuario_pro -d postgres -f - < setup_production_roles.sql
--  (o copiar el archivo al contenedor y pasar -f /ruta/al/archivo.sql)
-- =============================================================================

-- 1) Rol de la aplicación (cambia la contraseña por la real de tu .env) --------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vincer_app') THEN
        CREATE ROLE vincer_app LOGIN PASSWORD 'CAMBIA_ESTA_PASSWORD'
            NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
    END IF;
END
$$;

-- 2) Base de datos -------------------------------------------------------------
-- CREATE DATABASE no puede ir dentro de un bloque DO/transacción; se ejecuta
-- de forma condicional con \gexec.
SELECT 'CREATE DATABASE v3_saas OWNER usuario_pro'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'v3_saas')
\gexec

-- 3) Privilegios del rol de la app sobre la base -------------------------------
GRANT CONNECT ON DATABASE v3_saas TO vincer_app;

-- Los privilegios sobre el schema/tablas se otorgan DENTRO de la base v3_saas.
-- Reconéctate a ella y ejecuta el bloque siguiente:
--    \connect v3_saas
--    GRANT USAGE, CREATE ON SCHEMA public TO vincer_app;
--    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO vincer_app;
--    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO vincer_app;
--    ALTER DEFAULT PRIVILEGES IN SCHEMA public
--        GRANT ALL ON TABLES TO vincer_app;
--    ALTER DEFAULT PRIVILEGES IN SCHEMA public
--        GRANT ALL ON SEQUENCES TO vincer_app;
