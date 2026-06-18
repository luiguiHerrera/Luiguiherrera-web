"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AssetComparisonTable } from "@/components/statistical-levels/AssetComparisonTable";
import { AssetSelector } from "@/components/statistical-levels/AssetSelector";
import { AssetStatCard } from "@/components/statistical-levels/AssetStatCard";
import { CalendarExtremesPanel } from "@/components/statistical-levels/CalendarExtremesPanel";
import { DailySeasonalityPanel } from "@/components/statistical-levels/DailySeasonalityPanel";
import { KeyStatisticalLevelsPanel } from "@/components/statistical-levels/KeyStatisticalLevelsPanel";
import { LabOverviewStrip } from "@/components/statistical-levels/LabOverviewStrip";
import { MovementSummaryTable } from "@/components/statistical-levels/MovementSummaryTable";
import { OpeningLocationPanel } from "@/components/statistical-levels/OpeningLocationPanel";
import { PeriodExplorerTable } from "@/components/statistical-levels/PeriodExplorerTable";
import { PositioningScatter } from "@/components/statistical-levels/PositioningScatter";
import { ReturnHeatmap } from "@/components/statistical-levels/ReturnHeatmap";
import { UnderwaterDrawdownChart } from "@/components/statistical-levels/UnderwaterDrawdownChart";
import type { AssetDataStatus, AssetStatRecord, AssetStatSummary, DailySeasonalityData, StatisticalFrequency, StatisticalLevelsManifest, StatisticalWindow } from "@/lib/statistical-levels/types";

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

const frameTabs: Array<{ key: StatisticalFrequency; label: string; description: string }> = [
  { key: "monthly", label: "Mensual", description: "Niveles de referencia, apertura mensual y contexto de rango." },
  { key: "weekly", label: "Semanal", description: "Retornos recientes, drawdown y comportamiento semanal." },
  { key: "daily", label: "Diario", description: "Estacionalidad, días del mes y ciclo presidencial." },
];

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
  const statusCounts = manifest.statusCounts;
  const frequency = selection.frequency;
  const window = selection.window;

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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Marco temporal</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">Elige una lectura: mensual, semanal o diaria</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Cada pestaña muestra solo el contexto del marco elegido. La ventana mantiene la comparación histórica del activo seleccionado.
            </p>
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
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {frameTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => navigate({ frequency: tab.key })}
              className={`border p-4 text-left transition ${frequency === tab.key ? "border-ink bg-ink text-white" : "border-line bg-panelSoft text-muted hover:border-ink hover:text-ink"}`}
            >
              <span className="block text-sm font-semibold">{tab.label}</span>
              <span className={`mt-2 block text-xs leading-5 ${frequency === tab.key ? "text-white/75" : "text-muted"}`}>{tab.description}</span>
            </button>
          ))}
        </div>
        <div className="mt-5 grid gap-3 border-t border-line pt-5 text-sm text-muted md:grid-cols-3">
          <p><span className="font-semibold text-ink">Frecuencia:</span> {frequencyLabels[frequency]}</p>
          <p><span className="font-semibold text-ink">Ventana:</span> {window}</p>
          <p><span className="font-semibold text-ink">Actualización:</span> {manifest.generatedAt}</p>
          <p className="md:col-span-3"><span className="font-semibold text-ink">Fuente:</span> Datos públicos de mercado procesados en build estático · proveedor según disponibilidad · cálculos propios</p>
        </div>
      </section>

      <LabOverviewStrip assets={assets} frequency={frequency} window={window} />

      <section className="grid gap-5 xl:grid-cols-2">
        <AssetStatCard key={asset.ticker} asset={asset} frequency={frequency} window={window} />
        <UnderwaterDrawdownChart asset={asset} frequency={frequency} window={window} />
      </section>

      {frequency === "monthly" ? (
        <div className="grid gap-5">
          <KeyStatisticalLevelsPanel asset={asset} frequency="monthly" />
          <MovementSummaryTable asset={asset} frequency="monthly" />
          <OpeningLocationPanel asset={asset} frequency="monthly" />
          <PeriodExplorerTable asset={asset} frequency="monthly" />
        </div>
      ) : null}

      {frequency === "weekly" ? (
        <div className="grid gap-5">
          <KeyStatisticalLevelsPanel asset={asset} frequency="weekly" />
          <PeriodExplorerTable asset={asset} frequency="weekly" />
          <OpeningLocationPanel asset={asset} frequency="weekly" />
          <MovementSummaryTable asset={asset} frequency="weekly" />
          <ReturnHeatmap asset={asset} frequency="weekly" />
        </div>
      ) : null}

      {frequency === "daily" ? (
        <div className="grid gap-5">
          <DailySeasonalityPanel
            catalog={manifest.catalog}
            data={seasonality}
            generatedAt={manifest.generatedAt}
            initialTicker={asset.ticker}
          />
          <ReturnHeatmap asset={asset} frequency="daily" />
          <CalendarExtremesPanel asset={asset} frequency="daily" />
          <MovementSummaryTable asset={asset} frequency="daily" />
        </div>
      ) : null}

      <ComparisonSection summaries={manifest.summaries} focusTicker={asset.ticker} frequency={frequency} window={window} />

      <section className="border border-line bg-panel p-4 md:p-5">
        <h2 className="text-xl font-semibold text-ink">Cómo leer esta herramienta</h2>
        <div className="mt-5 grid gap-5 text-sm leading-6 text-muted md:grid-cols-2">
          <p><span className="font-semibold text-ink">Z-score:</span> mide cuántas desviaciones se aleja una métrica de su media histórica dentro de la ventana seleccionada.</p>
          <p><span className="font-semibold text-ink">Percentil:</span> ubica el dato actual frente a observaciones previas de la misma ventana.</p>
          <p><span className="font-semibold text-ink">Drawdown:</span> muestra distancia desde el máximo de la ventana analizada.</p>
          <p><span className="font-semibold text-ink">Distancia a media:</span> compara el precio con medias móviles adaptadas a frecuencia diaria, semanal o mensual.</p>
        </div>
      </section>
    </div>
  );
}

