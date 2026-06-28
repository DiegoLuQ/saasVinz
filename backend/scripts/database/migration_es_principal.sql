-- Migration: Add es_principal to oc_services and oc_plans
-- Run once on existing databases. Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE oc_services
    ADD COLUMN IF NOT EXISTS es_principal BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE oc_plans
    ADD COLUMN IF NOT EXISTS es_principal BOOLEAN NOT NULL DEFAULT FALSE;

-- All existing records represent the only service/plan on their order → mark as principal
UPDATE oc_services SET es_principal = TRUE WHERE es_principal = FALSE;
UPDATE oc_plans    SET es_principal = TRUE WHERE es_principal = FALSE;
