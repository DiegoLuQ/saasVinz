-- Migration: demo access to a higher plan (temporary), without changing the
-- contracted plan or billing. Adds demo_plan_id + demo_expires_at to tenants.
-- Idempotent.

ALTER TABLE sys_tenants
    ADD COLUMN IF NOT EXISTS demo_plan_id INTEGER REFERENCES sys_subscription_plans(id),
    ADD COLUMN IF NOT EXISTS demo_expires_at TIMESTAMP;
