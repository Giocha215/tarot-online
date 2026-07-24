/** Contrato compartido con el backend (`server/src/modules/auth`). */

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: "client" | "consultant" | "admin";
  balanceCents: number;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  expiresIn: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    /** En errores de validación: { campo: mensaje } */
    details?: Record<string, string>;
  };
}

/** Espejo de `AUTH_ERRORS` en el backend. */
export const AUTH_ERROR_CODES = {
  EMAIL_TAKEN: "AUTH_EMAIL_TAKEN",
  INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  TOKEN_MISSING: "AUTH_TOKEN_MISSING",
  TOKEN_INVALID: "AUTH_TOKEN_INVALID",
  TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
  REFRESH_INVALID: "AUTH_REFRESH_INVALID",
  REFRESH_REUSED: "AUTH_REFRESH_REUSED",
  VALIDATION: "VALIDATION_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
} as const;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}
