import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { MarketReportContent } from "@/components/reports/MarketReportContent";
import {
  getAdjacentReports,
  getMarketReportBySlug,
  marketReports,
  reportDisplayName,
  reportHref,
  reportMetadataTitle,
} from "@/lib/reports/market-reports";
import { getHistoricalAutomaticReadings } from "@/lib/reports/historical-automatic-readings";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildWebPageJsonLd } from "@/lib/seo/structured-data";
import { absoluteUrl, buildSeoMetadata } from "@/lib/seo/site";

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

  return buildSeoMetadata({
    pathname: canonical,
    language: "es",
    title: reportMetadataTitle(report),
    description: report.summary,
    socialTitle: report.title,
    type: "article",
  });
}

export default async function MarketReportPage({ params }: ReportPageProps) {
  const { slug } = await params;
  const report = getMarketReportBySlug(slug);
  if (!report) notFound();

  const { nextReport, previousReport } = getAdjacentReports(report.id);
  const automaticReadings = getHistoricalAutomaticReadings(report.id);
  const pathname = reportHref(report);
  const canonical = absoluteUrl(pathname);

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
            url: canonical,
            datePublished: report.publishedAt,
            dateModified: report.modifiedAt,
            mainEntityOfPage: canonical,
            about: (report.executiveSummary ?? report.assetReadings).map((item) =>
              "title" in item ? item.title : item.asset,
            ),
          }),
        ]}
      />
      <MarketReportContent
        automaticReadings={automaticReadings}
        nextReport={nextReport}
        previousReport={previousReport}
        report={report}
      />
    </main>
  );
}
