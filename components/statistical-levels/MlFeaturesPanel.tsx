"use client";

import { useState } from "react";
import type { AssetStatRecord, MlFeatureSet, StatisticalFrequency } from "@/lib/statistical-levels/types";

type MlFeaturesPanelProps = {
  assets: AssetStatRecord[];
  frequency: StatisticalFrequency;
  focusAsset: AssetStatRecord | null;
};

const featureGroups: Array<[string, Array<[keyof MlFeatureSet, string]>]> = [
  ["Momentum", [["return_1p", "return_1p"], ["return_4p", "return_4p"], ["return_12p", "return_12p"]]],
  ["Riesgo", [["volatility", "volatility"], ["drawdown", "drawdown"]]],
  ["Tendencia", [["trend_slope", "trend_slope"], ["distance_to_long_ma", "distance_to_long_ma"]]],
  ["Posicionamiento", [["extension_zscore", "extension_zscore"], ["correlation_to_selected_average", "correlation_to_selected_average"]]],
  ["Rango", [["range_percentile", "range_percentile"], ["close_location", "close_location"]]],
];

function formatFeature(value: number | null) {
  if (value === null) return "n/d";
  return Math.abs(value) < 1 ? value.toFixed(4) : value.toFixed(2);
}

function formatPercent(value: number | null) {
  if (value === null) return "n/d";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

const frequencyLabels: Record<StatisticalFrequency, string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
};

export function MlFeaturesPanel({ assets, frequency, focusAsset }: MlFeaturesPanelProps) {
  const [open, setOpen] = useState(false);
  const featureCount = featureGroups.flatMap(([, items]) => items).length;
  const weekly = focusAsset?.keyStatisticalLevels.weekly;
  const monthly = focusAsset?.keyStatisticalLevels.monthly;

  return (
    <section className="border border-line bg-panel p-4 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">Variables cuantitativas</p>
          <h2 className="mt-1 text-xl font-semibold text-ink">Lecturas útiles para modelos</h2>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="min-h-9 w-fit border border-line px-4 text-sm font-semibold text-ink transition hover:border-ink focus:outline-none focus:ring-2 focus:ring-ink/20"
        >
          {open ? "Ocultar variables" : "Ver variables cuantitativas"}
        </button>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
        Estas variables pueden servir como insumos para análisis cuantitativo. No indican una instrucción operativa ni dirección futura.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryItem label="Variables base" value={String(featureCount)} />
        <SummaryItem label="Frecuencia" value={frequencyLabels[frequency]} />
        <SummaryItem label="Activo foco" value={focusAsset?.ticker ?? "n/d"} />
        <SummaryItem label="Niveles semanales" value={weekly?.available ? `${formatPercent(weekly.avgHigherExtension)} / ${formatPercent(weekly.avgLowerExtension)}` : "n/d"} />
        <SummaryItem label="Niveles mensuales" value={monthly?.available ? `${formatPercent(monthly.avgHigherExtension)} / ${formatPercent(monthly.avgLowerExtension)}` : "n/d"} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        {featureGroups.map(([group, items]) => (
          <div key={group} className="border border-line bg-panelSoft p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brass">{group}</p>
            <p className="mt-2 text-xs leading-5 text-muted">{items.length} variables disponibles</p>
          </div>
        ))}
      </div>

      {open ? (
        <>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-[13px]">
              <thead className="text-muted">
                <tr className="border-b border-line">
                  <th className="py-2.5 pr-4 font-medium">Activo</th>
                  {featureGroups.flatMap(([, items]) => items).map(([, label]) => <th key={label} className="py-2.5 pr-4 font-medium">{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => {
                  const features = asset.frequencies[frequency].mlFeatures;
                  return (
                    <tr key={asset.ticker} className="border-b border-line/70">
                      <td className="py-3 pr-4 font-semibold text-ink">{asset.ticker}</td>
                      {featureGroups.flatMap(([, items]) => items).map(([key]) => <td key={key} className="py-3 pr-4 text-muted">{formatFeature(features[key])}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {focusAsset ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <LevelFeatureSummary title="Variables de nivel semanal" values={focusAsset.keyStatisticalLevels.weekly} keys={["WSHE", "WAHE", "WALE", "WSLE"]} />
              <LevelFeatureSummary title="Variables de nivel mensual" values={focusAsset.keyStatisticalLevels.monthly} keys={["MSHE", "MAHE", "MALE", "MSLE"]} />
            </div>
          ) : null}
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

function LevelFeatureSummary({
  title,
  values,
  keys,
}: {
  title: string;
  values: AssetStatRecord["keyStatisticalLevels"]["weekly"];
  keys: string[];
}) {
  return (
    <div className="border border-line bg-panelSoft p-4">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <SummaryItem label="Ext. alta prom." value={formatPercent(values.avgHigherExtension)} />
        <SummaryItem label="Ext. alta desv." value={formatPercent(values.stdHigherExtension)} />
        <SummaryItem label="Ext. baja prom." value={formatPercent(values.avgLowerExtension)} />
        <SummaryItem label="Ext. baja desv." value={formatPercent(values.stdLowerExtension)} />
      </div>
      <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-2">
        {keys.map((key) => (
          <p key={key}>
            <span className="font-semibold text-ink">{key}:</span> {formatFeature(values.levels[key] ?? null)} · dist. {formatPercent(values.distances[key] ?? null)}
          </p>
        ))}
      </div>
    </div>
  );
}
