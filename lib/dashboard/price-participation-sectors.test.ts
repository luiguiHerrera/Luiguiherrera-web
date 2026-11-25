import assert from "node:assert/strict";
import test from "node:test";
import { sessionDates } from "../research/mcclellan-core.mjs";
import {
  PRICE_PARTICIPATION_SECTOR_TICKERS, PRICE_PARTICIPATION_WINDOWS,
  buildPriceParticipation, type PriceParticipationInput, type PriceParticipationWindow,
} from "./price-participation";
import { buildSectorParticipation } from "./price-participation-sectors";

const dates = sessionDates("2025-12-01", "2026-11-23");
function fixture(): PriceParticipationInput {
  return {
    series: ["SPY", ...PRICE_PARTICIPATION_SECTOR_TICKERS].map(ticker => ({ ticker,
      points: dates.map((date, index) => ({ date, close: ticker === "SPY" ? 500 + index * 0.123456 : 100 })) })),
    breadth: null, priceThrough: dates.at(-1)!, refreshStatus: "current",
    authority: { id: "published-sector-test", retrievedAt: "2026-11-24T19:40:02Z", sourceUrl: "https://finance.yahoo.com/" },
  };
}
function setPrice(input: PriceParticipationInput, ticker: string, offset: number, price: number | null) {
  input.series.find(series => series.ticker === ticker)!.points.at(offset)!.close = price;
}
const close = (actual: number | null, expected: number) => {
  assert.notEqual(actual, null);
  assert.ok(Math.abs(actual! - expected) < 1e-12, `${actual} != ${expected}`);
};

test("current and immediately preceding windows use exact N and 2N SPY-calendar intervals", () => {
  const input = fixture();
  input.series.find(series => series.ticker === "XLK")!.points.forEach((point, index) => { point.close = 100 + index * 0.123456; });
  for (const sessions of PRICE_PARTICIPATION_WINDOWS) {
    const view = buildSectorParticipation(input, sessions, dates.at(-1)!);
    const sector = view.sectors.find(sector => sector.ticker === "XLK")!;
    assert.equal(view.cutoffDate, dates.at(-1));
    assert.equal(view.comparisonDate, dates.at(-sessions - 1));
    assert.equal(view.previousCutoffDate, dates.at(-sessions - 1));
    assert.equal(view.previousComparisonDate, dates.at(-2 * sessions - 1));
    assert.equal(sector.points.length, sessions + 1);
    assert.equal(sector.points[0].date, view.comparisonDate);
    const prices = input.series.find(series => series.ticker === "XLK")!.points;
    close(sector.returnPct, 100 * (prices.at(-1)!.close! / prices.at(-sessions - 1)!.close! - 1));
    close(sector.previousReturnPct, 100 * (prices.at(-sessions - 1)!.close! / prices.at(-2 * sessions - 1)!.close! - 1));
  }
  const sixty = buildSectorParticipation(input, 60, dates.at(-1)!);
  assert.equal(sixty.previousComparisonDate, dates.at(-121));
});

test("rank movement compares adjacent equal windows and return change is in percentage points", () => {
  const input = fixture();
  for (const [ticker, middle, last] of [["XLB", 120, 126], ["XLC", 110, 132], ["XLE", 100, 110]] as const) {
    setPrice(input, ticker, -21, middle); setPrice(input, ticker, -1, last);
  }
  const view = buildSectorParticipation(input, 20, dates.at(-1)!);
  const xlb = view.sectors.find(row => row.ticker === "XLB")!;
  const xlc = view.sectors.find(row => row.ticker === "XLC")!;
  const xle = view.sectors.find(row => row.ticker === "XLE")!;
  assert.deepEqual([xlb.previousRank, xlb.rank, xlb.rankChange], [1, 3, -2]);
  assert.deepEqual([xlc.previousRank, xlc.rank, xlc.rankChange], [2, 1, 1]);
  assert.deepEqual([xle.previousRank, xle.rank, xle.rankChange], [3, 2, 1]);
  close(xlb.previousReturnPct, 20); close(xlb.returnPct, 5); close(xlb.returnChangePp, -15);
  close(xlc.returnChangePp, 10);
  assert.deepEqual(view.movements.slice(0, 2).map(row => row.ticker).sort(), ["XLC", "XLE"]);
  assert.equal(view.movements.at(-1)?.ticker, "XLB");
});

