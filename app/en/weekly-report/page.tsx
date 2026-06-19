import { WeeklyReport } from "@/components/reports/WeeklyReport";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { buildWeeklyReportData } from "@/lib/reports/build-weekly-report-data";

export const revalidate = 86400;

export default async function WeeklyReportPage() {
  const reportData = await buildWeeklyReportData();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-5 md:py-14">
      <div className="grid gap-5 md:gap-8 lg:grid-cols-[1fr_0.76fr] lg:items-end">
        <SectionHeader
          eyebrow="Weekly read"
          title="Weekly Report"
          subtitle="A closing read to organize regime, ETFs, sectors, volatility, flows, levels and seasonality."
        />
        <DisclaimerBox>
          Educational market-context report. This is not investment advice or a personalized recommendation.
        </DisclaimerBox>
      </div>

      <div className="mt-6 md:mt-8">
        <WeeklyReport data={reportData} locale="en" />
      </div>
    </div>
  );
}
