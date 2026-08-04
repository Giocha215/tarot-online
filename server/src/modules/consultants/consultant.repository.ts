import type pg from "pg";
import { query } from "../../db/pool.js";

export type ConsultantStatus = "online" | "busy" | "offline";

export interface ConsultantRow {
  id: string;
  slug: string;
  name: string;
  status: ConsultantStatus;
  /** Precio por minuto de la VIDEOLLAMADA. */
  price_cents_per_min: number;
  /** Precio por minuto del CHAT. */
  chat_price_cents_per_min: number;
  teams_join_url: string | null;
  owner_user_id: string | null;
}

/** Fila de consultora con la duración de su sesión activa (si la hay). */
export interface ConsultantWithSession extends ConsultantRow {
  active_duration_min: number | null;
}

export interface PublicConsultant {
  id: string;
  slug: string;
  name: string;
  status: ConsultantStatus;
  /** Precio por minuto de la videollamada. */
  priceCentsPerMinute: number;
  /** Precio por minuto del chat. */
  chatPriceCentsPerMinute: number;
  /** Disponible = online y sin sesión activa. */
  available: boolean;
  /** Si está ocupada, minutos contratados de la consulta en curso. */
  activeDurationMin: number | null;
}

const COLUMNS = `id, slug, name, status, price_cents_per_min,
                 chat_price_cents_per_min, teams_join_url, owner_user_id`;

export function toPublicConsultant(
  row: ConsultantRow & { active_duration_min?: number | null },
): PublicConsultant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    priceCentsPerMinute: row.price_cents_per_min,
    chatPriceCentsPerMinute: row.chat_price_cents_per_min,
    available: row.status === "online",
    activeDurationMin: row.active_duration_min ?? null,
  };
}

export async function listConsultants(): Promise<ConsultantWithSession[]> {
  // LEFT JOIN a la sesión activa (única por consultora) para saber la
  // duración de la consulta en curso cuando está ocupada.
  const { rows } = await query<ConsultantWithSession>(
    `SELECT ${COLUMNS.split(",").map((c) => "c." + c.trim()).join(", ")},
            s.duration_min AS active_duration_min
       FROM consultants c
       LEFT JOIN sessions s
         ON s.consultant_id = c.id AND s.status = 'active'
      ORDER BY c.name ASC`,
  );
  return rows;
}

export async function findBySlug(slug: string): Promise<ConsultantRow | null> {
  const { rows } = await query<ConsultantRow>(
    `SELECT ${COLUMNS} FROM consultants WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  return rows[0] ?? null;
}

export async function findById(id: string): Promise<ConsultantRow | null> {
  const { rows } = await query<ConsultantRow>(
    `SELECT ${COLUMNS} FROM consultants WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Bloquea la fila de la consultora dentro de una transacción (SELECT ... FOR
 * UPDATE). Impide que dos peticiones de "iniciar sesión" simultáneas la vean
 * las dos como libre.
 */
export async function findBySlugForUpdate(
  client: pg.PoolClient,
  slug: string,
): Promise<ConsultantRow | null> {
  const { rows } = await client.query<ConsultantRow>(
    `SELECT ${COLUMNS} FROM consultants WHERE slug = $1 LIMIT 1 FOR UPDATE`,
    [slug],
  );
  return rows[0] ?? null;
}

export async function setStatus(
  id: string,
  status: ConsultantStatus,
  client?: pg.PoolClient,
): Promise<void> {
  const q = "UPDATE consultants SET status = $2 WHERE id = $1";
  if (client) await client.query(q, [id, status]);
  else await query(q, [id, status]);
}

/** Actualiza el precio por minuto de videollamada y de chat. */
export async function updateRates(
  id: string,
  priceCentsPerMin: number,
  chatPriceCentsPerMin: number,
): Promise<void> {
  await query(
    `UPDATE consultants
        SET price_cents_per_min = $2, chat_price_cents_per_min = $3
      WHERE id = $1`,
    [id, priceCentsPerMin, chatPriceCentsPerMin],
  );
}

export async function findByOwner(
  userId: string,
): Promise<ConsultantRow | null> {
  const { rows } = await query<ConsultantRow>(
    `SELECT ${COLUMNS} FROM consultants WHERE owner_user_id = $1 LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}
