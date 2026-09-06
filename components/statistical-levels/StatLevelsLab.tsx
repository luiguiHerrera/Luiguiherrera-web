"use client";
import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdvancedSeasonalityPanel } from './AdvancedSeasonalityPanel';
import { AssetSelector } from './AssetSelector';
import { AssetStatCard } from './AssetStatCard';
import { CalendarExtremesPanel } from './CalendarExtremesPanel';
import { KeyStatisticalLevelsPanel } from './KeyStatisticalLevelsPanel';
import { JpmSpxLevelsPanel } from './JpmSpxLevelsPanel';
import { MovementSummaryTable } from './MovementSummaryTable';
import { OpeningLocationPanel } from './OpeningLocationPanel';
import { PeriodExplorerTable } from './PeriodExplorerTable';
import { ReturnHeatmap } from './ReturnHeatmap';
import { UnderwaterDrawdownChart } from './UnderwaterDrawdownChart';
import { HistoricalRange } from './HistoricalRange';
import { CurrentMonthSeasonality } from './CurrentMonthSeasonality';
import { StatisticalDisclosure } from './StatisticalDisclosure';
import { displayStatName, displayStatTicker } from '@/lib/statistical-levels/display';
import { shouldShowJpmSpxLevels } from '@/lib/market/jpm-spx-levels';
import { extensionSample, frequencyName, historicalInterpretation, number, percent, percentileTranslation, windowName, zTranslation } from '@/lib/statistical-levels/interpretation';
import type { AssetCategory, AssetStatRecord, AssetStatSummary, CorrelationMatrix, DailySeasonalityData, StatisticalFrequency, StatisticalLevelsCorrelation, StatisticalLevelsManifest, StatisticalWindow } from '@/lib/statistical-levels/types';
import './statistical-levels.css';

const categoryOrder: AssetCategory[] = ['Índices / ETFs', 'Bonos', 'Oro y materias primas', 'Sectores', 'Temáticos', 'Cripto', 'Internacional'];
const localizedCategoryLabels = {
  es: { 'Índices / ETFs': 'Índices / ETFs', Bonos: 'Bonos', 'Oro y materias primas': 'Oro y materias primas', Sectores: 'Sectores', Temáticos: 'Temáticos', Cripto: 'Cripto', Internacional: 'Internacional' },
  en: { 'Índices / ETFs': 'Indices / ETFs', Bonos: 'Bonds', 'Oro y materias primas': 'Gold & commodities', Sectores: 'Sectors', Temáticos: 'Thematic', Cripto: 'Crypto', Internacional: 'International' },
};
const frequencyLabels = { daily: 'Diario', weekly: 'Semanal', monthly: 'Mensual' };
const englishFrequencyLabels = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

type Props = {
  asset: AssetStatRecord; locale?: 'es' | 'en'; manifest: StatisticalLevelsManifest;
  seasonality: DailySeasonalityData;
  selection: { asset: string; frequency: StatisticalFrequency; window: StatisticalWindow };
  stale: boolean;
};

