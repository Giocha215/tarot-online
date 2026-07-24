import type { NextFunction, Request, Response } from "express";
import { AUTH_ERRORS, forbidden, unauthorized } from "../utils/errors.js";
import { verifyAccessToken, type AccessTokenPayload } from "../utils/tokens.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!token || scheme?.toLowerCase() !== "bearer") return null;
  return token.trim() || null;
}

/** Exige un access token válido. Rellena `req.user`. */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = extractBearer(req);
  if (!token) {
    return next(
      unauthorized(AUTH_ERRORS.TOKEN_MISSING, "Falta el token de acceso."),
    );
  }
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    next(err);
  }
}

/** Rellena `req.user` si hay token válido, pero nunca bloquea. */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = extractBearer(req);
  if (token) {
    try {
      req.user = verifyAccessToken(token);
    } catch {
      /* token inválido en ruta opcional: se ignora */
    }
  }
  next();
}

/** Debe ir siempre DESPUÉS de `authenticate`. */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(
        unauthorized(AUTH_ERRORS.TOKEN_MISSING, "Falta el token de acceso."),
      );
    }
    if (!roles.includes(req.user.role)) {
      return next(
        forbidden(AUTH_ERRORS.FORBIDDEN, "No tienes permiso para esta acción."),
      );
    }
    next();
  };
}
