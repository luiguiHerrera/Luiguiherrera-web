"use client";

import { useId, useMemo, useState } from "react";
import { DashboardDisclosureButton, DashboardModuleHeading } from "./DashboardPrimitives";
import { buildOfrFsiSummary, exportOfrFsiCsv, getOfrDelta20 } from "@/lib/dashboard/ofr-fsi";
import type { OfrContribution, OfrFsiDataset, OfrFsiSnapshot, OfrObservation, OfrReconciliation, OfrSeriesKey } from "@/lib/dashboard/ofr-fsi";
import { ofrFsiCopy } from "@/lib/dashboard/ofr-fsi-copy";
import type { OfrLocale } from "@/lib/dashboard/ofr-fsi-copy";
import styles from "./financial-environment.module.css";

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

function Reconciliation({ current, change, locale, digits, count, changeCount, total }: { current: OfrReconciliation; change: OfrReconciliation; locale: OfrLocale; digits: number; count: number; changeCount: number; total: number }) {
  const copy = ofrFsiCopy[locale];
  const status = current.status === "incomplete" || change.status === "incomplete" ? "incomplete" : current.status === "mismatch" || change.status === "mismatch" ? "mismatch" : "reconciled";
  return <details className={styles.smallDetails}>
    <summary>{copy.reconciliation}<span>{copy.level}: {count}/{total} · Δ20: {changeCount}/{total}</span></summary>
    <p>{copy[status]}</p>
    <div className={styles.reconciliationGrid}>{([{ label: copy.level, item: current }, { label: copy.delta, item: change }]).map(({ label, item }) => <dl key={label}>
      <dt className={styles.reconciliationTitle}>{label}</dt><dd />
      <dt>{copy.published}</dt><dd>{number(item.expected, locale, digits, true)}</dd>
      <dt>{copy.sum}</dt><dd>{number(item.sum, locale, digits, true)}</dd>
      <dt>{copy.residual}</dt><dd>{number(item.residual, locale, digits + 1, true)}</dd>
      <dt>{copy.tolerance}</dt><dd>{number(item.tolerance, locale, digits + 1)}</dd>
    </dl>)}</div>
  </details>;
}

