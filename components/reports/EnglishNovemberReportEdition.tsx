import Link from "next/link";
import { ReportEditionRail } from "./ReportEditionRail";
import { EnglishSecondNovemberReportSections } from "./EnglishSecondNovemberReportSections";
import { ReportSourcePolicy } from "./ReportSourcePolicy";
import { formatEditorialDate } from "@/lib/editorial/dates";
import { secondNovember2026EnglishReport as report } from "@/lib/reports/second-november-2026.en";
import styles from "./report-premium.module.css";

export function EnglishNovemberReportEdition() {
  const dates = [
    ["Edition", report.editionAt!],
    ["Web publication", report.publishedAt!],
    ["Editorial cutoff", report.editorialCutoffAt!],
    ["Market cutoff", report.automaticDataCutoffAt!],
  ];
  const exports = [
    { href: report.pdfHref!, label: "PDF (Spanish)", download: true },
    { href: report.htmlHref!, label: "HTML", download: false },
    { href: report.markdownHref!, label: "Markdown", download: true },
    { href: report.calendarHref!, label: "Calendar (.ics)", download: true },
  ];
  return <main className={styles.page}>
    <ReportSourcePolicy>
      <div className={styles.layout}>
        <ReportEditionRail sections={report.editorialSections} monthLabel={report.monthLabel} locale="en" editionLabel="Second edition" />
        <article id={report.id} className={`scroll-mt-24 ${styles.edition}`} data-english-editorial-edition>
          <Link className="inline-flex min-h-10 items-center border-b border-petrol/30 text-sm font-semibold text-petrol transition hover:border-petrol" href="/en/reports">← Back to the report archive</Link>
          <section className={`mt-6 grid gap-6 border-y border-line py-8 md:py-10 ${styles.cover}`}>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase text-petrol">{report.label}</p>
                <span className="border border-brass/40 bg-white/70 px-2 py-1 text-[10px] font-semibold uppercase text-brass">Current report</span>
              </div>
              <h1 className="mt-2 text-3xl font-semibold leading-tight text-ink md:text-5xl"><span>{report.title.slice(0, report.title.indexOf(":") + 1)} </span><em>{report.title.slice(report.title.indexOf(":") + 1).trimStart()}</em></h1>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-muted">
                <p>By <a className="font-semibold text-petrol underline decoration-petrol/30 underline-offset-4" href="https://www.luiguiherrera.com">Luigui Herrera</a></p>
                {dates.map(([label, date]) => <p key={label}>{label}: <time dateTime={date}>{formatEditorialDate(date, "en")}</time></p>)}
              </div>
              <p className="mt-4 text-base leading-7 text-muted">{report.subtitle}</p>
              <div className="mt-4 flex flex-wrap gap-2">{exports.map(link => <a key={link.href} className="inline-flex min-h-9 w-fit items-center justify-center rounded-[4px] border border-line bg-panel px-3 py-2 text-xs font-semibold text-ink transition hover:border-petrol hover:text-petrol" href={link.href} download={link.download || undefined}>{link.label}</a>)}</div>
              <p className="mt-3 text-xs leading-5 text-muted">Approved original PDF in Spanish · {report.approvedPdf!.pages} pages. This edition preserves its historical cutoff dates.</p>
            </div>
          </section>
          <EnglishSecondNovemberReportSections report={report} />
        </article>
      </div>
    </ReportSourcePolicy>
  </main>;
}
