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
  const active = rows[0];
  const longMa = active?.data.longMovingAverageKey;
  const maxZ = Math.max(...rows.map((row) => Math.abs(row.metric.ma200ExtensionZScore ?? 0)), 1);
  const maxVol = Math.max(...rows.map((row) => row.metric.annualizedVolatilityWindow ?? 0), 0.01);
  const maxDrawdown = Math.max(...rows.map((row) => Math.abs(row.metric.currentDrawdown ?? 0)), 0.01);
  const items = [
    { label: "Extensión actual", value: formatNumber(active?.metric.ma200ExtensionZScore ?? null), width: magnitude(active?.metric.ma200ExtensionZScore ?? null, maxZ), tone: "bg-[#6f8f7b]" },
    { label: "Volatilidad anualizada", value: formatPercent(active?.metric.annualizedVolatilityWindow ?? null), width: magnitude(active?.metric.annualizedVolatilityWindow ?? null, maxVol), tone: "bg-[#7d8f9a]" },
    { label: "Drawdown actual", value: formatPercent(active?.metric.currentDrawdown ?? null), width: magnitude(active?.metric.currentDrawdown ?? null, maxDrawdown), tone: "bg-[#9d8176]" },
    { label: "Distancia a media larga", value: formatPercent(longMa ? active?.data.distanceToMovingAverages[longMa] ?? null : null), width: magnitude(longMa ? active?.data.distanceToMovingAverages[longMa] ?? null : null, 0.25), tone: "bg-[#b6905b]" },
  ];

  return (
    <section className="border border-line bg-panel p-4 md:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Resumen rápido del activo seleccionado</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="border border-line bg-panelSoft p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-muted">{item.label}</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <span className="text-xl font-semibold text-ink">{active?.asset.ticker ?? "n/d"}</span>
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
