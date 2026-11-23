'use client';

import { Fragment, useId, useState } from 'react';
import { DashboardDisclosureButton } from './DashboardPrimitives';
import { compareFlowWindow, summarizeFlowWindow } from '@/lib/dashboard/capital-flow-comparison.mjs';
import { interpretFlows } from '@/lib/dashboard/sp500-etf-flows.mjs';
import type { AggregatePoint } from '@/lib/dashboard/sp500-etf-flows.mjs';
import type { CapitalFlowAssetPreview } from '@/lib/dashboard/capital-flows-preview-types';
import styles from './capital-flow-preview.module.css';

function usd(value: number | null) {
  if (value == null) return 'Sin dato';
  const [whole, decimal] = (Math.abs(value) / 1e6).toFixed(1).split('.');
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimal} M USD`;
}
function date(value: string | null, year = true) {
  return value ? new Intl.DateTimeFormat('es-ES', { day:'numeric',month:'short',...(year ? {year:'numeric' as const} : {}),timeZone:'UTC' }).format(new Date(`${value}T12:00Z`)) : 'Sin cierre disponible';
}
const tone = (value: number | null) => value == null || value === 0 ? 'neutral' : value > 0 ? 'positive' : 'negative';

function CapitalFlowChart({ points, kind, asset }: { points: AggregatePoint[]; kind: 'estimated' | 'published'; asset: string }) {
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
    <figcaption><div><p>SESIONES RECIENTES</p><h4>{summary.missing?'Flujo neto diario y acumulado por tramos disponibles':'Flujo neto diario y trayectoria acumulada de la ventana'}</h4></div><span>Millones de USD</span></figcaption>
    {plot.length ? <>
      <div className={styles.plot}>
        <svg viewBox="0 0 100 78" preserveAspectRatio="none" aria-hidden="true">
          <line x1="4" x2="96" y1="38" y2="38" stroke="#ded8c9" strokeWidth=".6" vectorEffect="non-scaling-stroke" />
          <line x1="4" x2="96" y1="57" y2="57" stroke="#c7c5b8" strokeWidth=".8" vectorEffect="non-scaling-stroke" />
          {plot.map(point => point.flow == null || !point.complete ? <path key={point.date} d={`M${point.x-.3},56 L${point.x+.3},58 M${point.x-.3},58 L${point.x+.3},56`} stroke="#8b8a7e" strokeWidth=".8" vectorEffect="non-scaling-stroke" />
            : point.flow===0 ? <line key={point.date} x1={point.x-step/3} x2={point.x+step/3} y1="57" y2="57" stroke="#a8a29e" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            : <rect key={point.date} x={point.x-step/3} y={point.flow>0 ? 57-Math.abs(point.flow)/maxDaily*17 : 57} width={step*2/3} height={Math.abs(point.flow)/maxDaily*17} fill={point.flow>0 ? '#729481' : '#ad6968'} rx=".4" />)}
          {segments.filter(group=>group.length).map((group,i)=><path key={i} d={group.map((point,index)=>`${index?'L':'M'}${point.x},${lineY(point.cumulative!)}`).join(' ')} fill="none" stroke="#98753b" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />)}
        </svg>
        {plot.map((point,index)=><button key={point.date} type="button" className={styles.chartPoint}
          style={{left:`${point.x}%`,width:`${step}%`}} data-flow-chart-point={point.date}
          aria-label={`${date(point.date)} · Flujo diario: ${usd(point.flow)} · Acumulado: ${usd(point.cumulative)}`}
          aria-describedby={active===index ? tooltipId : undefined}
          onMouseEnter={()=>setActive(index)} onMouseLeave={()=>setActive(null)} onFocus={()=>setActive(index)} onBlur={()=>setActive(null)} onClick={()=>setActive(index)}>
          {point.cumulative!=null ? <span className={styles.dot} style={{top:`${lineY(point.cumulative)/78*100}%`}} aria-hidden="true" /> : null}
        </button>)}
        {selected ? <div id={tooltipId} role="tooltip" className={styles.tooltip}>
          <strong>{date(selected.date)}</strong><span>Flujo diario{kind==='estimated'?' estimado':''}: {usd(selected.flow)}</span><span>{summary.missing?'Acumulado del tramo disponible':'Acumulado de la ventana'}: {usd(selected.cumulative)}</span>
        </div> : null}
      </div>
      <div className={styles.axis}><span>{date(points[0].date,false)}</span><span>{date(points[Math.floor(points.length/2)].date,false)}</span><span>{date(points.at(-1)!.date,false)}</span></div>
      <div className={styles.legend}><span><i style={{background:'#729481'}} />Entrada diaria</span><span><i style={{background:'#ad6968'}} />Salida diaria</span><span><i style={{background:'#98753b',height:1}} />Acumulado · escala independiente</span></div>
      {summary.missing ? <p className={styles.coverage}>{summary.missing} {summary.missing===1?'sesión sin dato':'sesiones sin dato'}: el acumulado se interrumpe y reinicia tras cada hueco.</p> : null}
    </> : <p className={styles.empty}>Historial no disponible</p>}
  </figure>;
}

export function CapitalFlowPreviewCard({ data }: { data: CapitalFlowAssetPreview }) {
  const [window, setWindow] = useState(20);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const id = useId();
  const sourceStatus = data.refreshMode === 'automatic'
    ? data.refreshStatus === 'unavailable' ? 'Último corte conservado' : data.refreshStatus === 'delayed' ? 'Datos retrasados' : 'Datos automatizados'
    : data.refreshMode === 'snapshot' ? 'Corte importado' : data.kind === 'estimated' ? 'Datos oficiales · cálculo propio' : 'Flujos publicados';
  const points = data.points.slice(-window);
  const observation = data.interpretations?.[window] ?? interpretFlows(data.points,window);
  const stats = summarizeFlowWindow(points);
  const headline = {inflows:'Entradas sostenidas',outflows:'Salidas sostenidas',mixed:'Flujos mixtos',unavailable:data.id==='eth'?'Datos insuficientes':'Historial insuficiente para interpretar'}[observation.state];
  const comparisons = data.comparisons ?? [1,5,20].map(sessions=>({sessions,...compareFlowWindow(data.points,sessions,data.metricBasis==='ending-nav'?data.observations:undefined)}));
  const brief = observation.current ? `${observation.current.positive} sesiones con entradas${observation.current.zero?',':' y'} ${observation.current.negative} con salidas${observation.current.zero?` y ${observation.current.zero} con flujo neto cero`:''} en las últimas ${window}. Saldo${data.metricBasis==='ending-nav'?' de los flujos diarios':''} ${usd(observation.current.total)}.` : 'Faltan sesiones completas para valorar esta ventana.';
  const extrema = (point:AggregatePoint | null) => point ? `${usd(point.flow)} · ${date(point.date,false)}` : 'Sin movimiento de este signo';
  const details = [
    ['Entradas acumuladas',usd(stats.inflows)],['Salidas acumuladas',usd(stats.outflows)],
    ['Sesiones de entrada / salida',`${stats.positive} / ${stats.negative}${stats.zero ? ` · ${stats.zero} con flujo neto cero` : ''}`],
    ['Racha actual',stats.streak ? `${stats.streak} ${stats.streakSign>0?'sesiones de entradas':'sesiones de salidas'}` : 'Sin racha direccional'],
    ['Mayor entrada diaria',extrema(stats.largestInflow)],['Mayor salida diaria',extrema(stats.largestOutflow)],
  ];
  return <article id={data.id==='sp500'?'sp500-etf-flows-preview':`${data.id}-etf-flows-preview`} className={styles.module} aria-labelledby={`${id}-title`} data-flow-preview={data.id}>
    <div className={styles.topline}><p className={styles.eyebrow}>{data.eyebrow}</p><span>{sourceStatus}</span></div>
    <h3 id={`${id}-title`} className={styles.title}>{data.title.split('&').map((part,index)=><Fragment key={index}>{index>0?<span className={styles.ampersand}>&amp;</span>:null}{part}</Fragment>)}</h3><p className={styles.description}>{data.description}</p>
    <div className={styles.metrics} data-flow-comparisons>
      {comparisons.map(metric=><div key={metric.sessions} data-comparison-window={metric.sessions}>
        <p>{metric.sessions}D · {data.metricBasis==='ending-nav'?'IMPORTE IMPLÍCITO':`FLUJO NETO${metric.sessions>1?' ACUMULADO':''}`}</p>
        <strong data-flow-tone={tone(metric.current)}>{metric.current==null?'Historial insuficiente':usd(metric.current)}</strong>
        <span className={styles.average}>Promedio <b data-flow-tone={tone(metric.average)}>{metric.average==null?'Historial insuficiente':usd(metric.average)}</b></span>
        <small>{metric.average==null?`${metric.samples} ventanas previas · mínimo 20`: `${metric.samples} ventanas previas de ${metric.sessions} ${metric.sessions===1?'sesión':'sesiones'}`}</small>
      </div>)}
    </div>
    <div className={styles.observation} data-flow-observation>
      <div><p>Observación</p><strong>{headline}</strong><span aria-live="polite">{brief}{data.id==='eth' && observation.state==='unavailable' && observation.current ? ' Hay datos para el saldo, pero faltan ventanas históricas para calibrar una clasificación consistente.' : ''}</span></div><div><p>{data.coverage?'Último cierre completo':'Actualización'}</p><time dateTime={data.cutoffDate ?? undefined}>{date(data.cutoffDate)}</time></div>
    </div>
    {data.coverage ? <p className={styles.coverage} data-eth-coverage>{data.coverage.reported}/{data.coverage.expected} fondos con dato en el cierre utilizado · Fuente: <a href={data.sources[0]?.url} target="_blank" rel="noreferrer">{data.sources[0]?.name} ↗</a>{data.sources[1]?.name==='Histórico · GrowYourEthereum' ? <> · Histórico: <a href={data.sources[1].url} target="_blank" rel="noreferrer">GrowYourEthereum ↗</a></> : null}{data.coverage.latestPartial ? ` · ${date(data.coverage.latestPartial.date)}: cobertura parcial (${data.coverage.latestPartial.reported}/${data.coverage.expected}); no incorporada a los indicadores.` : ''}</p> : null}
    <div className={styles.chartControls}><div className={styles.windows} role="group" aria-label={`Sesiones de ${data.title}`}>
      {[5,20,60].map(n=><button type="button" key={n} aria-pressed={window===n} onClick={()=>setWindow(n)}>{n} sesiones</button>)}
    </div></div>
    <CapitalFlowChart key={window} points={points} kind={data.kind} asset={data.id} />
    <section className={styles.details}><h4>DETALLE DEL PROXY</h4><dl>{details.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>Ventana seleccionada: {window} sesiones · {data.kind==='estimated'?'estimaciones diarias':'totales diarios publicados'}</p></section>
    <section className={styles.sessions}><div><div><h4>Detalle de sesiones recientes</h4><p>{points.length} sesiones · {date(points[0]?.date ?? null,false)}–{date(points.at(-1)?.date ?? null,false)}</p></div><DashboardDisclosureButton controls={`${id}-sessions`} expanded={sessionsOpen} expandedLabel="Ocultar tabla" collapsedLabel="Mostrar tabla" onClick={()=>setSessionsOpen(!sessionsOpen)} /></div>
      {sessionsOpen ? <div id={`${id}-sessions`} className={styles.table}><table><caption className="sr-only">Flujos diarios en millones de USD</caption><thead><tr><th scope="col">Fecha</th><th scope="col">Flujo neto{data.kind==='estimated'?' estimado':''}</th><th scope="col">Dirección</th></tr></thead><tbody>{[...points].reverse().map(point=><tr key={point.date}><th scope="row">{date(point.date)}</th><td data-flow-tone={tone(point.flow)}>{usd(point.flow)}</td><td>{point.flow==null?'Sin dato':point.flow>0?'Entrada':point.flow<0?'Salida':'Flujo neto cero'}</td></tr>)}</tbody></table></div> : null}
    </section>
    <div className={styles.contextToggle}><DashboardDisclosureButton controls={`${id}-context`} expanded={contextOpen} expandedLabel="Ocultar contexto" collapsedLabel="Mostrar contexto" onClick={()=>setContextOpen(!contextOpen)} /></div>
    {contextOpen ? <div id={`${id}-context`} className={styles.context}>
      {data.coverage ? <section><h4>Cobertura y actualización de ETH</h4><p>Serie comparable de 11 fondos: {date(data.coverage.firstDate)}–{date(data.cutoffDate)}. La tabla original comienza el {date(data.coverage.sourceFirstDate)}; los cierres anteriores sin los 11 fondos no se utilizan para comparar ventanas.</p><p>{data.coverage.updateNote}</p>{data.lastRefreshError?<p>{data.lastRefreshError}</p>:null}<p>Consulta del corte: {data.retrievedAt ? new Intl.DateTimeFormat('es-ES',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Madrid'}).format(new Date(data.retrievedAt)) : 'No disponible'} (Madrid).</p></section> : null}
      {data.coverage ? <section><h4>Desglose del último cierre completo</h4><div className={styles.table}><table><caption className="sr-only">Flujos publicados por fondo el {date(data.cutoffDate)}</caption><thead><tr><th scope="col">ETF</th><th scope="col">Flujo neto</th></tr></thead><tbody>{data.coverage.funds.map(fund=><tr key={fund.ticker}><th scope="row">{fund.ticker}</th><td data-flow-tone={tone(fund.flow)}>{usd(fund.flow)}</td></tr>)}</tbody></table></div></section> : null}
      <section><h4>Universo y fuentes</h4><p>ETF incluidos: {data.vehicles.join(', ')}.</p>{data.sources.map(source=><p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.name} ↗</a></p>)}<p>Último cierre utilizado: {date(data.cutoffDate)}. Cada activo conserva su fecha efectiva; no se fuerza la igualdad entre fuentes distintas.</p>{data.refreshMode==='automatic'?<><p>Actualización automática diaria. Si la fuente falla, se retrasa o presenta una anomalía, se conserva el último cierre validado con su fecha original.</p>{data.refreshStatus==='unavailable'?<p>La última consulta no devolvió un corte válido. Se conserva el corte de respaldo y se volverá a consultar automáticamente.</p>:null}{data.retrievedAt?<p>Última descarga validada: {new Intl.DateTimeFormat('es-ES',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Madrid'}).format(new Date(data.retrievedAt))} (Madrid).</p>:null}</>:data.refreshMode==='snapshot'?<p>Corte importado con su fecha efectiva.</p>:null}</section>
      <section><h4>Valor actual y promedio</h4><p>Cada temporalidad compara su importe actual con la media de hasta 252 ventanas históricas de igual duración; se exigen al menos 20. Las ventanas de referencia terminan antes de que empiece la ventana actual. Son medias históricas, no niveles esperados ni objetivos.</p>{comparisons.map(metric=><p key={metric.sessions}>{metric.sessions}D: {metric.samples} ventanas · {date(metric.referenceStart)}–{date(metric.referenceEnd)}.</p>)}</section>
      <section><h4>Cálculo y cobertura</h4><p>{data.kind==='estimated'?'El flujo diario se estima como el cambio de participaciones entre sesiones consecutivas multiplicado por el NAV del día. No se utiliza la variación del patrimonio por precios como flujo.':'Se utilizan los totales diarios publicados por la fuente, sin imputar cero a datos ausentes.'}</p>{data.notes.map(note=><p key={note}>{note}</p>)}</section>
      <section><h4>Observación y color</h4><p>«Entradas sostenidas» exige saldo positivo, mayoría de sesiones con entradas y frecuencia al menos igual al percentil 90 de hasta 252 ventanas históricas equivalentes, anteriores a la actual. «Salidas sostenidas» aplica el criterio simétrico. En los demás casos, «Flujos mixtos». Se exigen 60 ventanas de calibración.</p><p>El fondo del gráfico refleja el saldo neto en dólares de las sesiones seleccionadas: verde suave si es positivo y rojo suave si es negativo. Los huecos interrumpen la serie; no son ceros. El calendario cubre 2024–2028.</p><p>Flujo neto cero significa un saldo de 0 USD en una sesión con datos válidos. No significa que no hubiera negociación ni que el precio no cambiara. Una sesión sin datos se identifica aparte.</p><p>Los flujos describen exposición incorporada o retirada de estos vehículos. No representan todo el mercado ni constituyen una señal de compra o venta.</p></section>
    </div> : null}
  </article>;
}
