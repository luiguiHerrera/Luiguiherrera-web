import type {
  BtcEtfFlowCoverage,
  BtcEtfFlowDataStatus,
  BtcEtfFlowPoint,
  BtcEtfFlowSourceRole,
} from "./types.ts";

export type CapitalFlowsLocale = "es" | "en";
export type CapitalFlowTone = "positive" | "negative" | "neutral" | "unavailable";

export type BtcRecentSessionRow = BtcEtfFlowPoint & {
  direction: "inflow" | "outflow" | "flat";
};

export function btcFlowStatusLabel(
  dataStatus: BtcEtfFlowDataStatus,
  sourceRole: BtcEtfFlowSourceRole,
  locale: CapitalFlowsLocale,
) {
  if (dataStatus === "unavailable" || sourceRole === "unavailable") {
    return locale === "en" ? "Data unavailable" : "Datos no disponibles";
  }

  const fallbackSuffix = sourceRole === "fallback"
    ? locale === "en" ? " · alternate source" : " · fuente alternativa"
    : "";

  if (dataStatus === "delayed") {
    return `${locale === "en" ? "Delayed data" : "Datos retrasados"}${fallbackSuffix}`;
  }

  return `${locale === "en" ? "Automated data" : "Datos automatizados"}${fallbackSuffix}`;
}

export function btcFlowCoverageCopy(
  coverage: BtcEtfFlowCoverage,
  rowsParsed: number,
  locale: CapitalFlowsLocale,
) {
  if (coverage === "unavailable") {
    return {
      label: locale === "en" ? "Coverage unavailable" : "Cobertura no disponible",
      detail: locale === "en" ? "No real sessions available" : "Sin sesiones reales disponibles",
    };
  }

  const sessionLabel = locale === "en"
    ? `${rowsParsed} available sessions`
    : `${rowsParsed} sesiones disponibles`;
  const rollingLabel = coverage === "complete"
    ? locale === "en" ? "Rolling 20D available" : "Rolling 20D disponible"
    : locale === "en" ? "Rolling 20D unavailable" : "Rolling 20D no disponible";

  return {
    label: coverage === "complete"
      ? locale === "en" ? "Complete coverage" : "Cobertura completa"
      : locale === "en" ? "Partial coverage" : "Cobertura parcial",
    detail: `${sessionLabel} · ${rollingLabel}`,
  };
}

export function capitalFlowTone(value: number | null): CapitalFlowTone {
  if (value === null) return "unavailable";
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

export function flowDirection(value: number): BtcRecentSessionRow["direction"] {
  if (value > 0) return "inflow";
  if (value < 0) return "outflow";
  return "flat";
}

export function flowDirectionLabel(value: number, locale: CapitalFlowsLocale) {
  const direction = flowDirection(value);
  if (direction === "inflow") return locale === "en" ? "Inflow" : "Entrada";
  if (direction === "outflow") return locale === "en" ? "Outflow" : "Salida";
  return locale === "en" ? "Flat" : "Sin cambio";
}

export function formatCapitalFlowDate(value: string | null, locale: CapitalFlowsLocale) {
  if (!value) return locale === "en" ? "Pending" : "Pendiente";
  const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const sourceDate = value.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})$/);
  const sourceMonth = sourceDate
    ? ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(sourceDate[1].toLowerCase())
    : -1;
  if (!isoDate && (!sourceDate || sourceMonth < 0)) return value;
  const date = isoDate
    ? new Date(`${value}T00:00:00Z`)
    : new Date(Date.UTC(Number(sourceDate![3]), sourceMonth, Number(sourceDate![2])));
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function buildBtcRecentSessionRows(history: BtcEtfFlowPoint[], limit = 10): BtcRecentSessionRow[] {
  if (limit <= 0) return [];
  return history
    .slice(-limit)
    .reverse()
    .map((point) => ({ ...point, direction: flowDirection(point.totalNetFlow) }));
}
