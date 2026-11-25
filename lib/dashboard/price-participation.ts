import type { McClellanPreviewData, McClellanPreviewPoint } from "./mcclellan-preview-types";

export const PRICE_PARTICIPATION_WINDOWS = [5, 20, 60] as const;
export const PRICE_PARTICIPATION_SECTOR_TICKERS = [
  "XLK", "XLF", "XLV", "XLE", "XLY", "XLP", "XLI", "XLB", "XLU", "XLRE", "XLC",
] as const;
export type PriceParticipationWindow = (typeof PRICE_PARTICIPATION_WINDOWS)[number];
export type PriceParticipationSectorTicker = (typeof PRICE_PARTICIPATION_SECTOR_TICKERS)[number];
/** Already-adjusted, completed daily observations; null remains a published gap. */
export type PricePoint = { date: string; close: number | null };
export type PriceSeries = { ticker: string; points: PricePoint[] };
export type PriceParticipationAuthority = {
  id: string; revision?: string; retrievedAt: string; sourceUrl: string;
};
export interface PriceParticipationInput {
  series: PriceSeries[];
  breadth: McClellanPreviewData | null;
  priceThrough: string;
  authority: PriceParticipationAuthority;
  refreshStatus: "current" | "retained" | "unavailable";
}
export type PriceParticipationRow = {
  date: string;
  spyClose: number | null;
  rspClose: number | null;
  spyNormalized: number | null;
  rspNormalized: number | null;
  oscillator: number | null;
  summation: number | null;
  advances: number | null;
  declines: number | null;
};
export type PriceParticipationWarning =
  | "spy-unavailable" | "rsp-unavailable" | "breadth-unavailable" | "no-common-cutoff"
  | "insufficient-history" | "missing-spy-endpoint" | "missing-rsp-endpoint"
  | "partial-sector-coverage" | "aligned-to-earlier-cutoff" | "breadth-stale"
  | "price-refresh-retained" | "price-refresh-unavailable";
export interface PriceParticipationView {
  sessions: PriceParticipationWindow;
  priceAvailableThrough: string | null;
  breadthAvailableThrough: string | null;
  cutoffDate: string | null;
  comparisonDate: string | null;
  spy: { close: number | null; returnPct: number | null };
  rsp: { close: number | null; returnPct: number | null; relativePp: number | null };
  /** All N+1 SPY-calendar rows, including null values; suitable for charts and CSV. */
  rows: PriceParticipationRow[];
  normalized: Array<{ date: string; spy: number | null; rsp: number | null }>;
  /** Original mature McClellan points: copied, never recalculated or rebased. */
  breadth: {
    points: McClellanPreviewPoint[];
    last: McClellanPreviewPoint | null;
    stale: boolean;
    sourceCutoffDate: string;
  } | null;
  /** Descending observed return; ties alphabetical, missing values always last. */
  sectors: Array<{ ticker: PriceParticipationSectorTicker; returnPct: number | null }>;
  participation: { positive: number; negative: number; flat: number; covered: number; total: 11 };
  coverage: {
    spy: boolean; rsp: boolean; breadth: boolean; sectors: number;
    requiredObservations: number; availableObservations: number; breadthObservations: number;
  };
  authority: PriceParticipationAuthority;
  refreshStatus: PriceParticipationInput["refreshStatus"];
  warnings: PriceParticipationWarning[];
}

export class PriceParticipationDataError extends Error {
  constructor(message: string) { super(message); this.name = "PriceParticipationDataError"; }
}

function validDate(value: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const instant = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(instant) && new Date(instant).toISOString().slice(0, 10) === value;
}

function priceMaps(series: PriceSeries[]) {
  const result = new Map<string, Map<string, PricePoint>>();
  for (const asset of series) {
    if (!asset.ticker || result.has(asset.ticker)) throw new PriceParticipationDataError("Duplicate or missing price-series ticker");
    const points = new Map<string, PricePoint>();
    for (const point of asset.points) {
      if (!validDate(point.date)) throw new PriceParticipationDataError(`Invalid ${asset.ticker} observation date`);
      if (point.close !== null && (typeof point.close !== "number" || !Number.isFinite(point.close) || point.close <= 0)) {
        throw new PriceParticipationDataError(`Invalid ${asset.ticker} adjusted close`);
      }
      const prior = points.get(point.date);
      if (prior && prior.close !== point.close) throw new PriceParticipationDataError(`Conflicting ${asset.ticker} observations for ${point.date}`);
      points.set(point.date, { date: point.date, close: point.close });
    }
    result.set(asset.ticker, points);
  }
  return result;
}

