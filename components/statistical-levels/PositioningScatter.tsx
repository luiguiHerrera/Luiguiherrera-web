import type { AssetStatRecord, StatisticalFrequency, StatisticalWindow } from "@/lib/statistical-levels/types";

type PositioningScatterProps = {
  assets: AssetStatRecord[];
  frequency: StatisticalFrequency;
  window: StatisticalWindow;
};

function scale(value: number, min: number, max: number, outputMin: number, outputMax: number) {
  if (max === min) return (outputMin + outputMax) / 2;
  return outputMin + ((value - min) / (max - min)) * (outputMax - outputMin);
}

function tone(z: number) {
  if (z > 1) return "#6f8f7b";
  if (z < -1) return "#a86464";
  return "#8c9a91";
}

export function PositioningScatter({ assets, frequency, window }: PositioningScatterProps) {
  const points = assets
    .map((asset) => {
      const data = asset.frequencies[frequency];
      const metric = data.windows[window];
      return {
        ticker: asset.ticker,
        z: metric.ma200ExtensionZScore,
        return12: data.returns["12P"],
        volatility: metric.annualizedVolatilityWindow,
      };
    })
    .filter((point): point is { ticker: string; z: number; return12: number; volatility: number | null } => point.z !== null && point.return12 !== null);

  if (points.length < 2) {
    return (
      <section className="border border-line bg-panel p-4 md:p-5">
        <h2 className="text-xl font-semibold text-ink">Mapa de posicionamiento estadístico</h2>
        <p className="mt-3 text-sm leading-6 text-muted">Mapa comparativo reservado para vistas con varios activos. Esta vista carga solo el activo seleccionado para mantener el payload ligero.</p>
      </section>
    );
  }

  const xMax = Math.max(2, ...points.map((point) => Math.abs(point.z)));
  const yMax = Math.max(0.05, ...points.map((point) => Math.abs(point.return12)));
  const volMax = Math.max(0.01, ...points.map((point) => point.volatility ?? 0));

  return (
    <section className="border border-line bg-panel p-4 md:p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Posicionamiento</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">Mapa de posicionamiento estadístico</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Extensión, retorno y volatilidad de los activos disponibles en la frecuencia activa.
          </p>
        </div>
        <p className="text-xs text-muted">X: z-score · Y: retorno 12P · tamaño: volatilidad</p>
      </div>
      <div className="mt-5 max-w-full overflow-x-auto [contain:paint]">
        <svg viewBox="0 0 760 360" className="block h-[300px] min-w-0 w-full md:h-[360px] md:min-w-[680px]" role="img" aria-label="Mapa de posicionamiento estadístico">
          <rect x="0" y="0" width="760" height="360" fill="#fbfaf8" />
          <line x1="80" x2="720" y1="180" y2="180" stroke="#d8d2ca" strokeWidth="1" />
          <line x1="400" x2="400" y1="32" y2="308" stroke="#d8d2ca" strokeWidth="1" />
          <line x1={scale(-1, -xMax, xMax, 80, 720)} x2={scale(-1, -xMax, xMax, 80, 720)} y1="32" y2="308" stroke="#ece6df" strokeDasharray="4 4" />
          <line x1={scale(1, -xMax, xMax, 80, 720)} x2={scale(1, -xMax, xMax, 80, 720)} y1="32" y2="308" stroke="#ece6df" strokeDasharray="4 4" />
          {points.map((point) => {
            const cx = scale(point.z, -xMax, xMax, 80, 720);
            const cy = scale(point.return12, yMax, -yMax, 32, 308);
            const radius = 7 + ((point.volatility ?? 0) / volMax) * 9;
            return (
              <g key={point.ticker}>
                <circle cx={cx} cy={cy} r={radius} fill={tone(point.z)} fillOpacity="0.82" />
                <text x={cx + radius + 4} y={cy + 4} fontSize="12" fill="#1f2328" fontWeight="600">{point.ticker}</text>
              </g>
            );
          })}
          <text x="400" y="338" textAnchor="middle" fontSize="12" fill="#6f7478">z-score de extensión</text>
          <text x="24" y="180" textAnchor="middle" fontSize="12" fill="#6f7478" transform="rotate(-90 24 180)">retorno 12P</text>
          <text x="392" y="196" textAnchor="end" fontSize="11" fill="#8d8580">0</text>
        </svg>
      </div>
    </section>
  );
}
