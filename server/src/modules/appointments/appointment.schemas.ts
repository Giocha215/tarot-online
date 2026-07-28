import { z } from "zod";
import { ALLOWED_DURATIONS } from "../sessions/session.schemas.js";

const durationField = z
  .number()
  .int()
  .refine((v) => (ALLOWED_DURATIONS as readonly number[]).includes(v), {
    message: "Duración no permitida.",
  });

/** Reservar una cita: canal, duración y el instante de inicio (ISO UTC). */
export const bookAppointmentSchema = z.object({
  consultantSlug: z.string().trim().min(1, "Falta la consultora."),
  channel: z.enum(["video", "chat"]),
  durationMin: durationField,
  startAt: z.string().datetime({ message: "Fecha inválida." }),
});

/** Franja de trabajo: minutos desde medianoche, en hora de la asesora. */
const availabilityBlock = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startMinute: z.number().int().min(0).max(1439),
    endMinute: z.number().int().min(1).max(1440),
  })
  .refine((b) => b.endMinute > b.startMinute, {
    message: "El fin debe ser posterior al inicio.",
  });

/** La asesora reemplaza toda su disponibilidad semanal de una vez. */
export const setAvailabilitySchema = z.object({
  blocks: z.array(availabilityBlock).max(60),
});

export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;
export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>;
