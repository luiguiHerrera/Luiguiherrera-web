"use client";

import { useId, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  DashboardDisclosureButton,
  DashboardStatus,
  dashboardModuleEyebrowClassName,
  dashboardModuleTitleClassName,
} from "@/components/dashboard/DashboardPrimitives";
import { SectorDetailPanel } from "@/components/dashboard/SectorDetailPanel";
import { dataStatusLabels } from "@/lib/dashboard/status";
import { translateDashboardText } from "@/lib/dashboard/translate-dashboard-copy";
import type { SectorEtfSnapshot, SectorRotationData } from "@/lib/dashboard/types";

type Period = "1W" | "1M" | "3M";
type SectorRotationChartProps = { data: SectorRotationData };

const periodConfig: Record<Period, {
  label: string;
  key: "return1w" | "return1m" | "return3m";
  rank: "rank1w" | "rank1m" | "rank3m";
  previousKey: "previousReturn1w" | "previousReturn1m" | "previousReturn3m";
  previousRank: "previousRank1w" | "previousRank1m" | "previousRank3m";
}> = {
  "1W": { label: "1W", key: "return1w", rank: "rank1w", previousKey: "previousReturn1w", previousRank: "previousRank1w" },
  "1M": { label: "1M", key: "return1m", rank: "rank1m", previousKey: "previousReturn1m", previousRank: "previousRank1m" },
  "3M": { label: "3M", key: "return3m", rank: "rank3m", previousKey: "previousReturn3m", previousRank: "previousRank3m" },
};

function formatPercent(value: number | null, locale: "es" | "en") {
  if (value === null) return locale === "en" ? "Pending" : "Pendiente";
  return (value > 0 ? "+" : "") + value.toFixed(1) + "%";
}

function formatPoints(value: number | null, locale: "es" | "en") {
  if (value === null) return locale === "en" ? "Pending" : "Pendiente";
  return (value > 0 ? "+" : "") + value.toFixed(1) + " pp";
}

function metricValue(sector: SectorEtfSnapshot, period: Period) {
  return sector[periodConfig[period].key];
}

function metricRank(sector: SectorEtfSnapshot, period: Period) {
  return sector[periodConfig[period].rank];
}

function tractionRows(sectors: SectorEtfSnapshot[], period: Period) {
  return sectors
    .map((sector) => {
      const currentRank = metricRank(sector, period);
      const priorRank = sector[periodConfig[period].previousRank];
      const currentReturn = metricValue(sector, period);
      const priorReturn = sector[periodConfig[period].previousKey];
      return {
        sector,
        currentRank,
        priorRank,
        returnChange: currentReturn !== null && priorReturn !== null ? currentReturn - priorReturn : null,
        rankChange: currentRank !== null && priorRank !== null ? priorRank - currentRank : null,
      };
    })
    .filter((row) => row.currentRank !== null && row.priorRank !== null && row.returnChange !== null)
    .sort((a, b) => Math.abs(b.rankChange ?? 0) - Math.abs(a.rankChange ?? 0) || Math.abs(b.returnChange ?? 0) - Math.abs(a.returnChange ?? 0))
    .slice(0, 4);
}

function tractionArrow(rankChange: number | null) {
  if (rankChange === null || rankChange === 0) return "→";
  return rankChange > 0 ? "↑" : "↓";
}

function metricCellClass(index: number) {
  return [
    "min-w-0 px-3 py-3 sm:px-4",
    index === 0 ? "pl-0 sm:pl-0" : "",
    index === 1 || index === 3 ? "border-l border-line" : "",
    index >= 2 ? "border-t border-line sm:border-t-0" : "",
    index === 2 ? "sm:border-l sm:border-line" : "",
  ].join(" ");
}

function rowClass(selected: boolean) {
  return [
    "grid w-full min-w-[34rem] grid-cols-[minmax(11rem,1.25fr)_4.25rem_5.25rem_minmax(9rem,1fr)] items-center gap-3 border-b border-line px-3 py-1.5 text-left transition last:border-b-0",
    "hover:bg-panelSoft/70 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brass",
    selected ? "relative bg-paper text-ink before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:bg-brass" : "bg-transparent",
  ].join(" ");
}

