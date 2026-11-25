import assert from "node:assert/strict";
import test from "node:test";
import { sessionDates } from "../research/mcclellan-core.mjs";
import {
  PRICE_PARTICIPATION_SECTOR_TICKERS, PRICE_PARTICIPATION_WINDOWS,
  buildPriceParticipation, exportPriceParticipationCsv,
  type PriceParticipationInput, type PriceParticipationWindow,
} from "./price-participation";

const dates = sessionDates("2026-06-01", "2026-11-23");
function fixture(): PriceParticipationInput {
  return {
    series: ["SPY", "RSP", ...PRICE_PARTICIPATION_SECTOR_TICKERS].map((ticker, assetIndex) => ({
      ticker, points: dates.map((date, index) => ({ date, close: 80 + assetIndex * 10 + index * 0.123456 })),
    })),
    breadth: {
      points: dates.map((date, index) => ({
        date, advances: 220 + index % 50, declines: 280 - index % 50,
        oscillator: (index - 65) * 0.123456789, summation: 50 - index * 1.234567891,
      })),
      declaredTotal: 503, cutoffDate: dates.at(-1)!, sourceGeneratedAt: "2026-11-24T17:00:00Z",
      sourceCommit: "a".repeat(40), sourceBlob: "b".repeat(40), sourceRows: dates.length,
      closedCandidates: dates.length, excludedDates: [], stale: false,
    },
    priceThrough: dates.at(-1)!,
    authority: { id: "test-adjusted-source", revision: "c".repeat(40), retrievedAt: "2026-11-24T19:40:02Z", sourceUrl: "https://finance.yahoo.com/" },
    refreshStatus: "current",
  };
}
const close = (actual: number | null, expected: number) => {
  assert.notEqual(actual, null);
  assert.ok(Math.abs(actual! - expected) < 1e-12, `${actual} != ${expected}`);
};

test("5, 20 and 60 session intervals use N+1 distinct SPY-calendar observations", () => {
  const input = fixture();
  for (const window of PRICE_PARTICIPATION_WINDOWS) {
    const view = buildPriceParticipation(input, window), latest = input.series[0].points.at(-1)!;
    const earlier = input.series[0].points.at(-window - 1)!;
    assert.equal(view.sessions, window);
    assert.equal(view.rows.length, window + 1);
    assert.equal(view.comparisonDate, earlier.date);
    assert.equal(view.cutoffDate, latest.date);
    assert.equal(view.spy.close, latest.close);
    close(view.spy.returnPct, 100 * (latest.close! / earlier.close! - 1));
    assert.equal(view.normalized[0].spy, 100);
    assert.equal(view.normalized[0].rsp, 100);
    assert.equal(view.coverage.availableObservations, window + 1);
  }
  assert.equal(buildPriceParticipation(input).sessions, 20);
  assert.equal(buildPriceParticipation(input, 20).comparisonDate, "2026-10-26");
});

test("twenty rows cannot supply twenty intervals; latest observed price is still available", () => {
  const input = fixture();
  input.series[0].points = input.series[0].points.slice(-20);
  const view = buildPriceParticipation(input);
  assert.equal(view.rows.length, 20);
  assert.equal(view.comparisonDate, null);
  assert.notEqual(view.spy.close, null);
  assert.equal(view.spy.returnPct, null);
  assert.equal(view.rsp.relativePp, null);
  assert.ok(view.normalized.every(row => row.spy === null && row.rsp === null));
  assert.ok(view.warnings.includes("insufficient-history"));
});

test("a null endpoint remains the selected date and is not replaced by an earlier valid close", () => {
  const input = fixture();
  input.series[0].points.at(-1)!.close = null;
  const view = buildPriceParticipation(input);
  assert.equal(view.cutoffDate, dates.at(-1));
  assert.equal(view.spy.close, null);
  assert.equal(view.spy.returnPct, null);
  assert.equal(view.rsp.relativePp, null);
  assert.ok(view.warnings.includes("missing-spy-endpoint"));
  const missingBase = fixture();
  missingBase.series[1].points.at(-21)!.close = null;
  const baseView = buildPriceParticipation(missingBase);
  assert.equal(baseView.comparisonDate, dates.at(-21));
  assert.equal(baseView.rsp.returnPct, null);
  assert.ok(baseView.normalized.every(row => row.rsp === null));
  assert.notEqual(baseView.spy.returnPct, null);
});

