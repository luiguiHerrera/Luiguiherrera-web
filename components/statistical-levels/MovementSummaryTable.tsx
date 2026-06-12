import type { AssetStatRecord, ChangeMoveMetric, StatisticalFrequency } from "@/lib/statistical-levels/types";

type MovementSummaryTableProps = {
  asset: AssetStatRecord | null;
  frequency: StatisticalFrequency;
};

const labels: Record<ChangeMoveMetric, string> = {
  change: "change",
  openGap: "openGap",
  highExtensionFromOpen: "high desde apertura",
  lowExtensionFromOpen: "low desde apertura",
  highExtensionFromPrevClose: "high desde cierre previo",
  lowExtensionFromPrevClose: "low desde cierre previo",
  closeLocation: "closeLocation",
  upperFade: "upperFade",
  lowerRecovery: "lowerRecovery",
  range: "range",
};

const visibleMetrics: ChangeMoveMetric[] = ["change", "openGap", "highExtensionFromOpen", "lowExtensionFromOpen", "range", "closeLocation"];
const miniMetrics: ChangeMoveMetric[] = ["change", "openGap", "range", "closeLocation"];

function formatStat(value: number | null, isRatio = true) {
  if (value === null) return "n/d";
  if (!isRatio) return value.toFixed(2);
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

export function MovementSummaryTable({ asset, frequency }: MovementSummaryTableProps) {
  const data = asset?.frequencies[frequency].changeMoves;
  return (
    <section className="border border-line bg-panel p-5 md:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Resumen de movimientos</p>
      <h2 className="mt-2 text-2xl font-semibold text-ink">{asset ? asset.ticker : "Sin activo seleccionado"}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
        Distribución histórica de cambios por periodo. Es una lectura estadística de comportamiento pasado; no implica dirección futura.
      </p>
      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        {miniMetrics.map((metric) => {
          const row = data?.[metric];
          const min = row?.min ?? null;
          const max = row?.max ?? null;
          const span = min !== null && max !== null && max !== min ? max - min : 1;
          const left = row?.p25 === null || min === null ? 0 : ((row?.p25 ?? 0) - min) / span * 100;
          const width = row?.p75 === null || min === null ? 0 : (((row?.p75 ?? 0) - (row?.p25 ?? 0)) / span) * 100;
          const median = row?.p50 === null || min === null ? null : (((row?.p50 ?? 0) - min) / span) * 100;
          return (
            <div key={metric} className="border border-line bg-panelSoft p-4">
              <p className="text-sm font-semibold text-ink">{labels[metric]}</p>
              <div className="relative mt-4 h-2 bg-white">
                <div className="absolute top-1/2 h-px w-full -translate-y-1/2 bg-[#d8d2ca]" />
                <div className="absolute top-0 h-2 bg-[#cfdcd3]" style={{ left: `${left}%`, width: `${width}%` }} />
                {median !== null ? <div className="absolute top-1/2 h-4 w-px -translate-y-1/2 bg-ink" style={{ left: `${median}%` }} /> : null}
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted">
                <span>{formatStat(row?.min ?? null, metric !== "closeLocation")}</span>
                <span>{formatStat(row?.max ?? null, metric !== "closeLocation")}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[780px] border-collapse text-left text-sm">
          <thead className="text-muted">
            <tr className="border-b border-line">
              <th className="py-3 pr-4 font-medium">Métrica</th>
              <th className="py-3 pr-4 font-medium">mean</th>
              <th className="py-3 pr-4 font-medium">std</th>
              <th className="py-3 pr-4 font-medium">p25</th>
              <th className="py-3 pr-4 font-medium">p50</th>
              <th className="py-3 pr-4 font-medium">p75</th>
              <th className="py-3 pr-4 font-medium">max</th>
              <th className="py-3 pr-4 font-medium">min</th>
            </tr>
          </thead>
          <tbody>
            {visibleMetrics.map((metric) => {
              const row = data?.[metric];
              const isRatio = metric !== "closeLocation";
              return (
                <tr key={metric} className="border-b border-line/70">
                  <td className="py-4 pr-4 font-semibold text-ink">{labels[metric]}</td>
                  <td className="py-4 pr-4 text-muted">{formatStat(row?.mean ?? null, isRatio)}</td>
                  <td className="py-4 pr-4 text-muted">{formatStat(row?.std ?? null, isRatio)}</td>
                  <td className="py-4 pr-4 text-muted">{formatStat(row?.p25 ?? null, isRatio)}</td>
                  <td className="py-4 pr-4 text-muted">{formatStat(row?.p50 ?? null, isRatio)}</td>
                  <td className="py-4 pr-4 text-muted">{formatStat(row?.p75 ?? null, isRatio)}</td>
                  <td className="py-4 pr-4 text-muted">{formatStat(row?.max ?? null, isRatio)}</td>
                  <td className="py-4 pr-4 text-muted">{formatStat(row?.min ?? null, isRatio)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
