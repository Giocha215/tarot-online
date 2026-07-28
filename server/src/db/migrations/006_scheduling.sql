-- ------------------------------------------------------------------
-- 006_scheduling — disponibilidad semanal de la asesora y citas
-- ------------------------------------------------------------------

-- Horas de trabajo recurrentes por día de la semana (0 = domingo … 6 = sábado).
-- Los minutos son minutos desde medianoche en la hora de la asesora (Portugal).
CREATE TABLE IF NOT EXISTS advisor_availability (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id  UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  weekday        SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_minute   SMALLINT NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
  end_minute     SMALLINT NOT NULL CHECK (end_minute BETWEEN 1 AND 1440),
  CHECK (end_minute > start_minute),
  UNIQUE (consultant_id, weekday, start_minute)
);

CREATE INDEX IF NOT EXISTS advisor_avail_consultant_idx
  ON advisor_availability (consultant_id, weekday);

-- Citas agendadas. start_at/end_at en UTC.
CREATE TABLE IF NOT EXISTS appointments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id        UUID NOT NULL REFERENCES consultants(id) ON DELETE RESTRICT,
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel              TEXT NOT NULL CHECK (channel IN ('video', 'chat')),
  duration_min         INTEGER NOT NULL CHECK (duration_min > 0),
  price_cents_per_min  INTEGER NOT NULL CHECK (price_cents_per_min >= 0),
  total_cents          INTEGER NOT NULL CHECK (total_cents >= 0),
  start_at             TIMESTAMPTZ NOT NULL,
  end_at               TIMESTAMPTZ NOT NULL,
  status               TEXT NOT NULL DEFAULT 'booked'
                       CHECK (status IN ('booked', 'cancelled', 'completed')),
  session_id           UUID REFERENCES sessions(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS appointments_consultant_idx
  ON appointments (consultant_id, start_at);
CREATE INDEX IF NOT EXISTS appointments_user_idx
  ON appointments (user_id, start_at);

-- Horario por defecto para la asesora dueña de una consultora (Carmen):
-- lunes a sábado, 09:00–20:00 (540–1200). Puede editarlo desde su panel.
INSERT INTO advisor_availability (consultant_id, weekday, start_minute, end_minute)
SELECT c.id, wd, 540, 1200
  FROM consultants c
 CROSS JOIN generate_series(1, 6) AS wd
 WHERE c.owner_user_id IS NOT NULL
ON CONFLICT (consultant_id, weekday, start_minute) DO NOTHING;
