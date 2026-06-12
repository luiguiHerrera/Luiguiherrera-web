import { RiskPill } from "@/components/ui/RiskPill";
import { StatBandsChart } from "@/components/statistical-levels/StatBandsChart";
import type { AssetStatRecord, StatisticalWindow } from "@/lib/statistical-levels/types";

type AssetStatCardProps = {
  asset: AssetStatRecord;
  window: StatisticalWindow;
};

function formatPercent(value: number | null) {
  if (value === null) return "n/d";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number | null, digits = 2) {
  if (value === null) return "n/d";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function statusTone(status: AssetStatRecord["status"]) {
  if (status === "ok") return "low";
  if (status === "limited_history") return "medium";
  return "high";
}

export function AssetStatCard({ asset, window }: AssetStatCardProps) {
  const metric = asset.windows[window];

  return (
    <article className="border border-line bg-panel p-5 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-2xl font-semibold text-ink">{asset.ticker}</h3>
            <RiskPill label={asset.status === "ok" ? "ok" : asset.status === "limited_history" ? "Historial limitado" : "No disponible"} tone={statusTone(asset.status)} />
          </div>
          <p className="mt-1 text-sm leading-6 text-muted">{asset.name}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-brass">{asset.category}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Último cierre</p>
          <p className="mt-1 text-xl font-semibold text-ink">{formatNumber(asset.lastClose)}</p>
          <p className="mt-1 text-xs text-muted">{asset.lastDate ?? "Sin fecha disponible"}</p>
        </div>
      </div>

      <div className="mt-5">
        <StatBandsChart series={asset.compactSeries} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[
          ["Clasificación", metric.available ? metric.extensionLabel : "Historial insuficiente"],
          ["Z extensión", formatNumber(metric.ma200ExtensionZScore)],
          ["Percentil extensión", metric.ma200ExtensionPercentile === null ? "n/d" : `${metric.ma200ExtensionPercentile.toFixed(1)}%`],
          ["Drawdown actual", formatPercent(metric.currentDrawdown)],
          ["Vol. anualizada", formatPercent(metric.annualizedVolatilityWindow)],
          ["Distancia MA200", formatPercent(asset.distanceToMovingAverages.ma200)],
          ["Retorno 1M", formatPercent(asset.returns["1M"])],
          ["Retorno 3M", formatPercent(asset.returns["3M"])],
          ["Sesiones ventana", metric.available ? String(metric.sessions) : "Insuficiente"],
        ].map(([label, value]) => (
          <div key={label} className="border border-line bg-panelSoft p-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</p>
            <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-muted">{asset.statusNote}</p>
    </article>
  );
}
