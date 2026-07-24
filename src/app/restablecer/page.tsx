"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  AuthFormShell,
  FieldError,
  FormError,
} from "@/components/auth/auth-form-shell";
import { useLanguage } from "@/components/i18n/language-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/auth/api-client";
import { useAuthForm } from "@/lib/auth/use-auth-form";

/** Mismas reglas que passwordSchema del backend (feedback inmediato). */
function validatePassword(pwd: string, msg: string): string | null {
  if (pwd.length < 10) return msg;
  if (!/[a-zA-Z]/.test(pwd)) return msg;
  if (!/[0-9]/.test(pwd)) return msg;
  if (new TextEncoder().encode(pwd).length > 72) return msg;
  return null;
}

function ResetForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { submitting, formError, fieldErrors, submit, setFormError } =
    useAuthForm();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setFormError(t.auth.resetInvalid);
      return;
    }
    const pwdError = validatePassword(password, t.auth.passwordHint);
    setLocalError(pwdError);
    if (pwdError) return;

    const ok = await submit(async () => {
      await resetPassword({ token, newPassword: password });
    });
    if (ok) {
      setDone(true);
      setTimeout(() => router.replace("/login"), 1800);
    }
  }

  const passwordError = localError ?? fieldErrors.newPassword;

  return (
    <AuthFormShell
      title={t.auth.resetTitle}
      subtitle={t.auth.resetSubtitle}
      footer={
        <Link
          href="/login"
          className="font-medium text-accent1 underline-offset-4 hover:underline"
        >
          {t.auth.backToLogin}
        </Link>
      }
    >
      {done ? (
        <p className="rounded-xl border border-teal/40 bg-teal/10 px-4 py-3 text-center text-[0.9rem] text-ink">
          {t.auth.resetDone}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <FormError message={formError} />
          <div>
            <Label htmlFor="password" className="mb-1.5 block text-ink-soft">
              {t.auth.newPassword}
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (localError) setLocalError(null);
                }}
                aria-invalid={Boolean(passwordError)}
                className="pr-24"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-[0.75rem] text-ink-soft hover:text-accent1"
              >
                {showPassword ? t.auth.hidePassword : t.auth.showPassword}
              </button>
            </div>
            {passwordError ? (
              <FieldError message={passwordError} />
            ) : (
              <p className="mt-1.5 text-[0.78rem] text-ink-soft/80">
                {t.auth.passwordHint}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-flame mt-2 w-full justify-center px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? t.auth.loading : t.auth.resetSubmit}
          </button>
        </form>
      )}
    </AuthFormShell>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
