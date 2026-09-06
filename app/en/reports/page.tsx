import Link from "next/link";
import { InstitutionalHero } from "@/components/ui/InstitutionalHero";
import { formatEditorialDate } from "@/lib/editorial/dates";
import { currentEnglishReport, englishReportsNewestFirst, previousEnglishReports } from "@/lib/reports/english-reports";
import { getRouteMetadata } from "@/lib/seo/site";
import { getStatisticalLevelsManifest } from "@/lib/statistical-levels/get-statistical-levels-data";

export const revalidate = 86400;
export const metadata = getRouteMetadata("/en/reports");

export default async function ReportsPage() {
  // Match the current report's data cutoff, without inventing a publication date.
  const { generatedAt: dataThrough } = await getStatisticalLevelsManifest();
  const previousReports = englishReportsNewestFirst(previousEnglishReports);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-5 md:py-14">
      <InstitutionalHero
        eyebrow="Market reports"
        title="Market reports"
        description="A clear view of what changed, what matters, and the context behind the market."
        variant="library"
      />

      <section aria-labelledby="latest-report-title" className="mt-8 grid gap-5 border-t border-petrol/20 py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
        <p className="text-xs font-semibold uppercase tracking-widest text-brass">Latest report</p>
        <article className="min-w-0">
          <h2 id="latest-report-title" className="text-2xl font-semibold leading-tight text-ink md:text-3xl">{currentEnglishReport.title}</h2>
          <p className="mt-3 text-sm text-muted">Data through <time dateTime={dataThrough}>{formatEditorialDate(dataThrough, "en")}</time></p>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">{currentEnglishReport.summary}</p>
          <Link href={currentEnglishReport.href} className="mt-5 inline-flex min-h-12 items-center gap-3 rounded-[4px] border border-petrol bg-petrol px-5 py-3 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-petrol">
            Read latest report <span aria-hidden="true">→</span>
          </Link>
        </article>
      </section>

      {previousReports.length > 0 ? (
        <section aria-labelledby="previous-reports-title" className="grid gap-5 border-t border-line py-8 md:py-10 lg:grid-cols-[0.34fr_1fr]">
          <h2 id="previous-reports-title" className="text-xs font-semibold uppercase tracking-widest text-brass">Previous reports</h2>
          <ol className="divide-y divide-line">
            {previousReports.map((report) => (
              <li key={report.href} className="py-5 first:pt-0">
                <article>
                  <h3 className="text-xl font-semibold leading-tight text-ink">{report.title}</h3>
                  <p className="mt-2 text-sm text-muted"><time dateTime={report.publishedAt}>{formatEditorialDate(report.publishedAt, "en")}</time></p>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{report.summary}</p>
                  <Link href={report.href} className="mt-3 inline-flex min-h-12 items-center gap-3 text-sm font-semibold text-petrol underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-petrol">
                    Read report <span aria-hidden="true">→</span>
                  </Link>
                </article>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </main>
  );
}
