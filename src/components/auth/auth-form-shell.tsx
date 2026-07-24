"use client";

import Link from "next/link";
import { Logo } from "@/components/site/header";

/** Marco visual compartido por login y registro. */
export function AuthFormShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-50"
      >
        <div className="absolute left-[12%] top-[20%] animate-twinkle text-lg text-gold/40">
          ✦
        </div>
        <div
          className="absolute right-[14%] top-[30%] animate-twinkle text-2xl text-accent1/30"
          style={{ animationDelay: "1.2s" }}
        >
          ✦
        </div>
        <div
          className="absolute left-[20%] bottom-[18%] animate-twinkle text-gold/30"
          style={{ animationDelay: "2s" }}
        >
          ✦
        </div>
      </div>

      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-line bg-surface/80 p-7 shadow-soft backdrop-blur-sm sm:p-8">
          <h1 className="font-cinzel text-[1.45rem] font-semibold text-ink">
            {title}
          </h1>
          <p className="mt-1.5 text-[0.9rem] text-ink-soft">{subtitle}</p>

          <div className="mt-6">{children}</div>
        </div>

        <div className="mt-5 text-center text-[0.88rem] text-ink-soft">
          {footer}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-[0.85rem] text-ink-soft underline-offset-4 hover:text-accent1 hover:underline"
          >
            ← Tarot Online
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Mensaje de error a nivel de formulario. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      aria-live="polite"
      className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-[0.88rem] text-red-400"
    >
      {message}
    </p>
  );
}

/** Mensaje de error a nivel de campo. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-[0.8rem] text-red-400">{message}</p>;
}
