"use client";

import { useId, useMemo, useState } from "react";
import { DashboardDisclosureButton, DashboardModuleHeading } from "./DashboardPrimitives";
import { buildOfrFsiSummary, exportOfrFsiCsv, getOfrDelta20 } from "@/lib/dashboard/ofr-fsi";
import type { OfrContribution, OfrFsiDataset, OfrFsiSnapshot, OfrObservation, OfrSeriesKey } from "@/lib/dashboard/ofr-fsi";
import { ofrFsiCopy } from "@/lib/dashboard/ofr-fsi-copy";
import type { OfrLocale } from "@/lib/dashboard/ofr-fsi-copy";
import styles from "./financial-environment.module.css";
import FinancialEnvironmentHistory from "./FinancialEnvironmentHistory";

type HistoryWindow = "3m" | "1y" | "5y" | "all";
type Dimension = "categories" | "regions";
type Measure = "level" | "change";
const WINDOWS: HistoryWindow[] = ["3m", "1y", "5y", "all"];
const PAGE_SIZE = 20;
const SOURCE = "https://www.financialresearch.gov/financial-stress-index/";
const CSV = `${SOURCE}data/fsi.csv`;
const INDICATORS = `${SOURCE}files/indicators/index.html`;

function number(value: number | null | undefined, locale: OfrLocale, digits: number, signed = false) {
  if (value == null || !Number.isFinite(value)) return ofrFsiCopy[locale].unavailable;
  // Calculations retain source precision; suppress negative zero only on display.
  const displayed = Number(value.toFixed(digits)) === 0 ? 0 : value;
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
    signDisplay: signed ? "exceptZero" : "auto",
  }).format(displayed).replace(/-/g, "−");
}
function date(value: string | undefined, locale: OfrLocale) {
  if (!value) return ofrFsiCopy[locale].unavailable;
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
function historyWindow(dataset: OfrFsiDataset, window: HistoryWindow) {
  if (window === "all") return dataset.observations;
  const end = dataset.observations.at(-1)?.date;
  if (!end) return [];
  const start = new Date(`${end}T00:00:00Z`);
  if (window === "3m") start.setUTCMonth(start.getUTCMonth() - 3);
  else start.setUTCFullYear(start.getUTCFullYear() - (window === "1y" ? 1 : 5));
  const startDate = start.toISOString().slice(0, 10);
  return dataset.observations.filter((observation) => observation.date >= startDate);
}

function Choice<T extends string>({ name, legend, value, options, onChange }: {
  name: string; legend: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void;
}) {
  return <fieldset className={styles.choices}>
    <legend className={styles.srOnly}>{legend}</legend>
    {options.map((option) => <label key={option.value} className={styles.choice}>
      <input type="radio" name={name} value={option.value} checked={value === option.value} onChange={() => onChange(option.value)} />
      <span>{option.label}</span>
    </label>)}
  </fieldset>;
}

function MetricHelp({ label, text, locale }: { label: string; text: string; locale: OfrLocale }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return <span className={styles.metricHelp}>
    <button type="button" aria-label={`${locale === "en" ? "Help" : "Ayuda"}: ${label}`} aria-expanded={open} aria-controls={id} aria-describedby={open ? id : undefined}
      onClick={() => setOpen(value => !value)} onBlur={() => setOpen(false)}
      onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); setOpen(false); } }}>
      <span aria-hidden="true">i</span>
    </button>
    <span id={id} role="tooltip" hidden={!open} className={styles.metricTooltip}>{text}</span>
  </span>;
}

