'use client';
import type { DailySeasonalityData, StatisticalWindow } from '@/lib/statistical-levels/types';
import { returnBarGeometry, winRateWidth } from './interaction-presentation';
import { percent, windowName } from '@/lib/statistical-levels/interpretation';

export function CurrentMonthSeasonality({ data, asOf, locale, window }: { data: DailySeasonalityData; asOf: string; locale: 'es' | 'en'; window: StatisticalWindow }) {
  const en = locale === 'en';
  const date = new Date(`${asOf}T00:00:00Z`);
  const month = date.getUTCMonth() + 1;
  const monthName = Number.isFinite(month) ? date.toLocaleDateString(en ? 'en-US' : 'es-ES', { month: 'long', timeZone: 'UTC' }) : 'n/d';
  const period = windowName(window, locale);
  const calendarMonth = monthName.charAt(0).toLocaleUpperCase(locale) + monthName.slice(1);
  // Only use the requested horizon. The snapshot has no 1Y seasonality;
  // do not silently replace it with a longer historical sample.
  const seasonalityWindow = window === 'Full' ? 'All' : window === '1Y' ? null : window;
  const windowData = seasonalityWindow ? data.windows[seasonalityWindow] ?? (seasonalityWindow === 'All' ? data.windows.Full : undefined) : undefined;
  const cells = windowData?.weekly?.general.filter(cell => cell.month === month) ?? [];
  const returnScale = Math.max(0, ...cells.filter(cell => cell.sampleSize > 0).map(cell => Math.abs(cell.averageReturn ?? 0)));
  const monthly = windowData?.monthly?.general.find(cell => cell.month === month);
  return <section id="sl-seasonality" className="sl-seasonality">
    <details id="sl-seasonality-disclosure" className="sl-disclosure">
      <summary><span>{en ? 'How has this month behaved?' : '¿Cómo suele comportarse este mes?'}<small className="sl-seasonality-month">{calendarMonth} · {en ? 'Average returns and share of positive weeks' : 'Retornos promedio y proporción de semanas positivas'}</small></span><span aria-hidden="true" className="sl-disclosure-mark">+</span></summary>
    <div className="sl-seasonality-body">
    {windowData ? <>
    <p className="sl-season-summary">{en ? 'Monthly average' : 'Promedio mensual'} <strong>{percent(monthly?.averageReturn ?? null, 2)}</strong><span>{en ? 'Positive months' : 'Meses positivos'} {monthly?.winRate == null ? 'n/d' : `${(monthly.winRate * 100).toFixed(0)}%`} · N {monthly?.sampleSize ?? 0}{monthly && monthly.sampleSize < 5 ? en ? ' · Limited sample' : ' · Muestra limitada' : ''}</span></p>
    <div className="sl-weeks">{[1,2,3,4,5].map(week => {
      const cell = cells.find(item => item.weekOfMonth === week);
      const n = cell?.sampleSize ?? 0;
      const bar = returnBarGeometry(n ? cell?.averageReturn ?? null : null, returnScale);
      const rateWidth = winRateWidth(n ? cell?.winRate ?? null : null);
      return <article key={week} data-week={week} data-limited={n < 5}>
        <h3>{en ? 'Week' : 'Semana'} {week}</h3>
        <p className="sl-week-value">{n ? percent(cell?.averageReturn ?? null, 2) : 'n/d'}</p>
        <p className="sl-week-return-label">{en ? 'Average return' : 'Retorno promedio'}</p>
        <div className="sl-return-micro" aria-hidden="true" data-direction={bar.direction}>
          <span className="sl-return-zero" />
          <span className="sl-return-fill" style={{ left: `${bar.left}%`, width: `${bar.width}%` }} />
        </div>
        <p className="sl-week-rate">{en ? 'Positive weeks' : 'Semanas positivas'} <strong>{n && cell?.winRate != null ? `${(cell.winRate * 100).toFixed(0)}%` : 'n/d'}</strong></p>
        <div className="sl-win-micro" aria-hidden="true" data-available={rateWidth !== null}>
          <span style={{ width: `${rateWidth ?? 0}%` }} />
        </div>
        <small>N {n}{n < 5 ? en ? ' · Limited sample' : ' · Muestra limitada' : ''}</small>
      </article>;
    })}</div>
    <p className="sl-caption">{en ? 'Weeks are grouped by their closing date: days 1–7, 8–14, 15–21, 22–28 and 29–31. Historical samples contain only completed UTC calendar periods; the current week and month are excluded. Median, cycles and calendar detail are available below.' : 'Las semanas se agrupan por fecha de cierre: días 1–7, 8–14, 15–21, 22–28 y 29–31. Las muestras históricas contienen solo periodos de calendario UTC completos; se excluyen la semana y el mes en curso. Mediana, ciclos y detalle por calendario están disponibles más abajo.'}</p>
    <p className="sl-caption">{en ? "Completed observations through" : "Observaciones completas hasta"}: {en ? "monthly" : "mensual"} {data.historicalSample?.completedThrough.monthly ?? "n/d"} · {en ? "weekly" : "semanal"} {data.historicalSample?.completedThrough.weekly ?? "n/d"}.</p>
    <p className="sl-disclaimer">{en ? 'Seasonality describes historical frequency, not what will happen this year.' : 'La estacionalidad describe frecuencia histórica, no lo que ocurrirá este año.'}</p>
    </> : <p className="sl-notice" role="status">{en ? `This dataset does not include seasonality for the ${period} horizon. Select 3Y, 5Y, 10Y or full history in the top controls.` : `Este conjunto de datos no incluye estacionalidad para el horizonte de ${period}. Selecciona 3A, 5A, 10A o todo el historial en los controles superiores.`}</p>}
    </div></details>
  </section>;
}
