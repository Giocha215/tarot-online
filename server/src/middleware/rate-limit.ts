import rateLimit, { type Options } from "express-rate-limit";
import { env } from "../config/env.js";
import { AUTH_ERRORS } from "../utils/errors.js";

const shared: Partial<Options> = {
  standardHeaders: true,
  legacyHeaders: false,
  // En tests el límite estorba; se desactiva ahí y solo ahí.
  skip: () => env.isTest,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: AUTH_ERRORS.RATE_LIMITED,
        message: "Demasiados intentos. Espera unos minutos y vuelve a probar.",
      },
    });
  },
};

/**
 * Login: la clave combina IP y email para que un atacante no pueda bloquear
 * la cuenta de otro simplemente fallando su login desde muchas IPs.
 */
export const loginLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.toLowerCase()
        : "anon";
    return `${req.ip}:${email}`;
  },
});

export const registerLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 60 * 1000,
  limit: 5,
});

export const refreshLimiter = rateLimit({
  ...shared,
  windowMs: 15 * 60 * 1000,
  limit: 60,
});

/** Red de seguridad global, generosa: solo frena floods evidentes. */
export const globalLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 1000,
  limit: 300,
});
