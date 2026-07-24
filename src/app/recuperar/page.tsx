"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AuthFormShell,
  FieldError,
  FormError,
} from "@/components/auth/auth-form-shell";
import { useLanguage } from "@/components/i18n/language-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPassword } from "@/lib/auth/api-client";
import { useAuthForm } from "@/lib/auth/use-auth-form";

export default function RecoverPage() {
  const { t } = useLanguage();
  const { submitting, formError, fieldErrors, submit } = useAuthForm();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  // En modo demo (sin servicio de correo), el backend devuelve el enlace aquí.
  const [demoUrl, setDemoUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await submit(async () => {
      const res = await forgotPassword(email);
      setDemoUrl(res.demoResetUrl);
      setSent(true);
    });
    if (!ok) setSent(false);
  }

  return (
    <AuthFormShell
      title={t.auth.recoverTitle}
      subtitle={t.auth.recoverSubtitle}
      footer={
        <Link
          href="/login"
          className="font-medium text-accent1 underline-offset-4 hover:underline"
        >
          {t.auth.backToLogin}
        </Link>
      }
    >
      {sent ? (
        <div className="flex flex-col gap-4">
          <p className="rounded-xl border border-teal/40 bg-teal/10 px-4 py-3 text-[0.9rem] text-ink">
            {t.auth.recoverSent}
          </p>

          {/* Modo demo: el enlace se muestra aquí en vez de enviarse. */}
          {demoUrl && (
            <div className="rounded-xl border border-accent1/40 bg-accent1/5 px-4 py-3">
              <p className="text-[0.82rem] text-ink-soft">{t.auth.recoverDemo}</p>
              <Link
                href={demoUrl.replace(/^https?:\/\/[^/]+/, "")}
                className="mt-2 block break-all text-[0.85rem] font-medium text-accent1 underline"
              >
                {demoUrl}
              </Link>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <FormError message={formError} />
          <div>
            <Label htmlFor="email" className="mb-1.5 block text-ink-soft">
              {t.auth.email}
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              placeholder="voce@email.com"
            />
            <FieldError message={fieldErrors.email} />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-flame mt-2 w-full justify-center px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? t.auth.loading : t.auth.recoverSubmit}
          </button>
        </form>
      )}
    </AuthFormShell>
  );
}
