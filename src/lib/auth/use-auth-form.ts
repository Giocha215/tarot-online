"use client";

import { useCallback, useState } from "react";
import { useLanguage } from "@/components/i18n/language-provider";
import { ApiError } from "./types";

/**
 * Estado compartido por los formularios de auth: envío en curso, error
 * general y errores por campo, con los mensajes ya traducidos.
 */
export function useAuthForm() {
  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const translateError = useCallback(
    (err: unknown): { message: string; fields: Record<string, string> } => {
      const dict = t.auth.errors as Record<string, string>;

      if (err instanceof ApiError) {
        // Errores de validación: el detalle por campo manda; el mensaje
        // general se deja fuera para no duplicar información.
        if (Object.keys(err.fieldErrors).length > 0) {
          return { message: "", fields: err.fieldErrors };
        }
        return { message: dict[err.code] ?? err.message, fields: {} };
      }

      // TypeError es lo que lanza fetch cuando no hay red / CORS falla.
      return { message: dict.NETWORK ?? "Error de red.", fields: {} };
    },
    [t],
  );

  /** Envuelve el envío: limpia errores, marca submitting y traduce fallos. */
  const submit = useCallback(
    async (action: () => Promise<void>): Promise<boolean> => {
      setSubmitting(true);
      setFormError(null);
      setFieldErrors({});
      try {
        await action();
        return true;
      } catch (err) {
        const { message, fields } = translateError(err);
        setFormError(message || null);
        setFieldErrors(fields);
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [translateError],
  );

  return { submitting, formError, fieldErrors, submit, setFormError };
}
