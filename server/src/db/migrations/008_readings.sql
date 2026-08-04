-- ------------------------------------------------------------------
-- 008_readings — catálogo de lecturas de Tarot a precio fijo
-- ------------------------------------------------------------------
-- Servicios de precio cerrado (no por minuto). El cliente paga el precio
-- fijo y agenda una cita; la cita aparece en la agenda de la asesora.

CREATE TABLE IF NOT EXISTS reading_services (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id  UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  price_cents    INTEGER NOT NULL CHECK (price_cents >= 0),
  duration_min   INTEGER NOT NULL DEFAULT 15 CHECK (duration_min > 0),
  channel        TEXT NOT NULL DEFAULT 'video' CHECK (channel IN ('video', 'chat')),
  sort_order     INTEGER NOT NULL DEFAULT 0,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reading_services_consultant_idx
  ON reading_services (consultant_id, sort_order);

-- Enlace opcional de una cita con la lectura contratada (precio fijo).
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS reading_service_id UUID
  REFERENCES reading_services(id) ON DELETE SET NULL;

-- Semilla: las lecturas de Maria (asesora dueña). Las que no tenían duración
-- indicada quedan en 15 min por defecto.
INSERT INTO reading_services (consultant_id, name, price_cents, duration_min, sort_order)
SELECT c.id, v.name, v.price, v.dur, v.ord
  FROM consultants c
 CROSS JOIN (VALUES
    ('Tarot do Amor',                    3000, 15, 1),
    ('Tarot Profissional',               3000, 15, 2),
    ('Leitura Espiritual',               4000, 15, 3),
    ('Leitura para Saúde',               5000, 15, 4),
    ('Pergunta direta',                  1500, 15, 5),
    ('Tiragem de 3 cartas',              2500, 15, 6),
    ('Tiragem completa (todas as áreas)', 8000, 30, 7)
 ) AS v(name, price, dur, ord)
 WHERE c.owner_user_id IS NOT NULL;
