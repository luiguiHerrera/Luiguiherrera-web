import { dataStatusLabels } from "@/lib/dashboard/status";
import type { LegacyVixTermStructureData, VixDashboardData, VixHistoryPoint, VixSpotData } from "@/lib/dashboard/types";

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

function buildSparklinePath(history: VixHistoryPoint[]) {
  if (history.length < 2) return "";
  const values = history.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 0.01);

  return history
    .map((point, index) => {
      const x = (index / (history.length - 1)) * 100;
      const y = 44 - ((point.value - min) / range) * 34;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function MiniVixChart({ history }: { history: VixHistoryPoint[] }) {
  const path = buildSparklinePath(history);
  const values = history.map((point) => point.value);
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;

  return (
    <div className="mt-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">Últimas sesiones</p>
          <h3 className="mt-1 text-sm font-semibold text-ink">Presión de volatilidad</h3>
        </div>
        <div className="text-right text-xs leading-5 text-muted">
          <span className="block">Máx. {formatNumber(max)}</span>
          <span className="block">Mín. {formatNumber(min)}</span>
        </div>
      </div>

      <svg viewBox="0 0 100 52" className="mt-3 h-24 w-full" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" x2="100" y1="10" y2="10" stroke="#e7e2dc" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
        <line x1="0" x2="100" y1="27" y2="27" stroke="#eee9e3" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
        <line x1="0" x2="100" y1="44" y2="44" stroke="#e7e2dc" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
        {path ? <path d={path} fill="none" stroke="#6f8f7b" strokeWidth="1.8" vectorEffect="non-scaling-stroke" /> : null}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>-{history.length} sesiones</span>
        <span>Último cierre</span>
      </div>
    </div>
  );
}

function TermStructurePanel({ data }: { data: LegacyVixTermStructureData }) {
  const metrics = [
    ["VIX spot", formatNumber(data.spot)],
    ["Futuro mes 1", formatNumber(data.futureMonth1)],
    ["Futuro mes 2", formatNumber(data.futureMonth2)],
    ["Spread M2-M1", data.spreadM2M1 === null ? "Pendiente de fuente estable" : formatChange(data.spreadM2M1)],
  ];

  return (
    <div className="border border-line bg-panelSoft p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">Estructura a plazo</p>
          <h3 className="mt-2 text-lg font-semibold text-ink">VIX futures cercanos</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            La estructura a plazo del VIX ayuda a observar si el mercado está pagando más por protección cercana o futura.
          </p>
        </div>
        <span className="w-fit border border-line bg-panel px-3 py-1 text-xs font-semibold text-muted">
          {dataStatusLabels[data.dataStatus]}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {metrics.map(([label, value]) => (
          <div key={label} className="border border-line bg-panel p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted">{label}</p>
            <p className="mt-2 font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-6 text-muted">{data.interpretation.how}</p>
      <p className="mt-3 border-t border-line pt-3 text-sm leading-6 text-muted">{data.reliabilityNote}</p>
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
    <section className="border border-line bg-panel p-4 md:p-5">
      <div className="grid gap-5 xl:grid-cols-[0.88fr_1.12fr] xl:items-start">
        <div className="border border-line bg-panelSoft p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">VIX / volatilidad</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">Estrés de mercado</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            El VIX resume expectativas de volatilidad implícita del S&amp;P 500 a partir de opciones. Es una lectura de presión de riesgo, no una lectura de dirección del mercado.
          </p>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">VIX último cierre disponible</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <span className="text-4xl font-semibold leading-none text-ink md:text-5xl">{formatNumber(spot.latestVix)}</span>
              <span className={`mb-1 border px-3 py-1 text-sm font-semibold ${severityClass(spot.vixSeverity)}`}>
                {spot.vixCompositeLabel}
              </span>
            </div>
            <p className="mt-3 font-semibold text-ink">{spot.vixCompositeSubtext}</p>
            <p className="mt-3 text-sm leading-6 text-muted">
              {spot.vixDescription} La lectura combina nivel absoluto, percentil histórico y momentum reciente. La fuente es diaria y de cierre.
            </p>
          </div>
          <MiniVixChart history={spot.history} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map(([label, value]) => (
            <div key={label} className="border border-line bg-panelSoft p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
              <p className="mt-2 font-semibold text-ink">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm leading-6 text-muted lg:grid-cols-2">
          <div className="border border-line bg-panelSoft p-3">
            <span className="block text-sm font-semibold text-ink">Interpretación prudente</span>
            <p className="mt-2">{spot.interpretation.how}</p>
          </div>
          <div className="border border-line bg-panelSoft p-3">
            <span className="block text-sm font-semibold text-ink">Qué NO significa</span>
            <p className="mt-2">{spot.interpretation.whatItDoesNotMean}</p>
          </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-line pt-4 text-sm leading-6 text-muted md:grid-cols-3">
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

      <div className="mt-5">
        <TermStructurePanel data={data.termStructure} />
      </div>
    </section>
  );
}
