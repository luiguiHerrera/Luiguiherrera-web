import { PercentileRangeBar } from "@/components/statistical-levels/PercentileRangeBar";
import type { AssetStatRecord, StatisticalFrequency, StatisticalWindow } from "@/lib/statistical-levels/types";

type FocusedAssetPanelProps = {
  assets: AssetStatRecord[];
  focusTicker: string | null;
  setFocusTicker: (ticker: string) => void;
  frequency: StatisticalFrequency;
  window: StatisticalWindow;
};

function formatPercent(value: number | null) {
  if (value === null) return "n/d";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number | null) {
  if (value === null) return "n/d";
  return value.toFixed(2);
}

export function FocusedAssetPanel({ assets, focusTicker, setFocusTicker, frequency, window }: FocusedAssetPanelProps) {
  const focus = assets.find((asset) => asset.ticker === focusTicker) ?? assets[0] ?? null;
  const data = focus?.frequencies[frequency];
  const metric = data?.windows[window];
  const longMa = data?.longMovingAverageKey;

  return (
    <section className="border border-line bg-panel p-4 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Activo foco</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">{focus ? `${focus.ticker} · ${focus.name}` : "Selecciona un activo"}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Los paneles detallados usan este activo como foco. Cambiarlo no guarda información ni altera datos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {assets.map((asset) => (
            <button
              key={asset.ticker}
              type="button"
              onClick={() => setFocusTicker(asset.ticker)}
              className={`min-h-9 border px-3 text-sm font-semibold transition ${
                focus?.ticker === asset.ticker ? "border-ink bg-ink text-white" : "border-line bg-panelSoft text-muted hover:text-ink"
              }`}
            >
              {asset.ticker}
            </button>
          ))}
        </div>
      </div>
      {focus && data && metric ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="border border-line bg-panelSoft p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Clasificación estadística</p>
              <p className="mt-2 text-xl font-semibold text-ink">{metric.extensionLabel}</p>
            </div>
            <div className="border border-line bg-panelSoft p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Z-score extensión</p>
              <p className="mt-2 text-xl font-semibold text-ink">{formatNumber(metric.ma200ExtensionZScore)}</p>
            </div>
            <div className="border border-line bg-panelSoft p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Drawdown actual</p>
              <p className="mt-2 text-xl font-semibold text-ink">{formatPercent(metric.currentDrawdown)}</p>
            </div>
            <div className="border border-line bg-panelSoft p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Distancia {longMa}</p>
              <p className="mt-2 text-xl font-semibold text-ink">{formatPercent(data.distanceToMovingAverages[longMa] ?? null)}</p>
            </div>
          </div>
          <div className="space-y-5 border border-line bg-panelSoft p-4">
            <PercentileRangeBar label="Percentil extensión" value={metric.ma200ExtensionPercentile} />
            <PercentileRangeBar label="Percentil volatilidad" value={metric.volatilityPercentile} />
            <PercentileRangeBar label="Percentil drawdown" value={metric.drawdownPercentile} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
