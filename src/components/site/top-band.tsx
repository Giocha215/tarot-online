"use client";

import { useLanguage } from "@/components/i18n/language-provider";
import { ArrowRight, Sparkles, Star } from "./icons";

export function TopBand() {
  const { t } = useLanguage();

  const STATS = [
    { big: "10k+", small: t.topBand.consultas },
    { big: "4.9", small: t.topBand.avaliacoes, star: true },
    { big: t.topBand.online, small: t.topBand.agora, live: true },
    { big: "48h", small: t.topBand.porEmail },
  ];

  return (
    <section className="container-tarot pt-8">
      {/* availability pill */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-4 py-2 text-sm font-medium text-ink shadow-soft backdrop-blur">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal/60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal" />
          </span>
          <span className="font-semibold text-teal">{t.topBand.count}</span>
          {t.topBand.availableNow}
        </div>
      </div>

      {/* stats */}
      <div className="mx-auto mt-5 max-w-2xl">
        <div className="grid grid-cols-2 divide-line rounded-2xl border border-line bg-surface/70 px-2 py-4 shadow-soft backdrop-blur sm:grid-cols-4 sm:divide-x">
          {STATS.map((s) => (
            <div
              key={s.small}
              className="flex flex-col items-center px-2 py-1 text-center"
            >
              <span className="flex items-center gap-1 font-serif text-xl font-semibold text-ink">
                {s.live && <span className="h-2 w-2 rounded-full bg-teal" />}
                {s.big}
                {s.star && <Star className="h-3.5 w-3.5 text-gold" />}
              </span>
              <span className="text-[0.72rem] uppercase tracking-wide text-subtle">
                {s.small}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* free minutes offer */}
      <a
        href="#carta"
        className="group relative mx-auto mt-4 flex max-w-2xl items-center gap-4 overflow-hidden rounded-2xl border-2 border-accent1/40 bg-gradient-to-r from-gold/25 via-surface to-surface px-5 py-4 shadow-soft transition-all hover:border-accent1/70 hover:shadow-glow"
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-soft shadow-glow"
          style={{
            backgroundImage:
              "linear-gradient(135deg, hsl(var(--c-accent-2)), hsl(var(--c-accent)))",
          }}
        >
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-lg font-semibold uppercase tracking-wide text-accent1">
            {t.topBand.offerTitle}
          </p>
          <p className="text-sm text-ink-soft">{t.topBand.offerSub}</p>
          <p className="mt-0.5 text-xs text-subtle">{t.topBand.offerNote}</p>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 text-accent1 transition-transform group-hover:translate-x-1" />
      </a>
    </section>
  );
}
