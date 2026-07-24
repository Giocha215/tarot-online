-- ------------------------------------------------------------------
-- 001_init — usuarios, refresh tokens y catálogo mínimo de servicios
-- ------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- --------------------------- usuarios -----------------------------
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          TEXT        NOT NULL,
  password_hash  TEXT        NOT NULL,
  display_name   TEXT        NOT NULL,
  role           TEXT        NOT NULL DEFAULT 'client'
                             CHECK (role IN ('client', 'consultant', 'admin')),
  -- saldo en céntimos: entero, nunca float, para no perder dinero por redondeo
  balance_cents  INTEGER     NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  email_verified BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unicidad case-insensitive: "Ana@x.com" y "ana@x.com" son la misma cuenta.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key
  ON users (LOWER(email));

-- ------------------------ refresh tokens --------------------------
-- Se guarda solo el SHA-256 del token. Si alguien vuelca la tabla no
-- puede reutilizar ninguna sesión.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,
  -- agrupa la cadena de rotaciones de una misma sesión (detección de reuso)
  family_id   UUID        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  user_agent  TEXT,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx  ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_family_idx   ON refresh_tokens (family_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_expires_idx  ON refresh_tokens (expires_at);

-- --------------------------- servicios ----------------------------
CREATE TABLE IF NOT EXISTS services (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  channel           TEXT NOT NULL CHECK (channel IN ('chat', 'phone', 'email')),
  price_cents_min   INTEGER NOT NULL CHECK (price_cents_min >= 0),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO services (slug, name, description, channel, price_cents_min)
VALUES
  ('tarot-chat',  'Tarot por chat',     'Consulta escrita en tiempo real.', 'chat',  180),
  ('tarot-phone', 'Tarot por telefone', 'Chamada com consultor certificado.', 'phone', 240),
  ('tarot-email', 'Tarot por email',    'Resposta detalhada em 24h.',        'email', 1500)
ON CONFLICT (slug) DO NOTHING;

-- --------------------------- triggers -----------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
