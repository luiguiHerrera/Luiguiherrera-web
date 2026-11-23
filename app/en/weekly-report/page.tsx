import { WeeklyReportEdition } from "@/components/reports/WeeklyReportEdition";
import { buildWeeklyReportData } from "@/lib/reports/build-weekly-report-data";
import { getRouteMetadata } from "@/lib/seo/site";

export const revalidate = 86400;
export const metadata = getRouteMetadata("/en/weekly-report");

export default async function WeeklyReportPage() {
  const reportData = await buildWeeklyReportData();
  return <WeeklyReportEdition data={reportData} />;
}
