import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { MethodologyNote } from "@/components/ui/MethodologyNote";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { benchmarks, portfolioSimulations, riskMetrics } from "@/lib/mock-data/quant";

export default function QuantLabPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:py-16">
      <div className="grid gap-8 lg:grid-cols-[1fr_0.75fr] lg:items-end">
        <SectionHeader
          eyebrow="Investigación aplicada"
          title="Quant / TD3 Lab"
          subtitle="Modelos, simulaciones y métricas de riesgo para estudiar portafolios con más método y menos intuición suelta. Nada aquí predice el mercado."
        />
        <DisclaimerBox>
          Las simulaciones históricas y modelos experimentales no garantizan resultados futuros. Este laboratorio tiene fines educativos y de investigación, no de recomendación de inversión.
        </DisclaimerBox>
      </div>

      <section className="mt-10 rounded-lg border border-line bg-panel p-6 shadow-quiet md:p-8">
        <h2 className="text-2xl font-semibold text-white">Qué es este laboratorio</h2>
        <p className="mt-3 max-w-3xl leading-7 text-muted">
          Un espacio para probar modelos experimentales, simulaciones históricas y métricas de riesgo. TD3 Demo es una etiqueta de investigación con datos mockeados; no predice precios, no promete retornos y no decide por el usuario.
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-panel p-6 shadow-quiet md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">Demo mockeada</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Simulación demo de portafolio</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted">
            Las cifras son ejemplos para diseñar la interfaz y explicar métricas. No son backtests definitivos ni resultados reales.
          </p>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                {["Estrategia", "Retorno anualizado demo", "Volatilidad", "Máx. drawdown", "Sharpe", "Turnover", "Concentración"].map((header) => (
                  <th key={header} className="border-b border-line bg-ink/25 px-4 py-3 font-medium first:rounded-l last:rounded-r">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {portfolioSimulations.map((row) => (
                <tr key={row.name}>
                  <td className="border-b border-line/70 px-4 py-4 font-semibold text-white">{row.name}</td>
                  <td className="border-b border-line/70 px-4 py-4 text-muted">{row.annualReturn}</td>
                  <td className="border-b border-line/70 px-4 py-4 text-muted">{row.volatility}</td>
                  <td className="border-b border-line/70 px-4 py-4 text-muted">{row.maxDrawdown}</td>
                  <td className="border-b border-line/70 px-4 py-4 text-muted">{row.sharpe}</td>
                  <td className="border-b border-line/70 px-4 py-4 text-muted">{row.turnover}</td>
                  <td className="border-b border-line/70 px-4 py-4 text-muted">{row.concentration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-line bg-panel p-6 shadow-quiet">
          <h2 className="text-2xl font-semibold text-white">Comparación contra benchmarks</h2>
          <p className="mt-3 text-sm leading-6 text-muted">Comparar ayuda a ver coste de oportunidad y riesgo relativo. No prueba que una estrategia vaya a tener mejor resultado que el benchmark.</p>
          <div className="mt-5 divide-y divide-line rounded border border-line bg-panelSoft">
            {benchmarks.map((item) => (
              <div key={item.benchmark} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-semibold text-white">{item.benchmark}</p>
                  <p className="mt-1 text-sm text-muted">Vol. {item.volatility} · Drawdown {item.drawdown}</p>
                </div>
                <p className="text-2xl font-semibold text-white">{item.return}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">Métricas de riesgo</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {riskMetrics.map(([title, text]) => <MethodologyNote key={title} title={title} text={text} />)}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-panel p-6 shadow-quiet md:p-8">
        <h2 className="text-2xl font-semibold text-white">Roadmap del laboratorio</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {["Integrar resultados reproducibles del modelo TD3", "Añadir universos demo", "Añadir escenarios macro", "Añadir comparación con benchmarks dinámicos"].map((item, index) => (
            <div key={item} className="rounded border border-line bg-panelSoft p-4 text-sm leading-6 text-muted">
              <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-brass">Paso {index + 1}</span>
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
