import Link from "next/link";
import { InstitutionalHero } from "@/components/ui/InstitutionalHero";
import { getReportsByMonth, reportDisplayName, reportHref } from "@/lib/reports/market-reports";
import type { MarketReport } from "@/lib/reports/market-reports";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/informes");

const currentMonthKey = "2026-07";
const previousMonthKey = "2026-06";
const previousMonthLabel = "Junio 2026";

export default function InformesPage() {
  const currentMonthReports = prioritizeReports(getReportsByMonth(currentMonthKey));
  const previousMonthReports = prioritizeReports(getReportsByMonth(previousMonthKey));

  return (
    <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-8 md:px-5 md:py-14">
      <InstitutionalHero
        chips={["Archivo público", "Julio 2026"]}
        description="Informes públicos de mercado para revisar contexto, escenarios y señales de seguimiento por activo."
        eyebrow="Archivo de informes"
        note="Documento educativo e informativo. No constituye asesoría financiera personalizada."
        title="Lecturas cargadas"
        variant="archive"
      />

      <section className="mt-8 grid gap-6 border-t border-petrol/20 pt-8 md:pt-10 lg:grid-cols-[0.34fr_1fr]">
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
        <article
          id={report.id}
          key={report.id}
          className={`estate-card scroll-mt-24 border p-5 ${
            report.status === "actual" ? "border-petrol/40" : "border-line"
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase text-petrol">{reportDisplayName(report)}</p>
            <span className={`border px-2 py-1 text-[10px] font-semibold uppercase ${
              report.status === "actual"
                ? "border-petrol/35 bg-petrol text-white"
                : "border-brass/40 bg-white/70 text-brass"
            }`}>
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
