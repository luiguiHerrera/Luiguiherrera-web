import type { AssetStatRecord, StatisticalFrequency, StatisticalWindow } from "@/lib/statistical-levels/types";

type UnderwaterDrawdownChartProps = {
  asset: AssetStatRecord | null;
  frequency: StatisticalFrequency;
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

export function UnderwaterDrawdownChart({ asset, frequency, window }: UnderwaterDrawdownChartProps) {
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

  return (
    <section className="border border-line bg-panel p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Activo foco</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Historial de drawdown</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Distancia frente a máximos previos dentro de la ventana seleccionada.
          </p>
        </div>
        <div className="text-sm text-muted md:text-right">
          <p>Actual: <span className="font-semibold text-ink">{formatPercent(metric?.currentDrawdown ?? null)}</span></p>
          <p>Máximo ventana: <span className="font-semibold text-ink">{formatPercent(metric?.maxDrawdown ?? null)}</span></p>
        </div>
      </div>
      <div className="mt-5">
        <svg viewBox="0 0 100 100" className="h-56 w-full" preserveAspectRatio="none" role="img" aria-label="Historial de drawdown">
          <rect x="0" y="0" width="100" height="100" fill="#fbfaf8" />
          <line x1="0" x2="100" y1="8" y2="8" stroke="#b8b2aa" strokeWidth="0.45" vectorEffect="non-scaling-stroke" />
          {area ? <path d={area} fill="#eadfdd" /> : null}
          {path ? <path d={path} fill="none" stroke="#a86464" strokeWidth="1.4" vectorEffect="non-scaling-stroke" /> : null}
        </svg>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">
        El drawdown muestra profundidad histórica de caídas desde máximos previos; no implica recuperación ni continuidad.
      </p>
    </section>
  );
}
