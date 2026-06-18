import Link from "next/link";
import { td3Project } from "@/lib/quant-lab/td3-results";

const researchItems = [
  {
    title: "Quant / TD3 Lab",
    href: "/quant-lab",
    description: "Modelos, backtests, restricciones realistas y benchmarks evaluados con método.",
  },
  {
    title: "Repositorio TD3",
    href: td3Project.repoUrl,
    description: "Código de investigación y trazabilidad del experimento TD3 original.",
    external: true,
  },
];

export default function InvestigacionPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:py-14">
      <section className="grid gap-8 border-b border-line pb-10 lg:grid-cols-[1fr_0.56fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Laboratorio cuantitativo</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">Investigación</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
            Modelos, backtests y restricciones evaluados con método, costes y benchmarks.
          </p>
        </div>
        <p className="border-l border-line pl-5 text-sm leading-6 text-muted">
          Aquí las ideas pasan por pruebas antes de ganarse un lugar en el proceso.
        </p>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-2">
        {researchItems.map((item) => (
          item.external ? (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="group flex min-h-[13rem] flex-col border border-line bg-panel p-5 transition hover:border-ink"
            >
              <h2 className="text-2xl font-semibold text-ink">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{item.description}</p>
              <span className="mt-auto pt-6 text-sm font-semibold text-ink">Abrir repositorio &rarr;</span>
            </a>
          ) : (
            <Link key={item.href} href={item.href} className="group flex min-h-[13rem] flex-col border border-line bg-panel p-5 transition hover:border-ink">
              <h2 className="text-2xl font-semibold text-ink">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{item.description}</p>
              <span className="mt-auto pt-6 text-sm font-semibold text-ink">Explorar &rarr;</span>
            </Link>
          )
        ))}
      </section>
    </div>
  );
}
