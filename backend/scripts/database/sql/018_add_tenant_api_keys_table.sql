-- =====================================================
-- Migración 018: Tabla de API Keys públicas por Tenant
-- Fecha: 2026-06-29
-- Descripción: Soporte para el "Motor de Widgets Embebibles".
--   Cada tenant puede generar claves públicas (pk_vinzer_live_...) para
--   embeber un widget en sitios externos (WordPress, etc.). Las claves son
--   públicas por diseño; la seguridad se basa en una whitelist de dominios
--   (allowed_domains) validada contra el header Origin en cada petición.
--   Aplica RLS estricta (igual que el resto de tablas multi-inquilino): la
--   búsqueda pública por api_key se hace bajo bypass (la clave es única
--   globalmente) y luego se fija el tenant para las consultas de catálogo.
-- =====================================================

CREATE TABLE IF NOT EXISTS sys_tenant_api_keys (
    id              SERIAL PRIMARY KEY,
    tenant_id       INTEGER NOT NULL REFERENCES sys_tenants(id) ON DELETE CASCADE,
    name            VARCHAR(120) NOT NULL DEFAULT 'Widget Web',
    api_key         VARCHAR(255) UNIQUE NOT NULL,         -- Ej: pk_vinzer_live_xxx
    allowed_domains JSONB NOT NULL DEFAULT '[]'::jsonb,   -- ["mi-crematorio.cl", "www.mi-crematorio.cl"]
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_used_at    TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_sys_tenant_api_keys_tenant_id ON sys_tenant_api_keys (tenant_id);
CREATE INDEX IF NOT EXISTS ix_sys_tenant_api_keys_api_key   ON sys_tenant_api_keys (api_key);

-- Row Level Security: misma política estricta que el resto de tablas tenant.
ALTER TABLE sys_tenant_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE sys_tenant_api_keys FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON sys_tenant_api_keys;
CREATE POLICY tenant_isolation_policy ON sys_tenant_api_keys
    FOR ALL
    USING (
        (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::integer)
        OR (current_setting('app.bypass_rls', true) = 'true')
    );
