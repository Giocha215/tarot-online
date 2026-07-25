"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/i18n/language-provider";
import { ZODIAC } from "./data";
import { ArrowRight, Star } from "./icons";

function Rating({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[0.68rem] font-semibold uppercase tracking-wide text-subtle">
        {label}
      </span>
      <span className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn("h-3.5 w-3.5", i < value ? "text-gold" : "text-line")}
          />
        ))}
      </span>
    </div>
  );
}

export function Horoscope() {
  const { t, locale } = useLanguage();
  const [selected, setSelected] = useState(0);
  const [dateLabel, setDateLabel] = useState("");
  const sign = ZODIAC[selected];
  const signText = t.zodiac[selected];

  useEffect(() => {
    const d = new Date();
    const fmt = new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(d);
    setDateLabel(fmt.toUpperCase());
  }, [locale]);

  return (
    <section
      className="relative mt-20 scroll-mt-24 overflow-hidden py-16"
      id="signo"
    >
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(180deg, transparent, hsl(var(--c-gold) / 0.14), transparent)",
        }}
      />
      <div className="container-tarot">
        <div className="text-center">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-subtle">
            {dateLabel || "\u00A0"}
          </p>
          <h2 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">
            {t.horoscope.titlePre}{" "}
            <span className="serif-accent">{t.horoscope.titleAccent}</span>
          </h2>
          <p className="mt-2 text-ink-soft">{t.horoscope.subtitle}</p>
        </div>

        {/* selector */}
        <div className="mx-auto mt-8 grid max-w-2xl grid-cols-4 gap-2 sm:grid-cols-6">
          {ZODIAC.map((z, i) => (
            <button
              key={z.symbol}
              type="button"
              onClick={() => setSelected(i)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 transition-all",
                i === selected
                  ? "border-accent1 bg-gold/15 shadow-soft"
                  : "border-line bg-surface/60 hover:border-accent1/40 hover:bg-surface",
              )}
            >
              <span
                className={cn(
                  "text-2xl leading-none",
                  i === selected ? "text-accent1" : "text-ink",
                )}
              >
                {z.symbol}
              </span>
              <span className="text-[0.68rem] font-medium text-ink-soft">
                {t.zodiac[i].name}
              </span>
            </button>
          ))}
        </div>

        {/* selected card */}
        <div className="mx-auto mt-6 max-w-2xl overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
          <div className="flex items-center gap-4 border-b border-line bg-gold/10 px-6 py-5">
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-accent1/30 bg-base/60 text-3xl text-accent1">
              {sign.symbol}
            </span>
            <div>
              <h3 className="font-serif text-2xl text-ink">{signText.name}</h3>
              <p className="text-[0.78rem] uppercase tracking-wide text-subtle">
                {signText.dates} · {signText.element}
              </p>
            </div>
          </div>

          <div className="px-6 py-5">
            <p className="text-ink-soft">{signText.message}</p>

            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-line pt-5">
              <Rating label={t.horoscope.amor} value={sign.love} />
              <Rating label={t.horoscope.trabalho} value={sign.work} />
              <Rating label={t.horoscope.sorte} value={sign.luck} />
            </div>

            <a href="#consultores" className="btn-flame mt-6 w-full">
              {t.horoscope.cta}
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
