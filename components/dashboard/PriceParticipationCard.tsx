"use client";

import { useId, useMemo, useState } from "react";
import { DashboardDisclosureButton, DashboardModuleHeading } from "./DashboardPrimitives";
import PriceParticipationChart from "./PriceParticipationChart";
import { buildPriceParticipation, exportPriceParticipationCsv, PRICE_PARTICIPATION_WINDOWS } from "@/lib/dashboard/price-participation";
import type { PriceParticipationInput, PriceParticipationView, PriceParticipationWindow } from "@/lib/dashboard/price-participation";
import { priceParticipationCopy, type PriceParticipationLocale } from "@/lib/dashboard/price-participation-copy";
import styles from "./price-participation.module.css";

const BREADTH_SOURCE = "https://github.com/DeanFinancials/deanfi-data";
const PAGE_SIZE = 20;
function number(value: number | null | undefined, locale: PriceParticipationLocale, digits = 2, signed = false) {
  if (value == null || !Number.isFinite(value)) return priceParticipationCopy[locale].unavailable;
  const displayed = Number(value.toFixed(digits)) === 0 ? 0 : value;
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits, signDisplay: signed ? "exceptZero" : "auto" }).format(displayed).replace(/-/g, "−");
}
function date(value: string | null | undefined, locale: PriceParticipationLocale) {
  if (!value) return priceParticipationCopy[locale].unavailable;
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
function Help({ label, text, locale }: { label: string; text: string; locale: PriceParticipationLocale }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return <span className={styles.metricHelp}><button type="button" aria-label={`${locale === "en" ? "Help" : "Ayuda"}: ${label}`} aria-expanded={open} aria-controls={id} aria-describedby={open ? id : undefined}
    onClick={() => setOpen(value => !value)} onBlur={() => setOpen(false)} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); setOpen(false); } }}><span aria-hidden="true">i</span></button><span id={id} role="tooltip" hidden={!open} className={styles.metricTooltip}>{text}</span></span>;
}
function WindowTable({ view, locale }: { view: PriceParticipationView; locale: PriceParticipationLocale }) {
  const copy = priceParticipationCopy[locale];
  const [page, setPage] = useState(0);
  const pages = Math.max(Math.ceil(view.rows.length / PAGE_SIZE), 1);
  const currentPage = Math.min(page, pages - 1);
  const rows = view.rows.slice().reverse().slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const download = () => {
    const blob = new Blob(["\uFEFF", exportPriceParticipationCsv(view)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `price-participation-${view.comparisonDate ?? "data"}-${view.cutoffDate ?? "data"}-${view.sessions}s.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <details className={styles.dataDetails}><summary>{copy.table}</summary><div className={styles.tableHeading}><div><h3>{copy.tableTitle}</h3><p>{copy.tableNote}</p></div><button type="button" className={styles.download} onClick={download}>{copy.download} <span aria-hidden="true">↓</span></button></div>
    <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={copy.tableScroll}><table><caption className={styles.srOnly}>{copy.tableTitle} · {view.sessions} {copy.session}</caption><thead><tr>{[copy.date, copy.spyClose, copy.rspClose, copy.spyBase, copy.rspBase, "RAMO", "RASI"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.date}><th scope="row"><time dateTime={row.date}>{date(row.date, locale)}</time></th><td>{number(row.spyClose, locale)}</td><td>{number(row.rspClose, locale)}</td><td>{number(row.spyNormalized, locale)}</td><td>{number(row.rspNormalized, locale)}</td><td>{number(row.oscillator, locale, 1, true)}</td><td>{number(row.summation, locale, 1, true)}</td></tr>)}</tbody></table></div>
    <div className={styles.pagination}><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>{copy.previous}</button><span aria-live="polite">{copy.page} {currentPage + 1} {copy.of} {pages}</span><button type="button" disabled={currentPage >= pages - 1} onClick={() => setPage(currentPage + 1)}>{copy.next}</button></div>
  </details>;
}

export default function PriceParticipationCard({ input, locale = "es" }: { input: PriceParticipationInput | null; locale?: PriceParticipationLocale }) {
  const copy = priceParticipationCopy[locale];
  const id = useId();
  const [sessions, setSessions] = useState<PriceParticipationWindow>(20);
  const [expanded, setExpanded] = useState(false);
  const [context, setContext] = useState(false);
  const view = useMemo(() => input ? buildPriceParticipation(input, sessions) : null, [input, sessions]);
  const rows = view?.rows ?? [];
  const sectorScale = Math.max(...(view?.sectors.map(sector => Math.abs(sector.returnPct ?? 0)) ?? []), 0.001);
  const priceSeries = [
    { key: "spy", label: "SPY", color: "#193d32", points: rows.map(row => ({ date: row.date, value: row.spyNormalized })) },
    { key: "rsp", label: "RSP", color: "#947337", points: rows.map(row => ({ date: row.date, value: row.rspNormalized })) },
  ];
  const help = { spy: copy.spyHelp, relative: copy.relativeHelp, ramo: copy.ramoHelp, rasi: copy.rasiHelp };
  const lagged = Boolean(view?.cutoffDate && (
    view.warnings.includes("aligned-to-earlier-cutoff") ||
    (view.priceAvailableThrough && view.breadthAvailableThrough && view.priceAvailableThrough !== view.breadthAvailableThrough)
  ));
  const incomplete = view?.warnings.some(code => code === "insufficient-history" || code === "missing-spy-endpoint" || code === "missing-rsp-endpoint");
  return <section className={styles.card} aria-labelledby={`${id}-title`} data-price-participation>
    <header className={styles.heading}><div><p className={styles.eyebrow}>{copy.subtitle}</p><DashboardModuleHeading headingLevel="h2"><span id={`${id}-title`}>{copy.title}</span></DashboardModuleHeading></div><fieldset className={styles.windows}><legend>{copy.sessions}</legend>{PRICE_PARTICIPATION_WINDOWS.map(value => <label key={value}><input type="radio" name={`${id}-window`} checked={sessions === value} onChange={() => setSessions(value)} value={value} /><span>{value}</span></label>)}</fieldset></header>
    <p className={styles.cutoff}>{copy.cutoff}: <time dateTime={view?.cutoffDate ?? undefined}>{date(view?.cutoffDate, locale)}</time></p>
    {!view ? <p className={styles.notice} role="status">{copy.noData}</p> : null}
    {view?.refreshStatus === "retained" ? <p className={styles.notice} role="status">{copy.retained}</p> : null}
    {lagged ? <p className={styles.notice}>{copy.lag} <span>{copy.priceThrough}: {date(view?.priceAvailableThrough, locale)} · {copy.breadthThrough}: {date(view?.breadthAvailableThrough, locale)}.</span></p> : null}
    {view?.breadth?.stale && !lagged ? <p className={styles.notice}>{copy.breadthPending}</p> : null}
    <div className={styles.metrics}>
      <div><h3 className={styles.metricLabel}>{copy.spy}<Help label={copy.spy} text={help.spy} locale={locale} /></h3><p className={styles.mainValue}>{number(view?.spy.close, locale)}<small>{copy.usd}</small></p><p className={styles.metricNote}>{copy.return}: <strong>{number(view?.spy.returnPct, locale, 2, true)}{view?.spy.returnPct == null ? "" : "%"}</strong> · {sessions} {copy.session}</p></div>
      <div><h3 className={styles.metricLabel}>{copy.relative}<Help label={copy.relative} text={help.relative} locale={locale} /></h3><p className={styles.mainValue}>{number(view?.rsp.relativePp, locale, 2, true)}</p><p className={styles.metricNote}>{copy.pp}</p></div>
      <div><h3 className={styles.metricLabel}>{copy.ramo}<Help label={copy.ramo} text={help.ramo} locale={locale} /></h3><p className={styles.mainValue}>{number(view?.breadth?.last?.oscillator, locale, 1, true)}</p><p className={styles.metricNote}>{copy.oscillatorPoints}</p></div>
      <div><h3 className={styles.metricLabel}>{copy.rasi}<Help label={copy.rasi} text={help.rasi} locale={locale} /></h3><p className={styles.mainValue}>{number(view?.breadth?.last?.summation, locale, 1, true)}</p><p className={styles.metricNote}>{copy.summationPoints}</p></div>
    </div>
    <div className={styles.disclosure}><p>{view?.comparisonDate ? <>{copy.comparison}: {date(view.comparisonDate, locale)} {copy.through} {date(view.cutoffDate, locale)}</> : copy.insufficient}</p><DashboardDisclosureButton controls={`${id}-detail`} expanded={expanded} collapsedLabel={copy.open} expandedLabel={copy.close} onClick={() => setExpanded(value => !value)} /></div>
    <div className={styles.detail} id={`${id}-detail`} hidden={!expanded}>
      {view && view.cutoffDate ? <>
        {incomplete ? <p className={styles.notice}>{copy.insufficient}</p> : null}
        <div className={styles.sectionHeading}><h3>{copy.priceHistory}</h3><p>{copy.priceNote}</p><p className={styles.returnComparison}>{copy.return} · SPY: <strong>{number(view.spy.returnPct, locale, 2, true)}{view.spy.returnPct === null ? "" : "%"}</strong> · RSP: <strong>{number(view.rsp.returnPct, locale, 2, true)}{view.rsp.returnPct === null ? "" : "%"}</strong></p></div>
        <PriceParticipationChart key={`${sessions}-price`} id={`${id}-price`} title="SPY / RSP" series={priceSeries} locale={locale} unit={copy.normalized} digits={2} reference={100} />
        <div className={styles.sectionHeading}><h3>{copy.breadthTitle}</h3><p>{copy.breadthNote}</p></div>
        <div className={styles.breadthCharts}><PriceParticipationChart key={`${sessions}-ramo`} id={`${id}-ramo`} title="RAMO" series={[{ key: "ramo", label: "RAMO", color: "#193d32", points: rows.map(row => ({ date: row.date, value: row.oscillator })) }]} locale={locale} unit={copy.oscillatorPoints} digits={1} reference={0} /><PriceParticipationChart key={`${sessions}-rasi`} id={`${id}-rasi`} title="RASI" series={[{ key: "rasi", label: "RASI", color: "#947337", points: rows.map(row => ({ date: row.date, value: row.summation })) }]} locale={locale} unit={copy.summationPoints} digits={1} reference={0} /></div>
        <div className={styles.sectors}><div className={styles.sectorsHeading}><div className={styles.sectionHeading}><h3>{copy.sectors}</h3><p>{copy.sectorsNote}</p></div><p className={styles.participationCount}><strong>{view.participation.covered ? `${view.participation.positive}/${view.participation.covered}` : copy.unavailable}</strong><span>{copy.advancing}<small>{copy.valid}</small></span></p></div>
          <div className={styles.sectorColumnHead} aria-hidden="true"><span>{copy.sector}</span><span>{copy.sectorReturn}</span><span>%</span></div>
          {view.sectors.map(sector => <div className={styles.sectorRow} key={sector.ticker}><p><strong>{sector.ticker}</strong><span>{copy.sectorsNames[sector.ticker]}</span></p><div className={styles.sectorBar} aria-hidden="true"><span className={styles.sectorZero} />{sector.returnPct !== null && sector.returnPct !== 0 ? <span className={styles.sectorFill} style={{ width: `${Math.abs(sector.returnPct) / sectorScale * 50}%`, ...(sector.returnPct < 0 ? { right: "50%" } : { left: "50%" }) }} /> : null}</div><span className={styles.sectorValue}>{number(sector.returnPct, locale, 2, true)}{sector.returnPct === null ? "" : "%"}</span></div>)}
          {view.participation.covered < view.participation.total ? <p className={styles.note}>{copy.coverage}: {view.participation.covered}/{view.participation.total}. {copy.missingSectors}</p> : null}
        </div>
        <WindowTable key={sessions} view={view} locale={locale} />
      </> : <p className={styles.note}>{copy.noData}</p>}
      <div className={styles.contextDisclosure}><DashboardDisclosureButton controls={`${id}-context`} expanded={context} collapsedLabel={copy.showContext} expandedLabel={copy.hideContext} onClick={() => setContext(value => !value)} /></div>
      <div className={styles.context} id={`${id}-context`} hidden={!context}><h3>{copy.methodology}</h3><p>{copy.context}</p><p>{copy.calculation}</p><p>{copy.breadthCalculation}</p><p>{copy.breadthLimit}</p><p>{copy.limitations}</p><nav aria-label={copy.methodology}>{input?.authority.sourceUrl ? <a href={input.authority.sourceUrl} target="_blank" rel="noreferrer">{copy.source} ↗</a> : null}<a href={input?.breadth?.sourceCommit ? `${BREADTH_SOURCE}/blob/${input.breadth.sourceCommit}/advance-decline/ad_line_historical.json` : BREADTH_SOURCE} target="_blank" rel="noreferrer">{copy.breadthSource} · DeanFI ↗</a></nav></div>
    </div>
  </section>;
}
