export type EnglishReportEntry = {
  href: `/en/${string}`;
  title: string;
  publishedAt: string;
  summary: string;
};

import { secondNovember2026EnglishReport as report } from "./second-november-2026.en.ts";

export const currentEnglishReport = {
  href: "/en/weekly-report",
  title: report.title,
  summary: report.summary,
} as const;

// The existing editorial archive is Spanish-only. Add an entry here only when
// its English detail page exists; never translate a title and link to Spanish.
export const previousEnglishReports: readonly EnglishReportEntry[] = [];

export function englishReportsNewestFirst(reports: readonly EnglishReportEntry[]) {
  return [...reports].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
