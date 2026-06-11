import type { SectorEtfSnapshot } from "@/lib/dashboard/types";

type SectorDetailPanelProps = {
  sector: SectorEtfSnapshot;
  selectedRank: number | null;
};

function formatPercent(value: number | null) {
  if (value === null) return "No disponible";
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

function Sparkline({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 120;
      const y = 32 - ((value - min) / range) * 28;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 120 36" className="h-12 w-full text-petrol" aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
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
        <p className="text-sm font-semibold text-ink">Ranking actual: {selectedRank ?? "No disponible"}</p>
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
          <span className="block text-xs uppercase tracking-[0.14em] text-muted">Tendencia corta</span>
          <span className="mt-1 block font-semibold text-ink">{trendLabel(sector.trend)}</span>
        </div>
      </div>

      <div className="mt-4">
        <Sparkline values={sector.sparkline30d} />
      </div>

      <p className="mt-4 text-sm leading-6 text-muted">Proxy sectorial. No es recomendación de inversión.</p>
    </div>
  );
}
