import type { AssetStatRecord, StatisticalFrequency, StatisticalLevelsManifest, StatisticalWindow } from '@/lib/statistical-levels/types';
import { displayStatName, displayStatTicker } from '@/lib/statistical-levels/display';
import { extensionSample, frequencyName, number, percent, windowName } from '@/lib/statistical-levels/interpretation';
import { StatisticalHelp } from './StatisticalHelp';

// Format only recorded dates. Never infer completion from today's calendar.
function recordedDate(value: string | null | undefined, locale: 'es' | 'en') {
  if (!value) return locale === 'es' ? 'No registrada' : 'Not recorded';
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (!Number.isFinite(date.getTime())) return locale === 'es' ? 'No registrada' : 'Not recorded';
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    ...(value.length > 10 ? { hour: '2-digit', minute: '2-digit' } as const : {}),
  }).format(date) + (value.length > 10 ? ' UTC' : '');
}

export function StatisticalOverview({ asset, frequency, window, manifest, locale }: {
  asset: AssetStatRecord; frequency: StatisticalFrequency; window: StatisticalWindow;
  manifest: StatisticalLevelsManifest; locale: 'es' | 'en';
}) {
  const en = locale === 'en';
  const data = asset.frequencies[frequency];
  const metric = data.windows[window];
  const sample = extensionSample(metric, frequency);
  const observed = asset.currentMark?.date ?? asset.lastDate;
  const mark = asset.currentMark?.value ?? asset.lastClose;
  // These two values come from the SAME completed-frequency window.
  // The latest market mark is separately labeled and is never ranked here.
  const extension = metric.available ? metric.ma200Extension : null;
  const percentile = metric.available && sample >= 2 ? metric.ma200ExtensionPercentile : null;
  return <>
    <div className="sl-data-dates">
      <p>{en ? 'Data updated' : 'Datos actualizados'} <time dateTime={manifest.snapshotGeneratedAt}>{recordedDate(manifest.snapshotGeneratedAt, locale)}</time></p>
      <p>{en ? 'Statistical close' : 'Cierre estadístico'} <span>{frequencyName(frequency, locale)}</span> <time dateTime={data.lastDate ?? undefined}>{recordedDate(data.lastDate, locale)}</time>
        <StatisticalHelp label={en ? 'About these dates' : 'Sobre estas fechas'}>
          {en ? 'Data updated records when this dataset was generated. Statistical close is the last completed observation used at the selected frequency. They can differ: a new market mark does not complete a week or month. Dates and times are shown in UTC.' : 'Datos actualizados indica cuándo se generó este conjunto de datos. Cierre estadístico es la última observación completada que usa la frecuencia seleccionada. Pueden diferir: una nueva marca de mercado no completa una semana o un mes. Las fechas y horas se muestran en UTC.'}
        </StatisticalHelp>
      </p>
    </div>
    <section className="sl-overview" aria-label={en ? 'Selected asset overview' : 'Resumen del activo seleccionado'}>
      <div className="sl-overview-asset"><strong>{displayStatTicker(asset.ticker)}</strong><span>{displayStatName(asset.ticker, asset.name)}</span></div>
      <dl className="sl-overview-metrics">
        <div><dt>{en ? 'Latest market mark' : 'Última marca de mercado'}</dt><dd>{number(mark, asset.ticker === 'BTCUSD' ? 0 : 2)}</dd><small>{en ? 'Observed' : 'Observada'} <time dateTime={observed ?? undefined}>{recordedDate(observed, locale)}</time></small></div>
        <div><dt>{en ? 'Extension vs.' : 'Extensión frente a'} {data.longMovingAverageKey}</dt><dd>{percent(extension)}</dd><small>{en ? 'At the statistical close' : 'Al cierre estadístico'} · {frequencyName(frequency, locale)}</small></div>
        <div className="sl-overview-rank"><dt>{en ? 'Extension percentile' : 'Percentil de extensión'}</dt><dd><span>{percentile !== null && Number.isFinite(percentile) ? `P${number(percentile, 1)}` : 'n/d'}</span></dd><small>{windowName(window, locale)} · {sample} {en ? 'observations' : 'observaciones'}</small></div>
      </dl>
    </section>
  </>;
}
