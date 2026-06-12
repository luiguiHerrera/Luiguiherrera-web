import type { AssetStatRecord, StatisticalFrequency, StatisticalWindow } from "@/lib/statistical-levels/types";

type AssetComparisonTableProps = {
  assets: AssetStatRecord[];
  frequency: StatisticalFrequency;
  window: StatisticalWindow;
};

function formatPercent(value: number | null) {
  if (value === null) return "n/d";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

function zBar(value: number | null) {
  if (value === null) return 0;
  return Math.min(Math.abs(value) / 3, 1) * 50;
}

export function AssetComparisonTable({ assets, frequency, window }: AssetComparisonTableProps) {
  return (
    <section className="border border-line bg-panel p-5 md:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Comparativo</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">Ranking relativo de seleccionados</h2>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left text-sm">
          <thead className="text-muted">
            <tr className="border-b border-line">
              <th className="py-3 pr-4 font-medium">Activo</th>
              <th className="py-3 pr-4 font-medium">Extensión z</th>
              <th className="py-3 pr-4 font-medium">Drawdown</th>
              <th className="py-3 pr-4 font-medium">Volatilidad</th>
              <th className="py-3 pr-4 font-medium">Retorno 4P</th>
              <th className="py-3 pr-4 font-medium">Retorno 12P</th>
              <th className="py-3 pr-4 font-medium">Distancia media larga</th>
              <th className="py-3 pr-4 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => {
              const frequencyData = asset.frequencies[frequency];
              const metric = frequencyData.windows[window];
              const z = metric.ma200ExtensionZScore;
              const isPositive = (z ?? 0) >= 0;
              const width = zBar(z);
              const longMa = frequencyData.longMovingAverageKey;
              return (
                <tr key={asset.ticker} className="border-b border-line/70">
                  <td className="py-4 pr-4">
                    <span className="font-semibold text-ink">{asset.ticker}</span>
                    <span className="ml-2 text-xs text-muted">{asset.category}</span>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="grid grid-cols-[1fr_3rem] items-center gap-3">
                      <svg viewBox="0 0 100 10" className="h-4 w-full" preserveAspectRatio="none" aria-hidden="true">
                        <line x1="4" x2="96" y1="5" y2="5" stroke="#e7e2dc" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
                        <line x1="50" x2="50" y1="1" y2="9" stroke="#b8b2aa" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                        {z !== null ? <rect x={isPositive ? 50 : 50 - width} y="3" width={width} height="4" rx="1" fill={isPositive ? "#6f8f7b" : "#a86464"} /> : null}
                      </svg>
                      <span className="text-right font-semibold text-ink">{z === null ? "n/d" : z.toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-muted">{formatPercent(metric.currentDrawdown)}</td>
                  <td className="py-4 pr-4 text-muted">{formatPercent(metric.annualizedVolatilityWindow)}</td>
                  <td className="py-4 pr-4 text-muted">{formatPercent(frequencyData.returns["4P"])}</td>
                  <td className="py-4 pr-4 text-muted">{formatPercent(frequencyData.returns["12P"])}</td>
                  <td className="py-4 pr-4 text-muted">{formatPercent(frequencyData.distanceToMovingAverages[longMa] ?? null)}</td>
                  <td className="py-4 pr-4 text-muted">{frequencyData.status === "ok" ? "Disponible" : frequencyData.status === "limited_history" ? "Limitado" : "No disponible"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
