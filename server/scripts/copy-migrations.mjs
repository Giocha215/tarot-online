import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * `tsc` solo emite JavaScript: los .sql de migraciones se quedarían fuera de
 * dist/ y el arranque en producción fallaría con ENOENT. Este script los
 * copia tras compilar.
 *
 * Va en Node en lugar de `cp -r` porque el build también corre en Windows,
 * donde ese comando no existe.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "src", "db", "migrations");
const to = join(root, "dist", "db", "migrations");

await mkdir(to, { recursive: true });
await cp(from, to, { recursive: true });

console.log(`[build] migraciones copiadas a ${to}`);
