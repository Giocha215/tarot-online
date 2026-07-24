import { z } from "zod";

/**
 * Contraseña: longitud por encima de todo (NIST SP 800-63B). Se exige mezcla
 * mínima para frenar "123456789012", pero sin reglas barrocas que empujan al
 * usuario a "Password1!".
 *
 * El límite de 72 no es cosmético: bcrypt trunca silenciosamente a 72 BYTES,
 * así que sin este tope dos contraseñas distintas podrían dar el mismo hash.
 */
export const passwordSchema = z
  .string()
  .min(10, "La contraseña debe tener al menos 10 caracteres.")
  .max(72, "La contraseña no puede superar los 72 caracteres.")
  .refine((v) => /[a-zA-Z]/.test(v), {
    message: "La contraseña debe incluir al menos una letra.",
  })
  .refine((v) => /[0-9]/.test(v), {
    message: "La contraseña debe incluir al menos un número.",
  })
  .refine((v) => new TextEncoder().encode(v).length <= 72, {
    message: "La contraseña es demasiado larga (máx. 72 bytes).",
  });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, "Introduce un email válido.")
  .max(254, "El email es demasiado largo.")
  .email("Introduce un email válido.");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(80, "El nombre no puede superar los 80 caracteres."),
});

export const loginSchema = z.object({
  email: emailSchema,
  // En login NO se aplican las reglas de fuerza: solo se comprueba que hay algo.
  // Aplicarlas filtraría qué contraseñas existen y rompería a usuarios antiguos.
  password: z.string().min(1, "Introduce tu contraseña."),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Introduce tu contraseña actual."),
  newPassword: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Falta el token de recuperación."),
  newPassword: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
