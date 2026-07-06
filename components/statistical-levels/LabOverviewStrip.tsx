import type { AssetStatRecord, StatisticalFrequency, StatisticalWindow } from "@/lib/statistical-levels/types";
import { MetricHelpTooltip } from "@/components/ui/MetricHelpTooltip";
import { displayStatTicker } from "@/lib/statistical-levels/display";

type LabOverviewStripProps = {
  assets: AssetStatRecord[];
  frequency: StatisticalFrequency;
  locale?: "es" | "en";
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

function formatPercentile(value: number | null) {
  if (value === null) return "n/d";
  return value.toFixed(1);
}

function magnitude(value: number | null, max: number) {
  if (value === null || max <= 0) return 0;
  return Math.min(Math.abs(value) / max, 1) * 100;
}

export function LabOverviewStrip({ assets, frequency, locale = "es", window }: LabOverviewStripProps) {
  const copy = locale === "en"
    ? {
        title: "Quick summary of the selected asset",
        extension: "Current extension",
        extensionHelp: "Z-score of distance from the asset's long moving average.",
        percentile: "Extension percentile",
        percentileHelp: "Places the current extension against the asset's history.",
        volatility: "Annualized volatility",
        volatilityHelp: "Annualized volatility inside the selected window.",
        drawdown: "Current drawdown",
        drawdownHelp: "Distance from the prior high inside the analyzed window.",
      }
    : {
        title: "Resumen rápido del activo seleccionado",
        extension: "Extensión actual",
        extensionHelp: "Z-score de distancia frente a la media larga del activo.",
        percentile: "Percentil de extensión",
        percentileHelp: "Ubica la extensión actual frente al historial del activo.",
        volatility: "Volatilidad anualizada",
        volatilityHelp: "Volatilidad anualizada dentro de la ventana seleccionada.",
        drawdown: "Drawdown actual",
        drawdownHelp: "Distancia desde el máximo previo dentro de la ventana analizada.",
      };
  const rows = assets.map((asset) => {
    const data = asset.frequencies[frequency];
    const metric = data.windows[window];
    return { asset, data, metric };
  });
  const active = rows[0];
  const maxZ = Math.max(...rows.map((row) => Math.abs(row.metric.ma200ExtensionZScore ?? 0)), 1);
  const maxPercentile = Math.max(...rows.map((row) => row.metric.ma200ExtensionPercentile ?? 0), 100);
  const maxVol = Math.max(...rows.map((row) => row.metric.annualizedVolatilityWindow ?? 0), 0.01);
  const maxDrawdown = Math.max(...rows.map((row) => Math.abs(row.metric.currentDrawdown ?? 0)), 0.01);
  const items = [
    { label: copy.extension, help: copy.extensionHelp, value: formatNumber(active?.metric.ma200ExtensionZScore ?? null), width: magnitude(active?.metric.ma200ExtensionZScore ?? null, maxZ), tone: "bg-[#6f8f7b]" },
    { label: copy.percentile, help: copy.percentileHelp, value: formatPercentile(active?.metric.ma200ExtensionPercentile ?? null), width: magnitude(active?.metric.ma200ExtensionPercentile ?? null, maxPercentile), tone: "bg-[#b6905b]" },
    { label: copy.volatility, help: copy.volatilityHelp, value: formatPercent(active?.metric.annualizedVolatilityWindow ?? null), width: magnitude(active?.metric.annualizedVolatilityWindow ?? null, maxVol), tone: "bg-[#7d8f9a]" },
    { label: copy.drawdown, help: copy.drawdownHelp, value: formatPercent(active?.metric.currentDrawdown ?? null), width: magnitude(active?.metric.currentDrawdown ?? null, maxDrawdown), tone: "bg-[#9d8176]" },
  ];

  return (
    <section className="border border-line bg-panel p-4 md:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">{copy.title}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="border border-line bg-panelSoft p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-muted">
              {item.label}
              <MetricHelpTooltip label={item.label} text={item.help} />
            </p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <span className="text-xl font-semibold text-ink">{active?.asset.ticker ? displayStatTicker(active.asset.ticker) : "n/d"}</span>
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
