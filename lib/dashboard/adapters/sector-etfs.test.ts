import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createDailySectorCache, loadSectorEtfsData } from "./sector-etfs.ts";
import { SECTOR_ETFS } from "./sector-data-core.ts";

function providerPayload(symbol: string) {
  return {
    "Meta Data": { "2. Symbol": symbol },
    "Time Series (Daily)": Object.fromEntries(Array.from({ length: 100 }, (_, index) => {
      const date = new Date(Date.UTC(2026, 7, 28 - index)).toISOString().slice(0, 10);
      return [date, { "4. close": String(200 + SECTOR_ETFS.findIndex((etf) => etf.symbol === symbol) * 5 - index * 0.4) }];
    })),
  };
}

test("one real provider response per governed symbol produces full coverage", async () => {
  const requested: string[] = [];
  const result = await loadSectorEtfsData({
    apiKey: "test-key",
    now: Date.UTC(2026, 7, 31),
    sleep: async () => {},
    fetcher: async (input) => {
      const symbol = new URL(String(input)).searchParams.get("symbol") ?? "";
      requested.push(symbol);
      return new Response(JSON.stringify(providerPayload(symbol)), { status: 200 });
    },
  });
  assert.deepEqual(requested, SECTOR_ETFS.map((etf) => etf.symbol));
  assert.equal(result.rotation?.sectors.length, 11);
  assert.equal(result.module.dataStatus, "automated");
});

test("provider failure returns unavailable and never returns a synthetic ranking", async () => {
  const result = await loadSectorEtfsData({
    apiKey: "test-key",
    sleep: async () => {},
    fetcher: async () => new Response(JSON.stringify({ Information: "rate limit" }), { status: 200 }),
  });
  assert.equal(result.rotation, null);
  assert.equal(result.module.dataStatus, "unavailable");
  assert.equal(result.module.observedData.length, 0);
});

test("daily cache shares one canonical snapshot within the refresh window", async () => {
  let calls = 0;
  let clock = 1000;
  const getSnapshot = createDailySectorCache(async () => {
    calls += 1;
    return loadSectorEtfsData({ apiKey: "", now: clock });
  }, () => clock);
  await Promise.all([getSnapshot(), getSnapshot(), getSnapshot()]);
  assert.equal(calls, 1);
  await getSnapshot();
  assert.equal(calls, 1);
  clock += 24 * 60 * 60 * 1000 + 1;
  await getSnapshot();
  assert.equal(calls, 2);
});

test("production adapter contains no synthetic sector-history generator", () => {
  const adapter = readFileSync(new URL("./sector-etfs.ts", import.meta.url), "utf8");
  const core = readFileSync(new URL("./sector-data-core.ts", import.meta.url), "utf8");
  const manual = readFileSync(new URL("../manual-data.ts", import.meta.url), "utf8");
  for (const source of [adapter, core, manual]) {
    assert.doesNotMatch(source, /demo252d|Math\.sin\(day \/ 9\)|XLU \+1\.2%/);
  }
});
