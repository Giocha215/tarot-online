-- ------------------------------------------------------------------
-- 003_password_reset — tokens de recuperación de contraseña
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Solo se guarda el SHA-256 del token; el token en claro viaja en el enlace.
  token_hash  TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS password_reset_user_idx    ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS password_reset_expires_idx ON password_reset_tokens (expires_at);
