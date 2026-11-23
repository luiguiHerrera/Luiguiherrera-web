import { EnglishNovemberReportEdition } from "@/components/reports/EnglishNovemberReportEdition";
import { secondNovember2026EnglishReport as report } from "@/lib/reports/second-november-2026.en";
import { getRouteMetadata, SITE_URL } from "@/lib/seo/site";

const routeMetadata = getRouteMetadata("/en/weekly-report");
export const metadata = {
  ...routeMetadata,
  title: `${report.title} | Luigui Herrera`,
  description: report.summary,
  alternates: {
    canonical: `${SITE_URL}/en/weekly-report`,
    languages: {
      en: `${SITE_URL}/en/weekly-report`,
      es: `${SITE_URL}/informes/segundo-informe-noviembre-2026`,
    },
  },
  openGraph: { ...routeMetadata.openGraph, title: report.title, description: report.summary },
  twitter: { ...routeMetadata.twitter, title: report.title, description: report.summary },
};

export default function WeeklyReportPage() {
  return <EnglishNovemberReportEdition />;
}
