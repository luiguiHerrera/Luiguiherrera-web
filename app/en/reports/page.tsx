import { ReportsArchive, type ArchiveReport } from "@/components/reports/ReportsArchive";
import { currentEnglishReport, englishReportsNewestFirst, previousEnglishReports } from "@/lib/reports/english-reports";
import { getRouteMetadata } from "@/lib/seo/site";
import { getStatisticalLevelsManifest } from "@/lib/statistical-levels/get-statistical-levels-data";

export const revalidate = 86400;
export const metadata = getRouteMetadata("/en/reports");

export default async function ReportsPage() {
  const { generatedAt: dataThrough } = await getStatisticalLevelsManifest();
  const monthKey = dataThrough.slice(0, 7);
  const reports: ArchiveReport[] = [
    {
      id: "weekly-market-report",
      title: currentEnglishReport.title,
      label: "Current report",
      summary: currentEnglishReport.summary,
      excerpt: currentEnglishReport.summary,
      monthKey,
      monthLabel: monthKey,
      dataThrough,
      publishedAt: null,
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