function breadthMap(data: McClellanPreviewData | null) {
  const points = new Map<string, McClellanPreviewPoint>();
  if (!data) return points;
  if (!validDate(data.cutoffDate)) throw new PriceParticipationDataError("Invalid McClellan cutoff date");
  for (const point of data.points) {
    if (!validDate(point.date) || ![point.oscillator, point.summation].every(Number.isFinite) ||
        ![point.advances, point.declines].every(value => Number.isSafeInteger(value) && value >= 0)) {
      throw new PriceParticipationDataError("Invalid McClellan observation");
    }
    const prior = points.get(point.date);
    if (prior && ["oscillator", "summation", "advances", "declines"].some(key =>
      prior[key as keyof McClellanPreviewPoint] !== point[key as keyof McClellanPreviewPoint])) {
      throw new PriceParticipationDataError(`Conflicting McClellan observations for ${point.date}`);
    }
    // The existing source's completed cutoff remains authoritative, even if its
    // input happens to include a later point. Never reclassify a session here.
    if (point.date <= data.cutoffDate) points.set(point.date, { ...point });
  }
  return points;
}

function percentageReturn(latest: number | null | undefined, earlier: number | null | undefined) {
  if (latest == null || earlier == null) return null;
  const value = 100 * (latest / earlier - 1);
  return Number.isFinite(value) ? value : null;
}

function rebased(value: number | null, base: number | null) {
  if (value === null || base === null) return null;
  const result = 100 * (value / base);
  return Number.isFinite(result) ? result : null;
}

/**
 * Calendar alignment and arithmetic only. Source adjustment, completed-session
 * admission and RAMO/RASI calculations belong to their existing source loaders.
 */