test("interior nulls and absent RSP or breadth rows are retained as gaps, without compressing the window", () => {
  const input = fixture(), gapDate = dates.at(-10)!;
  input.series[0].points.at(-10)!.close = null;
  input.series[1].points = input.series[1].points.filter(row => row.date !== gapDate);
  input.breadth!.points = input.breadth!.points.filter(row => row.date !== gapDate);
  const view = buildPriceParticipation(input);
  assert.equal(view.rows.length, 21);
  assert.equal(view.comparisonDate, dates.at(-21));
  const gap = view.rows.find(row => row.date === gapDate)!;
  assert.deepEqual(gap, { date: gapDate, spyClose: null, rspClose: null, spyNormalized: null,
    rspNormalized: null, oscillator: null, summation: null, advances: null, declines: null });
  assert.equal(view.breadth?.points.length, 20);
  assert.equal(view.coverage.breadthObservations, 20);
  assert.notEqual(view.spy.returnPct, null);
});

test("alignment uses the latest dated intersection of SPY, RSP and the authoritative breadth cutoff", () => {
  const input = fixture();
  input.series[1].points = input.series[1].points.slice(0, -2);
  input.breadth!.cutoffDate = dates.at(-6)!;
  const view = buildPriceParticipation(input);
  assert.equal(view.priceAvailableThrough, dates.at(-1));
  assert.equal(view.breadthAvailableThrough, dates.at(-6));
  assert.equal(view.cutoffDate, dates.at(-6));
  assert.equal(view.comparisonDate, dates.at(-26));
  assert.equal(view.breadth?.last?.date, dates.at(-6));
  assert.ok(view.rows.every(row => row.date <= dates.at(-6)!));
  assert.ok(view.warnings.includes("aligned-to-earlier-cutoff"));
  const expectedLast = input.series[0].points.at(-6)!.close!;
  close(view.spy.returnPct, 100 * (expectedLast / input.series[0].points.at(-26)!.close! - 1));
});

test("entirely missing RSP or breadth never suppresses an available SPY observation", () => {
  for (const missing of ["rsp", "breadth", "both"] as const) {
    const input = fixture();
    if (missing !== "breadth") input.series = input.series.filter(row => row.ticker !== "RSP");
    if (missing !== "rsp") input.breadth = null;
    const view = buildPriceParticipation(input);
    assert.equal(view.cutoffDate, dates.at(-1));
    assert.notEqual(view.spy.returnPct, null);
    if (missing !== "breadth") {
      assert.equal(view.rsp.returnPct, null);
      assert.ok(view.warnings.includes("rsp-unavailable"));
    }
    if (missing !== "rsp") {
      assert.equal(view.breadth, null);
      assert.ok(view.warnings.includes("breadth-unavailable"));
    }
  }
});

test("nonoverlapping dated sources report no common cutoff instead of inventing synchronized data", () => {
  const input = fixture();
  input.series[1].points = [{ date: "2026-01-02", close: 100 }];
  const view = buildPriceParticipation(input);
  assert.equal(view.cutoffDate, null);
  assert.equal(view.spy.close, null);
  assert.equal(view.rows.length, 0);
  assert.ok(view.warnings.includes("no-common-cutoff"));
});

test("lagging and missing sector endpoints reduce coverage without moving the global cutoff", () => {
  const input = fixture();
  input.series.find(row => row.ticker === "XLK")!.points.pop();
  input.series.find(row => row.ticker === "XLF")!.points.at(-21)!.close = null;
  input.series = input.series.filter(row => row.ticker !== "XLV");
  const view = buildPriceParticipation(input);
  assert.equal(view.cutoffDate, dates.at(-1));
  assert.equal(view.sectors.length, 11);
  assert.deepEqual(view.participation, { positive: 8, negative: 0, flat: 0, covered: 8, total: 11 });
  assert.deepEqual(view.sectors.filter(row => row.returnPct === null).map(row => row.ticker), ["XLF", "XLK", "XLV"]);
  assert.ok(view.warnings.includes("partial-sector-coverage"));
});

test("sector ranking preserves signs, uses alphabetical ties and puts missing values last", () => {
  const input = fixture();
  const returns = new Map([["XLB", 110], ["XLC", 110], ["XLE", 110], ["XLF", 95], ["XLI", 100]]);
  input.series = input.series.filter(row => !PRICE_PARTICIPATION_SECTOR_TICKERS.includes(row.ticker as typeof PRICE_PARTICIPATION_SECTOR_TICKERS[number]));
  for (const [ticker, last] of returns) input.series.push({ ticker,
    points: [{ date: dates.at(-21)!, close: 100 }, { date: dates.at(-1)!, close: last }] });
  const view = buildPriceParticipation(input);
  assert.deepEqual(view.sectors.slice(0, 5).map(row => row.ticker), ["XLB", "XLC", "XLE", "XLI", "XLF"]);
  assert.deepEqual(view.participation, { positive: 3, negative: 1, flat: 1, covered: 5, total: 11 });
  close(view.sectors.find(row => row.ticker === "XLF")!.returnPct, -5);
});

