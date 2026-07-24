"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/i18n/language-provider";
import { cn } from "@/lib/utils";
import {
  DECK_SIZE,
  SPREADS,
  TAROT_NUMERALS,
  TAROT_SYMBOLS,
  type Spread,
} from "./data";
import { ArrowRight } from "./icons";
import { TarotBack, TarotFront } from "./tarot-card";

type Step = "intro" | "pick" | "reading";

/** Baraja una lista de índices (Fisher-Yates). */
function shuffled(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j] as number, a[i] as number];
  }
  return a;
}

// ------------------------------------------------------------------
// Portada de cada tirada en la parrilla
// ------------------------------------------------------------------
function SpreadCover({
  spread,
  index,
  name,
  desc,
  onSelect,
}: {
  spread: Spread;
  /** Carta ilustrada que representa la tirada en la parrilla. */
  index: number;
  name: string;
  desc: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-[150px] shrink-0 flex-col items-center text-center outline-none sm:w-[160px]"
    >
      <div className="h-[210px] w-[135px] transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:rotate-1 group-focus-visible:-translate-y-1.5 sm:h-[225px] sm:w-[145px]">
        <TarotFront
          card={{
            index,
            numeral: TAROT_NUMERALS[index] ?? "",
            name: spread.cards > 1 ? `${spread.cards} cartas` : name,
          }}
        />
      </div>
      <p className="mt-3 font-serif text-[1.02rem] font-semibold leading-tight text-accent1">
        {name}
      </p>
      <p className="mt-1 text-[0.78rem] italic leading-snug text-ink-soft">
        {desc}
      </p>
    </button>
  );
}

