"use client";

import { useId, useState } from "react";
import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import {
  DashboardModuleHeading,
  DashboardDisclosureButton,
  DashboardStatus,
  dashboardModuleEyebrowClassName,
} from "@/components/dashboard/DashboardPrimitives";
import {
  buildBtcRecentSessionRows,
  btcFlowCoverageCopy,
  btcFlowStatusLabel,
  capitalFlowTone,
  flowDirectionLabel,
  formatCapitalFlowDate,
} from "@/lib/dashboard/capital-flows-presentation";
import { translateDashboardText } from "@/lib/dashboard/translate-dashboard-copy";
import type {
  BtcEtfFlowPoint,
  BtcEtfFlowsDashboardData,
  BtcEtfFlowsData,
  BtcEtfFundFlow,
} from "@/lib/dashboard/types";

type Locale = "es" | "en";

type BtcEtfFlowsModuleProps = {
  assetLabel?: "BTC" | "ETH";
  data: BtcEtfFlowsDashboardData;
};

function formatUsdMillions(value: number | null, locale: Locale = "es") {
  if (value === null) return locale === "en" ? "Pending data" : "Dato pendiente";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(0)} M USD`;
}

function formatRollingFlow(value: number | null, locale: Locale = "es") {
  return value === null
    ? locale === "en" ? "Not enough history" : "Historial insuficiente"
    : formatUsdMillions(value, locale);
}

function formatPositiveFundFlow(flow: BtcEtfFundFlow | null, locale: Locale = "es") {
  return flow
    ? `${flow.ticker} ${formatUsdMillions(flow.flow, locale)}`
    : locale === "en" ? "No positive inflows" : "Sin entradas positivas";
}

function formatNegativeFundFlow(flow: BtcEtfFundFlow | null, locale: Locale = "es") {
  return flow
    ? `${flow.ticker} ${formatUsdMillions(flow.flow, locale)}`
    : locale === "en" ? "No negative outflows" : "Sin salidas negativas";
}

function positiveNegativeDaysLabel(flows: BtcEtfFlowsData, locale: Locale = "es") {
  const sessions = Math.min(flows.rowsParsed, 10);
  if (locale === "en") {
    const suffix = flows.rowsParsed >= 10 ? "last 10 sessions" : `${sessions} available sessions`;
    return `${flows.positiveDaysLast10} positive / ${flows.negativeDaysLast10} negative · ${suffix}`;
  }
  const suffix = flows.rowsParsed >= 10 ? "últimas 10 sesiones" : `${sessions} sesiones disponibles`;
  return `${flows.positiveDaysLast10} positivas / ${flows.negativeDaysLast10} negativas · ${suffix}`;
}

function breadthLabel(flows: BtcEtfFlowsData, locale: Locale) {
  return locale === "en"
    ? `${flows.breadth.positive} inflow · ${flows.breadth.negative} outflow · ${flows.breadth.flatOrMissing} flat/missing`
    : `${flows.breadth.positive} entrada · ${flows.breadth.negative} salida · ${flows.breadth.flatOrMissing} sin cambio/dato`;
}

function valueClass(value: number | null) {
  const tone = capitalFlowTone(value);
  if (tone === "positive") return "text-[#47604f]";
  if (tone === "negative") return "text-[#7b3f3f]";
  if (tone === "unavailable") return "text-muted";
  return "text-ink";
}

function primaryMetricCellClass(index: number) {
  return [
    "min-w-0 px-3 py-3 sm:px-4",
    index === 0 ? "pl-0 sm:pl-0" : "",
    index === 1 || index === 3 ? "border-l border-line" : "",
    index >= 2 ? "border-t border-line sm:border-t-0" : "",
    index === 2 ? "sm:border-l sm:border-line" : "",
  ].join(" ");
}

function secondaryMetricCellClass(index: number) {
  return [
    "min-w-0 px-3 py-3 sm:px-4",
    index === 0 ? "pl-0" : "border-t border-line",
    index % 2 === 1 ? "sm:border-l sm:border-line" : "sm:border-l-0 sm:pl-0",
    index < 2 ? "sm:border-t-0" : "",
    index % 3 !== 0 ? "lg:border-l lg:border-line" : "lg:border-l-0 lg:pl-0",
    index < 3 ? "lg:border-t-0" : "lg:border-t lg:border-line",
  ].join(" ");
}

function buildChartData(history: BtcEtfFlowPoint[]) {
  const maxAbs = Math.max(...history.map((point) => Math.abs(point.totalNetFlow)), 1);
  const cumulative = history.reduce<number[]>((values, point) => {
    values.push((values.at(-1) ?? 0) + point.totalNetFlow);
    return values;
  }, []);
  const cumulativeMin = cumulative.length ? Math.min(...cumulative) : 0;
  const cumulativeMax = cumulative.length ? Math.max(...cumulative) : 0;
  const cumulativeRange = Math.max(cumulativeMax - cumulativeMin, 1);
  const gap = history.length > 20 ? 0.55 : 0.8;
  const barWidth = history.length ? Math.max((92 - gap * (history.length - 1)) / history.length, 1.2) : 1.2;
  const points = history.map((point, index) => {
    const x = 4 + index * (barWidth + gap);
    const barHeight = (Math.abs(point.totalNetFlow) / maxAbs) * 17;
    const positive = point.totalNetFlow >= 0;
    return {
      point,
      cumulative: cumulative[index],
      x,
      centerX: x + barWidth / 2,
      barWidth,
      barHeight: Math.max(barHeight, 0.8),
      barY: positive ? 57 - barHeight : 57,
      lineY: 8 + (1 - (cumulative[index] - cumulativeMin) / cumulativeRange) * 25,
    };
  });
  const cumulativePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.centerX.toFixed(2)} ${point.lineY.toFixed(2)}`)
    .join(" ");

  return { cumulativePath, points };
}

