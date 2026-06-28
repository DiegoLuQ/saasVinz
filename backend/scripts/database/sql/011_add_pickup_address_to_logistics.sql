-- Migration: Add pickup (RETIRO) address columns to oc_logistics
-- The existing region/city/address represent the ENTREGA (delivery) address.
-- These new columns hold the RETIRO (pickup) address.
-- Run once on existing databases. Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE oc_logistics
    ADD COLUMN IF NOT EXISTS pickup_region VARCHAR,
    ADD COLUMN IF NOT EXISTS pickup_city VARCHAR,
    ADD COLUMN IF NOT EXISTS pickup_address VARCHAR;
