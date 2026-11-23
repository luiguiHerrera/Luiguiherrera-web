import { ReportsArchive, type ArchiveReport } from "@/components/reports/ReportsArchive";
import { currentEnglishReport, englishReportsNewestFirst, previousEnglishReports } from "@/lib/reports/english-reports";
import { getRouteMetadata } from "@/lib/seo/site";
import { secondNovember2026EnglishReport as edition } from "@/lib/reports/second-november-2026.en";

export const metadata = getRouteMetadata("/en/reports");

export default function ReportsPage() {
  const reports: ArchiveReport[] = [
    {
      id: edition.id,
      title: currentEnglishReport.title,
      label: "Current report",
      summary: currentEnglishReport.summary,
      excerpt: currentEnglishReport.summary,
      monthKey: edition.monthKey,
      monthLabel: edition.monthLabel,
      dataThrough: edition.automaticDataCutoffAt,
      editionAt: edition.editionAt,
      publishedAt: edition.publishedAt,
      status: "actual",
      href: currentEnglishReport.href,
      downloads: [],
    },
    ...englishReportsNewestFirst(previousEnglishReports).map(report => ({
      id: report.href.split("/").at(-1)!,
      title: report.title,
      label: "Archived report",
      summary: report.summary,
      excerpt: report.summary,
      monthKey: report.publishedAt.slice(0, 7),
      monthLabel: report.publishedAt.slice(0, 7),
      publishedAt: report.publishedAt,
      status: "archivado" as const,
      href: report.href,
      downloads: [],
    })),
  ];
  return <ReportsArchive reports={reports} locale="en" />;
}
