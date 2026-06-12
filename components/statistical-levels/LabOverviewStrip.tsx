import type { AssetStatRecord, StatisticalFrequency, StatisticalWindow } from "@/lib/statistical-levels/types";

type LabOverviewStripProps = {
  assets: AssetStatRecord[];
  frequency: StatisticalFrequency;
  window: StatisticalWindow;
};

function formatPercent(value: number | null) {
  if (value === null) return "n/d";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number | null) {
  if (value === null) return "n/d";
  return value.toFixed(2);
}

function magnitude(value: number | null, max: number) {
  if (value === null || max <= 0) return 0;
  return Math.min(Math.abs(value) / max, 1) * 100;
}

export function LabOverviewStrip({ assets, frequency, window }: LabOverviewStripProps) {
  const rows = assets.map((asset) => {
    const data = asset.frequencies[frequency];
    const metric = data.windows[window];
    return { asset, data, metric };
  });
  const mostPositive = rows.reduce((best, row) => ((row.metric.ma200ExtensionZScore ?? -Infinity) > (best?.metric.ma200ExtensionZScore ?? -Infinity) ? row : best), rows[0]);
  const mostNegative = rows.reduce((best, row) => ((row.metric.ma200ExtensionZScore ?? Infinity) < (best?.metric.ma200ExtensionZScore ?? Infinity) ? row : best), rows[0]);
  const highestVol = rows.reduce((best, row) => ((row.metric.annualizedVolatilityWindow ?? -Infinity) > (best?.metric.annualizedVolatilityWindow ?? -Infinity) ? row : best), rows[0]);
  const deepestDrawdown = rows.reduce((best, row) => ((row.metric.currentDrawdown ?? Infinity) < (best?.metric.currentDrawdown ?? Infinity) ? row : best), rows[0]);
  const maxZ = Math.max(...rows.map((row) => Math.abs(row.metric.ma200ExtensionZScore ?? 0)), 1);
  const maxVol = Math.max(...rows.map((row) => row.metric.annualizedVolatilityWindow ?? 0), 0.01);
  const maxDrawdown = Math.max(...rows.map((row) => Math.abs(row.metric.currentDrawdown ?? 0)), 0.01);
  const items = [
    { label: "Mayor extensión positiva", row: mostPositive, value: formatNumber(mostPositive?.metric.ma200ExtensionZScore ?? null), width: magnitude(mostPositive?.metric.ma200ExtensionZScore ?? null, maxZ), tone: "bg-[#6f8f7b]" },
    { label: "Mayor extensión negativa", row: mostNegative, value: formatNumber(mostNegative?.metric.ma200ExtensionZScore ?? null), width: magnitude(mostNegative?.metric.ma200ExtensionZScore ?? null, maxZ), tone: "bg-[#a86464]" },
    { label: "Mayor volatilidad anualizada", row: highestVol, value: formatPercent(highestVol?.metric.annualizedVolatilityWindow ?? null), width: magnitude(highestVol?.metric.annualizedVolatilityWindow ?? null, maxVol), tone: "bg-[#7d8f9a]" },
    { label: "Mayor drawdown actual", row: deepestDrawdown, value: formatPercent(deepestDrawdown?.metric.currentDrawdown ?? null), width: magnitude(deepestDrawdown?.metric.currentDrawdown ?? null, maxDrawdown), tone: "bg-[#9d8176]" },
  ];

  return (
    <section className="border border-line bg-panel p-5 md:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Mapa rápido de seleccionados</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="border border-line bg-panelSoft p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-muted">{item.label}</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <span className="text-2xl font-semibold text-ink">{item.row?.asset.ticker ?? "n/d"}</span>
              <span className="text-sm font-semibold text-muted">{item.value}</span>
            </div>
            <div className="mt-3 h-1.5 bg-white">
              <div className={`h-1.5 ${item.tone}`} style={{ width: `${item.width}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
