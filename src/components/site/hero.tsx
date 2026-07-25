"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/i18n/language-provider";
import type { Dict } from "@/lib/i18n";
import { TAROT_NUMERALS, TAROT_SYMBOLS } from "./data";
import { ArrowRight, Clock, Sparkles } from "./icons";
import { TarotBack, TarotFront } from "./tarot-card";

export function Hero() {
  const { t } = useLanguage();
  const [question, setQuestion] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [cardIdx, setCardIdx] = useState<number | null>(null);

  const draw = () => {
    if (drawing) return;
    setDrawing(true);
    setRevealed(false);
    const next = Math.floor(Math.random() * TAROT_SYMBOLS.length);
    setCardIdx(next);
    setTimeout(() => {
      setRevealed(true);
      setDrawing(false);
    }, 650);
  };

  const reset = () => {
    setRevealed(false);
    setCardIdx(null);
  };

  const card =
    cardIdx !== null
      ? {
          index: cardIdx,
          numeral: TAROT_NUMERALS[cardIdx] ?? "",
          ...t.tarot[cardIdx],
        }
      : null;

  return (
    <>
      {/* Headline */}
      <section
        id="servicos"
        className="container-tarot scroll-mt-24 pt-20 text-center"
      >
        <div className="flex justify-center">
          <span className="eyebrow text-teal">
            <Clock className="h-3.5 w-3.5" /> {t.hero.eyebrow}
          </span>
        </div>
        <h1 className="mx-auto mt-5 max-w-3xl font-serif text-4xl leading-[1.08] text-ink sm:text-5xl md:text-[3.6rem]">
          {t.hero.titlePre}{" "}
          <span className="serif-accent">{t.hero.titleAccent}</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft">
          {t.hero.subtitle}{" "}
          <strong className="text-ink">{t.hero.confidencial}</strong>
        </p>
        <div className="mt-6 flex justify-center">
          <a
            href="#carta"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent1 hover:underline"
          >
            {t.hero.comoFunciona} <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Interactive card reveal */}
      <section id="carta" className="container-tarot scroll-mt-24 pt-14">
        <div className="mx-auto max-w-2xl text-center">
          <span className="eyebrow">
            <Sparkles className="h-3.5 w-3.5 text-accent1" /> {t.hero.cardEyebrow}
          </span>
          <h2 className="mt-4 font-serif text-3xl text-ink sm:text-4xl">
            {t.hero.cardTitlePre}{" "}
            <span className="serif-accent">{t.hero.cardTitleAccent}</span>{" "}
            {t.hero.cardTitlePost}
          </h2>
          <p className="mt-2 text-ink-soft">{t.hero.cardSub}</p>
        </div>

        <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-line bg-surface/80 p-5 shadow-card backdrop-blur sm:p-7">
          <label
            htmlFor="question"
            className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-subtle"
          >
            {t.hero.yourQuestion}
          </label>
          <textarea
            id="question"
            value={question}
            maxLength={160}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t.hero.placeholder}
            className="mt-2 h-20 w-full resize-none rounded-xl border border-line bg-base/60 px-4 py-3 text-ink outline-none transition-colors placeholder:text-subtle focus:border-accent1"
          />
          <div className="flex items-center justify-between text-xs text-subtle">
            <span>{t.hero.hint}</span>
            <span>{question.length}/160</span>
          </div>

          {/* card */}
          <div className="mt-6 flex flex-col items-center">
            <div className="perspective">
              <button
                type="button"
                onClick={revealed ? reset : draw}
                className={cn(
                  "preserve-3d relative h-[300px] w-[200px] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  revealed && "rotate-y-180",
                )}
                aria-label={t.hero.reveal}
              >
                {/* back */}
                <div className="backface-hidden absolute inset-0">
                  <TarotBack pulsing={drawing} />
                </div>
                {/* front */}
                <div className="backface-hidden rotate-y-180 absolute inset-0">
                  {card && <TarotFront card={card} />}
                </div>
              </button>
            </div>

            {revealed && card ? (
              <div className="mt-5 w-full animate-fade-up text-center">
                <p className="text-sm text-ink-soft">{card.text}</p>
                <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                  <a href="#consultores" className="btn-flame w-full sm:w-auto">
                    <Sparkles className="h-4 w-4" /> {t.hero.fullReading}
                  </a>
                  <button
                    type="button"
                    onClick={reset}
                    className="btn-ghost w-full sm:w-auto"
                  >
                    {t.hero.anotherCard}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={draw}
                disabled={drawing}
                className="btn-flame mt-6 w-full max-w-sm disabled:opacity-70"
              >
                <Sparkles className="h-4 w-4" />
                {drawing ? t.hero.shuffling : t.hero.reveal}
              </button>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
