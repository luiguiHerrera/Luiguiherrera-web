import { dataStatusLabels } from "@/lib/dashboard/status";
import type { QuantRiskData } from "@/lib/dashboard/types";

type QuantRiskPanelProps = {
  data: QuantRiskData;
};

function formatPercent(value: number | null) {
  if (value === null) return "Pendiente de datos suficientes";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatCorrelation(value: number | null) {
  if (value === null) return "Pendiente de datos suficientes";
  return value.toFixed(2);
}

function modelStatusLabel(status: QuantRiskData["modelStatus"]) {
  if (status === "estimated") return "Estimado";
  if (status === "fallback_ewma") return "Fallback EWMA";
  return "En espera de historial suficiente";
}

export function QuantRiskPanel({ data }: QuantRiskPanelProps) {
  const metrics = [
    ["Fragilidad", `${data.fragilityScore}/100 · ${data.fragilityLabel}`],
    ["Volatilidad EWMA", formatPercent(data.ewmaVolAnnualized)],
    ["Volatilidad GARCH", formatPercent(data.garchVolForecast)],
    ["Correlación promedio", formatCorrelation(data.averageCorrelation21d)],
    ["Dispersión sectorial", formatPercent(data.sectorDispersion1w)],
    ["Modelo", modelStatusLabel(data.modelStatus)],
  ];

  return (
    <section className="border border-line bg-panel p-5 md:p-6">
      <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">Radar cuantitativo de riesgo</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Condiciones estadísticas</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Estos modelos no predicen el mercado. Estiman condiciones estadísticas de riesgo bajo supuestos históricos.
          </p>
          <p className="mt-4 text-sm leading-6 text-muted">{data.fragilityInterpretation}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map(([label, value]) => (
            <div key={label} className="border border-line bg-panelSoft p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
              <p className="mt-2 font-semibold text-ink">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 border-t border-line pt-4 text-sm leading-6 text-muted md:grid-cols-3">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Fuente</span>
          <span className="mt-1 block text-ink">{data.sourceName}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Estado</span>
          <span className="mt-1 block text-ink">{dataStatusLabels[data.dataStatus]}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Actualización</span>
          <span className="mt-1 block text-ink">{data.lastUpdated}</span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted">{data.reliabilityNote}</p>
    </section>
  );
}
