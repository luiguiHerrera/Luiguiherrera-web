import { dataStatusLabels } from "@/lib/dashboard/status";
import type { VixDashboardData, VixHistoryPoint, VixSpotData } from "@/lib/dashboard/types";

type VixModuleProps = {
  data: VixDashboardData;
};

function formatNumber(value: number | null, decimals = 1) {
  return value === null ? "Dato no disponible temporalmente" : value.toFixed(decimals);
}

function formatChange(value: number | null) {
  if (value === null) return "Historial insuficiente";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} pts`;
}

function trendLabel(trend: VixSpotData["vixTrend"]) {
  if (trend === "rising_fast") return "Subiendo rápido";
  if (trend === "rising") return "Subiendo";
  if (trend === "falling") return "Bajando";
  return "Estable";
}

function severityClass(severity: VixSpotData["vixSeverity"]) {
  if (severity === "extreme" || severity === "stress" || severity === "elevated") return "border-[#a86464]/40 bg-[#a86464]/10 text-[#7b3f3f]";
  if (severity === "watch") return "border-[#b6905b]/40 bg-[#b6905b]/10 text-[#76562d]";
  return "border-[#6f8f7b]/40 bg-[#6f8f7b]/10 text-[#47604f]";
}

function buildVixPath(history: VixHistoryPoint[]) {
  if (history.length < 2) return "";
  const values = history.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.01);

  return history
    .map((point, index) => {
      const x = (index / (history.length - 1)) * 100;
      const y = 50 - ((point.value - min) / range) * 38;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function VixLineChart({ history }: { history: VixHistoryPoint[] }) {
  const path = buildVixPath(history);
  const values = history.map((point) => point.value);
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;

  return (
    <div className="min-w-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">Evolución reciente</p>
          <h3 className="mt-1 text-sm font-semibold text-ink">Últimas {history.length} sesiones</h3>
        </div>
        <div className="text-right text-xs leading-5 text-muted">
          <span className="block">Máx. {formatNumber(max)}</span>
          <span className="block">Mín. {formatNumber(min)}</span>
        </div>
      </div>

      <svg viewBox="0 0 100 58" className="mt-5 h-52 w-full md:h-64" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" x2="100" y1="12" y2="12" stroke="#eee9e3" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
        <line x1="0" x2="100" y1="50" y2="50" stroke="#e7e2dc" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        {path ? <path d={path} fill="none" stroke="#6f8f7b" strokeWidth="2.2" vectorEffect="non-scaling-stroke" /> : null}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>-{history.length} sesiones</span>
        <span>Último cierre</span>
      </div>
    </div>
  );
}

export function VixModule({ data }: VixModuleProps) {
  const spot = data.spot;
  const metrics = [
    ["Cambio 1D", formatChange(spot.change1d)],
    ["Cambio 5D", formatChange(spot.change5d)],
    ["Cambio 21D", formatChange(spot.change21d)],
    ["Percentil histórico", spot.vixPercentile === null ? spot.vixPercentileLabel : `${spot.vixPercentileLabel} · p${Math.round(spot.vixPercentile)}`],
    ["Tendencia", trendLabel(spot.vixTrend)],
    ["Estado de datos", dataStatusLabels[spot.dataStatus]],
  ];

  return (
    <section className="border border-line bg-panel p-5 md:p-6">
      <div className="grid gap-8 xl:grid-cols-[0.42fr_0.58fr] xl:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">VIX</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Presión de volatilidad</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
            El VIX resume volatilidad implícita del S&amp;P 500. Es una lectura de presión de riesgo, no de dirección del mercado.
          </p>

          <div className="mt-8">
            <div className="flex flex-wrap items-end gap-3">
              <span className="text-6xl font-semibold leading-none text-ink md:text-7xl">{formatNumber(spot.latestVix)}</span>
              <span className={`mb-2 border px-3 py-1 text-sm font-semibold ${severityClass(spot.vixSeverity)}`}>
                {spot.vixCompositeLabel}
              </span>
            </div>
            <p className="mt-4 text-base font-semibold text-ink">{spot.vixCompositeSubtext}</p>
            <p className="mt-3 text-sm leading-6 text-muted">
              {spot.vixDescription} La lectura combina nivel absoluto, percentil histórico y momentum reciente.
            </p>
          </div>

          <div className="mt-7 grid gap-x-5 gap-y-4 border-y border-line py-4 sm:grid-cols-2">
            {metrics.map(([label, value]) => (
              <div key={label}>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
                <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <VixLineChart history={spot.history} />
      </div>

      <div className="mt-6 grid gap-4 border-t border-line pt-5 text-sm leading-6 text-muted lg:grid-cols-2">
          <p>
            <span className="font-semibold text-ink">Interpretación prudente: </span>
            {spot.interpretation.how}
          </p>
          <p>
            <span className="font-semibold text-ink">Qué NO significa: </span>
            {spot.interpretation.whatItDoesNotMean}
          </p>
      </div>

      <div className="mt-5 grid gap-3 border-t border-line pt-4 text-sm leading-6 text-muted md:grid-cols-3">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Fuente</span>
          {spot.sourceUrl ? (
            <a href={spot.sourceUrl} className="mt-1 inline-block text-ink underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
              {spot.sourceName}
            </a>
          ) : (
            <span className="mt-1 block text-ink">{spot.sourceName}</span>
          )}
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Actualización</span>
          <span className="mt-1 block text-ink">{spot.lastUpdated}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Frecuencia</span>
          <span className="mt-1 block text-ink">{spot.updateFrequency}</span>
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">{spot.reliabilityNote}</p>
    </section>
  );
}
