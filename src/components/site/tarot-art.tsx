/**
 * Ilustraciones originales para los seis arcanos del repertorio.
 *
 * Dibujadas aquí en SVG a propósito: son vectoriales (nítidas a cualquier
 * tamaño), pesan una fracción de un JPG y no dependen de ninguna baraja
 * ajena. El índice coincide con TAROT_SYMBOLS y con translations[lang].tarot.
 *
 * Todas comparten el lienzo 0 0 100 140 y una paleta de tinta/dorado que se
 * apoya en las variables del tema.
 */

const INK = "hsl(var(--c-ink))";
const GOLD = "hsl(var(--c-gold))";
const ACCENT = "hsl(var(--c-accent))";
const TEAL = "hsl(var(--c-teal))";

/** Estrella de ocho puntas, usada en varias escenas. */
function Star8({
  cx,
  cy,
  r,
  fill = GOLD,
  opacity = 1,
}: {
  cx: number;
  cy: number;
  r: number;
  fill?: string;
  opacity?: number;
}) {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const rad = (Math.PI / 8) * i;
    const rr = i % 2 === 0 ? r : r * 0.4;
    pts.push(`${(cx + rr * Math.sin(rad)).toFixed(2)},${(cy - rr * Math.cos(rad)).toFixed(2)}`);
  }
  return <polygon points={pts.join(" ")} fill={fill} opacity={opacity} />;
}

// ------------------------------------------------------------------ 0. El Sol
function ArtSol() {
  const rays = Array.from({ length: 16 }, (_, i) => {
    const a = (Math.PI / 8) * i;
    return (
      <line
        key={i}
        x1={50 + 20 * Math.sin(a)}
        y1={48 - 20 * Math.cos(a)}
        x2={50 + (i % 2 ? 30 : 34) * Math.sin(a)}
        y2={48 - (i % 2 ? 30 : 34) * Math.cos(a)}
        stroke={GOLD}
        strokeWidth={i % 2 ? 1.1 : 2}
        strokeLinecap="round"
      />
    );
  });
  return (
    <>
      <rect x="6" y="6" width="88" height="128" fill={TEAL} opacity="0.1" />
      {rays}
      <circle cx="50" cy="48" r="20" fill={GOLD} opacity="0.9" />
      {/* rostro solar */}
      <circle cx="44" cy="44" r="1.8" fill={INK} />
      <circle cx="56" cy="44" r="1.8" fill={INK} />
      <path d="M43 54 Q50 60 57 54" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* muro */}
      <rect x="14" y="96" width="72" height="6" fill={ACCENT} opacity="0.45" />
      {[18, 30, 42, 54, 66, 78].map((x) => (
        <rect key={x} x={x} y="96" width="1.2" height="6" fill={INK} opacity="0.25" />
      ))}
      {/* girasoles */}
      {[26, 50, 74].map((x, i) => (
        <g key={x}>
          <line x1={x} y1="96" x2={x} y2={80 + i * 2} stroke={TEAL} strokeWidth="1.6" />
          <circle cx={x} cy={78 + i * 2} r="5" fill={GOLD} opacity="0.85" />
          <circle cx={x} cy={78 + i * 2} r="2" fill={ACCENT} opacity="0.6" />
        </g>
      ))}
      <rect x="6" y="102" width="88" height="32" fill={TEAL} opacity="0.18" />
    </>
  );
}

// -------------------------------------------------------------- 1. La Estrella
function ArtEstrela() {
  return (
    <>
      <rect x="6" y="6" width="88" height="128" fill={INK} opacity="0.08" />
      <Star8 cx={50} cy={40} r={20} />
      <Star8 cx={24} cy={26} r={7} opacity={0.75} />
      <Star8 cx={76} cy={28} r={8} opacity={0.75} />
      <Star8 cx={30} cy={58} r={5} opacity={0.6} />
      <Star8 cx={72} cy={60} r={6} opacity={0.6} />
      {/* colinas */}
      <path d="M6 100 Q28 84 50 98 Q72 84 94 100 L94 134 L6 134 Z" fill={TEAL} opacity="0.3" />
      {/* estanque y reflejo */}
      <ellipse cx="50" cy="116" rx="30" ry="9" fill={TEAL} opacity="0.45" />
      <Star8 cx={50} cy={116} r={7} opacity={0.5} />
      {[36, 50, 64].map((x) => (
        <path
          key={x}
          d={`M${x - 8} 122 Q${x} 119 ${x + 8} 122`}
          stroke={GOLD}
          strokeWidth="0.9"
          fill="none"
          opacity="0.6"
        />
      ))}
    </>
  );
}

