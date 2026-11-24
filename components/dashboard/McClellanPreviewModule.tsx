"use client";

import { dashboardText, type DashboardLocale } from "@/lib/dashboard/dashboard-localization";
import { DashboardChartCursor } from './DashboardChartCursor';

import { useId, useState } from "react";
import {
  DashboardDisclosureButton,
  dashboardModuleEyebrowClassName,
  dashboardModuleTitleClassName,
} from "./DashboardPrimitives";
import type { McClellanPreviewData, McClellanPreviewPoint } from "@/lib/dashboard/mcclellan-preview-types";
import { McClellanInterpretation } from "./McClellanInterpretation";
import styles from "./mcclellan-preview.module.css";

const formatMcDate = (value: string, year: boolean, locale:DashboardLocale) => new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-ES", { day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" }).format(new Date(value + "T12:00:00Z"));
const formatMcNumber = (value: number, signed: boolean, locale:DashboardLocale) => new Intl.NumberFormat(locale === "en" ? "en-US" : "es-ES", {
  maximumFractionDigits: 1, minimumFractionDigits: 1, signDisplay: signed ? "always" : "auto",
}).format(value);
const X0 = 48, X1 = 572, Y0 = 20, Y1 = 186;

function BreadthChart({ points, field, active, onInspect, locale }: {
  points: McClellanPreviewPoint[];
  field: "oscillator" | "summation";
  active: number;
  locale:DashboardLocale;
  onInspect: (index: number) => void;
}) {
  const t = (value:string) => dashboardText(locale,value);
  const dateLabel = (value:string,year=false) => formatMcDate(value,year,locale);
  const values = points.map(point => point[field]);
  const min = Math.min(0, ...values), max = Math.max(0, ...values);
  const padding = Math.max((max - min) * 0.15, 5);
  const bottom = min - padding, top = max + padding;
  const x = (i: number) => X0 + i / Math.max(points.length - 1, 1) * (X1 - X0);
  const y = (value: number) => Y1 - (value - bottom) / (top - bottom) * (Y1 - Y0);
  const zero = y(0);
  const path = values.map((v, i) => (i ? "L" : "M") + x(i).toFixed(2) + " " + y(v).toFixed(2)).join(" ");
  const current = points[active];
  const ticks = [max, 0, min].filter((v, i, a) => a.indexOf(v) === i);
  const chartName = field === "oscillator" ? t("Oscilador de McClellan") : t("Índice de suma");
  return <figure className={styles.chart}>
    <figcaption>
      <div><p>{field === "oscillator" ? t("IMPULSO DE LA AMPLITUD") : t("TRAYECTORIA DE FONDO")}</p><h4>{chartName}</h4></div>
      <span>{field === "oscillator" ? "RAMO" : "RASI"}</span>
    </figcaption>
    <svg viewBox="0 0 600 225" role="img" aria-label={chartName + t(" · datos reales del S&P 500")}
      onPointerMove={event => {
        const box = event.currentTarget.getBoundingClientRect();
        const position = (event.clientX - box.left) / box.width * 600;
        onInspect(Math.max(0, Math.min(points.length - 1, Math.round((position - X0) / (X1 - X0) * (points.length - 1)))));
      }}
      onPointerLeave={() => onInspect(points.length - 1)}>
      <title>{t(`${chartName} del S&P 500. ${points.length} sesiones hasta ${dateLabel(points.at(-1)!.date, true)}. Cálculo propio sobre datos de DeanFI.`)}</title>
      {ticks.map(value => <g key={value}>
        <line x1={X0} x2={X1} y1={y(value)} y2={y(value)} stroke={value === 0 ? "#b8b9ac" : "#e1e2d7"} strokeDasharray={value === 0 ? "4 4" : undefined} />
        <text x={X0 - 10} y={y(value) + 4} textAnchor="end" className={styles.tick}>{Math.round(value)}</text>
      </g>)}
      {field === "oscillator"
        ? values.map((value, i) => <rect key={i} x={x(i) - (X1 - X0) / points.length * 0.32}
          y={Math.min(y(value), zero)} width={(X1 - X0) / points.length * 0.64}
          height={Math.max(Math.abs(y(value) - zero), 0.8)} rx="1.2"
          fill={value >= 0 ? "#6b9482" : "#b37b74"} opacity={i === active ? 1 : 0.78} />)
        : <>
          <path d={path + " L " + X1 + " " + Y1 + " L " + X0 + " " + Y1 + " Z"} fill="#a18a5010" />
          <path d={path} fill="none" stroke="#9a7738" strokeWidth="1.8" strokeLinejoin="round" />
          {values.map((value, i) => <circle key={i} cx={x(i)} cy={y(value)} r={i === active ? 4 : 2.2} fill="#fffdf8" stroke="#9a7738" strokeWidth="0.8" />)}
        </>}
      <DashboardChartCursor x={x(active)} date={current.date} y1={Y0} y2={Y1} />
      <circle cx={x(active)} cy={y(current[field])} r="4.3" fill="#193d32" stroke="#fffdf8" strokeWidth="1.5" />
      <text x={X0} y="214" className={styles.tick}>{dateLabel(points[0].date)}</text>
      <text x={(X0 + X1) / 2} y="214" textAnchor="middle" className={styles.tick}>{dateLabel(points[Math.floor(points.length / 2)].date)}</text>
      <text x={X1} y="214" textAnchor="end" className={styles.tick}>{dateLabel(points.at(-1)!.date)}</text>
    </svg>
    <div className={styles.legend}>{field === "oscillator"
      ? <><span><i className={styles.positive} />{t("Sobre cero")}</span><span><i className={styles.negative} />{t("Bajo cero")}</span></>
      : <span><i className={styles.gold} />{t("Suma acumulada del oscilador")}</span>}</div>
  </figure>;
}

