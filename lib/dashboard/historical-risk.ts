/** Fixed specifications for this dashboard application, not regulatory defaults. */
export const SPY_RISK_WINDOW = 1260;
export const SPY_RISK_TAIL_COUNT = 63;
export const SPY_VAR_NEAREST_RANK = 1197;
export const ABSORPTION_WINDOW = 500;
export const ABSORPTION_HALF_LIFE = 250;
export const ABSORPTION_COMPONENTS = 2;
export const SECTOR_RISK_SYMBOLS = ["XLB", "XLC", "XLE", "XLF", "XLI", "XLK", "XLP", "XLRE", "XLU", "XLV", "XLY"] as const;

/** close must already be adjusted for both splits and cash distributions. */
export type RiskPricePoint = { date: string; close: number };
export type RiskPriceHistory = { symbol: string; prices: RiskPricePoint[] };

type WindowMetadata = {
  status: "available" | "unavailable";
  observations: number;
  firstCloseDate: string | null;
  firstReturnDate: string | null;
  lastUpdated: string | null;
  reason: string | null;
};

export type HistoricalSpyRisk = WindowMetadata & {
  /** Decimal losses, deliberately signed: an all-positive-return sample has negative losses. */
  es95: number | null;
  var95: number | null;
  tailCount: 63;
  varRank: 1197;
};

export type SectorAbsorptionRisk = WindowMetadata & {
  /** Fraction of covariance variance explained by the two largest components. */
  ratio: number | null;
  universe: readonly string[];
  components: 2;
  halfLife: 250;
};

/** Input returns are simple daily returns in decimals. Never take their absolute values. */
export function calculateHistoricalLossRisk(returns: readonly number[]) {
  if (returns.length !== SPY_RISK_WINDOW || returns.some((value) => !Number.isFinite(value) || value < -1)) return null;
  const losses = returns.map((value) => -value).sort((left, right) => left - right);
  const var95 = losses[SPY_VAR_NEAREST_RANK - 1];
  // Exactly 63 order statistics, including ties. A threshold filter would change the tail mass.
  const tail = losses.slice(-SPY_RISK_TAIL_COUNT);
  // Anchored mean also preserves ES = VaR exactly for an entirely tied tail.
  const es95 = tail[0] + tail.reduce((sum, value) => sum + (value - tail[0]) / SPY_RISK_TAIL_COUNT, 0);
  return Number.isFinite(es95) && Number.isFinite(var95) ? { es95, var95 } : null;
}

/** Eigenvalues of a real symmetric matrix using converged Jacobi rotations. */
function symmetricEigenvalues(input: number[][]) {
  const matrix = input.map((row) => [...row]);
  const size = matrix.length;
  const scale = Math.max(...matrix.map((row, index) => Math.abs(row[index])));
  if (!Number.isFinite(scale) || scale === 0) return null;
  for (let iteration = 0; iteration < 100 * size * size; iteration += 1) {
    let p = 0;
    let q = 1;
    let largest = 0;
    for (let left = 0; left < size; left += 1) {
      for (let right = left + 1; right < size; right += 1) {
        if (Math.abs(matrix[left][right]) > largest) {
          largest = Math.abs(matrix[left][right]);
          p = left;
          q = right;
        }
      }
    }
    if (largest <= scale * 1e-14) {
      const values = matrix.map((row, index) => row[index]);
      if (values.some((value) => !Number.isFinite(value) || value < -scale * 1e-12)) return null;
      // A covariance matrix is PSD. Remove only floating-point negative roundoff.
      return values.map((value) => value < 0 ? 0 : value).sort((left, right) => right - left);
    }
    const pp = matrix[p][p];
    const qq = matrix[q][q];
    const pq = matrix[p][q];
    const angle = 0.5 * Math.atan2(2 * pq, qq - pp);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    for (let index = 0; index < size; index += 1) {
      if (index === p || index === q) continue;
      const ip = matrix[index][p];
      const iq = matrix[index][q];
      matrix[index][p] = matrix[p][index] = cosine * ip - sine * iq;
      matrix[index][q] = matrix[q][index] = sine * ip + cosine * iq;
    }
    matrix[p][p] = cosine * cosine * pp - 2 * sine * cosine * pq + sine * sine * qq;
    matrix[q][q] = sine * sine * pp + 2 * sine * cosine * pq + cosine * cosine * qq;
    matrix[p][q] = matrix[q][p] = 0;
  }
  return null;
}

