-- =====================================================================
-- Migration: ops_farewell_templates.tenant_id → nullable
-- =====================================================================
-- Run this once on the production DB after deploying the model change.
-- Idempotent: safe to re-run; ALTER fails silently if already nullable on
-- some flavors but Postgres tolerates it.
-- =====================================================================

ALTER TABLE ops_farewell_templates
    ALTER COLUMN tenant_id DROP NOT NULL;

-- (Optional) verify:
-- SELECT column_name, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'ops_farewell_templates' AND column_name = 'tenant_id';
