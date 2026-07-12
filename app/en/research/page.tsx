import Link from "next/link";
import { ReadingCard } from "@/components/seo/ReadingCard";
import { td3Project } from "@/lib/quant-lab/td3-results";

const researchItems = [
  {
    title: "Realistic evaluation of DRL portfolio claims",
    href: "/en/research/td3",
    description: "DRL research protocol on costs, cash, matched benchmarks and statistical validation.",
  },
  { title: "Quant / TD3 Lab", href: "/en/quant-lab", description: "Models, backtests, realistic constraints and benchmarks tested with method." },
  { title: "TD3 Repository", href: td3Project.repoUrl, description: "Research code and traceability for the original TD3 experiment.", external: true },
];

export default function EnglishResearchPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-14">
      <section className="grid gap-8 border-b border-line pb-10 lg:grid-cols-[1fr_0.56fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">Quant lab</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">Research</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
            Models, backtests and constraints tested with method, costs and benchmarks.
          </p>
        </div>
        <p className="border-l border-petrol/25 pl-5 text-sm leading-6 text-muted">
          Ideas earn their place only after passing through a disciplined process.
        </p>
      </section>

      <ReadingCard title="Reading card" items={[
        { label: "What it is", value: "A quantitative-research section about portfolio allocation, reinforcement learning, realistic backtesting and statistical validation." },
        { label: "What it is for", value: "It documents experiments, limits, benchmarks and methodology before treating results as evidence." },
        { label: "Main sources", value: "Internal code, historical financial data, benchmarks, costs, constraints, out-of-sample validation and project documentation." },
        { label: "Limits", value: "The research does not promise future superiority; it evaluates robustness under defined assumptions, data and constraints." },
      ]} />

      <section className="mt-8 grid gap-5 md:grid-cols-2">
        {researchItems.map((item) => item.external ? (
          <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className="group flex min-h-[13rem] flex-col rounded-[6px] border border-line bg-white/75 p-5 shadow-[0_12px_32px_rgba(11,52,54,0.045)] transition hover:border-petrol hover:bg-white">
            <h2 className="text-2xl font-semibold text-ink">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{item.description}</p>
            <span className="mt-auto pt-6 text-sm font-semibold text-petrol">Open repository &rarr;</span>
          </a>
        ) : (
          <Link key={item.href} href={item.href} className="group flex min-h-[13rem] flex-col rounded-[6px] border border-line bg-white/75 p-5 shadow-[0_12px_32px_rgba(11,52,54,0.045)] transition hover:border-petrol hover:bg-white">
            <h2 className="text-2xl font-semibold text-ink">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{item.description}</p>
            <span className="mt-auto pt-6 text-sm font-semibold text-petrol">Explore &rarr;</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
