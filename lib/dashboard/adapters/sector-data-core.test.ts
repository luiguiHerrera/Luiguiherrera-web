import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSectorResult,
  buildUnavailableSectorResult,
  parseAlphaVantagePrices,
  sanitizeProviderMessage,
  SECTOR_ETFS,
  type AlphaVantageDailyResponse,
  type SectorHistory,
} from "./sector-data-core.ts";

function isoDay(offset: number) {
  return new Date(Date.UTC(2026, 7, 28 - offset)).toISOString().slice(0, 10);
}

function histories(depth = 130): SectorHistory[] {
  return SECTOR_ETFS.map((etf, sectorIndex) => ({
    symbol: etf.symbol,
    name: etf.name,
    group: etf.group,
    latestDate: isoDay(0),
    closeConvention: "close",
    prices: Array.from({ length: depth }, (_, index) => ({
      date: isoDay(index),
      close: 200 + sectorIndex * 10 - index * (0.5 + sectorIndex * 0.01),
    })).reverse(),
  }));
}

test("normalizes valid Alpha Vantage closes and rejects malformed rows", () => {
  const payload: AlphaVantageDailyResponse = {
    "Time Series (Daily)": {
      "2026-08-28": { "4. close": "101.5" },
      "2026-08-27": { "4. close": "100" },
      "2026-02-30": { "4. close": "99" },
      broken: { "4. close": "98" },
      "2026-08-26": { "4. close": "not-a-number" },
      "2026-08-25": { "4. close": "-1" },
    },
  };
  assert.deepEqual(parseAlphaVantagePrices(payload), [
    { date: "2026-08-27", close: 100 },
    { date: "2026-08-28", close: 101.5 },
  ]);
});

test("real histories feed unchanged 5, 21, and 63-session rotation calculations", () => {
  const result = buildSectorResult(histories(), Date.UTC(2026, 7, 31));
  assert.equal(result.rotation?.dataStatus, "automated");
  assert.equal(result.rotation?.sectors.length, 11);
  assert.equal(result.quantRisk.dataStatus, "automated");
  const xlk = result.rotation?.sectors.find((sector) => sector.etfTicker === "XLK");
  assert.ok(xlk);
  assert.equal(xlk.return1w, ((200 / 197.5) - 1) * 100);
  assert.equal(xlk.return1m, ((200 / 189.5) - 1) * 100);
  assert.equal(xlk.return3m, ((200 / 168.5) - 1) * 100);
  assert.equal(result.rotation?.sectors.every((sector) => sector.dailyReturns.length === 129), true);
});

test("incomplete coverage fails instead of producing a partial ranking", () => {
  assert.throws(() => buildSectorResult(histories().slice(0, 10), Date.UTC(2026, 7, 31)), /coverage 10\/11/);
});

test("unavailable result contains no sector ranking or quantitative estimate", () => {
  const result = buildUnavailableSectorResult("provider unavailable");
  assert.equal(result.rotation, null);
  assert.equal(result.module.dataStatus, "unavailable");
  assert.equal(result.module.observedData.length, 0);
  assert.equal(result.quantRisk.dataStatus, "unavailable");
  assert.equal(result.quantRisk.fragilityScore, null);
  assert.equal(result.quantRisk.sectorDispersion1w, null);
});

test("provider diagnostics redact credential material", () => {
  const sanitized = sanitizeProviderMessage("We have detected your API key as SECRET123 and apikey=ANOTHER456");
  assert.equal(sanitized?.includes("SECRET123"), false);
  assert.equal(sanitized?.includes("ANOTHER456"), false);
  assert.match(sanitized ?? "", /\[redacted\]/);
});
