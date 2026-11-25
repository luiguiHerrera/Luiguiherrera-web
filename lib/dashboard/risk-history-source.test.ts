import test from "node:test";
import assert from "node:assert/strict";
import seed from "./risk-history-seed.json" with { type: "json" };
import { metricsFromRiskHistory, parseRiskYahooChart, riskSessionDates, fetchHistoricalRiskSource, RiskHistorySourceError, type RiskHistorySource } from "./risk-history-source.ts";

const verifiedSeed = seed as RiskHistorySource;
function chart(prices = seed.spy) {
  return { chart: { result: [{ meta: { symbol: "SPY", currency: "USD", exchangeTimezoneName: "America/New_York", dataGranularity: "1d" },
    timestamp: prices.map(row => Date.parse(row.date + "T14:30Z") / 1000),
    indicators: { quote: [{ close: prices.map(() => 999) }], adjclose: [{ adjclose: prices.map(row => row.close) }] } }] } };
}

test("verified real raw archive covers both fixed windows with source hashes and original dates", () => {
  const metrics = metricsFromRiskHistory(verifiedSeed, "2026-11-25T12:00:00Z");
  assert.equal(metrics.spy.observations, 1260);
  assert.equal(metrics.absorption.observations, 500);
  assert.equal(metrics.spy.lastUpdated, "2026-11-20");
  assert.equal(metrics.absorption.lastUpdated, "2026-11-20");
  assert.equal(metrics.updateStatus, "retained");
  assert.ok(metrics.spy.es95! >= metrics.spy.var95!);
  assert.ok(metrics.absorption.ratio! >= 2 / 11 && metrics.absorption.ratio! <= 1);
  assert.equal(new Set(verifiedSeed.provenance.map(record => record.symbol)).size, 12);
});

test("strict Yahoo parser consumes adjusted closes and rejects unadjusted quote fallback", () => {
  assert.deepEqual(parseRiskYahooChart(chart(), "SPY", "2026-11-20", 1261), seed.spy);
  const payload = chart();
  payload.chart.result[0].indicators.adjclose = [];
  assert.throws(() => parseRiskYahooChart(payload, "SPY", "2026-11-20", 1261), RiskHistorySourceError);
});

test("missing and duplicate sessions reject without treating a multiday move as one session", () => {
  assert.throws(() => parseRiskYahooChart(chart(seed.spy.filter((_, index) => index !== 600)), "SPY", "2026-11-20", 1261), /missing session/);
  assert.throws(() => parseRiskYahooChart(chart([...seed.spy, seed.spy[600]]), "SPY", "2026-11-20", 1261), /Duplicate/);
  const nullAdjusted = chart();
  (nullAdjusted.chart.result[0].indicators.adjclose[0].adjclose as (number | null)[])[600] = null;
  assert.throws(() => parseRiskYahooChart(nullAdjusted, "SPY", "2026-11-20", 1261), /missing session/);
});

test("calendar covers declared exchange holidays including 2025 special closure", () => {
  assert.deepEqual(riskSessionDates("2021-12-23", "2021-12-27"), ["2021-12-23", "2021-12-27"]);
  assert.deepEqual(riskSessionDates("2022-06-17", "2022-06-21"), ["2022-06-17", "2022-06-21"]);
  assert.deepEqual(riskSessionDates("2025-01-08", "2025-01-10"), ["2025-01-08", "2025-01-10"]);
  assert.throws(() => riskSessionDates("2020-01-01", "2029-01-01"), /coverage/);
});

test("future archive acquisition cannot enter a historical view", () => {
  assert.throws(() => metricsFromRiskHistory(verifiedSeed, "2026-11-19T12:00:00Z"), /provenance/);
  assert.throws(() => metricsFromRiskHistory({ ...verifiedSeed, provenance: verifiedSeed.provenance.map(() => verifiedSeed.provenance[0]) }), /provenance/);
});

test("failed source refresh rejects rather than manufacturing a successful new snapshot", async () => {
  await assert.rejects(fetchHistoricalRiskSource({ asOf: "2026-11-25T12:00:00Z", fetcher: async () => new Response("blocked", { status: 429 }) }), /HTTP 429/);
});

test("hosted refresh requires all twelve adjusted series at the same completed session", async () => {
  let calls = 0;
  const source = await fetchHistoricalRiskSource({ asOf: "2026-11-21T20:00:00Z", fetcher: async (input, init) => {
    calls++;
    assert.equal(init?.cache, "no-store");
    const symbol = new URL(String(input)).pathname.split("/").at(-1)!;
    const prices = symbol === "SPY" ? seed.spy : seed.sectors.find(row => row.symbol === symbol)!.prices;
    const payload = chart(prices);
    payload.chart.result[0].meta.symbol = symbol;
    return new Response(JSON.stringify(payload));
  } });
  assert.equal(calls, 12);
  assert.equal(source.cutoffDate, "2026-11-20");
  assert.equal(source.sectors.length, 11);
  assert.equal(metricsFromRiskHistory(source, "2026-11-21T20:00:00Z").updateStatus, "current");
});
