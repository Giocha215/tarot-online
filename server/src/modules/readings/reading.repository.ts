import { query } from "../../db/pool.js";

export interface ReadingRow {
  id: string;
  consultant_id: string;
  name: string;
  price_cents: number;
  duration_min: number;
  channel: "video" | "chat";
  sort_order: number;
  active: boolean;
}

export function toPublicReading(r: ReadingRow) {
  return {
    id: r.id,
    name: r.name,
    priceCents: r.price_cents,
    durationMin: r.duration_min,
    channel: r.channel,
    active: r.active,
  };
}

const COLUMNS =
  "id, consultant_id, name, price_cents, duration_min, channel, sort_order, active";

/** Lecturas activas de una consultora (catálogo público). */
export async function listActiveBySlug(slug: string): Promise<ReadingRow[]> {
  const { rows } = await query<ReadingRow>(
    `SELECT ${COLUMNS.split(",")
      .map((c) => "r." + c.trim())
      .join(", ")}
       FROM reading_services r
       JOIN consultants c ON c.id = r.consultant_id
      WHERE c.slug = $1 AND r.active = TRUE
      ORDER BY r.sort_order, r.name`,
    [slug],
  );
  return rows;
}

/** Todas las lecturas de una consultora (para la asesora, incluye inactivas). */
export async function listByConsultant(
  consultantId: string,
): Promise<ReadingRow[]> {
  const { rows } = await query<ReadingRow>(
    `SELECT ${COLUMNS} FROM reading_services
      WHERE consultant_id = $1 ORDER BY sort_order, name`,
    [consultantId],
  );
  return rows;
}

export async function findById(id: string): Promise<ReadingRow | null> {
  const { rows } = await query<ReadingRow>(
    `SELECT ${COLUMNS} FROM reading_services WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

/** La asesora actualiza precio y disponibilidad de una lectura suya. */
export async function updateReading(
  consultantId: string,
  id: string,
  priceCents: number,
  active: boolean,
): Promise<ReadingRow | null> {
  const { rows } = await query<ReadingRow>(
    `UPDATE reading_services
        SET price_cents = $3, active = $4
      WHERE id = $2 AND consultant_id = $1
      RETURNING ${COLUMNS}`,
    [consultantId, id, priceCents, active],
  );
  return rows[0] ?? null;
}
