"use client";

import { useMemo, useState } from "react";
import { AssetComparisonTable } from "@/components/statistical-levels/AssetComparisonTable";
import { AssetSelector } from "@/components/statistical-levels/AssetSelector";
import { AssetStatCard } from "@/components/statistical-levels/AssetStatCard";
import { CalendarExtremesPanel } from "@/components/statistical-levels/CalendarExtremesPanel";
import { CorrelationMiniMatrix } from "@/components/statistical-levels/CorrelationMiniMatrix";
import { FocusedAssetPanel } from "@/components/statistical-levels/FocusedAssetPanel";
import { LabOverviewStrip } from "@/components/statistical-levels/LabOverviewStrip";
import { MlFeaturesPanel } from "@/components/statistical-levels/MlFeaturesPanel";
import { MovementSummaryTable } from "@/components/statistical-levels/MovementSummaryTable";
import { OpeningLocationPanel } from "@/components/statistical-levels/OpeningLocationPanel";
import { PeriodExplorerTable } from "@/components/statistical-levels/PeriodExplorerTable";
import { PositioningScatter } from "@/components/statistical-levels/PositioningScatter";
import { ReturnHeatmap } from "@/components/statistical-levels/ReturnHeatmap";
import { UnderwaterDrawdownChart } from "@/components/statistical-levels/UnderwaterDrawdownChart";
import { defaultStatisticalSelection } from "@/lib/statistical-levels/asset-universe";
import { statisticalLevelsData } from "@/lib/statistical-levels/generated-data";
import type { AssetDataStatus, AssetStatRecord, StatisticalFrequency, StatisticalWindow } from "@/lib/statistical-levels/types";

const statusLabels: Record<AssetDataStatus, string> = {
  ok: "Datos ok",
  limited_history: "Historial limitado",
  unavailable: "No disponible",
};

const frequencyLabels: Record<StatisticalFrequency, string> = {
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
};

