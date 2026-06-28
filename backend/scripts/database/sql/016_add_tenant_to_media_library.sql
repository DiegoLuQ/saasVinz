-- =====================================================
-- Migración 016: tenant_id en web_media_library
-- Fecha: 2026-06-13
-- Descripción: Permite filtrar la biblioteca de medios del SuperAdmin por
--   empresa. Hasta ahora el tenant solo vivía en la ruta de R2
--   (tenant_{id}/...); con esta columna queda consultable.
--   NULL = recurso global (subidas del creator: logos del SaaS, plantillas
--   globales, fondos de despedida, etc.).
--   Backfill: extrae el id desde la propia URL (patrón tenant_{n}/) para los
--   archivos ya existentes que se subieron segregados.
-- =====================================================

ALTER TABLE web_media_library ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES sys_tenants(id);

CREATE INDEX IF NOT EXISTS ix_web_media_library_tenant_id ON web_media_library (tenant_id);

UPDATE web_media_library
SET tenant_id = (substring(url from 'tenant_(\d+)/'))::int
WHERE tenant_id IS NULL
  AND url ~ 'tenant_\d+/';
