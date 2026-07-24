"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Protected } from "@/components/auth/protected";
import { useLanguage } from "@/components/i18n/language-provider";
import { Logo } from "@/components/site/header";
import { fetchDashboard, type DashboardData } from "@/lib/auth/api-client";
import { LOCALE_MAP } from "@/lib/i18n";

function formatCents(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function DashboardContent() {
  const { t, lang } = useLanguage();
  const { user, logout } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDashboard()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setError(t.auth.errors.NETWORK);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const locale = LOCALE_MAP[lang];

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-base/85 backdrop-blur-md">
        <div className="container-tarot flex h-[72px] items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden text-[0.9rem] text-ink-soft sm:inline">
              {user?.displayName}
            </span>
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-full border border-line bg-surface/70 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface"
            >
              {t.auth.logout}
            </button>
          </div>
        </div>
      </header>

      <main className="container-tarot py-10">
        <h1 className="font-cinzel text-[1.7rem] font-semibold text-ink">
          {t.auth.dashboardTitle}
        </h1>

        <div className="mt-6 rounded-2xl border border-line bg-surface/70 p-6 shadow-soft">
          <p className="text-[0.85rem] uppercase tracking-wider text-ink-soft">
            {t.auth.balance}
          </p>
          <p className="mt-1 font-cinzel text-[2rem] font-semibold text-accent1">
            {formatCents(user?.balanceCents ?? 0, locale)}
          </p>
          <p className="mt-1 text-[0.85rem] text-ink-soft">{user?.email}</p>
        </div>

        <h2 className="mt-10 font-cinzel text-[1.2rem] font-semibold text-ink">
          {t.auth.servicesTitle}
        </h2>

        {error && (
          <p role="alert" className="mt-4 text-[0.9rem] text-red-400">
            {error}
          </p>
        )}

        {!data && !error && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl border border-line bg-surface/40"
              />
            ))}
          </div>
        )}

        {data && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.availableServices.map((s) => (
              <div
                key={s.slug}
                className="rounded-2xl border border-line bg-surface/70 p-5 shadow-soft"
              >
                <p className="font-cinzel text-[1.05rem] font-semibold text-ink">
                  {s.name}
                </p>
                <p className="mt-1 text-[0.85rem] text-ink-soft">
                  {formatCents(s.priceCentsPerMinute, locale)} / {t.auth.minutes}
                </p>
                <p className="mt-3 text-[0.85rem] text-accent1">
                  {s.minutesAffordable} {t.auth.minutes}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10">
          <Link
            href="/"
            className="text-[0.88rem] text-ink-soft underline-offset-4 hover:text-accent1 hover:underline"
          >
            ← Tarot Online
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Protected>
      <DashboardContent />
    </Protected>
  );
}
