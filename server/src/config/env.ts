import "dotenv/config";
import { z } from "zod";

/**
 * Validación de entorno en el arranque: si falta una variable crítica el
 * proceso muere aquí, no a mitad de una petición de login en producción.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatorio"),
  DATABASE_SSL: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET debe tener al menos 32 caracteres"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  COOKIE_DOMAIN: z.string().optional(),

  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  // --- Microsoft Teams ---
  // Enlace de sala por defecto si una consultora no tiene el suyo. Con la
  // integración de Graph API, este valor deja de usarse.
  TEAMS_DEFAULT_JOIN_URL: z.string().default(""),

  // --- Recarga de saldo (Stripe) ---
  // Vacío = modo demo: la recarga acredita saldo sin cobro real.
  STRIPE_SECRET_KEY: z.string().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().default(""),

  // Máximo por recarga en modo demo, en céntimos (evita saldos absurdos).
  DEMO_TOPUP_MAX_CENTS: z.coerce.number().int().positive().default(50_000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  · ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Configuración de entorno inválida:\n${issues}`);
}

const raw = parsed.data;

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === "production",
  isTest: raw.NODE_ENV === "test",
  corsOrigins: raw.CORS_ORIGIN.split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  // Sin clave de Stripe, la recarga funciona en modo demo (acredita sin cobrar).
  stripeEnabled: raw.STRIPE_SECRET_KEY.length > 0,
} as const;

// En producción un secreto de ejemplo es una puerta abierta: mejor no arrancar.
if (env.isProduction && env.JWT_SECRET.includes("cambia-esto")) {
  throw new Error("JWT_SECRET sigue siendo el valor de ejemplo. Cámbialo.");
}
