import type pg from "pg";
import { query } from "../../db/pool.js";

export interface AvailabilityRow {
  weekday: number;
  start_minute: number;
  end_minute: number;
}

export interface AppointmentRow {
  id: string;
  consultant_id: string;
  user_id: string;
  channel: "video" | "chat";
  duration_min: number;
  price_cents_per_min: number;
  total_cents: number;
  start_at: Date;
  end_at: Date;
  status: "booked" | "cancelled" | "completed";
  session_id: string | null;
}

export interface AppointmentWithNames extends AppointmentRow {
  consultant_name: string;
  consultant_slug: string;
  client_name: string;
}

// --------------------------- disponibilidad -----------------------

export async function listAvailability(
  consultantId: string,
): Promise<AvailabilityRow[]> {
  const { rows } = await query<AvailabilityRow>(
    `SELECT weekday, start_minute, end_minute
       FROM advisor_availability
      WHERE consultant_id = $1
      ORDER BY weekday, start_minute`,
    [consultantId],
  );
  return rows;
}

/** Reemplaza toda la disponibilidad de la consultora en una transacción. */
export async function replaceAvailability(
  consultantId: string,
  blocks: { weekday: number; startMinute: number; endMinute: number }[],
): Promise<void> {
  await query("BEGIN");
  try {
    await query("DELETE FROM advisor_availability WHERE consultant_id = $1", [
      consultantId,
    ]);
    for (const b of blocks) {
      await query(
        `INSERT INTO advisor_availability
           (consultant_id, weekday, start_minute, end_minute)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (consultant_id, weekday, start_minute) DO NOTHING`,
        [consultantId, b.weekday, b.startMinute, b.endMinute],
      );
    }
    await query("COMMIT");
  } catch (err) {
    await query("ROLLBACK");
    throw err;
  }
}

// ------------------------------- citas ----------------------------

/** Citas 'booked' futuras de una consultora (para calcular huecos libres). */
export async function listUpcomingBookings(
  consultantId: string,
): Promise<{ start_at: Date; end_at: Date }[]> {
  const { rows } = await query<{ start_at: Date; end_at: Date }>(
    `SELECT start_at, end_at
       FROM appointments
      WHERE consultant_id = $1 AND status = 'booked' AND end_at > NOW()`,
    [consultantId],
  );
  return rows;
}

/** Comprueba (bajo lock) si hay una cita que solape el rango dado. */
export async function findOverlapping(
  client: pg.PoolClient,
  consultantId: string,
  startAt: Date,
  endAt: Date,
): Promise<boolean> {
  const { rows } = await client.query(
    `SELECT 1 FROM appointments
      WHERE consultant_id = $1 AND status = 'booked'
        AND start_at < $3 AND end_at > $2
      FOR UPDATE`,
    [consultantId, startAt, endAt],
  );
  return rows.length > 0;
}

export async function insert(
  client: pg.PoolClient,
  params: {
    consultantId: string;
    userId: string;
    channel: "video" | "chat";
    durationMin: number;
    priceCentsPerMin: number;
    totalCents: number;
    startAt: Date;
    endAt: Date;
  },
): Promise<AppointmentRow> {
  const { rows } = await client.query<AppointmentRow>(
    `INSERT INTO appointments
       (consultant_id, user_id, channel, duration_min, price_cents_per_min,
        total_cents, start_at, end_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      params.consultantId,
      params.userId,
      params.channel,
      params.durationMin,
      params.priceCentsPerMin,
      params.totalCents,
      params.startAt,
      params.endAt,
    ],
  );
  return rows[0] as AppointmentRow;
}

export async function findByIdForUser(
  id: string,
  userId: string,
): Promise<AppointmentRow | null> {
  const { rows } = await query<AppointmentRow>(
    "SELECT * FROM appointments WHERE id = $1 AND user_id = $2 LIMIT 1",
    [id, userId],
  );
  return rows[0] ?? null;
}

export async function setStatus(
  client: pg.PoolClient,
  id: string,
  status: "cancelled" | "completed",
): Promise<void> {
  await client.query("UPDATE appointments SET status = $2 WHERE id = $1", [
    id,
    status,
  ]);
}

export async function linkSession(
  id: string,
  sessionId: string,
): Promise<void> {
  await query("UPDATE appointments SET session_id = $2 WHERE id = $1", [
    id,
    sessionId,
  ]);
}

/** Próximas citas del cliente. */
export async function listUpcomingForUser(
  userId: string,
): Promise<AppointmentWithNames[]> {
  const { rows } = await query<AppointmentWithNames>(
    `SELECT a.*, c.name AS consultant_name, c.slug AS consultant_slug,
            u.display_name AS client_name
       FROM appointments a
       JOIN consultants c ON c.id = a.consultant_id
       JOIN users u ON u.id = a.user_id
      WHERE a.user_id = $1 AND a.status = 'booked' AND a.end_at > NOW()
      ORDER BY a.start_at ASC`,
    [userId],
  );
  return rows;
}

/** Próximas citas de la consultora (agenda de la asesora). */
export async function listUpcomingForConsultant(
  consultantId: string,
): Promise<AppointmentWithNames[]> {
  const { rows } = await query<AppointmentWithNames>(
    `SELECT a.*, c.name AS consultant_name, c.slug AS consultant_slug,
            u.display_name AS client_name
       FROM appointments a
       JOIN consultants c ON c.id = a.consultant_id
       JOIN users u ON u.id = a.user_id
      WHERE a.consultant_id = $1 AND a.status = 'booked' AND a.end_at > NOW()
      ORDER BY a.start_at ASC`,
    [consultantId],
  );
  return rows;
}

export function toPublicAppointment(row: AppointmentWithNames) {
  return {
    id: row.id,
    consultantSlug: row.consultant_slug,
    consultantName: row.consultant_name,
    clientName: row.client_name,
    channel: row.channel,
    durationMin: row.duration_min,
    totalCents: row.total_cents,
    startAt: row.start_at.toISOString(),
    endAt: row.end_at.toISOString(),
    status: row.status,
    sessionId: row.session_id,
  };
}
