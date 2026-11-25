import assert from "node:assert/strict";
import test from "node:test";
import {
  ABSORPTION_HALF_LIFE,
  SECTOR_RISK_SYMBOLS,
  calculateHistoricalLossRisk,
  calculateSectorAbsorptionRatio,
  historicalSpyRisk,
  sectorAbsorptionRatio,
  type RiskPricePoint,
} from "./historical-risk.ts";

function near(actual: number | null | undefined, expected: number, tolerance = 1e-12) {
  assert.ok(actual !== null && actual !== undefined && Math.abs(actual - expected) <= tolerance, `${actual} ≈ ${expected}`);
}

/** Deliberately explicit fixture calendar, not a provider/calendar implementation. */
function sessions(count: number) {
  const result: string[] = [];
  const day = new Date("2019-01-01T00:00:00Z");
  while (result.length < count) {
    if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6) result.push(day.toISOString().slice(0, 10));
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return result;
}

function prices(dates: string[], returns?: number[]): RiskPricePoint[] {
  let close = 100;
  return dates.map((date, index) => {
    if (index) close *= 1 + (returns?.[index - 1] ?? Math.sin(index * 0.37) / 100);
    return { date, close };
  });
}

test("ES uses exactly the largest 63 losses; VaR uses one-based nearest rank 1197", () => {
  const calculated = calculateHistoricalLossRisk(Array.from({ length: 1260 }, (_, index) => -(index + 1) / 10000));
  assert.ok(calculated);
  // Losses 0.0001…0.1260. Mean of 0.1198…0.1260 = (0.1198+0.1260)/2.
  near(calculated.var95, 0.1197);
  near(calculated.es95, 0.1229);
  assert.ok(calculated.es95 >= calculated.var95);
});

test("tail ties do not expand ES beyond exactly 63 observations", () => {
  const calculated = calculateHistoricalLossRisk([...Array<number>(1196).fill(0), ...Array<number>(63).fill(-0.01), -0.64]);
  assert.ok(calculated);
  near(calculated.var95, 0.01);
  // 62 of the tied 1% losses, plus the 64% loss: (62*1+64)/63 = 2%.
  near(calculated.es95, 0.02);
});

test("all positive returns remain negative losses, without absolute values or zero truncation", () => {
  const calculated = calculateHistoricalLossRisk(Array<number>(1260).fill(0.01));
  assert.ok(calculated);
  near(calculated.es95, -0.01);
  near(calculated.var95, -0.01);
  assert.equal(calculated.es95, calculated.var95);
});

test("historical loss specification never shortens the 1260-return window", () => {
  assert.equal(calculateHistoricalLossRisk(Array<number>(1259).fill(0)), null);
  assert.equal(calculateHistoricalLossRisk(Array<number>(1261).fill(0)), null);
  assert.equal(calculateHistoricalLossRisk([...Array<number>(1259).fill(0), Number.NaN]), null);
});

test("1261 adjusted closes produce 1260 dated SPY observations", () => {
  const dates = sessions(1261);
  const result = historicalSpyRisk(prices(dates), dates);
  assert.equal(result.status, "available");
  assert.equal(result.observations, 1260);
  assert.equal(result.firstCloseDate, dates[0]);
  assert.equal(result.firstReturnDate, dates[1]);
  assert.equal(result.lastUpdated, dates.at(-1));
  assert.ok(result.es95! >= result.var95!);
});

test("missing SPY session is rejected and never becomes a multi-session daily return", () => {
  const dates = sessions(1261);
  const result = historicalSpyRisk(prices(dates).filter((_, index) => index !== 500), dates);
  assert.equal(result.status, "unavailable");
  assert.equal(result.observations, 1258);
  assert.match(result.reason!, /missing session/);
  assert.equal(result.es95, null);
});

test("SPY duplicate dates, invalid prices and incomplete calendar reject explicitly", () => {
  const dates = sessions(1261);
  const series = prices(dates);
  assert.match(historicalSpyRisk([...series, series[0]], dates).reason!, /Duplicate/);
  assert.match(historicalSpyRisk([{ ...series[0], close: 0 }, ...series.slice(1)], dates).reason!, /Invalid adjusted close/);
  assert.match(historicalSpyRisk(series, dates.slice(1)).reason!, /1260\/1261/);
  assert.match(historicalSpyRisk(series, [...dates, dates[3]]).reason!, /duplicate trading-session/);
});

test("past SPY metric uses only observations available at its own date", () => {
  const dates = sessions(1300);
  const series = prices(dates);
  const asOf = dates[1260];
  const original = historicalSpyRisk(series.slice(0, 1261), dates.slice(0, 1261), asOf);
  const withFuture = historicalSpyRisk(series.map((point, index) => index > 1260 ? { ...point, close: 999999999 } : point), dates, asOf);
  assert.deepEqual(withFuture, original);
});

