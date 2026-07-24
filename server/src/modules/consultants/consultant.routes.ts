import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate.js";
import { consultantStatusSchema } from "../sessions/session.schemas.js";
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
