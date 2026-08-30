import { dashboardModuleEyebrowClassName, dashboardModuleTitleClassName } from "@/components/dashboard/DashboardPrimitives";
import { dataStatusLabels } from "@/lib/dashboard/status";
import { translateDashboardText } from "@/lib/dashboard/translate-dashboard-copy";
import type { QuantRiskData } from "@/lib/dashboard/types";

type QuantRiskPanelProps = {
  data: QuantRiskData;
  locale?: "es" | "en";
};

function formatPercent(value: number | null, locale: "es" | "en" = "es") {
  if (value === null) return locale === "en" ? "Not enough data" : "Pendiente de datos suficientes";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatCorrelation(value: number | null, locale: "es" | "en" = "es") {
  if (value === null) return locale === "en" ? "Not enough data" : "Pendiente de datos suficientes";
  return value.toFixed(2);
}

function modelStatusLabel(status: QuantRiskData["modelStatus"], locale: "es" | "en" = "es") {
  if (status === "estimated") return locale === "en" ? "Estimated" : "Estimado";
  if (status === "fallback_ewma") return "Fallback EWMA";
  return locale === "en" ? "Waiting for enough history" : "En espera de historial suficiente";
}

export function QuantRiskPanel({ data, locale = "es" }: QuantRiskPanelProps) {
  const t = (value: string | null | undefined) => locale === "en" ? translateDashboardText(value) : value ?? "";
  const reliabilityNote = locale === "en" && data.dataStatus === "demo"
    ? "Quantitative models require sufficient history. Demo data is visible while the automated source is unavailable. It does not predict market direction."
    : t(data.reliabilityNote);
  const metrics = [
    [locale === "en" ? "Fragility" : "Fragilidad", `${data.fragilityScore}/100 · ${t(data.fragilityLabel)}`],
    [locale === "en" ? "EWMA volatility" : "Volatilidad EWMA", formatPercent(data.ewmaVolAnnualized, locale)],
    [locale === "en" ? "GARCH volatility" : "Volatilidad GARCH", formatPercent(data.garchVolForecast, locale)],
    [locale === "en" ? "Average correlation" : "Correlación promedio", formatCorrelation(data.averageCorrelation21d, locale)],
    [locale === "en" ? "Sector dispersion" : "Dispersión sectorial", formatPercent(data.sectorDispersion1w, locale)],
    [locale === "en" ? "Model" : "Modelo", modelStatusLabel(data.modelStatus, locale)],
  ];

  return (
    <section className="border border-line bg-panel p-4 md:p-5">
      <div className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
        <div>
          <p className={dashboardModuleEyebrowClassName}>{locale === "en" ? "Quantitative risk radar" : "Radar cuantitativo de riesgo"}</p>
          <h2 className={`mt-3 ${dashboardModuleTitleClassName}`}>{locale === "en" ? "Statistical conditions" : "Condiciones estadísticas"}</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            {locale === "en"
              ? "These models estimate statistical risk conditions under historical assumptions; they help locate context."
              : "Estos modelos estiman condiciones estadísticas de riesgo bajo supuestos históricos; no anticipan por sí solos el comportamiento del mercado."}
          </p>
          <p className="mt-4 text-sm leading-6 text-muted">{t(data.fragilityInterpretation)}</p>
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
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{locale === "en" ? "Source" : "Fuente"}</span>
          <span className="mt-1 block text-ink">{t(data.sourceName)}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{locale === "en" ? "Status" : "Estado"}</span>
          <span className="mt-1 block text-ink">{t(dataStatusLabels[data.dataStatus])}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{locale === "en" ? "Updated" : "Actualización"}</span>
          <span className="mt-1 block text-ink">{t(data.lastUpdated)}</span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted">{reliabilityNote}</p>
    </section>
  );
}
