"use client";

import { useMemo, useState } from "react";
import { MetricHelpTooltip } from "@/components/ui/MetricHelpTooltip";
import type { AssetStatRecord, PeriodExplorerRow, StatisticalFrequency } from "@/lib/statistical-levels/types";

type PeriodExplorerTableProps = {
  asset: AssetStatRecord | null;
  frequency: StatisticalFrequency;
  locale?: "es" | "en";
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

const frequencyLabels: Record<StatisticalFrequency, string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
};
const englishFrequencyLabels: Record<StatisticalFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const headerHelp: Record<string, string> = {
  Change: "Cambio del periodo analizado.",
  OpenGap: "Diferencia entre la apertura del periodo y el cierre previo.",
  Range: "Amplitud entre máximo y mínimo del periodo.",
  CloseLocation: "Posición del cierre dentro del rango. 0 cerca del mínimo y 1 cerca del máximo.",
};
const englishHeaderHelp: Record<string, string> = {
  Change: "Change over the analyzed period.",
  OpenGap: "Difference between the period open and the prior close.",
  Range: "Range between the period high and low.",
  CloseLocation: "Close position within the period range. 0 is near the low and 1 is near the high.",
};

function matchesFilter(row: PeriodExplorerRow, filter: FilterKey) {
  if (filter === "all") return true;
  if (filter === "positive") return (row.change ?? 0) > 0;
  if (filter === "negative") return (row.change ?? 0) < 0;
  if (filter === "positive_extreme") return row.classification === "Extensión positiva extrema";
  if (filter === "negative_extreme") return row.classification === "Extensión negativa extrema";
  if (filter === "above_previous_range") return row.openingRangeCategory === "Above previous range";
  return row.openingRangeCategory === "Below previous range";
}

function classificationLabel(value: string, locale: "es" | "en") {
  if (locale === "es") return value;
  const labels: Record<string, string> = {
    "Extensión negativa extrema": "Extreme negative extension",
    "Extensión negativa": "Negative extension",
    "Zona media": "Middle zone",
    "Extensión positiva": "Positive extension",
    "Extensión positiva extrema": "Extreme positive extension",
  };
  return labels[value] ?? value;
}

export function PeriodExplorerTable({ asset, frequency, locale = "es" }: PeriodExplorerTableProps) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [open, setOpen] = useState(false);
  const localizedFilters = locale === "en"
    ? [
        ["all", "All"],
        ["positive", "Positive"],
        ["negative", "Negative"],
        ["positive_extreme", "Extreme positive extension"],
        ["negative_extreme", "Extreme negative extension"],
        ["above_previous_range", "Above previous range"],
        ["below_previous_range", "Below previous range"],
      ] as const
    : filters;
  const localizedHeaderHelp = locale === "en" ? englishHeaderHelp : headerHelp;
  const rows = asset?.frequencies[frequency].recentPeriods ?? [];
  const filteredRows = useMemo(() => rows.filter((row) => matchesFilter(row, filter)).slice(0, 36), [filter, rows]);
  const summary = useMemo(() => {
    const positives = rows.filter((row) => (row.change ?? 0) > 0).length;
    const negatives = rows.filter((row) => (row.change ?? 0) < 0).length;
    const positiveExtreme = rows.filter((row) => row.classification === "Extensión positiva extrema").length;
    const negativeExtreme = rows.filter((row) => row.classification === "Extensión negativa extrema").length;
    return {
      positives,
      negatives,
      positiveRate: rows.length ? positives / rows.length : null,
      negativeRate: rows.length ? negatives / rows.length : null,
      positiveExtreme,
      negativeExtreme,
    };
  }, [rows]);

  return (
    <section className="border border-line bg-panel p-4 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">{locale === "en" ? "Period explorer" : "Explorador de periodos"}</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">{asset ? asset.ticker : locale === "en" ? "No asset selected" : "Sin activo seleccionado"}</h2>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="min-h-9 w-fit border border-line px-4 text-sm font-semibold text-ink transition hover:border-ink focus:outline-none focus:ring-2 focus:ring-ink/20"
        >
          {open ? (locale === "en" ? "Hide explorer" : "Ocultar explorador") : (locale === "en" ? "Show period explorer" : "Ver explorador de periodos")}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryItem label={locale === "en" ? "Focus asset" : "Activo foco"} value={asset?.ticker ?? "n/d"} />
        <SummaryItem label={locale === "en" ? "Frequency" : "Frecuencia"} value={(locale === "en" ? englishFrequencyLabels : frequencyLabels)[frequency]} />
        <SummaryItem label={locale === "en" ? "Periods" : "Periodos"} value={String(rows.length)} />
        <SummaryItem label={locale === "en" ? "Positive / negative" : "Positivos / negativos"} value={`${formatPercent(summary.positiveRate)} / ${formatPercent(summary.negativeRate)}`} />
        <SummaryItem label={locale === "en" ? "Extremes" : "Extremos"} value={locale === "en" ? `${summary.positiveExtreme} high · ${summary.negativeExtreme} low` : `${summary.positiveExtreme} altos · ${summary.negativeExtreme} bajos`} />
      </div>

      {open ? (
        <>
          <div className="mt-5 flex flex-wrap border border-line bg-panelSoft p-1">
            {localizedFilters.map(([key, label]) => (
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
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-[13px]">
              <thead className="text-muted">
                <tr className="border-b border-line">
                  <th className="py-2.5 pr-4 font-medium">{locale === "en" ? "Period" : "Periodo"}</th>
                  <th className="py-2.5 pr-4 font-medium">Open</th>
                  <th className="py-2.5 pr-4 font-medium">High</th>
                  <th className="py-2.5 pr-4 font-medium">Low</th>
                  <th className="py-2.5 pr-4 font-medium">Close</th>
                  {["Change", "OpenGap", "Range", "CloseLocation"].map((label) => (
                    <th key={label} className="py-2.5 pr-4 font-medium">
                      {label}
                      <MetricHelpTooltip label={label} text={localizedHeaderHelp[label]} />
                    </th>
                  ))}
                  <th className="py-2.5 pr-4 font-medium">{locale === "en" ? "Classification" : "Clasificación"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={`${row.period}-${row.openingRangeCategory}`} className="border-b border-line/70">
                    <td className="py-3 pr-4 font-semibold text-ink">{row.period}</td>
                    <td className="py-3 pr-4 text-muted">{formatNumber(row.open)}</td>
                    <td className="py-3 pr-4 text-muted">{formatNumber(row.high)}</td>
                    <td className="py-3 pr-4 text-muted">{formatNumber(row.low)}</td>
                    <td className="py-3 pr-4 text-muted">{formatNumber(row.close)}</td>
                    <td className="py-3 pr-4 text-muted">{formatPercent(row.change)}</td>
                    <td className="py-3 pr-4 text-muted">{formatPercent(row.openGap)}</td>
                    <td className="py-3 pr-4 text-muted">{formatPercent(row.range)}</td>
                    <td className="py-3 pr-4 text-muted">{row.closeLocation === null ? "n/d" : row.closeLocation.toFixed(2)}</td>
                    <td className="py-3 pr-4 text-muted">{classificationLabel(row.classification, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-panelSoft p-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
