-- 009_add_token_version_to_users.sql
-- Fase 3.1.a (M-2): invalidar sesiones al cambiar/resetear la contraseña.
-- Cada JWT lleva el claim "ver"; get_current_user lo compara con esta columna.
-- Al cambiar la contraseña se incrementa token_version, dejando inválidos los
-- tokens emitidos antes.

ALTER TABLE sys_users
    ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
