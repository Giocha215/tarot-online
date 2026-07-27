import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate.js";
import {
  rechargeHoursSchema,
  startSessionSchema,
  topupSchema,
} from "./session.schemas.js";
import * as sessionService from "./session.service.js";

export const sessionsRouter = Router();

// Todo el módulo de sesiones exige sesión iniciada.
sessionsRouter.use(authenticate);

// Iniciar videollamada: valida saldo + disponibilidad y cobra por adelantado.
sessionsRouter.post(
  "/start",
  validateBody(startSessionSchema),
  async (req, res, next) => {
    try {
      const result = await sessionService.startSession(req.user!.sub, req.body);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// Sesión activa (para rehidratar el temporizador tras recargar la página).
sessionsRouter.get("/active", async (req, res, next) => {
  try {
    res.json({ session: await sessionService.getActive(req.user!.sub) });
  } catch (err) {
    next(err);
  }
});

// Historial de sesiones del usuario.
sessionsRouter.get("/", async (req, res, next) => {
  try {
    res.json({ sessions: await sessionService.getHistory(req.user!.sub) });
  } catch (err) {
    next(err);
  }
});

// Terminar sesión (temporizador a cero o cierre manual).
sessionsRouter.post("/:id/end", async (req, res, next) => {
  try {
    const reason = req.body?.reason === "cancelled" ? "cancelled" : "completed";
    const result = await sessionService.endSession(
      req.user!.sub,
      req.params.id as string,
      reason,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Recarga de saldo (modo demo: acredita directamente).
sessionsRouter.post(
  "/wallet/topup",
  validateBody(topupSchema),
  async (req, res, next) => {
    try {
      const result = await sessionService.topup(
        req.user!.sub,
        req.body.amountCents,
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// Iniciar recarga por horas: el cliente solo envía las horas; el importe lo
// calcula el servidor con el precio que fija la asesora.
sessionsRouter.post(
  "/wallet/checkout",
  validateBody(rechargeHoursSchema),
  async (req, res, next) => {
    try {
      const result = await sessionService.startTopupByHours(
        req.user!.sub,
        req.body.hours,
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);
