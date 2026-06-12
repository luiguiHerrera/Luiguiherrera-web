import { RiskPill } from "@/components/ui/RiskPill";
import { PercentileRangeBar } from "@/components/statistical-levels/PercentileRangeBar";
import { StatBandsChart } from "@/components/statistical-levels/StatBandsChart";
import type { AssetStatRecord, StatisticalFrequency, StatisticalWindow } from "@/lib/statistical-levels/types";

type AssetStatCardProps = {
  asset: AssetStatRecord;
  frequency: StatisticalFrequency;
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

function drawdownWidth(value: number | null) {
  if (value === null) return 0;
  return Math.min(Math.abs(value) / 0.35, 1) * 100;
}

const frequencyLabels: Record<StatisticalFrequency, string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
};

export function AssetStatCard({ asset, frequency, window }: AssetStatCardProps) {
  const frequencyData = asset.frequencies[frequency];
  const metric = frequencyData.windows[window];
  const longMa = frequencyData.longMovingAverageKey;

  return (
    <article className="border border-line bg-panel p-4 md:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold text-ink">{asset.ticker}</h3>
            <RiskPill label={asset.status === "ok" ? "ok" : asset.status === "limited_history" ? "Historial limitado" : "No disponible"} tone={statusTone(asset.status)} />
          </div>
          <p className="mt-1 text-sm leading-6 text-muted">{asset.name}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-brass">{asset.category} · {frequencyLabels[frequency]}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Último cierre ajustado</p>
          <p className="mt-1 text-xl font-semibold text-ink">{formatNumber(frequencyData.lastClose)}</p>
          <p className="mt-1 text-xs text-muted">{frequencyData.lastDate ?? "Sin fecha disponible"}</p>
        </div>
      </div>

      <div className="mt-5">
        <StatBandsChart series={frequencyData.compactSeries} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="border border-line bg-panelSoft p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted">Clasificación estadística</p>
            <span className="bg-white px-2 py-1 text-xs font-semibold text-ink">{metric.available ? metric.extensionLabel : "Historial insuficiente"}</span>
          </div>
          <div className="mt-4">
            <PercentileRangeBar label="Percentil extensión" value={metric.ma200ExtensionPercentile} />
          </div>
        </div>
        <div className="border border-line bg-panelSoft p-4">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold uppercase tracking-[0.12em] text-muted">Drawdown actual</span>
            <span className="font-semibold text-ink">{formatPercent(metric.currentDrawdown)}</span>
          </div>
          <div className="mt-3 h-2 bg-white">
            <div className="h-2 bg-[#a86464]" style={{ width: `${drawdownWidth(metric.currentDrawdown)}%` }} />
          </div>
          <p className="mt-3 text-xs text-muted">Vol. anualizada {formatPercent(metric.annualizedVolatilityWindow)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[
          ["Z extensión", formatNumber(metric.ma200ExtensionZScore)],
          [`Distancia ${longMa}`, formatPercent(frequencyData.distanceToMovingAverages[longMa] ?? null)],
          ["Retorno 4 periodos", formatPercent(frequencyData.returns["4P"])],
          ["Retorno 12 periodos", formatPercent(frequencyData.returns["12P"])],
          ["Periodos ventana", metric.available ? String(metric.sessions) : "Insuficiente"],
        ].map(([label, value]) => (
          <div key={label} className="border border-line bg-panelSoft p-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</p>
            <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-muted">{frequencyData.statusNote}</p>
    </article>
  );
}