export function buildPriceParticipation(input: PriceParticipationInput, sessions: PriceParticipationWindow = 20): PriceParticipationView {
  if (!(PRICE_PARTICIPATION_WINDOWS as readonly number[]).includes(sessions)) throw new PriceParticipationDataError("Unsupported published-session window");
  if (!validDate(input.priceThrough)) throw new PriceParticipationDataError("Invalid completed-price cutoff date");
  const maps = priceMaps(input.series);
  const spy = maps.get("SPY") ?? new Map<string, PricePoint>();
  const rsp = maps.get("RSP") ?? new Map<string, PricePoint>();
  const breadth = breadthMap(input.breadth);
  const calendar = [...spy.keys()].filter(date => date <= input.priceThrough).sort();
  const priceAvailableThrough = calendar.at(-1) ?? null;
  const breadthAvailableThrough = [...breadth.keys()].sort().at(-1) ?? null;
  // Presence, not a non-null value, establishes a dated observation. Filtering
  // missing closes here would silently move the requested comparison endpoints.
  const commonDates = calendar.filter(date => (!rsp.size || rsp.has(date)) && (!breadth.size || breadth.has(date)));
  const cutoffDate = commonDates.at(-1) ?? null;
  const endIndex = cutoffDate === null ? -1 : calendar.indexOf(cutoffDate);
  const comparisonDate = endIndex >= sessions ? calendar[endIndex - sessions] : null;
  const selectedDates = endIndex < 0 ? [] : calendar.slice(Math.max(0, endIndex - sessions), endIndex + 1);
  const latestSpy = cutoffDate ? spy.get(cutoffDate)?.close ?? null : null;
  const latestRsp = cutoffDate ? rsp.get(cutoffDate)?.close ?? null : null;
  const baseSpy = comparisonDate ? spy.get(comparisonDate)?.close ?? null : null;
  const baseRsp = comparisonDate ? rsp.get(comparisonDate)?.close ?? null : null;
  const spyReturn = percentageReturn(latestSpy, baseSpy);
  const rspReturn = percentageReturn(latestRsp, baseRsp);
  const rows: PriceParticipationRow[] = selectedDates.map(date => {
    const spyClose = spy.get(date)?.close ?? null;
    const rspClose = rsp.get(date)?.close ?? null;
    const point = breadth.get(date);
    return {
      date, spyClose, rspClose,
      spyNormalized: rebased(spyClose, baseSpy), rspNormalized: rebased(rspClose, baseRsp),
      oscillator: point?.oscillator ?? null, summation: point?.summation ?? null,
      advances: point?.advances ?? null, declines: point?.declines ?? null,
    };
  });
  const sectors = PRICE_PARTICIPATION_SECTOR_TICKERS.map(ticker => ({
    ticker,
    returnPct: cutoffDate && comparisonDate
      ? percentageReturn(maps.get(ticker)?.get(cutoffDate)?.close, maps.get(ticker)?.get(comparisonDate)?.close)
      : null,
  })).sort((a, b) => {
    if (a.returnPct === null && b.returnPct !== null) return 1;
    if (a.returnPct !== null && b.returnPct === null) return -1;
    return (b.returnPct ?? 0) - (a.returnPct ?? 0) || a.ticker.localeCompare(b.ticker);
  });
  const positive = sectors.filter(item => item.returnPct !== null && item.returnPct > 0).length;
  const negative = sectors.filter(item => item.returnPct !== null && item.returnPct < 0).length;
  const flat = sectors.filter(item => item.returnPct === 0).length;
  const covered = positive + negative + flat;
  const breadthPoints = selectedDates.flatMap(date => breadth.has(date) ? [{ ...breadth.get(date)! }] : []);
  const lastBreadth = cutoffDate ? breadth.get(cutoffDate) ?? null : null;
  const warnings: PriceParticipationWarning[] = [];
  if (!calendar.length) warnings.push("spy-unavailable");
  if (!rsp.size) warnings.push("rsp-unavailable");
  if (!breadth.size) warnings.push("breadth-unavailable");
  if (calendar.length && cutoffDate === null) warnings.push("no-common-cutoff");
  if (cutoffDate && comparisonDate === null) warnings.push("insufficient-history");
  if (comparisonDate && spyReturn === null) warnings.push("missing-spy-endpoint");
  if (comparisonDate && rsp.size && rspReturn === null) warnings.push("missing-rsp-endpoint");
  if (covered < 11) warnings.push("partial-sector-coverage");
  if (cutoffDate && priceAvailableThrough && cutoffDate < priceAvailableThrough) warnings.push("aligned-to-earlier-cutoff");
  if (input.breadth?.stale) warnings.push("breadth-stale");
  if (input.refreshStatus === "retained") warnings.push("price-refresh-retained");
  if (input.refreshStatus === "unavailable") warnings.push("price-refresh-unavailable");
  return {
    sessions, priceAvailableThrough, breadthAvailableThrough, cutoffDate, comparisonDate,
    spy: { close: latestSpy, returnPct: spyReturn },
    rsp: { close: latestRsp, returnPct: rspReturn, relativePp: spyReturn === null || rspReturn === null ? null : rspReturn - spyReturn },
    rows,
    normalized: rows.map(row => ({ date: row.date, spy: row.spyNormalized, rsp: row.rspNormalized })),
    breadth: breadth.size && input.breadth ? {
      points: breadthPoints, last: lastBreadth ? { ...lastBreadth } : null,
      stale: input.breadth.stale, sourceCutoffDate: input.breadth.cutoffDate,
    } : null,
    sectors, participation: { positive, negative, flat, covered, total: 11 },
    coverage: {
      spy: spyReturn !== null, rsp: rspReturn !== null, breadth: lastBreadth !== null,
      sectors: covered, requiredObservations: sessions + 1, availableObservations: selectedDates.length,
      breadthObservations: breadthPoints.length,
    },
    authority: { ...input.authority }, refreshStatus: input.refreshStatus, warnings,
  };
}

/** Export only the displayed dates; blanks remain absent, never zero-filled. */
export function exportPriceParticipationCsv(view: PriceParticipationView) {
  const header = [
    "Date", "Source SPY adjusted close (USD)", "Source RSP adjusted close (USD)",
    "Derived SPY rebased to 100 at comparison date", "Derived RSP rebased to 100 at comparison date",
    "Source advancing issues", "Source declining issues", "Calculated RAMO (existing methodology)", "Calculated RASI (existing methodology)",
    "Derived window SPY return (%)", "Derived window RSP return (%)", "Derived window RSP minus SPY (percentage points)",
    "Window comparison date", "Window effective date", "Window session intervals", "Price available through", "Breadth available through",
    "Price authority identifier", "Price authority revision", "Price source URL", "Price retrieved at", "Price refresh status",
  ];
  const records = view.rows.map(row => [
    row.date, row.spyClose, row.rspClose, row.spyNormalized, row.rspNormalized,
    row.advances, row.declines, row.oscillator, row.summation,
    view.spy.returnPct, view.rsp.returnPct, view.rsp.relativePp,
    view.comparisonDate, view.cutoffDate, view.sessions, view.priceAvailableThrough, view.breadthAvailableThrough,
    view.authority.id, view.authority.revision ?? null, view.authority.sourceUrl, view.authority.retrievedAt, view.refreshStatus,
  ]);
  const cell = (value: number | string | null) => {
    if (value === null) return "";
    const text = typeof value === "number" && Object.is(value, -0) ? "-0" : String(value);
    return /[",\r\n]/u.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
  };
  return [header, ...records].map(row => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
