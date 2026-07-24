import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { runMigrations } from "./db/migrate.js";
import { pool } from "./db/pool.js";
import { seedDemoAdvisor } from "./db/seed.js";
import { deleteExpired } from "./modules/auth/refresh-token.repository.js";
import { sweepExpiredSessions } from "./modules/sessions/session.service.js";
import { attachRealtime, closeRealtime } from "./realtime/hub.js";

async function main() {
  await runMigrations();
  await seedDemoAdvisor();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`[server] escuchando en :${env.PORT} (${env.NODE_ENV})`);
  });

  // WebSockets sobre el mismo puerto HTTP (ruta /ws).
  attachRealtime(server);

  // Cierre de sesiones caducadas que el frontend no llegó a avisar (pestaña
  // cerrada, etc.). Cada 30 s libera a las consultoras correspondientes.
  const sessionSweep = setInterval(() => {
    sweepExpiredSessions()
      .then((n) => n > 0 && console.log(`[sessions] ${n} sesiones cerradas`))
      .catch((err) => console.error("[sessions] barrido falló:", err));
  }, 30_000);
  sessionSweep.unref();

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
    closeRealtime();
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
