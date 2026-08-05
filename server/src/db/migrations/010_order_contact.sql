-- ------------------------------------------------------------------
-- 010_order_contact — teléfono y correo de contacto en los pedidos
-- ------------------------------------------------------------------

ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS email TEXT;