// ------------------------------------------------------- 2. La Rueda de la Fortuna
function ArtRoda() {
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 4) * i;
    return (
      <line
        key={i}
        x1={50 + 8 * Math.sin(a)}
        y1={64 - 8 * Math.cos(a)}
        x2={50 + 28 * Math.sin(a)}
        y2={64 - 28 * Math.cos(a)}
        stroke={GOLD}
        strokeWidth="1.6"
      />
    );
  });
  return (
    <>
      <rect x="6" y="6" width="88" height="128" fill={ACCENT} opacity="0.08" />
      {/* nubes en las esquinas */}
      {[
        [20, 24],
        [80, 24],
        [20, 108],
        [80, 108],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} opacity="0.5">
          <circle cx={x} cy={y} r="7" fill={TEAL} />
          <circle cx={(x as number) - 5} cy={(y as number) + 3} r="5" fill={TEAL} />
          <circle cx={(x as number) + 5} cy={(y as number) + 3} r="5" fill={TEAL} />
        </g>
      ))}
      <circle cx="50" cy="64" r="30" fill="none" stroke={GOLD} strokeWidth="2.4" />
      <circle cx="50" cy="64" r="24" fill="none" stroke={GOLD} strokeWidth="1" opacity="0.7" />
      {spokes}
      <circle cx="50" cy="64" r="8" fill={ACCENT} opacity="0.65" />
      <circle cx="50" cy="64" r="3" fill={GOLD} />
      {/* marcas del aro exterior */}
      {Array.from({ length: 24 }, (_, i) => {
        const a = (Math.PI / 12) * i;
        return (
          <circle
            key={i}
            cx={50 + 30 * Math.sin(a)}
            cy={64 - 30 * Math.cos(a)}
            r="1.1"
            fill={GOLD}
            opacity="0.8"
          />
        );
      })}
    </>
  );
}

// ----------------------------------------------------------- 3. La Emperatriz
function ArtImperatriz() {
  return (
    <>
      <rect x="6" y="6" width="88" height="128" fill={TEAL} opacity="0.12" />
      {/* campo de trigo */}
      <rect x="6" y="104" width="88" height="30" fill={GOLD} opacity="0.28" />
      {[14, 24, 34, 66, 76, 86].map((x) => (
        <g key={x}>
          <line x1={x} y1="104" x2={x} y2="88" stroke={GOLD} strokeWidth="1.2" />
          <ellipse cx={x} cy="86" rx="2" ry="4" fill={GOLD} opacity="0.8" />
        </g>
      ))}
      {/* corona de estrellas */}
      {[38, 44, 50, 56, 62].map((x, i) => (
        <Star8 key={x} cx={x} cy={i === 2 ? 26 : 30} r={3} />
      ))}
      {/* figura sentada */}
      <path d="M36 104 Q36 70 50 66 Q64 70 64 104 Z" fill={ACCENT} opacity="0.55" />
      <circle cx="50" cy="52" r="10" fill={INK} opacity="0.75" />
      <path d="M40 52 Q50 42 60 52" fill={GOLD} opacity="0.6" />
      {/* escudo con corazón */}
      <path d="M50 88 L57 92 L57 100 Q50 106 43 100 L43 92 Z" fill={GOLD} opacity="0.85" />
      <path
        d="M50 99 Q45 95 47 93 Q49 91.5 50 94 Q51 91.5 53 93 Q55 95 50 99 Z"
        fill={ACCENT}
      />
    </>
  );
}

