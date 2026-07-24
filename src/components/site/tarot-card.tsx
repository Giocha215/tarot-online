"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { TAROT_IMAGES } from "./data";
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
  const src = TAROT_IMAGES[card.index] ?? TAROT_IMAGES[0];
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-xl bg-[#f4ecd8] shadow-card ring-1 ring-ink/20",
        compact ? "p-[2px]" : "p-[4px]",
      )}
    >
      <div className="relative h-full w-full overflow-hidden rounded-lg ring-1 ring-ink/15">
        <Image
          src={src as string}
          alt={card.name}
          fill
          sizes="(max-width: 640px) 40vw, 160px"
          className="object-cover"
          // La baraja son 6 imágenes ligeras; no hace falta lazy-loading.
          priority={!compact}
          draggable={false}
        />
        {/* velo dorado sutil para integrar la carta en el tema */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/10 via-transparent to-gold/5" />
      </div>
    </div>
  );
}
