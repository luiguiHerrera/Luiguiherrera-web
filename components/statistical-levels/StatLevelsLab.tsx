"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AdvancedSeasonalityPanel } from "@/components/statistical-levels/AdvancedSeasonalityPanel";
import { AssetSelector } from "@/components/statistical-levels/AssetSelector";
import { AssetStatCard } from "@/components/statistical-levels/AssetStatCard";
import { CalendarExtremesPanel } from "@/components/statistical-levels/CalendarExtremesPanel";
import { KeyStatisticalLevelsPanel } from "@/components/statistical-levels/KeyStatisticalLevelsPanel";
import { LabOverviewStrip } from "@/components/statistical-levels/LabOverviewStrip";
import { MovementSummaryTable } from "@/components/statistical-levels/MovementSummaryTable";
import { OpeningLocationPanel } from "@/components/statistical-levels/OpeningLocationPanel";
import { PeriodExplorerTable } from "@/components/statistical-levels/PeriodExplorerTable";
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

const englishFrequencyLabels: Record<StatisticalFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
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
  const locale = pathname.startsWith("/en") ? "en" : "es";
  const labels = locale === "en"
    ? {
        frameEyebrow: "Time frame",
        frameTitle: "Choose a view: monthly, weekly or daily",
        frameCopy: "Each tab shows only the context for the selected frame. The window keeps the historical comparison for the selected asset.",
        frequency: "Frequency",
        window: "Window",
        updated: "Updated",
        source: "Source",
        sourceText: "Public market data processed at static build time · provider by availability · proprietary calculations",
        howToRead: "How to read this tool",
      }
    : {
        frameEyebrow: "Marco temporal",
        frameTitle: "Elige una lectura: mensual, semanal o diaria",
        frameCopy: "Cada pestaña muestra solo el contexto del marco elegido. La ventana mantiene la comparación histórica del activo seleccionado.",
        frequency: "Frecuencia",
        window: "Ventana",
        updated: "Actualización",
        source: "Fuente",
        sourceText: "Datos públicos de mercado procesados en build estático · proveedor según disponibilidad · cálculos propios",
        howToRead: "Cómo leer esta herramienta",
      };
  const localizedFrequencyLabels = locale === "en" ? englishFrequencyLabels : frequencyLabels;
  const localizedFrameTabs = frameTabs.map((tab) => locale === "en"
    ? {
        ...tab,
        label: englishFrequencyLabels[tab.key],
        description: tab.key === "monthly"
          ? "Reference levels, monthly open and range context."
          : tab.key === "weekly"
            ? "Recent returns, drawdown and weekly behavior."
            : "Seasonality, days of month and presidential cycle.",
      }
    : tab);

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

      <AssetSelector catalog={manifest.catalog} locale={locale} query={query} selected={[asset.ticker]} setQuery={setQuery} selectAsset={(ticker) => navigate({ asset: ticker })} />

      <section className="border border-line bg-panel p-3.5 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">{labels.frameEyebrow}</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">{labels.frameTitle}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              {labels.frameCopy}
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
          {localizedFrameTabs.map((tab) => (
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
          <p><span className="font-semibold text-ink">{labels.frequency}:</span> {localizedFrequencyLabels[frequency]}</p>
          <p><span className="font-semibold text-ink">{labels.window}:</span> {window}</p>
          <p><span className="font-semibold text-ink">{labels.updated}:</span> {manifest.generatedAt}</p>
          <p className="md:col-span-3"><span className="font-semibold text-ink">{labels.source}:</span> {labels.sourceText}</p>
        </div>
      </section>

      <LabOverviewStrip assets={assets} frequency={frequency} window={window} />

      <section className="grid gap-5 xl:grid-cols-2">
        <AssetStatCard key={asset.ticker} asset={asset} frequency={frequency} window={window} />
        <UnderwaterDrawdownChart asset={asset} frequency={frequency} window={window} />
      </section>

      {frequency === "monthly" ? (
        <div className="grid gap-5">
          <AdvancedSeasonalityPanel data={seasonality} frequency="monthly" generatedAt={manifest.generatedAt} locale={locale} ticker={asset.ticker} />
          <KeyStatisticalLevelsPanel asset={asset} frequency="monthly" />
          <MovementSummaryTable asset={asset} frequency="monthly" />
          <OpeningLocationPanel asset={asset} frequency="monthly" />
          <PeriodExplorerTable asset={asset} frequency="monthly" />
        </div>
      ) : null}

      {frequency === "weekly" ? (
        <div className="grid gap-5">
          <AdvancedSeasonalityPanel data={seasonality} frequency="weekly" generatedAt={manifest.generatedAt} locale={locale} ticker={asset.ticker} />
          <KeyStatisticalLevelsPanel asset={asset} frequency="weekly" />
          <PeriodExplorerTable asset={asset} frequency="weekly" />
          <OpeningLocationPanel asset={asset} frequency="weekly" />
          <MovementSummaryTable asset={asset} frequency="weekly" />
          <ReturnHeatmap asset={asset} frequency="weekly" />
        </div>
      ) : null}

      {frequency === "daily" ? (
        <div className="grid gap-5">
          <AdvancedSeasonalityPanel data={seasonality} frequency="daily" generatedAt={manifest.generatedAt} locale={locale} ticker={asset.ticker} />
          <ReturnHeatmap asset={asset} frequency="daily" />
          <CalendarExtremesPanel asset={asset} frequency="daily" />
          <MovementSummaryTable asset={asset} frequency="daily" />
        </div>
      ) : null}

      <ComparisonSection summaries={manifest.summaries} focusTicker={asset.ticker} frequency={frequency} window={window} locale={locale} />

      <section className="border border-line bg-panel p-4 md:p-5">
        <h2 className="text-xl font-semibold text-ink">{labels.howToRead}</h2>
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
  locale,
  summaries,
  window,
}: {
  focusTicker: string;
  frequency: StatisticalFrequency;
  locale: "es" | "en";
  summaries: AssetStatSummary[];
  window: StatisticalWindow;
}) {
  const defaultTickers = useMemo(() => Array.from(new Set(["SPY", "QQQ", "IWM", "DIA", "TLT", "GLD", "IBIT", focusTicker])), [focusTicker]);
  const [query, setQuery] = useState("");
  const [selectedTickers, setSelectedTickers] = useState(defaultTickers);
  const normalizedQuery = query.trim().toLowerCase();
  const selectedSet = new Set(selectedTickers);
  const selected = summaries.filter((asset) => selectedSet.has(asset.ticker));
  const filtered = summaries.filter((asset) => `${asset.ticker} ${asset.name} ${asset.category}`.toLowerCase().includes(normalizedQuery));
  const copy = locale === "en"
    ? {
        eyebrow: "Compare assets",
        title: "Compare assets",
        body: "Compare assets from the curated universe with precomputed summaries, keeping the page light.",
        selected: "selected",
        search: "Search asset",
        placeholder: "Search ticker or name",
        focus: "Focus",
        extension: "Extension percentile",
        zScore: "Z-score",
        longAverage: "Long average",
        correlation: "The full correlation matrix will be added when it is available in a light format.",
      }
    : {
        eyebrow: "Comparar activos",
        title: "Comparar activos",
        body: "Contrasta activos del universo curado con resúmenes precalculados, manteniendo la página ligera.",
        selected: "seleccionados",
        search: "Buscar activo",
        placeholder: "Buscar ticker o nombre",
        focus: "Foco",
        extension: "Percentil extensión",
        zScore: "Z-score",
        longAverage: "Media larga",
        correlation: "La matriz completa de correlación se incorporará cuando esté disponible en formato ligero.",
      };

  function toggleTicker(ticker: string) {
    setSelectedTickers((current) => {
      if (current.includes(ticker)) return current.filter((item) => item !== ticker);
      if (current.length >= 30) return current;
      return [...current, ticker];
    });
  }

  return (
    <section className="border border-line bg-panel p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">{copy.eyebrow}</p>
          <h2 className="mt-2 text-xl font-semibold text-ink">{copy.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            {copy.body}
          </p>
        </div>
        <span className="border border-line bg-panelSoft px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          {(locale === "en" ? englishFrequencyLabels : frequencyLabels)[frequency]} · {window} · {selected.length} {copy.selected}
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[18rem_1fr] lg:items-start">
        <label className="block">
          <span className="sr-only">{copy.search}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.placeholder}
            className="w-full border border-line bg-panelSoft px-4 py-3 text-sm text-ink outline-none transition focus:border-petrol"
          />
        </label>
        <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto border border-line bg-panelSoft p-2">
          {filtered.map((asset) => {
            const active = selectedTickers.includes(asset.ticker);
            return (
              <button
                key={asset.ticker}
                type="button"
                onClick={() => toggleTicker(asset.ticker)}
                title={asset.name}
                aria-pressed={active}
                className={`border px-2.5 py-1.5 text-xs font-semibold transition ${active ? "border-petrol bg-[#eef3f2] text-petrol" : "border-line bg-panel text-muted hover:border-ink hover:text-ink"}`}
              >
                {asset.ticker}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {selected.map((asset) => (
          <div key={asset.ticker} className={`border p-4 ${asset.ticker === focusTicker ? "border-petrol bg-[#eef3f2]" : "border-line bg-panelSoft"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{asset.ticker}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{asset.name}</p>
              </div>
              {asset.ticker === focusTicker ? <span className="text-xs font-semibold text-petrol">{copy.focus}</span> : null}
            </div>
            <div className="mt-4 grid gap-2 text-sm text-muted">
              <p>{copy.extension} <span className="font-semibold text-ink">{asset.extension.percentile5Y === null ? "n/d" : asset.extension.percentile5Y.toFixed(1)}</span></p>
              <p>{copy.zScore} <span className="font-semibold text-ink">{asset.extension.zScore5Y === null ? "n/d" : asset.extension.zScore5Y.toFixed(2)}</span></p>
              <p>{copy.longAverage} <span className="font-semibold text-ink">{asset.distanceToMovingAverages.ma200 === null ? "n/d" : `${(asset.distanceToMovingAverages.ma200 * 100).toFixed(1)}%`}</span></p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 border border-line bg-panelSoft p-4 text-sm leading-6 text-muted">
        {copy.correlation}
      </div>
    </section>
  );
}
