import type { CookieOptions, NextFunction, Request, Response } from "express";
import { env } from "../../config/env.js";
import { AUTH_ERRORS, unauthorized } from "../../utils/errors.js";
import * as authService from "./auth.service.js";
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
} from "./auth.schemas.js";

export const REFRESH_COOKIE = "tarot_rt";

/**
 * El refresh token viaja en cookie httpOnly (inalcanzable desde JS, luego
 * inmune a XSS) y con path acotado a las rutas que lo consumen.
 * El access token, en cambio, va en el JSON y vive en memoria en el cliente.
 */
function refreshCookieOptions(expiresAt?: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProduction,
    // "none" es obligatorio si api y web están en dominios distintos (Railway
    // + Netlify); exige secure:true, de ahí el par.
    sameSite: env.isProduction ? "none" : "lax",
    domain: env.COOKIE_DOMAIN || undefined,
    path: "/api/auth",
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

function sessionContext(req: Request) {
  return {
    userAgent: req.get("user-agent") ?? null,
    ipAddress: req.ip ?? null,
  };
}

function sendAuthResult(
  res: Response,
  result: authService.AuthResult,
  status: number,
): void {
  res.cookie(
    REFRESH_COOKIE,
    result.refreshToken,
    refreshCookieOptions(result.refreshExpiresAt),
  );
  res.status(status).json({
    user: result.user,
    accessToken: result.accessToken,
    expiresIn: env.ACCESS_TOKEN_TTL,
  });
}

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.register(
      req.body as RegisterInput,
      sessionContext(req),
    );
    sendAuthResult(res, result, 201);
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authService.login(
      req.body as LoginInput,
      sessionContext(req),
    );
    sendAuthResult(res, result, 200);
  } catch (err) {
    next(err);
  }
}

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) {
      throw unauthorized(AUTH_ERRORS.REFRESH_INVALID, "No hay sesión activa.");
    }
    const result = await authService.refresh(token, sessionContext(req));
    sendAuthResult(res, result, 200);
  } catch (err) {
    // Sesión inservible: se limpia la cookie para que el navegador no la
    // reenvíe en bucle.
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
    next(err);
  }
}

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await authService.logout(req.cookies?.[REFRESH_COOKIE] as string | undefined);
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function logoutAll(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await authService.logoutAll(req.user!.sub);
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function me(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.json({ user: await authService.getProfile(req.user!.sub) });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await authService.changePassword(
      req.user!.sub,
      req.body as ChangePasswordInput,
    );
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { demoResetUrl } = await authService.requestPasswordReset(
      req.body.email,
    );
    // Mensaje genérico: no revela si el email existe. `demoResetUrl` solo
    // llega en modo demo (sin servicio de correo configurado).
    res.json({
      message:
        "Si el email está registrado, te hemos enviado un enlace para recuperar la contraseña.",
      demoResetUrl,
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
