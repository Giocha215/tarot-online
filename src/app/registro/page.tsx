"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AuthFormShell,
  FieldError,
  FormError,
} from "@/components/auth/auth-form-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthForm } from "@/lib/auth/use-auth-form";

/**
 * Reglas espejo de `passwordSchema` en el backend. Duplicarlas aquí es
 * deliberado: el cliente da feedback inmediato, el servidor sigue siendo el
 * que decide. La validación de cliente nunca es la de verdad.
 */
function validatePassword(pwd: string, t: string): string | null {
  if (pwd.length < 10) return t;
  if (!/[a-zA-Z]/.test(pwd)) return t;
  if (!/[0-9]/.test(pwd)) return t;
  if (new TextEncoder().encode(pwd).length > 72) return t;
  return null;
}

export default function RegisterPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { register, isAuthenticated, status } = useAuth();
  const { submitting, formError, fieldErrors, submit } = useAuthForm();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localPasswordError, setLocalPasswordError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (status === "authenticated" && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [status, isAuthenticated, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const pwdError = validatePassword(password, t.auth.passwordHint);
    setLocalPasswordError(pwdError);
    if (pwdError) return;

    const ok = await submit(async () => {
      await register({ email, password, displayName });
    });
    if (ok) router.replace("/dashboard");
  }

  const passwordError = localPasswordError ?? fieldErrors.password;

  return (
    <AuthFormShell
      title={t.auth.registerTitle}
      subtitle={t.auth.registerSubtitle}
      footer={
        <>
          {t.auth.hasAccount}{" "}
          <Link
            href="/login"
            className="font-medium text-accent1 underline-offset-4 hover:underline"
          >
            {t.auth.goLogin}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <FormError message={formError} />

        <div>
          <Label htmlFor="displayName" className="mb-1.5 block text-ink-soft">
            {t.auth.displayName}
          </Label>
          <Input
            id="displayName"
            name="displayName"
            type="text"
            autoComplete="name"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            aria-invalid={Boolean(fieldErrors.displayName)}
          />
          <FieldError message={fieldErrors.displayName} />
        </div>

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

        <div>
          <Label htmlFor="password" className="mb-1.5 block text-ink-soft">
            {t.auth.password}
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
                if (localPasswordError) setLocalPasswordError(null);
              }}
              aria-invalid={Boolean(passwordError)}
              aria-describedby="password-hint"
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
            <p id="password-hint" className="mt-1.5 text-[0.78rem] text-ink-soft/80">
              {t.auth.passwordHint}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn-flame mt-2 w-full justify-center px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? t.auth.loading : t.auth.submitRegister}
        </button>
      </form>
    </AuthFormShell>
  );
}
