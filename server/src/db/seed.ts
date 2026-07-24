import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { query } from "./pool.js";

/**
 * Crea (idempotente) el usuario asesora de demostración y lo enlaza como
 * dueño de una consultora. Con esta cuenta se simula el lado de la asesora:
 * inicia sesión, ve la videollamada del cliente y se une a la misma sala.
 *
 * Corre en cada arranque tras las migraciones. Solo fija la contraseña al
 * crear el usuario; si ya existe, respeta la que tenga.
 */
export async function seedDemoAdvisor(): Promise<void> {
  const email = env.DEMO_ADVISOR_EMAIL.toLowerCase();

  // 1. Usuario asesora (rol consultant). ON CONFLICT no toca la contraseña.
  const passwordHash = await bcrypt.hash(
    env.DEMO_ADVISOR_PASSWORD,
    env.BCRYPT_ROUNDS,
  );
  const { rows } = await query<{ id: string }>(
    `INSERT INTO users (email, password_hash, display_name, role, email_verified)
     VALUES ($1, $2, 'Asesora Demo', 'consultant', TRUE)
     ON CONFLICT (LOWER(email)) DO UPDATE SET role = 'consultant'
     RETURNING id`,
    [email, passwordHash],
  );

  // El ON CONFLICT sobre índice de expresión puede no devolver fila en algún
  // caso; se resuelve el id con un SELECT de respaldo.
  let userId = rows[0]?.id;
  if (!userId) {
    const r = await query<{ id: string }>(
      "SELECT id FROM users WHERE LOWER(email) = $1",
      [email],
    );
    userId = r.rows[0]?.id;
  }
  if (!userId) return;

  // 2. Enlazar a la consultora indicada como su dueña.
  await query(
    "UPDATE consultants SET owner_user_id = $1 WHERE slug = $2",
    [userId, env.DEMO_ADVISOR_CONSULTANT_SLUG],
  );

  console.log(
    `[seed] asesora demo lista: ${email} → consultora ${env.DEMO_ADVISOR_CONSULTANT_SLUG}`,
  );
}