export function StatLevelsLab({ asset, locale = 'es', manifest, seasonality, selection, stale }: Props) {
  const router = useRouter(), pathname = usePathname(), searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const { frequency, window } = selection;
  const en = locale === 'en';
  const data = asset.frequencies[frequency];
  const metric = data.windows[window];
  const ticker = displayStatTicker(asset.ticker);
  const sample = extensionSample(metric, frequency);
  const longMa = data.longMovingAverageKey;
  function navigate(next: Partial<Props['selection']>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('symbol');
    params.set('asset', next.asset ?? selection.asset);
    params.set('frequency', next.frequency ?? frequency);
    params.set('window', next.window ?? window);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }
  return <div className="sl-page">
    <header className="sl-heading"><p className="sl-eyebrow">{en ? 'Statistical levels' : 'Niveles estadísticos'}</p><h1>{en ? 'Where is this asset relative to its own history?' : '¿Dónde está este activo frente a su propia historia?'}</h1></header>
    <div id="sl-controls" className="sl-controls">
      <AssetSelector catalog={manifest.catalog} locale={locale} query={query} selected={[asset.ticker]} setQuery={setQuery} selectAsset={ticker => navigate({ asset: ticker })} />
      <div className="sl-period"><p className="sl-control-label">{en ? 'Period' : 'Periodo'}</p><div className="sl-period-buttons">{manifest.windows.filter(item => item !== 'Full').map(item => <button key={item} type="button" data-window={item} aria-pressed={window === item} onClick={() => navigate({ window: item })}>{windowName(item, locale)}</button>)}</div></div>
      <details id="sl-options" className="sl-options"><summary>{en ? 'More options' : 'Más opciones'} <span aria-hidden="true">＋</span></summary><div className="sl-options-body"><label>{en ? 'Frequency' : 'Frecuencia'}<select aria-label={en ? 'Frequency' : 'Frecuencia'} value={frequency} onChange={event => navigate({ frequency: event.target.value as StatisticalFrequency })}>{manifest.frequencies.map(item => <option key={item} value={item}>{frequencyName(item, locale)}</option>)}</select></label><label>{en ? 'All periods' : 'Todos los periodos'}<select aria-label={en ? 'All periods' : 'Todos los periodos'} value={window} onChange={event => navigate({ window: event.target.value as StatisticalWindow })}>{manifest.windows.map(item => <option key={item} value={item}>{windowName(item, locale)}</option>)}</select></label><p>{en ? 'Price comparisons use this period and frequency. Opening levels use completed full history; seasonality has its own period.' : 'La comparación usa este periodo y frecuencia. Los niveles de apertura usan todo el historial completado; la estacionalidad tiene su propio periodo.'}</p></div></details>
    </div>
    <section id="sl-interpretation" className="sl-interpretation" aria-live="polite">
      <div className="sl-context"><span>{ticker} · {displayStatName(asset.ticker, asset.name)}</span><span>{frequencyName(frequency, locale)} · {windowName(window, locale)} · {en ? 'Completed history through' : 'Historial completado hasta'} {data.lastDate ?? 'n/d'}</span></div>
      <h2>{historicalInterpretation(ticker, metric, frequency, locale)}</h2>
      <p>{en ? `Extension measures the distance between the price and ${longMa}, its long moving average. Compare that distance with its own historical observations.` : `La extensión mide la distancia entre el precio y ${longMa}, su media móvil larga. Compara esa distancia con sus propias observaciones históricas.`}</p>
      <p className="sl-sample">{en ? 'Sample' : 'Muestra'}: <strong>{sample} {en ? 'extension observations' : 'observaciones de extensión'}</strong> · {metric.sessions} {en ? 'price periods available' : 'periodos de precio disponibles'}{!metric.available || sample < 2 ? <span className="sl-limited">{en ? 'Limited sample · interpretation unavailable' : 'Muestra limitada · interpretación no disponible'}</span> : null}</p>
      {stale ? <p className="sl-notice">{en ? 'Data pending automated refresh. This is a historical snapshot.' : 'Datos pendientes de actualización automática. Esta lectura corresponde a un snapshot histórico.'}</p> : null}
      {asset.status !== 'ok' ? <p className="sl-notice">{en ? 'Limited or unavailable asset history.' : 'Historial del activo limitado o no disponible.'}</p> : null}
    </section>
    <HistoricalRange asset={asset} frequency={frequency} locale={locale} />
    <section id="sl-unusual" className="sl-section"><div className="sl-section-heading"><h2>{en ? 'How unusual is this extension?' : '¿Qué tan inusual es esta extensión?'}</h2><p>{frequencyName(frequency, locale)} · {windowName(window, locale)}</p></div><dl className="sl-metrics">
      <div><dt>{en ? 'Percentile' : 'Percentil'}</dt><dd>{number(metric.ma200ExtensionPercentile, 1)}</dd><p>{percentileTranslation(metric.ma200ExtensionPercentile, locale)}</p></div>
      <div><dt>Z-score</dt><dd>{metric.ma200ExtensionZScore !== null && metric.ma200ExtensionZScore > 0 ? '+' : ''}{number(metric.ma200ExtensionZScore)}</dd><p>{zTranslation(metric.ma200ExtensionZScore, locale)}</p></div>
      <div><dt>{en ? 'Sample' : 'Muestra'}</dt><dd>{sample}</dd><p>{en ? `Comparable extension observations, after the ${longMa} warm-up. ${metric.sessions} price periods in the window.` : `Observaciones comparables de extensión, tras formar ${longMa}. ${metric.sessions} periodos de precio en la ventana.`}</p></div>
    </dl></section>
    <CurrentMonthSeasonality key={asset.ticker} data={seasonality} asOf={asset.lastDate ?? manifest.generatedAt} locale={locale} />
    <section id="sl-risk" className="sl-section"><div className="sl-section-heading"><h2>{en ? 'How deep have the declines been?' : '¿Hasta dónde han llegado las caídas?'}</h2><p>{windowName(window, locale)} · {frequencyName(frequency, locale)}</p></div><dl className="sl-risk-metrics"><div><dt>{en ? 'Current drawdown' : 'Drawdown actual'}</dt><dd>{percent(metric.currentDrawdown)}</dd><p>{en ? 'Distance from the prior high within this window.' : 'Distancia desde el máximo previo de esta ventana.'}</p></div><div><dt>{en ? 'Maximum drawdown' : 'Drawdown máximo'}</dt><dd>{percent(metric.maxDrawdown)}</dd><p>{en ? 'Deepest observed decline within this window.' : 'La caída más profunda observada en esta ventana.'}</p></div></dl>
      <StatisticalDisclosure id="sl-drawdown-history" title={en ? 'View drawdown history' : 'Ver historial de caídas'} note={en ? 'Dated series and its sample scope' : 'Serie con fechas y alcance de su muestra'}><UnderwaterDrawdownChart asset={asset} frequency={frequency} window={window} locale={locale} /></StatisticalDisclosure>
    </section>
    <StatisticalDisclosure id="sl-horizons" title={en ? 'Compare horizons' : 'Comparar horizontes'} note={en ? 'The same asset and frequency, across every available period' : 'El mismo activo y frecuencia en todos los periodos disponibles'}><div className="sl-table-scroll" tabIndex={0} role="region" aria-label={en ? 'Horizon comparison' : 'Comparación de horizontes'}><table className="sl-table"><thead><tr><th>{en ? 'Metric' : 'Métrica'}</th>{manifest.windows.map(item => <th key={item}>{windowName(item, locale)}</th>)}</tr></thead><tbody>{[
      [en ? 'Extension percentile' : 'Percentil de extensión', (m: typeof metric) => number(m.ma200ExtensionPercentile, 1)],
      ['Z-score', (m: typeof metric) => number(m.ma200ExtensionZScore)],
      [en ? 'Extension observations' : 'Observaciones de extensión', (m: typeof metric) => String(extensionSample(m, frequency))],
      [en ? 'Price periods' : 'Periodos de precio', (m: typeof metric) => String(m.sessions)],
      [en ? 'Current drawdown' : 'Drawdown actual', (m: typeof metric) => percent(m.currentDrawdown)],
      [en ? 'Maximum drawdown' : 'Drawdown máximo', (m: typeof metric) => percent(m.maxDrawdown)],
      [en ? 'Available' : 'Disponible', (m: typeof metric) => m.available ? en ? 'Yes' : 'Sí' : en ? 'Insufficient history' : 'Historial insuficiente'],
    ].map(([label, format]) => <tr key={String(label)}><th>{String(label)}</th>{manifest.windows.map(item => <td key={item}>{(format as (m: typeof metric) => string)(data.windows[item])}</td>)}</tr>)}</tbody></table></div><p className="sl-caption">{en ? 'All values are already calculated in the same snapshot. Unavailable horizons remain unavailable; no shorter sample substitutes for them.' : 'Todos los valores están precalculados en el mismo snapshot. Las ventanas no disponibles permanecen sin resultado; no se sustituyen por muestras más cortas.'}</p></StatisticalDisclosure>
    <StatisticalDisclosure id="sl-quant" title={en ? 'Quantitative detail' : 'Detalle cuantitativo'} note={en ? 'Distributions, complete levels, seasonality, opening behavior and period history' : 'Distribuciones, niveles completos, estacionalidad, aperturas e historial de periodos'}>
      <p className="sl-caption">{en ? `Selected frequency: ${frequencyName(frequency, locale)}. Change it in More options. Distributions, opening statistics and period history retain their full or recent sample, independently of the main horizon.` : `Frecuencia seleccionada: ${frequencyName(frequency, locale)}. Puedes cambiarla en Más opciones. Distribuciones, aperturas e historial mantienen su muestra completa o reciente, independiente del periodo principal.`}</p>
      <section id="sl-asset-statistics"><AssetStatCard asset={asset} frequency={frequency} window={window} locale={locale} /></section>
      <section id="sl-levels"><KeyStatisticalLevelsPanel asset={asset} locale={locale} /></section>
      <section id="sl-distributions"><MovementSummaryTable asset={asset} frequency={frequency} locale={locale} /></section>
      <section id="sl-calendar"><AdvancedSeasonalityPanel data={seasonality} frequency={frequency} generatedAt={manifest.generatedAt} locale={locale} ticker={ticker} /></section>
      {frequency !== 'daily' ? <><section id="sl-opening"><OpeningLocationPanel asset={asset} frequency={frequency} locale={locale} /></section><section id="sl-periods"><PeriodExplorerTable asset={asset} frequency={frequency} locale={locale} /></section></> : null}
      {frequency !== 'monthly' ? <section id="sl-returns"><ReturnHeatmap asset={asset} frequency={frequency} locale={locale} /></section> : null}
      {frequency === 'daily' ? <section id="sl-extremes"><CalendarExtremesPanel asset={asset} frequency={frequency} locale={locale} /></section> : null}
    </StatisticalDisclosure>
    <StatisticalDisclosure id="sl-assets" title={en ? 'Compare assets' : 'Comparar activos'} note={en ? 'Up to 30 assets and their correlation matrix' : 'Hasta 30 activos y su matriz de correlación'}><p className="sl-notice">{en ? 'Asset summaries always use daily 5Y metrics. Correlations use the selected frequency and 3Y / 5Y / 10Y; 1Y and Full use All. Only completed returns on matching calendar dates are paired. Each cell shows the last matched completed observation. N is the number of valid matched pairs; at least 20 are required. Weekly keys use ISO weeks and monthly keys use calendar months.' : 'Los resúmenes de activos siempre usan métricas diarias de 5A. La correlación usa la frecuencia elegida y 3A / 5A / 10A; 1A y Todo el historial usan All. Solo se emparejan retornos completados de fechas coincidentes. Cada celda muestra la última observación completada común. N cuenta los pares válidos; se requieren al menos 20. Las claves semanales usan semanas ISO y las mensuales, meses de calendario.'}</p><ComparisonSection correlation={manifest.correlation} summaries={manifest.summaries} focusTicker={asset.ticker} frequency={frequency} window={window} locale={locale} /></StatisticalDisclosure>
    <StatisticalDisclosure id="sl-guide" title={en ? 'What do these levels mean?' : '¿Qué significan estos niveles?'} note={en ? 'A short guide, data sources and full methodology' : 'Guía breve, fuentes y metodología completa'}>
      <dl className="sl-guide-grid">{(en ? [
        ['Extension','Distance from a moving average, or a period opening when describing the opening levels. These are different reference points.'],
        ['Percentile','Places the current reading against observations in the same window. The empirical calculation includes observations equal to the current value.'],
        ['Z-score','Measures how many standard deviations a metric sits away from its historical average in the selected window.'],
        ['Sample','The number of observations behind a result. Extension observations exclude the moving-average warm-up. Seasonality marks N below 5 as limited.'],
        ['Drawdown','Shows distance from the high inside the analyzed window. Historical declines do not imply recovery or continuation.'],
        ['Seasonality','Groups historical returns by calendar dates. Average, median, positive-period rate and sample size answer different questions.'],
        ['Distance to average','Compares price with moving averages adapted to daily, weekly or monthly frequency.'],
        ['Limits','Descriptive levels depend on available history. They do not by themselves indicate when to buy or sell and are not automatic signals.'],
      ] : [
        ['Extensión','Distancia frente a una media móvil, o frente a la apertura al hablar de niveles del periodo. Son referencias diferentes.'],
        ['Percentil','Ubica el dato actual frente a observaciones de la misma ventana. El cálculo empírico incluye las observaciones iguales al valor actual.'],
        ['Z-score','Mide cuántas desviaciones se aleja una métrica de su media histórica dentro de la ventana seleccionada.'],
        ['Muestra','Número de observaciones que sustentan un resultado. La extensión descuenta la formación inicial de la media. La estacionalidad señala como limitada una N inferior a 5.'],
        ['Drawdown','Muestra la distancia desde el máximo de la ventana analizada. Las caídas históricas no implican recuperación ni continuidad.'],
        ['Estacionalidad','Agrupa retornos históricos por fechas de calendario. Promedio, mediana, proporción de periodos positivos y muestra responden preguntas distintas.'],
        ['Distancia a media','Compara el precio con medias móviles adaptadas a frecuencia diaria, por semana o mensual.'],
        ['Límites','Los niveles son descriptivos, dependen del historial disponible y no indican por sí solos cuándo comprar o vender ni son señales automáticas.'],
      ]).map(([term, definition]) => <div key={term}><dt>{term}</dt><dd>{definition}</dd></div>)}</dl>
      <div className="sl-provenance"><p>{en ? 'Source' : 'Fuente'}: <a href={manifest.sourceUrl} target="_blank" rel="noreferrer">{en ? 'Public market data · provider by availability · proprietary calculations' : 'Datos públicos de mercado · proveedor según disponibilidad · cálculos propios'}</a></p><p>{en ? 'Asset source' : 'Fuente del activo'}: {en ? asset.statusNote.replace('Datos públicos procesados vía','Public data processed via').replace('Sin datos suficientes desde fuentes públicas.','Not enough data from public sources.') : asset.statusNote}</p><p>{en ? 'Last market data' : 'Último dato de mercado'}: {manifest.generatedAt} · {en ? 'Asset as of' : 'Activo al'} {asset.lastDate ?? 'n/d'} · {en ? 'Snapshot generated' : 'Snapshot generado'}: {manifest.snapshotGeneratedAt ?? (en ? 'Not recorded in this snapshot' : 'No registrado en este snapshot')}</p><p>{en ? 'Data OK / limited history / unavailable' : 'Datos ok / historial limitado / no disponible'}: {manifest.statusCounts.ok} / {manifest.statusCounts.limited_history} / {manifest.statusCounts.unavailable}</p></div>
      {asset.dataAuthority && asset.currentMark ? <div id="sl-authority" className="sl-provenance"><p>{en ? 'Current mark observed' : 'Marca actual observada'}: <time dateTime={asset.currentMark.timestamp}>{asset.currentMark.timestamp}</time></p><p>{en ? 'Completed history through' : 'Historial completado hasta'}: {en ? 'daily' : 'diario'} {asset.dataAuthority.lastCompletedObservation.daily} · {en ? 'weekly' : 'semanal'} {asset.dataAuthority.lastCompletedObservation.weekly} · {en ? 'monthly' : 'mensual'} {asset.dataAuthority.lastCompletedObservation.monthly}</p><p>{en ? 'Current marks are separate from completed distributions, seasonality and date-matched correlations.' : 'Las marcas actuales se separan de las distribuciones, la estacionalidad y las correlaciones de periodos completados.'}</p><details><summary>{en ? 'Baseline provenance' : 'Procedencia del baseline'}</summary><p>{en ? 'Cutoff' : 'Corte'}: {asset.dataAuthority.snapshotCutoff}</p><p className="break-all">{asset.dataAuthority.baselineId}</p><p className="break-all">Raw SHA256: {asset.dataAuthority.rawSha256}</p><p>{en ? 'Explicit baseline authority migration. The cause of historical drift remains unexplained.' : 'Migración explícita de autoridad del baseline. La causa del drift histórico sigue sin explicación.'}</p></details></div> : null}
      {shouldShowJpmSpxLevels(asset.ticker) ? <JpmSpxLevelsPanel locale={locale} /> : null}
      <a className="sl-method-link" href={en ? '/en/methodology' : '/metodologia'}>{en ? 'Read the full methodology' : 'Leer la metodología completa'} <span aria-hidden="true">↗</span></a>
    </StatisticalDisclosure>
    <p className="sl-footer-note">{en ? 'Educational reading. This is not financial advice or an execution instruction. Historical positioning only; it does not imply future direction.' : 'Lectura educativa. No constituye asesoría financiera ni instrucción operativa. No implica dirección futura; solo posición frente al historial.'}</p>
  </div>;
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
        correlationBody: "Completed returns are paired on matching calendar dates. The date below N is the effective last matched observation. N counts valid matched pairs; at least 20 are required. Weekly keys identify ISO weeks; monthly keys identify calendar months.",
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
        correlationBody: "Los retornos completados se emparejan por fechas coincidentes. La fecha bajo N es la última observación efectiva común. N cuenta pares válidos; se requieren al menos 20. Las claves semanales identifican semanas ISO y las mensuales, meses de calendario.",
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
              <p className="text-xs">{locale === "en" ? "Completed history through" : "Historial completado hasta"}: {asset.historicalThroughDate ?? "n/d"}</p>
              <p>{copy.extension} <span className="font-semibold text-ink">{asset.extension.percentile5Y === null ? "n/d" : asset.extension.percentile5Y.toFixed(1)}</span></p>
              <p>{copy.zScore} <span className="font-semibold text-ink">{asset.extension.zScore5Y === null ? "n/d" : asset.extension.zScore5Y.toFixed(2)}</span></p>
              <p>{copy.longAverage} <span className="font-semibold text-ink">{asset.distanceToMovingAverages.ma200 === null ? "n/d" : `${(asset.distanceToMovingAverages.ma200 * 100).toFixed(1)}%`}</span></p>
            </div>
          </div>
        ))}
      </div>

      <div id="sl-correlation" className="mt-5 border border-line bg-panelSoft p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-base font-semibold text-ink">{copy.correlationTitle}</h3>
            <p className="mt-1 text-sm leading-6 text-muted">{copy.correlationBody}</p>
          </div>
          <span className="w-fit border border-line bg-panel px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {(locale === "en" ? englishFrequencyLabels : frequencyLabels)[frequency]} · {correlationWindow === "All" ? (locale === "en" ? "Full history" : "Todo el historial") : locale === "en" ? correlationWindow : correlationWindow.replace("Y", "A")}
          </span>
        </div>
        <CorrelationHeatmap locale={locale} matrix={correlationMatrix} selectedTickers={selectedTickers} emptyLabel={copy.correlationEmpty} />
      </div>
    </section>
  );
}

