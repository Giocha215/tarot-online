-- ------------------------------------------------------------------
-- 009_works — trabajos/rituales a precio fijo + pedidos
-- ------------------------------------------------------------------
-- No son consultas en vivo: el cliente paga, rellena un formulario (nombre,
-- fecha de nacimiento; algunos requieren datos de la pareja) y el pedido le
-- llega a la asesora, que realiza el trabajo.

CREATE TABLE IF NOT EXISTS work_services (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id   UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  price_cents     INTEGER NOT NULL CHECK (price_cents >= 0),
  requires_couple BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS work_services_consultant_idx
  ON work_services (consultant_id, sort_order);

CREATE TABLE IF NOT EXISTS work_orders (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id      UUID NOT NULL REFERENCES consultants(id) ON DELETE RESTRICT,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_service_id    UUID REFERENCES work_services(id) ON DELETE SET NULL,
  work_name          TEXT NOT NULL,
  price_cents        INTEGER NOT NULL CHECK (price_cents >= 0),
  full_name          TEXT NOT NULL,
  birthdate          DATE NOT NULL,
  partner_name       TEXT,
  partner_birthdate  DATE,
  notes              TEXT,
  status             TEXT NOT NULL DEFAULT 'paid'
                     CHECK (status IN ('paid', 'done', 'cancelled')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS work_orders_consultant_idx
  ON work_orders (consultant_id, created_at DESC);

-- Semilla: los trabajos de Maria (los amorosos requieren datos de la pareja).
INSERT INTO work_services (consultant_id, name, price_cents, requires_couple, sort_order)
SELECT c.id, v.name, v.price, v.couple, v.ord
  FROM consultants c
 CROSS JOIN (VALUES
    ('Trabalho de limpeza espiritual/energética',        10000, FALSE, 1),
    ('Trabalho de abertura de caminhos e prosperidade',  15000, FALSE, 2),
    ('Trabalho de protecção espiritual',                 12500, FALSE, 3),
    ('Trabalho de Retorno Amoroso',                      25000, TRUE,  4),
    ('Rituais Amorosos gerais (energia branca)',         40000, TRUE,  5),
    ('Ritual com Velas Mensal (todas as áreas)',         50000, FALSE, 6)
 ) AS v(name, price, couple, ord)
 WHERE c.owner_user_id IS NOT NULL;
