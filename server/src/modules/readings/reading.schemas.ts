import { z } from "zod";

/** La asesora edita precio y disponibilidad de una lectura. */
export const updateReadingSchema = z.object({
  priceCents: z.number().int().min(0).max(1_000_000),
  active: z.boolean(),
});
