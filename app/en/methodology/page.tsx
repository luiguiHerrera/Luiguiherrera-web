const principles = [
  ["Educational first", "The platform organizes context. The final decision belongs to the investor."],
  ["Visible data state", "Automated, manual, pending and fallback states must be clear in the interface."],
  ["Risk before return", "Every reading is framed through process, limits and margin of error."],
];

const limits = [
  "This platform does not provide financial, legal, tax or wealth advice.",
  "It does not recommend assets, products, weights or execution timing.",
  "It does not predict future prices, returns, volatility or flows.",
  "Quantitative models describe historical experiments, not future guarantees.",
  "External data may be delayed, revised, incomplete or unavailable.",
];

export default function EnglishMethodologyPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-14">
      <section className="border-b border-line pb-9">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">How the system works</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">Methodology</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
          How the readings are built, what data they use and where their limits are.
        </p>
      </section>

      <section className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Principles</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {principles.map(([title, text]) => (
            <article key={title} className="border border-line bg-panel p-4">
              <h2 className="font-semibold text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="border border-line bg-panel p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Data and updates</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Numbers need context</h2>
          <p className="mt-4 text-sm leading-6 text-muted">
            Dashboard modules can be automated, manual, pending or fallback. The state of the source is part of the reading.
          </p>
        </div>
        <div className="border border-line bg-panel p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Limits</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">What the platform should not promise</h2>
          <ul className="mt-5 grid gap-2 text-sm leading-6 text-muted">
            {limits.map((item) => <li key={item} className="border-l border-line pl-3">{item}</li>)}
          </ul>
        </div>
      </section>
    </div>
  );
}
