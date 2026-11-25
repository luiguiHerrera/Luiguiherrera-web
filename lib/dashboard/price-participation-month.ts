import { isClosed, sessionDates } from "../research/mcclellan-core.mjs";
import {
  buildPriceParticipation, PRICE_PARTICIPATION_SECTOR_TICKERS,
  PriceParticipationDataError, type PriceParticipationInput, type PricePoint,
} from "./price-participation";

export type PriceParticipationMonthSummary = {
  /** Current calendar month in Europe/Madrid, independent of the detail controls. */
  month: string;
  comparisonDate: string | null;
  cutoffDate: string | null;
  spyReturnPct: number | null;
  rspReturnPct: number | null;
  relativePp: number | null;
  participation: { positive: number; negative: number; flat: number; covered: number; total: 11 };
  sessions: number;
  requiredObservations: number;
  status: "available" | "partial" | "unavailable";
  reason: "no-current-month-observations" | "missing-month-baseline" | "incomplete-month-history" | "partial-sector-coverage" | "calendar-unavailable" | null;
};

function monthAt(instant: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "2-digit", timeZone: "Europe/Madrid" }).formatToParts(instant);
  return `${parts.find(part => part.type === "year")!.value}-${parts.find(part => part.type === "month")!.value}`;
}

function blank(month: string, reason: PriceParticipationMonthSummary["reason"]): PriceParticipationMonthSummary {
  return { month, comparisonDate: null, cutoffDate: null, spyReturnPct: null, rspReturnPct: null, relativePp: null,
    participation: { positive: 0, negative: 0, flat: 0, covered: 0, total: 11 }, sessions: 0, requiredObservations: 0, status: "unavailable", reason };
}

function priorMonthBounds(month: string) {
  const [year, number] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, number - 1, 0)).toISOString().slice(0, 10);
  return { first: last.slice(0, 7) + "-01", last };
}

function closedThrough(instant: Date) {
  const asOf = instant.toISOString();
  for (let offset = 0; offset < 14; offset++) {
    const date = new Date(instant.getTime() - offset * 86_400_000).toISOString().slice(0, 10);
    if (isClosed(date, asOf)) return date;
  }
  return null;
}

/**
 * MTD is measured from the final exchange session of the preceding month.
 * A missing initial close is not replaced with the first available current-month
 * close. Every required session must have an adjusted close for that asset;
 * partial sector coverage stays explicit against the fixed universe of eleven.
 */
export function buildPriceParticipationMonthSummary(
  input: PriceParticipationInput,
  asOf: Date | string = new Date(),
): PriceParticipationMonthSummary {
  const instant = asOf instanceof Date ? asOf : new Date(asOf);
  if (!Number.isFinite(instant.getTime())) throw new PriceParticipationDataError("Invalid monthly-summary observation timestamp");
  const month = monthAt(instant);
  const prior = priorMonthBounds(month);
  // The existing independent exchange calendar is deliberately bounded.
  if (prior.first < "2024-01-01" || month > "2028-12") return blank(month, "calendar-unavailable");
  const completed = closedThrough(instant);
  if (completed === null || completed.slice(0, 7) !== month) return blank(month, "no-current-month-observations");
  const through = input.priceThrough < completed ? input.priceThrough : completed;
  const bounded: PriceParticipationInput = { ...input, priceThrough: through,
    series: input.series.map(series => ({ ...series, points: series.points.filter(point => point.date <= through) })) };
  // Preserve the established common SPY/RSP/breadth cutoff and source validation.
  // Its 20-session display result is not used in any monthly calculation.
  const common = buildPriceParticipation(bounded);
  if (!common.cutoffDate || common.cutoffDate.slice(0, 7) !== month || input.refreshStatus === "unavailable") {
    return blank(month, "no-current-month-observations");
  }
  const comparisonDate = sessionDates(prior.first, prior.last).at(-1) ?? null;
  if (comparisonDate === null) return blank(month, "calendar-unavailable");
  const dates = sessionDates(comparisonDate, common.cutoffDate);
  const maps = new Map<string, Map<string, PricePoint>>();
  for (const series of bounded.series) {
    const points = new Map<string, PricePoint>();
    for (const point of series.points) {
      if (points.has(point.date)) throw new PriceParticipationDataError(`Duplicate monthly-summary observation: ${series.ticker} ${point.date}`);
      points.set(point.date, point);
    }
    maps.set(series.ticker, points);
  }
  const complete = (ticker: string) => dates.every(date => maps.get(ticker)?.get(date)?.close != null);
  const calculate = (ticker: string) => {
    if (!complete(ticker)) return null;
    const first = maps.get(ticker)!.get(comparisonDate)!.close!;
    const latest = maps.get(ticker)!.get(common.cutoffDate!)!.close!;
    const value = (latest / first - 1) * 100;
    return Number.isFinite(value) ? value : null;
  };
  const spyReturnPct = calculate("SPY");
  const rspReturnPct = calculate("RSP");
  const returns = PRICE_PARTICIPATION_SECTOR_TICKERS.map(calculate);
  const positive = returns.filter(value => value !== null && value > 0).length;
  const negative = returns.filter(value => value !== null && value < 0).length;
  const flat = returns.filter(value => value === 0).length;
  const covered = positive + negative + flat;
  const relativePp = spyReturnPct === null || rspReturnPct === null ? null : rspReturnPct - spyReturnPct;
  const available = relativePp !== null && covered === 11;
  const missingBase = ["SPY", "RSP"].some(ticker => maps.get(ticker)?.get(comparisonDate)?.close == null);
  return {
    month, comparisonDate, cutoffDate: common.cutoffDate, spyReturnPct, rspReturnPct, relativePp,
    participation: { positive, negative, flat, covered, total: 11 },
    sessions: dates.length - 1, requiredObservations: dates.length,
    status: available ? "available" : relativePp !== null || covered > 0 || spyReturnPct !== null || rspReturnPct !== null ? "partial" : "unavailable",
    reason: available ? null : missingBase ? "missing-month-baseline" : relativePp === null ? "incomplete-month-history" : "partial-sector-coverage",
  };
}
