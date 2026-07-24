import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { AUTH_ERRORS, badRequest } from "../utils/errors.js";

/**
 * Valida `req.body` contra un esquema Zod y **reemplaza el body por el
 * resultado parseado**: a partir de aquí el controlador trabaja con datos
 * ya tipados, recortados y sin campos extra.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".") || "_";
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return next(
        badRequest(
          AUTH_ERRORS.VALIDATION,
          "Los datos enviados no son válidos.",
          fieldErrors,
        ),
      );
    }
    req.body = result.data;
    next();
  };
}
