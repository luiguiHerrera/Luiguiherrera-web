'use client';
import { useState } from 'react';
import type { DailySeasonalityData, SeasonalityWindow } from '@/lib/statistical-levels/types';
import { percent } from '@/lib/statistical-levels/interpretation';

export function CurrentMonthSeasonality({ data, asOf, locale }: { data: DailySeasonalityData; asOf: string; locale: 'es' | 'en' }) {
  const [window, setWindow] = useState<SeasonalityWindow>('5Y');
  const en = locale === 'en';
  const date = new Date(`${asOf}T00:00:00Z`);
  const month = date.getUTCMonth() + 1;
  const monthName = Number.isFinite(month) ? date.toLocaleDateString(en ? 'en-US' : 'es-ES', { month: 'long', timeZone: 'UTC' }) : 'n/d';
  const windowData = data.windows[window] ?? (window === 'All' ? data.windows.Full : undefined);
  const cells = windowData?.weekly?.general.filter(cell => cell.month === month) ?? [];
  const monthly = windowData?.monthly?.general.find(cell => cell.month === month);
  return <section id="sl-seasonality" className="sl-section">
    <div className="sl-section-heading"><div><p className="sl-eyebrow">{monthName} · {en ? 'Snapshot month' : 'Mes del último dato'}</p><h2>{en ? 'How has this month behaved?' : '¿Cómo suele comportarse este mes?'}</h2></div>
      <label className="sl-select-label">{en ? 'Seasonality period' : 'Periodo de estacionalidad'}<select value={window} onChange={event => setWindow(event.target.value as SeasonalityWindow)}>{['3Y','5Y','10Y','All'].map(value => <option key={value} value={value}>{value === 'All' ? en ? 'Full history' : 'Todo el historial' : en ? value : value.replace('Y','A')}</option>)}</select></label>
    </div>
    <p className="sl-season-summary">{en ? 'Monthly average' : 'Promedio mensual'} <strong>{percent(monthly?.averageReturn ?? null, 2)}</strong><span>{en ? 'Positive months' : 'Meses positivos'} {monthly?.winRate == null ? 'n/d' : `${(monthly.winRate * 100).toFixed(0)}%`} · N {monthly?.sampleSize ?? 0}{monthly && monthly.sampleSize < 5 ? en ? ' · Limited sample' : ' · Muestra limitada' : ''}</span></p>
    <div className="sl-weeks">{[1,2,3,4,5].map(week => {
      const cell = cells.find(item => item.weekOfMonth === week);
      const n = cell?.sampleSize ?? 0;
      return <article key={week} data-week={week}><h3>{en ? 'Week' : 'Semana'} {week}</h3><p className="sl-week-value">{n ? percent(cell?.averageReturn ?? null, 2) : 'n/d'}</p><p>{en ? 'Average return' : 'Retorno promedio'}</p><p className="sl-week-rate">{en ? 'Positive weeks' : 'Semanas positivas'} <strong>{n && cell?.winRate != null ? `${(cell.winRate * 100).toFixed(0)}%` : 'n/d'}</strong></p><small>N {n}{n < 5 ? en ? ' · Limited sample' : ' · Muestra limitada' : ''}</small></article>;
    })}</div>
    <p className="sl-caption">{en ? 'Weeks are grouped by their closing date: days 1–7, 8–14, 15–21, 22–28 and 29–31. Historical samples contain only completed UTC calendar periods; the current week and month are excluded. Median, cycles and calendar detail are available below.' : 'Las semanas se agrupan por fecha de cierre: días 1–7, 8–14, 15–21, 22–28 y 29–31. Las muestras históricas contienen solo periodos de calendario UTC completos; se excluyen la semana y el mes en curso. Mediana, ciclos y detalle por calendario están disponibles más abajo.'}</p>
    <p className="sl-caption">{en ? "Completed observations through" : "Observaciones completas hasta"}: {en ? "monthly" : "mensual"} {data.historicalSample?.completedThrough.monthly ?? "n/d"} · {en ? "weekly" : "semanal"} {data.historicalSample?.completedThrough.weekly ?? "n/d"}.</p>
    <p className="sl-disclaimer">{en ? 'Seasonality describes historical frequency, not what will happen this year.' : 'La estacionalidad describe frecuencia histórica, no lo que ocurrirá este año.'}</p>
  </section>;
}
