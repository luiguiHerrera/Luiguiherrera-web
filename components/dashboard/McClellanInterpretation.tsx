"use client";

import { dashboardText, type DashboardLocale } from "@/lib/dashboard/dashboard-localization";
import { useId, useMemo } from "react";
import { MCCLELLAN_SOURCES, SIGN_GUIDE, selectMcClellanReading, signQuadrant } from "@/lib/dashboard/mcclellan-reading.mjs";
import type { McClellanPreviewData } from "@/lib/dashboard/mcclellan-preview-types";
import styles from "./mcclellan-preview.module.css";

const formatDate = (date: string, locale:DashboardLocale) => new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-ES", {
  day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
}).format(new Date(date + "T12:00Z"));
const formatNumber = (value: number, locale:DashboardLocale) => new Intl.NumberFormat(locale === "en" ? "en-US" : "es-ES", {
  minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "always",
}).format(value);

export function McClellanInterpretation({ data, locale = "es" }: { data: McClellanPreviewData; locale?:DashboardLocale }) {
  const t = (value:string) => dashboardText(locale,value);
  const dateLabel = (value:string) => formatDate(value,locale);
  const number = (value:number) => formatNumber(value,locale);
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
      <h4 id={id + "-reading"}>{t(reading.title)}</h4>
      <p className={styles.readingBody}>{t(reading.body)}</p>
      {reading.trough && reading.peak ? <dl className={styles.readingEvidence}>
        <div><dt>{t("Origen del rebote")}</dt><dd>{number(reading.trough.value)} <span>· <time dateTime={reading.trough.date}>{dateLabel(reading.trough.date)}</time></span></dd></div>
        <div><dt>{t("Máximo local")}</dt><dd>{number(reading.peak.value)} <span>· <time dateTime={reading.peak.date}>{dateLabel(reading.peak.date)}</time></span></dd></div>
      </dl> : null}
      <div className={styles.readingMeta}>
        <span>{t("Cierre utilizado: ")}<time dateTime={reading.asOf}>{dateLabel(reading.asOf)}</time>{t(" · Confirmación: ")}<time dateTime={reading.confirmedAt}>{dateLabel(reading.confirmedAt)}</time></span>
        <a href={reading.source.url} target="_blank" rel="noopener noreferrer">{t("Tom McClellan · artículo original ↗")}</a>
      </div>
      <details className={styles.readingCriterion}>
        <summary>{t("Criterio de esta observación")}</summary>
        <p>{t(reading.criterion)}{t(" Cada episodio conserva su fecha de confirmación y se muestra como máximo durante 5 cierres, mientras siga vigente.")}</p>
        <p>{t("Referencia metodológica: ")}{reading.source.title}{reading.source.published ? ` · ${dateLabel(reading.source.published)}` : ""}{t(". Los periodos de confirmación y la prioridad de mensajes son decisiones de este preview. Esta observación describe la amplitud; no anticipa precios.")}</p>
        <p>{t("Datos: DeanFI · cálculo propio. No se aplican umbrales de la NYSE al S&P 500 sin validación.")}</p>
      </details>
    </section> : null}

    <details className={styles.signGuide} data-sign-guide>
      <summary><span>{t("Guía de interpretación")}</span><small>{currentGuide ? t(`Al cierre: ${currentGuide.ramo} / ${currentGuide.rasi}`) : t("Al cierre: referencia cero")}</small></summary>
      <div className={styles.guideContent}>
        <p>{t("RAMO: impulso reciente · RASI: saldo acumulado. Cierre del ")}<time dateTime={data.cutoffDate}>{dateLabel(data.cutoffDate)}</time>.</p>
        <table>
          <caption className="sr-only">{t("Interpretación conjunta de los signos del RAMO y el RASI")}</caption>
          <thead><tr><th scope="col">RAMO</th><th scope="col">RASI</th><th scope="col">{t("Observación de la amplitud")}</th></tr></thead>
          <tbody>{SIGN_GUIDE.map(row => <tr key={row.key} data-current={row.key === quadrant ? "true" : undefined}>
            <td>{row.ramo}</td><td>{row.rasi}</td><th scope="row">{t(row.label)}{row.key === quadrant ? <small>{t("Observación actual")}</small> : null}</th>
          </tr>)}</tbody>
        </table>
        <p>{t("Guía propia de interpretación conjunta; no equivale a una señal de precio. Con cero exacto, la referencia es neutral y no se asigna uno de los cuatro cuadrantes.")}</p>
        <a href={MCCLELLAN_SOURCES.zero.url} target="_blank" rel="noopener noreferrer">{t("McClellan · el cero en la versión ajustada ↗")}</a>
      </div>
    </details>
  </div>;
}
