"use client";

/**
 * Gráfica de barras minimalista en SVG puro (sin dependencias). Muestra
 * importes en céntimos por periodo. Responsive: se escala al contenedor.
 */
export function BarChart({
  data,
  emptyLabel,
}: {
  data: { period: string; cents: number }[];
  emptyLabel: string;
}) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-[0.88rem] text-ink-soft">{emptyLabel}</p>;
  }

  const max = Math.max(...data.map((d) => d.cents), 1);
  const W = 100;
  const H = 46;
  const gap = 1.5;
  const barW = (W - gap * (data.length - 1)) / data.length;

  const euros = (cents: number) =>
    `${(cents / 100).toFixed(0)}€`;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H + 8}`}
        className="h-40 w-full overflow-visible"
        preserveAspectRatio="none"
      >
        {data.map((d, i) => {
          const h = (d.cents / max) * H;
          const x = i * (barW + gap);
          return (
            <g key={d.period}>
              <rect
                x={x}
                y={H - h}
                width={barW}
                height={Math.max(h, 0.5)}
                rx={0.6}
                fill="hsl(var(--c-accent))"
                opacity={0.85}
              >
                <title>
                  {d.period}: {euros(d.cents)}
                </title>
              </rect>
            </g>
          );
        })}
      </svg>
      {/* etiquetas: primera, media y última para no saturar */}
      <div className="mt-1 flex justify-between text-[0.62rem] text-subtle">
        <span>{data[0]?.period}</span>
        {data.length > 2 && (
          <span>{data[Math.floor(data.length / 2)]?.period}</span>
        )}
        <span>{data[data.length - 1]?.period}</span>
      </div>
      {/* máximo de referencia */}
      <p className="mt-1 text-right text-[0.68rem] text-ink-soft">
        máx: {euros(max)}
      </p>
    </div>
  );
}