function HistoryChart({ observations, locale, digits, id }: { observations: OfrObservation[]; locale: OfrLocale; digits: number; id: string }) {
  const copy = ofrFsiCopy[locale];
  const [selected, setSelected] = useState<number | null>(null);
  const selectedIndex = Math.min(selected ?? observations.length - 1, observations.length - 1);
  const active = observations[selectedIndex];
  const values = observations.flatMap((row) => row.fsi === null ? [] : [row.fsi]);
  if (!values.length) return <p className={styles.note}>{copy.chartEmpty}</p>;
  const lower = Math.min(0, ...values), upper = Math.max(0, ...values);
  const padding = Math.max((upper - lower) * 0.08, 0.1);
  const min = lower - padding, max = upper + padding;
  const firstTime = Date.parse(observations[0].date), lastTime = Date.parse(observations.at(-1)!.date);
  const x = (row: OfrObservation) => 18 + (Date.parse(row.date) - firstTime) / Math.max(lastTime - firstTime, 1) * 964;
  const y = (value: number) => 236 - (value - min) / (max - min) * 218;
  const path = observations.map((row, index) => {
    if (row.fsi === null) return "";
    const connected = index > 0 && observations[index - 1].fsi !== null;
    return `${connected ? "L" : "M"}${x(row).toFixed(2)},${y(row.fsi).toFixed(2)}`;
  }).join(" ");
  return <div className={styles.historyChart}>
    <div className={styles.chartReadout} aria-live="polite"><time dateTime={active.date}>{date(active.date, locale)}</time><strong>{number(active.fsi, locale, digits)}</strong><span>{copy.points}</span></div>
    <div className={styles.chartCanvas}>
      <svg viewBox="0 0 1000 260" preserveAspectRatio="none" role="img" aria-labelledby={`${id}-chart-title ${id}-chart-desc`}>
        <title id={`${id}-chart-title`}>{copy.history}</title><desc id={`${id}-chart-desc`}>{copy.historyDescription}</desc>
        <line x1="18" x2="982" y1={y(0)} y2={y(0)} className={styles.zeroLine} vectorEffect="non-scaling-stroke" />
        <path d={path} className={styles.historyLine} vectorEffect="non-scaling-stroke" />
        {active.fsi !== null ? <><line x1={x(active)} x2={x(active)} y1="18" y2="236" className={styles.cursorLine} vectorEffect="non-scaling-stroke" /><circle cx={x(active)} cy={y(active.fsi)} r="3.5" className={styles.cursorPoint} vectorEffect="non-scaling-stroke" /></> : null}
      </svg>
      <span className={styles.zeroLabel} style={{ top: `${y(0) / 260 * 100}%` }}>{copy.zero}</span>
    </div>
    <div className={styles.chartDates}><span>{date(observations[0].date, locale)}</span><span>{date(observations.at(-1)?.date, locale)}</span></div>
    <label className={styles.scrubber} htmlFor={`${id}-observation`}><span>{copy.inspect}</span><input id={`${id}-observation`} type="range" min="0" max={observations.length - 1} value={selectedIndex} onChange={(event) => setSelected(Number(event.target.value))} aria-valuetext={`${date(active.date, locale)}: ${number(active.fsi, locale, digits)} ${copy.points}`} /></label>
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
  const [dimension, setDimension] = useState<Dimension>("categories");
  const [measure, setMeasure] = useState<Measure>("level");
  const [window, setWindow] = useState<HistoryWindow>("1y");
  const summary = useMemo(() => snapshot ? buildOfrFsiSummary(snapshot.dataset) : null, [snapshot]);
  const observations = useMemo(() => snapshot ? historyWindow(snapshot.dataset, window) : [], [snapshot, window]);
  const digits = snapshot?.dataset.decimalPlaces ?? 3;
  const entries = summary ? dimension === "categories" ? summary.categoryContributions : summary.regionContributions : [];
  const historicalIssues = summary?.historicalIssues.filter((issue) => observations.length && issue.date >= observations[0].date && issue.date <= observations.at(-1)!.date) ?? [];
  const increases = entries.filter((entry) => entry.delta20 !== null && entry.delta20 > 0).sort((a, b) => b.delta20! - a.delta20!);
  const decreases = entries.filter((entry) => entry.delta20 !== null && entry.delta20 < 0).sort((a, b) => a.delta20! - b.delta20!);
  const state = summary?.state ?? "unavailable";
  const currentReconciliation = summary?.reconciliation[dimension];
  const changeReconciliation = summary?.reconciliation[dimension === "categories" ? "categoryChanges" : "regionChanges"];
  return <section className={styles.card} aria-labelledby={`${id}-title`} data-financial-environment>
    <header className={styles.heading}><div><p className={styles.eyebrow}>{copy.subtitle}</p><DashboardModuleHeading headingLevel="h2"><span id={`${id}-title`}>{copy.title}</span></DashboardModuleHeading></div><a className={styles.sourceMark} href={SOURCE} target="_blank" rel="noreferrer">Office of Financial Research<span aria-hidden="true"> ↗</span></a></header>
    {snapshot?.refreshStatus === "retained" ? <p className={styles.refreshNotice} role="status">{copy.retained}</p> : null}
    <div className={styles.overview}>
      <div className={styles.overviewItem}><h3>{copy.observed}</h3><p className={styles.mainValue}>{number(summary?.latest?.fsi, locale, digits)}</p><p className={styles.reading}>{copy.average[state]}</p><p className={styles.date}>{copy.date}: <time dateTime={summary?.latest?.date}>{date(summary?.latest?.date, locale)}</time></p></div>
      <div className={styles.overviewItem}><h3>{copy.change}</h3><p className={styles.mainValue}>{number(summary?.delta20, locale, digits, true)}</p><p className={styles.reading}>{copy.trend[summary?.trend ?? "unavailable"]}<span className={styles.unit}> · {copy.points}</span></p><p className={styles.date}>{summary?.comparison ? `${date(summary.comparison.date, locale)} – ${date(summary.latest?.date, locale)}` : copy.comparisonUnavailable}</p></div>
      <div className={styles.overviewItem}><h3>{copy.focus}</h3>{summary?.focusCategories.length ? <ul className={styles.focusList}>{summary.focusCategories.map((entry) => <li key={entry.key}><span>{copy.contributions[entry.key].label}</span><strong>{number(entry.value, locale, digits, true)}</strong></li>)}</ul> : <p className={styles.noFocus}>{summary?.coverage.categories === 5 ? copy.noPositive : copy.noFocus}</p>}<p className={styles.date}>{copy.focusNote}</p>{summary && summary.coverage.categories < 5 ? <p className={styles.note}>{copy.partialFocus}</p> : null}</div>
    </div>
    <div className={styles.disclosure}><p>{copy.lag}</p><DashboardDisclosureButton controls={`${id}-details`} expanded={expanded} collapsedLabel={copy.open} expandedLabel={copy.close} onClick={() => setExpanded(!expanded)} /></div>
    <div id={`${id}-details`} hidden={!expanded} className={styles.detail}>
      {summary && snapshot && summary.latest ? <>
        <div className={styles.detailIntro}><p>{copy.alternative}</p><p>{summary.comparison ? <>{copy.compare}: <strong>{date(summary.comparison.date, locale)} – {date(summary.latest.date, locale)}</strong>.</> : copy.comparisonUnavailable}</p></div>
        <div className={styles.controls}><Choice name={`${id}-dimension`} legend={copy.dimension} value={dimension} options={[{ value: "categories", label: copy.categories }, { value: "regions", label: copy.regions }]} onChange={setDimension} /><Choice name={`${id}-measure`} legend={copy.representation} value={measure} options={[{ value: "level", label: copy.level }, { value: "change", label: copy.delta }]} onChange={setMeasure} /></div>
        <Contributions entries={entries} measure={measure} locale={locale} digits={digits} />
        <div className={styles.changeDrivers}><h3>{copy.changeDrivers}</h3><div className={styles.driversGrid}>{([{ entry: increases[0], title: copy.increaseDriver }, { entry: decreases[0], title: copy.decreaseDriver }]).filter(({ entry }) => entry).map(({ entry, title }) => <div key={entry.key}><p>{title}</p><span>{copy.contributions[entry.key].label}</span><strong>{number(entry.delta20, locale, digits, true)} <small>{copy.points}</small></strong></div>)}{!increases.length && !decreases.length ? <p className={styles.note}>{copy.noChangeDrivers}</p> : null}</div><p className={styles.note}>{copy.driversNote}</p></div>
        {currentReconciliation && changeReconciliation ? <Reconciliation current={currentReconciliation} change={changeReconciliation} locale={locale} digits={digits} count={summary.coverage[dimension]} changeCount={summary.coverage[dimension === "categories" ? "categoryChanges" : "regionChanges"]} total={entries.length} /> : null}
        <div className={styles.history}><div className={styles.historyHeading}><div><h3>{copy.history}</h3><p>{copy.historyNote}</p></div><Choice name={`${id}-window`} legend={copy.window} value={window} options={WINDOWS.map((value) => ({ value, label: copy.windows[value] }))} onChange={setWindow} /></div><HistoryChart key={window} observations={observations} locale={locale} digits={digits} id={id} /></div>
        {historicalIssues.length ? <p className={styles.historicalNotice}>{copy.historicalIssue} {historicalIssues.map((issue) => `${date(issue.date, locale)} · ${issue.dimension === "categories" ? copy.categories : copy.regions} · ${copy.residual.toLowerCase()}: ${number(issue.residual, locale, digits, true)} ${copy.points}`).join("; ")}</p> : null}
        <DataTable key={`${window}-${dimension}`} dataset={snapshot.dataset} observations={observations} dimension={dimension} locale={locale} digits={digits} />
      </> : <p className={styles.note}>{copy.noData}</p>}
      <details className={styles.methodology}><summary>{copy.methodology}</summary><p>{copy.methodologyText}</p><p>{copy.calculation}</p><p>{copy.lag} {copy.limitations}</p><p>{copy.underlying}</p><nav aria-label={copy.methodology}><a href={SOURCE} target="_blank" rel="noreferrer">{copy.source} ↗</a><a href={CSV} target="_blank" rel="noreferrer">{copy.rawData} ↗</a><a href={INDICATORS} target="_blank" rel="noreferrer">{copy.indicators} ↗</a></nav></details>
    </div>
  </section>;
}
