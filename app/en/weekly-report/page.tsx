import { WeeklyReport } from "@/components/reports/WeeklyReport";
import { ReadingCard } from "@/components/seo/ReadingCard";
import { InstitutionalHero } from "@/components/ui/InstitutionalHero";
import { buildWeeklyReportData } from "@/lib/reports/build-weekly-report-data";
import { getRouteMetadata } from "@/lib/seo/site";

export const revalidate = 86400;
export const metadata = getRouteMetadata("/en/weekly-report");

export default async function WeeklyReportPage() {
  const reportData = await buildWeeklyReportData();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-5 md:py-14">
      <InstitutionalHero
        chips={["Market report archive", "Weekly reading"]}
        description="A closing read to organize regime, ETFs, sectors, volatility, flows, levels and seasonality."
        eyebrow="Market report archive"
        note="Educational market-context report. This is not investment advice or a personalized recommendation."
        title="Weekly Report"
        variant="archive"
      />

      <ReadingCard title="Reading card" items={[
        { label: "What it is", value: "A multi-asset market-report archive with editorial readings of indices, gold, Japan, China, crypto, volatility, sectors, flows and economic calendar events." },
        { label: "What it is for", value: "It turns scattered data into context, scenarios and watchpoints for investors." },
        { label: "Main sources", value: "Public market data, the internal dashboard, BTC ETF flows, VIX, sectors, economic calendar data and methodology notes." },
        { label: "Limits", value: "The reports are educational, not personalized, and do not replace financial, tax or legal analysis." },
      ]} />

      <div className="mt-6 md:mt-8">
        <WeeklyReport data={reportData} locale="en" />
      </div>
    </div>
  );
}
