import { tradingViewScripts } from "@/lib/resources/tradingview-scripts";

function englishUseCase(scriptId: string) {
  if (scriptId === "monthly-statistical-levels") {
    return "Helps place current price against its historical monthly range: open, average high extension, average low extension and strong zones calculated with standard deviation.";
  }
  return "Pending stable public link.";
}

export default function EnglishResourcesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-14">
      <section className="border-b border-line pb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Public tools</p>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">Resources</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
          Public tools and scripts to support your investment process.
        </p>
      </section>
      <section id="tradingview-scripts" className="mt-8 scroll-mt-28">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">TradingView</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">Free TradingView scripts</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">
            TradingView scripts will be added once the public links are stable.
          </p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tradingViewScripts.map((script) => (
            <article key={script.id} className="flex min-h-[15rem] flex-col border border-line bg-panel p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{script.category}</p>
                  <h3 className="mt-2 text-lg font-semibold text-ink">{script.title}</h3>
                </div>
                <span className="shrink-0 border border-line bg-panelSoft px-2.5 py-1 text-xs font-semibold text-muted">
                  {script.status === "Publicado" ? "Published" : "Pending"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">{script.description}</p>
              <p className="mt-3 text-xs leading-5 text-muted">
                {script.tradingViewUrl ? `${englishUseCase(script.id)} Monthly visual reference tool. Use it as context within your process.` : englishUseCase(script.id)}
              </p>
              {script.tradingViewUrl ? (
                <a href={script.tradingViewUrl} target="_blank" rel="noopener noreferrer" className="mt-auto w-fit border border-ink bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-panel hover:text-ink">
                  View on TradingView
                </a>
              ) : (
                <span className="mt-auto w-fit border border-line bg-panelSoft px-4 py-2 text-sm font-semibold text-muted">
                  Link pending
                </span>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
