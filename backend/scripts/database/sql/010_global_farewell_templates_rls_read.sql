-- =====================================================================
-- Migración 010: Lectura de plantillas de despedida GLOBALES bajo RLS
-- Fecha: 2026-06-05
-- =====================================================================
-- Contexto: la política estricta 007 (tenant_id = current_tenant_id OR bypass)
-- oculta las filas GLOBALES del sistema (tenant_id IS NULL) — las que el
-- SuperAdmin crea desde el panel admin "Diseños de Despedida"
-- (ver app/api/internal/creator/farewell/router.py, que documenta:
--  "Global templates have tenant_id = NULL and are visible to every tenant").
--
-- Esta política permisiva ADICIONAL restaura esa visibilidad SOLO para LECTURA.
-- La escritura de filas globales sigue restringida a bypass (creator) porque la
-- política tenant_isolation_policy (FOR ALL) exige tenant_id = current_tenant_id
-- en su WITH CHECK, y NULL nunca lo satisface.
--
-- Postgres combina políticas permisivas con OR: en SELECT, una fila es visible
-- si (tenant_id = current_tenant_id OR bypass) OR (tenant_id IS NULL).
-- Idempotente.
-- =====================================================================

DROP POLICY IF EXISTS farewell_global_read_policy ON ops_farewell_templates;

CREATE POLICY farewell_global_read_policy ON ops_farewell_templates
    FOR SELECT
    USING (tenant_id IS NULL);
