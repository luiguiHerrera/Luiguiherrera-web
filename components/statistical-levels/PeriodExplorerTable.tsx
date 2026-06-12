"use client";

import { useMemo, useState } from "react";
import type { AssetStatRecord, PeriodExplorerRow, StatisticalFrequency } from "@/lib/statistical-levels/types";

type PeriodExplorerTableProps = {
  asset: AssetStatRecord | null;
  frequency: StatisticalFrequency;
};

const filters = [
  ["all", "Todos"],
  ["positive", "Positivos"],
  ["negative", "Negativos"],
  ["positive_extreme", "Extensión positiva extrema"],
  ["negative_extreme", "Extensión negativa extrema"],
  ["above_previous_range", "Above previous range"],
  ["below_previous_range", "Below previous range"],
] as const;

type FilterKey = (typeof filters)[number][0];

function formatPercent(value: number | null) {
  if (value === null) return "n/d";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

function formatNumber(value: number | null) {
  if (value === null) return "n/d";
  return value.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function matchesFilter(row: PeriodExplorerRow, filter: FilterKey) {
  if (filter === "all") return true;
  if (filter === "positive") return (row.change ?? 0) > 0;
  if (filter === "negative") return (row.change ?? 0) < 0;
  if (filter === "positive_extreme") return row.classification === "Extensión positiva extrema";
  if (filter === "negative_extreme") return row.classification === "Extensión negativa extrema";
  if (filter === "above_previous_range") return row.openingRangeCategory === "Above previous range";
  return row.openingRangeCategory === "Below previous range";
}

export function PeriodExplorerTable({ asset, frequency }: PeriodExplorerTableProps) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const rows = asset?.frequencies[frequency].recentPeriods ?? [];
  const filteredRows = useMemo(() => rows.filter((row) => matchesFilter(row, filter)).slice(0, 36), [filter, rows]);

  return (
    <section className="border border-line bg-panel p-5 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Explorador de periodos</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">{asset ? asset.ticker : "Sin activo seleccionado"}</h2>
        </div>
        <div className="flex flex-wrap border border-line bg-panelSoft p-1">
          {filters.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`min-h-9 px-3 text-xs font-semibold transition ${filter === key ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="text-muted">
            <tr className="border-b border-line">
              <th className="py-3 pr-4 font-medium">Periodo</th>
              <th className="py-3 pr-4 font-medium">Open</th>
              <th className="py-3 pr-4 font-medium">High</th>
              <th className="py-3 pr-4 font-medium">Low</th>
              <th className="py-3 pr-4 font-medium">Close</th>
              <th className="py-3 pr-4 font-medium">Change</th>
              <th className="py-3 pr-4 font-medium">OpenGap</th>
              <th className="py-3 pr-4 font-medium">Range</th>
              <th className="py-3 pr-4 font-medium">CloseLocation</th>
              <th className="py-3 pr-4 font-medium">Clasificación</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={`${row.period}-${row.openingRangeCategory}`} className="border-b border-line/70">
                <td className="py-4 pr-4 font-semibold text-ink">{row.period}</td>
                <td className="py-4 pr-4 text-muted">{formatNumber(row.open)}</td>
                <td className="py-4 pr-4 text-muted">{formatNumber(row.high)}</td>
                <td className="py-4 pr-4 text-muted">{formatNumber(row.low)}</td>
                <td className="py-4 pr-4 text-muted">{formatNumber(row.close)}</td>
                <td className="py-4 pr-4 text-muted">{formatPercent(row.change)}</td>
                <td className="py-4 pr-4 text-muted">{formatPercent(row.openGap)}</td>
                <td className="py-4 pr-4 text-muted">{formatPercent(row.range)}</td>
                <td className="py-4 pr-4 text-muted">{row.closeLocation === null ? "n/d" : row.closeLocation.toFixed(2)}</td>
                <td className="py-4 pr-4 text-muted">{row.classification}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
