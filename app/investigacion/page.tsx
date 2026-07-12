import Link from "next/link";
import type { Metadata } from "next";
import { td3Project } from "@/lib/quant-lab/td3-results";

type ResearchItem = {
  title: string;
  href: string;
  description: string;
  external?: boolean;
  featured?: boolean;
};

const researchItems: ResearchItem[] = [
  {
    title: "Evaluación realista de claims DRL",
    href: "/investigacion/td3",
    description: "Paper interactivo sobre costes, cash, benchmarks comparables y validación estadística.",
    featured: true,
  },
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">Laboratorio cuantitativo</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">Investigación</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
            Modelos, backtests y restricciones evaluados con método, costes y benchmarks.
          </p>
        </div>
        <p className="border-l border-petrol/25 pl-5 text-sm leading-6 text-muted">
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
              className="group flex min-h-[13rem] flex-col rounded-[6px] border border-line bg-white/75 p-5 shadow-[0_12px_32px_rgba(11,52,54,0.045)] transition hover:border-petrol hover:bg-white"
            >
              <h2 className="text-2xl font-semibold text-ink">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{item.description}</p>
              <span className="mt-auto pt-6 text-sm font-semibold text-petrol">Abrir repositorio &rarr;</span>
            </a>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex min-h-[13rem] flex-col rounded-[6px] border p-5 shadow-[0_12px_32px_rgba(11,52,54,0.045)] transition hover:border-petrol hover:bg-white ${
                item.featured ? "border-petrol/35 bg-white shadow-[0_18px_42px_rgba(11,52,54,0.075)]" : "border-line bg-white/75"
              }`}
            >
              <h2 className="text-2xl font-semibold text-ink">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{item.description}</p>
              <span className="mt-auto pt-6 text-sm font-semibold text-petrol">Explorar &rarr;</span>
            </Link>
          )
        ))}
      </section>
    </div>
  );
}
export const metadata: Metadata = {
  title: "Investigación cuantitativa | DRL, backtesting y validación",
  description: "Investigación cuantitativa sobre asignación de portafolios, aprendizaje por refuerzo, backtesting realista, costes, cash, benchmarks y validación estadística.",
};
