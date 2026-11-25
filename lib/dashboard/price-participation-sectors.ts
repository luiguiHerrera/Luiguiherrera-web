import {
  PRICE_PARTICIPATION_SECTOR_TICKERS, PRICE_PARTICIPATION_WINDOWS,
  type PriceParticipationInput, type PriceParticipationSectorTicker, type PriceParticipationWindow,
} from "./price-participation";

export type SectorParticipationPoint = { date: string; close: number | null };
export type SectorWindowReturn = {
  sessions: PriceParticipationWindow;
  returnPct: number | null;
  /** Competition rank among all sectors covered in this current window. */
  rank: number | null;
  covered: number;
};
export type SectorParticipationRecord = {
  ticker: PriceParticipationSectorTicker;
  close: number | null;
  returnPct: number | null;
  previousReturnPct: number | null;
  /** Both ranks use only sectors covered in BOTH adjacent windows. */
  rank: number | null;
  previousRank: number | null;
  /** Positive means places gained: previousRank minus current rank. */
  rankChange: number | null;
  returnChangePp: number | null;
  /** N+1 selected-window dates on the SPY calendar; holes remain null. */
  points: SectorParticipationPoint[];
  windows: SectorWindowReturn[];
};
export type SectorRankMovement = {
  ticker: PriceParticipationSectorTicker;
  rank: number;
  previousRank: number;
  rankChange: number;
  returnPct: number;
  previousReturnPct: number;
  returnChangePp: number;
};
export type SectorParticipationWarning =
  | "no-cutoff" | "insufficient-current-history" | "insufficient-previous-history"
  | "partial-current-coverage" | "partial-previous-coverage";
export interface SectorParticipationView {
  sessions: PriceParticipationWindow;
  cutoffDate: string | null;
  comparisonDate: string | null;
  previousCutoffDate: string | null;
  previousComparisonDate: string | null;
  /** Current-return order, nulls last; equal returns use alphabetical order. */
  sectors: SectorParticipationRecord[];
  /** All comparable sectors, ordered by rank gain then return-change pp. */
  movements: SectorRankMovement[];
  /** This identical cohort supplies BOTH movement rankings (1,1,3 for ties). */
  rankingCohort: { tickers: PriceParticipationSectorTicker[]; covered: number; total: 11 };
  coverage: { current: number; previous: number; comparable: number; total: 11 };
  warnings: SectorParticipationWarning[];
}

export class SectorParticipationDataError extends Error {
  constructor(message: string) { super(message); this.name = "SectorParticipationDataError"; }
}

function validDate(value: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const instant = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(instant) && new Date(instant).toISOString().slice(0, 10) === value;
}

function seriesMaps(input: PriceParticipationInput) {
  const required = new Set<string>(["SPY", ...PRICE_PARTICIPATION_SECTOR_TICKERS]);
  const result = new Map<string, Map<string, SectorParticipationPoint>>();
  for (const series of input.series) {
    if (!required.has(series.ticker)) continue;
    if (result.has(series.ticker)) throw new SectorParticipationDataError(`Duplicate price series: ${series.ticker}`);
    const points = new Map<string, SectorParticipationPoint>();
    for (const point of series.points) {
      if (!validDate(point.date) || (point.close !== null &&
          (typeof point.close !== "number" || !Number.isFinite(point.close) || point.close <= 0))) {
        throw new SectorParticipationDataError(`Invalid price observation: ${series.ticker}`);
      }
      const previous = points.get(point.date);
      if (previous && previous.close !== point.close) throw new SectorParticipationDataError(`Conflicting price observation: ${series.ticker}`);
      points.set(point.date, { date: point.date, close: point.close });
    }
    result.set(series.ticker, points);
  }
  return result;
}

function returnPct(latest: number | null | undefined, previous: number | null | undefined) {
  if (latest == null || previous == null) return null;
  const value = 100 * (latest / previous - 1);
  return Number.isFinite(value) ? value : null;
}

/** Competition ranks preserve real ties: two first places are followed by third. */
function competitionRanks(values: Map<PriceParticipationSectorTicker, number | null>, cohort: readonly PriceParticipationSectorTicker[]) {
  const ordered = cohort.filter(ticker => values.get(ticker) !== null && values.has(ticker))
    .sort((a, b) => values.get(b)! - values.get(a)! || a.localeCompare(b));
  const ranks = new Map<PriceParticipationSectorTicker, number>();
  let rank = 0;
  ordered.forEach((ticker, index) => {
    if (index === 0 || values.get(ticker) !== values.get(ordered[index - 1])) rank = index + 1;
    ranks.set(ticker, rank);
  });
  return ranks;
}

/**
 * Sector detail and adjacent-window comparison only. It accepts the dashboard's
 * existing common cutoff and never changes that cutoff or any market model.
 */
