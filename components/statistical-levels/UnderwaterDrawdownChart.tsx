import { DrawdownInspection } from "./DrawdownInspection";
import { windowName } from "@/lib/statistical-levels/interpretation";
import type { AssetStatRecord, StatisticalFrequency } from "@/lib/statistical-levels/types";
import { getAnalysisMetric, type AnalysisWindow } from "@/lib/statistical-levels/analysis-window";

type UnderwaterDrawdownChartProps = {
  asset: AssetStatRecord | null;
  frequency: StatisticalFrequency;
  locale?: "es" | "en";
  window: AnalysisWindow;
  showSummary?: boolean;
};

function formatPercent(value: number | null) {
  if (value === null) return "n/d";
  return `${(value * 100).toFixed(1)}%`;
}

function buildPath(values: number[]) {
  if (!values.length) return "";
  const min = Math.min(-0.01, ...values);
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100;
      const y = (Math.abs(value) / Math.abs(min)) * 90;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function calculateDrawdowns(series: Array<{ close: number }>) {
  let peak = -Infinity;
  return series.map((point) => {
    peak = Math.max(peak, point.close);
    return peak > 0 ? point.close / peak - 1 : 0;
  });
}

export function getDrawdownWindow(data: AssetStatRecord["frequencies"][StatisticalFrequency] | undefined, window: AnalysisWindow, frequency: StatisticalFrequency = "daily", asOf?: string | null) {
  const metric = data ? getAnalysisMetric(data, frequency, window, asOf) : undefined;
  const cutoff = [data?.lastDate, asOf?.slice(0, 10)].filter((date): date is string => Boolean(date)).sort()[0];
  const history = (data?.drawdownHistory ?? []).filter(point => !cutoff || point.date <= cutoff);
  const series = metric?.available && metric.sessions > 0 && history.length >= metric.sessions ? history.slice(-metric.sessions) : [];
  const drawdowns = calculateDrawdowns(series);
  const maximum = drawdowns.length ? Math.min(...drawdowns) : null;
  return {
    series,
    drawdowns,
    average: drawdowns.length ? drawdowns.reduce((sum, value) => sum + value, 0) / drawdowns.length : null,
    // Use the first observation at the unrounded trough; a flat series has no decline date.
    maximumDate: maximum !== null && maximum < 0 ? series[drawdowns.indexOf(maximum)].date : null,
  };
}

function periodLabel(frequency: StatisticalFrequency, locale: "es" | "en") {
  if (locale === "en") {
    if (frequency === "daily") return "daily periods";
    if (frequency === "weekly") return "weekly periods";
    return "monthly periods";
  }
  if (frequency === "daily") return "periodos diarios";
  if (frequency === "weekly") return "periodos por semana";
  return "periodos mensuales";
}

export function UnderwaterDrawdownChart({ asset, frequency, locale = "es", window, showSummary = true }: UnderwaterDrawdownChartProps) {
  const data = asset?.frequencies[frequency];
  const asOf = asset?.currentMark?.date ?? asset?.lastDate;
  const metric = data ? getAnalysisMetric(data, frequency, window, asOf) : undefined;
  const { series, drawdowns } = getDrawdownWindow(data, window, frequency, asOf);
  const path = buildPath(drawdowns);
  const area = path ? `${path} L 100 0 L 0 0 Z` : "";
  const minDrawdown = Math.min(-0.01, ...drawdowns);
  const periodCount = series.length;

  const copy = locale === "en"
    ? {
        eyebrow: "Focus asset",
        title: "Drawdown history",
        body: "Distance from prior highs within the selected window.",
        analyzedWindow: "Analyzed window",
        calculatedOver: "Calculated over",
        current: "Current",
        windowMaximum: "Window maximum",
        aria: "Drawdown history",
        pendingDate: "Pending date",
        footer: "Drawdown shows historical depth from prior highs; it does not imply recovery or continuation.",
      }
    : {
        eyebrow: "Activo foco",
        title: "Historial de drawdown",
        body: "Distancia frente a máximos previos dentro de la ventana seleccionada.",
        analyzedWindow: "Ventana analizada",
        calculatedOver: "Calculado sobre",
        current: "Actual",
        windowMaximum: "Máximo ventana",
        aria: "Historial de drawdown",
        pendingDate: "Fecha pendiente",
        footer: "El drawdown muestra profundidad histórica de caídas desde máximos previos; no implica recuperación ni continuidad.",
      };

  return (
    <section className="min-w-0 border border-line bg-panel p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">{copy.eyebrow}</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">{copy.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            {copy.body}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            {copy.analyzedWindow}: {windowName(window, locale)}. {copy.calculatedOver} {periodCount} {periodLabel(frequency, locale)}. {series[0]?.date ?? "n/d"} – {series.at(-1)?.date ?? "n/d"}.
          </p>
        </div>
        {showSummary ? <div className="text-sm text-muted md:text-right">
          <p>{copy.current}: <span className="font-semibold text-ink">{formatPercent(metric?.currentDrawdown ?? null)}</span></p>
          <p>{copy.windowMaximum}: <span className="font-semibold text-ink">{formatPercent(metric?.maxDrawdown ?? null)}</span></p>
        </div> : null}
      </div>
      {series.length === 0 ? <p className="mt-5 text-sm text-muted">{locale === "en" ? "Unavailable: insufficient history for the selected window. N 0." : "No disponible: historial insuficiente para la ventana seleccionada. N 0."}</p> : <div className="mt-5">
        <DrawdownInspection key={`${asset?.ticker}-${frequency}-${window}`} series={series} drawdowns={drawdowns} path={path} area={area} minDrawdown={minDrawdown} locale={locale} />
      </div>}
      <p className="mt-3 text-xs leading-5 text-muted">
        {copy.footer}
      </p>
    </section>
  );
}
