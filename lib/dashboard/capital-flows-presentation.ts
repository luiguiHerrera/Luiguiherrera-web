import type { BtcEtfFlowPoint } from "./types.ts";

export type CapitalFlowsLocale = "es" | "en";
export type CapitalFlowTone = "positive" | "negative" | "neutral" | "unavailable";

export type BtcRecentSessionRow = BtcEtfFlowPoint & {
  direction: "inflow" | "outflow" | "flat";
};

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
