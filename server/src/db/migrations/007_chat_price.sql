-- ------------------------------------------------------------------
-- 007_chat_price — precio por minuto distinto para chat y videollamada
-- ------------------------------------------------------------------
-- price_cents_per_min pasa a ser el precio de la VIDEOLLAMADA; se añade
-- chat_price_cents_per_min para el CHAT. Así cada canal tiene su tarifa.

ALTER TABLE consultants
  ADD COLUMN IF NOT EXISTS chat_price_cents_per_min INTEGER NOT NULL DEFAULT 500
  CHECK (chat_price_cents_per_min >= 0);

-- Por defecto el chat cuesta lo mismo que el vídeo (conserva el comportamiento
-- anterior para consultoras existentes).
UPDATE consultants SET chat_price_cents_per_min = price_cents_per_min;

-- Precios de la asesora (Maria): videollamada €2,50/min y chat €2,00/min.
UPDATE consultants
   SET price_cents_per_min = 250, chat_price_cents_per_min = 200
 WHERE owner_user_id IS NOT NULL;
