import { query } from "../../db/pool.js";

export interface ResetTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
}

export async function insertResetToken(params: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  await query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [params.userId, params.tokenHash, params.expiresAt],
  );
}

export async function findByHash(
  tokenHash: string,
): Promise<ResetTokenRow | null> {
  const { rows } = await query<ResetTokenRow>(
    `SELECT id, user_id, token_hash, expires_at, used_at
       FROM password_reset_tokens WHERE token_hash = $1 LIMIT 1`,
    [tokenHash],
  );
  return rows[0] ?? null;
}

export async function markUsed(id: string): Promise<void> {
  await query(
    "UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1",
    [id],
  );
}

/** Invalida los tokens de recuperación vivos de un usuario. */
export async function invalidateForUser(userId: string): Promise<void> {
  await query(
    "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL",
    [userId],
  );
}
