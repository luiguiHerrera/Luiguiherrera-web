import {
  getHistoricalAutomaticReadings,
  type HistoricalAutomaticReadingsSnapshot,
} from "./historical-automatic-readings.ts";
import {
  marketReports,
  reportDisplayName,
  type MarketReport,
  type MarketReportAssetReading,
  type MarketReportCalendarItem,
  type MarketReportFigure,
  type MarketReportScenario,
  type MarketReportSectionBlock,
  type MarketReportWatchItem,
} from "./market-reports.ts";

export const REPORT_EXPORT_SCHEMA_VERSION = "1.0.0";
export const REPORT_EXPORT_AUTHOR = "Luigui Herrera";
export const REPORT_SITE_URL = "https://www.luiguiherrera.com";

export type ReportExportFormat = "html" | "markdown" | "pdf" | "ics";

export type ReportExportEvent = {
  uid: string;
  startDate: string;
  endDate?: string;
  summary: string;
  description: string;
  url: string;
};

export type ReportExportSection =
  | {
      id: "thesis";
      title: "Tesis principal";
      kind: "narrative";
      body: string;
    }
  | {
      id: "executive-summary";
      title: "Resumen ejecutivo";
      kind: "summary";
      items: MarketReport["executiveSummary"];
      transversalFactor?: NonNullable<MarketReport["transversalFactor"]>;
    }
  | {
      id: "context-by-asset";
      title: "Contexto por activo";
      kind: "context";
      items: MarketReportSectionBlock[];
    }
  | {
      id: "asset-follow-up";
      title: "Lectura de seguimiento por activo";
      kind: "asset-readings";
      items: MarketReportAssetReading[];
    }
  | {
      id: "historical-snapshot";
      title: "Lecturas automáticas al cierre del informe";
      kind: "historical-snapshot";
      snapshot: HistoricalAutomaticReadingsSnapshot;
    }
  | {
      id: "figures";
      title: "Figuras";
      kind: "figures";
      items: Array<MarketReportFigure & { asset: string }>;
    }
  | {
      id: "calendar-and-scenarios";
      title: "Calendario y escenarios";
      kind: "calendar-scenarios";
      calendar: MarketReportCalendarItem[];
      scenarios: MarketReportScenario[];
    }
  | {
      id: "watchlist";
      title: "Señales a vigilar";
      kind: "watchlist";
      items: MarketReportWatchItem[];
    }
  | {
      id: "sources-and-limitations";
      title: "Fuentes, limitaciones y aviso educativo";
      kind: "sources";
      sourcesNote: string;
      disclaimer: string;
    };

export type ReportExportModel = {
  schemaVersion: typeof REPORT_EXPORT_SCHEMA_VERSION;
  id: string;
  canonicalUrl: string;
  editionName: string;
  title: string;
  subtitle: string;
  description: string;
  author: typeof REPORT_EXPORT_AUTHOR;
  publishedAt: string;
  modifiedAt: string;
  publishedLabel: string;
  editorialCutoffAt?: string;
  automaticDataCutoffAt?: string;
  status: MarketReport["status"];
  formats: Record<ReportExportFormat, string | null>;
  events: ReportExportEvent[];
  sections: ReportExportSection[];
};

function eventSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function figuresFor(report: MarketReport) {
  return report.assetReadings.flatMap((asset) =>
    (asset.figures ?? []).map((figure) => ({ ...figure, asset: asset.asset })),
  );
}

function structuredEvents(report: MarketReport, canonicalUrl: string): ReportExportEvent[] {
  return report.calendar
    .filter((item): item is MarketReportCalendarItem & { dateStart: string } => Boolean(item.dateStart))
    .map((item) => ({
      uid: `${report.id}-${eventSlug(item.event)}@luigui-herrera`,
      startDate: item.dateStart,
      endDate: item.dateEnd,
      summary: `${reportDisplayName(report)}: ${item.event}`,
      description: `${item.dateLabel}. ${item.whyItMatters}`,
      url: canonicalUrl,
    }));
}

function reportSections(
  report: MarketReport,
  snapshot: HistoricalAutomaticReadingsSnapshot | null,
): ReportExportSection[] {
  const figures = figuresFor(report);
  const sections: ReportExportSection[] = [
    {
      id: "thesis",
      title: "Tesis principal",
      kind: "narrative",
      body: report.thesis,
    },
    {
      id: "executive-summary",
      title: "Resumen ejecutivo",
      kind: "summary",
      items: report.executiveSummary,
      ...(report.transversalFactor ? { transversalFactor: report.transversalFactor } : {}),
    },
    {
      id: "context-by-asset",
      title: "Contexto por activo",
      kind: "context",
      items: report.whatHappened,
    },
    {
      id: "asset-follow-up",
      title: "Lectura de seguimiento por activo",
      kind: "asset-readings",
      items: report.assetReadings,
    },
  ];

  if (snapshot) {
    sections.push({
      id: "historical-snapshot",
      title: "Lecturas automáticas al cierre del informe",
      kind: "historical-snapshot",
      snapshot,
    });
  }

  if (figures.length) {
    sections.push({
      id: "figures",
      title: "Figuras",
      kind: "figures",
      items: figures,
    });
  }

  sections.push(
    {
      id: "calendar-and-scenarios",
      title: "Calendario y escenarios",
      kind: "calendar-scenarios",
      calendar: report.calendar,
      scenarios: report.scenarios,
    },
    {
      id: "watchlist",
      title: "Señales a vigilar",
      kind: "watchlist",
      items: report.watchlist,
    },
    {
      id: "sources-and-limitations",
      title: "Fuentes, limitaciones y aviso educativo",
      kind: "sources",
      sourcesNote: report.sourcesNote,
      disclaimer: report.disclaimer,
    },
  );

  return sections;
}

export function buildReportExportModel(report: MarketReport): ReportExportModel {
  const canonicalUrl = `${REPORT_SITE_URL}/informes/${report.id}`;
  const snapshot = getHistoricalAutomaticReadings(report.id);
  const events = structuredEvents(report, canonicalUrl);

  return {
    schemaVersion: REPORT_EXPORT_SCHEMA_VERSION,
    id: report.id,
    canonicalUrl,
    editionName: reportDisplayName(report),
    title: report.title,
    subtitle: report.subtitle,
    description: report.summary,
    author: REPORT_EXPORT_AUTHOR,
    publishedAt: report.publishedAt,
    modifiedAt: report.modifiedAt,
    publishedLabel: report.publishedLabel ?? report.dateLabel,
    ...(report.editorialCutoffAt ? { editorialCutoffAt: report.editorialCutoffAt } : {}),
    ...(report.automaticDataCutoffAt ? { automaticDataCutoffAt: report.automaticDataCutoffAt } : {}),
    status: report.status,
    formats: {
      html: `/reports/${report.id}.html`,
      markdown: `/reports/${report.id}.md`,
      pdf: `/reports/${report.id}.pdf`,
      ics: events.length && report.calendarHref ? report.calendarHref : null,
    },
    events,
    sections: reportSections(report, snapshot),
  };
}

export function buildAllReportExportModels() {
  return marketReports.map(buildReportExportModel);
}
