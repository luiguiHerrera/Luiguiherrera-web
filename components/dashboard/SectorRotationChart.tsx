"use client";

import { useMemo, useState } from "react";
import { SectorDetailPanel } from "@/components/dashboard/SectorDetailPanel";
import { dataStatusLabels } from "@/lib/dashboard/status";
import type { SectorEtfSnapshot, SectorRotationData } from "@/lib/dashboard/types";

type Period = "1W" | "1M" | "3M";

type SectorRotationChartProps = {
  data: SectorRotationData;
};

const periodConfig: Record<Period, { label: string; key: "return1w" | "return1m" | "return3m"; rank: "rank1w" | "rank1m" | "rank3m" }> = {
  "1W": { label: "1W", key: "return1w", rank: "rank1w" },
  "1M": { label: "1M", key: "return1m", rank: "rank1m" },
  "3M": { label: "3M", key: "return3m", rank: "rank3m" },
};

function formatPercent(value: number | null) {
  if (value === null) return "N/D";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function metricValue(sector: SectorEtfSnapshot, period: Period) {
  return sector[periodConfig[period].key];
}

function metricRank(sector: SectorEtfSnapshot, period: Period) {
  return sector[periodConfig[period].rank];
}

export function SectorRotationChart({ data }: SectorRotationChartProps) {
  const [period, setPeriod] = useState<Period>("1W");
  const [selectedTicker, setSelectedTicker] = useState(data.sectors[0]?.etfTicker ?? "");
  const sortedSectors = useMemo(
    () => [...data.sectors].sort((a, b) => (metricValue(b, period) ?? Number.NEGATIVE_INFINITY) - (metricValue(a, period) ?? Number.NEGATIVE_INFINITY)),
    [data.sectors, period],
  );
  const selectedSector = sortedSectors.find((sector) => sector.etfTicker === selectedTicker) ?? sortedSectors[0];
  const maxAbs = Math.max(...sortedSectors.map((sector) => Math.abs(metricValue(sector, period) ?? 0)), 1);

  return (
    <section className="border border-line bg-panel p-5 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">Rotación sectorial</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Mapa relativo por ETFs</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Barras ordenadas por rendimiento relativo usando sesiones de mercado. La lectura es un proxy de contexto, no una indicación personalizada.
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

      <div className="mt-6 grid gap-2">
        {sortedSectors.map((sector) => {
          const value = metricValue(sector, period);
          const width = `${Math.max((Math.abs(value ?? 0) / maxAbs) * 100, 3)}%`;
          const positive = (value ?? 0) >= 0;

          return (
            <button
              key={sector.etfTicker}
              type="button"
              onClick={() => setSelectedTicker(sector.etfTicker)}
              title={`${sector.sectorName} ${sector.etfTicker}: ${formatPercent(value)}`}
              className={`group grid gap-3 border border-line bg-panelSoft p-3 text-left transition hover:border-petrol focus:border-petrol focus:outline-none md:grid-cols-[190px_1fr_92px] md:items-center ${
                selectedSector?.etfTicker === sector.etfTicker ? "border-petrol" : ""
              }`}
            >
              <div className="flex items-baseline justify-between gap-3 md:block">
                <div>
                  <span className="block font-semibold text-ink">{sector.sectorName}</span>
                  <span className="text-xs uppercase tracking-[0.14em] text-muted">{sector.etfTicker} · #{metricRank(sector, period) ?? "N/D"}</span>
                </div>
                <span className="font-semibold text-ink md:hidden">{formatPercent(value)}</span>
              </div>
              <div className="h-3 border-l border-line bg-panel">
                <div className={`h-full ${positive ? "bg-sage" : "bg-rust"}`} style={{ width }} />
              </div>
              <span className="hidden text-right font-semibold text-ink md:block">{formatPercent(value)}</span>
            </button>
          );
        })}
      </div>

      {selectedSector ? (
        <div className="mt-5">
          <SectorDetailPanel sector={selectedSector} selectedRank={metricRank(selectedSector, period)} />
        </div>
      ) : null}

      <p className="mt-5 text-sm leading-6 text-muted">{data.reliabilityNote}</p>
    </section>
  );
}
