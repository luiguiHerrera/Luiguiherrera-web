import type { AssetStatRecord, ChangeMoveMetric, StatisticalFrequency } from "@/lib/statistical-levels/types";
import { MetricHelpTooltip } from "@/components/ui/MetricHelpTooltip";
import { displayStatTicker } from "@/lib/statistical-levels/display";
import { frequencyName } from "@/lib/statistical-levels/interpretation";

type MovementSummaryTableProps = {
  asset: AssetStatRecord | null;
  frequency: StatisticalFrequency;
  locale?: "es" | "en";
};

const labels: Record<ChangeMoveMetric, string> = {
  change: "Cambio del periodo",
  openGap: "Brecha de apertura",
  highExtensionFromOpen: "Máximo desde apertura",
  lowExtensionFromOpen: "Mínimo desde apertura",
  highExtensionFromPrevClose: "Máximo desde cierre previo",
  lowExtensionFromPrevClose: "Mínimo desde cierre previo",
  closeLocation: "Posición del cierre",
  upperFade: "Retroceso desde el máximo",
  lowerRecovery: "Recuperación desde el mínimo",
  range: "Amplitud del periodo",
};

const help: Partial<Record<ChangeMoveMetric, string>> = {
  change: "Variación porcentual entre el cierre de cada periodo y el cierre anterior.",
  openGap: "Salto porcentual entre el cierre anterior y la siguiente apertura.",
  range: "Distancia porcentual del mínimo al máximo de cada periodo.",
  closeLocation: "Ubicación del cierre: 0 es el mínimo del periodo y 1 es el máximo.",
};

const englishLabels: Record<ChangeMoveMetric, string> = {
  change: "Change",
  openGap: "Open gap",
  highExtensionFromOpen: "High from open",
  lowExtensionFromOpen: "Low from open",
  highExtensionFromPrevClose: "High from prior close",
  lowExtensionFromPrevClose: "Low from prior close",
  closeLocation: "Close location",
  upperFade: "Upper fade",
  lowerRecovery: "Lower recovery",
  range: "Range",
};

const englishHelp: Partial<Record<ChangeMoveMetric, string>> = {
  change: "Percentage change from the previous close to each period’s close.",
  openGap: "Percentage jump from the previous close to the next open.",
  range: "Percentage distance from each period’s low to its high.",
  closeLocation: "Close position: 0 is the period low and 1 is the high.",
};

const visibleMetrics: ChangeMoveMetric[] = ["change", "openGap", "highExtensionFromOpen", "lowExtensionFromOpen", "highExtensionFromPrevClose", "lowExtensionFromPrevClose", "closeLocation", "upperFade", "lowerRecovery", "range"];
const miniMetrics: ChangeMoveMetric[] = ["change", "openGap", "range", "closeLocation"];

