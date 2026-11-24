import Link from "next/link";
import { ReportEditionRail } from "./ReportEditionRail";
import { WeeklyReport } from "./WeeklyReport";
import { formatEditorialDate } from "@/lib/editorial/dates";
import type { WeeklyReportData } from "@/lib/reports/build-weekly-report-data";
import styles from "./report-premium.module.css";
import weeklyStyles from "./weekly-report-editorial.module.css";

const sections = [
  ["closing", "Closing read"],
  ["executive", "Executive summary"],
  ["etfs", "The 4 ETFs"],
  ["sectors", "Sectors"],
  ["volatility", "Volatility"],
  ["flows", "Flows"],
  ["levels", "Statistical levels"],
  ["seasonality", "Seasonality"],
  ["radar", "Cross-readings"],
  ["final", "Final read"],
].map(([id, eyebrow]) => ({ id: "weekly-" + id, eyebrow }));

export function WeeklyReportEdition({ data }: { data: WeeklyReportData }) {
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(data.dataThrough + "T00:00:00Z"));
  return <main className={styles.page}>
    <div className={styles.layout}>
      <ReportEditionRail sections={sections} monthLabel={monthLabel} locale="en" editionLabel="Weekly reading" />
      <article className={styles.edition} data-weekly-report-edition>
        <Link href="/en/reports" className="inline-flex min-h-10 items-center border-b border-petrol/30 text-sm font-semibold text-petrol">← Back to reports</Link>
        <section className={styles.cover}>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase text-petrol">Market report archive · Weekly reading</p>
              <span className="border border-brass/40 bg-white/70 px-2 py-1 text-[10px] font-semibold uppercase text-brass">Live content</span>
            </div>
            <h1><span>Weekly market report:</span><em>context, risk and signals to follow</em></h1>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-muted">
              <p>By <Link className="font-semibold text-petrol" href="/en">Luigui Herrera</Link></p>
              <p>Data through: <time dateTime={data.dataThrough}>{formatEditorialDate(data.dataThrough, "en")}</time></p>
              <p>Generated: <time dateTime={data.generatedAt}>{formatEditorialDate(data.generatedAt.slice(0, 10), "en")}</time></p>
            </div>
            <p className="mt-4 text-base leading-7 text-muted">A closing read to organize regime, ETFs, sectors, volatility, flows, levels and seasonality.</p>
          </div>
        </section>
        <WeeklyReport data={data} locale="en" presentation="editorial" />
        <details className={weeklyStyles.about}>
          <summary>About this report</summary>
          <div>
            <dl><dt>What it is</dt><dd>A multi-asset market-report archive with editorial readings of indices, gold, Japan, China, crypto, volatility, sectors, flows and economic calendar events.</dd></dl>
            <dl><dt>What it is for</dt><dd>It turns scattered data into context, scenarios and watchpoints for investors.</dd></dl>
            <dl><dt>Main sources</dt><dd>Public market data, the internal dashboard, BTC ETF flows, VIX, sectors, economic calendar data and methodology notes.</dd></dl>
            <dl><dt>Limits</dt><dd>The reports are educational, not personalized, and do not replace financial, tax or legal analysis.</dd></dl>
          </div>
        </details>
        <p className={weeklyStyles.notice}>Educational market-context report. This is not investment advice or a personalized recommendation.</p>
      </article>
    </div>
  </main>;
}
