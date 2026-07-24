import { query } from "../../db/pool.js";

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  family_id: string;
  expires_at: Date;
  revoked_at: Date | null;
}

export async function insertRefreshToken(params: {
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
}): Promise<RefreshTokenRow> {
  const { rows } = await query<RefreshTokenRow>(
    `INSERT INTO refresh_tokens
       (user_id, token_hash, family_id, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, token_hash, family_id, expires_at, revoked_at`,
    [
      params.userId,
      params.tokenHash,
      params.familyId,
      params.expiresAt,
      params.userAgent ?? null,
      params.ipAddress ?? null,
    ],
  );
  return rows[0] as RefreshTokenRow;
}

export async function findByHash(
  tokenHash: string,
): Promise<RefreshTokenRow | null> {
  const { rows } = await query<RefreshTokenRow>(
    `SELECT id, user_id, token_hash, family_id, expires_at, revoked_at
       FROM refresh_tokens WHERE token_hash = $1 LIMIT 1`,
    [tokenHash],
  );
  return rows[0] ?? null;
}

export async function revokeById(id: string): Promise<void> {
  await query(
    "UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL",
    [id],
  );
}

/**
 * Mata toda la cadena de rotación. Se usa cuando se detecta reuso de un token
 * ya rotado: es la señal de que alguien copió la cookie.
 */
export async function revokeFamily(familyId: string): Promise<void> {
  await query(
    "UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = $1 AND revoked_at IS NULL",
    [familyId],
  );
}

/** Cierra sesión en todos los dispositivos. */
export async function revokeAllForUser(userId: string): Promise<void> {
  await query(
    "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
    [userId],
  );
}

/** Housekeeping: borra tokens caducados o revocados hace más de 7 días. */
export async function deleteExpired(): Promise<number> {
  const { rowCount } = await query(
    `DELETE FROM refresh_tokens
      WHERE expires_at < NOW()
         OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '7 days')`,
  );
  return rowCount ?? 0;
}