export function SectorRotationChart({ data }: SectorRotationChartProps) {
  const locale = usePathname().startsWith("/en") ? "en" : "es";
  const t = (value: string | null | undefined) => locale === "en" ? translateDashboardText(value) : value ?? "";
  const sectorLabel = (value: string) => locale === "en"
    ? translateDashboardText(value)
    : value === "Utilities"
      ? "Servicios públicos"
      : value === "Real Estate"
        ? "Inmobiliario"
        : value;
  const [period, setPeriod] = useState<Period>("1W");
  const [selectedTicker, setSelectedTicker] = useState(data.sectors[0]?.etfTicker ?? "");
  const [contextOpen, setContextOpen] = useState(false);
  const contextId = useId();
  const copy = locale === "en"
    ? {
        eyebrow: "Sector rotation",
        title: "Relative sector map",
        description: "Shows where relative leadership is concentrated across sector ETF proxies.",
        leader: "Leader",
        laggard: "Laggard",
        dispersion: "Dispersion",
        coverage: "Coverage",
        window: "Analytical window",
        table: "Sector comparison",
        sector: "Sector",
        ticker: "Ticker",
        return: "Return",
        position: "Relative position",
        showContext: "Show context",
        hideContext: "Hide context",
        traction: "Relative traction",
        tractionBody: "Compares the selected window with its prior reference period. It does not represent flows.",
        rankMove: "Rank movement",
        returnChange: "Return change",
        methodology: "How to read it",
        body: "Returns use market sessions: 1W = 5, 1M = 21, and 3M = 63. The shared bar baseline compares existing returns on one scale for the selected window.",
        source: "Source",
        updated: "Updated",
        frequency: "Frequency",
        noTraction: "Not enough history to compare traction.",
      }
    : {
        eyebrow: "Rotación sectorial",
        title: "Mapa relativo sectorial",
        description: "Muestra dónde se concentra el liderazgo relativo entre proxies de ETFs sectoriales.",
        leader: "Líder",
        laggard: "Rezago",
        dispersion: "Dispersión",
        coverage: "Cobertura",
        window: "Ventana analítica",
        table: "Comparación sectorial",
        sector: "Sector",
        ticker: "Ticker",
        return: "Retorno",
        position: "Posición relativa",
        showContext: "Mostrar contexto",
        hideContext: "Ocultar contexto",
        traction: "Tracción relativa",
        tractionBody: "Compara la ventana seleccionada con su periodo de referencia anterior. No representa flujos.",
        rankMove: "Cambio de ranking",
        returnChange: "Cambio de retorno",
        methodology: "Cómo leerlo",
        body: "Los retornos usan sesiones de mercado: 1W = 5, 1M = 21 y 3M = 63. La línea base común compara los retornos existentes en una sola escala para la ventana seleccionada.",
        source: "Fuente",
        updated: "Actualización",
        frequency: "Frecuencia",
        noTraction: "Historial insuficiente para comparar tracción.",
      };
  const sortedSectors = useMemo(
    () => [...data.sectors].sort((a, b) => (metricValue(b, period) ?? Number.NEGATIVE_INFINITY) - (metricValue(a, period) ?? Number.NEGATIVE_INFINITY)),
    [data.sectors, period],
  );
  const selectedSector = sortedSectors.find((sector) => sector.etfTicker === selectedTicker) ?? sortedSectors[0];
  const values = sortedSectors.map((sector) => metricValue(sector, period)).filter((value): value is number => value !== null);
  const maxAbs = Math.max(...values.map((value) => Math.abs(value)), 0.01);
  const leader = sortedSectors[0];
  const laggard = sortedSectors.at(-1);
  const traction = tractionRows(data.sectors, period);
  const statusLabel = t(dataStatusLabels[data.dataStatus]);
  const frequency = locale === "en" && data.dataStatus === "demo"
    ? "Automatic server-side with a daily cache when the source is available"
    : t(data.updateFrequency);
  const metrics = [
    [copy.leader + " " + period, leader ? sectorLabel(leader.sectorName) + " · " + formatPercent(metricValue(leader, period), locale) : locale === "en" ? "Pending" : "Pendiente"],
    [copy.laggard + " " + period, laggard ? sectorLabel(laggard.sectorName) + " · " + formatPercent(metricValue(laggard, period), locale) : locale === "en" ? "Pending" : "Pendiente"],
    [copy.dispersion + " 1W", formatPercent(data.metrics.sectorDispersion1w, locale)],
    [copy.coverage, values.length + "/" + data.sectors.length],
  ];

  return (
    <article className="min-w-0 border border-line bg-panel px-4 py-5 shadow-[0_14px_32px_rgba(51,45,39,0.05)] sm:px-5 md:px-7 md:py-6" data-sector-rotation-module>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={dashboardModuleEyebrowClassName}>{copy.eyebrow}</p>
        <DashboardStatus label={statusLabel} tone={data.dataStatus === "automated" ? "positive" : "warning"} />
      </div>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <h3 className={dashboardModuleTitleClassName}>{copy.title}</h3>
          <p className="mt-3 text-sm leading-6 text-muted md:text-base">{copy.description}</p>
        </div>
        <DashboardDisclosureButton
          controls={contextId}
          expanded={contextOpen}
          expandedLabel={copy.hideContext}
          collapsedLabel={copy.showContext}
          onClick={() => setContextOpen((open) => !open)}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 border-y border-line sm:grid-cols-4" data-rotation-metrics>
        {metrics.map(([label, value], index) => (
          <div key={label} className={metricCellClass(index)}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted sm:text-[11px]">{label}</p>
            <p className="mt-1.5 text-sm font-semibold tabular-nums text-ink sm:text-base">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.table}</p>
          <div className="inline-flex w-fit border border-line bg-panelSoft p-1" role="group" aria-label={copy.window} data-sector-window-selector>
            {(Object.keys(periodConfig) as Period[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setPeriod(option)}
                aria-pressed={period === option}
                className={"min-h-9 min-w-12 px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 " + (period === option ? "bg-ink text-white" : "text-muted hover:text-ink")}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">{copy.position}: −{maxAbs.toFixed(1)}% · 0% · +{maxAbs.toFixed(1)}%</p>
      </div>

      <div className="mt-2 overflow-x-auto border-y border-line" aria-label={copy.table} data-sector-table>
        <div className="grid min-w-[34rem] grid-cols-[minmax(11rem,1.25fr)_4.25rem_5.25rem_minmax(9rem,1fr)] gap-3 border-b border-line bg-panelSoft/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          <span>{copy.sector}</span>
          <span>{copy.ticker}</span>
          <span className="text-right">{copy.return}</span>
          <span>{copy.position}</span>
        </div>
        {sortedSectors.map((sector) => {
          const value = metricValue(sector, period);
          const barWidth = value === null ? 0 : Math.max((Math.abs(value) / maxAbs) * 50, value === 0 ? 0 : 1.25);
          const negative = (value ?? 0) < 0;
          const selected = selectedSector?.etfTicker === sector.etfTicker;
          return (
            <button
              key={sector.etfTicker}
              type="button"
              onClick={() => setSelectedTicker(sector.etfTicker)}
              aria-pressed={selected}
              aria-label={sectorLabel(sector.sectorName) + ", " + sector.etfTicker + ", " + formatPercent(value, locale)}
              className={rowClass(selected)}
              data-sector-row={sector.etfTicker}
              data-selected={selected ? "true" : "false"}
            >
              <span className="min-w-0">
                <span className={"block whitespace-normal text-sm leading-5 text-ink " + (selected ? "font-semibold" : "font-medium")}>{sectorLabel(sector.sectorName)}</span>
                <span className="text-[10px] uppercase tracking-[0.1em] text-muted">#{metricRank(sector, period) ?? "–"}</span>
              </span>
              <span className="text-xs font-semibold text-muted">{sector.etfTicker}</span>
              <span className="text-right text-sm font-semibold tabular-nums text-ink">{formatPercent(value, locale)}</span>
              <span className="relative h-5" aria-hidden="true" data-relative-position-bar>
                <span className="absolute left-0 right-0 top-1/2 h-px bg-line/70" />
                <span className="absolute left-1/2 top-0 z-10 h-full w-px bg-petrol/65" data-zero-baseline />
                {value !== null && value !== 0 ? (
                  <span
                    className={negative
                      ? "absolute top-1/2 h-2 -translate-y-1/2 rounded-[2px] bg-danger opacity-75"
                      : "absolute top-1/2 h-2 -translate-y-1/2 rounded-[2px] bg-sage"}
                    style={{
                      width: String(barWidth) + "%",
                      left: negative ? undefined : "50%",
                      right: negative ? "50%" : undefined,
                    }}
                  />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      {contextOpen ? (
        <div id={contextId} className="mt-5 border-t border-line pt-5" data-rotation-context>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.traction}</h4>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{copy.tractionBody}</p>
            {traction.length ? (
              <div className="mt-3 border-y border-line">
                {traction.map(({ currentRank, priorRank, rankChange, returnChange, sector }) => (
                  <button
                    key={sector.etfTicker}
                    type="button"
                    onClick={() => setSelectedTicker(sector.etfTicker)}
                    aria-pressed={selectedSector?.etfTicker === sector.etfTicker}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-line px-2 py-2.5 text-left last:border-b-0 hover:bg-panelSoft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brass"
                  >
                    <span><span className="block text-sm font-semibold text-ink">{sectorLabel(sector.sectorName)}</span><span className="text-xs text-muted">{sector.etfTicker}</span></span>
                    <span className="text-xs tabular-nums text-muted">{copy.rankMove}: #{priorRank} → #{currentRank} {tractionArrow(rankChange)}</span>
                    <span className="text-xs font-semibold tabular-nums text-ink">{copy.returnChange}: {formatPoints(returnChange, locale)}</span>
                  </button>
                ))}
              </div>
            ) : <p className="mt-3 text-sm text-muted">{copy.noTraction}</p>}
          </div>

          {selectedSector ? (
            <div className="mt-5">
              <SectorDetailPanel sector={selectedSector} selectedPeriod={period} selectedRank={metricRank(selectedSector, period)} locale={locale} />
            </div>
          ) : null}

          <div className="mt-5 grid gap-5 border-t border-line pt-4 lg:grid-cols-2">
            <div><h4 className="text-sm font-semibold text-ink">{copy.methodology}</h4><p className="mt-2 text-sm leading-6 text-muted">{copy.body}</p></div>
            <div><h4 className="text-sm font-semibold text-ink">{locale === "en" ? "Current reading" : "Lectura actual"}</h4><p className="mt-2 text-sm leading-6 text-muted">{t(data.metrics.interpretation)}</p></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-3 text-xs text-muted">
            <div><span className="font-semibold uppercase tracking-[0.12em] text-brass">{copy.source}</span>{data.sourceUrl ? <a href={data.sourceUrl} className="ml-2 font-medium text-ink underline-offset-4 hover:underline" target="_blank" rel="noreferrer">{t(data.sourceName)}</a> : <span className="ml-2 font-medium text-ink">{t(data.sourceName)}</span>}</div>
            <div><span className="font-semibold uppercase tracking-[0.12em] text-brass">{copy.updated}</span><span className="ml-2 font-medium text-ink">{t(data.lastUpdated)}</span></div>
            <div><span className="font-semibold uppercase tracking-[0.12em] text-brass">{copy.frequency}</span><span className="ml-2 font-medium text-ink">{frequency}</span></div>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">{t(data.reliabilityNote)}</p>
        </div>
      ) : null}
    </article>
  );
}
