"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AdvancedSeasonalityPanel } from "@/components/statistical-levels/AdvancedSeasonalityPanel";
import { AssetSelector } from "@/components/statistical-levels/AssetSelector";
import { AssetStatCard } from "@/components/statistical-levels/AssetStatCard";
import { CalendarExtremesPanel } from "@/components/statistical-levels/CalendarExtremesPanel";
import { KeyStatisticalLevelsPanel } from "@/components/statistical-levels/KeyStatisticalLevelsPanel";
import { JpmSpxLevelsPanel } from "@/components/statistical-levels/JpmSpxLevelsPanel";
import { LabOverviewStrip } from "@/components/statistical-levels/LabOverviewStrip";
import { MovementSummaryTable } from "@/components/statistical-levels/MovementSummaryTable";
import { OpeningLocationPanel } from "@/components/statistical-levels/OpeningLocationPanel";
import { PeriodExplorerTable } from "@/components/statistical-levels/PeriodExplorerTable";
import { ReturnHeatmap } from "@/components/statistical-levels/ReturnHeatmap";
import { UnderwaterDrawdownChart } from "@/components/statistical-levels/UnderwaterDrawdownChart";
import { displayStatName, displayStatTicker } from "@/lib/statistical-levels/display";
import { shouldShowJpmSpxLevels } from "@/lib/market/jpm-spx-levels";
import type {
  AssetCategory,
  AssetDataStatus,
  AssetStatRecord,
  AssetStatSummary,
  CorrelationMatrix,
  DailySeasonalityData,
  StatisticalFrequency,
  StatisticalLevelsCorrelation,
  StatisticalLevelsManifest,
  StatisticalWindow,
} from "@/lib/statistical-levels/types";

const statusLabels: Record<AssetDataStatus, string> = {
  ok: "Datos ok",
  limited_history: "Historial limitado",
  unavailable: "No disponible",
};