export function buildSectorParticipation(
  input: PriceParticipationInput,
  sessions: PriceParticipationWindow,
  cutoffDate: string | null,
): SectorParticipationView {
  if (!(PRICE_PARTICIPATION_WINDOWS as readonly number[]).includes(sessions)) throw new SectorParticipationDataError("Unsupported sector session window");
  if (!validDate(input.priceThrough)) throw new SectorParticipationDataError("Invalid completed-price cutoff");
  const maps = seriesMaps(input);
  const calendar = [...(maps.get("SPY")?.keys() ?? [])].filter(date => date <= input.priceThrough).sort();
  const endIndex = cutoffDate === null ? -1 : calendar.indexOf(cutoffDate);
  if (cutoffDate !== null && (!validDate(cutoffDate) || endIndex < 0)) {
    throw new SectorParticipationDataError("Sector cutoff is outside the published SPY calendar");
  }
  const comparisonDate = endIndex >= sessions ? calendar[endIndex - sessions] : null;
  const previousCutoffDate = comparisonDate;
  const previousComparisonDate = endIndex >= 2 * sessions ? calendar[endIndex - 2 * sessions] : null;
  const selectedDates = endIndex < 0 ? [] : calendar.slice(Math.max(0, endIndex - sessions), endIndex + 1);
  const value = (ticker: string, date: string | null) => date === null ? null : maps.get(ticker)?.get(date)?.close ?? null;
  const calculate = (ticker: string, end: string | null, start: string | null) => returnPct(value(ticker, end), value(ticker, start));
  const windowValues = new Map<PriceParticipationWindow, Map<PriceParticipationSectorTicker, number | null>>();
  const windowRanks = new Map<PriceParticipationWindow, Map<PriceParticipationSectorTicker, number>>();
  for (const window of PRICE_PARTICIPATION_WINDOWS) {
    const start = endIndex >= window ? calendar[endIndex - window] : null;
    const values = new Map(PRICE_PARTICIPATION_SECTOR_TICKERS.map(ticker => [ticker, calculate(ticker, cutoffDate, start)]));
    windowValues.set(window, values);
    windowRanks.set(window, competitionRanks(values, PRICE_PARTICIPATION_SECTOR_TICKERS));
  }
  const currentValues = windowValues.get(sessions)!;
  const previousValues = new Map(PRICE_PARTICIPATION_SECTOR_TICKERS.map(ticker =>
    [ticker, calculate(ticker, previousCutoffDate, previousComparisonDate)]));
  const cohort = PRICE_PARTICIPATION_SECTOR_TICKERS.filter(ticker =>
    currentValues.get(ticker) !== null && previousValues.get(ticker) !== null).sort();
  const currentRanks = competitionRanks(currentValues, cohort);
  const previousRanks = competitionRanks(previousValues, cohort);
  const sectors: SectorParticipationRecord[] = PRICE_PARTICIPATION_SECTOR_TICKERS.map(ticker => {
    const current = currentValues.get(ticker) ?? null;
    const previous = previousValues.get(ticker) ?? null;
    const rank = currentRanks.get(ticker) ?? null;
    const previousRank = previousRanks.get(ticker) ?? null;
    return {
      ticker, close: value(ticker, cutoffDate), returnPct: current, previousReturnPct: previous,
      rank, previousRank, rankChange: rank === null || previousRank === null ? null : previousRank - rank,
      returnChangePp: current === null || previous === null ? null : current - previous,
      points: selectedDates.map(date => ({ date, close: value(ticker, date) })),
      windows: PRICE_PARTICIPATION_WINDOWS.map(window => ({
        sessions: window, returnPct: windowValues.get(window)!.get(ticker) ?? null,
        rank: windowRanks.get(window)!.get(ticker) ?? null, covered: windowRanks.get(window)!.size,
      })),
    };
  }).sort((a, b) => {
    if (a.returnPct === null && b.returnPct !== null) return 1;
    if (a.returnPct !== null && b.returnPct === null) return -1;
    return (b.returnPct ?? 0) - (a.returnPct ?? 0) || a.ticker.localeCompare(b.ticker);
  });
  const movements: SectorRankMovement[] = sectors.flatMap(sector => sector.rank === null || sector.previousRank === null ? [] : [{
    ticker: sector.ticker, rank: sector.rank, previousRank: sector.previousRank, rankChange: sector.rankChange!,
    returnPct: sector.returnPct!, previousReturnPct: sector.previousReturnPct!, returnChangePp: sector.returnChangePp!,
  }]).sort((a, b) => b.rankChange - a.rankChange || b.returnChangePp - a.returnChangePp || a.ticker.localeCompare(b.ticker));
  const currentCoverage = [...currentValues.values()].filter(value => value !== null).length;
  const previousCoverage = [...previousValues.values()].filter(value => value !== null).length;
  const warnings: SectorParticipationWarning[] = [];
  if (cutoffDate === null) warnings.push("no-cutoff");
  if (cutoffDate !== null && comparisonDate === null) warnings.push("insufficient-current-history");
  if (cutoffDate !== null && previousComparisonDate === null) warnings.push("insufficient-previous-history");
  if (currentCoverage < 11) warnings.push("partial-current-coverage");
  if (previousCoverage < 11) warnings.push("partial-previous-coverage");
  return {
    sessions, cutoffDate, comparisonDate, previousCutoffDate, previousComparisonDate, sectors, movements,
    rankingCohort: { tickers: cohort, covered: cohort.length, total: 11 },
    coverage: { current: currentCoverage, previous: previousCoverage, comparable: cohort.length, total: 11 }, warnings,
  };
}
