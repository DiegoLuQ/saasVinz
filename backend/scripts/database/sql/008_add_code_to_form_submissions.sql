-- =====================================================
-- Migración 008: Código alfanumérico de identificación en sumisiones públicas
-- Fecha: 2026-05-21
-- Descripción: Añade la columna `code` (VARCHAR(20), UNIQUE, nullable) a
--   web_form_submissions. Es nullable para mantener retrocompatibilidad
--   con registros existentes. Los nuevos registros se generan con un código
--   alfanumérico único de 10 caracteres en mayúscula desde el backend.
-- =====================================================

ALTER TABLE web_form_submissions
    ADD COLUMN IF NOT EXISTS code VARCHAR(20) UNIQUE;

CREATE INDEX IF NOT EXISTS ix_web_form_submissions_code
    ON web_form_submissions (code);
