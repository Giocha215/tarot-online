import type pg from "pg";
import { query } from "../../db/pool.js";

export type ConsultantStatus = "online" | "busy" | "offline";

export interface ConsultantRow {
  id: string;
  slug: string;
  name: string;
  status: ConsultantStatus;
  price_cents_per_min: number;
  teams_join_url: string | null;
  owner_user_id: string | null;
}

export interface PublicConsultant {
  id: string;
  slug: string;
  name: string;
  status: ConsultantStatus;
  priceCentsPerMinute: number;
  /** Disponible = online y sin sesión activa. */
  available: boolean;
}

const COLUMNS = `id, slug, name, status, price_cents_per_min,
                 teams_join_url, owner_user_id`;

export function toPublicConsultant(row: ConsultantRow): PublicConsultant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    priceCentsPerMinute: row.price_cents_per_min,
    available: row.status === "online",
  };
}

export async function listConsultants(): Promise<ConsultantRow[]> {
  const { rows } = await query<ConsultantRow>(
    `SELECT ${COLUMNS} FROM consultants ORDER BY name ASC`,
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

export async function findByOwner(
  userId: string,
): Promise<ConsultantRow | null> {
  const { rows } = await query<ConsultantRow>(
    `SELECT ${COLUMNS} FROM consultants WHERE owner_user_id = $1 LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}
