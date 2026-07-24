import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { globalLimiter } from "./middleware/rate-limit.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { consultantsRouter } from "./modules/consultants/consultant.routes.js";
import { servicesRouter } from "./modules/services/services.routes.js";
import { sessionsRouter } from "./modules/sessions/session.routes.js";

/**
 * Fábrica de la app (sin `listen`): así los tests montan la app en memoria
 * con supertest sin abrir un puerto.
 */
export function createApp(): Express {
  const app = express();

  // Railway/Netlify terminan TLS en un proxy: sin esto req.ip es la IP del
  // proxy y `secure` en las cookies no se aplica bien.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Sin Origin = curl / apps móviles / same-origin: se permite.
        if (!origin) return callback(null, true);
        if (env.corsOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`Origen no permitido por CORS: ${origin}`));
      },
      credentials: true, // imprescindible para la cookie de refresh
    }),
  );

  // Límite bajo a propósito: ningún endpoint de auth necesita más.
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(globalLimiter);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", env: env.NODE_ENV });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/services", servicesRouter);
  app.use("/api/consultants", consultantsRouter);
  app.use("/api/sessions", sessionsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
