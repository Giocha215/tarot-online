-- ------------------------------------------------------------------
-- 004_app_settings — configuración global editable (clave/valor)
-- ------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Precio por hora de las recargas, en céntimos. Lo edita la asesora.
INSERT INTO app_settings (key, value)
VALUES ('recharge_price_cents_per_hour', '2000')
ON CONFLICT (key) DO NOTHING;
