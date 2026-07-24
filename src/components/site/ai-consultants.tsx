"use client";

import { useLanguage } from "@/components/i18n/language-provider";
import { AI_CONSULTANTS } from "./data";
import { ChevronRight, Gift, Sparkles } from "./icons";

export function AIConsultants() {
  const { t } = useLanguage();
  return (
    <section
      id="virtuais"
      className="relative mt-20 scroll-mt-24 overflow-hidden py-16"
    >
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(180deg, transparent, hsl(var(--c-gold) / 0.16) 40%, hsl(var(--c-accent) / 0.08))",
        }}
      />
      <div className="container-tarot">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow border-accent1/30 text-accent1">
            <Gift className="h-3.5 w-3.5" /> {t.aiSection.eyebrow}
          </span>
          <h2 className="mt-4 font-serif text-3xl text-ink sm:text-4xl">
            {t.aiSection.titlePre}{" "}
            <span className="serif-accent">{t.aiSection.titleAccent}</span>
          </h2>
          <p className="mt-2 text-ink-soft">{t.aiSection.subtitle}</p>
        </div>

        <div className="mx-auto mt-8 grid max-w-3xl gap-3">
          {AI_CONSULTANTS.map((a, i) => {
            const tr = t.ai[a.slug];
            return (
              <a
                key={a.slug}
                href="#carta"
                className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-3.5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-accent1/40 hover:shadow-card"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="relative shrink-0">
                  <img
                    src={a.avatar}
                    alt={a.name}
                    className="h-16 w-16 rounded-xl object-cover ring-1 ring-line"
                    loading="lazy"
                  />
                  <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-[0.55rem] font-bold text-ink shadow">
                    IA
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-xl text-ink">{a.name}</h3>
                    <Sparkles className="h-3.5 w-3.5 text-accent1" />
                  </div>
                  <p className="text-[0.82rem] font-semibold text-accent1">
                    {tr?.focus}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[0.82rem] text-subtle">
                    {tr?.desc}
                  </p>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink transition-colors group-hover:bg-accent1 group-hover:text-ink-soft">
                  <ChevronRight className="h-5 w-5" />
                </span>
              </a>
            );
          })}
        </div>

        <p className="mx-auto mt-5 max-w-md text-center text-xs text-subtle">
          {t.aiSection.footnote}
        </p>
      </div>
    </section>
  );
}
