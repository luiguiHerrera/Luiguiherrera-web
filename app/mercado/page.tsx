import Link from "next/link";

const marketTools = [
  {
    title: "Market Regime Dashboard",
    href: "/dashboard",
    description: "Volatilidad, rotación, flujos y curva VIX en una lectura común.",
    meta: "Régimen",
  },
  {
    title: "Niveles estadísticos",
    href: "/niveles-estadisticos",
    description: "Percentiles, extensiones, medias y estacionalidad para ubicar el precio en contexto.",
    meta: "Laboratorio",
  },
  {
    title: "Informe semanal",
    href: "/informe-semanal",
    description: "Una lectura editorial de cierre con lo que impulsó y frenó al mercado.",
    meta: "Reporte",
  },
];

export default function MercadoPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:py-14">
      <section className="border-b border-line pb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">Contexto de mercado</p>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">Mercado</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
          Régimen, niveles, estacionalidad y reportes para entender el terreno antes de actuar.
        </p>
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-3">
        {marketTools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="group flex min-h-[15rem] flex-col border border-line bg-panel p-5 transition hover:border-ink">
            <div className="flex items-start justify-between gap-4">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">{tool.meta}</span>
              <span className="text-sm font-semibold text-ink transition group-hover:translate-x-1">Abrir</span>
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-ink">{tool.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{tool.description}</p>
            <span className="mt-auto pt-6 text-sm font-semibold text-ink">Entrar &rarr;</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
