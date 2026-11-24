import type { AssetStatRecord, StatisticalFrequency } from '@/lib/statistical-levels/types';
import { number } from '@/lib/statistical-levels/interpretation';
import { explorerHistory } from '@/lib/statistical-levels/period-history';
import { StatisticalHelp } from './StatisticalHelp';

export function currentOpeningPercentile(asset: AssetStatRecord, kind: 'weekly' | 'monthly') {
  const levels = asset.keyStatisticalLevels[kind];
  const data = asset.frequencies[kind];
  if (!levels.available || levels.currentOpen === null || levels.lastClose === null || levels.currentOpen <= 0 || !Number.isFinite(levels.currentOpen) || !Number.isFinite(levels.lastClose)) return null;
  const extension = levels.lastClose / levels.currentOpen - 1;
  const distribution = extension < 0 ? 'low' : 'high';
  const history = explorerHistory(data);
  // Match the completed movement sample; never rank against only the recent 80 rows.
  if (history.length < 2 || history.length !== data.periods - 1) return null;
  const values = history.flatMap(row => {
    const extreme = distribution === 'low' ? row.low : row.high;
    return row.open !== null && row.open > 0 && Number.isFinite(row.open) && extreme !== null && Number.isFinite(extreme) && extreme > 0 ? [extreme / row.open - 1] : [];
  });
  if (values.length !== history.length) return null;
  return { value: values.filter(value => value <= extension).length / values.length * 100, distribution, sample: values.length };
}

