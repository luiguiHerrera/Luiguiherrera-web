export type EnglishReportEntry = {
  href: `/en/${string}`;
  title: string;
  publishedAt: string;
  summary: string;
};

export const currentEnglishReport = {
  href: "/en/weekly-report",
  title: "Weekly market report",
  summary: "Market regime, ETFs, sectors, volatility and flows, with context, scenarios and watchpoints.",
} as const;

// The existing editorial archive is Spanish-only. Add an entry here only when
// its English detail page exists; never translate a title and link to Spanish.
export const previousEnglishReports: readonly EnglishReportEntry[] = [];

export function englishReportsNewestFirst(reports: readonly EnglishReportEntry[]) {
  return [...reports].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