/**
 * Rows are 500 chronologically ordered sessions; columns are all 11 fixed sectors.
 * Exponential population covariance with its own weighted mean. An unbiased scalar
 * covariance correction would cancel out of the eigenvalue ratio.
 */
export function calculateSectorAbsorptionRatio(rows: readonly (readonly number[])[]) {
  const size = SECTOR_RISK_SYMBOLS.length;
  if (rows.length !== ABSORPTION_WINDOW || rows.some((row) => row.length !== size || row.some((value) => !Number.isFinite(value) || value <= -1))) return null;
  const rawWeights = rows.map((_, index) => 2 ** (-(rows.length - 1 - index) / ABSORPTION_HALF_LIFE));
  const weightSum = rawWeights.reduce((sum, weight) => sum + weight, 0);
  const weights = rawWeights.map((weight) => weight / weightSum);
  // Work relative to an anchor so an exactly constant series has exactly zero variance.
  const anchors = [...rows[0]];
  const meanOffsets = anchors.map((anchor, column) => rows.reduce((sum, row, index) => sum + weights[index] * (row[column] - anchor), 0));
  const covariance = Array.from({ length: size }, () => Array<number>(size).fill(0));
  for (let index = 0; index < rows.length; index += 1) {
    const centered = rows[index].map((value, column) => value - anchors[column] - meanOffsets[column]);
    for (let left = 0; left < size; left += 1) {
      for (let right = left; right < size; right += 1) {
        covariance[left][right] += weights[index] * centered[left] * centered[right];
      }
    }
  }
  for (let left = 0; left < size; left += 1) {
    for (let right = left + 1; right < size; right += 1) covariance[right][left] = covariance[left][right];
  }
  const eigenvalues = symmetricEigenvalues(covariance);
  if (!eigenvalues) return null;
  const total = eigenvalues.reduce((sum, value) => sum + value, 0);
  if (!(total > 0) || !Number.isFinite(total)) return null;
  const ratio = (eigenvalues[0] + eigenvalues[1]) / total;
  return Number.isFinite(ratio) && ratio >= 0 && ratio <= 1 ? ratio : null;
}

function isIsoDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const milliseconds = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString().slice(0, 10) === date;
}

/** The caller supplies a verified complete trading-session calendar, including holidays. */
function selectSessionWindow(sessionDates: readonly string[], lastUpdated: string, window: number) {
  if (!isIsoDate(lastUpdated)) return { reason: "Invalid calculation date", dates: [] as string[] };
  const eligible = sessionDates.filter((date) => date <= lastUpdated);
  if (eligible.some((date) => !isIsoDate(date)) || new Set(eligible).size !== eligible.length) return { reason: "Invalid or duplicate trading-session dates", dates: [] as string[] };
  const dates = [...eligible].sort().slice(-(window + 1));
  if (dates.at(-1) !== lastUpdated) return { reason: `Trading-session calendar does not include ${lastUpdated}`, dates };
  if (dates.length !== window + 1) return { reason: `Trading-session calendar: ${dates.length}/${window + 1} closes`, dates };
  return { reason: null, dates };
}

function pricesByDate(prices: readonly RiskPricePoint[], asOf: string) {
  const result = new Map<string, number>();
  for (const point of prices) {
    // Ignore all future prices before validation as well as before calculation.
    if (point.date > asOf) continue;
    if (!isIsoDate(point.date) || !Number.isFinite(point.close) || point.close <= 0) return { reason: `Invalid adjusted close on ${point.date}`, prices: result };
    if (result.has(point.date)) return { reason: `Duplicate adjusted close on ${point.date}`, prices: result };
    result.set(point.date, point.close);
  }
  return { reason: null, prices: result };
}

function dailyWindow(prices: Map<string, number>, dates: string[]) {
  const missing = dates.filter((date) => !prices.has(date));
  const returns: number[] = [];
  for (let index = 1; index < dates.length; index += 1) {
    const prior = prices.get(dates[index - 1]);
    const current = prices.get(dates[index]);
    // Never bridge a missing session. Both prices must belong to consecutive sessions.
    if (prior !== undefined && current !== undefined) returns.push(current / prior - 1);
  }
  return { returns, missing };
}

