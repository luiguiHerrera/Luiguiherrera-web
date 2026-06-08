import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { MetricCard } from "@/components/ui/MetricCard";
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

      <section className="mt-10 rounded-lg border border-line bg-panel p-6">
        <h2 className="text-2xl font-semibold text-white">Qué es este laboratorio</h2>
        <p className="mt-3 max-w-3xl leading-7 text-muted">
          Un espacio para probar modelos experimentales, simulaciones históricas y métricas de riesgo. TD3 Demo es una etiqueta de investigación con datos mockeados; no predice precios, no promete retornos y no decide por el usuario.
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-panel p-6">
        <h2 className="text-2xl font-semibold text-white">Simulación demo de portafolio</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          Las cifras son ejemplos para diseñar la interfaz y explicar métricas. No son backtests definitivos ni resultados reales de una estrategia lista para operar.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                {["Estrategia", "Retorno anualizado demo", "Volatilidad", "Máx. drawdown", "Sharpe", "Turnover", "Concentración"].map((header) => (
                  <th key={header} className="py-3 pr-4 font-medium">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {portfolioSimulations.map((row) => (
                <tr key={row.name} className="border-b border-line/70">
                  <td className="py-4 pr-4 font-semibold text-white">{row.name}</td>
                  <td className="py-4 pr-4 text-muted">{row.annualReturn}</td>
                  <td className="py-4 pr-4 text-muted">{row.volatility}</td>
                  <td className="py-4 pr-4 text-muted">{row.maxDrawdown}</td>
                  <td className="py-4 pr-4 text-muted">{row.sharpe}</td>
                  <td className="py-4 pr-4 text-muted">{row.turnover}</td>
                  <td className="py-4 pr-4 text-muted">{row.concentration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-line bg-panel p-6">
          <h2 className="text-2xl font-semibold text-white">Comparación contra benchmarks</h2>
          <p className="mt-3 text-sm leading-6 text-muted">Comparar ayuda a ver coste de oportunidad y riesgo relativo. No prueba que una estrategia vaya a superar al benchmark.</p>
          <div className="mt-5 space-y-3">
            {benchmarks.map((item) => (
              <MetricCard key={item.benchmark} label={item.benchmark} value={item.return} helper={`Vol. ${item.volatility} · Drawdown ${item.drawdown}`} />
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {riskMetrics.map(([title, text]) => <MethodologyNote key={title} title={title} text={text} />)}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-line bg-panel p-6">
        <h2 className="text-2xl font-semibold text-white">Roadmap del laboratorio</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {["Integrar resultados reproducibles del modelo TD3", "Añadir universos demo", "Añadir escenarios macro", "Añadir comparación con benchmarks dinámicos"].map((item) => (
            <div key={item} className="rounded border border-line bg-panelSoft p-4 text-sm leading-6 text-muted">{item}</div>
          ))}
        </div>
      </section>
    </div>
  );
}
