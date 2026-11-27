import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { AsyncLocalStorage } from "node:async_hooks";
globalThis.AsyncLocalStorage = AsyncLocalStorage;

// Exercise Next's own App Router stale reads, background revalidation and
// cache writes. Replace only its hosting storage/clock and provider HTTP.
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export default {}", shortCircuit: true };
  if (specifier.endsWith("risk-history-seed.json")) return { url: "data:text/javascript,export default " + encodeURIComponent(readFileSync(new URL(specifier, context.parentURL), "utf8")), shortCircuit: true };
  if (specifier === "next/cache") return nextResolve("next/cache.js", context);
  try { return nextResolve(specifier, context); }
  catch (error) { if (specifier.startsWith(".") && !/\.[cm]?[jt]s$/u.test(specifier)) return nextResolve(specifier + ".ts", context); throw error; }
} });
const { workAsyncStorage } = await import("next/dist/server/app-render/work-async-storage.external.js");
const { getHistoricalRiskMetrics } = await import("./get-historical-risk.ts");
const { latestRiskSession, riskSessionDates } = await import("./risk-history-source.ts");
const seed = JSON.parse(readFileSync(new URL("./risk-history-seed.json", import.meta.url), "utf8"));

test("real App Router cache retains adjusted-history bytes after a failed refresh and admits recovery", async () => {
  let time = 0, failed = false, revision = 0, fetches = 0;
  const entries = new Map(), stores = [], errors = [];
  const originals = { cache: globalThis.__incrementalCache, fetch: globalThis.fetch, error: console.error };
  const cache = {
    generateSimpleCacheKey: async key => key,
    get: async (key, context) => {
      const entry = entries.get(key);
      return entry ? { ...entry, isStale: (time - entry.lastModified) / 1000 > (context.revalidate || entry.value.revalidate) } : null;
    },
    set: async (key, value) => { entries.set(key, { value: JSON.parse(JSON.stringify(value)), lastModified: time }); },
  };
  const cutoffDate = latestRiskSession();
  globalThis.__incrementalCache = cache;
  console.error = (...args) => { errors.push(args); };
  globalThis.fetch = async input => {
    fetches++;
    if (failed) throw new TypeError("Provider offline");
    const symbol = new URL(String(input)).pathname.split("/").at(-1);
    const prices = (symbol === "SPY" ? seed.spy : seed.sectors.find(row => row.symbol === symbol).prices).map(row => ({ ...row }));
    for (const date of riskSessionDates(prices.at(-1).date, cutoffDate).slice(1)) prices.push({ date, close: prices.at(-1).close * 1.001 });
    prices.at(-1).close *= 1 + revision * 0.01;
    return new Response(JSON.stringify({ chart: { result: [{ meta: { symbol, currency: "USD", exchangeTimezoneName: "America/New_York", dataGranularity: "1d" },
      timestamp: prices.map(row => Date.parse(row.date + "T14:30Z") / 1000), indicators: { adjclose: [{ adjclose: prices.map(row => row.close) }] } }] } }));
  };
  const read = async () => {
    const store = { route: "/dashboard/preview-riesgo", incrementalCache: cache, isStaticGeneration: false, nextFetchId: 1, pendingRevalidates: {} };
    stores.push(store);
    return { metrics: await workAsyncStorage.run(store, getHistoricalRiskMetrics), settle: () => Promise.all(Object.values(store.pendingRevalidates)) };
  };
  const publicationBytes = () => [...entries.values()][0]?.value.data.body;
  try {
    const warm = await read(); await warm.settle();
    assert.equal(fetches, 12);
    assert.equal(warm.metrics.spy.lastUpdated, cutoffDate);
    assert.equal(warm.metrics.absorption.lastUpdated, cutoffDate);
    const validBytes = publicationBytes();
    const publication = JSON.parse(validBytes);
    assert.ok(publication.spy.length >= 1261);
    assert.equal(publication.sectors.length, 11);
    assert.ok(publication.sectors.every(sector => sector.prices.length >= 501));
    assert.deepEqual((await read()).metrics, warm.metrics);
    assert.equal(fetches, 12);

    time += 86_401_000; failed = true;
    const stale = await read();
    assert.deepEqual(stale.metrics, warm.metrics);
    await stale.settle();
    assert.equal(fetches, 24);
    assert.equal(publicationBytes(), validBytes, "failed refresh must leave the persisted adjusted closes and source hashes byte-identical");
    assert.equal(JSON.parse(publicationBytes()).acquiredAt, publication.acquiredAt);
    assert.ok(errors.length > 0);

    failed = false; revision = 1;
    const recovering = await read(); await recovering.settle();
    const recovered = await read(); await recovered.settle();
    assert.equal(fetches, 36);
    assert.equal(recovered.metrics.spy.lastUpdated, cutoffDate);
    assert.equal(recovered.metrics.absorption.lastUpdated, cutoffDate);
    assert.notEqual(publicationBytes(), validBytes);
    assert.notDeepEqual(JSON.parse(publicationBytes()).provenance, publication.provenance);
  } finally {
    await Promise.all(stores.flatMap(store => Object.values(store.pendingRevalidates)));
    globalThis.fetch = originals.fetch; globalThis.__incrementalCache = originals.cache; console.error = originals.error;
  }
});

