import { tradingViewScripts } from "@/lib/resources/tradingview-scripts";
import { InstitutionalHero } from "@/components/ui/InstitutionalHero";
import { getRouteMetadata } from "@/lib/seo/site";

export const metadata = getRouteMetadata("/en/resources");

const toolCategories = [
  {
    id: "tradingview",
    name: "TradingView",
    status: "Available",
    description: "Public scripts for levels, market context and visual tracking.",
    href: "#tradingview",
  },
  {
    id: "python",
    name: "Python",
    status: "Coming soon",
    description: "Research notebooks, simulators and analysis utilities.",
    href: "#python",
  },
  {
    id: "r",
    name: "R",
    status: "Coming soon",
    description: "Statistics, visualization and reproducible analysis.",
    href: "#r",
  },
  {
    id: "stata",
    name: "Stata",
    status: "Coming soon",
    description: "Applied econometrics and academic templates.",
    href: "#stata",
  },
  {
    id: "cpp",
    name: "C++",
    status: "Coming soon",
    description: "Future tools for efficient computation and lower-level experiments.",
    href: "#cpp",
  },
];

export default function EnglishResourcesPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:py-14">
      <InstitutionalHero
        chips={toolCategories.map((category) => category.name)}
        description="Open-source tools I have developed."
        eyebrow="Public resources"
        title="Resources"
        variant="library"
      />
      <section id="tools" className="research-surface institutional-panel mt-8 scroll-mt-28 rounded-[6px] border border-petrol/25 p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">Tool types</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">Choose the language or platform</h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {toolCategories.map((category) => {
            const content = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-ink">{category.name}</h3>
                  <span className={`shrink-0 rounded-[4px] border px-2.5 py-1 text-xs font-semibold ${category.id === "tradingview" ? "border-brass/50 bg-white/10 text-white" : "border-line bg-paper text-muted"}`}>
                    {category.status}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted">{category.description}</p>
              </>
            );

            return (
              <a
                id={category.id === "tradingview" ? undefined : category.id}
                key={category.name}
                href={category.href}
                className={`${category.id === "tradingview" ? "resource-active-card" : "resource-coming-card"} block min-h-[11rem] scroll-mt-28 rounded-[6px] border p-5 transition hover:border-petrol`}
              >
                {content}
              </a>
            );
          })}
        </div>
      </section>


      <section id="tradingview" className="mt-10 scroll-mt-28">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-ink md:text-3xl">TradingView</h2>
          </div>
        </div>
        <div className="mt-6 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,19rem),1fr))]">
          {tradingViewScripts.map((script) => (
            <article key={script.id} className="editorial-surface flex min-h-[15rem] flex-col rounded-[6px] border border-line p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-petrol">{script.categoryEn}</p>
                  <h3 className="mt-2 text-lg font-semibold text-ink">{script.title}</h3>
                </div>
                <span className="shrink-0 rounded-[4px] border border-line bg-paper px-2.5 py-1 text-xs font-semibold text-muted">
                  Published
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">{script.descriptionEn}</p>
              <p className="mt-3 text-xs leading-5 text-muted">
                {script.useCaseEn}
              </p>
              <a href={script.tradingViewUrl} target="_blank" rel="noopener noreferrer" className="mt-auto w-fit rounded-[4px] border border-petrol bg-petrol px-4 py-2 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol">
                View on TradingView
              </a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

