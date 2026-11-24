"use client";

import Link from "next/link";
import { useState } from "react";
import { formatEditorialDate } from "@/lib/editorial/dates";
import styles from "./reports-archive.module.css";

type Locale = "es" | "en";

export type ArchiveReport = {
  id: string;
  title: string;
  label: string;
  summary: string;
  excerpt: string;
  monthKey: string;
  monthLabel: string;
  editionAt?: string;
  dataThrough?: string;
  publishedAt: string | null;
  status: "actual" | "archivado" | "borrador";
  href: string;
  downloads: Array<{ label: string; href: string }>;
};

const dateOf = (report: ArchiveReport) => report.editionAt ?? report.publishedAt ?? report.dataThrough ?? `${report.monthKey}-01`;
const monthName = (key: string, locale: Locale) => {
  const name = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", { month: "long", timeZone: "UTC" }).format(new Date(`${key}-01T00:00:00Z`));
  return name.charAt(0).toUpperCase() + name.slice(1);
};

function ReportDate({ report, locale, className }: { report: ArchiveReport; locale: Locale; className?: string }) {
  const date = report.editionAt ?? report.publishedAt ?? report.dataThrough;
  const label = report.editionAt ? (locale === "es" ? "Edición del " : "Edition of ") : report.publishedAt ? (locale === "es" ? "Publicado el " : "Published on ") : (locale === "es" ? "Datos hasta el " : "Data through ");
  return <p className={className}>{date ? <>{label}<time dateTime={date}>{formatEditorialDate(date, locale)}</time></> : (locale === "es" ? "Pendiente de publicación" : "Pending publication")}</p>;
}

function ReportCard({ report, locale }: { report: ArchiveReport; locale: Locale }) {
  const isEnglish = locale === "en";
  return <article id={report.id} className={styles.card} data-archive-report={report.id}>
    <div className={styles.cardMeta}>
      <p>{report.label}</p>
      <span>{!report.publishedAt && !report.dataThrough ? (isEnglish ? "Pending" : "Pendiente") : report.status === "actual" ? (isEnglish ? "Current" : "Actual") : (isEnglish ? "Archived" : "Archivado")}</span>
    </div>
    <h3><Link href={report.href}>{report.title}</Link></h3>
    <ReportDate report={report} locale={locale} className={styles.cardDate} />
    {report.editionAt && report.publishedAt ? <p className={styles.webDate}>{locale === "en" ? "Web publication: " : "Publicación web: "}<time dateTime={report.publishedAt}>{formatEditorialDate(report.publishedAt, locale)}</time></p> : null}
    <p className={styles.cardDescription}>{report.summary}</p>
    <div className={styles.cardFooter}>
      <Link className={styles.readLink} href={report.href}>{locale === "en" ? "Read report" : "Abrir informe"} <span aria-hidden="true">→</span></Link>
      {report.downloads.length ? <nav className={styles.downloads} aria-label={(isEnglish ? "Downloads for " : "Descargas de ") + report.label}>
        <span className={styles.srOnly}>{isEnglish ? "Downloads available" : "Descargas disponibles"}</span>
        {report.downloads.map(format => <a key={format.label} href={format.href} download={format.label === "HTML" ? undefined : true}>{format.label}</a>)}
      </nav> : null}
    </div>
  </article>;
}

