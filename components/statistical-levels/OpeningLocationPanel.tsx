"use client";

import { useState } from "react";
import type { AssetStatRecord, OpeningCategoryStats, StatisticalFrequency } from "@/lib/statistical-levels/types";

type OpeningLocationPanelProps = {
  asset: AssetStatRecord | null;
  frequency: StatisticalFrequency;
  locale?: "es" | "en";
};

function formatPercent(value: number | null) {
  if (value === null) return "n/d";
  return `${(value * 100).toFixed(1)}%`;
}

function categoryLabel(value: string, locale: "es" | "en") {
  if (locale === "es") return value;
  const labels: Record<string, string> = {
    "Cierre cerca del mínimo": "Close near the low",
    "Cierre en zona media": "Close in the middle zone",
    "Cierre cerca del máximo": "Close near the high",
    "Above previous range": "Above previous range",
    "Inside previous range": "Inside previous range",
    "Below previous range": "Below previous range",
    "Above previous close": "Above prior close",
    "Near previous close": "Near prior close",
    "Below previous close": "Below prior close",
  };
  return labels[value] ?? value;
}

function CategoryBars({ locale, rows }: { locale: "es" | "en"; rows: OpeningCategoryStats[] }) {
  const copy = locale === "en"
    ? { behavior: "Historical forward behavior", vol: "Average vol.", positive: "Positive periods" }
    : { behavior: "Comportamiento posterior histórico", vol: "Vol. media", positive: "Positivos" };
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.category}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-ink">{categoryLabel(row.category, locale)}</span>
            <span className="text-muted">{formatPercent(row.proportion)}</span>
          </div>
          <div className="mt-2 h-2 bg-panelSoft">
            <div className="h-2 bg-[#7f9386]" style={{ width: `${Math.max((row.proportion ?? 0) * 100, row.count ? 2 : 0)}%` }} />
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">
            {copy.behavior}: {formatPercent(row.averageForwardReturn)} · {copy.vol} {formatPercent(row.averageVolatility)} · {copy.positive} {formatPercent(row.positiveRate)}
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

function cleanAverage(values: Array<number | null>) {
  return average(values.filter((value): value is number => value !== null && Number.isFinite(value)));
}