function formatStat(value: number | null, isRatio = true) {
  if (value === null) return "n/d";
  if (!isRatio) return value.toFixed(2);
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

export function MovementSummaryTable({ asset, frequency, locale = "es" }: MovementSummaryTableProps) {
  const data = asset?.frequencies[frequency].changeMoves;
  const metricLabels = locale === "en" ? englishLabels : labels;
  const metricHelp = locale === "en" ? englishHelp : help;
  const sampleLabel = `${frequencyName(frequency, locale)} · ${locale === "en" ? "full completed history" : "todo el historial completado"}`;
  const description = (metric: ChangeMoveMetric, chart = false) => `${metricHelp[metric]} ${sampleLabel}.${chart ? locale === "en" ? " Green band: middle 50% (P25–P75). Dark line: median (P50). Ends: minimum and maximum." : " Franja verde: 50 % central (P25–P75). Línea oscura: mediana (P50). Extremos: mínimo y máximo." : ""}`;
  return (
    <section className="border border-line bg-panel p-4 md:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">{locale === "en" ? "Movement summary" : "Resumen de movimientos"}</p>
      <h2 className="mt-2 text-xl font-semibold text-ink">{asset ? displayStatTicker(asset.ticker) : locale === "en" ? "No asset selected" : "Sin activo seleccionado"}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
        {locale === "en"
          ? "Historical distribution of period moves. This is a statistical read of past behavior for context."
          : "Distribución histórica de cambios por periodo. Es una lectura estadística de comportamiento pasado; no implica dirección futura."}
      </p>
      <p className="mt-1 text-xs text-muted">{sampleLabel}</p>
      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        {miniMetrics.map((metric) => {
          const row = data?.[metric];
          const min = row?.min ?? null;
          const max = row?.max ?? null;
          const span = min !== null && max !== null && max !== min ? max - min : 1;
          const left = row?.p25 === null || min === null ? 0 : ((row?.p25 ?? 0) - min) / span * 100;
          const width = row?.p75 === null || min === null ? 0 : (((row?.p75 ?? 0) - (row?.p25 ?? 0)) / span) * 100;
          const median = row?.p50 === null || min === null ? null : (((row?.p50 ?? 0) - min) / span) * 100;
          return (
            <div key={metric} className="border border-line bg-panelSoft p-4">
              <p className="text-sm font-semibold text-ink">
                {metricLabels[metric]}
                {metricHelp[metric] ? <MetricHelpTooltip label={metricLabels[metric]} text={description(metric, true)} locale={locale} /> : null}
              </p>
              <div className="relative mt-4 h-2 bg-white">
                <div className="absolute top-1/2 h-px w-full -translate-y-1/2 bg-[#d8d2ca]" />
                <div className="absolute top-0 h-2 bg-[#ccd7d2]" style={{ left: `${left}%`, width: `${width}%` }} />
                {median !== null ? <div className="absolute top-1/2 h-4 w-px -translate-y-1/2 bg-ink" style={{ left: `${median}%` }} /> : null}
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted">
                <span>{formatStat(row?.min ?? null, metric !== "closeLocation")}</span>
                <span>{formatStat(row?.max ?? null, metric !== "closeLocation")}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 overflow-x-auto" tabIndex={0} role="region" aria-label={locale === "en" ? "Statistical table" : "Tabla estadística"}>
        <table className="w-full min-w-[780px] border-collapse text-left text-[13px]">
          <thead className="text-muted">
            <tr className="border-b border-line">
              <th className="py-2.5 pr-4 font-medium">{locale === "en" ? "Metric" : "Métrica"}</th>
              <th className="py-2.5 pr-4 font-medium">{locale === "en" ? "Mean" : "Media"}</th>
              <th className="py-2.5 pr-4 font-medium">{locale === "en" ? "Std. dev." : "Desv. típica"}</th>
              <th className="py-2.5 pr-4 font-medium">{locale === "en" ? "Minimum" : "Mínimo"}</th>
              <th className="py-2.5 pr-4 font-medium">p10</th>
              <th className="py-2.5 pr-4 font-medium">p25</th>
              <th className="py-2.5 pr-4 font-medium">p50</th>
              <th className="py-2.5 pr-4 font-medium">p75</th>
              <th className="py-2.5 pr-4 font-medium">p90</th>
              <th className="py-2.5 pr-4 font-medium">{locale === "en" ? "Maximum" : "Máximo"}</th>
            </tr>
          </thead>
          <tbody>
            {visibleMetrics.map((metric) => {
              const row = data?.[metric];
              const isRatio = metric !== "closeLocation";
              return (
                <tr key={metric} className="border-b border-line/70">
                  <td className="py-3 pr-4 font-semibold text-ink">
                    {metricLabels[metric]}
                    {metricHelp[metric] ? <MetricHelpTooltip label={metricLabels[metric]} text={description(metric)} locale={locale} /> : null}
                  </td>
                  <td className="py-3 pr-4 text-muted">{formatStat(row?.mean ?? null, isRatio)}</td>
                  <td className="py-3 pr-4 text-muted">{formatStat(row?.std ?? null, isRatio)}</td>
                  <td className="py-3 pr-4 text-muted">{formatStat(row?.min ?? null, isRatio)}</td>
                  <td className="py-3 pr-4 text-muted">{formatStat(row?.p10 ?? null, isRatio)}</td>
                  <td className="py-3 pr-4 text-muted">{formatStat(row?.p25 ?? null, isRatio)}</td>
                  <td className="py-3 pr-4 text-muted">{formatStat(row?.p50 ?? null, isRatio)}</td>
                  <td className="py-3 pr-4 text-muted">{formatStat(row?.p75 ?? null, isRatio)}</td>
                  <td className="py-3 pr-4 text-muted">{formatStat(row?.p90 ?? null, isRatio)}</td>
                  <td className="py-3 pr-4 text-muted">{formatStat(row?.max ?? null, isRatio)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted">{locale === "en" ? "More detail in " : "Mayor detalle en "}<a href="#sl-periods-disclosure" className="underline decoration-brass/50 underline-offset-4 hover:text-brass">{locale === "en" ? "Period history" : "Historial de periodos"}</a>.</p>
    </section>
  );
}
