"use client";
import { flowMagnitudeReferences, magnitudePercentileText } from '@/lib/dashboard/flow-magnitude';


import { useId, useState } from 'react';
import { dashboardText, type DashboardLocale } from '@/lib/dashboard/dashboard-localization';
import { DashboardChartCursor } from './DashboardChartCursor';
import { flowCardTitle, formatFlowAmount } from '@/lib/dashboard/dashboard-overview';
import { DashboardDisclosureButton } from './DashboardPrimitives';
import { compareFlowWindow, summarizeFlowWindow } from '@/lib/dashboard/capital-flow-comparison.mjs';
import { interpretFlows } from '@/lib/dashboard/sp500-etf-flows.mjs';
import type { AggregatePoint } from '@/lib/dashboard/sp500-etf-flows.mjs';
import type { CapitalFlowAssetPreview } from '@/lib/dashboard/capital-flows-preview-types';
import styles from './capital-flow-preview.module.css';

function formatFlowDate(value: string | null, year: boolean, locale:DashboardLocale) {
  const t = (value:string) => dashboardText(locale,value);
  return value ? new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES', { day:'numeric',month:'short',...(year ? {year:'numeric' as const} : {}),timeZone:'UTC' }).format(new Date(`${value}T12:00Z`)) : t('Sin cierre disponible');
}
const tone = (value: number | null) => value == null || value === 0 ? 'neutral' : value > 0 ? 'positive' : 'negative';

