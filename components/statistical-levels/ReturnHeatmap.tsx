import type { AssetStatRecord, PeriodExplorerRow, StatisticalFrequency } from "@/lib/statistical-levels/types";
import { Fragment } from "react";

type ReturnHeatmapProps = {
  asset: AssetStatRecord | null;
  frequency: StatisticalFrequency;
};

function color(value: number | null) {
  if (value === null) return "#efebe6";
  const intensity = Math.min(Math.abs(value) / 0.08, 1);
  if (value > 0) return `rgba(111, 143, 123, ${0.22 + intensity * 0.58})`;
  if (value < 0) return `rgba(168, 100, 100, ${0.20 + intensity * 0.58})`;
  return "#e8e3dc";
}

function formatPercent(value: number | null) {
  if (value === null) return "n/d";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

function monthlyRows(rows: PeriodExplorerRow[]) {
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const years = Array.from(new Set(rows.map((row) => row.period.slice(0, 4)))).sort().reverse().slice(0, 6);
  return { months, years, rows };
}

export function ReturnHeatmap({ asset, frequency }: ReturnHeatmapProps) {
  const rows = asset?.frequencies[frequency].recentPeriods ?? [];
  const monthly = frequency === "monthly" ? monthlyRows(rows) : null;
  const compactRows = rows.slice(0, frequency === "daily" ? 63 : 52).reverse();

  return (
    <section className="border border-line bg-panel p-5 md:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Retornos</p>
      <h2 className="mt-2 text-2xl font-semibold text-ink">Mapa de retornos por calendario</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
        El mapa muestra retornos históricos por periodo. No representa estacionalidad garantizada ni dirección futura.
      </p>
      {monthly ? (
        <div className="mt-5 overflow-x-auto">
          <div className="grid min-w-[720px] gap-1" style={{ gridTemplateColumns: "4rem repeat(12, minmax(3rem, 1fr))" }}>
            <div />
            {monthly.months.map((month) => <div key={month} className="text-center text-xs font-semibold text-muted">{month}</div>)}
            {monthly.years.map((year) => (
              <Fragment key={year}>
                <div key={`${year}-label`} className="py-2 text-sm font-semibold text-ink">{year}</div>
                {monthly.months.map((_, index) => {
                  const row = rows.find((item) => item.period.startsWith(`${year}-${String(index + 1).padStart(2, "0")}`));
                  return (
                    <div key={`${year}-${index}`} className="min-h-10 p-1 text-center text-[11px] font-semibold text-ink" style={{ backgroundColor: color(row?.change ?? null) }}>
                      {row ? formatPercent(row.change) : ""}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(1.35rem, 1fr))" }}>
          {compactRows.map((row) => (
            <div
              key={row.period}
              title={`${row.period} · ${formatPercent(row.change)}`}
              className="aspect-square min-h-6 border border-white"
              style={{ backgroundColor: color(row.change) }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
