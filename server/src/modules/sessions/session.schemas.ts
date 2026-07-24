import { z } from "zod";

/** Duraciones contratables de la videollamada, en minutos.
 *  El 1 es solo para la demo (permite ver el flujo completo en un minuto). */
export const ALLOWED_DURATIONS = [1, 15, 30, 45, 60] as const;

export const startSessionSchema = z.object({
  consultantSlug: z.string().trim().min(1, "Falta la consultora."),
  durationMin: z
    .number()
    .int()
    .refine((v) => (ALLOWED_DURATIONS as readonly number[]).includes(v), {
      message: "Duración no permitida.",
    }),
});

export const topupSchema = z.object({
  // En modo demo se acredita este importe directamente (en céntimos).
  amountCents: z
    .number()
    .int()
    .positive("El importe debe ser mayor que cero."),
});

export const consultantStatusSchema = z.object({
  status: z.enum(["online", "busy", "offline"]),
});

export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type TopupInput = z.infer<typeof topupSchema>;
export type ConsultantStatusInput = z.infer<typeof consultantStatusSchema>;
