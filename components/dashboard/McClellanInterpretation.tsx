"use client";

import { useId, useMemo } from "react";
import { MCCLELLAN_SOURCES, SIGN_GUIDE, selectMcClellanReading, signQuadrant } from "@/lib/dashboard/mcclellan-reading.mjs";
import type { McClellanPreviewData } from "@/lib/dashboard/mcclellan-preview-types";
import styles from "./mcclellan-preview.module.css";

const dateLabel = (date: string) => new Intl.DateTimeFormat("es-ES", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
}).format(new Date(date + "T12:00Z"));
const number = (value: number) => new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "always",
}).format(value);

export function McClellanInterpretation({ data }: { data: McClellanPreviewData }) {
  const id = useId();
  // Always use the whole mature history and its last close, independent of chart hover/window.
  const reading = useMemo(() => selectMcClellanReading(data.points, {
    cutoffDate: data.cutoffDate, stale: data.stale,
  }), [data.points, data.cutoffDate, data.stale]);
  const quadrant = signQuadrant(data.points.at(-1)!);
  const currentGuide = SIGN_GUIDE.find(row => row.key === quadrant);

  return <div className={styles.interpretation} data-mcclellan-interpretation>
    {reading ? <section className={styles.reading} aria-labelledby={id + "-reading"}
      data-methodology-reading data-reading-id={reading.id}>
      <h4 id={id + "-reading"}>{reading.title}</h4>
      <p className={styles.readingBody}>{reading.body}</p>
      {reading.trough && reading.peak ? <dl className={styles.readingEvidence}>
        <div><dt>Origen del rebote</dt><dd>{number(reading.trough.value)} <span>· <time dateTime={reading.trough.date}>{dateLabel(reading.trough.date)}</time></span></dd></div>
        <div><dt>Máximo local</dt><dd>{number(reading.peak.value)} <span>· <time dateTime={reading.peak.date}>{dateLabel(reading.peak.date)}</time></span></dd></div>
      </dl> : null}
      <div className={styles.readingMeta}>
        <span>Cierre utilizado: <time dateTime={reading.asOf}>{dateLabel(reading.asOf)}</time> · Confirmación: <time dateTime={reading.confirmedAt}>{dateLabel(reading.confirmedAt)}</time></span>
        <a href={reading.source.url} target="_blank" rel="noopener noreferrer">Tom McClellan · artículo original ↗</a>
      </div>
      <details className={styles.readingCriterion}>
        <summary>Criterio de esta observación</summary>
        <p>{reading.criterion} Cada episodio conserva su fecha de confirmación y se muestra como máximo durante 5 cierres, mientras siga vigente.</p>
        <p>Referencia metodológica: {reading.source.title}{reading.source.published ? ` · ${dateLabel(reading.source.published)}` : ""}. Los periodos de confirmación y la prioridad de mensajes son decisiones de este preview. Esta observación describe la amplitud; no anticipa precios.</p>
        <p>Datos: DeanFI · cálculo propio. No se aplican umbrales de la NYSE al S&amp;P 500 sin validación.</p>
      </details>
    </section> : null}

    <details className={styles.signGuide} data-sign-guide>
      <summary><span>Guía de interpretación</span><small>{currentGuide ? `Al cierre: ${currentGuide.ramo} / ${currentGuide.rasi}` : "Al cierre: referencia cero"}</small></summary>
      <div className={styles.guideContent}>
        <p>RAMO: impulso reciente · RASI: saldo acumulado. Cierre del <time dateTime={data.cutoffDate}>{dateLabel(data.cutoffDate)}</time>.</p>
        <table>
          <caption className="sr-only">Interpretación conjunta de los signos del RAMO y el RASI</caption>
          <thead><tr><th scope="col">RAMO</th><th scope="col">RASI</th><th scope="col">Observación de la amplitud</th></tr></thead>
          <tbody>{SIGN_GUIDE.map(row => <tr key={row.key} data-current={row.key === quadrant ? "true" : undefined}>
            <td>{row.ramo}</td><td>{row.rasi}</td><th scope="row">{row.label}{row.key === quadrant ? <small>Observación actual</small> : null}</th>
          </tr>)}</tbody>
        </table>
        <p>Guía propia de interpretación conjunta; no equivale a una señal de precio. Con cero exacto, la referencia es neutral y no se asigna uno de los cuatro cuadrantes.</p>
        <a href={MCCLELLAN_SOURCES.zero.url} target="_blank" rel="noopener noreferrer">McClellan · el cero en la versión ajustada ↗</a>
      </div>
    </details>
  </div>;
}
