import type { AssetStatRecord, OpeningCategoryStats, StatisticalFrequency } from "@/lib/statistical-levels/types";

type OpeningLocationPanelProps = {
  asset: AssetStatRecord | null;
  frequency: StatisticalFrequency;
};

function formatPercent(value: number | null) {
  if (value === null) return "n/d";
  return `${(value * 100).toFixed(1)}%`;
}

function CategoryBars({ rows }: { rows: OpeningCategoryStats[] }) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.category}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-ink">{row.category}</span>
            <span className="text-muted">{formatPercent(row.proportion)}</span>
          </div>
          <div className="mt-2 h-2 bg-panelSoft">
            <div className="h-2 bg-[#7f9386]" style={{ width: `${Math.max((row.proportion ?? 0) * 100, row.count ? 2 : 0)}%` }} />
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">
            Comportamiento posterior histórico: {formatPercent(row.averageForwardReturn)} · Vol. media {formatPercent(row.averageVolatility)} · Positivos {formatPercent(row.positiveRate)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function OpeningLocationPanel({ asset, frequency }: OpeningLocationPanelProps) {
  const location = asset?.frequencies[frequency].openingLocation;
  return (
    <section className="border border-line bg-panel p-5 md:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Opening Location</p>
      <h2 className="mt-2 text-2xl font-semibold text-ink">Ubicación de apertura</h2>
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">Respecto al rango previo</h3>
          <div className="mt-4">
            <CategoryBars rows={location?.range ?? []} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink">Respecto al cierre previo</h3>
          <div className="mt-4">
            <CategoryBars rows={location?.close ?? []} />
          </div>
        </div>
      </div>
    </section>
  );
}
