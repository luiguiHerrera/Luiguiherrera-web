"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { SectorDetailPanel } from "@/components/dashboard/SectorDetailPanel";
import { ExpandableInsightCard } from "@/components/ui/ExpandableInsightCard";
import { dataStatusLabels } from "@/lib/dashboard/status";
import { translateDashboardText } from "@/lib/dashboard/translate-dashboard-copy";
import type { SectorEtfSnapshot, SectorRotationData } from "@/lib/dashboard/types";

type Period = "1W" | "1M" | "3M";

type SectorRotationChartProps = {
  data: SectorRotationData;
};

const periodConfig: Record<
  Period,
  {
    label: string;
    key: "return1w" | "return1m" | "return3m";
    rank: "rank1w" | "rank1m" | "rank3m";
    previousKey: "previousReturn1w" | "previousReturn1m" | "previousReturn3m";
    previousRank: "previousRank1w" | "previousRank1m" | "previousRank3m";
  }
> = {
  "1W": { label: "1W", key: "return1w", rank: "rank1w", previousKey: "previousReturn1w", previousRank: "previousRank1w" },
  "1M": { label: "1M", key: "return1m", rank: "rank1m", previousKey: "previousReturn1m", previousRank: "previousRank1m" },
  "3M": { label: "3M", key: "return3m", rank: "rank3m", previousKey: "previousReturn3m", previousRank: "previousRank3m" },
};

