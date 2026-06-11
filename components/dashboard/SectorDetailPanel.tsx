import type { SectorEtfSnapshot } from "@/lib/dashboard/types";

type SectorDetailPanelProps = {
  sector: SectorEtfSnapshot;
  selectedRank: number | null;
};

function formatPercent(value: number | null) {
  if (value === null) return "Pendiente de datos suficientes";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatCurrency(value: number) {
  return value.toLocaleString("es-CO", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function trendLabel(trend: SectorEtfSnapshot["trend"]) {
  if (trend === "up") return "Ascendente";
  if (trend === "down") return "Descendente";
  return "Lateral";
}

function MiniReturnChart({ values }: { values: number[] }) {
  if (values.length < 2) {
    return (
      <div className="border border-line bg-panel p-4 text-sm text-muted">
        Historial insuficiente
      </div>
    );
  }

  const base = values[0] || 1;
  const returns = values.map((value) => ((value / base) - 1) * 100);
  const min = Math.min(...returns);
  const max = Math.max(...returns);
  const middle = (min + max) / 2;
  const range = max - min || 1;
  const chartLeft = 34;
  const chartRight = 174;
  const chartTop = 10;
  const chartBottom = 70;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;
  const points = returns
    .map((value, index) => {
      const x = chartLeft + (index / Math.max(returns.length - 1, 1)) * chartWidth;
      const y = chartBottom - ((value - min) / range) * chartHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const finalValue = returns[returns.length - 1];
  const finalX = chartRight;
  const finalY = chartBottom - ((finalValue - min) / range) * chartHeight;
  const yFor = (value: number) => chartBottom - ((value - min) / range) * chartHeight;

  return (
    <div className="border border-line bg-panel p-3">
      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.12em] text-muted">
        <span>Retorno acumulado 30 sesiones</span>
        <span className="font-semibold text-ink">{formatPercent(finalValue)}</span>
      </div>
      <svg viewBox="0 0 190 92" className="h-32 w-full text-petrol" role="img" aria-label="Retorno acumulado de los últimos 30 cierres ajustados">
        {[max, middle, min].map((tick) => (
          <g key={tick}>
            <line x1={chartLeft} x2={chartRight} y1={yFor(tick)} y2={yFor(tick)} stroke="currentColor" strokeOpacity="0.12" vectorEffect="non-scaling-stroke" />
            <text x="2" y={yFor(tick) + 3} className="fill-muted text-[9px]">{formatPercent(tick)}</text>
          </g>
        ))}
        <line x1={chartLeft} x2={chartLeft} y1={chartTop} y2={chartBottom} stroke="currentColor" strokeOpacity="0.18" vectorEffect="non-scaling-stroke" />
        <line x1={chartLeft} x2={chartRight} y1={chartBottom} y2={chartBottom} stroke="currentColor" strokeOpacity="0.18" vectorEffect="non-scaling-stroke" />
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {returns.map((value, index) => {
          if (index % 5 !== 0 && index !== returns.length - 1) return null;

          const x = chartLeft + (index / Math.max(returns.length - 1, 1)) * chartWidth;
          const y = chartBottom - ((value - min) / range) * chartHeight;
          return <circle key={`${index}-${value}`} cx={x} cy={y} r="1.2" fill="currentColor" opacity="0.55" />;
        })}
        <circle cx={finalX} cy={finalY} r="3" fill="currentColor" />
        <text x={chartLeft} y="88" className="fill-muted text-[9px]">-30 sesiones</text>
        <text x={chartRight - 16} y="88" className="fill-muted text-[9px]">Hoy</text>
      </svg>
    </div>
  );
}

export function SectorDetailPanel({ sector, selectedRank }: SectorDetailPanelProps) {
  return (
    <div className="border border-line bg-panelSoft p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">Detalle sectorial</p>
          <h3 className="mt-1 text-xl font-semibold text-ink">{sector.sectorName}</h3>
          <p className="mt-1 text-sm text-muted">{sector.etfTicker} como proxy sectorial</p>
        </div>
        <p className="text-sm font-semibold text-ink">Ranking actual: {selectedRank ?? "Pendiente de datos suficientes"}</p>
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <span className="block text-xs uppercase tracking-[0.14em] text-muted">Último cierre</span>
          <span className="mt-1 block font-semibold text-ink">{formatCurrency(sector.latestClose)}</span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-[0.14em] text-muted">1W</span>
          <span className="mt-1 block font-semibold text-ink">{formatPercent(sector.return1w)}</span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-[0.14em] text-muted">1M</span>
          <span className="mt-1 block font-semibold text-ink">{formatPercent(sector.return1m)}</span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-[0.14em] text-muted">3M</span>
          <span className="mt-1 block font-semibold text-ink">{formatPercent(sector.return3m)}</span>
        </div>
        <div>
          <span className="block text-xs uppercase tracking-[0.14em] text-muted">Tendencia 30 sesiones</span>
          <span className="mt-1 block font-semibold text-ink">{trendLabel(sector.trend)}</span>
        </div>
      </div>

      <div className="mt-4">
        <MiniReturnChart values={sector.sparkline30d} />
      </div>

      <p className="mt-4 text-sm leading-6 text-muted">
        Tendencia calculada sobre los últimos 30 cierres ajustados, comparando el tramo inicial con el tramo final. Proxy sectorial para contexto, no personalizado.
      </p>
    </div>
  );
}