const englishStatusLabels: Record<AssetDataStatus, string> = {
  ok: "Data OK",
  limited_history: "Limited history",
  unavailable: "Unavailable",
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

const categoryOrder: AssetCategory[] = [
  "Índices / ETFs",
  "Bonos",
  "Oro y materias primas",
  "Sectores",
  "Temáticos",
  "Cripto",
  "Internacional",
];

const localizedCategoryLabels: Record<"es" | "en", Record<AssetCategory, string>> = {
  es: {
    "Índices / ETFs": "Índices / ETFs",
    Bonos: "Bonos",
    "Oro y materias primas": "Oro y materias primas",
    Sectores: "Sectores",
    "Temáticos": "Temáticos",
    Cripto: "Cripto",
    Internacional: "Internacional",
  },
  en: {
    "Índices / ETFs": "Indices / ETFs",
    Bonos: "Bonds",
    "Oro y materias primas": "Gold & commodities",
    Sectores: "Sectors",
    "Temáticos": "Thematic",
    Cripto: "Crypto",
    Internacional: "International",
  },
};

function daysSince(dateValue: string | null | undefined) {
  if (!dateValue) return null;
  const parsed = new Date(`${dateValue}T00:00:00Z`).getTime();
  if (!Number.isFinite(parsed)) return null;
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.floor((todayUtc - parsed) / 86400000);
}

const frameTabs: Array<{ key: StatisticalFrequency; label: string; description: string }> = [
  { key: "monthly", label: "Mensual", description: "Niveles de referencia, apertura mensual y contexto de rango." },
  { key: "weekly", label: "Por semana", description: "Retornos recientes, drawdown y comportamiento por semana." },
  { key: "daily", label: "Diario", description: "Estacionalidad, días del mes y ciclo presidencial." },
];

type StatLevelsLabProps = {
  asset: AssetStatRecord;
  locale?: "es" | "en";
  manifest: StatisticalLevelsManifest;
  seasonality: DailySeasonalityData;
  selection: {
    asset: string;
    frequency: StatisticalFrequency;
    window: StatisticalWindow;
  };
};

export function StatLevelsLab({ asset, locale: localeProp, manifest, seasonality, selection }: StatLevelsLabProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const assets = useMemo(() => [asset], [asset]);
  const [query, setQuery] = useState("");
  const statusCounts = manifest.statusCounts;
  const frequency = selection.frequency;
  const window = selection.window;
  const locale = localeProp ?? (pathname.startsWith("/en") ? "en" : "es");
  const labels = locale === "en"
    ? {
        frameEyebrow: "Time frame",
        frameTitle: "Choose a view: monthly, weekly or daily",
        frameCopy: "Each tab shows only the context for the selected frame. The window keeps the historical comparison for the selected asset.",
        frequency: "Frequency",
        window: "Window",
        lastMarketData: "Last market data",
        snapshotGenerated: "Snapshot generated",
        snapshotNotRecorded: "Not recorded in this snapshot",
        staleNote: "Data pending automated refresh.",
        source: "Source",
        sourceText: "Public market data processed at static build time · provider by availability · proprietary calculations",
        howToRead: "How to read this tool",
      }
    : {
        frameEyebrow: "Marco temporal",
        frameTitle: "Elige una lectura: mensual, por semana o diaria",
        frameCopy: "Cada pestaña muestra solo el contexto del marco elegido. La ventana mantiene la comparación histórica del activo seleccionado.",
        frequency: "Frecuencia",
        window: "Ventana",
        lastMarketData: "Último dato de mercado",
        snapshotGenerated: "Snapshot generado",
        snapshotNotRecorded: "No registrado en este snapshot",
        staleNote: "Datos pendientes de actualización automática.",
        source: "Fuente",
        sourceText: "Datos de mercado de fuentes abiertas procesados en build estático · proveedor según disponibilidad · cálculos propios",
        howToRead: "Cómo leer esta herramienta",
      };
  const localizedFrequencyLabels = locale === "en" ? englishFrequencyLabels : frequencyLabels;
  const staleDays = daysSince(manifest.generatedAt);
  const isStale = staleDays !== null && staleDays > 7;
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
    params.delete("symbol");
    params.set("asset", next.asset ?? selection.asset);
    params.set("frequency", next.frequency ?? frequency);
    params.set("window", next.window ?? window);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden md:space-y-5">
      <section className="grid gap-3 md:grid-cols-3 md:gap-4">
        {Object.entries(statusCounts).map(([status, count]) => (
          <div key={status} className="border border-line bg-panel p-3.5 md:p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{(locale === "en" ? englishStatusLabels : statusLabels)[status as AssetDataStatus]}</p>
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
        <div className="mt-5 grid gap-3 border-t border-line pt-5 text-sm text-muted md:grid-cols-4">
          <p><span className="font-semibold text-ink">{labels.frequency}:</span> {localizedFrequencyLabels[frequency]}</p>
          <p><span className="font-semibold text-ink">{labels.window}:</span> {window}</p>
          <p><span className="font-semibold text-ink">{labels.lastMarketData}:</span> {manifest.generatedAt}</p>
          <p><span className="font-semibold text-ink">{labels.snapshotGenerated}:</span> {manifest.snapshotGeneratedAt ?? labels.snapshotNotRecorded}</p>
          {isStale ? (
            <p className="border-l border-brass/40 pl-3 text-brass md:col-span-4">{labels.staleNote}</p>
          ) : null}
          <p className="md:col-span-4"><span className="font-semibold text-ink">{labels.source}:</span> {labels.sourceText}</p>
        </div>
      </section>

      <LabOverviewStrip assets={assets} frequency={frequency} window={window} locale={locale} />

      <section className="grid gap-5 xl:grid-cols-2">
        <AssetStatCard key={asset.ticker} asset={asset} frequency={frequency} window={window} locale={locale} />
        <UnderwaterDrawdownChart asset={asset} frequency={frequency} window={window} locale={locale} />
      </section>

      {frequency === "monthly" ? (
        <div className="grid gap-5">
          <AdvancedSeasonalityPanel data={seasonality} frequency="monthly" generatedAt={manifest.generatedAt} locale={locale} ticker={displayStatTicker(asset.ticker)} />
          <KeyStatisticalLevelsPanel asset={asset} frequency="monthly" locale={locale} />
          {shouldShowJpmSpxLevels(asset.ticker) ? <JpmSpxLevelsPanel locale={locale} /> : null}
          <MovementSummaryTable asset={asset} frequency="monthly" locale={locale} />
          <OpeningLocationPanel asset={asset} frequency="monthly" locale={locale} />
          <PeriodExplorerTable asset={asset} frequency="monthly" locale={locale} />
        </div>
      ) : null}

      {frequency === "weekly" ? (
        <div className="grid gap-5">
          <AdvancedSeasonalityPanel data={seasonality} frequency="weekly" generatedAt={manifest.generatedAt} locale={locale} ticker={displayStatTicker(asset.ticker)} />
          <KeyStatisticalLevelsPanel asset={asset} frequency="weekly" locale={locale} />
          {shouldShowJpmSpxLevels(asset.ticker) ? <JpmSpxLevelsPanel locale={locale} /> : null}
          <PeriodExplorerTable asset={asset} frequency="weekly" locale={locale} />
          <OpeningLocationPanel asset={asset} frequency="weekly" locale={locale} />
          <MovementSummaryTable asset={asset} frequency="weekly" locale={locale} />
          <ReturnHeatmap asset={asset} frequency="weekly" locale={locale} />
        </div>
      ) : null}

      {frequency === "daily" ? (
        <div className="grid gap-5">
          <AdvancedSeasonalityPanel data={seasonality} frequency="daily" generatedAt={manifest.generatedAt} locale={locale} ticker={displayStatTicker(asset.ticker)} />
          {shouldShowJpmSpxLevels(asset.ticker) ? <JpmSpxLevelsPanel locale={locale} /> : null}
          <ReturnHeatmap asset={asset} frequency="daily" locale={locale} />
          <CalendarExtremesPanel asset={asset} frequency="daily" locale={locale} />
          <MovementSummaryTable asset={asset} frequency="daily" locale={locale} />
        </div>
      ) : null}

      <ComparisonSection
        correlation={manifest.correlation}
        summaries={manifest.summaries}
        focusTicker={asset.ticker}
        frequency={frequency}
        window={window}
        locale={locale}
      />

      <section className="border border-line bg-panel p-4 md:p-5">
        <h2 className="text-xl font-semibold text-ink">{labels.howToRead}</h2>
        <div className="mt-5 grid gap-5 text-sm leading-6 text-muted md:grid-cols-2">
          {locale === "en" ? (
            <>
              <p><span className="font-semibold text-ink">Z-score:</span> measures how many standard deviations a metric sits away from its historical average in the selected window.</p>
              <p><span className="font-semibold text-ink">Percentile:</span> places the current reading against prior observations in the same window.</p>
              <p><span className="font-semibold text-ink">Drawdown:</span> shows distance from the high inside the analyzed window.</p>
              <p><span className="font-semibold text-ink">Distance to average:</span> compares price with moving averages adapted to daily, weekly or monthly frequency.</p>
            </>
          ) : (
            <>
              <p><span className="font-semibold text-ink">Z-score:</span> mide cuántas desviaciones se aleja una métrica de su media histórica dentro de la ventana seleccionada.</p>
              <p><span className="font-semibold text-ink">Percentil:</span> ubica el dato actual frente a observaciones previas de la misma ventana.</p>
              <p><span className="font-semibold text-ink">Drawdown:</span> muestra distancia desde el máximo de la ventana analizada.</p>
              <p><span className="font-semibold text-ink">Distancia a media:</span> compara el precio con medias móviles adaptadas a frecuencia diaria, por semana o mensual.</p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function ComparisonSection({
  correlation,
  focusTicker,
  frequency,
  locale,
  summaries,
  window,
}: {
  correlation?: StatisticalLevelsCorrelation;
  focusTicker: string;
  frequency: StatisticalFrequency;
  locale: "es" | "en";
  summaries: AssetStatSummary[];
  window: StatisticalWindow;
}) {
  const defaultTickers = useMemo(() => Array.from(new Set(["SPY", "QQQ", "IWM", "DIA", "TLT", "GLD", "BTCUSD", "ETHUSD", focusTicker])), [focusTicker]);
  const [query, setQuery] = useState("");
  const [selectedTickers, setSelectedTickers] = useState(defaultTickers);
  const normalizedQuery = query.trim().toLowerCase();
  const selectedSet = new Set(selectedTickers);
  const selected = summaries.filter((asset) => selectedSet.has(asset.ticker));
  const filtered = summaries.filter((asset) =>
    `${asset.ticker} ${asset.name} ${asset.category} ${displayStatTicker(asset.ticker)} ${displayStatName(asset.ticker, asset.name)}`
      .toLowerCase()
      .includes(normalizedQuery),
  );
  const groupedAssets = categoryOrder
    .map((category) => ({
      category,
      assets: filtered.filter((asset) => asset.category === category),
    }))
    .filter((group) => group.assets.length > 0);
  const correlationWindow = window === "3Y" || window === "5Y" || window === "10Y" ? window : "All";
  const correlationMatrix = correlation?.[frequency]?.[correlationWindow] ?? null;
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
        category: "Group",
        correlationTitle: "Correlation matrix",
        correlationBody: "Precomputed lightweight correlation by frequency and window. It uses the selected assets without loading full series in the browser.",
        correlationEmpty: "The light correlation matrix is not available for this combination yet.",
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
        category: "Grupo",
        correlationTitle: "Matriz de correlación",
        correlationBody: "Correlación ligera precalculada por frecuencia y ventana. Usa los activos seleccionados sin cargar series completas en el navegador.",
        correlationEmpty: "La matriz ligera de correlación no está disponible para esta combinación todavía.",
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
        <div className="max-h-64 space-y-3 overflow-y-auto border border-line bg-panelSoft p-3">
          {groupedAssets.map((group) => (
            <div key={group.category}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{localizedCategoryLabels[locale][group.category]}</p>
              <div className="flex flex-wrap gap-1.5">
                {group.assets.map((asset) => {
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
                      {displayStatTicker(asset.ticker)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {selected.map((asset) => (
          <div key={asset.ticker} className={`border p-4 ${asset.ticker === focusTicker ? "border-petrol bg-[#eef3f2]" : "border-line bg-panelSoft"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{displayStatTicker(asset.ticker)}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{displayStatName(asset.ticker, asset.name)}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{localizedCategoryLabels[locale][asset.category]}</p>
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

      <div className="mt-5 border border-line bg-panelSoft p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-ink">{copy.correlationTitle}</h3>
            <p className="mt-1 text-sm leading-6 text-muted">{copy.correlationBody}</p>
          </div>
          <span className="w-fit border border-line bg-panel px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {(locale === "en" ? englishFrequencyLabels : frequencyLabels)[frequency]} · {correlationWindow}
          </span>
        </div>
        <CorrelationHeatmap matrix={correlationMatrix} selectedTickers={selectedTickers} emptyLabel={copy.correlationEmpty} />
      </div>
    </section>
  );
}

function CorrelationHeatmap({
  emptyLabel,
  matrix,
  selectedTickers,
}: {
  emptyLabel: string;
  matrix: CorrelationMatrix | null;
  selectedTickers: string[];
}) {
  const available = matrix ? selectedTickers.filter((ticker) => matrix.tickers.includes(ticker)).slice(0, 30) : [];

  if (!matrix || available.length < 2) {
    return <p className="mt-4 border border-line bg-panel px-3 py-3 text-sm leading-6 text-muted">{emptyLabel}</p>;
  }

  return (
    <div className="mt-4 max-w-full overflow-x-auto [contain:paint]">
      <div
        className="grid min-w-[720px] border border-line bg-panel text-xs"
        style={{ gridTemplateColumns: `5rem repeat(${available.length}, minmax(3.2rem, 1fr))` }}
      >
        <div className="border-b border-line bg-panelSoft p-2" />
        {available.map((ticker) => (
          <div key={ticker} className="border-b border-l border-line bg-panelSoft p-2 text-center font-semibold text-ink">
            {displayStatTicker(ticker)}
          </div>
        ))}
        {available.map((rowTicker) => (
          <RowCells key={rowTicker} matrix={matrix} rowTicker={rowTicker} tickers={available} />
        ))}
      </div>
    </div>
  );
}

function RowCells({ matrix, rowTicker, tickers }: { matrix: CorrelationMatrix; rowTicker: string; tickers: string[] }) {
  return (
    <>
      <div className="border-t border-line bg-panelSoft p-2 font-semibold text-ink">{displayStatTicker(rowTicker)}</div>
      {tickers.map((columnTicker) => {
        const value = matrix.values[rowTicker]?.[columnTicker] ?? null;
        const diagonal = rowTicker === columnTicker;
        return (
          <div
            key={`${rowTicker}-${columnTicker}`}
            className={`border-l border-t border-line p-2 text-center font-semibold ${diagonal ? "text-white" : "text-ink"}`}
            style={{ backgroundColor: correlationColor(value, diagonal) }}
            title={`${rowTicker} / ${columnTicker}: ${formatCorrelation(value)}`}
          >
            {formatCorrelation(value)}
          </div>
        );
      })}
    </>
  );
}

function formatCorrelation(value: number | null) {
  return value === null ? "n/d" : value.toFixed(2);
}

function correlationColor(value: number | null, diagonal = false) {
  if (diagonal) return "#536b5d";
  if (value === null) return "#f6f1ea";
  if (value >= 0.8) return "#bfd1c5";
  if (value >= 0.6) return "#d4e0d8";
  if (value >= 0.3) return "#e6eee8";
  if (value >= 0.15) return "#f0f2ed";
  if (value > -0.15) return "#f6f1ea";
  if (value > -0.45) return "#efe1dc";
  return "#dfc7c1";
}