test("real published six-decimal endpoint prices calculate returns without prior display rounding", () => {
  const input = fixture();
  // Frozen adjusted closes from the approved 2026-11-24 authority, not live marks.
  input.series[0].points.at(-21)!.close = 765.369995;
  input.series[0].points.at(-1)!.close = 722.289978;
  input.series[1].points.at(-21)!.close = 217.289993;
  input.series[1].points.at(-1)!.close = 212.820007;
  const view = buildPriceParticipation(input);
  close(view.spy.returnPct, -5.628652453249094);
  close(view.rsp.returnPct, -2.0571522591930846);
  close(view.rsp.relativePp, 3.5715001940560094);
  assert.notEqual(view.spy.returnPct, 100 * (722.29 / 765.37 - 1));
  assert.equal(view.rows.at(-1)?.spyClose, 722.289978);
});

test("McClellan values and adjusted prices are copied unchanged; building and editing a view cannot mutate input", () => {
  const input = fixture(), before = JSON.stringify(input);
  const view = buildPriceParticipation(input);
  assert.deepEqual(view.breadth?.points, input.breadth!.points.slice(-21));
  assert.equal(view.rows.at(-1)?.oscillator, input.breadth!.points.at(-1)!.oscillator);
  assert.equal(view.rows.at(-1)?.summation, input.breadth!.points.at(-1)!.summation);
  assert.equal(JSON.stringify(input), before);
  view.breadth!.points[0].oscillator = 999;
  view.authority.id = "modified-view";
  assert.equal(JSON.stringify(input), before);
});

test("sorting and identical duplicate coalescing do not create an extra session", () => {
  const input = fixture();
  const expected = buildPriceParticipation(input);
  input.series[0].points = [...input.series[0].points.toReversed(), { ...input.series[0].points.at(-1)! }];
  assert.deepEqual(buildPriceParticipation(input), expected);
  input.series[0].points.push({ date: dates.at(-1)!, close: 1 });
  assert.throws(() => buildPriceParticipation(input), /Conflicting SPY/);
});

test("invalid inputs fail explicitly, while absent values remain null", () => {
  for (const invalid of [0, -1, NaN, Infinity]) {
    const input = fixture(); input.series[0].points[0].close = invalid;
    assert.throws(() => buildPriceParticipation(input), /adjusted close/);
  }
  const invalidDate = fixture(); invalidDate.series[0].points[0].date = "2026-02-30";
  assert.throws(() => buildPriceParticipation(invalidDate), /date/);
  const duplicate = fixture(); duplicate.series.push(duplicate.series[0]);
  assert.throws(() => buildPriceParticipation(duplicate), /Duplicate/);
  const breadth = fixture(); breadth.breadth!.points[0].oscillator = NaN;
  assert.throws(() => buildPriceParticipation(breadth), /McClellan/);
  assert.throws(() => buildPriceParticipation(fixture(), 19 as PriceParticipationWindow), /window/);
});

test("priceThrough excludes later observations, and refresh and source staleness are retained", () => {
  const input = fixture(); input.priceThrough = dates.at(-3)!;
  input.refreshStatus = "retained"; input.breadth!.stale = true;
  const view = buildPriceParticipation(input);
  assert.equal(view.priceAvailableThrough, dates.at(-3));
  assert.equal(view.cutoffDate, dates.at(-3));
  assert.equal(view.breadthAvailableThrough, dates.at(-1));
  assert.equal(view.breadth?.stale, true);
  assert.equal(view.refreshStatus, "retained");
  assert.ok(view.warnings.includes("breadth-stale"));
  assert.ok(view.warnings.includes("price-refresh-retained"));
});

test("CSV exports the displayed window, original values and explicitly identified derived columns", () => {
  const input = fixture(); input.series[1].points.at(-10)!.close = null;
  const view = buildPriceParticipation(input), csv = exportPriceParticipationCsv(view);
  const lines = csv.trimEnd().split("\r\n"), header = lines[0].split(","), last = lines.at(-1)!.split(",");
  assert.equal(lines.length, 22);
  assert.equal(header[1], "Source SPY adjusted close (USD)");
  assert.equal(header[3], "Derived SPY rebased to 100 at comparison date");
  assert.equal(header[7], "Calculated RAMO (existing methodology)");
  assert.equal(last[0], view.cutoffDate);
  assert.equal(Number(last[1]), view.spy.close);
  assert.equal(Number(last[9]), view.spy.returnPct);
  assert.equal(last[12], view.comparisonDate);
  assert.equal(last[14], "20");
  const gap = lines.find(line => line.startsWith(dates.at(-10)! + ","))!.split(",");
  assert.equal(gap[2], ""); assert.equal(gap[4], "");
  view.authority.id = 'authority "one", reviewed';
  assert.ok(exportPriceParticipationCsv(view).includes('"authority ""one"", reviewed"'));
});
