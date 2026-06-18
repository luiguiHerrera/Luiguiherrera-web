"use client";

import { useState } from "react";
import type { AssetStatRecord, OpeningCategoryStats, StatisticalFrequency } from "@/lib/statistical-levels/types";

type OpeningLocationPanelProps = {
  asset: AssetStatRecord | null;
  frequency: StatisticalFrequency;
};

function formatPercent(value: number | null) {
  if (value === null) return "n/d";
  return `${(value * 100).toFixed(1)}%`;
}

function CategoryBars({ rows }: { rows: OpeningCategoryStats[] }) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.category}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-ink">{row.category}</span>
            <span className="text-muted">{formatPercent(row.proportion)}</span>
          </div>
          <div className="mt-2 h-2 bg-panelSoft">
            <div className="h-2 bg-[#7f9386]" style={{ width: `${Math.max((row.proportion ?? 0) * 100, row.count ? 2 : 0)}%` }} />
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">
            Comportamiento posterior histórico: {formatPercent(row.averageForwardReturn)} · Vol. media {formatPercent(row.averageVolatility)} · Positivos {formatPercent(row.positiveRate)}
          </p>
        </div>
      ))}
    </div>
  );
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function OpeningLocationPanel({ asset, frequency }: OpeningLocationPanelProps) {
  const [mode, setMode] = useState<"opening" | "close">("opening");
  const location = asset?.frequencies[frequency].openingLocation;
  const periods = asset?.frequencies[frequency].recentPeriods ?? [];
  const closeRows: OpeningCategoryStats[] = [
    { category: "Cierre cerca del mínimo", count: 0, proportion: 0, averageForwardReturn: null, averageVolatility: null, positiveRate: null },
    { category: "Cierre en zona media", count: 0, proportion: 0, averageForwardReturn: null, averageVolatility: null, positiveRate: null },
    { category: "Cierre cerca del máximo", count: 0, proportion: 0, averageForwardReturn: null, averageVolatility: null, positiveRate: null },
  ].map((bucket) => {
    const rows = periods.filter((row) => {
      const closeLocation = row.closeLocation ?? 0.5;
      if (bucket.category.includes("mínimo")) return closeLocation <= 0.33;
      if (bucket.category.includes("máximo")) return closeLocation >= 0.67;
      return closeLocation > 0.33 && closeLocation < 0.67;
    });
    const changes = rows.map((row) => row.change).filter((value): value is number => value !== null && Number.isFinite(value));
    const ranges = rows.map((row) => row.range).filter((value): value is number => value !== null && Number.isFinite(value));
    return {
      category: bucket.category,
      count: rows.length,
      proportion: periods.length ? rows.length / periods.length : 0,
      averageForwardReturn: average(changes),
      averageVolatility: average(ranges),
      positiveRate: changes.length ? changes.filter((value) => value > 0).length / changes.length : null,
    };
  });
  const allRows = [...(location?.range ?? []), ...(location?.close ?? [])];
  const mostFrequentRange = [...(location?.range ?? [])].sort((a, b) => b.count - a.count)[0];
  const mostFrequentClose = [...(location?.close ?? [])].sort((a, b) => b.count - a.count)[0];
  const mostFrequentCloseLocation = [...closeRows].sort((a, b) => b.count - a.count)[0];
  const strongestCloseLocation = [...closeRows].sort((a, b) => (b.averageForwardReturn ?? -Infinity) - (a.averageForwardReturn ?? -Infinity))[0];
  const weakestCloseLocation = [...closeRows].sort((a, b) => (a.averageForwardReturn ?? Infinity) - (b.averageForwardReturn ?? Infinity))[0];
  const highestReturn = [...allRows].sort((a, b) => (b.averageForwardReturn ?? -Infinity) - (a.averageForwardReturn ?? -Infinity))[0];
  const lowestReturn = [...allRows].sort((a, b) => (a.averageForwardReturn ?? Infinity) - (b.averageForwardReturn ?? Infinity))[0];
  return (
    <section className="border border-line bg-panel p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Opening / Close location</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">{mode === "opening" ? "Ubicación de apertura" : "Ubicación de cierre"}</h2>
        </div>
        <div className="flex w-full border border-line bg-panelSoft p-1 sm:w-fit">
          {[
            ["opening", "Opening location"],
            ["close", "Close location"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key as "opening" | "close")}
              className={`min-h-9 flex-1 px-3 text-xs font-semibold transition sm:flex-none ${mode === key ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {mode === "close" ? (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              ["Mayor frecuencia", mostFrequentCloseLocation?.category ?? "n/d", formatPercent(mostFrequentCloseLocation?.proportion ?? null)],
              ["Mayor cambio histórico", strongestCloseLocation?.category ?? "n/d", formatPercent(strongestCloseLocation?.averageForwardReturn ?? null)],
              ["Menor cambio histórico", weakestCloseLocation?.category ?? "n/d", formatPercent(weakestCloseLocation?.averageForwardReturn ?? null)],
            ].map(([label, value, detail]) => (
              <div key={label} className="border border-line bg-panelSoft p-3">
                <p className="text-[11px] uppercase tracking-[0.11em] text-muted">{label}</p>
                <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
                <p className="mt-1 text-xs text-muted">{detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 border border-line bg-panelSoft p-4">
            {periods.length ? (
              <>
                <h3 className="text-sm font-semibold text-ink">Distribución del cierre dentro del rango</h3>
                <div className="mt-4">
                  <CategoryBars rows={closeRows} />
                </div>
              </>
            ) : (
              <p className="text-sm leading-6 text-muted">Close location pendiente de datos suficientes.</p>
            )}
          </div>
        </>
      ) : (
        <>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {[
          ["Mayor frecuencia rango", mostFrequentRange?.category ?? "n/d", formatPercent(mostFrequentRange?.proportion ?? null)],
          ["Mayor frecuencia cierre", mostFrequentClose?.category ?? "n/d", formatPercent(mostFrequentClose?.proportion ?? null)],
          ["Mayor retorno posterior histórico", highestReturn?.category ?? "n/d", formatPercent(highestReturn?.averageForwardReturn ?? null)],
          ["Menor retorno posterior histórico", lowestReturn?.category ?? "n/d", formatPercent(lowestReturn?.averageForwardReturn ?? null)],
        ].map(([label, value, detail]) => (
          <div key={label} className="border border-line bg-panelSoft p-3">
            <p className="text-[11px] uppercase tracking-[0.11em] text-muted">{label}</p>
            <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
            <p className="mt-1 text-xs text-muted">{detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">Respecto al rango previo</h3>
          <div className="mt-4">
            <CategoryBars rows={location?.range ?? []} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink">Respecto al cierre previo</h3>
          <div className="mt-4">
            <CategoryBars rows={location?.close ?? []} />
          </div>
        </div>
      </div>
        </>
      )}
    </section>
  );
}