export function HistoricalRange({ asset, frequency, locale }: { asset: AssetStatRecord; frequency: StatisticalFrequency; locale: 'es' | 'en' }) {
  const kind = frequency === 'weekly' ? 'weekly' : 'monthly';
  const prefix = kind === 'weekly' ? 'W' : 'M';
  const data = asset.keyStatisticalLevels[kind];
  const en = locale === 'en';
  const markPercentile = currentOpeningPercentile(asset, kind);
  const rankLabel = markPercentile ? `≈P${number(markPercentile.value, 1)} · ${markPercentile.distribution === 'low' ? en ? 'lows' : 'mínimos' : en ? 'highs' : 'máximos'}` : en ? 'Percentile n/a' : 'Percentil n/d';
  const rankHelp = en
    ? 'Approximate percentile of the mark’s move from the current opening, compared with completed historical lows when negative and highs otherwise. Uses the available historical prices rounded to two decimals, independently of the selected horizon. It is separate from the moving-average-extension percentile.'
    : 'Percentil aproximado del movimiento de la marca desde la apertura actual, comparado con los mínimos históricos completados si es negativo y con los máximos en los demás casos. Usa los precios históricos disponibles, redondeados a dos decimales, independientemente del horizonte elegido. Es distinto del percentil de extensión frente a la media móvil.';
  const percentileKeys = ['p10', 'p25', 'p50', 'p75', 'p90'] as const;
  const distributions = asset.frequencies[kind].changeMoves;
  // These are the stored quantiles of high/open-1 and low/open-1.
  // Convert to prices at the current opening; do not rank the market price
  // or reinterpret these as the separate MA-extension percentile.
  const percentileGroups = [
    { id: 'low', label: en ? 'Lows from open' : 'Mínimos desde apertura', distribution: distributions.lowExtensionFromOpen },
    { id: 'high', label: en ? 'Highs from open' : 'Máximos desde apertura', distribution: distributions.highExtensionFromOpen },
  ].map(group => ({ ...group, markers: percentileKeys.flatMap(key => {
    const value = group.distribution[key];
    if (!data.available || data.currentOpen === null || !Number.isFinite(data.currentOpen) || value === null || !Number.isFinite(value)) return [];
    return [{ key, label: key.toUpperCase(), value: data.currentOpen * (1 + value) }];
  }) }));
  const items = [
    { id: 'lower', label: en ? 'Average lower extension' : 'Extensión inferior promedio', value: data.levels[`${prefix}ALE`] ?? null },
    { id: 'open', label: en ? 'Period opening' : 'Apertura del periodo', value: data.currentOpen },
    { id: 'price', label: en ? 'Latest available mark' : 'Última marca disponible', value: data.lastClose },
    { id: 'upper', label: en ? 'Average upper extension' : 'Extensión superior promedio', value: data.levels[`${prefix}AHE`] ?? null },
  ];
  const values = items.map(item => item.value).filter((value): value is number => value !== null && Number.isFinite(value));
  const valid = data.available && values.length === 4;
  const percentileValues = percentileGroups.flatMap(group => group.markers.map(marker => marker.value));
  const min = Math.min(...values, ...percentileValues), max = Math.max(...values, ...percentileValues);
  const position = (value: number) => 5 + ((value - min) / (max - min || 1)) * 90;
  return <section id="sl-range" className="sl-section sl-range">
    <div className="sl-section-heading"><h2>{en ? 'Where it is now' : 'Dónde está ahora'}</h2><p>{kind === 'weekly' ? en ? 'Weekly levels' : 'Niveles semanales' : en ? 'Monthly levels' : 'Niveles mensuales'} · {en ? 'Full completed history' : 'Todo el historial completado'}</p></div>
    <p className="sl-range-scale-note">{en ? 'Price scale · levels measured from the period opening' : 'Escala de precios · niveles desde la apertura del periodo'}</p>
    {valid ? <><div className="sl-range-graphic" role="group" aria-label={`${items.map(item => `${item.label}: ${number(item.value, asset.ticker === 'BTCUSD' ? 0 : 2)}`).join('. ')}. ${rankLabel}`}>
      <div className="sl-range-axis" />
      <div className="sl-range-band" style={{ left: `${position(items[0].value!)}%`, width: `${position(items[3].value!) - position(items[0].value!)}%` }} />
      {items.map(item => <div key={item.id} className={`sl-marker sl-marker-${item.id}`} style={{ left: `${position(item.value!)}%` }}><span />{item.id === 'price' ? <b title={rankHelp} style={{ transform: position(item.value!) < 25 ? 'translateX(0)' : position(item.value!) > 75 ? 'translateX(-100%)' : 'translateX(-50%)' }}>{en ? 'Mark' : 'Marca'} {number(item.value, asset.ticker === 'BTCUSD' ? 0 : 2)}<small>{rankLabel}</small></b> : null}</div>)}
      {percentileGroups.flatMap(group => group.markers.map(marker => <span key={`${group.id}-${marker.key}`} className="sl-opening-percentile" data-distribution={group.id} data-quantile={marker.key} data-edge={position(marker.value) < 30 ? 'start' : position(marker.value) > 70 ? 'end' : 'middle'} style={{ left: `${position(marker.value)}%` }}>
        <span className="sl-opening-percentile-tick" aria-hidden="true" />
        <StatisticalHelp label={`${group.label} · ${marker.label}: ${number(marker.value, asset.ticker === 'BTCUSD' ? 0 : 2)}`}><strong>{group.label} · {marker.label}</strong><br />{number(marker.value, asset.ticker === 'BTCUSD' ? 0 : 2)}<br />{en ? 'Price equivalent at the current period opening.' : 'Equivalente en precio desde la apertura actual.'}</StatisticalHelp>
        <span className="sl-opening-percentile-label" aria-hidden="true"><small>{group.id === 'low' ? en ? 'Low' : 'Mín.' : en ? 'High' : 'Máx.'}</small><span>{marker.label}</span></span>
      </span>))}
    </div>
    {percentileValues.length ? <div className="sl-range-percentiles">
      <p className="sl-percentile-heading">{en ? 'Historical percentiles from the opening' : 'Percentiles históricos desde la apertura'} <StatisticalHelp label={en ? 'About opening percentiles' : 'Sobre los percentiles desde apertura'}>{en ? 'P10, P25, P50, P75 and P90 are the stored quantiles of two separate historical distributions: lows and highs relative to their period opening. They are shown as prices using the current opening and share the level chart’s linear price scale. They use completed full history, independently of the selected horizon. These are not price percentiles or moving-average-extension percentiles.' : 'P10, P25, P50, P75 y P90 son los cuantiles ya calculados de dos distribuciones históricas separadas: mínimos y máximos respecto a la apertura de cada periodo. Se expresan como precios usando la apertura actual y comparten la escala lineal del gráfico de niveles. Usan todo el historial completado, independientemente del horizonte elegido. No son percentiles del precio ni de la extensión frente a la media móvil.'}</StatisticalHelp></p>
      {percentileGroups.filter(group => group.markers.length).map(group => <span key={group.id} className="sl-percentile-legend" data-distribution={group.id}><span aria-hidden="true" />{group.label}</span>)}
    </div> : null}</> : <p className="sl-notice">{en ? 'Not enough completed history for extension levels.' : 'Historial completado insuficiente para los niveles de extensión.'}</p>}
    <dl className="sl-range-values">{items.map(item => <div key={item.id}><dt>{item.label}</dt><dd>{number(item.value, asset.ticker === 'BTCUSD' ? 0 : 2)}</dd></div>)}</dl>
    <p className="sl-caption">{asset.currentMark ? <span>{en ? "Mark observed" : "Marca observada"}: {asset.currentMark.date}. </span> : null}{en ? `${data.periods} completed ${kind === 'weekly' ? 'weeks' : 'months'}. Average and strong extensions remain available in Complete statistical levels. These levels use full history, independently of the selected horizon.` : `${data.periods} ${kind === 'weekly' ? 'semanas completadas' : 'meses completados'}. Las extensiones promedio y fuertes están en Niveles estadísticos completos. Estos niveles usan todo el historial, independientemente del periodo elegido.`} <StatisticalHelp label={en ? 'About the mark percentile' : 'Sobre el percentil de la marca'}>{rankHelp}{markPercentile ? <><br />{en ? 'Sample' : 'Muestra'}: {markPercentile.sample}.</> : null}</StatisticalHelp></p>
    <p className="sl-disclaimer">{en ? 'These levels describe historically observed extensions. They do not indicate where price should bounce or reverse.' : 'Estos niveles describen extensiones observadas históricamente. No indican dónde debería rebotar o girar el precio.'}</p>
  </section>;
}
