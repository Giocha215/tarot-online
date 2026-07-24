import type pg from "pg";
import { query } from "../../db/pool.js";

export type SessionStatus = "active" | "completed" | "cancelled";

export interface SessionRow {
  id: string;
  user_id: string;
  consultant_id: string;
  channel: string;
  duration_min: number;
  price_cents_per_min: number;
  total_cents: number;
  join_url: string | null;
  status: SessionStatus;
  started_at: Date;
  expires_at: Date;
  ended_at: Date | null;
}

/** Fila de sesión enriquecida con el nombre de la consultora, para el historial. */
export interface SessionWithConsultant extends SessionRow {
  consultant_name: string;
  consultant_slug: string;
}

export interface PublicSession {
  id: string;
  consultantName: string;
  consultantSlug: string;
  channel: string;
  durationMin: number;
  totalCents: number;
  status: SessionStatus;
  joinUrl: string | null;
  startedAt: string;
  expiresAt: string;
  endedAt: string | null;
}

export function toPublicSession(row: SessionWithConsultant): PublicSession {
  return {
    id: row.id,
    consultantName: row.consultant_name,
    consultantSlug: row.consultant_slug,
    channel: row.channel,
    durationMin: row.duration_min,
    totalCents: row.total_cents,
    status: row.status,
    joinUrl: row.join_url,
    startedAt: row.started_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    endedAt: row.ended_at ? row.ended_at.toISOString() : null,
  };
}

export async function insertSession(
  client: pg.PoolClient,
  params: {
    userId: string;
    consultantId: string;
    durationMin: number;
    priceCentsPerMin: number;
    totalCents: number;
    joinUrl: string | null;
    expiresAt: Date;
  },
): Promise<SessionRow> {
  const { rows } = await client.query<SessionRow>(
    `INSERT INTO sessions
       (user_id, consultant_id, duration_min, price_cents_per_min,
        total_cents, join_url, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      params.userId,
      params.consultantId,
      params.durationMin,
      params.priceCentsPerMin,
      params.totalCents,
      params.joinUrl,
      params.expiresAt,
    ],
  );
  return rows[0] as SessionRow;
}

export async function findActiveByConsultant(
  client: pg.PoolClient,
  consultantId: string,
): Promise<SessionRow | null> {
  const { rows } = await client.query<SessionRow>(
    `SELECT * FROM sessions
       WHERE consultant_id = $1 AND status = 'active' LIMIT 1`,
    [consultantId],
  );
  return rows[0] ?? null;
}

export async function findByIdForUser(
  id: string,
  userId: string,
): Promise<SessionRow | null> {
  const { rows } = await query<SessionRow>(
    "SELECT * FROM sessions WHERE id = $1 AND user_id = $2 LIMIT 1",
    [id, userId],
  );
  return rows[0] ?? null;
}

/** Marca la sesión como terminada. Solo afecta si sigue activa (idempotente). */
export async function markEnded(
  id: string,
  status: Extract<SessionStatus, "completed" | "cancelled">,
  client?: pg.PoolClient,
): Promise<SessionRow | null> {
  const q = `UPDATE sessions
               SET status = $2, ended_at = NOW()
             WHERE id = $1 AND status = 'active'
             RETURNING *`;
  const res = client
    ? await client.query<SessionRow>(q, [id, status])
    : await query<SessionRow>(q, [id, status]);
  return res.rows[0] ?? null;
}

export async function listByUser(
  userId: string,
  limit = 50,
): Promise<SessionWithConsultant[]> {
  const { rows } = await query<SessionWithConsultant>(
    `SELECT s.*, c.name AS consultant_name, c.slug AS consultant_slug
       FROM sessions s
       JOIN consultants c ON c.id = s.consultant_id
      WHERE s.user_id = $1
      ORDER BY s.started_at DESC
      LIMIT $2`,
    [userId, limit],
  );
  return rows;
}

export async function getActiveForUser(
  userId: string,
): Promise<SessionWithConsultant | null> {
  const { rows } = await query<SessionWithConsultant>(
    `SELECT s.*, c.name AS consultant_name, c.slug AS consultant_slug
       FROM sessions s
       JOIN consultants c ON c.id = s.consultant_id
      WHERE s.user_id = $1 AND s.status = 'active'
      ORDER BY s.started_at DESC
      LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}

/** Sesiones activas ya caducadas: material para el barrido de cierre. */
export async function findExpiredActive(): Promise<SessionRow[]> {
  const { rows } = await query<SessionRow>(
    "SELECT * FROM sessions WHERE status = 'active' AND expires_at <= NOW()",
  );
  return rows;
}
