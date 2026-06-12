import type { AssetStatRecord, MlFeatureSet, StatisticalFrequency } from "@/lib/statistical-levels/types";

type MlFeaturesPanelProps = {
  assets: AssetStatRecord[];
  frequency: StatisticalFrequency;
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

export function MlFeaturesPanel({ assets, frequency }: MlFeaturesPanelProps) {
  return (
    <details className="border border-line bg-panel p-5 md:p-6">
      <summary className="cursor-pointer text-2xl font-semibold text-ink">Lecturas útiles para modelos</summary>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
        Estas variables pueden servir como insumos para análisis cuantitativo. No indican una instrucción operativa ni dirección futura.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-5">
        {featureGroups.map(([group, items]) => (
          <div key={group} className="border border-line bg-panelSoft p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brass">{group}</p>
            <p className="mt-2 text-xs leading-5 text-muted">{items.map(([, label]) => label).join(" · ")}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="text-muted">
            <tr className="border-b border-line">
              <th className="py-3 pr-4 font-medium">Activo</th>
              {featureGroups.flatMap(([, items]) => items).map(([, label]) => <th key={label} className="py-3 pr-4 font-medium">{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => {
              const features = asset.frequencies[frequency].mlFeatures;
              return (
                <tr key={asset.ticker} className="border-b border-line/70">
                  <td className="py-4 pr-4 font-semibold text-ink">{asset.ticker}</td>
                  {featureGroups.flatMap(([, items]) => items).map(([key]) => <td key={key} className="py-4 pr-4 text-muted">{formatFeature(features[key])}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}
