import catalogue from "./english-archive-catalogue.json" with { type: "json" };
import { secondNovember2026EnglishReport as report } from "./second-november-2026.en.ts";

export type EnglishReportEntry = {
  href: `/en/${string}`;
  title: string;
  publishedAt: string;
  summary: string;
};

export const currentEnglishReport = {
  href: "/en/weekly-report",
  title: report.title,
  summary: report.summary,
} as const;

export const previousEnglishReports: readonly EnglishReportEntry[] = catalogue.map(edition => ({
  href: edition.href as `/en/${string}`,
  title: edition.title,
  publishedAt: edition.publishedAt,
  summary: edition.subtitle,
}));

export function englishReportsNewestFirst(reports: readonly EnglishReportEntry[]) {
  return [...reports].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