function ComparisonSection({
  focusTicker,
  frequency,
  summaries,
  window,
}: {
  focusTicker: string;
  frequency: StatisticalFrequency;
  summaries: AssetStatSummary[];
  window: StatisticalWindow;
}) {
  const selected = summaries
    .filter((asset) => ["SPY", "QQQ", "DIA", "IWM", "GLD", "TLT", "IBIT", focusTicker].includes(asset.ticker))
    .filter((asset, index, array) => array.findIndex((item) => item.ticker === asset.ticker) === index)
    .slice(0, 8);

  return (
    <section className="border border-line bg-panel p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Comparar activos</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">Vista ligera desde manifest</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Comparación compacta con resúmenes precalculados. Para correlación completa se necesita una matriz ligera precomputada, sin cargar series completas al cliente.
          </p>
        </div>
        <span className="border border-line bg-panelSoft px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          {frequencyLabels[frequency]} · {window}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {selected.map((asset) => (
          <div key={asset.ticker} className={`border p-4 ${asset.ticker === focusTicker ? "border-petrol bg-[#eef3f2]" : "border-line bg-panelSoft"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{asset.ticker}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{asset.name}</p>
              </div>
              {asset.ticker === focusTicker ? <span className="text-xs font-semibold text-petrol">Foco</span> : null}
            </div>
            <div className="mt-4 grid gap-2 text-sm text-muted">
              <p>Percentil extensión <span className="font-semibold text-ink">{asset.extension.percentile5Y === null ? "n/d" : asset.extension.percentile5Y.toFixed(1)}</span></p>
              <p>Z-score <span className="font-semibold text-ink">{asset.extension.zScore5Y === null ? "n/d" : asset.extension.zScore5Y.toFixed(2)}</span></p>
              <p>Media larga <span className="font-semibold text-ink">{asset.distanceToMovingAverages.ma200 === null ? "n/d" : `${(asset.distanceToMovingAverages.ma200 * 100).toFixed(1)}%`}</span></p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 border border-line bg-panelSoft p-4 text-sm leading-6 text-muted">
        Compara varios activos para ver el mapa completo cuando exista una matriz precomputada de correlación/posicionamiento. Esta versión mantiene el payload ligero y evita cargar el universo completo.
      </div>
    </section>
  );
}
