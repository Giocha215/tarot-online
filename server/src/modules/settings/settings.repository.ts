import { query } from "../../db/pool.js";

export async function getSetting(key: string): Promise<string | null> {
  const { rows } = await query<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = $1 LIMIT 1",
    [key],
  );
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await query(
    `INSERT INTO app_settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, value],
  );
}

export const RECHARGE_PRICE_KEY = "recharge_price_cents_per_hour";
const DEFAULT_RECHARGE_PRICE_CENTS = 2000; // 20 €/hora

/** Precio por hora de las recargas, en céntimos. */
export async function getRechargePriceCents(): Promise<number> {
  const v = await getSetting(RECHARGE_PRICE_KEY);
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_RECHARGE_PRICE_CENTS;
}

export async function setRechargePriceCents(cents: number): Promise<void> {
  await setSetting(RECHARGE_PRICE_KEY, String(cents));
}
