import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool, withTransaction } from "./pool.js";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "migrations");

/**
 * Runner de migraciones mínimo: aplica en orden alfabético los .sql que
 * todavía no constan en `schema_migrations`. Cada migración va en su propia
 * transacción, así un fallo no deja el esquema a medias.
 */
export async function runMigrations(): Promise<string[]> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name        TEXT PRIMARY KEY,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const { rows } = await pool.query<{ name: string }>(
    "SELECT name FROM schema_migrations",
  );
  const applied = new Set(rows.map((r) => r.name));
  const justRan: string[] = [];

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(join(migrationsDir, file), "utf8");
    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
        file,
      ]);
    });
    justRan.push(file);
    console.log(`[migrate] aplicada ${file}`);
  }

  if (justRan.length === 0) console.log("[migrate] sin migraciones pendientes");
  return justRan;
}

// Ejecutable directo: `npm run migrate`
const isDirectRun =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isDirectRun) {
  runMigrations()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[migrate] fallo:", err);
      process.exit(1);
    });
}
