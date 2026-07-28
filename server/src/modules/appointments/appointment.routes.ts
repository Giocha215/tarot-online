import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { validateBody } from "../../middleware/validate.js";
import { bookAppointmentSchema } from "./appointment.schemas.js";
import * as appointmentService from "./appointment.service.js";

export const appointmentsRouter = Router();

// Todo el módulo exige sesión iniciada.
appointmentsRouter.use(authenticate);

// Reservar una cita (cobra por adelantado).
appointmentsRouter.post(
  "/",
  validateBody(bookAppointmentSchema),
  async (req, res, next) => {
    try {
      const result = await appointmentService.bookAppointment(
        req.user!.sub,
        req.body,
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// Próximas citas del cliente.
appointmentsRouter.get("/", async (req, res, next) => {
  try {
    res.json({ appointments: await appointmentService.listForUser(req.user!.sub) });
  } catch (err) {
    next(err);
  }
});

// Cancelar una cita (reembolsa si es con antelación).
appointmentsRouter.post("/:id/cancel", async (req, res, next) => {
  try {
    res.json(
      await appointmentService.cancelAppointment(
        req.user!.sub,
        req.params.id as string,
      ),
    );
  } catch (err) {
    next(err);
  }
});

// Entrar a la cita: abre la sesión (chat/vídeo) ya pagada, dentro de su ventana.
appointmentsRouter.post("/:id/start", async (req, res, next) => {
  try {
    res.status(201).json(
      await appointmentService.startAppointment(
        req.user!.sub,
        req.params.id as string,
      ),
    );
  } catch (err) {
    next(err);
  }
});
