import { WeeklyReport } from "@/components/reports/WeeklyReport";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ReadingCard } from "@/components/seo/ReadingCard";
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