function CapitalFlowChart({ points, kind, asset, locale }: { points: AggregatePoint[]; kind: 'estimated' | 'published'; asset: string; locale:DashboardLocale }) {
  const t = (value:string) => dashboardText(locale,value);
  const date = (value:string|null,year=true) => formatFlowDate(value,year,locale);
  const usd = (value:number|null) => formatFlowAmount(value,locale);
  const [active, setActive] = useState<number | null>(null);
  const tooltipId = useId();
  const maxDaily = Math.max(1, ...points.map(point => Math.abs(point.flow ?? 0)));
  const step = 92 / Math.max(1, points.length);
  const plot = points.reduce<(AggregatePoint & { cumulative:number | null; segment:number; x:number })[]>((values, point, i) => {
    const previous = values.at(-1);
    const valid = point.complete && point.flow != null;
    return [...values, { ...point, cumulative:valid ? (previous?.cumulative ?? 0) + point.flow! : null,
      segment:(previous?.segment ?? 0) + (valid ? 0 : 1), x:4 + step * (i + .5) }];
  }, []);
  const cumulative = plot.flatMap(point => point.cumulative == null ? [] : [point.cumulative]);
  const min = Math.min(0,...cumulative), max = Math.max(0,...cumulative), range = Math.max(1,max-min);
  const lineY = (value:number) => 8 + (max-value) / range * 25;
  const segments = Array.from(new Set(plot.map(point=>point.segment))).map(segment=>plot.filter(point=>point.segment===segment && point.cumulative!=null));
  const selected = active == null ? null : plot[active];
  const summary = summarizeFlowWindow(points);
  return <figure className={styles.chart} data-flow-tone={tone(summary.total)} data-capital-flow-chart={asset}>
    <figcaption><div><p>{t("SESIONES RECIENTES")}</p><h4>{summary.missing?t('Flujo neto diario y acumulado por tramos disponibles'):t('Flujo neto diario y trayectoria acumulada de la ventana')}</h4></div><span>{t("Millones de USD")}</span></figcaption>
    {plot.length ? <>
      <div className={styles.plot}>
        <svg viewBox="0 0 100 78" preserveAspectRatio="none" aria-hidden="true">
          <line x1="4" x2="96" y1="38" y2="38" stroke="#ded8c9" strokeWidth=".6" vectorEffect="non-scaling-stroke" />
          <line x1="4" x2="96" y1="57" y2="57" stroke="#c7c5b8" strokeWidth=".8" vectorEffect="non-scaling-stroke" />
          {plot.map(point => point.flow == null || !point.complete ? <path key={point.date} d={`M${point.x-.3},56 L${point.x+.3},58 M${point.x-.3},58 L${point.x+.3},56`} stroke="#8b8a7e" strokeWidth=".8" vectorEffect="non-scaling-stroke" />
            : point.flow===0 ? <line key={point.date} x1={point.x-step/3} x2={point.x+step/3} y1="57" y2="57" stroke="#a8a29e" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            : <rect key={point.date} x={point.x-step/3} y={point.flow>0 ? 57-Math.abs(point.flow)/maxDaily*17 : 57} width={step*2/3} height={Math.abs(point.flow)/maxDaily*17} fill={point.flow>0 ? '#729481' : '#ad6968'} rx=".4" />)}
          {segments.filter(group=>group.length).map((group,i)=><path key={i} d={group.map((point,index)=>`${index?'L':'M'}${point.x},${lineY(point.cumulative!)}`).join(' ')} fill="none" stroke="#98753b" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />)}
          <DashboardChartCursor x={selected?.x} date={selected?.date} />
        </svg>
        {plot.map((point,index)=><button key={point.date} type="button" className={styles.chartPoint}
          style={{left:`${point.x}%`,width:`${step}%`}} data-flow-chart-point={point.date}
          aria-label={t(`${date(point.date)} · Flujo diario: ${usd(point.flow)} · Acumulado: ${usd(point.cumulative)}`)}
          aria-describedby={active===index ? tooltipId : undefined}
          onMouseEnter={()=>setActive(index)} onMouseLeave={()=>setActive(null)} onFocus={()=>setActive(index)} onBlur={()=>setActive(null)} onClick={()=>setActive(index)}>
          {point.cumulative!=null ? <span className={styles.dot} style={{top:`${lineY(point.cumulative)/78*100}%`}} aria-hidden="true" /> : null}
        </button>)}
        {selected ? <div id={tooltipId} role="tooltip" className={styles.tooltip}>
          <strong>{date(selected.date)}</strong><span>{locale === 'en' ? kind === 'estimated' ? 'Estimated daily flow' : 'Daily flow' : `Flujo diario${kind === 'estimated' ? ' estimado' : ''}`}: {usd(selected.flow)}</span><span>{summary.missing?t('Acumulado del tramo disponible'):t('Acumulado de la ventana')}: {usd(selected.cumulative)}</span>
        </div> : null}
      </div>
      <div className={styles.axis}><span>{date(points[0].date,false)}</span><span>{date(points[Math.floor(points.length/2)].date,false)}</span><span>{date(points.at(-1)!.date,false)}</span></div>
      <div className={styles.legend}><span><i style={{background:'#729481'}} />{t("Entrada diaria")}</span><span><i style={{background:'#ad6968'}} />{t("Salida diaria")}</span><span><i style={{background:'#98753b',height:1}} />{t("Acumulado · escala independiente")}</span></div>
      {summary.missing ? <p className={styles.coverage}>{summary.missing} {summary.missing===1?t('sesión sin dato'):t('sesiones sin dato')}{t(": el acumulado se interrumpe y reinicia tras cada hueco.")}</p> : null}
    </> : <p className={styles.empty}>{t("Historial no disponible")}</p>}
  </figure>;
}

