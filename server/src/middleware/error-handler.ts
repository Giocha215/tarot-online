import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: `Ruta no encontrada: ${req.path}` },
  });
}

/**
 * Handler final. Traduce AppError a su status; cualquier otra cosa es un 500
 * genérico — el detalle va al log del servidor, no al cliente.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  console.error("[error] no controlado:", err);
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Error interno del servidor.",
      ...(env.isProduction ? {} : { debug: String(err) }),
    },
  });
}
