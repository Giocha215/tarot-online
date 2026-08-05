import { z } from "zod";

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (AAAA-MM-DD).");

/** La asesora edita precio y disponibilidad de un trabajo. */
export const updateWorkSchema = z.object({
  priceCents: z.number().int().min(0).max(10_000_000),
  active: z.boolean(),
});

/** El cliente encarga un trabajo (con sus datos) y paga el precio fijo. */
export const placeOrderSchema = z.object({
  consultantSlug: z.string().trim().min(1, "Falta la consultora."),
  workServiceId: z.string().uuid(),
  fullName: z.string().trim().min(2, "Falta el nombre completo.").max(200),
  birthdate: dateStr,
  phone: z.string().trim().min(5, "Falta el teléfono.").max(40),
  email: z.string().trim().email("Correo inválido."),
  partnerName: z.string().trim().min(2).max(200).optional(),
  partnerBirthdate: dateStr.optional(),
  notes: z.string().trim().max(1000).optional(),
});