export function StatLevelsLab() {
  const assets = statisticalLevelsData.assets as readonly AssetStatRecord[];
  const availableDefaults = defaultStatisticalSelection.filter((ticker) => assets.some((asset) => asset.ticker === ticker));
  const [selected, setSelected] = useState<string[]>(availableDefaults.slice(0, 5));
  const [query, setQuery] = useState("");
  const [window, setWindow] = useState<StatisticalWindow>(statisticalLevelsData.defaultWindow);
  const [frequency, setFrequency] = useState<StatisticalFrequency>(statisticalLevelsData.defaultFrequency);
  const [focusTicker, setFocusTicker] = useState<string | null>(availableDefaults[0] ?? null);

  const selectedAssets = useMemo(
    () =>
      selected
        .map((ticker) => assets.find((asset) => asset.ticker === ticker))
        .filter((asset): asset is AssetStatRecord => asset !== undefined),
    [assets, selected],
  );

  const statusCounts = useMemo(() => {
    return assets.reduce(
      (counts, asset) => {
        counts[asset.status] += 1;
        return counts;
      },
      { ok: 0, limited_history: 0, unavailable: 0 } as Record<AssetDataStatus, number>,
    );
  }, [assets]);

  function toggleAsset(ticker: string) {
    setSelected((current) => {
      if (current.includes(ticker)) {
        const next = current.filter((item) => item !== ticker);
        if (focusTicker === ticker) setFocusTicker(next[0] ?? null);
        return next;
      }
      if (current.length >= 5) return current;
      if (!focusTicker) setFocusTicker(ticker);
      return [...current, ticker];
    });
  }

  const primaryAsset = selectedAssets.find((asset) => asset.ticker === focusTicker) ?? selectedAssets[0] ?? null;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="border border-line bg-panel p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{statusLabels[status as AssetDataStatus]}</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{count}</p>
          </div>
        ))}
      </section>

      <AssetSelector catalog={statisticalLevelsData.catalog} query={query} selected={selected} setQuery={setQuery} toggleAsset={toggleAsset} />

      <section className="border border-line bg-panel p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Frecuencia y ventana comparable</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink">Prioriza semanal y mensual para reducir ruido</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              La frecuencia semanal y mensual reduce ruido de corto plazo y puede ser más útil para análisis de régimen y modelos cuantitativos.
              No implica mejor capacidad predictiva por sí sola.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex w-fit flex-wrap border border-line bg-panelSoft p-1">
              {statisticalLevelsData.frequencies.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFrequency(item)}
                  className={`min-h-10 px-4 text-sm font-semibold transition ${frequency === item ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
                >
                  {frequencyLabels[item]}
                </button>
              ))}
            </div>
            <div className="flex w-fit flex-wrap border border-line bg-panelSoft p-1">
              {statisticalLevelsData.windows.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setWindow(item)}
                  className={`min-h-10 px-4 text-sm font-semibold transition ${window === item ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-3 border-t border-line pt-5 text-sm text-muted md:grid-cols-3">
          <p><span className="font-semibold text-ink">Frecuencia:</span> {frequencyLabels[frequency]}</p>
          <p><span className="font-semibold text-ink">Ventana:</span> {window}</p>
          <p><span className="font-semibold text-ink">Actualización:</span> {statisticalLevelsData.generatedAt}</p>
          <p className="md:col-span-3"><span className="font-semibold text-ink">Fuente:</span> {statisticalLevelsData.source}</p>
        </div>
      </section>

      <LabOverviewStrip assets={selectedAssets} frequency={frequency} window={window} />
      <PositioningScatter assets={selectedAssets} frequency={frequency} window={window} />

      <section className="grid gap-5 xl:grid-cols-2">
        {selectedAssets.map((asset) => <AssetStatCard key={asset.ticker} asset={asset} frequency={frequency} window={window} />)}
      </section>

      <FocusedAssetPanel assets={selectedAssets} focusTicker={primaryAsset?.ticker ?? null} setFocusTicker={setFocusTicker} frequency={frequency} window={window} />
      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <UnderwaterDrawdownChart asset={primaryAsset} frequency={frequency} window={window} />
        <ReturnHeatmap asset={primaryAsset} frequency={frequency} />
      </div>
      <MovementSummaryTable asset={primaryAsset} frequency={frequency} />
      <OpeningLocationPanel asset={primaryAsset} frequency={frequency} />
      <CalendarExtremesPanel asset={primaryAsset} frequency={frequency} />
      <PeriodExplorerTable asset={primaryAsset} frequency={frequency} />
      <AssetComparisonTable assets={selectedAssets} frequency={frequency} window={window} />
      <CorrelationMiniMatrix assets={selectedAssets} frequency={frequency} window={window} />
      <MlFeaturesPanel assets={selectedAssets} frequency={frequency} />

      <section className="border border-line bg-panel p-5 md:p-6">
        <h2 className="text-2xl font-semibold text-ink">Cómo leer esta herramienta</h2>
        <div className="mt-5 grid gap-5 text-sm leading-6 text-muted md:grid-cols-2">
          <p><span className="font-semibold text-ink">Z-score:</span> mide cuántas desviaciones se aleja una métrica de su media histórica dentro de la ventana seleccionada.</p>
          <p><span className="font-semibold text-ink">Percentil:</span> ubica el dato actual frente a observaciones previas de la misma ventana.</p>
          <p><span className="font-semibold text-ink">Drawdown:</span> muestra distancia desde el máximo de la ventana; no implica recuperación ni continuidad.</p>
          <p><span className="font-semibold text-ink">Distancia a media:</span> compara el precio con medias móviles adaptadas a frecuencia diaria, semanal o mensual.</p>
          <p><span className="font-semibold text-ink">Histórico completo:</span> puede mezclar regímenes muy distintos; úsalo como contexto amplio, no como verdad única.</p>
          <p><span className="font-semibold text-ink">Limitación:</span> una lectura estadísticamente alta no significa que el activo deba caer. Una lectura estadísticamente baja no significa que el activo deba subir.</p>
        </div>
      </section>
    </div>
  );
}
