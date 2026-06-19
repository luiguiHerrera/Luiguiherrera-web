import Link from "next/link";
import { TypewriterPrinciples } from "@/components/home/TypewriterPrinciples";
import { getHomeDashboardPreviewData } from "@/lib/dashboard/get-home-dashboard-preview-data";
import { translateBiasLabel, translateDashboardText, translateRegimeLabel } from "@/lib/dashboard/translate-dashboard-copy";

const entryways = [
  { title: "Read the market", href: "/en/market", description: "Regime, levels and weekly context to read the terrain." },
  { title: "Know my profile", href: "/en/diagnostic", description: "Risk, horizon and behavior before committing capital." },
  { title: "Research strategies", href: "/en/research", description: "Models and backtests tested with method." },
  { title: "Protect capital", href: "/en/protection", description: "Filters and checklists to protect the margin of error." },
  { title: "Use free resources", href: "/en/resources", description: "Public tools and scripts for your process." },
];

export default async function EnglishHomePage() {
  const { regimeSummary } = await getHomeDashboardPreviewData();
  const scoreWidth = `${Math.max(0, Math.min(regimeSummary.regimeScore, 100))}%`;
  const signals = (regimeSummary.cautionSignals.length ? regimeSummary.cautionSignals : regimeSummary.riskSupportSignals).slice(0, 3);

  return (
    <div>
      <section className="border-b border-line bg-panel">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:px-5 md:py-18 lg:grid-cols-[0.75fr_0.55fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">Market Lab</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.04] text-ink md:text-6xl">
              Before investing, understand how the market breathes.
            </h1>
            <TypewriterPrinciples
              eyebrow="Process before impulse"
              phrases={["Understand the context.", "Manage risk.", "Decide with data and less noise."]}
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/en/market" className="border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-ink">
                Read the market
              </Link>
              <Link href="/en/diagnostic" className="border border-line bg-panel px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-ink">
                Start diagnostic
              </Link>
            </div>
          </div>
          <div className="border border-petrol/30 bg-[#f7f6f2] p-4 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Current regime</p>
                <div className="mt-4 flex flex-wrap items-end gap-3">
                  <span className="inline-flex border border-petrol/40 bg-[#edf3f1] px-4 py-2 text-sm font-semibold text-petrol">
                    {translateRegimeLabel(regimeSummary.current)}
                  </span>
                  <span className="pb-1 text-sm text-muted">Bias {translateBiasLabel(regimeSummary.bias).toLowerCase()}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Confidence</p>
                <p className="mt-1 text-xl font-semibold text-ink">{regimeSummary.confidence}%</p>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Score</p>
                  <p className="mt-2 text-5xl font-semibold leading-none text-ink">{regimeSummary.regimeScore}</p>
                </div>
                <p className="max-w-[11rem] text-right text-xs leading-5 text-muted">
                  Current regime summary using the same dashboard readings.
                </p>
              </div>
              <div className="mt-5 h-2 border border-line bg-panelSoft">
                <div className="h-full bg-[#a86464]" style={{ width: scoreWidth }} />
              </div>
              <div className="mt-2 flex justify-between text-[11px] uppercase tracking-[0.12em] text-muted">
                <span>Caution</span>
                <span>Neutral</span>
                <span>Risk</span>
              </div>
            </div>

            <div className="mt-5 grid gap-2 md:grid-cols-3">
              {signals.map((signal, index) => (
                <div key={`${signal.label}-${index}`} className="border-l border-brass/60 bg-panelSoft px-3 py-2.5">
                  <p className="text-sm font-semibold leading-5 text-ink">{translateDashboardText(signal.label)}</p>
                  <p className="mt-1 text-xs leading-5 text-muted">{translateDashboardText(signal.detail)}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-muted">{translateDashboardText(regimeSummary.interpretation)}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">Entry points</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {entryways.map((item) => (
            <Link key={item.href} href={item.href} className="flex min-h-[11rem] flex-col border border-line bg-panel p-4 transition hover:border-ink">
              <h2 className="text-xl font-semibold text-ink">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{item.description}</p>
              <span className="mt-auto pt-5 text-sm font-semibold text-ink">Open &rarr;</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
