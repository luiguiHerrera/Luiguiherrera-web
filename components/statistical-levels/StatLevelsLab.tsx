"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AssetComparisonTable } from "@/components/statistical-levels/AssetComparisonTable";
import { AssetSelector } from "@/components/statistical-levels/AssetSelector";
import { AssetStatCard } from "@/components/statistical-levels/AssetStatCard";
import { CalendarExtremesPanel } from "@/components/statistical-levels/CalendarExtremesPanel";
import { CorrelationMiniMatrix } from "@/components/statistical-levels/CorrelationMiniMatrix";
import { DailySeasonalityPanel } from "@/components/statistical-levels/DailySeasonalityPanel";
import { FocusedAssetPanel } from "@/components/statistical-levels/FocusedAssetPanel";
import { KeyStatisticalLevelsPanel } from "@/components/statistical-levels/KeyStatisticalLevelsPanel";
import { LabOverviewStrip } from "@/components/statistical-levels/LabOverviewStrip";
import { MlFeaturesPanel } from "@/components/statistical-levels/MlFeaturesPanel";
import { MovementSummaryTable } from "@/components/statistical-levels/MovementSummaryTable";
import { OpeningLocationPanel } from "@/components/statistical-levels/OpeningLocationPanel";
import { PeriodExplorerTable } from "@/components/statistical-levels/PeriodExplorerTable";
import { PositioningScatter } from "@/components/statistical-levels/PositioningScatter";
import { ReturnHeatmap } from "@/components/statistical-levels/ReturnHeatmap";
import { UnderwaterDrawdownChart } from "@/components/statistical-levels/UnderwaterDrawdownChart";
import type { AssetDataStatus, AssetStatRecord, DailySeasonalityData, StatisticalFrequency, StatisticalLevelsManifest, StatisticalWindow } from "@/lib/statistical-levels/types";

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

type StatLevelsLabProps = {
  asset: AssetStatRecord;
  manifest: StatisticalLevelsManifest;
  seasonality: DailySeasonalityData;
  selection: {
    asset: string;
    frequency: StatisticalFrequency;
    window: StatisticalWindow;
  };
};

export function StatLevelsLab({ asset, manifest, seasonality, selection }: StatLevelsLabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const assets = useMemo(() => [asset], [asset]);
  const [query, setQuery] = useState("");
  const selectedAssets = assets;
  const statusCounts = manifest.statusCounts;
  const frequency = selection.frequency;
  const window = selection.window;
  const primaryAsset = asset;

  function navigate(next: Partial<{ asset: string; frequency: StatisticalFrequency; window: StatisticalWindow }>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("asset", next.asset ?? selection.asset);
    params.set("frequency", next.frequency ?? frequency);
    params.set("window", next.window ?? window);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="min-w-0 space-y-4 md:space-y-5">
      <section className="grid gap-3 md:grid-cols-3 md:gap-4">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="border border-line bg-panel p-3.5 md:p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{statusLabels[status as AssetDataStatus]}</p>
            <p className="mt-2 text-xl font-semibold text-ink">{count}</p>
          </div>
        ))}
      </section>

      <AssetSelector catalog={manifest.catalog} query={query} selected={[asset.ticker]} setQuery={setQuery} selectAsset={(ticker) => navigate({ asset: ticker })} />

      <section className="border border-line bg-panel p-3.5 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Frecuencia y ventana comparable</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">Prioriza semanal y mensual para reducir ruido</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              La frecuencia semanal y mensual reduce ruido de corto plazo y puede ser más útil para análisis de régimen y modelos cuantitativos.
              No implica dirección futura por sí sola.
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-2.5 md:gap-3">
            <div className="flex w-full flex-wrap border border-line bg-panelSoft p-1 sm:w-fit">
              {manifest.frequencies.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => navigate({ frequency: item })}
                  className={`min-h-9 flex-1 px-3 text-sm font-semibold transition sm:flex-none md:px-4 ${frequency === item ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
                >
                  {frequencyLabels[item]}
                </button>
              ))}
            </div>
            <div className="flex w-full flex-wrap border border-line bg-panelSoft p-1 sm:w-fit">
              {manifest.windows.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => navigate({ window: item })}
                  className={`min-h-9 flex-1 px-3 text-sm font-semibold transition sm:flex-none md:px-4 ${window === item ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
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
          <p><span className="font-semibold text-ink">Actualización:</span> {manifest.generatedAt}</p>
          <p className="md:col-span-3"><span className="font-semibold text-ink">Fuente:</span> {manifest.source}</p>
        </div>
      </section>

      <LabOverviewStrip assets={selectedAssets} frequency={frequency} window={window} />
      <PositioningScatter assets={selectedAssets} frequency={frequency} window={window} />

      <section className="grid gap-5 xl:grid-cols-2">
        {selectedAssets.map((asset) => <AssetStatCard key={asset.ticker} asset={asset} frequency={frequency} window={window} />)}
      </section>

      <FocusedAssetPanel assets={selectedAssets} focusTicker={primaryAsset?.ticker ?? null} setFocusTicker={(ticker) => navigate({ asset: ticker })} frequency={frequency} window={window} />
      <KeyStatisticalLevelsPanel asset={primaryAsset} />
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <UnderwaterDrawdownChart asset={primaryAsset} frequency={frequency} window={window} />
        <ReturnHeatmap asset={primaryAsset} frequency={frequency} />
      </div>
      <MovementSummaryTable asset={primaryAsset} frequency={frequency} />
      <OpeningLocationPanel asset={primaryAsset} frequency={frequency} />
      <CalendarExtremesPanel asset={primaryAsset} frequency={frequency} />
      <DailySeasonalityPanel
        catalog={manifest.catalog}
        data={seasonality}
        generatedAt={manifest.generatedAt}
        initialTicker={primaryAsset?.ticker ?? null}
      />
      <PeriodExplorerTable asset={primaryAsset} frequency={frequency} />
      <AssetComparisonTable assets={selectedAssets} frequency={frequency} window={window} />
      <CorrelationMiniMatrix assets={selectedAssets} frequency={frequency} window={window} />
      <MlFeaturesPanel assets={selectedAssets} frequency={frequency} focusAsset={primaryAsset} />

      <section className="border border-line bg-panel p-4 md:p-5">
        <h2 className="text-xl font-semibold text-ink">Cómo leer esta herramienta</h2>
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
