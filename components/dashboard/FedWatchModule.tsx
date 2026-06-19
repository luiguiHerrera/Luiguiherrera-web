import { dataStatusLabels } from "@/lib/dashboard/status";
import { translateDashboardText } from "@/lib/dashboard/translate-dashboard-copy";
import type { FedWatchDashboardData, FedWatchMeeting } from "@/lib/dashboard/types";

type FedWatchModuleProps = {
  data: FedWatchDashboardData;
  locale?: "es" | "en";
};

function formatPercent(value: number | null, locale: "es" | "en" = "es") {
  return value === null ? locale === "en" ? "Unavailable" : "No disponible" : `${value.toFixed(1)}%`;
}

function aggregateLabel(value: number | null, locale: "es" | "en" = "es") {
  return value === null ? locale === "en" ? "Unavailable" : "No disponible" : `${value.toFixed(1)}%`;
}

function meetingRows(meetings: FedWatchMeeting[]) {
  return meetings.slice(0, 5);
}

export function FedWatchModule({ data, locale = "es" }: FedWatchModuleProps) {
  const fedWatch = data.fedWatch;
  const next = fedWatch.nextMeeting;
  const t = (value: string | null | undefined) => locale === "en" ? translateDashboardText(value) : value ?? "";
  const copy = locale === "en"
    ? {
        title: "Monetary policy expectations",
        body: "FedWatch summarizes implied probabilities from Fed Funds futures for upcoming Federal Reserve meetings. This is an expectations read, not a proprietary forecast or investment recommendation.",
        mainRead: "Main read",
        caution: "If the current range is not identified with confidence, cut, pause and hike aggregates remain unavailable.",
        nextMeeting: "Next meeting",
        dominantRange: "Dominant range",
        dominantProbability: "Dominant probability",
        conviction: "Conviction",
        firstCut: "First relevant cut",
        currentRange: "Current range",
        pending: "Pending",
        unavailable: "Unavailable",
        unidentified: "Unidentified",
        lowConviction: "Low / dispersed",
        meeting: "Meeting",
        dominant: "Dominant",
        cut: "Cut",
        pause: "Pause",
        hike: "Hike",
        source: "Source",
        updated: "Updated",
        frequency: "Frequency",
        interpretation: "Prudent interpretation",
        limit: "Reading limit",
      }
    : {
        title: "Expectativas de política monetaria",
        body: "FedWatch resume probabilidades implícitas en futuros de Fed Funds para próximas reuniones de la Reserva Federal. Es una lectura de expectativas de política monetaria, no una anticipación propia ni una recomendación de inversión.",
        mainRead: "Lectura principal",
        caution: "Si el rango actual no está identificado con seguridad, los agregados de recorte, pausa y subida se mantienen como no disponibles.",
        nextMeeting: "Próxima reunión",
        dominantRange: "Rango dominante",
        dominantProbability: "Probabilidad dominante",
        conviction: "Convicción",
        firstCut: "Primer recorte relevante",
        currentRange: "Rango actual",
        pending: "Pendiente",
        unavailable: "No disponible",
        unidentified: "No identificado",
        lowConviction: "Baja / dispersa",
        meeting: "Reunión",
        dominant: "Dominante",
        cut: "Recorte",
        pause: "Pausa",
        hike: "Subida",
        source: "Fuente",
        updated: "Actualización",
        frequency: "Frecuencia",
        interpretation: "Interpretación prudente",
        limit: "Qué NO significa",
      };
  const metrics = [
    [copy.nextMeeting, next?.date ?? copy.pending],
    [copy.dominantRange, next?.dominantRange ?? copy.unavailable],
    [copy.dominantProbability, formatPercent(next?.dominantProbability ?? null, locale)],
    [copy.conviction, t(next?.conviction) || copy.lowConviction],
    [copy.firstCut, fedWatch.firstRelevantCutMeeting ?? copy.unidentified],
    [copy.currentRange, fedWatch.currentTargetRange ?? copy.unidentified],
  ];

  return (
    <section className="border border-line bg-panel p-5 md:p-6">
      <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr] xl:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">{locale === "en" ? "FedWatch / rates" : "FedWatch / tasas"}</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">{copy.title}</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            {copy.body}
          </p>

          <div className="mt-6 border border-line bg-panelSoft p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.mainRead}</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <span className="text-3xl font-semibold leading-none text-ink md:text-4xl">{t(fedWatch.readingLabel)}</span>
              <span className="mb-1 border border-line bg-panel px-3 py-1 text-sm font-semibold text-muted">
                {t(dataStatusLabels[fedWatch.dataStatus])}
              </span>
            </div>
            <p className="mt-3 font-semibold text-ink">{t(fedWatch.readingSubtext)}</p>
            <p className="mt-4 text-sm leading-6 text-muted">
              {copy.caution}
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
              <th className="py-3 pr-4 font-medium">{copy.meeting}</th>
              <th className="py-3 pr-4 font-medium">{copy.dominantRange}</th>
              <th className="py-3 pr-4 font-medium">{copy.dominant}</th>
              <th className="py-3 pr-4 font-medium">{copy.cut}</th>
              <th className="py-3 pr-4 font-medium">{copy.pause}</th>
              <th className="py-3 pr-4 font-medium">{copy.hike}</th>
              <th className="py-3 pr-4 font-medium">{copy.conviction}</th>
            </tr>
          </thead>
          <tbody>
            {meetingRows(fedWatch.meetings).map((meeting) => (
              <tr key={`${meeting.date}-${meeting.dominantRange}`} className="border-b border-line/70">
                <td className="py-4 pr-4 font-semibold text-ink">{meeting.date}</td>
                <td className="py-4 pr-4 text-muted">{meeting.dominantRange}</td>
                <td className="py-4 pr-4 text-muted">{formatPercent(meeting.dominantProbability, locale)}</td>
                <td className="py-4 pr-4 text-muted">{aggregateLabel(meeting.cutProbability, locale)}</td>
                <td className="py-4 pr-4 text-muted">{aggregateLabel(meeting.pauseProbability, locale)}</td>
                <td className="py-4 pr-4 text-muted">{aggregateLabel(meeting.hikeProbability, locale)}</td>
                <td className="py-4 pr-4 text-muted">{t(meeting.conviction)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-3 border-t border-line pt-4 text-sm leading-6 text-muted md:grid-cols-3">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.source}</span>
          {fedWatch.sourceUrl ? (
            <a href={fedWatch.sourceUrl} className="mt-1 inline-block text-ink underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
              {t(fedWatch.sourceName)}
            </a>
          ) : (
            <span className="mt-1 block text-ink">{t(fedWatch.sourceName)}</span>
          )}
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.updated}</span>
          <span className="mt-1 block text-ink">{fedWatch.lastUpdated}</span>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{copy.frequency}</span>
          <span className="mt-1 block text-ink">{t(fedWatch.updateFrequency)}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 text-sm leading-6 text-muted lg:grid-cols-2">
        <div className="border border-line bg-panelSoft p-4">
          <span className="block font-semibold text-ink">{copy.interpretation}</span>
          <p className="mt-2">{t(fedWatch.interpretation.how)}</p>
        </div>
        <div className="border border-line bg-panelSoft p-4">
          <span className="block font-semibold text-ink">{copy.limit}</span>
          <p className="mt-2">{t(fedWatch.interpretation.whatItDoesNotMean)}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted">{t(fedWatch.reliabilityNote)}</p>
    </section>
  );
}
