import { tradingViewScripts } from "@/lib/resources/tradingview-scripts";

const toolCategories = [
  {
    name: "TradingView",
    status: "Disponible",
    description: "Scripts públicos para niveles, contexto de mercado y seguimiento visual.",
    href: "#tradingview",
  },
  {
    name: "Python",
    status: "Próximamente",
    description: "Research notebooks, simuladores y utilidades de análisis.",
  },
  {
    name: "R",
    status: "Próximamente",
    description: "Estadística, visualización y análisis reproducible.",
  },
  {
    name: "Stata",
    status: "Próximamente",
    description: "Econometría aplicada y plantillas académicas.",
  },
  {
    name: "C++",
    status: "Próximamente",
    description: "Herramientas futuras para cálculo eficiente y experimentos de bajo nivel.",
  },
];

export default function RecursosPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 md:py-14">
      <section className="border-b border-line pb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">Herramientas públicas</p>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">Recursos</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
          Herramientas públicas para complementar tu proceso.
        </p>
      </section>

      <section id="herramientas" className="mt-8 scroll-mt-28">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">Tipos de herramienta</p>
            <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">Elige el lenguaje o plataforma</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">
            Hoy se publican solo herramientas con enlace funcional. El resto queda señalado como próximo sin enlaces falsos.
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
            <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">Scripts gratuitos de TradingView</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">
            Catálogo compacto para reunir utilidades públicas del proceso.
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
                  {script.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted">{script.description}</p>
              <p className="mt-3 text-xs leading-5 text-muted">
                {script.useCase}
              </p>
              <a
                href={script.tradingViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto w-fit rounded-[4px] border border-petrol bg-petrol px-4 py-2 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol"
              >
                Ver en TradingView
              </a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
