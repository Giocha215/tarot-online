import { query } from "../../db/pool.js";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: string;
  balance_cents: number;
  email_verified: boolean;
  created_at: Date;
}

/** Usuario tal y como se expone al cliente: sin hash, nunca. */
export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  balanceCents: number;
  emailVerified: boolean;
  createdAt: string;
}

export function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    balanceCents: row.balance_cents,
    emailVerified: row.email_verified,
    createdAt: row.created_at.toISOString(),
  };
}

const COLUMNS = `id, email, password_hash, display_name, role,
                 balance_cents, email_verified, created_at`;

export async function findByEmail(email: string): Promise<UserRow | null> {
  const { rows } = await query<UserRow>(
    `SELECT ${COLUMNS} FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email],
  );
  return rows[0] ?? null;
}

export async function findById(id: string): Promise<UserRow | null> {
  const { rows } = await query<UserRow>(
    `SELECT ${COLUMNS} FROM users WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function insertUser(params: {
  email: string;
  passwordHash: string;
  displayName: string;
}): Promise<UserRow> {
  const { rows } = await query<UserRow>(
    `INSERT INTO users (email, password_hash, display_name)
     VALUES ($1, $2, $3)
     RETURNING ${COLUMNS}`,
    [params.email, params.passwordHash, params.displayName],
  );
  // El INSERT ... RETURNING siempre devuelve fila si no lanzó.
  return rows[0] as UserRow;
}

export async function updatePasswordHash(
  userId: string,
  passwordHash: string,
): Promise<void> {
  await query("UPDATE users SET password_hash = $2 WHERE id = $1", [
    userId,
    passwordHash,
  ]);
}

/** Violación de unique constraint en Postgres. */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}