export function OpeningLocationPanel({ asset, frequency, locale = "es" }: OpeningLocationPanelProps) {
  const [mode, setMode] = useState<"opening" | "close">("opening");
  const location = asset?.frequencies[frequency].openingLocation;
  const periods = asset?.frequencies[frequency].recentPeriods ?? [];
  const openToCloseReturns = periods
    .map((row) => (row.open && row.close && row.open > 0 ? row.close / row.open - 1 : null))
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const openToCloseAverage = average(openToCloseReturns);
  const closeAboveOpenRate = openToCloseReturns.length ? openToCloseReturns.filter((value) => value > 0).length / openToCloseReturns.length : null;
  const openToCloseReading =
    openToCloseAverage === null
      ? locale === "en" ? "Recent history is not enough to summarize session vs open." : "Historial reciente insuficiente para resumir sesión vs apertura."
      : openToCloseAverage >= 0
        ? locale === "en" ? "In the recent sample, closes tend to finish above the open." : "En la muestra reciente, el cierre tiende a quedar por encima de la apertura."
        : locale === "en" ? "In the recent sample, closes tend to finish below the open." : "En la muestra reciente, el cierre tiende a quedar por debajo de la apertura.";
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
    return {
      category: bucket.category,
      count: rows.length,
      proportion: periods.length ? rows.length / periods.length : 0,
      averageForwardReturn: average(changes),
      averageVolatility: cleanAverage(rows.map((row) => row.range)),
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
          <h2 className="mt-2 text-xl font-semibold text-ink">{mode === "opening" ? (locale === "en" ? "Opening location" : "Ubicación de apertura") : (locale === "en" ? "Close location" : "Ubicación de cierre")}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            {mode === "opening"
              ? locale === "en" ? "Opening location places the current open against the prior range and prior close." : "Opening location ubica la apertura actual frente al rango y al cierre previos."
              : locale === "en" ? "Close location places each close inside its own period high-low range. Use the session summary for close versus open." : "Close location ubica cada cierre dentro del máximo-mínimo de su propio periodo. Para comparar cierre contra apertura, revisa el resumen de sesión."}
          </p>
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
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_2fr]">
        {[
          [locale === "en" ? "Session vs open" : "Sesión vs apertura", locale === "en" ? "Average close/open return" : "Retorno medio cierre/apertura", formatPercent(openToCloseAverage)],
          [locale === "en" ? "Closes above open" : "Cierres sobre apertura", locale === "en" ? "Share of periods" : "Proporción de periodos", formatPercent(closeAboveOpenRate)],
          [locale === "en" ? "Brief reading" : "Lectura breve", "Open to Close", openToCloseReading],
        ].map(([label, detail, value]) => (
          <div key={label} className="border border-line bg-panelSoft p-3">
            <p className="text-[11px] uppercase tracking-[0.11em] text-muted">{label}</p>
            <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
            <p className="mt-1 text-xs text-muted">{detail}</p>
          </div>
        ))}
      </div>
      {mode === "close" ? (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              [locale === "en" ? "Highest frequency" : "Mayor frecuencia", categoryLabel(mostFrequentCloseLocation?.category ?? "n/d", locale), formatPercent(mostFrequentCloseLocation?.proportion ?? null)],
              [locale === "en" ? "Strongest historical change" : "Mayor cambio histórico", categoryLabel(strongestCloseLocation?.category ?? "n/d", locale), formatPercent(strongestCloseLocation?.averageForwardReturn ?? null)],
              [locale === "en" ? "Weakest historical change" : "Menor cambio histórico", categoryLabel(weakestCloseLocation?.category ?? "n/d", locale), formatPercent(weakestCloseLocation?.averageForwardReturn ?? null)],
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
                <h3 className="text-sm font-semibold text-ink">{locale === "en" ? "Close distribution inside the range" : "Distribución del cierre dentro del rango"}</h3>
                <div className="mt-4">
                  <CategoryBars locale={locale} rows={closeRows} />
                </div>
              </>
            ) : (
              <p className="text-sm leading-6 text-muted">{locale === "en" ? "Close location is pending enough data." : "Close location pendiente de datos suficientes."}</p>
            )}
          </div>
        </>
      ) : (
        <>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {[
          [locale === "en" ? "Most frequent range" : "Mayor frecuencia rango", categoryLabel(mostFrequentRange?.category ?? "n/d", locale), formatPercent(mostFrequentRange?.proportion ?? null)],
          [locale === "en" ? "Most frequent close" : "Mayor frecuencia cierre", categoryLabel(mostFrequentClose?.category ?? "n/d", locale), formatPercent(mostFrequentClose?.proportion ?? null)],
          [locale === "en" ? "Strongest historical forward return" : "Mayor retorno posterior histórico", categoryLabel(highestReturn?.category ?? "n/d", locale), formatPercent(highestReturn?.averageForwardReturn ?? null)],
          [locale === "en" ? "Weakest historical forward return" : "Menor retorno posterior histórico", categoryLabel(lowestReturn?.category ?? "n/d", locale), formatPercent(lowestReturn?.averageForwardReturn ?? null)],
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
          <h3 className="text-sm font-semibold text-ink">{locale === "en" ? "Relative to prior range" : "Respecto al rango previo"}</h3>
          <div className="mt-4">
            <CategoryBars locale={locale} rows={location?.range ?? []} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink">{locale === "en" ? "Relative to prior close" : "Respecto al cierre previo"}</h3>
          <div className="mt-4">
            <CategoryBars locale={locale} rows={location?.close ?? []} />
          </div>
        </div>
      </div>
        </>
      )}
    </section>
  );
}
