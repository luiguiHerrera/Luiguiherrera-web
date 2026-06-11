import { DashboardModule } from "@/components/dashboard/DashboardModule";
import { RegimeBadge } from "@/components/dashboard/RegimeBadge";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getDashboardData } from "@/lib/dashboard/get-dashboard-data";
import { dataStatusLabels } from "@/lib/dashboard/status";

export const revalidate = 86400;

export default async function DashboardPage() {
  const { crossSignalRadar, dashboardModules, regimeSummary } = await getDashboardData();

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 md:py-16">
      <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-end">
        <SectionHeader
          eyebrow="Lectura de régimen"
          title="Market Regime Dashboard"
          subtitle="No elige activos ni momentos de ejecución. Te ayuda a entender qué señales está dejando el mercado."
        />
        <DisclaimerBox>
          Esta lectura no predice el mercado. Resume señales públicas para entender el contexto.
        </DisclaimerBox>
      </div>

      <section className="mt-10 border border-petrol/40 bg-panel p-6 md:p-8">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">Régimen actual</p>
            <div className="mt-4"><RegimeBadge label={regimeSummary.current} /></div>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
              Lectura compuesta manual basada en tasas, rotación sectorial, volatilidad y flujos. Sirve para ordenar contexto, no para ejecutar operaciones.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard label="Sesgo" value={regimeSummary.bias} emphasis />
            <MetricCard label="Confianza de lectura" value={regimeSummary.confidence} emphasis />
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <MetricCard label="Última actualización" value={regimeSummary.lastUpdated} />
          <MetricCard label="Estado de datos" value={dataStatusLabels[regimeSummary.dataStatus]} />
          <MetricCard label="Fuente" value={regimeSummary.sourceName} />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="border border-line bg-panelSoft p-5">
            <h3 className="font-semibold text-ink">Señales a favor del riesgo</h3>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted">
              {regimeSummary.riskSupportSignals.map((signal) => (
                <li key={signal.label} className="border-l border-sage/70 pl-4">
                  <span className="font-semibold text-ink">{signal.label}: </span>{signal.detail}
                </li>
              ))}
            </ul>
          </div>
          <div className="border border-line bg-panelSoft p-5">
            <h3 className="font-semibold text-ink">Señales de cautela</h3>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted">
              {regimeSummary.cautionSignals.map((signal) => (
                <li key={signal.label} className="border-l border-brass/70 pl-4">
                  <span className="font-semibold text-ink">{signal.label}: </span>{signal.detail}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-5 border-t border-line pt-4 text-sm leading-6 text-muted">{regimeSummary.reliabilityNote}</p>
      </section>

      <div className="mt-8 space-y-6">
        {dashboardModules.map((module) => <DashboardModule key={module.id} {...module} />)}
      </div>

      <section className="mt-6 border border-line bg-panel p-6">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold text-ink">Radar de señales cruzadas</h2>
          <p className="mt-3 leading-7 text-muted">
            Esta tabla no muestra ideas para comprar. Muestra casos donde hay señales públicas en tensión: short interest reportado como escepticismo o presión bajista, y presencia en 13F/superinvestors como interés institucional reportado con retraso. Son puntos de partida para investigación, no señales de ejecución.
          </p>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="py-3 pr-4 font-medium">Ticker</th>
                <th className="py-3 pr-4 font-medium">Short interest</th>
                <th className="py-3 pr-4 font-medium">Presencia institucional</th>
                <th className="py-3 pr-4 font-medium">Fecha short interest</th>
                <th className="py-3 pr-4 font-medium">Fecha 13F</th>
                <th className="py-3 pr-4 font-medium">Estado</th>
                <th className="py-3 pr-4 font-medium">Nota prudente</th>
              </tr>
            </thead>
            <tbody>
              {crossSignalRadar.map((row) => (
                <tr key={row.ticker} className="border-b border-line/70">
                  <td className="py-4 pr-4 font-semibold text-ink">{row.ticker}</td>
                  <td className="py-4 pr-4 text-muted">{row.shortInterest}</td>
                  <td className="py-4 pr-4 text-muted">{row.institutionalPresence}</td>
                  <td className="py-4 pr-4 text-muted">{row.shortInterestDate}</td>
                  <td className="py-4 pr-4 text-muted">{row.form13FDate}</td>
                  <td className="py-4 pr-4 text-muted">{dataStatusLabels[row.dataStatus]}</td>
                  <td className="py-4 pr-4 text-muted">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-5 border-t border-line pt-4 text-sm leading-6 text-muted">
          Fuente conceptual: short interest reportado y formularios 13F. Los datos tienen retrasos, cobertura incompleta y metodología variable.
        </p>
      </section>

      <div className="mt-6">
        <DisclaimerBox>
          Este panel organiza señales públicas de mercado. No predice precios, no recomienda operaciones con activos y no sustituye un análisis personalizado.
        </DisclaimerBox>
      </div>
    </div>
  );
}
