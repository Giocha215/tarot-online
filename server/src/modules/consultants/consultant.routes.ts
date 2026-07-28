import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate.js";
import { setAvailabilitySchema } from "../appointments/appointment.schemas.js";
import * as appointmentService from "../appointments/appointment.service.js";
import {
  consultantStatusSchema,
  rechargePriceSchema,
  updateRateSchema,
} from "../sessions/session.schemas.js";
import * as sessionService from "../sessions/session.service.js";
import * as consultantRepo from "./consultant.repository.js";

export const consultantsRouter = Router();

// Disponibilidad semanal de la asesora (leer / reemplazar).
consultantsRouter.get(
  "/me/availability",
  authenticate,
  requireRole("consultant", "admin"),
  async (req, res, next) => {
    try {
      res.json(await appointmentService.getAvailability(req.user!.sub));
    } catch (err) {
      next(err);
    }
  },
);

consultantsRouter.put(
  "/me/availability",
  authenticate,
  requireRole("consultant", "admin"),
  validateBody(setAvailabilitySchema),
  async (req, res, next) => {
    try {
      res.json(
        await appointmentService.setAvailability(req.user!.sub, req.body.blocks),
      );
    } catch (err) {
      next(err);
    }
  },
);

// Agenda de la asesora: sus próximas citas.
consultantsRouter.get(
  "/me/appointments",
  authenticate,
  requireRole("consultant", "admin"),
  async (req, res, next) => {
    try {
      res.json({
        appointments: await appointmentService.listForAdvisor(req.user!.sub),
      });
    } catch (err) {
      next(err);
    }
  },
);

// Huecos libres para agendar con una consultora (público).
consultantsRouter.get("/:slug/slots", async (req, res, next) => {
  try {
    const durationMin = Number(req.query.durationMin);
    if (!Number.isFinite(durationMin) || durationMin <= 0) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "durationMin inválido." },
      });
      return;
    }
    res.json(
      await appointmentService.getAvailableSlots(
        req.params.slug as string,
        durationMin,
      ),
    );
  } catch (err) {
    next(err);
  }
});

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

// Fijar el precio por hora de las recargas (solo la asesora).
consultantsRouter.patch(
  "/me/recharge-price",
  authenticate,
  requireRole("consultant", "admin"),
  validateBody(rechargePriceSchema),
  async (req, res, next) => {
    try {
      res.json(
        await sessionService.setRechargePrice(
          req.user!.sub,
          req.body.pricePerHourCents,
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