export function McClellanPreviewModule({ data, localPreview = false, locale = "es" }: { data: McClellanPreviewData; localPreview?: boolean; locale?:DashboardLocale }) {
  const t = (value:string) => dashboardText(locale,value);
  const dateLabel = (value:string,year=false) => formatMcDate(value,year,locale);
  const number = (value:number,signed=true) => formatMcNumber(value,signed,locale);
  const [window, setWindow] = useState(60);
  const [active, setActive] = useState(59);
  const [contextOpen, setContextOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const id = useId();
  const points = data.points.slice(-window);
  const current = points[active];
  const latest = data.points.at(-1)!;
  const metrics = [
    [t("Oscilador · RAMO"), number(latest.oscillator), t("Impulso de la participación")],
    [t("Índice de suma · RASI"), number(latest.summation), t("Acumulado del oscilador")],
    [t("Avances / descensos"), latest.advances + " / " + latest.declines, t("Sin cambios y ausentes no desglosados")],
    [t("Universo declarado"), data.declaredTotal + t(" valores"), t("S&P 500 · composición actual")],
  ];
  return <article id="mcclellan-preview" className={styles.module} data-mcclellan-preview>
    <div className={styles.topline}>
      <p className={dashboardModuleEyebrowClassName}>McClellan</p>
    </div>
    <div className={styles.heading}>
      <div>
        <h3 className={dashboardModuleTitleClassName}>{t("Amplitud interna del ")}<span className={styles.indexName}>S&amp;P 500</span></h3>
        <p>{t("El oscilador sigue el impulso de la participación; el índice de suma, su trayectoria de fondo.")}</p>
        <p className={styles.snapshotNote}>{t("Datos reales · ")}<span>{data.stale ? t("Actualización pendiente · Corte disponible") : t("Último cierre utilizado")}: </span><time dateTime={data.cutoffDate}>{dateLabel(data.cutoffDate, true)}</time>{localPreview ? t(" · Vista previa local") : ""}</p>
      </div>
    </div>
    <div className={styles.metrics}>{metrics.map(([label, value, detail]) => <div key={label}>
      <p>{label}</p><strong>{value}</strong><span>{detail}</span>
    </div>)}</div>
    <McClellanInterpretation data={data} locale={locale} />
    <div className={styles.chartHeading}>
      <div><p>{t("Evolución de la participación")}</p><span>{window}{t(" sesiones · cierres disponibles · misma escala temporal")}</span></div>
      <div className={styles.windows} role="group" aria-label={t("Ventana del gráfico McClellan")}>
        {[20, 60, 120].map(value => <button key={value} type="button" aria-pressed={value === window}
          onClick={() => { setWindow(value); setActive(value - 1); }}>{value}{t(" sesiones")}</button>)}
      </div>
    </div>
    <div className={styles.charts}>
      <BreadthChart points={points} field="oscillator" active={active} onInspect={setActive} locale={locale} />
      <BreadthChart points={points} field="summation" active={active} onInspect={setActive} locale={locale} />
    </div>
    <div className={styles.inspection} aria-live="polite" aria-atomic="true">
      <span><time dateTime={current.date}>{dateLabel(current.date, true)}</time><small>{t("Datos de DeanFI · cálculo propio")}</small></span>
      <span>{t("Avances ")}<strong>{current.advances}</strong></span>
      <span>{t("Descensos ")}<strong>{current.declines}</strong></span>
      <span>RAMO <strong>{number(current.oscillator)}</strong></span>
      <span>RASI <strong>{number(current.summation)}</strong></span>
    </div>
    <label className={styles.explorer}>{t("Explorar sesiones\n      ")}<input type="range" min={0} max={points.length - 1} value={active} onChange={event => setActive(Number(event.target.value))}
        aria-label={t("Explorar sesión")} aria-valuetext={dateLabel(current.date, true)} />
    </label>
    <section className={styles.sessions}>
      <div><div><h4>{t("Detalle de sesiones recientes")}</h4><p>{t("Últimas 10 de la ventana seleccionada")}</p></div>
        <DashboardDisclosureButton controls={id + "-table"} expanded={tableOpen} expandedLabel={t("Ocultar tabla")} collapsedLabel={t("Mostrar tabla")} onClick={() => setTableOpen(!tableOpen)} /></div>
      {tableOpen ? <div id={id + "-table"} className={styles.table}><table>
        <thead><tr>{[t("Fecha"), t("Avances"), t("Descensos"), "RAMO", "RASI"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{points.slice(-10).reverse().map(point => <tr key={point.date}>
          <th scope="row"><time dateTime={point.date}>{dateLabel(point.date, true)}</time></th><td>{point.advances}</td><td>{point.declines}</td><td>{number(point.oscillator)}</td><td>{number(point.summation)}</td>
        </tr>)}</tbody></table></div> : null}
    </section>
    <div data-context-toggle>
      <DashboardDisclosureButton controls={id + "-context"} expanded={contextOpen} expandedLabel={t("Ocultar contexto")} collapsedLabel={t("Mostrar contexto")} onClick={() => setContextOpen(!contextOpen)} />
    </div>
    {contextOpen ? <div id={id + "-context"} className={styles.context}>
      <section><h4>{t("Oscilador ajustado por ratio")}</h4><p>{t("RANA = 1000 × (avances − descensos) / (avances + descensos). El oscilador es la diferencia entre sus medias exponenciales de 19 y 39 sesiones.")}</p></section>
      <section><h4>{t("Índice de suma")}</h4><p>{t("Acumula el oscilador, con referencia cero y sin redondeo intermedio. El cálculo utiliza ")}{data.closedCandidates}{t(" sesiones cerradas y descarta las primeras 249 de la vista por calentamiento.")}</p></section>
      <section><h4>{t("No es NYMO ni NYSI")}</h4><p>{t("Estos gráficos siguen el universo S&P 500 de la fuente. NYMO y NYSI corresponden a la NYSE. El ajuste por ratio no convierte un universo en el otro.")}</p></section>
      <section><h4>{t("Fuente y límites")}</h4><p>{t("DeanFI reconstruye el histórico con los componentes actuales. La serie puede revisarse; no desglosa sin cambios y ausentes. Se excluyen sesiones abiertas o no confirmadas")}{data.excludedDates.length ? ` (${data.excludedDates.map(date => dateLabel(date, true)).join(", ")})` : ""}.</p></section>
    </div> : null}
    <p className={styles.note}>{t("Datos reales de ")}<a href="https://github.com/DeanFinancials/deanfi-data" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">DeanFI</a>{t(" · Cálculo propio sobre el S&P 500.")}</p>
  </article>;
}