function Contributions({ entries, measure, locale, digits }: { entries: OfrContribution[]; measure: Measure; locale: OfrLocale; digits: number }) {
  const copy = ofrFsiCopy[locale];
  const values = entries.map((entry) => measure === "level" ? entry.value : entry.delta20);
  const max = Math.max(...values.map((value) => value === null ? 0 : Math.abs(value)), 0.001);
  return <div className={styles.contributions}>
    <div className={styles.contributionHeader} aria-hidden="true"><span>{copy.component}</span><span>{measure === "level" ? copy.level : copy.delta}</span><span>{copy.level}</span><span>Δ20</span></div>
    {entries.map((entry) => {
      const value = measure === "level" ? entry.value : entry.delta20;
      const width = value === null ? 0 : Math.abs(value) / max * 50;
      return <div key={entry.key} className={styles.contributionRow}>
        <div className={styles.contributionName}><h4>{copy.contributions[entry.key].label}</h4><p>{copy.contributions[entry.key].meaning}</p></div>
        <div className={styles.barWrap}>
          <div className={styles.bar} aria-hidden="true"><span className={styles.barZero} />{value !== null && value !== 0 ? <span className={styles.barFill} style={{ width: `${width}%`, ...(value < 0 ? { right: "50%" } : { left: "50%" }) }} /> : null}</div>
          <span className={styles.srOnly}>{measure === "level" ? copy.level : copy.delta}: {number(value, locale, digits, true)} {copy.points}</span>
        </div>
        <div className={styles.rowNumber}><span className={styles.mobileLabel}>{copy.level}</span>{number(entry.value, locale, digits, true)}</div>
        <div className={styles.rowNumber}><span className={styles.mobileLabel}>Δ20</span>{number(entry.delta20, locale, digits, true)}</div>
      </div>;
    })}
    <p className={styles.barCaption}><span>−</span><span>0 · {copy.contributionPoints}</span><span>+</span></p>
  </div>;
}

