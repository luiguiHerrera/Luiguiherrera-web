import type { AssetStatRecord, StatisticalFrequency } from '@/lib/statistical-levels/types';
import { number } from '@/lib/statistical-levels/interpretation';

export function HistoricalRange({ asset, frequency, locale }: { asset: AssetStatRecord; frequency: StatisticalFrequency; locale: 'es' | 'en' }) {
  const kind = frequency === 'weekly' ? 'weekly' : 'monthly';
  const prefix = kind === 'weekly' ? 'W' : 'M';
  const data = asset.keyStatisticalLevels[kind];
  const en = locale === 'en';
  const items = [
    { id: 'lower', label: en ? 'Average lower extension' : 'Extensión inferior promedio', value: data.levels[`${prefix}ALE`] ?? null },
    { id: 'open', label: en ? 'Period opening' : 'Apertura del periodo', value: data.currentOpen },
    { id: 'price', label: en ? 'Latest available mark' : 'Última marca disponible', value: data.lastClose },
    { id: 'upper', label: en ? 'Average upper extension' : 'Extensión superior promedio', value: data.levels[`${prefix}AHE`] ?? null },
  ];
  const values = items.map(item => item.value).filter((value): value is number => value !== null && Number.isFinite(value));
  const valid = data.available && values.length === 4;
  const min = Math.min(...values), max = Math.max(...values);
  const position = (value: number) => 5 + ((value - min) / (max - min || 1)) * 90;
  return <section id="sl-range" className="sl-section sl-range">
    <div className="sl-section-heading"><h2>{en ? 'Where it is now' : 'Dónde está ahora'}</h2><p>{kind === 'weekly' ? en ? 'Weekly levels' : 'Niveles semanales' : en ? 'Monthly levels' : 'Niveles mensuales'} · {en ? 'Full completed history' : 'Todo el historial completado'}</p></div>
    {valid ? <div className="sl-range-graphic" role="img" aria-label={items.map(item => `${item.label}: ${number(item.value, asset.ticker === 'BTCUSD' ? 0 : 2)}`).join('. ')}>
      <div className="sl-range-axis" />
      <div className="sl-range-band" style={{ left: `${position(items[0].value!)}%`, width: `${position(items[3].value!) - position(items[0].value!)}%` }} />
      {items.map(item => <div key={item.id} className={`sl-marker sl-marker-${item.id}`} style={{ left: `${position(item.value!)}%` }}><span />{item.id === 'price' ? <b style={{ transform: position(item.value!) < 25 ? 'translateX(0)' : position(item.value!) > 75 ? 'translateX(-100%)' : 'translateX(-50%)' }}>{en ? 'Mark' : 'Marca'} {number(item.value, asset.ticker === 'BTCUSD' ? 0 : 2)}</b> : null}</div>)}
    </div> : <p className="sl-notice">{en ? 'Not enough completed history for extension levels.' : 'Historial completado insuficiente para los niveles de extensión.'}</p>}
    <dl className="sl-range-values">{items.map(item => <div key={item.id}><dt>{item.label}</dt><dd>{number(item.value, asset.ticker === 'BTCUSD' ? 0 : 2)}</dd></div>)}</dl>
    <p className="sl-caption">{asset.currentMark ? <span>{en ? "Mark observed" : "Marca observada"}: {asset.currentMark.date}. </span> : null}{en ? `${data.periods} completed ${kind === 'weekly' ? 'weeks' : 'months'}. Average and strong extensions remain available in Quantitative detail. These levels use full history, independently of the selected horizon.` : `${data.periods} ${kind === 'weekly' ? 'semanas completadas' : 'meses completados'}. Las extensiones promedio y fuertes están en Detalle cuantitativo. Estos niveles usan todo el historial, independientemente del periodo elegido.`}</p>
    <p className="sl-disclaimer">{en ? 'These levels describe historically observed extensions. They do not indicate where price should bounce or reverse.' : 'Estos niveles describen extensiones observadas históricamente. No indican dónde debería rebotar o girar el precio.'}</p>
  </section>;
}
