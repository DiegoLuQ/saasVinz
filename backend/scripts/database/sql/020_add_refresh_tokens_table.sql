-- =====================================================
-- Migración 020: Tabla de refresh tokens (S-01/S-02)
-- Fecha: 2026-07-05
-- Descripción: Soporte para sesiones con access token corto (60 min) +
--   refresh token rotatorio de 7 días entregado en cookie httpOnly.
--   El token viaja opaco (secrets.token_urlsafe) y aquí se guarda solo su
--   SHA-256; replaced_by_id encadena las rotaciones para detectar reuso
--   (un refresh ya rotado que vuelve a llegar => se revocan todos los
--   tokens del usuario).
--   SIN RLS: igual que sys_users, el lookup ocurre antes de poder fijar el
--   contexto de tenant (el tenant sale del propio usuario).
-- =====================================================

CREATE TABLE IF NOT EXISTS sys_refresh_tokens (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES sys_users(id) ON DELETE CASCADE,
    token_hash     VARCHAR(64) UNIQUE NOT NULL,   -- sha256 hex del token opaco
    expires_at     TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at     TIMESTAMP WITH TIME ZONE,
    replaced_by_id INTEGER REFERENCES sys_refresh_tokens(id),
    user_agent     VARCHAR(255),
    ip             VARCHAR(45),
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_sys_refresh_tokens_user_id    ON sys_refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS ix_sys_refresh_tokens_token_hash ON sys_refresh_tokens (token_hash);
