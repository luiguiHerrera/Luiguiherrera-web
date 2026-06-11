import { dataStatusLabels } from "@/lib/dashboard/status";
import type { FedWatchDashboardData, FedWatchMeeting } from "@/lib/dashboard/types";

type FedWatchModuleProps = {
  data: FedWatchDashboardData;
};

function formatPercent(value: number | null) {
  return value === null ? "No disponible" : `${value.toFixed(1)}%`;
}

function aggregateLabel(value: number | null) {
  return value === null ? "No disponible" : `${value.toFixed(1)}%`;
}

function meetingRows(meetings: FedWatchMeeting[]) {
  return meetings.slice(0, 5);
}

export function FedWatchModule({ data }: FedWatchModuleProps) {
  const fedWatch = data.fedWatch;
  const next = fedWatch.nextMeeting;
  const metrics = [
    ["Próxima reunión", next?.date ?? "Pendiente"],
    ["Rango dominante", next?.dominantRange ?? "No disponible"],
    ["Probabilidad dominante", formatPercent(next?.dominantProbability ?? null)],
    ["Convicción", next?.conviction ?? "Baja / dispersa"],
    ["Primer recorte relevante", fedWatch.firstRelevantCutMeeting ?? "No identificado"],
    ["Rango actual", fedWatch.currentTargetRange ?? "No identificado"],
  ];

  return (
    <section className="border border-line bg-panel p-5 md:p-6">
      <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr] xl:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">FedWatch / tasas</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">Expectativas de política monetaria</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            FedWatch resume probabilidades implícitas en futuros de Fed Funds para próximas reuniones de la Reserva Federal. Es una lectura de expectativas de política monetaria, no una anticipación propia ni una recomendación de inversión.
          </p>

          <div className="mt-6 border border-line bg-panelSoft p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">Lectura principal</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <span className="text-3xl font-semibold leading-none text-ink md:text-4xl">{fedWatch.readingLabel}</span>
              <span className="mb-1 border border-line bg-panel px-3 py-1 text-sm font-semibold text-muted">
                {dataStatusLabels[fedWatch.dataStatus]}
              </span>
            </div>
            <p className="mt-3 font-semibold text-ink">{fedWatch.readingSubtext}</p>
            <p className="mt-4 text-sm leading-6 text-muted">
              Si el rango actual no está identificado con seguridad, los agregados de recorte, pausa y subida se mantienen como no disponibles.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map(([label, value]) => (
            <div key={label} className="border border-line bg-panelSoft p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted">{label}</p>
              <p className="mt-2 font-semibold text-ink">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead className="text-muted">
            <tr className="border-b border-line">
              <th className="py-3 pr-4 font-medium">Reunión</th>
              <th className="py-3 pr-4 font-medium">Rango dominante</th>
              <th className="py-3 pr-4 font-medium">Dominante</th>
              <th className="py-3 pr-4 font-medium">Recorte</th>
              <th className="py-3 pr-4 font-medium">Pausa</th>
              <th className="py-3 pr-4 font-medium">Subida</th>
              <th className="py-3 pr-4 font-medium">Convicción</th>
            </tr>
          </thead>
          <tbody>
            {meetingRows(fedWatch.meetings).map((meeting) => (
              <tr key={`${meeting.date}-${meeting.dominantRange}`} className="border-b border-line/70">
                <td className="py-4 pr-4 font-semibold text-ink">{meeting.date}</td>
                <td className="py-4 pr-4 text-muted">{meeting.dominantRange}</td>
                <td className="py-4 pr-4 text-muted">{formatPercent(meeting.dominantProbability)}</td>
                <td className="py-4 pr-4 text-muted">{aggregateLabel(meeting.cutProbability)}</td>
                <td className="py-4 pr-4 text-muted">{aggregateLabel(meeting.pauseProbability)}</td>
                <td className="py-4 pr-4 text-muted">{aggregateLabel(meeting.hikeProbability)}</td>
                <td className="py-4 pr-4 text-muted">{meeting.conviction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-3 border-t border-line pt-4 text-sm leading-6 text-muted md:grid-cols-3">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Fuente</span>
          {fedWatch.sourceUrl ? (
            <a href={fedWatch.sourceUrl} className="mt-1 inline-block text-ink underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
              {fedWatch.sourceName}
            </a>
          ) : (
            <span className="mt-1 block text-ink">{fedWatch.sourceName}</span>
          )}
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Actualización</span>
          <span className="mt-1 block text-ink">{fedWatch.lastUpdated}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">Frecuencia</span>
          <span className="mt-1 block text-ink">{fedWatch.updateFrequency}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 text-sm leading-6 text-muted lg:grid-cols-2">
        <div className="border border-line bg-panelSoft p-4">
          <span className="block font-semibold text-ink">Interpretación prudente</span>
          <p className="mt-2">{fedWatch.interpretation.how}</p>
        </div>
        <div className="border border-line bg-panelSoft p-4">
          <span className="block font-semibold text-ink">Qué NO significa</span>
          <p className="mt-2">{fedWatch.interpretation.whatItDoesNotMean}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted">{fedWatch.reliabilityNote}</p>
    </section>
  );
}
