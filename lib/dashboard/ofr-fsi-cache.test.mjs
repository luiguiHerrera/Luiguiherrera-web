import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { AsyncLocalStorage } from "node:async_hooks";
globalThis.AsyncLocalStorage = AsyncLocalStorage;

// Use Next's real App Router cache branches. Only hosting storage and its clock
// are replaced; stale reads, pendingRevalidates and writes are Next's own code.
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier === "next/cache" ? "next/cache.js" : specifier, context);
} });
const { workAsyncStorage } = await import("next/dist/server/app-render/work-async-storage.external.js");
const { getOfrFsiData } = await import("./get-ofr-fsi-data.ts");
const published = JSON.parse(readFileSync(new URL("./ofr-fsi-published.json", import.meta.url), "utf8"));
const lastRow = published.csv.trim().split(/\r?\n/u).at(-1);
const withCut = date => published.csv.trim() + "\n" + lastRow.replace("2026-11-20,", date + ",") + "\n";
const normalized = value => JSON.parse(JSON.stringify(value));

function harness(fetcher) {
  let time = 0;
  const entries = new Map(), stores = [], errors = [];
  const originals = { cache: globalThis.__incrementalCache, fetch: globalThis.fetch, error: console.error };
  const cache = {
    generateSimpleCacheKey: async key => key,
    get: async (key, context) => {
      const entry = entries.get(key);
      return entry ? { ...entry, isStale: (time - entry.lastModified) / 1000 > (context.revalidate || entry.value.revalidate) } : null;
    },
    set: async (key, value) => { entries.set(key, { value: normalized(value), lastModified: time }); },
  };
  globalThis.__incrementalCache = cache;
  globalThis.fetch = fetcher;
  console.error = (...args) => { errors.push(args); };
  return {
    entries, errors,
    advance: () => { time += 3_601_000; },
    async read() {
      const store = { route: "/dashboard/preview-entorno-financiero", incrementalCache: cache,
        isStaticGeneration: false, nextFetchId: 1, pendingRevalidates: {} };
      stores.push(store);
      const snapshot = await workAsyncStorage.run(store, getOfrFsiData);
      return { snapshot, settle: () => Promise.all(Object.values(store.pendingRevalidates)) };
    },
    publication() {
      return [...entries.values()].map(entry => JSON.parse(entry.value.data.body)).find(value => value.dataset);
    },
    async restore() {
      await Promise.all(stores.flatMap(store => Object.values(store.pendingRevalidates)));
      globalThis.fetch = originals.fetch; globalThis.__incrementalCache = originals.cache; console.error = originals.error;
    },
  };
}

test("App Router persists the last valid publication and a separate failure notice, then clears it after recovery", async () => {
  let fetches = 0, failed = false, csv = withCut("2026-11-23");
  const h = harness(async () => { fetches++; if (failed) throw new TypeError("Offline"); return new Response(csv); });
  try {
    const first = await h.read(); await first.settle();
    const current = normalized(first.snapshot);
    assert.equal(current.dataset.observations.at(-1).date, "2026-11-23");
    assert.equal(fetches, 1); assert.equal(h.entries.size, 2);
    assert.deepEqual((await h.read()).snapshot, current);
    assert.equal(fetches, 1);

    h.advance(); failed = true;
    const stale = await h.read();
    // A dynamic App Router request returns stale immediately. The failure notice
    // becomes visible only once the background refresh has completed.
    assert.deepEqual(stale.snapshot, current);
    await stale.settle();
    const retained = (await h.read()).snapshot;
    assert.equal(fetches, 2); assert.equal(h.entries.size, 2);
    assert.equal(retained.refreshStatus, "retained");
    assert.deepEqual(retained.dataset, current.dataset);
    assert.equal(retained.retrievedAt, current.retrievedAt);
    assert.equal(retained.sourceHash, current.sourceHash);
    assert.ok(retained.lastRefreshError);
    assert.deepEqual(h.publication(), current, "failed publication callbacks must not rewrite the valid entry");
    assert.deepEqual((await h.read()).snapshot, retained);
    assert.equal(fetches, 2);

    h.advance(); failed = false; csv = withCut("2026-11-24");
    const recovering = await h.read(); await recovering.settle();
    const recovered = (await h.read()).snapshot;
    assert.equal(fetches, 3);
    assert.equal(recovered.refreshStatus, "current");
    assert.equal(recovered.lastRefreshError, undefined);
    assert.equal(recovered.dataset.observations.at(-1).date, "2026-11-24");
    assert.ok(h.errors.length > 0);
    assert.ok(h.errors.every(args => args[1]?.name === "OfrFsiDataError"));
  } finally { await h.restore(); }
});

