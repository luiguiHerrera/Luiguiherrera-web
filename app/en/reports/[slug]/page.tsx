import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EnglishArchiveReportEdition } from "@/components/reports/EnglishArchiveReportEdition";
import { englishArchiveReports, getEnglishArchiveMarkdown, getEnglishArchiveReport, parseEnglishArchive } from "@/lib/reports/english-archive";
import { currentEnglishReport } from "@/lib/reports/english-reports";
import { SITE_URL } from "@/lib/seo/site";

export const dynamicParams = false;
export function generateStaticParams() { return englishArchiveReports.map(report => ({ slug: report.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const report = getEnglishArchiveReport(slug);
  if (!report) notFound();
  return {
    title: report.title + " | Luigui Herrera",
    description: report.subtitle,
    alternates: { canonical: SITE_URL + report.href, languages: { en: SITE_URL + report.href, es: SITE_URL + report.spanishHref } },
    openGraph: { type: "article", locale: "en_US", url: SITE_URL + report.href, title: report.title, description: report.subtitle, publishedTime: report.publishedAt, modifiedTime: report.modifiedAt },
  };
}

export default async function EnglishArchivedReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const report = getEnglishArchiveReport(slug);
  if (!report) notFound();
  const index = englishArchiveReports.findIndex(item => item.slug === slug);
  const chapters = parseEnglishArchive(await getEnglishArchiveMarkdown(report));
  return <EnglishArchiveReportEdition report={report} chapters={chapters} previous={englishArchiveReports[index - 1]} next={englishArchiveReports[index + 1] ?? currentEnglishReport} />;
}