// --------------------------------------------------------------- 4. El Mundo
function ArtMundo() {
  return (
    <>
      <rect x="6" y="6" width="88" height="128" fill={INK} opacity="0.07" />
      {/* guirnalda */}
      <ellipse cx="50" cy="66" rx="30" ry="42" fill="none" stroke={TEAL} strokeWidth="4" opacity="0.7" />
      {Array.from({ length: 20 }, (_, i) => {
        const a = (Math.PI / 10) * i;
        return (
          <ellipse
            key={i}
            cx={50 + 30 * Math.sin(a)}
            cy={66 - 42 * Math.cos(a)}
            rx="2.6"
            ry="4"
            fill={TEAL}
            opacity="0.85"
            transform={`rotate(${(180 / Math.PI) * a} ${50 + 30 * Math.sin(a)} ${66 - 42 * Math.cos(a)})`}
          />
        );
      })}
      {/* lazos */}
      <path d="M44 24 L56 24 L50 30 Z" fill={ACCENT} opacity="0.8" />
      <path d="M44 108 L56 108 L50 102 Z" fill={ACCENT} opacity="0.8" />
      {/* figura danzante */}
      <circle cx="50" cy="48" r="7" fill={INK} opacity="0.7" />
      <path d="M50 55 L50 80" stroke={INK} strokeWidth="3" opacity="0.7" strokeLinecap="round" />
      <path d="M50 60 L36 52 M50 60 L64 52" stroke={INK} strokeWidth="2.6" opacity="0.7" strokeLinecap="round" />
      <path d="M50 80 L41 94 M50 80 L61 90" stroke={INK} strokeWidth="2.6" opacity="0.7" strokeLinecap="round" />
      {/* cuatro emblemas */}
      <Star8 cx={16} cy={22} r={5} opacity={0.8} />
      <Star8 cx={84} cy={22} r={5} opacity={0.8} />
      <Star8 cx={16} cy={112} r={5} opacity={0.8} />
      <Star8 cx={84} cy={112} r={5} opacity={0.8} />
    </>
  );
}

// -------------------------------------------------------------- 5. La Fuerza
function ArtForca() {
  return (
    <>
      <rect x="6" y="6" width="88" height="128" fill={GOLD} opacity="0.14" />
      {/* lemniscata */}
      <path
        d="M38 28 Q44 20 50 28 Q56 36 62 28 Q56 20 50 28 Q44 36 38 28 Z"
        fill="none"
        stroke={GOLD}
        strokeWidth="2.2"
      />
      {/* figura */}
      <circle cx="42" cy="52" r="9" fill={INK} opacity="0.72" />
      <path d="M30 104 Q30 66 42 62 Q54 66 54 104 Z" fill={ACCENT} opacity="0.5" />
      {/* brazo hacia el león */}
      <path d="M50 70 Q60 74 66 80" stroke={INK} strokeWidth="2.6" fill="none" opacity="0.72" strokeLinecap="round" />
      {/* león */}
      <ellipse cx="72" cy="92" rx="16" ry="12" fill={GOLD} opacity="0.75" />
      <circle cx="70" cy="82" r="9" fill={GOLD} opacity="0.9" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (Math.PI / 6) * i;
        return (
          <line
            key={i}
            x1={70 + 9 * Math.sin(a)}
            y1={82 - 9 * Math.cos(a)}
            x2={70 + 13 * Math.sin(a)}
            y2={82 - 13 * Math.cos(a)}
            stroke={GOLD}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        );
      })}
      <circle cx="67" cy="81" r="1.3" fill={INK} />
      <circle cx="73" cy="81" r="1.3" fill={INK} />
      <path d="M68 86 Q70 88 72 86" stroke={INK} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <rect x="6" y="104" width="88" height="30" fill={TEAL} opacity="0.2" />
    </>
  );
}

const ART = [ArtSol, ArtEstrela, ArtRoda, ArtImperatriz, ArtMundo, ArtForca];

/** Escena ilustrada de la carta `index` (se cicla si se sale de rango). */
export function TarotArt({ index }: { index: number }) {
  const Scene = ART[((index % ART.length) + ART.length) % ART.length] ?? ArtSol;
  return (
    <svg
      viewBox="0 0 100 140"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <Scene />
    </svg>
  );
}
