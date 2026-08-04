import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { globalLimiter } from "./middleware/rate-limit.js";
import { appointmentsRouter } from "./modules/appointments/appointment.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { consultantsRouter } from "./modules/consultants/consultant.routes.js";
import { servicesRouter } from "./modules/services/services.routes.js";
import { sessionsRouter } from "./modules/sessions/session.routes.js";
import { ordersRouter } from "./modules/works/work.routes.js";
import { stripeWebhookHandler } from "./modules/wallet/webhook.js";

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
        // Origen no permitido: se rechaza SIN error. Lanzar un Error aquí
        // hacía que el preflight respondiera 500 en vez de, simplemente, no
        // devolver las cabeceras CORS (que es como el navegador espera el
        // bloqueo). callback(null, false) hace justo eso.
        callback(null, false);
      },
      credentials: true, // imprescindible para la cookie de refresh
      // Exponemos la cabecera Date para que el cliente pueda sincronizar su
      // reloj con el del servidor (temporizadores de sesión sin depender del
      // reloj del dispositivo, que puede estar desajustado).
      exposedHeaders: ["Date"],
    }),
  );

  // Webhook de Stripe: DEBE ir antes de express.json y recibir el cuerpo en
  // crudo (Buffer) para poder verificar la firma. Por eso su propio raw parser.
  app.post(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json" }),
    stripeWebhookHandler,
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
  app.use("/api/appointments", appointmentsRouter);
  app.use("/api/orders", ordersRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
