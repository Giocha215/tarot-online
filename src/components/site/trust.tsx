"use client";

import { useLanguage } from "@/components/i18n/language-provider";
import { BadgeStar, Clock, Shield, Sparkles } from "./icons";

const ICONS = [Shield, BadgeStar, Clock];

export function Trust() {
  const { t } = useLanguage();
  return (
    <section className="container-tarot pt-16">
      <h2 className="text-center font-serif text-3xl text-ink sm:text-4xl">
        {t.trust.titlePre} <span className="serif-accent">{t.trust.titleAccent}</span>
      </h2>

      <div className="mx-auto mt-8 grid max-w-2xl gap-3">
        {t.trust.items.map((it, i) => {
          const Icon = ICONS[i] ?? Shield;
          return (
            <div
              key={it.title}
              className="flex items-center gap-4 rounded-2xl border border-line bg-surface px-5 py-4 shadow-soft"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/20 text-accent1">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-serif text-lg text-ink">{it.title}</h3>
                <p className="text-sm text-ink-soft">{it.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mx-auto mt-6 max-w-2xl">
        <a href="#consultores" className="btn-flame w-full py-4 text-base">
          <Sparkles className="h-5 w-5" /> {t.trust.cta}
        </a>
      </div>
    </section>
  );
}
