/**
 * Error con forma de respuesta HTTP. El `code` es un identificador estable
 * que el frontend puede mapear a un mensaje traducido — nunca parsees el texto.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code: string, msg: string, details?: unknown) =>
  new AppError(400, code, msg, details);

export const unauthorized = (code: string, msg: string) =>
  new AppError(401, code, msg);

export const forbidden = (code: string, msg: string) =>
  new AppError(403, code, msg);

export const notFound = (code: string, msg: string) =>
  new AppError(404, code, msg);

export const conflict = (code: string, msg: string) =>
  new AppError(409, code, msg);

/** Códigos de error del módulo de auth (compartidos con el frontend). */
export const AUTH_ERRORS = {
  EMAIL_TAKEN: "AUTH_EMAIL_TAKEN",
  INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  TOKEN_MISSING: "AUTH_TOKEN_MISSING",
  TOKEN_INVALID: "AUTH_TOKEN_INVALID",
  TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
  REFRESH_INVALID: "AUTH_REFRESH_INVALID",
  REFRESH_REUSED: "AUTH_REFRESH_REUSED",
  VALIDATION: "VALIDATION_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  FORBIDDEN: "FORBIDDEN",
} as const;
