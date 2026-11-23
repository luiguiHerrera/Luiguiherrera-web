"use client";

import Link from "next/link";
import { useState } from "react";
import { formatEditorialDate } from "@/lib/editorial/dates";
import styles from "./reports-archive.module.css";

export type ArchiveReport = {
  id: string;
  title: string;
  label: string;
  summary: string;
  excerpt: string;
  monthKey: string;
  monthLabel: string;
  editionAt?: string;
  publishedAt: string | null;
  status: "actual" | "archivado" | "borrador";
  href: string;
  downloads: Array<{ label: string; href: string }>;
};

const dateOf = (report: ArchiveReport) => report.editionAt ?? report.publishedAt ?? `${report.monthKey}-01`;
const monthName = (key: string) => {
  const name = new Intl.DateTimeFormat("es-ES", { month: "long", timeZone: "UTC" }).format(new Date(`${key}-01T00:00:00Z`));
  return name.charAt(0).toUpperCase() + name.slice(1);
};

function ReportDate({ report, className }: { report: ArchiveReport; className?: string }) {
  const date = report.editionAt ?? report.publishedAt;
  return <p className={className}>{date ? <>{report.editionAt ? "Edición del " : "Publicado el "}<time dateTime={date}>{formatEditorialDate(date, "es")}</time></> : "Pendiente de publicación"}</p>;
}

function ReportCard({ report }: { report: ArchiveReport }) {
  return <article id={report.id} className={styles.card} data-archive-report={report.id}>
    <div className={styles.cardMeta}>
      <p>{report.label}</p>
      <span>{!report.publishedAt ? "Pendiente" : report.status === "actual" ? "Actual" : "Archivado"}</span>
    </div>
    <h3><Link href={report.href}>{report.title}</Link></h3>
    <ReportDate report={report} className={styles.cardDate} />
    {report.editionAt && report.publishedAt ? <p className={styles.webDate}>Publicación web: <time dateTime={report.publishedAt}>{formatEditorialDate(report.publishedAt, "es")}</time></p> : null}
    <p className={styles.cardDescription}>{report.summary}</p>
    <div className={styles.cardFooter}>
      <Link className={styles.readLink} href={report.href}>Abrir informe <span aria-hidden="true">→</span></Link>
      {report.downloads.length ? <nav className={styles.downloads} aria-label={`Descargas de ${report.label}`}>
        <span className={styles.srOnly}>Descargas disponibles</span>
        {report.downloads.map(format => <a key={format.label} href={format.href} download={format.label === "HTML" ? undefined : true}>{format.label}</a>)}
      </nav> : null}
    </div>
  </article>;
}

export function ReportsArchive({ reports }: { reports: ArchiveReport[] }) {
  const ordered = [...reports].sort((a, b) => dateOf(b).localeCompare(dateOf(a)) || b.id.localeCompare(a.id));
  const latest = ordered.find(report => report.publishedAt && report.status !== "borrador");
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
        <h1>Análisis y perspectivas</h1>
        <p className={styles.description}>Mis observaciones sobre el contexto del mercado, los escenarios y las señales de seguimiento que sigo para evaluar los activos que considero relevantes.</p>
        <div className={styles.filters} aria-label="Consultar informes por periodo">
          <label htmlFor="archive-year">Año<select id="archive-year" value={year} onChange={event => { setYear(event.target.value); setMonth("all"); }}>{years.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label htmlFor="archive-month">Mes<select id="archive-month" value={month} onChange={event => setMonth(event.target.value)}><option value="all">Todos los meses</option>{months.map(key => <option key={key} value={key}>{monthName(key)}</option>)}</select></label>
        </div>
      </div>
    </header>

    {latest ? <section className={styles.featured} aria-labelledby="latest-report-title" data-featured-report={latest.id}>
      <div className={styles.featuredCopy}>
        <p className={styles.featuredEyebrow}>Último informe</p>
        <h2 id="latest-report-title"><Link href={latest.href}>{latest.title}</Link></h2>
        <p className={styles.featuredDescription}>{latest.excerpt}</p>
      </div>
      <div className={styles.featuredAside}>
        <div><ReportDate report={latest} /><p className={styles.featuredEdition}>{latest.label}</p>{latest.editionAt && latest.publishedAt ? <p className={styles.featuredWebDate}>Publicación web: <time dateTime={latest.publishedAt}>{formatEditorialDate(latest.publishedAt, "es")}</time></p> : null}</div>
        <div className={styles.featuredActions}><Link href={latest.href}>Abrir informe <span aria-hidden="true">→</span></Link>{pdf ? <a href={pdf.href} download>Descargar PDF <span aria-hidden="true">↓</span></a> : null}</div>
      </div>
    </section> : null}

    <div className={styles.archive}>
      <p role="status" aria-live="polite" className={styles.srOnly}>{visible.length} {visible.length === 1 ? "informe disponible" : "informes disponibles"} para {month === "all" ? year : `${monthName(month)} de ${year}`}</p>
      {groups.map(key => <section key={key} className={styles.month} aria-labelledby={`archive-${key}`} data-archive-month={key}>
        <div className={styles.monthHeading}><h2 id={`archive-${key}`}>{monthName(key)} de {key.slice(0, 4)}</h2><span aria-hidden="true" /></div>
        <div className={styles.cards}>{visible.filter(report => report.monthKey === key).map(report => <ReportCard key={report.id} report={report} />)}</div>
      </section>)}
      {!visible.length ? <p className={styles.empty}>No hay informes cargados del periodo seleccionado.</p> : null}
    </div>
    <p className={styles.disclaimer}>Documento educativo e informativo. No constituye asesoría financiera personalizada.</p>
  </main>;
}
