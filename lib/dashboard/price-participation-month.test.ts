import assert from "node:assert/strict";
import test from "node:test";
import { sessionDates } from "../research/mcclellan-core.mjs";
import { buildPriceParticipation, PRICE_PARTICIPATION_SECTOR_TICKERS, type PriceParticipationInput } from "./price-participation";
import { buildPriceParticipationMonthSummary } from "./price-participation-month";

const dates = sessionDates("2026-08-03", "2026-11-23");
const nov = sessionDates("2026-10-30", "2026-11-23");
const asOf = "2026-11-25T12:00:00Z";
function fixture(): PriceParticipationInput {
  return {
    series: ["SPY", "RSP", ...PRICE_PARTICIPATION_SECTOR_TICKERS].map((ticker, asset) => ({
      ticker, points: dates.map((date, index) => {
        const monthIndex = nov.indexOf(date);
        const base = asset === 1 ? 200 : 100;
        const totalReturn = asset === 0 ? 0.1 : asset === 1 ? 0.15 : asset < 5 ? 0.1 : asset < 9 ? -0.1 : 0;
        return { date, close: monthIndex < 0 ? 50 + asset * 10 + index / 10 : base * (1 + totalReturn * monthIndex / (nov.length - 1)) };
      }),
    })),
    breadth: null, priceThrough: "2026-11-23",
    authority: { id: "adjusted-fixture", retrievedAt: asOf, sourceUrl: "https://finance.yahoo.com/" }, refreshStatus: "current",
  };
}
function near(value: number | null, expected: number) {
  assert.notEqual(value, null); assert.ok(Math.abs(value! - expected) < 1e-10, `${value} != ${expected}`);
}

test("MTD uses the prior month final exchange session, with hand-verifiable returns and eleven sectors", () => {
  const summary = buildPriceParticipationMonthSummary(fixture(), asOf);
  assert.equal(summary.month, "2026-11");
  assert.equal(summary.comparisonDate, "2026-10-30");
  assert.equal(summary.cutoffDate, "2026-11-23");
  near(summary.spyReturnPct, 10); near(summary.rspReturnPct, 15); near(summary.relativePp, 5);
  assert.deepEqual(summary.participation, { positive: 3, negative: 4, flat: 4, covered: 11, total: 11 });
  assert.equal(summary.sessions, nov.length - 1); assert.equal(summary.status, "available");
});

test("monthly values are independent from 5, 20 and 60 published-session details", () => {
  const input = fixture(), before = JSON.stringify(input);
  const monthly = buildPriceParticipationMonthSummary(input, asOf);
  const views = [5, 20, 60].map(value => buildPriceParticipation(input, value as 5 | 20 | 60));
  assert.notEqual(views[0].rsp.relativePp, views[1].rsp.relativePp);
  assert.notEqual(views[1].rsp.relativePp, views[2].rsp.relativePp);
  assert.deepEqual(buildPriceParticipationMonthSummary(input, asOf), monthly);
  assert.equal(JSON.stringify(input), before);
});

test("MTD uses the existing common breadth cutoff and never later price-only observations", () => {
  const input = fixture();
  input.breadth = {
    points: dates.map(date => ({ date, advances: 250, declines: 250, oscillator: 2, summation: 10 })),
    declaredTotal: 503, cutoffDate: "2026-11-20", sourceGeneratedAt: asOf,
    sourceCommit: "a".repeat(40), sourceBlob: "b".repeat(40), sourceRows: dates.length,
    closedCandidates: dates.length, excludedDates: [], stale: false,
  };
  const summary = buildPriceParticipationMonthSummary(input, asOf);
  assert.equal(summary.cutoffDate, "2026-11-20");
  assert.equal(summary.comparisonDate, "2026-10-30");
  const spy = input.series[0].points.find(point => point.date === "2026-11-20")!.close!;
  const rsp = input.series[1].points.find(point => point.date === "2026-11-20")!.close!;
  near(summary.relativePp, (rsp / 200 - 1) * 100 - (spy / 100 - 1) * 100);
  assert.notEqual(summary.relativePp, buildPriceParticipationMonthSummary(fixture(), asOf).relativePp);
});

test("missing preceding-month baseline cannot be replaced by an older or current-month price", () => {
  const input = fixture();
  input.series.forEach(series => { series.points = series.points.filter(point => point.date !== "2026-10-30"); });
  const summary = buildPriceParticipationMonthSummary(input, asOf);
  assert.equal(summary.comparisonDate, "2026-10-30");
  assert.equal(summary.relativePp, null); assert.equal(summary.spyReturnPct, null);
  assert.equal(summary.participation.covered, 0); assert.equal(summary.status, "unavailable");
  assert.equal(summary.reason, "missing-month-baseline");
});

test("an interior missing session is not bridged, and missing sectors keep fixed-universe coverage explicit", () => {
  const input = fixture();
  input.series.find(series => series.ticker === "XLK")!.points = input.series.find(series => series.ticker === "XLK")!.points.filter(point => point.date !== "2026-11-12");
  const summary = buildPriceParticipationMonthSummary(input, asOf);
  assert.equal(summary.participation.total, 11); assert.equal(summary.participation.covered, 10);
  assert.equal(summary.participation.positive, 2); assert.equal(summary.status, "partial");
  assert.equal(summary.cutoffDate, "2026-11-23"); assert.equal(summary.reason, "partial-sector-coverage");
  input.series[0].points.find(point => point.date === "2026-11-12")!.close = null;
  assert.equal(buildPriceParticipationMonthSummary(input, asOf).relativePp, null);
});

test("summary follows the actual Madrid calendar month, not the latest stored data month", () => {
  const summary = buildPriceParticipationMonthSummary(fixture(), "2026-12-01T00:30:00+01:00");
  assert.equal(summary.month, "2026-12"); assert.equal(summary.cutoffDate, null);
  assert.equal(summary.relativePp, null); assert.equal(summary.reason, "no-current-month-observations");
});

test("an unopened first session cannot use future current-month observations", () => {
  const summary = buildPriceParticipationMonthSummary(fixture(), "2026-11-02T12:00:00+01:00");
  assert.equal(summary.month, "2026-11"); assert.equal(summary.cutoffDate, null);
  assert.equal(summary.participation.covered, 0);
});

test("future prices are ignored and duplicates inside the selected history reject", () => {
  const input = fixture();
  const before = buildPriceParticipationMonthSummary(input, asOf);
  input.series.forEach(series => { series.points.push({ date: "2026-11-26", close: 999999 }); });
  assert.deepEqual(buildPriceParticipationMonthSummary(input, asOf), before);
  input.series[0].points.push({ ...input.series[0].points[0] });
  assert.throws(() => buildPriceParticipationMonthSummary(input, asOf), /Duplicate monthly-summary observation/);
});

test("unknown exchange-calendar years remain unavailable instead of assuming weekday-only sessions", () => {
  const summary = buildPriceParticipationMonthSummary(fixture(), "2029-11-25T12:00:00Z");
  assert.equal(summary.status, "unavailable"); assert.equal(summary.reason, "calendar-unavailable");
});
