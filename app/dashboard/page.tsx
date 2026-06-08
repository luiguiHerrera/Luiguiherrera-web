import { DashboardModule } from "@/components/dashboard/DashboardModule";
import { RegimeBadge } from "@/components/dashboard/RegimeBadge";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { crossSignalRadar, dashboardModules, regimeSummary } from "@/lib/mock-data/dashboard";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:py-16">
      <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-end">
        <SectionHeader
          eyebrow="Lectura de régimen"
          title="Market Regime Dashboard"
          subtitle="No elige activos ni momentos de ejecución. Te ayuda a entender qué señales está dejando el mercado."
        />
        <DisclaimerBox>
          Este panel no predice el mercado. Organiza señales. El mercado, como siempre, conserva su derecho constitucional a humillarnos.
        </DisclaimerBox>
      </div>

      <section className="mt-10 rounded-lg border border-petrol/40 bg-panel p-6 shadow-quiet md:p-8">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">Régimen actual mockeado</p>
            <div className="mt-4"><RegimeBadge label={regimeSummary.current} /></div>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
              La lectura combina señales mockeadas de liquidez, rotación, volatilidad y flujos. Sirve para ordenar contexto, no para ejecutar operaciones.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard label="Risk-On" value={`${regimeSummary.riskOn}%`} emphasis />
            <MetricCard label="Risk-Off" value={`${regimeSummary.riskOff}%`} emphasis />
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <MetricCard label="Señales mixtas" value={`${regimeSummary.mixed}%`} />
          <MetricCard label="Confianza" value={regimeSummary.confidence} />
          <MetricCard label="Actualización" value={regimeSummary.updatedAt} />
        </div>
      </section>

      <div className="mt-8 space-y-6">
        {dashboardModules.map((module) => <DashboardModule key={module.id} {...module} />)}
      </div>

      <section className="mt-6 rounded-lg border border-line bg-panel p-6">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold text-white">Radar de señales cruzadas</h2>
          <p className="mt-3 leading-7 text-muted">
            Esta lista no muestra ideas accionables. Muestra empresas donde existe tensión entre escepticismo del mercado y presencia de inversores reconocidos. Son casos para estudiar con calma, no señales para ejecutar.
          </p>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="py-3 pr-4 font-medium">Empresa</th>
                <th className="py-3 pr-4 font-medium">Short interest alto</th>
                <th className="py-3 pr-4 font-medium">Presencia en superinvestors</th>
                <th className="py-3 pr-4 font-medium">Comentario educativo</th>
              </tr>
            </thead>
            <tbody>
              {crossSignalRadar.map((row) => (
                <tr key={row.company} className="border-b border-line/70">
                  <td className="py-4 pr-4 font-semibold text-white">{row.company}</td>
                  <td className="py-4 pr-4 text-muted">{row.shortInterest}</td>
                  <td className="py-4 pr-4 text-muted">{row.superinvestors}</td>
                  <td className="py-4 pr-4 text-muted">{row.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-6">
        <DisclaimerBox>
          Este panel organiza señales públicas de mercado. No predice precios, no recomienda operaciones con activos y no sustituye un análisis personalizado.
        </DisclaimerBox>
      </div>
    </div>
  );
}
