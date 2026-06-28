-- =====================================================
-- Migración 014: tenant_id nullable en sys_audit_logs
-- Fecha: 2026-06-12
-- Descripción: Las acciones del SuperAdmin (creator) no tienen tenant
--   propio. Hasta ahora el middleware de auditoría las descartaba porque
--   el token no trae tenant_id y la columna era NOT NULL — el rol con más
--   privilegios operaba sin rastro (hallazgo BE-01 de AUDITORIA_MEJORAS.md).
--   Con tenant_id NULL la fila solo es visible bajo app.bypass_rls = 'true'
--   (la política tenant_isolation_policy no matchea NULL), es decir,
--   únicamente el propio creator puede leer su auditoría global.
-- =====================================================

ALTER TABLE sys_audit_logs ALTER COLUMN tenant_id DROP NOT NULL;
