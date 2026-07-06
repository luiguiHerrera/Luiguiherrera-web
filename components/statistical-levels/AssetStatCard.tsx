import { RiskPill } from "@/components/ui/RiskPill";
import { MetricHelpTooltip } from "@/components/ui/MetricHelpTooltip";
import { PercentileRangeBar } from "@/components/statistical-levels/PercentileRangeBar";
import { StatBandsChart } from "@/components/statistical-levels/StatBandsChart";
import { displayStatName, displayStatTicker } from "@/lib/statistical-levels/display";
import type { AssetStatRecord, StatisticalFrequency, StatisticalWindow } from "@/lib/statistical-levels/types";

type AssetStatCardProps = {
  asset: AssetStatRecord;
  frequency: StatisticalFrequency;
  locale?: "es" | "en";
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
const englishFrequencyLabels: Record<StatisticalFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

function statusLabel(status: AssetStatRecord["status"], locale: "es" | "en") {
  if (locale === "en") return status === "ok" ? "Data OK" : status === "limited_history" ? "Limited history" : "Unavailable";
  return status === "ok" ? "ok" : status === "limited_history" ? "Historial limitado" : "No disponible";
}

function extensionLabel(value: string, locale: "es" | "en") {
  if (locale === "es") return value;
  const labels: Record<string, string> = {
    "Extensión negativa extrema": "Extreme negative extension",
    "Extensión negativa": "Negative extension",
    "Zona media": "Middle zone",
    "Extensión positiva": "Positive extension",
    "Extensión positiva extrema": "Extreme positive extension",
  };
  return labels[value] ?? value;
}

export function AssetStatCard({ asset, frequency, locale = "es", window }: AssetStatCardProps) {
  const frequencyData = asset.frequencies[frequency];
  const metric = frequencyData.windows[window];
  const longMa = frequencyData.longMovingAverageKey;
  const copy = locale === "en"
    ? {
        latestClose: "Latest adjusted close",
        noDate: "No date available",
        classification: "Statistical classification",
        extensionPercentile: "Extension percentile",
        extensionHelp: "Places the current extension against the asset's history. High percentiles indicate a relatively extended reading.",
        currentDrawdown: "Current drawdown",
        drawdownHelp: "Distance from the prior high inside the analyzed window.",
        annualizedVol: "Annualized vol.",
        zExtension: "Extension Z-score",
        distance: "Distance",
        return4: "4-period return",
        return12: "12-period return",
        windowPeriods: "Window periods",
        insufficient: "Insufficient",
        defaultHelp: "Statistical metric for the selected window.",
      }
    : {
        latestClose: "Último cierre ajustado",
        noDate: "Sin fecha disponible",
        classification: "Clasificación estadística",
        extensionPercentile: "Percentil extensión",
        extensionHelp: "Ubica la extensión actual frente al historial del activo. Percentiles altos indican lectura relativamente extendida.",
        currentDrawdown: "Drawdown actual",
        drawdownHelp: "Distancia desde el máximo previo dentro de la ventana analizada.",
        annualizedVol: "Vol. anualizada",
        zExtension: "Z extensión",
        distance: "Distancia",
        return4: "Retorno 4 periodos",
        return12: "Retorno 12 periodos",
        windowPeriods: "Periodos ventana",
        insufficient: "Insuficiente",
        defaultHelp: "Métrica estadística de la ventana seleccionada.",
      };
  const metricHelp: Record<string, string> = {
    [copy.zExtension]: locale === "en" ? "Measures how many standard deviations the reading is from its historical average." : "Mide cuántas desviaciones estándar está la lectura frente a su media histórica.",
    [`${copy.distance} ${longMa}`]: locale === "en" ? "Distance between current price and the selected long moving average." : "Distancia entre el precio actual y la media larga seleccionada.",
    [copy.return4]: locale === "en" ? "Cumulative change over the latest 4 periods of the selected frequency." : "Cambio acumulado de los últimos 4 periodos de la frecuencia seleccionada.",
    [copy.return12]: locale === "en" ? "Cumulative change over the latest 12 periods of the selected frequency." : "Cambio acumulado de los últimos 12 periodos de la frecuencia seleccionada.",
    [copy.windowPeriods]: locale === "en" ? "Number of periods used to calculate the selected window." : "Cantidad de periodos usados para calcular la ventana seleccionada.",
  };

  return (
    <article className="border border-line bg-panel p-4 md:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold text-ink">{displayStatTicker(asset.ticker)}</h3>
            <RiskPill label={statusLabel(asset.status, locale)} tone={statusTone(asset.status)} />
          </div>
          <p className="mt-1 text-sm leading-6 text-muted">{displayStatName(asset.ticker, asset.name)}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-brass">{asset.category} · {(locale === "en" ? englishFrequencyLabels : frequencyLabels)[frequency]}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">{copy.latestClose}</p>
          <p className="mt-1 text-xl font-semibold text-ink">{formatNumber(frequencyData.lastClose)}</p>
          <p className="mt-1 text-xs text-muted">{frequencyData.lastDate ?? copy.noDate}</p>
        </div>
      </div>

      <div className="mt-5">
        <StatBandsChart series={frequencyData.compactSeries} locale={locale} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="border border-line bg-panelSoft p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted">
              {copy.classification}
              <MetricHelpTooltip label={copy.extensionPercentile} text={copy.extensionHelp} />
            </p>
            <span className="bg-white px-2 py-1 text-xs font-semibold text-ink">{metric.available ? extensionLabel(metric.extensionLabel, locale) : locale === "en" ? "Not enough history" : "Historial insuficiente"}</span>
          </div>
          <div className="mt-4">
            <PercentileRangeBar label={copy.extensionPercentile} value={metric.ma200ExtensionPercentile} />
          </div>
        </div>
        <div className="border border-line bg-panelSoft p-4">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold uppercase tracking-[0.12em] text-muted">
              {copy.currentDrawdown}
              <MetricHelpTooltip label={copy.currentDrawdown} text={copy.drawdownHelp} />
            </span>
            <span className="font-semibold text-ink">{formatPercent(metric.currentDrawdown)}</span>
          </div>
          <div className="mt-3 h-2 bg-white">
            <div className="h-2 bg-[#a86464]" style={{ width: `${drawdownWidth(metric.currentDrawdown)}%` }} />
          </div>
          <p className="mt-3 text-xs text-muted">{copy.annualizedVol} {formatPercent(metric.annualizedVolatilityWindow)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[
          [copy.zExtension, formatNumber(metric.ma200ExtensionZScore)],
          [`${copy.distance} ${longMa}`, formatPercent(frequencyData.distanceToMovingAverages[longMa] ?? null)],
          [copy.return4, formatPercent(frequencyData.returns["4P"])],
          [copy.return12, formatPercent(frequencyData.returns["12P"])],
          [copy.windowPeriods, metric.available ? String(metric.sessions) : copy.insufficient],
        ].map(([label, value]) => (
          <div key={label} className="border border-line bg-panelSoft p-3">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
              {label}
              <MetricHelpTooltip label={label} text={metricHelp[label] ?? copy.defaultHelp} />
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 border-t border-line pt-4 text-xs leading-5 text-muted">
        {locale === "en"
          ? frequencyData.statusNote
              .replace("Historial suficiente para frecuencia", "Sufficient history for")
              .replace("Datos limitados para frecuencia", "Limited data for")
              .replace("Sin datos suficientes para frecuencia", "Not enough data for")
              .replace("diaria", "daily frequency")
              .replace("por semana", "weekly frequency")
              .replace("mensual", "monthly frequency")
          : frequencyData.statusNote}
      </p>
    </article>
  );
}