test("AR is one for a single common varying factor across all 11 sectors", () => {
  const rows = Array.from({ length: 500 }, (_, row) => SECTOR_RISK_SYMBOLS.map((_, column) => Math.sin(row * 0.31) * 0.0002 * (column + 1)));
  near(calculateSectorAbsorptionRatio(rows), 1);
});

test("AR uses covariance without standardizing sector variances into correlations", () => {
  const weights = Array.from({ length: 500 }, (_, row) => 2 ** (-(499 - row) / ABSORPTION_HALF_LIFE));
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const normalized = weights.map((weight) => weight / weightSum);
  const columns: number[][] = [];
  const dot = (left: number[], right: number[]) => left.reduce((sum, value, index) => sum + normalized[index] * value * right[index], 0);
  // Weighted Gram-Schmidt creates 11 exactly centered independent factors.
  for (let column = 0; column < 11; column += 1) {
    let values: number[] = Array.from({ length: 500 }, (_, row) => row === column ? 1 : 0);
    const mean = values.reduce((sum, value, row) => sum + normalized[row] * value, 0);
    values = values.map((value) => value - mean);
    for (const previous of columns) {
      const projection = dot(values, previous);
      values = values.map((value, row) => value - projection * previous[row]);
    }
    const norm = Math.sqrt(dot(values, values));
    columns.push(values.map((value) => value / norm));
  }
  const isotropic = Array.from({ length: 500 }, (_, row) => columns.map((column) => column[row] * 0.0001));
  near(calculateSectorAbsorptionRatio(isotropic), 2 / 11);
  const heteroskedastic = isotropic.map((row) => row.map((value, column) => value * (column + 1)));
  // Eigenvalues proportional to 1²…11². Largest two: (121+100)/506.
  near(calculateSectorAbsorptionRatio(heteroskedastic), 221 / 506);
});

test("AR is invariant to ETF order and lies between 2/11 and one", () => {
  const rows = Array.from({ length: 500 }, (_, row) => SECTOR_RISK_SYMBOLS.map((_, column) => 0.01 * Math.sin(row * (column + 1) * 0.021) + 0.001 * Math.cos(row * 0.13)));
  const original = calculateSectorAbsorptionRatio(rows);
  const reordered = calculateSectorAbsorptionRatio(rows.map((row) => [...row].reverse()));
  assert.ok(original !== null && original >= 2 / 11 && original <= 1);
  near(reordered, original);
});

test("AR is unavailable for a zero-variance matrix, incomplete universe or wrong window", () => {
  assert.equal(calculateSectorAbsorptionRatio(Array.from({ length: 500 }, () => Array<number>(11).fill(0.01))), null);
  assert.equal(calculateSectorAbsorptionRatio(Array.from({ length: 499 }, () => Array<number>(11).fill(0))), null);
  assert.equal(calculateSectorAbsorptionRatio(Array.from({ length: 500 }, () => Array<number>(10).fill(0))), null);
});

test("AR requires 501 closes on every consecutive calendar session for all fixed ETFs", () => {
  const dates = sessions(501);
  const histories = SECTOR_RISK_SYMBOLS.map((symbol, index) => ({ symbol, prices: prices(dates, dates.slice(1).map((_, row) => Math.sin(row * (index + 1) * 0.05) / 100)) }));
  const result = sectorAbsorptionRatio(histories, dates);
  assert.equal(result.status, "available");
  assert.equal(result.observations, 500);
  assert.equal(result.firstReturnDate, dates[1]);
  assert.deepEqual(sectorAbsorptionRatio([...histories].reverse(), dates), result);
  assert.equal(sectorAbsorptionRatio(histories.slice(1), dates).status, "unavailable");
  assert.match(sectorAbsorptionRatio([...histories.slice(1), histories[1]], dates).reason!, /all 11 fixed/);
  const missing = histories.map((history, index) => index ? history : { ...history, prices: history.prices.filter((_, row) => row !== 200) });
  assert.match(sectorAbsorptionRatio(missing, dates).reason!, /XLB.*missing session/);
});

test("past AR and its exponentially weighted means ignore every future observation", () => {
  const dates = sessions(550);
  const histories = SECTOR_RISK_SYMBOLS.map((symbol, index) => ({ symbol, prices: prices(dates, dates.slice(1).map((_, row) => Math.sin(row * (index + 1) * 0.05) / 100)) }));
  const asOf = dates[500];
  const original = sectorAbsorptionRatio(histories.map((history) => ({ ...history, prices: history.prices.slice(0, 501) })), dates.slice(0, 501), asOf);
  const withFuture = sectorAbsorptionRatio(histories.map((history) => ({ ...history, prices: history.prices.map((point, row) => row > 500 ? { ...point, close: 987654321 } : point) })), dates, asOf);
  assert.equal(original.status, "available");
  assert.deepEqual(withFuture, original);
});