function FlowBarChart({ history, locale }: { history: BtcEtfFlowPoint[]; locale: Locale }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const { cumulativePath, points } = buildChartData(history);
  const activeIndex = focusedIndex ?? hoveredIndex;
  const active = activeIndex === null ? null : points[activeIndex];
  const latest = history.at(-1) ?? null;
  const middle = history.length ? history[Math.floor((history.length - 1) / 2)] : null;

  return (
    <div className="min-w-0 bg-panelSoft px-3 py-4 sm:px-5 md:px-6 md:py-5" data-btc-flow-chart>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{locale === "en" ? "Recent sessions" : "Sesiones recientes"}</p>
          <p className="mt-1.5 text-sm font-semibold text-ink">{locale === "en" ? "Daily net flow and available cumulative path" : "Flujo neto diario y trayectoria acumulada disponible"}</p>
        </div>
        <p className="text-right text-xs leading-5 text-muted">{locale === "en" ? "US$ millions" : "Millones de USD"}</p>
      </div>

      {points.length ? (
        <>
          <div className="relative mt-3 h-48 sm:h-[220px] md:h-[244px]">
            <svg viewBox="0 0 100 78" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <line x1="4" x2="96" y1="38" y2="38" stroke="#d8d1c8" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
              <line x1="4" x2="96" y1="57" y2="57" stroke="#d8d1c8" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
              {cumulativePath ? <path d={cumulativePath} fill="none" stroke="#7d8f9a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /> : null}
              {points.map(({ point, x, barWidth, barHeight, barY }) => (
                <rect
                  key={point.date}
                  x={x}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  rx="0.8"
                  fill={point.totalNetFlow > 0 ? "#6f8f7b" : point.totalNetFlow < 0 ? "#a86464" : "#a8a29e"}
                />
              ))}
            </svg>
            {points.map(({ point, cumulative, centerX }, index) => (
              <button
                key={`${point.date}-${index}`}
                type="button"
                aria-label={`${formatCapitalFlowDate(point.date, locale)} · ${locale === "en" ? "daily net flow" : "flujo neto diario"} ${formatUsdMillions(point.totalNetFlow, locale)} · ${locale === "en" ? "available cumulative" : "acumulado disponible"} ${formatUsdMillions(cumulative, locale)}`}
                className="absolute top-[8%] h-[84%] min-w-2 -translate-x-1/2 bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-1"
                style={{ left: `${centerX}%`, width: `${Math.max(84 / points.length, 2)}%` }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex(null)}
                data-btc-chart-point
              />
            ))}
            {active ? (
              <div
                role="tooltip"
                className={`pointer-events-none absolute top-2 z-10 w-44 border border-line bg-panel px-3 py-2 text-xs shadow-lg ${active.centerX < 18 ? "left-0" : active.centerX > 82 ? "right-0" : "-translate-x-1/2"}`}
                style={{ ...(active.centerX >= 18 && active.centerX <= 82 ? { left: `${active.centerX}%` } : {}) } as CSSProperties}
              >
                <p className="font-semibold text-ink">{formatCapitalFlowDate(active.point.date, locale)}</p>
                <p className="mt-1 text-muted">{locale === "en" ? "Daily" : "Diario"} <strong className={`ml-1 tabular-nums ${valueClass(active.point.totalNetFlow)}`}>{formatUsdMillions(active.point.totalNetFlow, locale)}</strong></p>
                <p className="mt-0.5 text-muted">{locale === "en" ? "Available cumulative" : "Acumulado disponible"} <strong className={`ml-1 tabular-nums ${valueClass(active.cumulative)}`}>{formatUsdMillions(active.cumulative, locale)}</strong></p>
              </div>
            ) : null}
          </div>
          <div className="mt-1 flex justify-between text-[10px] font-medium text-muted sm:text-xs">
            <span>{formatCapitalFlowDate(history[0].date, locale)}</span>
            <span>{middle ? formatCapitalFlowDate(middle.date, locale) : ""}</span>
            <span>{latest ? formatCapitalFlowDate(latest.date, locale) : ""}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-muted">
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 bg-sage/80" aria-hidden="true" />{locale === "en" ? "Daily inflow" : "Entrada diaria"}</span>
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 bg-danger/70" aria-hidden="true" />{locale === "en" ? "Daily outflow" : "Salida diaria"}</span>
            <span className="inline-flex items-center gap-2"><span className="h-px w-4 bg-[#7d8f9a]" aria-hidden="true" />{locale === "en" ? "Available cumulative" : "Acumulado disponible"}</span>
          </div>
        </>
      ) : (
        <p className="mt-8 flex h-40 items-center justify-center text-center text-sm text-muted">{locale === "en" ? "Recent sessions are temporarily unavailable." : "Las sesiones recientes no están disponibles temporalmente."}</p>
      )}
    </div>
  );
}

function RecentSessionsTable({ history, locale }: { history: BtcEtfFlowPoint[]; locale: Locale }) {
  const [open, setOpen] = useState(false);
  const tableId = useId();
  const rows = buildBtcRecentSessionRows(history);

  if (!rows.length) return null;

  return (
    <section className="border-t border-line pt-4" data-btc-detail>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-ink">{locale === "en" ? "Recent-session detail" : "Detalle de sesiones recientes"}</h4>
          <p className="mt-1 text-xs text-muted">{rows.length} {locale === "en" ? "available sessions" : "sesiones disponibles"}</p>
        </div>
        <DashboardDisclosureButton
          controls={tableId}
          expanded={open}
          expandedLabel={locale === "en" ? "Hide table" : "Ocultar tabla"}
          collapsedLabel={locale === "en" ? "Show table" : "Mostrar tabla"}
          onClick={() => setOpen((value) => !value)}
        />
      </div>

      {open ? (
        <div id={tableId} className="mt-3 max-w-full overflow-x-auto" data-btc-detail-table-wrapper>
          <table className="w-full min-w-[30rem] border-collapse text-left text-xs">
            <thead className="border-y border-line text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
              <tr>
                <th scope="col" className="py-2.5 pr-4">{locale === "en" ? "Date" : "Fecha"}</th>
                <th scope="col" className="px-4 py-2.5 text-right">{locale === "en" ? "Net flow" : "Flujo neto"}</th>
                <th scope="col" className="py-2.5 pl-4 text-right">{locale === "en" ? "Direction" : "Dirección"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70 text-muted">
              {rows.map((row) => (
                <tr key={row.date}>
                  <td className="py-2.5 pr-4 font-medium text-ink">{formatCapitalFlowDate(row.date, locale)}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${valueClass(row.totalNetFlow)}`}>{formatUsdMillions(row.totalNetFlow, locale)}</td>
                  <td className="py-2.5 pl-4 text-right">{flowDirectionLabel(row.totalNetFlow, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

export function BtcEtfFlowsModule({ assetLabel = "BTC", data }: BtcEtfFlowsModuleProps) {
  const locale: Locale = usePathname().startsWith("/en") ? "en" : "es";
  const [contextOpen, setContextOpen] = useState(false);
  const contextId = useId();
  const t = (value: string | null | undefined) => locale === "en" ? translateDashboardText(value) : value ?? "";
  const flows = data.flows;
  const statusLabel = btcFlowStatusLabel(flows.dataStatus, flows.sourceRole, locale);
  const statusTone = flows.dataStatus === "automated"
    ? "positive"
    : flows.dataStatus === "delayed"
      ? "warning"
      : "neutral";
  const coverageCopy = btcFlowCoverageCopy(flows.coverage, flows.rowsParsed, locale);
  const updatedLabel = flows.latestDate
    ? formatCapitalFlowDate(flows.latestDate, locale)
    : locale === "en" ? "No valid observation" : "Sin observación válida";
  const activeSourceLabel = flows.sourceRole === "unavailable"
    ? locale === "en" ? "No active source" : "Sin fuente activa"
    : flows.sourceName;
  const primaryMetrics = [
    {
      id: "latest",
      label: locale === "en" ? "Latest net flow" : "Último flujo neto",
      value: formatUsdMillions(flows.latestTotalNetFlow, locale),
      valueClassName: valueClass(flows.latestTotalNetFlow),
    },
    {
      id: "reading",
      label: locale === "en" ? "Reading" : "Lectura",
      value: t(flows.readingLabel),
      valueClassName: flows.readingSeverity === "pending" ? "text-muted" : "text-ink",
    },
    {
      id: "rolling5d",
      label: "Rolling 5D",
      value: formatUsdMillions(flows.rolling5dNetFlow, locale),
      valueClassName: valueClass(flows.rolling5dNetFlow),
    },
    {
      id: "streak",
      label: locale === "en" ? "Streak" : "Racha",
      value: t(flows.flowStreak.label),
      valueClassName: "text-ink",
    },
  ];
  const secondaryMetrics = [
    ["rolling20d", "Rolling 20D", formatRollingFlow(flows.rolling20dNetFlow, locale)],
    ["days", locale === "en" ? "Positive / negative days" : "Días positivos / negativos", positiveNegativeDaysLabel(flows, locale)],
    ["positive", locale === "en" ? "Largest positive contribution" : "Mayor aporte positivo", formatPositiveFundFlow(flows.largestInflowFundLatestDay, locale)],
    ["negative", locale === "en" ? "Largest negative contribution" : "Mayor aporte negativo", formatNegativeFundFlow(flows.largestOutflowFundLatestDay, locale)],
    ["breadth", locale === "en" ? "Latest-day breadth" : "Breadth del último día", breadthLabel(flows, locale)],
    ["driver", locale === "en" ? "Dominant driver" : "Driver dominante", t(flows.dominantFlowDriver)],
  ];

  return (
    <section
      className="min-w-0 border border-line bg-panel px-4 py-5 shadow-[0_14px_32px_rgba(51,45,39,0.05)] sm:px-5 md:px-7 md:py-6"
      data-btc-flow-module
      data-btc-data-status={flows.dataStatus}
      data-btc-source-role={flows.sourceRole}
      data-btc-coverage={flows.coverage}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={dashboardModuleEyebrowClassName}>{assetLabel === "BTC" ? locale === "en" ? "Bitcoin · Spot ETFs" : "Bitcoin · ETFs spot" : `${assetLabel} ETF flows`}</p>
        <span data-btc-status><DashboardStatus label={statusLabel} tone={statusTone} /></span>
      </div>

      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <DashboardModuleHeading headingLevel="h3">
            {assetLabel === "BTC"
              ? locale === "en" ? "Net flows for spot Bitcoin ETFs" : "Flujos netos de ETFs de BTC"
              : locale === "en" ? "ETF flow pressure" : "Presión de flujos vía ETFs"}
          </DashboardModuleHeading>
          <p className="mt-3 text-sm leading-6 text-muted md:text-base">{t(flows.readingSubtext)}</p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs leading-5" data-btc-coverage-summary>
            <span className="font-semibold text-ink">{coverageCopy.label}</span>
            <span className="text-muted">{coverageCopy.detail}</span>
          </div>
        </div>
        <DashboardDisclosureButton
          controls={contextId}
          expanded={contextOpen}
          expandedLabel={locale === "en" ? "Hide context" : "Ocultar contexto"}
          collapsedLabel={locale === "en" ? "Show context" : "Mostrar contexto"}
          onClick={() => setContextOpen((open) => !open)}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 border-y border-line sm:grid-cols-4" data-btc-primary-metrics>
        {primaryMetrics.map((metric, index) => (
          <div key={metric.id} className={primaryMetricCellClass(index)} data-btc-primary-metric={metric.id}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted sm:text-[11px]">{metric.label}</p>
            <p className={`mt-1.5 break-words text-sm font-semibold tabular-nums sm:text-base ${metric.valueClassName}`}>{metric.value}</p>
          </div>
        ))}
      </div>

      {contextOpen ? (
        <div id={contextId} className="mt-5 border-t border-line pt-5" data-btc-context>
          <FlowBarChart history={flows.history} locale={locale} />

          <section className="mt-5">
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{locale === "en" ? "Supporting detail" : "Detalle complementario"}</h4>
            <div className="mt-3 grid border-y border-line sm:grid-cols-2 lg:grid-cols-3" data-btc-secondary-metrics>
              {secondaryMetrics.map(([id, label, value], index) => (
                <div
                  key={id}
                  className={secondaryMetricCellClass(index)}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted sm:text-[11px]">{label}</p>
                  <p className="mt-1.5 break-words text-sm font-semibold tabular-nums text-ink">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-5 grid gap-4 border-t border-line pt-5 text-sm leading-6 text-muted lg:grid-cols-2">
            <section className="border-l border-brass/50 pl-3">
              <h4 className="font-semibold text-ink">{locale === "en" ? "Prudent interpretation" : "Interpretación prudente"}</h4>
              <p className="mt-1.5">{t(flows.interpretation.how)}</p>
            </section>
            <section className="border-l border-petrol/20 pl-3">
              <h4 className="font-semibold text-ink">{locale === "en" ? "What it does not mean" : "Qué NO significa"}</h4>
              <p className="mt-1.5">{t(flows.interpretation.whatItDoesNotMean)}</p>
            </section>
          </div>

          <RecentSessionsTable history={flows.history} locale={locale} />

          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-4 text-xs leading-5 text-muted" data-btc-source-metadata>
            <div>
              <span className="font-semibold uppercase tracking-[0.12em] text-brass">{locale === "en" ? "Primary source" : "Fuente principal"}</span>
              <a href={flows.primarySource.url} className="ml-2 font-medium text-ink underline-offset-4 hover:underline" target="_blank" rel="noreferrer">{flows.primarySource.name}</a>
            </div>
            <div>
              <span className="font-semibold uppercase tracking-[0.12em] text-brass">Fallback</span>
              <a href={flows.fallbackSource.url} className="ml-2 font-medium text-ink underline-offset-4 hover:underline" target="_blank" rel="noreferrer">{flows.fallbackSource.name}</a>
            </div>
            <div>
              <span className="font-semibold uppercase tracking-[0.12em] text-brass">{locale === "en" ? "Active source" : "Fuente activa"}</span>
              {flows.sourceUrl ? (
                <a href={flows.sourceUrl} className="ml-2 font-medium text-ink underline-offset-4 hover:underline" target="_blank" rel="noreferrer">{activeSourceLabel}</a>
              ) : <span className="ml-2 font-medium text-ink">{activeSourceLabel}</span>}
            </div>
            <div><span className="font-semibold uppercase tracking-[0.12em] text-brass">{locale === "en" ? "Updated" : "Actualización"}</span><span className="ml-2 font-medium text-ink">{updatedLabel}</span></div>
            <div><span className="font-semibold uppercase tracking-[0.12em] text-brass">{locale === "en" ? "Frequency" : "Frecuencia"}</span><span className="ml-2 font-medium text-ink">{t(flows.updateFrequency)}</span></div>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">{t(flows.reliabilityNote)}</p>
          {flows.calculatedTotal ? <p className="mt-2 text-xs leading-5 text-muted">{locale === "en" ? "The daily total was calculated from the available fund contributions." : "El total diario se calculó a partir de las contribuciones disponibles de los fondos."}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
