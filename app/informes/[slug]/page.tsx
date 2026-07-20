import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { MarketReportContent } from "@/components/reports/MarketReportContent";
import { buildWeeklyReportData } from "@/lib/reports/build-weekly-report-data";
import {
  activeMarketReport,
  getAdjacentReports,
  getMarketReportBySlug,
  marketReports,
  reportDisplayName,
  reportHref,
} from "@/lib/reports/market-reports";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildWebPageJsonLd } from "@/lib/seo/structured-data";
import { absoluteUrl } from "@/lib/seo/site";

type ReportPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return marketReports.map((report) => ({ slug: report.id }));
}

export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const { slug } = await params;
  const report = getMarketReportBySlug(slug);
  if (!report) return {};
  const canonical = reportHref(report);

  return {
    title: `${reportDisplayName(report)} | ${report.title}`,
    description: report.summary,
    alternates: {
      canonical,
    },
    openGraph: {
      title: report.title,
      description: report.summary,
      url: canonical,
      type: "article",
    },
  };
}

export default async function MarketReportPage({ params }: ReportPageProps) {
  const { slug } = await params;
  const report = getMarketReportBySlug(slug);
  if (!report) notFound();

  const { nextReport, previousReport } = getAdjacentReports(report.id);
  const automaticData = report.id === activeMarketReport.id ? await buildWeeklyReportData() : null;
  const pathname = reportHref(report);

  return (
    <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-8 md:px-5 md:py-14">
      <JsonLd
        data={[
          buildWebPageJsonLd({
            pathname,
            name: reportDisplayName(report),
            description: report.summary,
            language: "es",
          }),
          buildBreadcrumbJsonLd("es", [
            { name: "Inicio", pathname: "/" },
            { name: "Informes", pathname: "/informes" },
            { name: reportDisplayName(report), pathname },
          ]),
          buildArticleJsonLd({
            pathname,
            name: report.title,
            description: report.summary,
            language: "es",
          }, "Article", {
            headline: report.title,
            description: report.summary,
            url: absoluteUrl(pathname),
            about: report.executiveSummary.map((item) => item.title),
          }),
        ]}
      />
      <MarketReportContent
        automaticData={automaticData}
        nextReport={nextReport}
        previousReport={previousReport}
        report={report}
      />
    </main>
  );
}
