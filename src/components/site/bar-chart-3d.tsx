"use client";

import { useMemo, useRef, useState } from "react";

interface Point {
  period: string;
  cents: number;
  count?: number;
}

/**
 * Gráfica de barras 3D interactiva, sin dependencias externas. Cada barra es
 * un prisma (cara frontal + tapa + lateral) construido con transformaciones
 * CSS. Se puede arrastrar para rotar la escena, y al pasar el ratón por una
 * barra se resalta y se muestra su detalle. Respeta prefers-reduced-motion.
 */
export function BarChart3D({
  data,
  emptyLabel,
  locale = "es-ES",
}: {
  data: Point[];
  emptyLabel: string;
  locale?: string;
}) {
  const [rot, setRot] = useState({ x: 26, y: -28 });
  const [active, setActive] = useState<number | null>(null);
  const drag = useRef<{ x: number; y: number; rx: number; ry: number } | null>(
    null,
  );

  const max = useMemo(
    () => Math.max(...data.map((d) => d.cents), 1),
    [data],
  );

  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-[0.88rem] text-ink-soft">
        {emptyLabel}
      </p>
    );
  }

  const euros = (cents: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(cents / 100);

  // Detalle mostrado en la tarjeta: la barra activa, o si no hay ninguna, el
  // periodo de mayor facturación.
  const shownIdx =
    active ?? data.reduce((best, d, i) => (d.cents > data[best]!.cents ? i : best), 0);
  const shown = data[shownIdx]!;

  // Etiqueta corta para el eje X (primera, media, última).
  const shortLabel = (p: string) => {
    const m = /(\d{4})-(\d{2})-(\d{2})/.exec(p);
    if (m) return `${m[3]}/${m[2]}`;
    const mm = /(\d{4})-(\d{2})$/.exec(p);
    if (mm) return `${mm[2]}/${mm[1].slice(2)}`;
    return p;
  };

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { x: e.clientX, y: e.clientY, rx: rot.x, ry: rot.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    setRot({
      x: Math.min(60, Math.max(-5, drag.current.rx - dy * 0.4)),
      y: drag.current.ry + dx * 0.4,
    });
  }
  function onPointerUp() {
    drag.current = null;
  }

  // Ancho de cada barra según cuántas haya (más barras → más finas).
  const barW = Math.max(8, Math.min(34, 320 / data.length));
  const depth = Math.max(9, barW * 0.6);
  const maxH = 150;

  return (
    <div className="c3d">
      {/* tarjeta de detalle */}
      <div className="c3d-info">
        <span className="c3d-info-period">{shown.period}</span>
        <span className="c3d-info-amount">{euros(shown.cents)}</span>
        {shown.count != null && (
          <span className="c3d-info-count">
            {shown.count} {shown.count === 1 ? "sesión" : "sesiones"}
          </span>
        )}
      </div>

      <div
        className="c3d-scene"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        role="img"
        aria-label={`Gráfica de barras 3D. Máximo ${euros(max)}.`}
      >
        <div
          className="c3d-deck"
          style={{ transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)` }}
        >
          {/* suelo */}
          <div className="c3d-floor" />
          {data.map((d, i) => {
            const h = Math.max(3, (d.cents / max) * maxH);
            const isActive = i === active;
            return (
              <div
                key={d.period}
                className={`c3d-col${isActive ? " is-active" : ""}`}
                style={{ width: barW }}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
              >
                <div
                  className="c3d-bar"
                  style={{
                    height: h,
                    width: barW,
                    // @ts-expect-error CSS custom props
                    "--d": `${depth}px`,
                    "--delay": `${i * 40}ms`,
                  }}
                >
                  <span className="c3d-face c3d-front" />
                  <span className="c3d-face c3d-top" />
                  <span className="c3d-face c3d-side" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* eje X */}
      <div className="c3d-axis">
        <span>{shortLabel(data[0]!.period)}</span>
        {data.length > 2 && (
          <span>{shortLabel(data[Math.floor(data.length / 2)]!.period)}</span>
        )}
        <span>{shortLabel(data[data.length - 1]!.period)}</span>
      </div>

      <p className="c3d-hint">Arrastra para girar · máx {euros(max)}</p>

      <style jsx>{`
        .c3d {
          position: relative;
          width: 100%;
        }
        .c3d-info {
          position: absolute;
          top: 0;
          right: 0;
          z-index: 5;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 1px;
          padding: 6px 10px;
          border-radius: 12px;
          background: hsl(var(--c-surface) / 0.72);
          border: 1px solid hsl(var(--c-line));
          backdrop-filter: blur(6px);
          pointer-events: none;
        }
        .c3d-info-period {
          font-size: 0.66rem;
          letter-spacing: 0.02em;
          color: hsl(var(--c-ink-soft));
        }
        .c3d-info-amount {
          font-size: 1.05rem;
          font-weight: 700;
          color: hsl(var(--c-accent));
          line-height: 1.1;
        }
        .c3d-info-count {
          font-size: 0.64rem;
          color: hsl(var(--c-ink-soft));
        }
        .c3d-scene {
          perspective: 900px;
          perspective-origin: 50% 32%;
          height: 210px;
          padding-top: 26px;
          cursor: grab;
          touch-action: none;
          user-select: none;
        }
        .c3d-scene:active {
          cursor: grabbing;
        }
        .c3d-deck {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 6px;
          transform-style: preserve-3d;
          transition: transform 0.08s linear;
        }
        .c3d-floor {
          position: absolute;
          left: 50%;
          bottom: 0;
          width: 92%;
          height: 200px;
          transform: translateX(-50%) rotateX(90deg);
          transform-origin: bottom;
          background:
            linear-gradient(
              hsl(var(--c-line) / 0.5),
              hsl(var(--c-line) / 0)
            );
          border-radius: 8px;
        }
        .c3d-col {
          position: relative;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          transform-style: preserve-3d;
          transition: transform 0.16s ease;
        }
        /* La barra activa salta hacia el espectador. Usamos translateZ (no
           filter) porque cualquier filter aplanaría el preserve-3d. */
        .c3d-col.is-active {
          transform: translateZ(24px);
        }
        .c3d-bar {
          position: relative;
          transform-style: preserve-3d;
          transform-origin: bottom;
          animation: c3d-rise 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
          animation-delay: var(--delay);
        }
        .c3d-face {
          position: absolute;
          display: block;
        }
        .c3d-front {
          inset: 0;
          background: linear-gradient(
            hsl(var(--c-accent-2)),
            hsl(var(--c-accent))
          );
          border-radius: 2px 2px 0 0;
          box-shadow: inset 0 1px 0 hsl(0 0% 100% / 0.25);
        }
        .c3d-top {
          top: 0;
          left: 0;
          width: 100%;
          height: var(--d);
          transform-origin: top;
          transform: rotateX(-90deg);
          background: color-mix(in srgb, hsl(var(--c-accent-2)) 55%, white);
          border-radius: 2px;
        }
        .c3d-side {
          top: 0;
          right: 0;
          width: var(--d);
          height: 100%;
          transform-origin: right;
          transform: rotateY(-90deg);
          background: color-mix(in srgb, hsl(var(--c-accent)) 82%, black);
        }
        .c3d-col.is-active .c3d-front {
          background: linear-gradient(
            hsl(var(--c-teal)),
            hsl(var(--c-accent-2))
          );
          box-shadow:
            inset 0 1px 0 hsl(0 0% 100% / 0.3),
            0 10px 22px hsl(var(--c-accent) / 0.4);
        }
        .c3d-col.is-active .c3d-top {
          background: color-mix(in srgb, hsl(var(--c-teal)) 60%, white);
        }
        .c3d-axis {
          margin-top: 6px;
          display: flex;
          justify-content: space-between;
          font-size: 0.62rem;
          color: hsl(var(--c-ink-soft));
        }
        .c3d-hint {
          margin-top: 2px;
          text-align: center;
          font-size: 0.62rem;
          color: hsl(var(--c-ink-soft) / 0.75);
        }
        /* Solo scaleY: sin opacity para no aplanar el preserve-3d durante la
           animación (una opacidad < 1 fuerza el aplanado del 3D). */
        @keyframes c3d-rise {
          from {
            transform: scaleY(0.001);
          }
          to {
            transform: scaleY(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .c3d-bar {
            animation: none;
          }
          .c3d-deck {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
