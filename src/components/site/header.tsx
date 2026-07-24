"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { Menu, SunMark } from "./icons";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)}>
      <span className="text-gold">
        <SunMark className="h-9 w-9 text-accent1 drop-shadow-[0_2px_6px_hsl(var(--c-accent)/0.4)]" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-cinzel text-[0.95rem] font-semibold tracking-[0.14em] text-ink">
          TAROT
        </span>
        <span className="font-cinzel text-[0.62rem] tracking-[0.42em] text-accent1">
          DEMO
        </span>
      </span>
    </Link>
  );
}

export function Header() {
  const { t } = useLanguage();
  const { isAuthenticated, user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const NAV = [
    { label: t.nav.consultores, href: "#consultores" },
    { label: t.nav.servicos, href: "#servicos" },
    { label: t.nav.blog, href: "#blog" },
    { label: t.nav.trabalhe, href: "#trabalhe" },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 w-full transition-all duration-300",
        scrolled
          ? "border-b border-line bg-base/85 backdrop-blur-md shadow-soft"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="container-tarot flex h-[72px] items-center justify-between">
        <Logo />

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="link-underline text-[0.92rem] font-medium after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-accent1 after:transition-all hover:after:w-full"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="btn-flame px-5 py-2.5">
                <UserIcon className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {user?.displayName ?? t.header.minhaConta}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="hidden rounded-full border border-line bg-surface/70 px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface sm:inline-flex"
              >
                {t.header.sair}
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn-flame px-5 py-2.5">
              <LogInIcon className="h-4 w-4" />
              {t.header.entrar}
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface/70 text-ink lg:hidden"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-line bg-base/95 backdrop-blur-md lg:hidden">
          <nav className="container-tarot flex flex-col py-3">
            {NAV.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-2 py-3 text-[0.95rem] font-medium text-ink-soft hover:bg-soft hover:text-ink"
              >
                {item.label}
              </a>
            ))}
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-2 py-3 text-[0.95rem] font-medium text-accent1"
                >
                  {t.header.minhaConta}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  className="rounded-lg px-2 py-3 text-left text-[0.95rem] font-medium text-ink-soft"
                >
                  {t.header.sair}
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-2 py-3 text-[0.95rem] font-medium text-accent1"
              >
                {t.header.entrar}
              </Link>
            )}
            <div className="mt-2 flex items-center gap-2 px-2">
              <LanguageSwitcher />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function LogInIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
