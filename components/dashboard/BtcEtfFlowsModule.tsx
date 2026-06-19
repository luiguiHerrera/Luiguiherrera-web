"use client";

import { usePathname } from "next/navigation";
import { dataStatusLabels } from "@/lib/dashboard/status";
import { ExpandableInsightCard } from "@/components/ui/ExpandableInsightCard";
import { translateDashboardText } from "@/lib/dashboard/translate-dashboard-copy";
import type { BtcEtfFlowPoint, BtcEtfFlowsDashboardData, BtcEtfFlowsData, BtcEtfFundFlow } from "@/lib/dashboard/types";

type BtcEtfFlowsModuleProps = {
  data: BtcEtfFlowsDashboardData;
};

function formatUsdMillions(value: number | null, locale: "es" | "en" = "es") {
  if (value === null) return locale === "en" ? "Pending data" : "Dato pendiente";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(0)} M USD`;
}

function formatRollingFlow(value: number | null, locale: "es" | "en" = "es") {
  return value === null ? locale === "en" ? "Not enough history" : "Historial insuficiente" : formatUsdMillions(value, locale);
}

function formatPositiveFundFlow(flow: BtcEtfFundFlow | null, locale: "es" | "en" = "es") {
  return flow ? `${flow.ticker} ${formatUsdMillions(flow.flow, locale)}` : locale === "en" ? "No positive inflows" : "Sin entradas positivas";
}

function formatNegativeFundFlow(flow: BtcEtfFundFlow | null, locale: "es" | "en" = "es") {
  return flow ? `${flow.ticker} ${formatUsdMillions(flow.flow, locale)}` : locale === "en" ? "No negative outflows" : "Sin salidas negativas";
}

function positiveNegativeDaysLabel(flows: BtcEtfFlowsData, locale: "es" | "en" = "es") {
  const sessions = Math.min(flows.rowsParsed, 10);
  if (locale === "en") {
    const suffix = flows.rowsParsed >= 10 ? "last 10 sessions" : `${sessions} available sessions`;
    return `${flows.positiveDaysLast10} positive / ${flows.negativeDaysLast10} negative · ${suffix}`;
  }
  const suffix = flows.rowsParsed >= 10 ? "últimas 10 sesiones" : `${sessions} sesiones disponibles`;
  return `${flows.positiveDaysLast10} positivas / ${flows.negativeDaysLast10} negativas · ${suffix}`;
}

function severityClass(severity: BtcEtfFlowsData["readingSeverity"]) {
  if (severity === "positive") return "border-[#6f8f7b]/40 bg-[#6f8f7b]/10 text-[#47604f]";
  if (severity === "negative") return "border-[#a86464]/40 bg-[#a86464]/10 text-[#7b3f3f]";
  if (severity === "pending") return "border-[#b6905b]/40 bg-[#b6905b]/10 text-[#76562d]";
  return "border-[#a8a29e]/40 bg-[#a8a29e]/10 text-[#5f5a54]";
}

function levelLabel(level: BtcEtfFlowsData["dailyLevel"], locale: "es" | "en" = "es") {
  if (level === "strong_inflow") return locale === "en" ? "Strong inflow" : "Entrada fuerte";
  if (level === "moderate_inflow") return locale === "en" ? "Moderate inflow" : "Entrada moderada";
  if (level === "moderate_outflow") return locale === "en" ? "Moderate outflow" : "Salida moderada";
  if (level === "strong_outflow") return locale === "en" ? "Strong outflow" : "Salida fuerte";
  if (level === "pending") return locale === "en" ? "Pending data" : "Datos pendientes";
  return locale === "en" ? "Neutral" : "Neutro";
}

function trendLabel(trend: BtcEtfFlowsData["recentTrend"], locale: "es" | "en" = "es") {
  if (trend === "sustained_accumulation") return locale === "en" ? "Sustained accumulation" : "Acumulación sostenida";
  if (trend === "moderate_inflows") return locale === "en" ? "Moderate inflows" : "Entradas moderadas";
  if (trend === "moderate_outflows") return locale === "en" ? "Moderate outflows" : "Salidas moderadas";
  if (trend === "outflow_pressure") return locale === "en" ? "Outflow pressure" : "Presión de salidas";
  if (trend === "pending") return locale === "en" ? "Pending data" : "Datos pendientes";
  return locale === "en" ? "Mixed" : "Mixto";
}

function windowDirectionLabel(value: number | null, locale: "es" | "en" = "es") {
  if (value === null) return locale === "en" ? "not enough history" : "historial insuficiente";
  if (value > 0) return locale === "en" ? "positive" : "positivo";
  if (value < 0) return locale === "en" ? "negative" : "negativo";
  return "neutral";
}

function recentWindowsLabel(flows: BtcEtfFlowsData, locale: "es" | "en" = "es") {
  return `5D ${windowDirectionLabel(flows.rolling5dNetFlow, locale)} · 20D ${windowDirectionLabel(flows.rolling20dNetFlow, locale)}`;
}

function buildBarPath(history: BtcEtfFlowPoint[]) {
  const maxAbs = Math.max(...history.map((point) => Math.abs(point.totalNetFlow)), 1);
  const cumulative = history.reduce<number[]>((acc, point) => {
    const previous = acc.at(-1) ?? 0;
    acc.push(previous + point.totalNetFlow);
    return acc;
  }, []);
  const cumulativeMin = cumulative.length ? Math.min(...cumulative) : 0;
  const cumulativeMax = cumulative.length ? Math.max(...cumulative) : 0;
  const cumulativeRange = Math.max(cumulativeMax - cumulativeMin, 1);
  const cumulativePath = cumulative
    .map((value, index) => {
      const x = history.length <= 1 ? 50 : (index / (history.length - 1)) * 100;
      const y = 10 + (1 - (value - cumulativeMin) / cumulativeRange) * 28;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return { cumulativePath, maxAbs };
}

function FlowBarChart({ history, locale = "es" }: { history: BtcEtfFlowPoint[]; locale?: "es" | "en" }) {
  const { cumulativePath, maxAbs } = buildBarPath(history);
  const width = 100;
  const height = 62;
  const gap = 0.8;
  const barWidth = history.length ? Math.max((width - gap * (history.length - 1)) / history.length, 1.2) : 1.2;

  return (
    <div className="min-w-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{locale === "en" ? "Latest sessions" : "Últimas sesiones"}</p>
          <h3 className="mt-1 text-sm font-semibold text-ink">{locale === "en" ? "Daily net flow and available cumulative flow" : "Flujo neto diario y acumulado disponible"}</h3>
        </div>
        <p className="max-w-[12rem] text-right text-xs leading-5 text-muted">
          {locale === "en" ? "US$ millions, based on source availability" : "US$ millones, según disponibilidad de la fuente"}
        </p>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-56 w-full" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" x2="100" y1="38" y2="38" stroke="#d8d1c8" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        {cumulativePath ? <path d={cumulativePath} fill="none" stroke="#7d8f9a" strokeWidth="1.4" vectorEffect="non-scaling-stroke" /> : null}
        {history.map((point, index) => {
          const magnitude = (Math.abs(point.totalNetFlow) / maxAbs) * 20;
          const x = index * (barWidth + gap);
          const isPositive = point.totalNetFlow > 0;
          const y = isPositive ? 38 - magnitude : 38;
          const fill = isPositive ? "#6f8f7b" : point.totalNetFlow < 0 ? "#a86464" : "#a8a29e";

          return (
            <rect
              key={`${point.date}-${index}`}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(magnitude, 0.8)}
              rx="1"
              fill={fill}
            />
          );
        })}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>-{history.length} {locale === "en" ? "sessions" : "sesiones"}</span>
        <span>{locale === "en" ? "Latest date" : "Última fecha"}</span>
      </div>
    </div>
  );
}

export function BtcEtfFlowsModule({ data }: BtcEtfFlowsModuleProps) {
  const locale = usePathname().startsWith("/en") ? "en" : "es";
  const t = (value: string | null | undefined) => locale === "en" ? translateDashboardText(value) : value ?? "";
  const flows = data.flows;
  const metrics = [
    ["Rolling 5D", formatUsdMillions(flows.rolling5dNetFlow, locale)],
    ["Rolling 20D", formatRollingFlow(flows.rolling20dNetFlow, locale)],
    [locale === "en" ? "Current streak" : "Racha actual", t(flows.flowStreak.label)],
    [locale === "en" ? "Positive / negative days" : "Días positivos / negativos", positiveNegativeDaysLabel(flows, locale)],
    [locale === "en" ? "Largest positive contribution" : "Mayor aporte positivo", formatPositiveFundFlow(flows.largestInflowFundLatestDay, locale)],
    [locale === "en" ? "Largest negative contribution" : "Mayor aporte negativo", formatNegativeFundFlow(flows.largestOutflowFundLatestDay, locale)],
  ];

  return (
    <ExpandableInsightCard
      eyebrow="BTC ETF flows"
      title={locale === "en" ? "ETF flow pressure" : "Presión de flujos vía ETFs"}
      reading={t(flows.readingSubtext)}
      status={t(dataStatusLabels[flows.dataStatus])}
      metrics={[
        { label: locale === "en" ? "Latest net flow" : "Último flujo neto", value: formatUsdMillions(flows.latestTotalNetFlow, locale), tone: flows.readingSeverity === "positive" ? "sage" : flows.readingSeverity === "negative" ? "danger" : "brass" },
        { label: locale === "en" ? "Read" : "Lectura", value: t(flows.readingLabel) },
        { label: "Rolling 5D", value: formatUsdMillions(flows.rolling5dNetFlow, locale) },
        { label: locale === "en" ? "Streak" : "Racha", value: t(flows.flowStreak.label) },
      ]}
    >
      <div className="grid gap-8 xl:grid-cols-[0.42fr_0.58fr] xl:items-start">
        <div className="border border-line bg-panel p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">{locale === "en" ? "Expanded read" : "Lectura ampliada"}</p>
          <p className="mt-3 text-sm leading-6 text-muted">
            {locale === "en"
              ? `Read based on daily net flows and recent cumulative flows. Latest detected date: ${flows.latestDate}.`
              : `Lectura basada en flujos netos diarios y acumulados recientes. Última fecha detectada: ${flows.latestDate}.`}
          </p>
          <div className="mt-5 grid gap-x-5 gap-y-4 border-y border-line py-4 sm:grid-cols-2">
            {metrics.map(([label, value]) => (
              <div key={label}>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
                <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <FlowBarChart history={flows.history} locale={locale} />
      </div>

      <div className="mt-6 grid gap-4 border-t border-line pt-5 text-sm leading-6 text-muted lg:grid-cols-3">
        <div>
          <span className="block text-sm font-semibold text-ink">{locale === "en" ? "Dominant driver" : "Driver dominante"}</span>
          <p className="mt-2">{t(flows.dominantFlowDriver)}</p>
          <p className="mt-2 text-xs">{levelLabel(flows.dailyLevel, locale)} · {trendLabel(flows.recentTrend, locale)} · {recentWindowsLabel(flows, locale)}</p>
        </div>
        <div>
          <span className="block text-sm font-semibold text-ink">{locale === "en" ? "Latest-day breadth" : "Breadth último día"}</span>
          <p className="mt-2">
            {locale === "en"
              ? `${flows.breadth.positive} with inflow · ${flows.breadth.negative} with outflow · ${flows.breadth.flatOrMissing} flat or missing`
              : `${flows.breadth.positive} con entrada · ${flows.breadth.negative} con salida · ${flows.breadth.flatOrMissing} sin dato o sin cambio`}
          </p>
        </div>
        <div>
          <span className="block text-sm font-semibold text-ink">{locale === "en" ? "Summary read" : "Lectura resumida"}</span>
          <p className="mt-2">{t(flows.interpretation.how)}</p>
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-4 text-sm leading-6 text-muted">
        <span className="font-semibold text-ink">{locale === "en" ? "Reading limit" : "Qué NO significa"}: </span>
        {t(flows.interpretation.whatItDoesNotMean)}
      </div>

      <div className="mt-4 grid gap-3 border-t border-line pt-4 text-sm leading-6 text-muted md:grid-cols-3">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{locale === "en" ? "Source" : "Fuente"}</span>
          {flows.sourceUrl ? (
            <a href={flows.sourceUrl} className="mt-1 inline-block text-ink underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
              {t(flows.sourceName)}
            </a>
          ) : (
            <span className="mt-1 block text-ink">{t(flows.sourceName)}</span>
          )}
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{locale === "en" ? "Updated" : "Actualización"}</span>
          <span className="mt-1 block text-ink">{t(flows.lastUpdated)}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{locale === "en" ? "Status" : "Estado"}</span>
          <span className="mt-1 block text-ink">{t(dataStatusLabels[flows.dataStatus])}</span>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-muted">{t(flows.reliabilityNote)}</p>
    </ExpandableInsightCard>
  );
}