export function ReportsArchive({ reports, locale = "es" }: { reports: ArchiveReport[]; locale?: Locale }) {
  const isEnglish = locale === "en";
  const ordered = [...reports].sort((a, b) => dateOf(b).localeCompare(dateOf(a)) || b.id.localeCompare(a.id));
  const latest = ordered.find(report => (report.publishedAt || report.dataThrough) && report.status !== "borrador");
  const years = [...new Set(ordered.map(report => report.monthKey.slice(0, 4)))].sort().reverse();
  const [year, setYear] = useState(latest?.monthKey.slice(0, 4) ?? years[0] ?? "");
  const [month, setMonth] = useState("all");
  const months = [...new Set(ordered.filter(report => report.monthKey.startsWith(`${year}-`)).map(report => report.monthKey))].sort().reverse();
  const visible = ordered.filter(report => report.monthKey.startsWith(`${year}-`) && (month === "all" || report.monthKey === month));
  const groups = [...new Set(visible.map(report => report.monthKey))];
  const pdf = latest?.downloads.find(format => format.label === "PDF");

  return <main className={styles.page}>
    <header className={styles.hero}>
      <div className={styles.heroCopy}>
        <h1>{isEnglish ? "Reports" : "Análisis y perspectivas"}</h1>
        <p className={styles.description}>{isEnglish ? "My observations on market context, scenarios and the signals I follow to evaluate the assets I consider relevant." : "Mis observaciones sobre el contexto del mercado, los escenarios y las señales de seguimiento que sigo para evaluar los activos que considero relevantes."}</p>
        <div className={styles.filters} aria-label={isEnglish ? "Browse reports by period" : "Consultar informes por periodo"}>
          <label htmlFor="archive-year">{isEnglish ? "Year" : "Año"}<select id="archive-year" value={year} onChange={event => { setYear(event.target.value); setMonth("all"); }}>{years.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label htmlFor="archive-month">{isEnglish ? "Month" : "Mes"}<select id="archive-month" value={month} onChange={event => setMonth(event.target.value)}><option value="all">{isEnglish ? "All months" : "Todos los meses"}</option>{months.map(key => <option key={key} value={key}>{monthName(key, locale)}</option>)}</select></label>
        </div>
      </div>
    </header>

    {latest ? <section className={styles.featured} aria-labelledby="latest-report-title" data-featured-report={latest.id}>
      <div className={styles.featuredCopy}>
        <p className={styles.featuredEyebrow}>{isEnglish ? "Latest report" : "Último informe"}</p>
        <h2 id="latest-report-title"><Link href={latest.href}>{latest.title}</Link></h2>
        <p className={styles.featuredDescription}>{latest.excerpt}</p>
      </div>
      <div className={styles.featuredAside}>
        <div><ReportDate report={latest} locale={locale} /><p className={styles.featuredEdition}>{latest.label}</p>{latest.editionAt && latest.publishedAt ? <p className={styles.featuredWebDate}>{locale === "en" ? "Web publication: " : "Publicación web: "}<time dateTime={latest.publishedAt}>{formatEditorialDate(latest.publishedAt, locale)}</time></p> : null}</div>
        <div className={styles.featuredActions}><Link href={latest.href}>{locale === "en" ? "Read report" : "Abrir informe"} <span aria-hidden="true">→</span></Link>{pdf ? <a href={pdf.href} download>{isEnglish ? "Download PDF" : "Descargar PDF"} <span aria-hidden="true">↓</span></a> : null}</div>
      </div>
    </section> : null}

    <div className={styles.archive}>
      <p role="status" aria-live="polite" className={styles.srOnly}>{visible.length} {isEnglish ? (visible.length === 1 ? "report available" : "reports available") : (visible.length === 1 ? "informe disponible" : "informes disponibles")} {isEnglish ? "for" : "para"} {month === "all" ? year : `${monthName(month, locale)}${isEnglish ? " " : " de "}${year}`}</p>
      {groups.map(key => <section key={key} className={styles.month} aria-labelledby={`archive-${key}`} data-archive-month={key}>
        <div className={styles.monthHeading}><h2 id={`archive-${key}`}>{monthName(key, locale)}{isEnglish ? " " : " de "}{key.slice(0, 4)}</h2><span aria-hidden="true" /></div>
        <div className={styles.cards}>{visible.filter(report => report.monthKey === key).map(report => <ReportCard key={report.id} report={report} locale={locale} />)}</div>
      </section>)}
      {!visible.length ? <p className={styles.empty}>{isEnglish ? "No reports are available for the selected period." : "No hay informes cargados del periodo seleccionado."}</p> : null}
    </div>
    <p className={styles.disclaimer}>{isEnglish ? "Educational and informational content. This is not personalized financial advice." : "Documento educativo e informativo. No constituye asesoría financiera personalizada."}</p>
  </main>;
}
