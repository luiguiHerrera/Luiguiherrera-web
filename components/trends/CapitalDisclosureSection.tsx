import Link from "next/link";
import { CapitalDisclosureTable } from "./CapitalDisclosureTable";
import { CapitalOverlapChart } from "./CapitalOverlapChart";
import styles from "./trends.module.css";
import { capitalCopy } from "@/lib/trends/capital/copy";
import { trendsCopy } from "@/lib/trends/copy";
import { trendsMethodologyPath } from "@/lib/trends/catalog";
import type { PublicCapital } from "@/lib/trends/capital/public-contract";

export function capitalQuarterLabel(quarterEnd: string) {
  const date = new Date(`${quarterEnd}T00:00:00Z`);
  return `13F · Q${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`;
}
export function capitalPeriodLabel(quarterEnd: string, locale: "es" | "en") {
  const date = new Date(`${quarterEnd}T00:00:00Z`);
  return `${capitalQuarterLabel(quarterEnd)} · ${capitalCopy[locale].positionsAt} ${new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", { day: "numeric", month: "long", timeZone: "UTC" }).format(date)} · ${capitalCopy[locale].delayed}`;
}
export function CapitalDisclosureSection({ capital, locale, alphabetUnion }: { capital: PublicCapital; locale: "es" | "en"; alphabetUnion?: number }) {
  const copy = capitalCopy[locale], methodology = trendsMethodologyPath(locale), coverage = capital.coverage;
  const rows = capital.quality === "unavailable" ? [] : capital.views.find(view => view.id === "shared")?.rows ?? [];
  const alphabetRows = rows.filter(row => row.ticker_verified === "GOOGL" || row.ticker_verified === "GOOG");
  const labels = locale === "es"
    ? { expected: "gestores esperados", usable: "filings utilizables", union: "unión por emisor", alphabet: "Un emisor, dos clases de acciones", universe: "Universo de gestores analizados", coverage: "cobertura", universeText: "Selección explícita de grupos declarantes. El 13F muestra una imagen parcial y retrasada de cada cartera.", table: "Ver tabla completa" }
    : { expected: "expected managers", usable: "usable filings", union: "issuer union", alphabet: "One issuer, two share classes", universe: "Universe of managers analysed", coverage: "coverage", universeText: "Explicit selection of reporting groups. 13F shows a partial, delayed picture of each portfolio.", table: "View full table" };
  return <section id="capital" aria-labelledby="capital-title" className={styles.capitalSection}>
    <div className={styles.sectionHeading}><div>
      <h2 id="capital-title">{trendsCopy[locale].capital.title}</h2>
      <p className={styles.capitalPeriod}>{capitalPeriodLabel(capital.quarter_end, locale)}</p>
    </div></div>
    <div className={styles.capitalStatus}>
      {capital.quality !== "validated" && <p>{capital.quality === "partial" ? copy.partial : copy.unavailable}</p>}
      {capital.refresh_failed && <p>{copy.refreshFailed}</p>}
      {capital.freshness === "stale" && <p>{copy.stale}</p>}
      {capital.as_of && <p>{copy.checked}: <time dateTime={capital.as_of}>{new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(capital.as_of))}</time></p>}
    </div>
    <div className={styles.capitalOverview}>
      <div>
        <CapitalOverlapChart rows={rows} locale={locale} />
        {alphabetUnion !== undefined && alphabetRows.length === 2 && <div className={styles.alphabetNote}>
          <p className={styles.alphabetTitle}>Alphabet <span>{labels.alphabet}</span></p>
          <div className={styles.alphabetUnion}>
            <div>{alphabetRows.map(row => <span key={row.security_id}>{row.ticker_verified} <strong>{row.manager_count}</strong></span>)}</div>
            <span aria-hidden="true" className={styles.unionConnector} />
            <p><strong>{alphabetUnion}</strong><span>{copy.managers}<br />{labels.union}</span></p>
          </div>
        </div>}
      </div>
      <aside aria-labelledby="universe-title" className={styles.universe}>
        <h3 id="universe-title">{labels.universe}</h3>
        <dl className={styles.universeNumbers}>
          <div><dd>{capital.universe_size}</dd><dt>{labels.expected}</dt></div>
          <div><dd>{coverage.disclosed_filers ?? "—"}</dd><dt>{coverage.disclosed_filers === null ? copy.unavailable : labels.usable}</dt></div>
          <div><dd>{coverage.percent === null ? "—" : new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(coverage.percent)}{coverage.percent !== null && <small>%</small>}</dd><dt>{labels.coverage}</dt></div>
        </dl>
        <span className="sr-only">{coverage.disclosed_filers === null ? copy.unavailable : `${coverage.disclosed_filers} / ${capital.universe_size}`}</span>
        <p className={styles.universeText}>{labels.universeText}</p>
        <Link href={`${methodology}#positions`} className={styles.textLink}>{copy.criteria} <span aria-hidden="true">→</span></Link>
      </aside>
    </div>
    <p className={styles.positionsNote}>{copy.positionsText}</p>
    <details className={styles.capitalDetails}>
      <summary>{labels.table}<span aria-hidden="true">↓</span></summary>
      <div className={styles.capitalTable}><CapitalDisclosureTable views={capital.views} locale={locale} available={capital.quality !== "unavailable"} /></div>
    </details>
  </section>;
}