export function CorrelationHeatmap({
  locale = "es",
  emptyLabel,
  matrix,
  selectedTickers,
}: {
  locale?: "es" | "en";
  emptyLabel: string;
  matrix: CorrelationMatrix | null;
  selectedTickers: string[];
}) {
  const available = matrix?.alignment === "canonical_calendar_date" ? selectedTickers.filter((ticker) => matrix.tickers.includes(ticker)).slice(0, 30) : [];

  if (!matrix || available.length < 2) {
    return <p className="mt-4 border border-line bg-panel px-3 py-3 text-sm leading-6 text-muted">{emptyLabel}</p>;
  }

  return (
    <div className="mt-4 max-w-full overflow-x-auto [contain:paint]" tabIndex={0} role="region" aria-label={emptyLabel}>
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
          <RowCells locale={locale} key={rowTicker} matrix={matrix} rowTicker={rowTicker} tickers={available} />
        ))}
      </div>
    </div>
  );
}

function RowCells({ matrix, rowTicker, tickers, locale }: { matrix: CorrelationMatrix; rowTicker: string; tickers: string[]; locale: "es" | "en" }) {
  return (
    <>
      <div className="border-t border-line bg-panelSoft p-2 font-semibold text-ink">{displayStatTicker(rowTicker)}</div>
      {tickers.map((columnTicker) => {
        const n = matrix.matchedObservations?.[rowTicker]?.[columnTicker] ?? 0;
        const value = n >= matrix.minObservations ? matrix.values[rowTicker]?.[columnTicker] ?? null : null;
        const diagonal = rowTicker === columnTicker;
        const through = matrix.effectiveThroughDate?.[rowTicker]?.[columnTicker] ?? null;
        return (
          <div
            key={`${rowTicker}-${columnTicker}`}
            className={`border-l border-t border-line p-2 text-center font-semibold ${diagonal ? "text-white" : "text-ink"}`}
            style={{ backgroundColor: correlationColor(value, diagonal) }}
            title={`${rowTicker} / ${columnTicker}: ${formatCorrelation(value)} · N ${n} · ${locale === "en" ? "Through" : "Hasta"} ${through ?? "n/d"}`}
            data-effective-through={through ?? ""}
            data-correlation-pair={`${rowTicker}/${columnTicker}`}
          >
            {formatCorrelation(value)}<small className="mt-1 block font-normal">N {n}</small><small className="mt-1 block whitespace-nowrap text-[9px] font-normal">{through ?? "n/d"}</small>
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
  if (diagonal) return "#123b3d";
  if (value === null) return "#f6f1ea";
  if (value >= 0.8) return "#bccdcc";
  if (value >= 0.6) return "#d3dfdc";
  if (value >= 0.3) return "#e2e9e6";
  if (value >= 0.15) return "#edf0eb";
  if (value > -0.15) return "#f6f1ea";
  if (value > -0.45) return "#eee5d6";
  return "#d9c8a8";
}