test("movement ranks use one common cohort, excluding sectors with either adjacent return missing", () => {
  const input = fixture();
  setPrice(input, "XLK", -41, null); setPrice(input, "XLK", -1, 200);
  setPrice(input, "XLF", -1, null);
  const view = buildSectorParticipation(input, 20, dates.at(-1)!);
  assert.deepEqual(view.coverage, { current: 10, previous: 10, comparable: 9, total: 11 });
  assert.equal(view.rankingCohort.covered, 9);
  assert.ok(!view.rankingCohort.tickers.includes("XLK"));
  assert.ok(!view.rankingCohort.tickers.includes("XLF"));
  const excludedLeader = view.sectors.find(row => row.ticker === "XLK")!;
  assert.equal(excludedLeader.windows.find(window => window.sessions === 20)?.rank, 1);
  assert.equal(excludedLeader.rank, null);
  assert.equal(excludedLeader.previousRank, null);
  assert.equal(excludedLeader.rankChange, null);
  assert.equal(excludedLeader.returnChangePp, null);
  assert.ok(view.movements.every(row => row.rank === 1 && row.previousRank === 1 && row.rankChange === 0));
});

test("missing sector endpoints stay absent and never move the common cutoff", () => {
  const input = fixture(), sector = input.series.find(series => series.ticker === "XLK")!;
  sector.points.pop();
  const view = buildSectorParticipation(input, 20, dates.at(-1)!);
  const row = view.sectors.find(row => row.ticker === "XLK")!;
  assert.equal(view.cutoffDate, dates.at(-1));
  assert.equal(view.comparisonDate, dates.at(-21));
  assert.equal(row.close, null); assert.equal(row.returnPct, null);
  assert.equal(row.previousReturnPct, 0);
  assert.equal(row.points.at(-1)?.close, null);
  assert.equal(row.points.length, 21);
  assert.ok(row.windows.every(window => window.returnPct === null && window.rank === null));
});

test("interior price gaps remain null in the original USD series without compressing or interpolating", () => {
  const input = fixture(), missingDate = dates.at(-10)!;
  const series = input.series.find(row => row.ticker === "XLB")!;
  series.points = series.points.filter(point => point.date !== missingDate);
  const view = buildSectorParticipation(input, 20, dates.at(-1)!);
  const row = view.sectors.find(row => row.ticker === "XLB")!;
  assert.deepEqual(row.points.find(point => point.date === missingDate), { date: missingDate, close: null });
  assert.equal(row.points.length, 21);
  assert.equal(row.returnPct, 0);
  assert.equal(row.previousReturnPct, 0);
  assert.equal(row.points[0].date, dates.at(-21));
});

test("true return ties share competition ranks, with deterministic alphabetical display order", () => {
  const input = fixture();
  for (const ticker of ["XLB", "XLC"]) setPrice(input, ticker, -1, 110);
  setPrice(input, "XLE", -1, 105);
  const view = buildSectorParticipation(input, 20, dates.at(-1)!);
  assert.deepEqual(view.sectors.slice(0, 3).map(row => [row.ticker, row.rank]), [["XLB", 1], ["XLC", 1], ["XLE", 3]]);
  assert.deepEqual(view.sectors.slice(0, 3).map(row => row.windows.find(window => window.sessions === 20)?.rank), [1, 1, 3]);
  assert.ok(view.sectors.every(row => row.previousRank === 1));
});

test("selected detail includes independent 5, 20 and 60 session returns and their valid ranking coverage", () => {
  const input = fixture();
  setPrice(input, "XLK", -6, 80); setPrice(input, "XLK", -21, 90); setPrice(input, "XLK", -61, 110);
  const selectedFive = buildSectorParticipation(input, 5, dates.at(-1)!).sectors.find(row => row.ticker === "XLK")!;
  const selectedSixty = buildSectorParticipation(input, 60, dates.at(-1)!).sectors.find(row => row.ticker === "XLK")!;
  assert.deepEqual(selectedFive.windows, selectedSixty.windows);
  close(selectedFive.windows[0].returnPct, 25);
  close(selectedFive.windows[1].returnPct, 100 * (100 / 90 - 1));
  close(selectedFive.windows[2].returnPct, 100 * (100 / 110 - 1));
  assert.ok(selectedFive.windows.every(window => window.covered === 11));
  assert.equal(selectedFive.points.length, 6);
  assert.equal(selectedSixty.points.length, 61);
});

test("frozen real six-decimal XLK endpoints preserve negative returns and their change without rounding", () => {
  const input = fixture();
  // Completed adjusted closes from the existing published 2026-11-24 authority.
  setPrice(input, "XLK", -41, 194.529999);
  setPrice(input, "XLK", -21, 186.320007);
  setPrice(input, "XLK", -1, 162.380005);
  const view = buildSectorParticipation(input, 20, dates.at(-1)!);
  const sector = view.sectors.find(row => row.ticker === "XLK")!;
  assert.equal(view.previousComparisonDate, "2026-09-28");
  assert.equal(view.comparisonDate, "2026-10-26");
  assert.equal(sector.close, 162.380005);
  close(sector.returnPct, -12.848862763299485);
  close(sector.previousReturnPct, -4.220424634865704);
  close(sector.returnChangePp, -8.62843812843378);
  assert.notEqual(sector.returnPct, 100 * (162.38 / 186.32 - 1));
});