function DataTable({ dataset, observations, dimension, locale, digits }: { dataset: OfrFsiDataset; observations: OfrObservation[]; dimension: Dimension; locale: OfrLocale; digits: number }) {
  const copy = ofrFsiCopy[locale];
  const [page, setPage] = useState(0);
  const pages = Math.max(Math.ceil(observations.length / PAGE_SIZE), 1);
  const displayedPage = Math.min(page, pages - 1);
  const rows = observations.slice().reverse().slice(displayedPage * PAGE_SIZE, (displayedPage + 1) * PAGE_SIZE);
  const keys: OfrSeriesKey[] = dimension === "categories" ? ["fsi", "credit", "equityValuation", "funding", "safeAssets", "volatility"] : ["fsi", "unitedStates", "otherAdvancedEconomies", "emergingMarkets"];
  const sourceIndex = useMemo(() => new Map(dataset.observations.map((row, index) => [row.date, index])), [dataset]);
  const label = (key: OfrSeriesKey) => key === "fsi" ? "OFR FSI" : copy.contributions[key].label;
  const download = () => {
    const blob = new Blob(["\uFEFF", exportOfrFsiCsv(dataset, observations)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `ofr-fsi-${observations[0]?.date ?? "data"}-${observations.at(-1)?.date ?? "data"}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <details className={styles.dataDetails}>
    <summary>{copy.tableSummary}<span>{observations.length.toLocaleString(locale)} {copy.observations}</span></summary>
    <div className={styles.tableHeading}><div><h4>{copy.table}</h4><p>{copy.tableNote}</p></div><button type="button" className={styles.download} onClick={download}>{copy.download}<span aria-hidden="true"> ↓</span></button></div>
    <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={copy.tableScroll}>
      <table><caption className={styles.srOnly}>{copy.table}. {copy.points}. {dimension === "categories" ? copy.categories : copy.regions}.</caption>
        <thead><tr><th rowSpan={2} scope="col">{copy.rowDate}</th><th colSpan={keys.length} scope="colgroup">{copy.publishedColumns}</th><th rowSpan={2} scope="col">{copy.comparisonDate}</th><th colSpan={keys.length} scope="colgroup">{copy.derivedColumns}</th></tr><tr>{keys.map((key) => <th key={`level-${key}`} scope="col">{label(key)}</th>)}{keys.map((key) => <th key={`delta-${key}`} scope="col">{label(key)}</th>)}</tr></thead>
        <tbody>{rows.map((row) => {
          const index = sourceIndex.get(row.date)!;
          const comparison = dataset.observations[index - 20];
          return <tr key={row.date}><th scope="row"><time dateTime={row.date}>{date(row.date, locale)}</time></th>{keys.map((key) => <td key={`level-${key}`}>{number(row[key], locale, digits, key !== "fsi")}</td>)}<td>{comparison ? date(comparison.date, locale) : copy.unavailable}</td>{keys.map((key) => <td key={`delta-${key}`}>{number(getOfrDelta20(dataset, index, key), locale, digits, true)}</td>)}</tr>;
        })}</tbody>
      </table>
    </div>
    <div className={styles.pagination}><button type="button" disabled={displayedPage === 0} onClick={() => setPage(displayedPage - 1)}>{copy.previous}</button><span aria-live="polite">{copy.page} {displayedPage + 1} {copy.of} {pages}</span><button type="button" disabled={displayedPage >= pages - 1} onClick={() => setPage(displayedPage + 1)}>{copy.next}</button></div>
    <p className={styles.note}>{copy.downloadNote}</p>
  </details>;
}

export default function FinancialEnvironmentCard({ snapshot, locale = "es" }: { snapshot: OfrFsiSnapshot | null; locale?: OfrLocale }) {
  const id = useId();
  const copy = ofrFsiCopy[locale];
  const [expanded, setExpanded] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [dimension, setDimension] = useState<Dimension>("categories");
  const [measure, setMeasure] = useState<Measure>("level");
  const [window, setWindow] = useState<HistoryWindow>("1y");
  const summary = useMemo(() => snapshot ? buildOfrFsiSummary(snapshot.dataset) : null, [snapshot]);
  const observations = useMemo(() => snapshot ? historyWindow(snapshot.dataset, window) : [], [snapshot, window]);
  const digits = snapshot?.dataset.decimalPlaces ?? 3;
  const entries = summary ? dimension === "categories" ? summary.categoryContributions : summary.regionContributions : [];
  const increases = entries.filter((entry) => entry.delta20 !== null && entry.delta20 > 0).sort((a, b) => b.delta20! - a.delta20!);
  const decreases = entries.filter((entry) => entry.delta20 !== null && entry.delta20 < 0).sort((a, b) => a.delta20! - b.delta20!);
  const state = summary?.state ?? "unavailable";
  return <section className={styles.card} aria-labelledby={`${id}-title`} data-financial-environment>
    <header className={styles.heading}><div><p className={styles.eyebrow}>{copy.subtitle}</p><DashboardModuleHeading headingLevel="h2"><span id={`${id}-title`}>{copy.title}</span></DashboardModuleHeading></div><a className={styles.sourceMark} href={SOURCE} target="_blank" rel="noreferrer">Office of Financial Research<span aria-hidden="true"> ↗</span></a></header>
    {snapshot?.refreshStatus === "retained" ? <p className={styles.refreshNotice} role="status">{copy.retained}</p> : null}
    <div className={styles.overview}>
      <div className={styles.overviewItem}><div className={styles.metricLabel}><h3>{copy.observed}</h3><MetricHelp label={copy.observed} text={copy.observedHelp} locale={locale} /></div><p className={styles.mainValue}>{number(summary?.latest?.fsi, locale, digits)}</p><p className={styles.reading}>{copy.average[state]}</p><p className={styles.date}>{copy.date}: <time dateTime={summary?.latest?.date}>{date(summary?.latest?.date, locale)}</time></p></div>
      <div className={styles.overviewItem}><div className={styles.metricLabel}><h3>{copy.change}</h3><MetricHelp label={copy.change} text={copy.changeHelp} locale={locale} /></div><p className={styles.mainValue}>{number(summary?.delta20, locale, digits, true)}</p><p className={styles.reading}>{copy.trend[summary?.trend ?? "unavailable"]}<span className={styles.unit}> · {copy.points}</span></p><p className={styles.date}>{summary?.comparison ? `${date(summary.comparison.date, locale)} – ${date(summary.latest?.date, locale)}` : copy.comparisonUnavailable}</p></div>
      <div className={styles.overviewItem}><div className={styles.metricLabel}><h3>{copy.focus}</h3><MetricHelp label={copy.focus} text={copy.focusHelp} locale={locale} /></div>{summary?.focusCategories.length ? <ul className={styles.focusList}>{summary.focusCategories.map((entry) => <li key={entry.key}><span>{copy.contributions[entry.key].label}</span><strong>{number(entry.value, locale, digits, true)}</strong></li>)}</ul> : <p className={styles.noFocus}>{summary?.coverage.categories === 5 ? copy.noPositive : copy.noFocus}</p>}<p className={styles.date}>{copy.focusNote}</p>{summary && summary.coverage.categories < 5 ? <p className={styles.note}>{copy.partialFocus}</p> : null}</div>
    </div>
    <div className={styles.disclosure}><p>{copy.lag}</p><DashboardDisclosureButton controls={`${id}-details`} expanded={expanded} collapsedLabel={copy.open} expandedLabel={copy.close} onClick={() => setExpanded(!expanded)} /></div>
    <div id={`${id}-details`} hidden={!expanded} className={styles.detail}>
      {summary && snapshot && summary.latest ? <>
        <div className={styles.detailIntro}><p>{copy.alternative}</p><p>{summary.comparison ? <>{copy.compare}: <strong>{date(summary.comparison.date, locale)} – {date(summary.latest.date, locale)}</strong>.</> : copy.comparisonUnavailable}</p></div>
        <div className={styles.controls}><Choice name={`${id}-dimension`} legend={copy.dimension} value={dimension} options={[{ value: "categories", label: copy.categories }, { value: "regions", label: copy.regions }]} onChange={setDimension} /><Choice name={`${id}-measure`} legend={copy.representation} value={measure} options={[{ value: "level", label: copy.level }, { value: "change", label: copy.delta }]} onChange={setMeasure} /></div>
        <Contributions entries={entries} measure={measure} locale={locale} digits={digits} />
        <div className={styles.changeDrivers}><h3>{copy.changeDrivers}</h3><div className={styles.driversGrid}>{([{ entry: increases[0], title: copy.increaseDriver }, { entry: decreases[0], title: copy.decreaseDriver }]).filter(({ entry }) => entry).map(({ entry, title }) => <div key={entry.key}><p>{title}</p><span>{copy.contributions[entry.key].label}</span><strong>{number(entry.delta20, locale, digits, true)} <small>{copy.points}</small></strong></div>)}{!increases.length && !decreases.length ? <p className={styles.note}>{copy.noChangeDrivers}</p> : null}</div><p className={styles.note}>{copy.driversNote}</p></div>
        <div className={styles.history}><div className={styles.historyHeading}><div><h3>{copy.history}</h3><p>{copy.historyNote}</p></div><Choice name={`${id}-window`} legend={copy.window} value={window} options={WINDOWS.map((value) => ({ value, label: copy.windows[value] }))} onChange={setWindow} /></div><FinancialEnvironmentHistory key={window} observations={observations} locale={locale} digits={digits} id={id} /></div>
        <DataTable key={`${window}-${dimension}`} dataset={snapshot.dataset} observations={observations} dimension={dimension} locale={locale} digits={digits} />
      </> : <p className={styles.note}>{copy.noData}</p>}
      <div className={styles.contextDisclosure}><DashboardDisclosureButton controls={`${id}-context`} expanded={contextOpen} collapsedLabel={copy.showContext} expandedLabel={copy.hideContext} onClick={() => setContextOpen(value => !value)} /></div>
      <div id={`${id}-context`} hidden={!contextOpen} className={styles.methodology}><p>{copy.methodologyText}</p><p>{copy.calculation}</p><p>{copy.lag} {copy.limitations}</p><p>{copy.underlying}</p><nav aria-label={copy.source}><a href={SOURCE} target="_blank" rel="noreferrer">{copy.source} ↗</a><a href={CSV} target="_blank" rel="noreferrer">{copy.rawData} ↗</a><a href={INDICATORS} target="_blank" rel="noreferrer">{copy.indicators} ↗</a></nav></div>
    </div>
  </section>;
}
