"use client";

import { cn } from "@/lib/utils";
import { SunMark } from "./icons";

/**
 * Reverso y anverso de carta, compartidos por el hero y por el selector de
 * tiradas. Estaban embebidos en hero.tsx; se extraen aquí para que ambos
 * flujos usen exactamente la misma carta.
 */

export function TarotBack({
  pulsing,
  compact,
  className,
}: {
  pulsing?: boolean;
  /** Versión reducida: sin estrellas ni rótulo, para mazos de muchas cartas. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-2xl border-2 border-gold/50 shadow-glow",
        compact ? "p-1.5" : "p-3",
        pulsing && "animate-pulse",
        className,
      )}
      style={{
        backgroundImage:
          "radial-gradient(120% 100% at 50% 0%, hsl(var(--c-accent) / 0.35), transparent 55%), linear-gradient(160deg, hsl(var(--c-ink)), hsl(var(--c-ink) / 0.85))",
      }}
    >
      <div
        className={cn(
          "flex h-full w-full items-center justify-center rounded-xl border border-gold/30",
          compact && "rounded-lg",
        )}
      >
        <div className="relative flex flex-col items-center gap-3 text-gold">
          <SunMark
            className={cn(
              "animate-spin-slow",
              compact ? "h-6 w-6" : "h-16 w-16",
            )}
          />
          {!compact && (
            <span className="font-cinzel text-[0.6rem] tracking-[0.4em]">
              TAROT
            </span>
          )}
        </div>

        {!compact &&
          [
            [14, 20],
            [80, 30],
            [24, 78],
            [72, 82],
            [50, 12],
          ].map(([x, y], i) => (
            <span
              key={`${x}-${y}`}
              className="absolute animate-twinkle text-gold"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                animationDelay: `${i * 0.6}s`,
                fontSize: "0.7rem",
              }}
            >
              ✦
            </span>
          ))}
      </div>
    </div>
  );
}

export function TarotFront({
  card,
  label,
  compact,
}: {
  card: { symbol: string; name: string };
  /** Rótulo superior/inferior, p. ej. "ARCANO". */
  label: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-between overflow-hidden rounded-2xl border-2 border-accent1/50 shadow-glow",
        compact ? "p-2" : "p-4",
      )}
      style={{
        backgroundImage:
          "radial-gradient(120% 90% at 50% 0%, hsl(var(--c-gold) / 0.4), transparent 60%), linear-gradient(160deg, hsl(var(--c-surface)), hsl(var(--c-bg-alt)))",
      }}
    >
      <span
        className={cn(
          "font-cinzel tracking-[0.3em] text-accent1",
          compact ? "text-[0.4rem]" : "text-[0.55rem]",
        )}
      >
        {label}
      </span>
      <div className="flex flex-col items-center gap-2">
        <span
          className={cn(
            "flex items-center justify-center rounded-full border border-accent1/40 bg-base/50 text-accent1",
            compact ? "h-10 w-10 text-xl" : "h-20 w-20 text-4xl",
          )}
        >
          {card.symbol}
        </span>
        <span
          className={cn(
            "text-center font-serif font-semibold text-ink",
            compact ? "px-1 text-[0.7rem] leading-tight" : "text-2xl",
          )}
        >
          {card.name}
        </span>
      </div>
      <span
        className={cn(
          "rotate-180 font-cinzel tracking-[0.3em] text-accent1",
          compact ? "text-[0.4rem]" : "text-[0.55rem]",
        )}
      >
        {label}
      </span>
    </div>
  );
}
