import type { Metadata } from "next";
import Link from "next/link";
import { getReportsByMonth, reportDisplayName, reportHref } from "@/lib/reports/market-reports";
import type { MarketReport } from "@/lib/reports/market-reports";

export const metadata: Metadata = {
  title: "Archivo de informes | Luigui Herrera",
  description: "Archivo de informes de mercado multi-activo con lecturas editoriales por mes.",
  alternates: {
    canonical: "/informes",
  },
  openGraph: {
    title: "Archivo de informes | Luigui Herrera",
    description: "Lecturas de mercado cargadas por mes, con informes actuales y archivados.",
    url: "/informes",
    type: "website",
  },
};

const currentMonthKey = "2026-07";
const previousMonthKey = "2026-06";
const previousMonthLabel = "Junio 2026";

export default function InformesPage() {
  const currentMonthReports = prioritizeReports(getReportsByMonth(currentMonthKey));
  const previousMonthReports = prioritizeReports(getReportsByMonth(previousMonthKey));

  return (
    <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-8 md:px-5 md:py-14">
      <section className="border-b border-line pb-8">
        <p className="text-xs font-semibold uppercase text-petrol">Archivo de informes</p>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.04] text-ink md:text-6xl">
          Lecturas cargadas
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-muted md:text-lg">
          Informes públicos de mercado para revisar contexto, escenarios y señales de seguimiento por activo.
        </p>
        <p className="mt-4 max-w-2xl border-l border-brass/50 pl-4 text-sm leading-6 text-muted">
          Documento educativo e informativo. No constituye asesoría financiera personalizada.
        </p>
      </section>

      <section className="grid gap-6 py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase text-petrol">Mes vigente</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-3xl">Julio 2026</h2>
        </div>
        <ReportGrid reports={currentMonthReports} />
      </section>

      <section className="grid gap-6 border-t border-line py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase text-petrol">Mes anterior</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink md:text-3xl">{previousMonthLabel}</h2>
        </div>
        <ReportGrid reports={previousMonthReports} emptyLabel="No hay informes cargados del mes anterior." />
      </section>
    </main>
  );
}

function prioritizeReports(reports: MarketReport[]) {
  return [...reports].sort((a, b) => {
    if (a.status === "actual" && b.status !== "actual") return -1;
    if (b.status === "actual" && a.status !== "actual") return 1;
    return reportDisplayName(a).localeCompare(reportDisplayName(b), "es");
  });
}

function ReportGrid({
  emptyLabel = "No hay informes cargados.",
  reports,
}: {
  emptyLabel?: string;
  reports: MarketReport[];
}) {
  if (!reports.length) {
    return (
      <p className="border border-line bg-panel px-4 py-3 text-sm leading-6 text-muted">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {reports.map((report) => (
        <article id={report.id} key={report.id} className="scroll-mt-24 border border-line bg-panel p-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase text-petrol">{reportDisplayName(report)}</p>
            <span className="border border-brass/40 bg-white/70 px-2 py-1 text-[10px] font-semibold uppercase text-brass">
              {report.status === "actual" ? "Actual" : "Archivado"}
            </span>
          </div>
          <h3 className="mt-3 text-xl font-semibold leading-tight text-ink">{report.title}</h3>
          <p className="mt-2 text-xs font-semibold uppercase text-muted">
            {report.publishedLabel ?? report.dateLabel}
          </p>
          <p className="mt-4 text-sm leading-6 text-muted">{report.summary}</p>
          {report.pdfHref && report.htmlHref && report.markdownHref ? (
            <p className="mt-3 text-xs font-semibold uppercase text-brass">Descargas disponibles</p>
          ) : null}
          <Link
            className="mt-5 inline-flex min-h-10 items-center justify-center rounded-[4px] border border-petrol bg-petrol px-4 py-2 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol"
            href={reportHref(report)}
          >
            Abrir informe
          </Link>
        </article>
      ))}
    </div>
  );
}
