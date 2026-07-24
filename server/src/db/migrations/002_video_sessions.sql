-- ------------------------------------------------------------------
-- 002_video_sessions — consultoras, sesiones de videollamada y saldo
-- ------------------------------------------------------------------

-- --------------------------- consultoras --------------------------
CREATE TABLE IF NOT EXISTS consultants (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT NOT NULL UNIQUE,
  name                  TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'offline'
                        CHECK (status IN ('online', 'busy', 'offline')),
  -- Precio por minuto de la videollamada, en céntimos.
  price_cents_per_min   INTEGER NOT NULL DEFAULT 500 CHECK (price_cents_per_min >= 0),
  -- Enlace de la sala de Teams (joinWebUrl). Puede venir de Graph API o ser
  -- una sala personal fija de la consultora.
  teams_join_url        TEXT,
  -- Usuario con rol 'consultant' que controla este perfil (opcional).
  owner_user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS consultants_status_idx ON consultants (status);

-- Semilla: las 8 consultoras del frontend, todas online para la demo.
INSERT INTO consultants (slug, name, status, price_cents_per_min)
VALUES
  ('carmen-oxeu',        'Carmen',        'online', 500),
  ('scarlet-0bq4',       'Scarlet',       'online', 500),
  ('samy-zg6b',          'Samy',          'online', 500),
  ('cigana-inaya-vafq',  'Cigana Inayá',  'online', 500),
  ('charlotte-bwns',     'Charlotte',     'online', 500),
  ('ana-luz-xyzm',       'Ana Luz',       'online', 500),
  ('marcos-cigano-ouwk', 'Marcos Cigano', 'busy',  500),
  ('duda-tarologa-b2xc', 'Duda Taróloga', 'online', 500)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------- sesiones de videollamada ------------------
CREATE TABLE IF NOT EXISTS sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consultant_id         UUID NOT NULL REFERENCES consultants(id) ON DELETE RESTRICT,
  channel               TEXT NOT NULL DEFAULT 'video'
                        CHECK (channel IN ('video', 'chat', 'phone')),
  duration_min          INTEGER NOT NULL CHECK (duration_min > 0),
  -- Snapshot del precio y del enlace en el momento de contratar.
  price_cents_per_min   INTEGER NOT NULL CHECK (price_cents_per_min >= 0),
  total_cents           INTEGER NOT NULL CHECK (total_cents >= 0),
  join_url              TEXT,
  status                TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'completed', 'cancelled')),
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ NOT NULL,
  ended_at              TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_user_idx        ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_consultant_idx  ON sessions (consultant_id);
CREATE INDEX IF NOT EXISTS sessions_status_idx      ON sessions (status);

-- Una consultora no puede tener dos sesiones activas a la vez. El índice
-- parcial lo garantiza a nivel de base de datos, no solo de aplicación.
CREATE UNIQUE INDEX IF NOT EXISTS sessions_one_active_per_consultant
  ON sessions (consultant_id) WHERE status = 'active';

-- ------------------------- libro de saldo -------------------------
-- Cada movimiento del saldo queda registrado. positivo = recarga,
-- negativo = cargo. El saldo vive en users.balance_cents; esta tabla es la
-- auditoría de cómo llegó a ese valor.
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_cents  INTEGER NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('topup', 'session_charge', 'refund')),
  -- id de sesión o referencia del pago (Stripe/PayPal) según el tipo.
  reference     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wallet_tx_user_idx ON wallet_transactions (user_id);

-- Trigger de updated_at para consultants (la función ya existe de 001).
DROP TRIGGER IF EXISTS consultants_set_updated_at ON consultants;
CREATE TRIGGER consultants_set_updated_at
  BEFORE UPDATE ON consultants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
