"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { LANGUAGES } from "@/lib/i18n";
import { useLanguage } from "./language-provider";

function Globe({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3Z" />
    </svg>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Language"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/70 font-medium text-ink transition-colors hover:bg-surface",
          compact ? "px-3 py-2 text-sm" : "px-3 py-2 text-sm",
        )}
      >
        <Globe className="h-4 w-4 text-accent1" />
        <span>{current.short}</span>
        <Chevron
          className={cn(
            "h-3.5 w-3.5 text-subtle transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-card animate-fade-in">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                l.code === lang
                  ? "bg-gold/15 font-semibold text-ink"
                  : "text-ink-soft hover:bg-soft",
              )}
            >
              <span className="flex items-center gap-2">
                <span className="font-mono text-[0.7rem] font-bold text-accent1">
                  {l.short}
                </span>
                {l.label}
              </span>
              {l.code === lang && (
                <span className="text-accent1">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
