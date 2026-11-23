import { ReportsArchive, type ArchiveReport } from "@/components/reports/ReportsArchive";
import { currentEnglishReport } from "@/lib/reports/english-reports";
import catalogue from "@/lib/reports/english-archive-catalogue.json";
import { secondNovember2026EnglishReport as edition } from "@/lib/reports/second-november-2026.en";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/reports");

export default function ReportsPage() {
  const reports: ArchiveReport[] = [
    {
      id: edition.id, title: currentEnglishReport.title, label: "Second report of November 2026",
      summary: currentEnglishReport.summary, excerpt: currentEnglishReport.summary,
      monthKey: edition.monthKey, monthLabel: edition.monthLabel,
      dataThrough: edition.automaticDataCutoffAt, editionAt: edition.editionAt,
      publishedAt: edition.publishedAt, status: "actual", href: currentEnglishReport.href, downloads: [],
    },
    ...catalogue.map(report => ({
      id: report.id, title: report.title, label: report.label,
      summary: report.subtitle, excerpt: report.subtitle,
      monthKey: report.monthKey, monthLabel: report.monthLabel,
      publishedAt: report.publishedAt, dataThrough: report.marketCutoffAt ?? undefined,
      status: "archivado" as const, href: report.href,
      downloads: [
        ...(report.pdfHref ? [{ label: "PDF (Spanish)", href: report.pdfHref }] : []),
        { label: "Markdown (English)", href: report.markdownHref },
      ],
    })),
  ];
  return <ReportsArchive reports={reports} locale="en" />;
}
