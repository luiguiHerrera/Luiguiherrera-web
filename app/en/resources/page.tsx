import { tradingViewScripts } from "@/lib/resources/tradingview-scripts";

const toolCategories = [
  {
    name: "TradingView",
    status: "Available",
    description: "Public scripts for levels, market context and visual tracking.",
    href: "#tradingview",
  },
  {
    name: "Python",
    status: "Coming soon",
    description: "Research notebooks, simulators and analysis utilities.",
  },
  {
    name: "R",
    status: "Coming soon",
    description: "Statistics, visualization and reproducible analysis.",
  },
  {
    name: "Stata",
    status: "Coming soon",
    description: "Applied econometrics and academic templates.",
  },
  {
    name: "C++",
    status: "Coming soon",
    description: "Future tools for efficient computation and lower-level experiments.",
  },
];

function englishUseCase(scriptId: string, fallback: string) {
  if (scriptId === "monthly-statistical-levels") {
    return "Helps place current price against its historical monthly range: open, average high extension, average low extension and strong zones calculated with standard deviation.";
  }
  if (scriptId === "jpm-collar-levels-spx") {
    return "Helps locate institutional SPX reference zones and keep them separate from ETF-specific levels such as SPY or VOO.";
  }
  return fallback;
}

export default function EnglishResourcesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-14">
      <section className="border-b border-line pb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">Public tools</p>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">Resources</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
          Public tools to support your investment process.
        </p>
      </section>
      <section id="tools" className="mt-8 scroll-mt-28">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">Tool types</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">Choose the language or platform</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">
            Only tools with working public links are published today. Future categories stay marked as coming soon without fake links.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {toolCategories.map((category) => {
            const content = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-ink">{category.name}</h3>
                  <span className="shrink-0 rounded-[4px] border border-line bg-paper px-2.5 py-1 text-xs font-semibold text-muted">
                    {category.status}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted">{category.description}</p>
              </>
            );

            return category.href ? (
              <a
                key={category.name}
                href={category.href}
                className="block min-h-[11rem] rounded-[6px] border border-petrol/30 bg-white/75 p-5 shadow-[0_12px_32px_rgba(11,52,54,0.045)] transition hover:border-petrol hover:bg-panel"
              >
                {content}
              </a>
            ) : (
              <article key={category.name} className="min-h-[11rem] rounded-[6px] border border-line bg-white/60 p-5">
                {content}
              </article>
            );
          })}
        </div>
      </section>

      <section id="tradingview" className="mt-10 scroll-mt-28">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">TradingView</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">Free TradingView scripts</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">
            Compact catalog of public utilities with stable TradingView links.
          </p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tradingViewScripts.map((script) => (
            <article key={script.id} className="flex min-h-[15rem] flex-col rounded-[6px] border border-line bg-white/75 p-5 shadow-[0_12px_32px_rgba(11,52,54,0.045)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-petrol">{script.category}</p>
                  <h3 className="mt-2 text-lg font-semibold text-ink">{script.title}</h3>
                </div>
                <span className="shrink-0 rounded-[4px] border border-line bg-paper px-2.5 py-1 text-xs font-semibold text-muted">
                  Published
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">{script.description}</p>
              <p className="mt-3 text-xs leading-5 text-muted">
                {englishUseCase(script.id, script.useCase)}
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