export function CapitalFlowPreviewCard({ data, locale = 'es' }: { data: CapitalFlowAssetPreview; locale?:DashboardLocale }) {
  const t = (value:string) => dashboardText(locale,value);
  const en = locale === 'en';
  const date = (value:string|null,year=true) => formatFlowDate(value,year,locale);
  const usd = (value:number|null) => formatFlowAmount(value,locale);
  const [window, setWindow] = useState(20);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const id = useId();
  const sourceStatus = data.id==='ewj' && !data.cutoffDate ? t('Sin datos oficiales importados') : data.refreshMode === 'automatic'
    ? data.refreshStatus === 'unavailable' ? t('Último corte conservado') : data.refreshStatus === 'delayed' ? t('Datos retrasados') : t('Datos automatizados')
    : data.refreshMode === 'snapshot' ? t('Corte importado') : data.kind === 'estimated' ? t('Datos oficiales · cálculo propio') : t('Flujos publicados');
  const points = data.points.slice(-window);
  const observation = data.interpretations?.[window] ?? interpretFlows(data.points,window);
  const magnitude = flowMagnitudeReferences(data);
  const stats = summarizeFlowWindow(points);
  const headline = {inflows:t('Entradas sostenidas'),outflows:t('Salidas sostenidas'),mixed:t('Flujos mixtos'),unavailable:data.id==='eth'||data.id==='ewj'?t('Datos insuficientes'):t('Historial insuficiente para interpretar')}[observation.state];
  const comparisons = data.comparisons ?? [1,5,20].map(sessions=>({sessions,...compareFlowWindow(data.points,sessions,data.metricBasis==='ending-nav'?data.observations:undefined)}));
  const brief = en ? (observation.current ? `${observation.current.positive} sessions with inflows, ${observation.current.negative} with outflows${observation.current.zero ? ` and ${observation.current.zero} with zero net flow` : ''} in the last ${window}. ${data.metricBasis==='ending-nav' ? 'Sum of daily flows' : 'Balance'} ${usd(observation.current.total)}.` : 'Complete sessions are missing for this window.') : observation.current ? t(`${observation.current.positive} sesiones con entradas${observation.current.zero?',':' y'} ${observation.current.negative} con salidas${observation.current.zero?` y ${observation.current.zero} con flujo neto cero`:''} en las últimas ${window}. Saldo${data.metricBasis==='ending-nav'?' de los flujos diarios':''} ${usd(observation.current.total)}.`) : t('Faltan sesiones completas para valorar esta ventana.');
  const extrema = (point:AggregatePoint | null) => point ? `${usd(point.flow)} · ${date(point.date,false)}` : t('Sin movimiento de este signo');
  const details = [
    [t('Entradas acumuladas'),usd(stats.inflows)],[t('Salidas acumuladas'),usd(stats.outflows)],
    [t('Sesiones de entrada / salida'),`${stats.positive} / ${stats.negative}${stats.zero ? (en ? ` · ${stats.zero} with zero net flow` : ` · ${stats.zero} con flujo neto cero`) : ''}`],
    [t('Racha actual'),stats.streak ? en ? `${stats.streak} ${stats.streak===1?'session':'sessions'} of ${stats.streakSign>0?'inflows':'outflows'}` : `${stats.streak} ${stats.streak===1?t('sesión'):t('sesiones')} de ${stats.streakSign>0?'entradas':'salidas'}` : t('Sin racha direccional')],
    [t('Mayor entrada diaria'),extrema(stats.largestInflow)],[t('Mayor salida diaria'),extrema(stats.largestOutflow)],
  ];
  return <article id={data.id==='sp500'?'sp500-etf-flows-preview':`${data.id}-etf-flows-preview`} className={styles.module} aria-labelledby={`${id}-title`} data-flow-preview={data.id}>
    <div className={styles.topline}><p className={styles.eyebrow}>{data.id === 'eth' ? 'Ethereum' : t(data.eyebrow)}</p><span>{sourceStatus}</span></div>
    <h3 id={`${id}-title`} className={styles.title}>{flowCardTitle(data,locale)}</h3>
    <div className={styles.metrics} data-flow-comparisons>
      {comparisons.map(metric=><div key={metric.sessions} data-comparison-window={metric.sessions}>
        <p>{metric.sessions}D · {data.metricBasis==='ending-nav'?t('IMPORTE IMPLÍCITO'):t(`FLUJO NETO${metric.sessions>1?' ACUMULADO':''}`)}</p>
        <strong data-flow-tone={tone(metric.current)}>{metric.current==null?t('Historial insuficiente'):usd(metric.current)}</strong>
        <span className={styles.average}>{t("Promedio ")}<b data-flow-tone={tone(metric.average)}>{metric.average==null?t('Historial insuficiente'):usd(metric.average)}</b></span>
        <small>{metric.average==null?en ? `${metric.samples} prior windows · minimum 20` : t(`${metric.samples} ventanas previas · mínimo 20`): en ? `${metric.samples} prior ${metric.sessions}-session windows` : t(`${metric.samples} ventanas previas de ${metric.sessions} ${metric.sessions===1?'sesión':'sesiones'}`)}</small>
      </div>)}
    </div>
    <div className="my-4 text-xs leading-5 text-muted" data-flow-magnitude>
      {magnitude.daily.percentile!==null ? <><p><span className="font-medium text-ink">{en?'Typical daily magnitude':'Magnitud diaria habitual'}: {usd(magnitude.daily.medianAbsolute).replace(/^\+/, '')}</span> · {magnitudePercentileText(magnitude.daily,locale)}</p><p>{magnitude.daily.mode==='same-month' ? (en?'Prior sessions of the observed month':'Sesiones previas del mes observado') : (en?'Previous three complete months':'Tres meses completos anteriores')} · {date(magnitude.daily.start)}–{date(magnitude.daily.end)} · n={magnitude.daily.observations}</p></> : <p>{en?'Daily magnitude reference unavailable':'Referencia de magnitud diaria no disponible'} · n={magnitude.daily.observations}/{magnitude.daily.minimum} {en?'minimum':'mínimo'}</p>}
    </div>
    <div className={styles.observation} data-flow-observation>
      <div><p>{t("Observación")}</p><strong>{headline}</strong><span aria-live="polite">{brief}{(data.id==='eth'||data.id==='ewj') && observation.state==='unavailable' && observation.current ? t(' Hay datos para el saldo, pero faltan ventanas históricas para calibrar una clasificación consistente.') : ''}</span></div><div><p>{data.coverage?t('Último cierre completo'):t('Actualización')}</p><time dateTime={data.cutoffDate ?? undefined}>{date(data.cutoffDate)}</time></div>
    </div>
    {data.coverage ? <p className={styles.coverage} data-eth-coverage>{data.coverage.reported}/{data.coverage.expected}{t(" fondos con dato en el cierre utilizado · Fuente: ")}<a href={data.sources[0]?.url} target="_blank" rel="noreferrer">{t(data.sources[0]?.name ?? "")} ↗</a>{data.sources[1]?.name==='Histórico · GrowYourEthereum' ? <>{t(" · Histórico: ")}<a href={data.sources[1].url} target="_blank" rel="noreferrer">GrowYourEthereum ↗</a></> : null}{data.coverage.latestPartial ? t(` · ${date(data.coverage.latestPartial.date)}: cobertura parcial (${data.coverage.latestPartial.reported}/${data.coverage.expected}); no incorporada a los indicadores.`) : ''}</p> : null}
    <div className={styles.chartControls}><div className={styles.windows} role="group" aria-label={t(`Sesiones · ${data.eyebrow}`)}>
      {[5,20,60].map(n=><button type="button" key={n} aria-pressed={window===n} onClick={()=>setWindow(n)}>{n}{t(" sesiones")}</button>)}
    </div></div>
    <CapitalFlowChart key={window} points={points} kind={data.kind} asset={data.id} locale={locale} />
    <section className={styles.details}><h4>{t("DETALLE DEL PROXY")}</h4><dl>{details.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>{t("Ventana seleccionada: ")}{window}{t(" sesiones · ")}{data.kind==='estimated'?t('estimaciones diarias'):t('totales diarios publicados')}</p></section>
    <section className={styles.sessions}><div><div><h4>{t("Detalle de sesiones recientes")}</h4><p>{points.length}{t(" sesiones · ")}{date(points[0]?.date ?? null,false)}–{date(points.at(-1)?.date ?? null,false)}</p></div><DashboardDisclosureButton controls={`${id}-sessions`} expanded={sessionsOpen} expandedLabel={t("Ocultar tabla")} collapsedLabel={t("Mostrar tabla")} onClick={()=>setSessionsOpen(!sessionsOpen)} /></div>
      {sessionsOpen ? <div id={`${id}-sessions`} className={styles.table}><table><caption className="sr-only">{t("Flujos diarios en millones de USD")}</caption><thead><tr><th scope="col">{t("Fecha")}</th><th scope="col">{en ? data.kind==='estimated' ? 'Estimated net flow' : 'Net flow' : `Flujo neto${data.kind==='estimated' ? ' estimado' : ''}`}</th><th scope="col">{t("Dirección")}</th></tr></thead><tbody>{[...points].reverse().map(point=><tr key={point.date}><th scope="row">{date(point.date)}</th><td data-flow-tone={tone(point.flow)}>{usd(point.flow)}</td><td>{point.flow==null?t('Sin dato'):point.flow>0?t('Entrada'):point.flow<0?t('Salida'):t('Flujo neto cero')}</td></tr>)}</tbody></table></div> : null}
    </section>
    <div className={styles.contextToggle}><DashboardDisclosureButton controls={`${id}-context`} expanded={contextOpen} expandedLabel={t("Ocultar contexto")} collapsedLabel={t("Mostrar contexto")} onClick={()=>setContextOpen(!contextOpen)} /></div>
    {contextOpen ? <div id={`${id}-context`} className={styles.context}>
      {data.coverage ? <section><h4>{t("Cobertura y actualización de ETH")}</h4><p>{t("Serie comparable de 11 fondos: ")}{date(data.coverage.firstDate)}–{date(data.cutoffDate)}{t(". La tabla original comienza el ")}{date(data.coverage.sourceFirstDate)}{t("; los cierres anteriores sin los 11 fondos no se utilizan para comparar ventanas.")}</p><p>{t(data.coverage.updateNote)}</p>{data.lastRefreshError?<p>{data.lastRefreshError}</p>:null}<p>{t("Consulta del corte: ")}{data.retrievedAt ? new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Madrid'}).format(new Date(data.retrievedAt)) : t('No disponible')} (Madrid).</p></section> : null}
      {data.coverage ? <section><h4>{t("Desglose del último cierre completo")}</h4><div className={styles.table}><table><caption className="sr-only">{t("Flujos publicados por fondo el ")}{date(data.cutoffDate)}</caption><thead><tr><th scope="col">ETF</th><th scope="col">{t("Flujo neto")}</th></tr></thead><tbody>{data.coverage.funds.map(fund=><tr key={fund.ticker}><th scope="row">{fund.ticker}</th><td data-flow-tone={tone(fund.flow)}>{usd(fund.flow)}</td></tr>)}</tbody></table></div></section> : null}
      <section><h4>{t("Universo y fuentes")}</h4><p>{t("ETF incluidos: ")}{data.vehicles.join(', ')}.</p>{data.sources.map(source=><p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{t(source.name)} ↗</a></p>)}<p>{t("Último cierre utilizado: ")}{date(data.cutoffDate)}{t(". Cada activo conserva su fecha efectiva; no se fuerza la igualdad entre fuentes distintas.")}</p>{data.refreshMode==='automatic'?<><p>{t("Actualización automática diaria. Si la fuente falla, se retrasa o presenta una anomalía, se conserva el último cierre validado con su fecha original.")}</p>{data.refreshStatus==='unavailable'?<p>{t("La última consulta no devolvió un corte válido. Se conserva el corte de respaldo y se volverá a consultar automáticamente.")}</p>:null}{data.retrievedAt?<p>{t("Última descarga validada: ")}{new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Madrid'}).format(new Date(data.retrievedAt))} (Madrid).</p>:null}</>:data.refreshMode==='snapshot'?<p>{t("Corte importado con su fecha efectiva.")}</p>:null}</section>
      <section data-flow-magnitude-method><h4>{en?'Magnitude relative to history':'Magnitud frente al histórico'}</h4>
        <p>{en?'Daily reference: at least 20 valid prior sessions of the observed month; otherwise, valid daily sessions from the previous three complete months. The signed mean measures net balance; typical magnitude is the median absolute flow. The magnitude percentile is the share of prior absolute flows less than or equal to the observed absolute flow, including ties and excluding the observation itself.' : 'Referencia diaria: al menos 20 sesiones previas válidas del mes observado; si no, sesiones diarias válidas de los tres meses completos anteriores. La media con signo mide el saldo neto; la magnitud habitual es la mediana de los flujos absolutos. El percentil de magnitud es la proporción de flujos absolutos previos menores o iguales al observado, incluidos empates y excluida la propia observación.'}</p>
        <p>{en?'Signed daily mean':'Media diaria con signo'}: {usd(magnitude.daily.mean)} · {en?'Median absolute daily flow':'Mediana del flujo diario absoluto'}: {usd(magnitude.daily.medianAbsolute).replace(/^\+/, '')}.</p>
        <p>{en?'Month-to-date reference':'Referencia del mes en curso'}: {magnitude.monthly.sessions} {en?'first exchange sessions per month':'primeras sesiones bursátiles de cada mes'} · {magnitude.monthly.observations} {en?'valid prior months (minimum 12, maximum 24)':'meses previos válidos (mínimo 12, máximo 24)'} · {date(magnitude.monthly.start)}–{date(magnitude.monthly.end)}.</p>
        {magnitude.monthly.percentile!==null ? <p>{en?'Mean of equivalent accumulations':'Media de acumulados equivalentes'}: {usd(magnitude.monthly.mean)} · {en?'Median absolute accumulation':'Mediana del acumulado absoluto'}: {usd(magnitude.monthly.medianAbsolute).replace(/^\+/, '')} · {magnitudePercentileText(magnitude.monthly,locale)}.</p> : <p>{en?'Insufficient comparable monthly history; no monthly percentile is shown.':'Histórico mensual comparable insuficiente; no se muestra percentil mensual.'}</p>}
        <p>{en?'Monthly comparisons always use the same number of first sessions; months with fewer sessions or missing data are excluded. They never compare a partial month with daily means or complete months. Each asset retains its declared ETF universe, units and reported, estimated or implicit basis. GLD uses share change × endpoint NAV; without those endpoints no new reference is calculated. Missing observations are never zeros. Percentiles describe size, not direction or the probability of a price decline; small monthly samples have coarse ranks (100/n percentage points).' : 'Las comparaciones mensuales usan siempre el mismo número de primeras sesiones; se excluyen meses con menos sesiones o datos ausentes. Nunca se compara un mes parcial con medias diarias ni con meses completos. Cada activo conserva su universo declarado de ETF, unidades y base reportada, estimada o implícita. GLD usa cambio de participaciones × NAV final; sin esos extremos no se calcula una nueva referencia. Los datos ausentes nunca son ceros. Los percentiles describen magnitud, no dirección ni probabilidad de caída del precio; las muestras mensuales pequeñas tienen rangos discretos (100/n puntos porcentuales).'}</p>
      </section>
      <section><h4>{t("Valor actual y promedio")}</h4><p>{t("Cada temporalidad compara su importe actual con la media de hasta 252 ventanas históricas de igual duración; se exigen al menos 20. Las ventanas de referencia terminan antes de que empiece la ventana actual. Son medias históricas, no niveles esperados ni objetivos.")}</p>{comparisons.map(metric=><p key={metric.sessions}>{metric.sessions}D: {metric.samples}{t(" ventanas · ")}{date(metric.referenceStart)}–{date(metric.referenceEnd)}.</p>)}</section>
      <section><h4>{t("Cálculo y cobertura")}</h4><p>{data.kind==='estimated'?t('El flujo diario se estima como el cambio de participaciones entre sesiones consecutivas multiplicado por el NAV del día. No se utiliza la variación del patrimonio por precios como flujo.'):t('Se utilizan los totales diarios publicados por la fuente, sin imputar cero a datos ausentes.')}</p>{data.notes.map(note=><p key={note}>{t(note)}</p>)}</section>
      <section><h4>{t("Observación y color")}</h4><p>{t("«Entradas sostenidas» exige saldo positivo, mayoría de sesiones con entradas y frecuencia al menos igual al percentil 90 de hasta 252 ventanas históricas equivalentes, anteriores a la actual. «Salidas sostenidas» aplica el criterio simétrico. En los demás casos, «Flujos mixtos». Se exigen 60 ventanas de calibración.")}</p><p>{t("El fondo del gráfico refleja el saldo neto en dólares de las sesiones seleccionadas: verde suave si es positivo y rojo suave si es negativo. Los huecos interrumpen la serie; no son ceros. El calendario cubre 2024–2028.")}</p><p>{t("Flujo neto cero significa un saldo de 0 USD en una sesión con datos válidos. No significa que no hubiera negociación ni que el precio no cambiara. Una sesión sin datos se identifica aparte.")}</p><p>{t("Los flujos describen exposición incorporada o retirada de estos vehículos. No representan todo el mercado ni constituyen una señal de compra o venta.")}</p></section>
    </div> : null}
  </article>;
}

