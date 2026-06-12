import { Fragment } from "react";
import { correlation } from "@/lib/statistical-levels/calculations";
import type { AssetStatRecord, StatisticalFrequency, StatisticalWindow } from "@/lib/statistical-levels/types";

type CorrelationMiniMatrixProps = {
  assets: AssetStatRecord[];
  frequency: StatisticalFrequency;
  window: StatisticalWindow;
};

function tone(value: number | null) {
  if (value === null) return "bg-panelSoft text-muted";
  if (value > 0.75) return "bg-[#dfe9e4] text-[#385242]";
  if (value > 0.35) return "bg-[#eef3f2] text-[#47604f]";
  if (value < -0.35) return "bg-[#f5e8e8] text-[#7b3f3f]";
  return "bg-panelSoft text-muted";
}

export function CorrelationMiniMatrix({ assets, frequency, window }: CorrelationMiniMatrixProps) {
  const available = assets.filter((asset) => asset.frequencies[frequency].windows[window].windowReturns.length >= 20);
  if (available.length < 2) {
    return (
      <section className="border border-line bg-panel p-5 md:p-6">
        <h2 className="text-2xl font-semibold text-ink">Correlación</h2>
        <p className="mt-3 text-sm leading-6 text-muted">Historial insuficiente para calcular matriz entre activos seleccionados.</p>
      </section>
    );
  }

  return (
    <section className="border border-line bg-panel p-5 md:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Correlación</p>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <h2 className="mt-2 text-2xl font-semibold text-ink">Relación reciente entre seleccionados</h2>
        <div className="flex gap-2 text-xs text-muted">
          <span className="border border-line bg-panelSoft px-2 py-1">baja</span>
          <span className="border border-line bg-[#eef3f2] px-2 py-1">media</span>
          <span className="border border-line bg-[#dfe9e4] px-2 py-1">alta</span>
        </div>
      </div>
      <div className="mt-5 overflow-x-auto">
        <div className="grid min-w-[520px]" style={{ gridTemplateColumns: `8rem repeat(${available.length}, minmax(4.5rem, 1fr))` }}>
          <div />
          {available.map((asset) => <div key={asset.ticker} className="border-b border-line p-2 text-center text-xs font-semibold text-muted">{asset.ticker}</div>)}
          {available.map((row) => (
            <Fragment key={row.ticker}>
              <div className="border-b border-line p-2 text-sm font-semibold text-ink">{row.ticker}</div>
              {available.map((column) => {
                const value =
                  row.ticker === column.ticker
                    ? 1
                    : correlation(row.frequencies[frequency].windows[window].windowReturns, column.frequencies[frequency].windows[window].windowReturns);
                return (
                  <div key={`${row.ticker}-${column.ticker}`} className={`border-b border-line p-2 text-center text-sm font-semibold ${tone(value)}`}>
                    {value === null ? "n/d" : value.toFixed(2)}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
