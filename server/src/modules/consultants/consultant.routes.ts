import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate.js";
import {
  consultantStatusSchema,
  updateRateSchema,
} from "../sessions/session.schemas.js";
import * as sessionService from "../sessions/session.service.js";
import * as consultantRepo from "./consultant.repository.js";

export const consultantsRouter = Router();

// Catálogo público con el estado en vivo de cada consultora.
consultantsRouter.get("/", async (_req, res, next) => {
  try {
    const rows = await consultantRepo.listConsultants();
    res.json({ consultants: rows.map(consultantRepo.toPublicConsultant) });
  } catch (err) {
    next(err);
  }
});

// Panel de la asesora: su consultora + la sesión activa del cliente (si la
// hay), para unirse a la misma videollamada.
consultantsRouter.get(
  "/me",
  authenticate,
  requireRole("consultant", "admin"),
  async (req, res, next) => {
    try {
      res.json(await sessionService.getAdvisorView(req.user!.sub));
    } catch (err) {
      next(err);
    }
  },
);

// Historial de sesiones cobradas de la asesora.
consultantsRouter.get(
  "/me/sessions",
  authenticate,
  requireRole("consultant", "admin"),
  async (req, res, next) => {
    try {
      res.json(await sessionService.getAdvisorSessions(req.user!.sub));
    } catch (err) {
      next(err);
    }
  },
);

// Facturación por día y por mes.
consultantsRouter.get(
  "/me/stats",
  authenticate,
  requireRole("consultant", "admin"),
  async (req, res, next) => {
    try {
      res.json(await sessionService.getAdvisorStats(req.user!.sub));
    } catch (err) {
      next(err);
    }
  },
);

// Cambiar la tarifa (precio por minuto).
consultantsRouter.patch(
  "/me/rate",
  authenticate,
  requireRole("consultant", "admin"),
  validateBody(updateRateSchema),
  async (req, res, next) => {
    try {
      res.json(
        await sessionService.updateAdvisorRate(
          req.user!.sub,
          req.body.priceCentsPerMin,
        ),
      );
    } catch (err) {
      next(err);
    }
  },
);

// Panel de consultoras: cambiar el propio estado (online / busy / offline).
consultantsRouter.post(
  "/:slug/status",
  authenticate,
  requireRole("consultant", "admin"),
  validateBody(consultantStatusSchema),
  async (req, res, next) => {
    try {
      const result = await sessionService.updateConsultantStatus(
        req.user!.sub,
        req.user!.role,
        req.params.slug as string,
        req.body.status,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);
