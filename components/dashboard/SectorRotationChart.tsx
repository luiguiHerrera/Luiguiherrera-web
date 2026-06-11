"use client";

import { useMemo, useState } from "react";
import { SectorDetailPanel } from "@/components/dashboard/SectorDetailPanel";
import { dataStatusLabels } from "@/lib/dashboard/status";
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

function formatPercent(value: number | null) {
  if (value === null) return "Pendiente";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatPoints(value: number | null) {
  if (value === null) return "Pendiente";
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
    .slice(0, 6);
}

function tractionArrow(rankChange: number | null) {
  if (rankChange === null || rankChange === 0) return "→";
  return rankChange > 0 ? "↑" : "↓";
}

export function SectorRotationChart({ data }: SectorRotationChartProps) {
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

  return (
    <section className="border border-line bg-panel p-5 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">Rotación sectorial</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Mapa relativo por ETFs</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Liderazgo y rezago sectorial con ETFs SPDR como proxies. Retornos por sesiones: 1W = 5, 1M = 21, 3M = 63.
          </p>
        </div>
        <div className="flex w-fit border border-line bg-panelSoft p-1">
          {(["1W", "1M", "3M"] as Period[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPeriod(option)}
              className={`min-h-10 px-4 text-sm font-semibold transition ${
                period === option ? "bg-ink text-white" : "text-muted hover:text-ink focus:text-ink"
              }`}
              aria-pressed={period === option}
            >
              {periodConfig[option].label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 border-y border-line py-4 text-sm leading-6 text-muted md:grid-cols-4">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Estado</span>
          <span className="mt-1 block text-ink">{dataStatusLabels[data.dataStatus]}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Actualización</span>
          <span className="mt-1 block text-ink">{data.lastUpdated}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Dispersión 1W</span>
          <span className="mt-1 block text-ink">{formatPercent(data.metrics.sectorDispersion1w)}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Lectura</span>
          <span className="mt-1 block text-ink">{data.metrics.interpretation}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.42fr_0.58fr] xl:items-start">
        <div>
          <div className="grid grid-cols-[1fr_1fr] border-b border-line pb-2 text-xs uppercase tracking-[0.12em] text-muted">
            <span>{formatPercent(minValue)}</span>
            <span className="text-right">{formatPercent(maxValue)}</span>
            <span className="col-span-2 text-center text-brass">0%</span>
          </div>

          <div className="mt-3 grid gap-2">
            {sortedSectors.map((sector) => {
              const value = metricValue(sector, period);
              const rawWidth = value === null ? 0 : (Math.abs(value) / maxAbs) * 48;
              const barWidth = value === null || value === 0 ? 0 : Math.max(rawWidth, 1.25);
              const isPositive = (value ?? 0) > 0;
              const isNegative = (value ?? 0) < 0;
              const barColor = isPositive ? "var(--sage)" : isNegative ? "var(--rust)" : "rgba(107, 114, 128, 0.45)";

              return (
                <button
                  key={sector.etfTicker}
                  type="button"
                  onClick={() => setSelectedTicker(sector.etfTicker)}
                  title={`${sector.sectorName} ${sector.etfTicker}: ${formatPercent(value)}`}
                  className={`group grid gap-3 border border-line bg-panelSoft p-3 text-left transition hover:border-petrol focus:border-petrol focus:outline-none md:grid-cols-[180px_1fr_82px] md:items-center ${
                    selectedSector?.etfTicker === sector.etfTicker ? "border-petrol" : ""
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3 md:block">
                    <div>
                      <span className="block font-semibold text-ink">{sector.sectorName}</span>
                      <span className="text-xs uppercase tracking-[0.14em] text-muted">#{metricRank(sector, period) ?? "Pendiente"} · {sector.etfTicker}</span>
                    </div>
                    <span className="font-semibold text-ink md:hidden">{formatPercent(value)}</span>
                  </div>
                  <svg viewBox="0 0 100 12" className="h-7 w-full" aria-hidden="true" preserveAspectRatio="none">
                    <line x1="50" x2="50" y1="0" y2="12" stroke="rgba(17, 24, 39, 0.3)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                    {value !== null ? (
                      <rect
                        x={isNegative ? 50 - barWidth : 50}
                        y="3"
                        width={barWidth}
                        height="6"
                        fill={barColor}
                      />
                    ) : null}
                  </svg>
                  <span className="hidden text-right font-semibold text-ink md:block">{formatPercent(value)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="border border-line bg-panelSoft p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">Cambio de tracción</p>
          <h3 className="mt-2 text-lg font-semibold text-ink">Tracción relativa</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Compara la ventana seleccionada contra la ventana inmediatamente anterior del mismo tamaño.
          </p>
          {traction.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {traction.map(({ currentRank, priorRank, rankChange, returnChange, sector }) => (
                <button
                  key={sector.etfTicker}
                  type="button"
                  onClick={() => setSelectedTicker(sector.etfTicker)}
                  className={`border border-line bg-panel p-3 text-left transition hover:border-petrol focus:border-petrol focus:outline-none ${
                    selectedSector?.etfTicker === sector.etfTicker ? "border-petrol" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="block font-semibold text-ink">{sector.sectorName}</span>
                      <span className="text-xs uppercase tracking-[0.14em] text-muted">{sector.etfTicker}</span>
                    </div>
                    <span className="text-lg font-semibold text-ink">{tractionArrow(rankChange)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                    <span>#{priorRank ?? "Pendiente"} → #{currentRank ?? "Pendiente"}</span>
                    <span className="font-semibold text-ink">{formatPoints(returnChange)}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-4 border border-line bg-panel p-4 text-sm leading-6 text-muted">
              Historial insuficiente para comparar tracción
            </div>
          )}
          <p className="mt-4 border-t border-line pt-3 text-xs leading-5 text-muted">
            No representa flujos ni entradas/salidas de capital. Es una comparación de rendimiento relativo por ETFs proxy.
          </p>
        </aside>
      </div>

      {selectedSector ? (
        <div className="mt-5">
          <SectorDetailPanel sector={selectedSector} selectedPeriod={period} selectedRank={metricRank(selectedSector, period)} />
        </div>
      ) : null}

      <p className="mt-5 text-sm leading-6 text-muted">{data.reliabilityNote}</p>
    </section>
  );
}
