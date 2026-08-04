import type pg from "pg";
import { query } from "../../db/pool.js";

export interface WorkRow {
  id: string;
  consultant_id: string;
  name: string;
  price_cents: number;
  requires_couple: boolean;
  sort_order: number;
  active: boolean;
}

export function toPublicWork(w: WorkRow) {
  return {
    id: w.id,
    name: w.name,
    priceCents: w.price_cents,
    requiresCouple: w.requires_couple,
    active: w.active,
  };
}

const COLUMNS =
  "id, consultant_id, name, price_cents, requires_couple, sort_order, active";

export async function listActiveBySlug(slug: string): Promise<WorkRow[]> {
  const { rows } = await query<WorkRow>(
    `SELECT ${COLUMNS.split(",")
      .map((c) => "w." + c.trim())
      .join(", ")}
       FROM work_services w
       JOIN consultants c ON c.id = w.consultant_id
      WHERE c.slug = $1 AND w.active = TRUE
      ORDER BY w.sort_order, w.name`,
    [slug],
  );
  return rows;
}

export async function listByConsultant(
  consultantId: string,
): Promise<WorkRow[]> {
  const { rows } = await query<WorkRow>(
    `SELECT ${COLUMNS} FROM work_services
      WHERE consultant_id = $1 ORDER BY sort_order, name`,
    [consultantId],
  );
  return rows;
}

export async function findById(id: string): Promise<WorkRow | null> {
  const { rows } = await query<WorkRow>(
    `SELECT ${COLUMNS} FROM work_services WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function updateWork(
  consultantId: string,
  id: string,
  priceCents: number,
  active: boolean,
): Promise<WorkRow | null> {
  const { rows } = await query<WorkRow>(
    `UPDATE work_services SET price_cents = $3, active = $4
      WHERE id = $2 AND consultant_id = $1
      RETURNING ${COLUMNS}`,
    [consultantId, id, priceCents, active],
  );
  return rows[0] ?? null;
}

// ------------------------------- pedidos --------------------------

export interface OrderInsert {
  consultantId: string;
  userId: string;
  workServiceId: string;
  workName: string;
  priceCents: number;
  fullName: string;
  birthdate: string;
  partnerName: string | null;
  partnerBirthdate: string | null;
  notes: string | null;
}

export async function insertOrder(
  client: pg.PoolClient,
  p: OrderInsert,
): Promise<{ id: string }> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO work_orders
       (consultant_id, user_id, work_service_id, work_name, price_cents,
        full_name, birthdate, partner_name, partner_birthdate, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`,
    [
      p.consultantId,
      p.userId,
      p.workServiceId,
      p.workName,
      p.priceCents,
      p.fullName,
      p.birthdate,
      p.partnerName,
      p.partnerBirthdate,
      p.notes,
    ],
  );
  return rows[0]!;
}

interface OrderRow {
  id: string;
  work_name: string;
  price_cents: number;
  full_name: string;
  birthdate: Date;
  partner_name: string | null;
  partner_birthdate: Date | null;
  notes: string | null;
  status: string;
  created_at: Date;
  client_email: string;
}

export async function listByConsultantOrders(consultantId: string) {
  const { rows } = await query<OrderRow>(
    `SELECT o.id, o.work_name, o.price_cents, o.full_name, o.birthdate,
            o.partner_name, o.partner_birthdate, o.notes, o.status, o.created_at,
            u.email AS client_email
       FROM work_orders o
       JOIN users u ON u.id = o.user_id
      WHERE o.consultant_id = $1
      ORDER BY o.created_at DESC
      LIMIT 200`,
    [consultantId],
  );
  const iso = (d: Date | null) =>
    d ? d.toISOString().slice(0, 10) : null;
  return rows.map((o) => ({
    id: o.id,
    workName: o.work_name,
    priceCents: o.price_cents,
    fullName: o.full_name,
    birthdate: iso(o.birthdate),
    partnerName: o.partner_name,
    partnerBirthdate: iso(o.partner_birthdate),
    notes: o.notes,
    status: o.status,
    createdAt: o.created_at.toISOString(),
    clientEmail: o.client_email,
  }));
}
