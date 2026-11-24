const archivedSpanishPaths: Readonly<Record<string, string>> = {
  "/en/reports/first-july-2026": "/informes/primer-informe-julio-2026",
  "/en/reports/second-july-2026": "/informes/segundo-informe-julio-2026",
  "/en/reports/first-august-2026": "/informes/primer-informe-agosto-2026",
  "/en/reports/second-august-2026": "/informes/segundo-informe-agosto-2026",
  "/en/reports/first-september-2026": "/informes/primer-informe-septiembre-2026",
  "/en/reports/second-september-2026": "/informes/segundo-informe-septiembre-2026",
  "/en/reports/first-october-2026": "/informes/primer-informe-octubre-2026",
  "/en/reports/second-october-2026": "/informes/segundo-informe-octubre-2026",
  "/en/reports/first-november-2026": "/informes/primer-informe-noviembre-2026"
};

export function archivedReportSpanishPath(pathname: string) {
  return archivedSpanishPaths[pathname] ?? null;
}

export function englishReportPath(pathname: string) {
  if (pathname === "/informes/segundo-informe-noviembre-2026") return "/en/weekly-report";
  return Object.entries(archivedSpanishPaths).find(([, spanishPath]) => spanishPath === pathname)?.[0] ?? null;
}