function formatPercent(value: number | null, locale: "es" | "en" = "es") {
  if (value === null) return locale === "en" ? "Pending" : "Pendiente";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatPoints(value: number | null, locale: "es" | "en" = "es") {
  if (value === null) return locale === "en" ? "Pending" : "Pendiente";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} pp`;
}

function metricValue(sector: SectorEtfSnapshot, period: Period) {
  return sector[periodConfig[period].key];
}

function metricRank(sector: SectorEtfSnapshot, period: Period) {
  return sector[periodConfig[period].rank];
}

function previousMetricValue(sector: SectorEtfSnapshot, period: Period) {
  return sector[periodConfig[period].previousKey];
}

function previousMetricRank(sector: SectorEtfSnapshot, period: Period) {
  return sector[periodConfig[period].previousRank];
}

function tractionRows(sectors: SectorEtfSnapshot[], period: Period) {
  return sectors
    .map((sector) => {
      const currentRank = metricRank(sector, period);
      const priorRank = previousMetricRank(sector, period);
      const currentReturn = metricValue(sector, period);
      const priorReturn = previousMetricValue(sector, period);

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

export function SectorRotationChart({ data }: SectorRotationChartProps) {
  const locale = usePathname().startsWith("/en") ? "en" : "es";
  const t = (value: string | null | undefined) => locale === "en" ? translateDashboardText(value) : value ?? "";
  const copy = locale === "en"
    ? {
        eyebrow: "Sector rotation",
        title: "Relative sector map",
        leader: "Leader",
        laggard: "Laggard",
        dispersion: "1W dispersion",
        updated: "Updated",
        pending: "Pending",
        status: "Status",
        reading: "Reading",
        body: "Sector leadership and laggards using SPDR ETFs as proxies. Returns by sessions: 1W = 5, 1M = 21, 3M = 63.",
        tractionEyebrow: "Traction change",
        tractionTitle: "Relative traction",
        tractionBody: "Compares the selected window against a broader reference. It does not represent flows.",
      }
    : {
        eyebrow: "Rotación sectorial",
        title: "Mapa relativo sectorial",
        leader: "Líder",
        laggard: "Rezago",
        dispersion: "Dispersión 1W",
        updated: "Actualización",
        pending: "Pendiente",
        status: "Estado",
        reading: "Lectura",
        body: "Liderazgo y rezago sectorial con ETFs SPDR como proxies. Retornos por sesiones: 1W = 5, 1M = 21, 3M = 63.",
        tractionEyebrow: "Cambio de tracción",
        tractionTitle: "Tracción relativa",
        tractionBody: "Compara la ventana seleccionada contra una referencia más amplia. No representa flujos.",
      };
  const [period, setPeriod] = useState<Period>("1W");
  const [selectedTicker, setSelectedTicker] = useState(data.sectors[0]?.etfTicker ?? "");
  const sortedSectors = useMemo(
    () => [...data.sectors].sort((a, b) => (metricValue(b, period) ?? Number.NEGATIVE_INFINITY) - (metricValue(a, period) ?? Number.NEGATIVE_INFINITY)),
    [data.sectors, period],
  );
  const selectedSector = sortedSectors.find((sector) => sector.etfTicker === selectedTicker) ?? sortedSectors[0];
  const values = sortedSectors.map((sector) => metricValue(sector, period)).filter((value): value is number => value !== null);
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 0);
  const maxAbs = Math.max(...values.map((value) => Math.abs(value)), 0.01);
  const traction = tractionRows(data.sectors, period);
  const leader = sortedSectors[0];
  const laggard = sortedSectors.at(-1);

  return (
    <ExpandableInsightCard
      eyebrow={copy.eyebrow}
      title={copy.title}
      reading={t(data.metrics.interpretation)}
      status={t(dataStatusLabels[data.dataStatus])}
      metrics={[
        { label: `${copy.leader} ${period}`, value: leader ? `${t(leader.sectorName)} (${leader.etfTicker}) ${formatPercent(metricValue(leader, period), locale)}` : copy.pending, tone: "sage" },
        { label: `${copy.laggard} ${period}`, value: laggard ? `${t(laggard.sectorName)} (${laggard.etfTicker}) ${formatPercent(metricValue(laggard, period), locale)}` : copy.pending, tone: "danger" },
        { label: copy.dispersion, value: formatPercent(data.metrics.sectorDispersion1w, locale) },
        { label: copy.updated, value: t(data.lastUpdated) },
      ]}
      defaultOpen={false}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <p className="max-w-3xl text-sm leading-6 text-muted">
          {copy.body}
        </p>
        <div className="flex w-fit border border-line bg-panelSoft p-1">
          {(["1W", "1M", "3M"] as Period[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPeriod(option)}
              className={`min-h-9 px-4 text-sm font-semibold transition ${
                period === option ? "bg-ink text-white" : "text-muted hover:text-ink focus:text-ink"
              }`}
              aria-pressed={period === option}
            >
              {periodConfig[option].label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-y border-line py-3 text-sm leading-6 text-muted md:grid-cols-4">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.status}</span>
          <span className="mt-1 block text-ink">{t(dataStatusLabels[data.dataStatus])}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.updated}</span>
          <span className="mt-1 block text-ink">{t(data.lastUpdated)}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.dispersion}</span>
          <span className="mt-1 block text-ink">{formatPercent(data.metrics.sectorDispersion1w, locale)}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.reading}</span>
          <span className="mt-1 block text-ink">{t(data.metrics.interpretation)}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.48fr_0.52fr] xl:items-start">
        <div>
          <div className="grid grid-cols-[1fr_1fr] border-b border-line pb-2 text-xs uppercase tracking-[0.12em] text-muted">
            <span>{formatPercent(minValue, locale)}</span>
            <span className="text-right">{formatPercent(maxValue, locale)}</span>
            <span className="col-span-2 text-center text-brass">0%</span>
          </div>

          <div className="mt-3 grid gap-1.5">
            {sortedSectors.map((sector) => {
              const value = metricValue(sector, period);
              const rawWidth = value === null ? 0 : (Math.abs(value) / maxAbs) * 48;
              const barWidth = value === null || value === 0 ? 0 : Math.max(rawWidth, 1.25);
              const isPositive = (value ?? 0) > 0;
              const isNegative = (value ?? 0) < 0;
              const barColor = isPositive ? "#6f8f7b" : isNegative ? "#a86464" : "#a8a29e";

              return (
                <button
                  key={sector.etfTicker}
                  type="button"
                  onClick={() => setSelectedTicker(sector.etfTicker)}
                  title={`${t(sector.sectorName)} ${sector.etfTicker}: ${formatPercent(value, locale)}`}
                  className={`group grid gap-2 border border-line bg-panelSoft px-3 py-2 text-left transition hover:border-petrol focus:border-petrol focus:outline-none md:grid-cols-[2.7rem_minmax(8rem,0.74fr)_minmax(0,1fr)_4.4rem] md:items-center ${
                    selectedSector?.etfTicker === sector.etfTicker ? "border-petrol" : ""
                  }`}
                >
                  <span className="hidden text-xs font-semibold text-brass md:block">#{metricRank(sector, period) ?? "-"}</span>
                  <div className="flex items-baseline justify-between gap-3 md:block">
                    <div>
                      <span className="block text-sm font-semibold text-ink">{t(sector.sectorName)}</span>
                      <span className="text-xs uppercase tracking-[0.12em] text-muted">{sector.etfTicker} · {locale === "en" ? "sector proxy" : "proxy sectorial"}</span>
                    </div>
                    <span className="font-semibold text-ink md:hidden">{formatPercent(value, locale)}</span>
                  </div>
                  <svg viewBox="0 0 100 14" className="h-5 w-full" aria-hidden="true" preserveAspectRatio="none">
                    <line x1="2" x2="98" y1="7" y2="7" stroke="#e7e2dc" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
                    <line x1="50" x2="50" y1="1" y2="13" stroke="#b8b2aa" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                    {value !== null ? (
                      <rect
                        x={isNegative ? 50 - barWidth : 50}
                        y="4"
                        width={barWidth}
                        height="6"
                        rx="1.5"
                        fill={barColor}
                      />
                    ) : null}
                  </svg>
                  <span className="hidden text-right font-semibold text-ink md:block">{formatPercent(value, locale)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="border border-line bg-panelSoft p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">{copy.tractionEyebrow}</p>
          <h3 className="mt-1 text-base font-semibold text-ink">{copy.tractionTitle}</h3>
          <p className="mt-2 text-xs leading-5 text-muted">
            {copy.tractionBody}
          </p>
          {traction.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {traction.map(({ currentRank, priorRank, rankChange, returnChange, sector }) => (
                <button
                  key={sector.etfTicker}
                  type="button"
                  onClick={() => setSelectedTicker(sector.etfTicker)}
                  className={`border border-line bg-panel px-3 py-2 text-left transition hover:border-petrol focus:border-petrol focus:outline-none ${
                    selectedSector?.etfTicker === sector.etfTicker ? "border-petrol" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="block text-sm font-semibold text-ink">{t(sector.sectorName)}</span>
                      <span className="text-xs uppercase tracking-[0.12em] text-muted">{sector.etfTicker} · {locale === "en" ? "sector proxy" : "proxy sectorial"}</span>
                    </div>
                    <span className="text-base font-semibold text-ink">{tractionArrow(rankChange)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span>#{priorRank ?? copy.pending} → #{currentRank ?? copy.pending}</span>
                    <span className="font-semibold text-ink">{formatPoints(returnChange, locale)}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-4 border border-line bg-panel p-4 text-sm leading-6 text-muted">
              {locale === "en" ? "Not enough history to compare traction" : "Historial insuficiente para comparar tracción"}
            </div>
          )}
          <p className="mt-3 border-t border-line pt-3 text-xs leading-5 text-muted">
            {locale === "en"
              ? "This compares relative performance through proxy ETFs; it does not represent capital flows."
              : "No representa flujos ni entradas/salidas de capital. Es una comparación de rendimiento relativo por ETFs proxy."}
          </p>
        </aside>
      </div>

      {selectedSector ? (
        <div className="mt-5">
          <SectorDetailPanel sector={selectedSector} selectedPeriod={period} selectedRank={metricRank(selectedSector, period)} locale={locale} />
        </div>
      ) : null}

      <p className="mt-5 text-sm leading-6 text-muted">{t(data.reliabilityNote)}</p>
    </ExpandableInsightCard>
  );
}
