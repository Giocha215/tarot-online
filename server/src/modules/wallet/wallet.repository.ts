import type pg from "pg";
import { query } from "../../db/pool.js";

export type WalletTxKind = "topup" | "session_charge" | "refund";

/**
 * Ajusta el saldo del usuario y deja constancia en el libro, todo en la misma
 * transacción. `amountCents` positivo acredita, negativo debita.
 *
 * El UPDATE lleva la guarda `balance_cents + $2 >= 0`: si el saldo no da,
 * no toca ninguna fila y devolvemos null. Así nunca queda negativo aunque
 * dos cargos entren a la vez.
 */
export async function applyTransaction(
  client: pg.PoolClient,
  params: {
    userId: string;
    amountCents: number;
    kind: WalletTxKind;
    reference?: string | null;
  },
): Promise<{ balanceCents: number } | null> {
  const { rows } = await client.query<{ balance_cents: number }>(
    `UPDATE users
        SET balance_cents = balance_cents + $2
      WHERE id = $1 AND balance_cents + $2 >= 0
      RETURNING balance_cents`,
    [params.userId, params.amountCents],
  );

  const updated = rows[0];
  if (!updated) return null; // saldo insuficiente

  await client.query(
    `INSERT INTO wallet_transactions (user_id, amount_cents, kind, reference)
     VALUES ($1, $2, $3, $4)`,
    [params.userId, params.amountCents, params.kind, params.reference ?? null],
  );

  return { balanceCents: updated.balance_cents };
}

/** ¿Existe ya un movimiento con esta referencia? (idempotencia de webhooks). */
export async function hasTransactionRef(
  client: pg.PoolClient,
  reference: string,
): Promise<boolean> {
  const { rows } = await client.query(
    "SELECT 1 FROM wallet_transactions WHERE reference = $1 LIMIT 1",
    [reference],
  );
  return rows.length > 0;
}

export interface WalletTxRow {
  id: string;
  amount_cents: number;
  kind: WalletTxKind;
  reference: string | null;
  created_at: Date;
}

export async function listByUser(
  userId: string,
  limit = 50,
): Promise<WalletTxRow[]> {
  const { rows } = await query<WalletTxRow>(
    `SELECT id, amount_cents, kind, reference, created_at
       FROM wallet_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [userId, limit],
  );
  return rows;
}
