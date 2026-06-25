import Link from "next/link";
import { Sp500StatLevelsPreview } from "@/components/market/Sp500StatLevelsPreview";
import { getSp500StatLevelsPreviewData } from "@/lib/market/sp500-stat-levels-preview";

const marketTools = [
  {
    title: "Market Regime Dashboard",
    href: "/en/dashboard",
    description: "Volatility, rotation, flows and VIX curve in one structured read.",
    meta: "Regime",
  },
  {
    title: "Statistical Levels",
    href: "/en/statistical-levels",
    description: "Percentiles, extensions, moving averages and seasonality to place price in context.",
    meta: "Lab",
  },
  {
    title: "Weekly Report",
    href: "/en/weekly-report",
    description: "An editorial close with what helped, what weighed and what to watch.",
    meta: "Report",
  },
];

export default async function EnglishMarketPage() {
  const sp500Preview = await getSp500StatLevelsPreviewData();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-14">
      <section className="border-b border-line pb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">Market context</p>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">Market</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
          Regime, levels, seasonality and weekly reports to understand the terrain before acting.
        </p>
      </section>

      <Sp500StatLevelsPreview data={sp500Preview} locale="en" />

      <section className="mt-8 grid gap-5 lg:grid-cols-3">
        {marketTools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="group flex min-h-[15rem] flex-col rounded-[6px] border border-line bg-white/75 p-5 shadow-[0_12px_32px_rgba(11,52,54,0.045)] transition hover:border-petrol hover:bg-white">
            <div className="flex items-start justify-between gap-4">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{tool.meta}</span>
              <span className="text-sm font-semibold text-petrol transition group-hover:translate-x-1">Open</span>
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-ink">{tool.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{tool.description}</p>
            <span className="mt-auto pt-6 text-sm font-semibold text-petrol">Enter &rarr;</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