test("insufficient current or previous history is unavailable rather than a shorter comparison", () => {
  const input = fixture();
  input.series[0].points = input.series[0].points.slice(-20);
  const insufficientCurrent = buildSectorParticipation(input, 20, dates.at(-1)!);
  assert.equal(insufficientCurrent.comparisonDate, null);
  assert.equal(insufficientCurrent.previousComparisonDate, null);
  assert.equal(insufficientCurrent.sectors[0].points.length, 20);
  assert.ok(insufficientCurrent.sectors.every(row => row.returnPct === null && row.previousReturnPct === null));
  assert.ok(insufficientCurrent.sectors.every(row => row.windows.find(window => window.sessions === 5)?.returnPct === 0));
  input.series[0].points = fixture().series[0].points.slice(-21);
  const insufficientPrevious = buildSectorParticipation(input, 20, dates.at(-1)!);
  assert.equal(insufficientPrevious.comparisonDate, dates.at(-21));
  assert.equal(insufficientPrevious.previousComparisonDate, null);
  assert.ok(insufficientPrevious.sectors.every(row => row.returnPct === 0 && row.previousReturnPct === null && row.rankChange === null));
  assert.equal(insufficientPrevious.movements.length, 0);
});

test("the exact supplied common cutoff is respected, and invalid cutoffs are not silently shifted", () => {
  const input = fixture(), cutoff = dates.at(-4)!;
  const view = buildSectorParticipation(input, 20, cutoff);
  assert.equal(view.cutoffDate, cutoff);
  assert.equal(view.comparisonDate, dates.at(-24));
  assert.ok(view.sectors.every(row => row.points.at(-1)?.date === cutoff));
  assert.throws(() => buildSectorParticipation(input, 20, "2026-11-22"), /outside/);
  input.priceThrough = dates.at(-3)!;
  assert.throws(() => buildSectorParticipation(input, 20, dates.at(-1)!), /outside/);
});

test("no cutoff keeps all sector data unavailable without fabricating dates or zero prices", () => {
  const view = buildSectorParticipation(fixture(), 20, null);
  assert.equal(view.cutoffDate, null);
  assert.equal(view.comparisonDate, null);
  assert.equal(view.previousCutoffDate, null);
  assert.equal(view.previousComparisonDate, null);
  assert.equal(view.rankingCohort.covered, 0);
  assert.ok(view.sectors.every(row => row.close === null && row.returnPct === null && row.points.length === 0));
  assert.ok(view.warnings.includes("no-cutoff"));
});

test("building and editing sector views cannot mutate source prices, metadata or existing market calculations", () => {
  const input = fixture(), before = JSON.stringify(input);
  const view = buildSectorParticipation(input, 20, dates.at(-1)!);
  assert.equal(JSON.stringify(input), before);
  view.sectors[0].points[0].close = 999;
  view.sectors[0].windows[0].returnPct = 999;
  assert.equal(JSON.stringify(input), before);
  for (const sessions of PRICE_PARTICIPATION_WINDOWS) {
    const core = buildPriceParticipation(input, sessions);
    const detail = buildSectorParticipation(input, sessions, core.cutoffDate);
    assert.deepEqual(detail.sectors.map(row => [row.ticker, row.returnPct]), core.sectors.map(row => [row.ticker, row.returnPct]));
  }
});

test("published dates are sorted and identical duplicates coalesced before counting intervals", () => {
  const input = fixture(), expected = buildSectorParticipation(input, 20, dates.at(-1)!);
  input.series[0].points = [...input.series[0].points.toReversed(), { ...input.series[0].points.at(-1)! }];
  assert.deepEqual(buildSectorParticipation(input, 20, dates.at(-1)!), expected);
  input.series[0].points.push({ date: dates.at(-1)!, close: 1 });
  assert.throws(() => buildSectorParticipation(input, 20, dates.at(-1)!), /Conflicting/);
});

test("invalid prices, dates and unsupported windows reject explicitly", () => {
  for (const value of [0, -1, NaN, Infinity]) {
    const input = fixture(); setPrice(input, "XLK", -1, value);
    assert.throws(() => buildSectorParticipation(input, 20, dates.at(-1)!), /Invalid price/);
  }
  const invalid = fixture(); invalid.series[0].points[0].date = "2026-02-30";
  assert.throws(() => buildSectorParticipation(invalid, 20, dates.at(-1)!), /Invalid price/);
  assert.throws(() => buildSectorParticipation(fixture(), 10 as PriceParticipationWindow, dates.at(-1)!), /Unsupported/);
});
