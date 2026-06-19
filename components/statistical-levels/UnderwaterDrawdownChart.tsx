import type { AssetStatRecord, StatisticalFrequency, StatisticalWindow } from "@/lib/statistical-levels/types";

type UnderwaterDrawdownChartProps = {
  asset: AssetStatRecord | null;
  frequency: StatisticalFrequency;
  locale?: "es" | "en";
  window: StatisticalWindow;
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
      const y = 8 + (Math.abs(value) / Math.abs(min)) * 82;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function periodLabel(frequency: StatisticalFrequency, locale: "es" | "en") {
  if (locale === "en") {
    if (frequency === "daily") return "daily periods";
    if (frequency === "weekly") return "weekly periods";
    return "monthly periods";
  }
  if (frequency === "daily") return "periodos diarios";
  if (frequency === "weekly") return "periodos semanales";
  return "periodos mensuales";
}

export function UnderwaterDrawdownChart({ asset, frequency, locale = "es", window }: UnderwaterDrawdownChartProps) {
  const data = asset?.frequencies[frequency];
  const metric = data?.windows[window];
  const series = data?.compactSeries ?? [];
  let peak = -Infinity;
  const drawdowns = series.map((point) => {
    peak = Math.max(peak, point.close);
    return peak > 0 ? point.close / peak - 1 : 0;
  });
  const path = buildPath(drawdowns);
  const area = path ? `${path} L 100 8 L 0 8 Z` : "";
  const minDrawdown = Math.min(-0.01, ...drawdowns);
  const periodCount = metric?.sessions ?? series.length;

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
            {copy.analyzedWindow}: {window}. {copy.calculatedOver} {periodCount} {periodLabel(frequency, locale)}.
          </p>
        </div>
        <div className="text-sm text-muted md:text-right">
          <p>{copy.current}: <span className="font-semibold text-ink">{formatPercent(metric?.currentDrawdown ?? null)}</span></p>
          <p>{copy.windowMaximum}: <span className="font-semibold text-ink">{formatPercent(metric?.maxDrawdown ?? null)}</span></p>
        </div>
      </div>
      <div className="mt-5">
        <svg viewBox="0 0 100 100" className="h-56 w-full" preserveAspectRatio="none" role="img" aria-label={copy.aria}>
          <rect x="0" y="0" width="100" height="100" fill="#fbfaf8" />
          <line x1="0" x2="100" y1="8" y2="8" stroke="#b8b2aa" strokeWidth="0.45" vectorEffect="non-scaling-stroke" />
          {area ? <path d={area} fill="#eadfdd" /> : null}
          {path ? <path d={path} fill="none" stroke="#a86464" strokeWidth="1.4" vectorEffect="non-scaling-stroke" /> : null}
          {drawdowns.map((value, index) => {
            const x = drawdowns.length === 1 ? 0 : (index / (drawdowns.length - 1)) * 100;
            const y = 8 + (Math.abs(value) / Math.abs(minDrawdown)) * 82;
            return (
              <circle key={`${series[index]?.date ?? index}-${index}`} cx={x} cy={y} r="2.6" fill="transparent" stroke="transparent" vectorEffect="non-scaling-stroke">
                <title>{`${series[index]?.date ?? copy.pendingDate} · DD ${formatPercent(value)}`}</title>
              </circle>
            );
          })}
        </svg>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">
        {copy.footer}
      </p>
    </section>
  );
}
