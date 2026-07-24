"use client";

import { cn } from "@/lib/utils";
import { SunMark } from "./icons";
import { TarotArt } from "./tarot-art";

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

/**
 * Anverso ilustrado. Sigue la estructura de una carta de tarot clásica:
 * papel crema, doble filete, numeral romano arriba y cartela con el nombre
 * abajo, con la escena ocupando el centro.
 */
export function TarotFront({
  card,
  compact,
}: {
  card: {
    /** Índice del arcano; selecciona la ilustración. */
    index: number;
    name: string;
    numeral: string;
  };
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-xl shadow-card ring-1 ring-ink/15",
        compact ? "p-[3px]" : "p-[5px]",
      )}
      style={{
        // Papel crema con un veteado suave: da textura sin usar imágenes.
        backgroundImage:
          "radial-gradient(120% 80% at 30% 0%, hsl(var(--c-gold) / 0.22), transparent 60%), linear-gradient(155deg, #fbf6e9, #f3e9d2)",
      }}
    >
      <div className="flex h-full w-full flex-col rounded-lg border border-ink/25">
        {/* numeral */}
        <div className={cn("shrink-0 text-center", compact ? "pt-0.5" : "pt-1.5")}>
          <span
            className={cn(
              "font-cinzel font-semibold tracking-[0.2em] text-ink/80",
              compact ? "text-[0.34rem]" : "text-[0.6rem]",
            )}
          >
            {card.numeral}
          </span>
        </div>

        {/* escena */}
        <div
          className={cn(
            "relative min-h-0 flex-1 overflow-hidden border-y border-ink/20",
            compact ? "mx-0.5 my-0.5" : "mx-1.5 my-1",
          )}
        >
          <TarotArt index={card.index} />
        </div>

        {/* cartela con el nombre */}
        <div
          className={cn(
            "flex shrink-0 items-center justify-center",
            compact ? "h-[14%] px-0.5" : "h-[13%] px-1.5",
          )}
        >
          <span
            className={cn(
              "line-clamp-2 text-center font-cinzel font-semibold uppercase leading-none tracking-[0.1em] text-ink/85",
              compact ? "text-[0.3rem]" : "text-[0.52rem]",
            )}
          >
            {card.name}
          </span>
        </div>
      </div>
    </div>
  );
}