// ------------------------------------------------------------------
// Flujo: barajar -> elegir -> lectura
// ------------------------------------------------------------------
function SpreadFlow({
  spread,
  onClose,
}: {
  spread: Spread;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const item = t.spreads.items[spread.slug];

  const [step, setStep] = useState<Step>("intro");
  const [shuffling, setShuffling] = useState(false);
  const [dealt, setDealt] = useState<number[]>([]);
  const [picked, setPicked] = useState<number[]>([]);

  // Cerrar con Escape, como cualquier diálogo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // El fondo no debe hacer scroll mientras el diálogo está abierto.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const startShuffle = useCallback(() => {
    setShuffling(true);
    setPicked([]);
    // La espera es puramente teatral: da sensación de que algo ocurre.
    setTimeout(() => {
      // A cada posición del mazo se le asigna una carta del repertorio.
      setDealt(
        Array.from(
          { length: DECK_SIZE },
          () => Math.floor(Math.random() * TAROT_SYMBOLS.length),
        ),
      );
      setShuffling(false);
    }, 900);
  }, []);

  const pick = useCallback(
    (position: number) => {
      setPicked((prev) => {
        if (prev.includes(position) || prev.length >= spread.cards) return prev;
        const next = [...prev, position];
        if (next.length === spread.cards) {
          setTimeout(() => setStep("reading"), 550);
        }
        return next;
      });
    },
    [spread.cards],
  );

  const remaining = spread.cards - picked.length;

  // Las cartas elegidas, ya resueltas contra el diccionario del idioma activo.
  const chosen = picked.map((position) => {
    const idx = dealt[position] ?? 0;
    return {
      index: idx,
      numeral: TAROT_NUMERALS[idx] ?? "",
      ...(t.tarot[idx] ?? t.tarot[0]),
    };
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
      className="fixed inset-0 z-50 overflow-y-auto bg-base/97 backdrop-blur-sm"
    >
      <div className="container-tarot min-h-full py-10">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line bg-surface/70 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface"
          >
            {t.spreads.close} ✕
          </button>
        </div>

        <h2 className="mt-4 text-center font-cinzel text-[2rem] font-semibold text-ink sm:text-[2.6rem]">
          {item.name}
        </h2>

        {/* ---------------- paso 1: presentación ---------------- */}
        {step === "intro" && (
          <div className="mx-auto mt-6 flex max-w-xl flex-col items-center text-center">
            <p className="text-[0.98rem] leading-relaxed text-ink-soft">
              {item.desc}. {t.spreads.relaxText}
            </p>
            <button
              type="button"
              onClick={() => {
                setStep("pick");
                startShuffle();
              }}
              className="btn-flame mt-7 px-8 py-3"
            >
              {t.spreads.start}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 text-[0.85rem] italic text-ink-soft underline-offset-4 hover:text-accent1 hover:underline"
            >
              &gt;&gt; {t.spreads.back}
            </button>

            <div className="mt-10 h-[240px] w-[160px] opacity-90">
              <TarotBack />
            </div>
          </div>
        )}

        {/* ---------------- paso 2: barajar y elegir ---------------- */}
        {step === "pick" && (
          <div className="mt-6 flex flex-col items-center">
            <p className="font-serif text-xl font-semibold text-accent1">
              {t.spreads.relaxTitle}
            </p>
            <p className="mt-1 text-center text-[0.92rem] text-ink-soft">
              {t.spreads.relaxText}
            </p>

            <h3 className="mt-8 text-center font-serif text-[1.5rem] font-semibold text-accent1">
              {t.spreads.pickTitle}
            </h3>
            <p className="mt-1 text-center text-[0.92rem] text-ink-soft">
              {t.spreads.pickTextPre}{" "}
              <span className="font-semibold text-accent1">{spread.cards}</span>{" "}
              {t.spreads.pickTextPost}
            </p>

            <button
              type="button"
              onClick={startShuffle}
              disabled={shuffling}
              className="btn-flame mt-6 px-8 py-3 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {shuffling ? t.spreads.shuffling : t.spreads.shuffle}
            </button>

            {remaining > 0 && (
              <p
                aria-live="polite"
                className="mt-4 text-[0.88rem] italic text-accent1"
              >
                {t.spreads.remainingPre} {remaining} {t.spreads.remainingPost}
              </p>
            )}

            {/* mazo en abanico */}
            <div className="mt-8 w-full overflow-x-auto overflow-y-visible pb-6 pt-4">
              <div
                className={cn(
                  "mx-auto flex w-max px-4",
                  // Mientras baraja, todo el mazo oscila como un bloque.
                  shuffling && "origin-bottom animate-shuffle-deck",
                )}
              >
                {Array.from({ length: DECK_SIZE }, (_, i) => i).map((pos) => {
                  const isPicked = picked.includes(pos);
                  const done = picked.length >= spread.cards;
                  return (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => pick(pos)}
                      disabled={shuffling || done || isPicked}
                      aria-label={`${t.spreads.cardLabel} ${pos + 1}`}
                      style={
                        shuffling
                          ? {
                              // Cada carta se contonea con su propio desfase:
                              // el mazo deja de moverse "en bloque".
                              animationDelay: `${(pos % 8) * 0.06}s`,
                            }
                          : undefined
                      }
                      className={cn(
                        "-ml-8 h-[150px] w-[100px] shrink-0 rounded-xl transition-all duration-300 first:ml-0",
                        "hover:z-10 focus-visible:z-10 focus-visible:outline-none",
                        shuffling && "origin-bottom animate-card-sway",
                        !shuffling &&
                          !done &&
                          !isPicked &&
                          "hover:-translate-y-5 hover:rotate-2 focus-visible:-translate-y-5",
                        isPicked && "-translate-y-8 scale-95 opacity-30",
                      )}
                    >
                      <TarotBack compact />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ---------------- paso 3: lectura ---------------- */}
        {step === "reading" && (
          <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center">
            <div className="flex flex-wrap justify-center gap-5">
              {chosen.map((card, i) => (
                <div
                  key={`${card.name}-${i}`}
                  className="flex animate-deal-in flex-col items-center"
                  style={{ animationDelay: `${i * 0.12}s` }}
                >
                  <div className="h-[230px] w-[155px]">
                    <TarotFront card={card} />
                  </div>
                  <p className="mt-2 text-[0.8rem] text-subtle">
                    {t.spreads.cardLabel} {i + 1}
                  </p>
                </div>
              ))}
            </div>

            <h3 className="mt-10 font-serif text-[1.4rem] font-semibold text-accent1">
              {t.spreads.reading}
            </h3>

            <div className="mt-4 flex w-full flex-col gap-4">
              {chosen.map((card, i) => (
                <div
                  key={`text-${card.name}-${i}`}
                  className="rounded-2xl border border-line bg-surface/70 p-5 shadow-soft"
                >
                  <p className="font-serif text-lg font-semibold text-ink">
                    {card.name}
                  </p>
                  <p className="mt-1.5 text-[0.94rem] leading-relaxed text-ink-soft">
                    {card.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setPicked([]);
                  setStep("pick");
                  startShuffle();
                }}
                className="rounded-full border border-line bg-surface/70 px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface"
              >
                {t.spreads.again}
              </button>
              <a href="#consultores" onClick={onClose} className="btn-flame px-7 py-3">
                {t.spreads.cta}
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
export function Spreads() {
  const { t } = useLanguage();
  const [active, setActive] = useState<Spread | null>(null);

  return (
    <section id="tiradas" className="container-tarot pt-10">
      <div className="rounded-3xl border border-line bg-surface/50 px-4 py-9 shadow-soft backdrop-blur-sm sm:px-8">
        <h2 className="text-center font-cinzel text-[1.8rem] font-semibold text-ink sm:text-[2.2rem]">
          {t.spreads.title}
        </h2>
        <p className="mt-2 text-center text-[0.95rem] text-ink-soft">
          {t.spreads.subtitle}
        </p>

        <div className="mt-8 flex gap-5 overflow-x-auto pb-3 lg:justify-center lg:overflow-visible lg:flex-wrap">
          {SPREADS.map((s, i) => (
            <SpreadCover
              key={s.slug}
              spread={s}
              index={i}
              name={t.spreads.items[s.slug].name}
              desc={t.spreads.items[s.slug].desc}
              onSelect={() => setActive(s)}
            />
          ))}
        </div>
      </div>

      {active && (
        <SpreadFlow spread={active} onClose={() => setActive(null)} />
      )}
    </section>
  );
}