export function historicalSpyRisk(prices: readonly RiskPricePoint[], sessionDates: readonly string[], asOf?: string): HistoricalSpyRisk {
  const lastUpdated = asOf ?? prices.reduce<string | null>((latest, point) => latest === null || point.date > latest ? point.date : latest, null);
  const base: HistoricalSpyRisk = { status: "unavailable", es95: null, var95: null, observations: 0, tailCount: 63, varRank: 1197, firstCloseDate: null, firstReturnDate: null, lastUpdated, reason: "SPY adjusted-close history is empty" };
  if (lastUpdated === null) return base;
  const window = selectSessionWindow(sessionDates, lastUpdated, SPY_RISK_WINDOW);
  if (window.reason) return { ...base, reason: window.reason };
  const indexed = pricesByDate(prices, lastUpdated);
  if (indexed.reason) return { ...base, reason: indexed.reason };
  const selected = dailyWindow(indexed.prices, window.dates);
  const metadata = { ...base, observations: selected.returns.length, firstCloseDate: window.dates[0], firstReturnDate: window.dates[1] };
  if (selected.missing.length) return { ...metadata, reason: `SPY adjusted closes: ${window.dates.length - selected.missing.length}/${SPY_RISK_WINDOW + 1}; missing session ${selected.missing[0]}` };
  const calculated = calculateHistoricalLossRisk(selected.returns);
  return calculated ? { ...metadata, ...calculated, status: "available", reason: null } : { ...metadata, reason: "SPY return distribution is invalid" };
}

export function sectorAbsorptionRatio(histories: readonly RiskPriceHistory[], sessionDates: readonly string[], asOf?: string): SectorAbsorptionRisk {
  const latestDates = histories.map((history) => history.prices.reduce<string | null>((latest, point) => latest === null || point.date > latest ? point.date : latest, null));
  const lastUpdated = asOf ?? (latestDates.length && latestDates.every((date) => date !== null) ? [...latestDates as string[]].sort()[0] : null);
  const base: SectorAbsorptionRisk = { status: "unavailable", ratio: null, observations: 0, universe: [...SECTOR_RISK_SYMBOLS], components: 2, halfLife: 250, firstCloseDate: null, firstReturnDate: null, lastUpdated, reason: "Sector adjusted-close history is empty" };
  if (histories.length !== SECTOR_RISK_SYMBOLS.length || new Set(histories.map((history) => history.symbol)).size !== SECTOR_RISK_SYMBOLS.length || SECTOR_RISK_SYMBOLS.some((symbol) => !histories.some((history) => history.symbol === symbol))) return { ...base, reason: "Absorption ratio requires all 11 fixed sector ETFs, without duplicate symbols" };
  if (lastUpdated === null) return base;
  const window = selectSessionWindow(sessionDates, lastUpdated, ABSORPTION_WINDOW);
  if (window.reason) return { ...base, reason: window.reason };
  const columns: number[][] = [];
  for (const symbol of SECTOR_RISK_SYMBOLS) {
    const history = histories.find((entry) => entry.symbol === symbol)!;
    const indexed = pricesByDate(history.prices, lastUpdated);
    if (indexed.reason) return { ...base, reason: `${symbol}: ${indexed.reason}` };
    const selected = dailyWindow(indexed.prices, window.dates);
    if (selected.missing.length) return { ...base, observations: selected.returns.length, reason: `${symbol} adjusted closes: ${window.dates.length - selected.missing.length}/${ABSORPTION_WINDOW + 1}; missing session ${selected.missing[0]}` };
    columns.push(selected.returns);
  }
  const rows = Array.from({ length: ABSORPTION_WINDOW }, (_, index) => columns.map((column) => column[index]));
  const ratio = calculateSectorAbsorptionRatio(rows);
  const metadata = { ...base, observations: rows.length, firstCloseDate: window.dates[0], firstReturnDate: window.dates[1] };
  return ratio === null ? { ...metadata, reason: "Sector covariance has no positive variance or is numerically invalid" } : { ...metadata, ratio, status: "available", reason: null };
}