test("a late failed refresh from another App Router request cannot roll a newer valid publication back", async () => {
  let fetches = 0, racing = false, resolveSuccess, rejectFailure;
  const h = harness(async () => {
    fetches++;
    if (!racing) return new Response(published.csv);
    if (!resolveSuccess) return new Promise(resolve => { resolveSuccess = () => resolve(new Response(withCut("2026-11-23"))); });
    return new Promise((_, reject) => { rejectFailure = () => reject(new TypeError("Late network failure")); });
  });
  try {
    const warm = await h.read(); await warm.settle();
    h.advance(); racing = true;
    const [successRequest, failedRequest] = await Promise.all([h.read(), h.read()]);
    assert.equal(fetches, 3, "publication and status share one HTTP request per independent render");
    for (const request of [successRequest, failedRequest]) assert.equal(request.snapshot.dataset.observations.at(-1).date, "2026-11-20");
    resolveSuccess(); await successRequest.settle();
    const newer = h.publication();
    assert.equal(newer.dataset.observations.at(-1).date, "2026-11-23");
    rejectFailure(); await failedRequest.settle();
    assert.deepEqual(h.publication(), newer, "late failure must not cache its older captured dataset");
    const retained = (await h.read()).snapshot;
    assert.equal(retained.refreshStatus, "retained");
    assert.deepEqual(retained.dataset, newer.dataset);
    assert.equal(retained.retrievedAt, newer.retrievedAt);
    assert.equal(retained.sourceHash, newer.sourceHash);
    assert.equal(fetches, 3);
  } finally {
    resolveSuccess?.(); rejectFailure?.();
    await h.restore();
  }
});

test("a cold outage keeps the reviewed seed outside the publication cache and defers repeated HTTP attempts", async () => {
  let fetches = 0, failed = true;
  const h = harness(async () => { fetches++; if (failed) throw new TypeError("Cold outage"); return new Response(withCut("2026-11-23")); });
  try {
    const cold = await h.read(); await cold.settle();
    assert.equal(cold.snapshot.refreshStatus, "retained");
    assert.equal(cold.snapshot.dataset.observations.at(-1).date, "2026-11-20");
    assert.equal(cold.snapshot.retrievedAt, published.retrievedAt);
    assert.equal(cold.snapshot.sourceHash, published.sourceHash);
    assert.equal(fetches, 1);
    assert.equal(h.entries.size, 1, "only the availability notice is cached during a cold outage");
    assert.equal(h.publication(), undefined, "the seed is never written over a future valid publication");
    const deferred = await h.read(); await deferred.settle();
    assert.deepEqual(normalized(deferred.snapshot), normalized(cold.snapshot));
    assert.equal(fetches, 1, "a fresh failed status defers another source request");
    h.advance(); failed = false;
    const refreshing = await h.read(); await refreshing.settle();
    const recovered = (await h.read()).snapshot;
    assert.equal(fetches, 2);
    assert.equal(recovered.refreshStatus, "current");
    assert.equal(recovered.lastRefreshError, undefined);
    assert.equal(recovered.dataset.observations.at(-1).date, "2026-11-23");
    assert.equal(h.entries.size, 2);
  } finally { await h.restore(); }
});
