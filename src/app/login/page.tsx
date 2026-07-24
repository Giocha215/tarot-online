"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
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

function LoginForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, isAuthenticated, status } = useAuth();
  const { submitting, formError, fieldErrors, submit } = useAuthForm();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // `next` permite volver a la página que exigió sesión. Se exige que sea
  // una ruta interna: un `next=https://malo.com` sería un open redirect.
  const rawNext = searchParams.get("next");
  const validNext =
    rawNext?.startsWith("/") && !rawNext.startsWith("//") ? rawNext : null;

  // Destino según el rol: la asesora (consultant) va a su panel; el cliente,
  // al dashboard. Un `next` explícito (venía de una página protegida) manda.
  const destinationFor = (role: string) =>
    validNext ??
    (role === "consultant" || role === "admin" ? "/asesora" : "/dashboard");

  useEffect(() => {
    if (status === "authenticated" && isAuthenticated && user) {
      router.replace(destinationFor(user.role));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isAuthenticated, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let loggedRole = "client";
    const ok = await submit(async () => {
      const u = await login({ email, password });
      loggedRole = u.role;
    });
    if (ok) router.replace(destinationFor(loggedRole));
  }

  return (
    <AuthFormShell
      title={t.auth.loginTitle}
      subtitle={t.auth.loginSubtitle}
      footer={
        <>
          {t.auth.noAccount}{" "}
          <Link
            href="/registro"
            className="font-medium text-accent1 underline-offset-4 hover:underline"
          >
            {t.auth.goRegister}
          </Link>
        </>
      }
    >
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
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            placeholder="voce@email.com"
          />
          <span id="email-error">
            <FieldError message={fieldErrors.email} />
          </span>
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(fieldErrors.password)}
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
          <FieldError message={fieldErrors.password} />
          <div className="mt-1.5 text-right">
            <Link
              href="/recuperar"
              className="text-[0.82rem] text-ink-soft underline-offset-4 hover:text-accent1 hover:underline"
            >
              {t.auth.forgotPassword}
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn-flame mt-2 w-full justify-center px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? t.auth.loading : t.auth.submitLogin}
        </button>
      </form>
    </AuthFormShell>
  );
}

export default function LoginPage() {
  // useSearchParams obliga a un límite de Suspense en el App Router.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
