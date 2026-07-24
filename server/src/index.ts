import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { runMigrations } from "./db/migrate.js";
import { pool } from "./db/pool.js";
import { deleteExpired } from "./modules/auth/refresh-token.repository.js";

async function main() {
  await runMigrations();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`[server] escuchando en :${env.PORT} (${env.NODE_ENV})`);
  });

  // Limpieza de tokens caducados cada 6 horas. `unref` para no bloquear la
  // salida del proceso.
  const cleanup = setInterval(
    () => {
      deleteExpired()
        .then((n) => n > 0 && console.log(`[cleanup] ${n} tokens purgados`))
        .catch((err) => console.error("[cleanup] fallo:", err));
    },
    6 * 60 * 60 * 1000,
  );
  cleanup.unref();

  const shutdown = (signal: string) => {
    console.log(`[server] ${signal} recibido, cerrando...`);
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
    // Si algo se queda colgado, no esperar indefinidamente.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("[server] fallo al arrancar:", err);
  process.exit(1);
});
