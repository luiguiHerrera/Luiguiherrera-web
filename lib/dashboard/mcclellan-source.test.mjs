import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { sessionDates, researchSnapshot } from "../research/mcclellan-core.mjs";
import { buildMcClellanData, fetchMcClellanSource, McClellanSourceError } from "./mcclellan-source.mjs";

const asOf = "2026-11-23T17:00:00Z", commit = "a".repeat(40);
function fixture() {
  let total = 0;
  return { metadata: { universe: "S&P 500", total_stocks: 503, generated_at: "2026-11-23T15:00:00Z" },
    data: sessionDates("2024-11-22", "2026-11-20").map((date, i) => {
      const advances = 250 + Math.round(150 * Math.sin(i / 19)), declines = 500 - advances;
      return { date, advances, declines, net_advances: advances - declines, ad_line: total += advances - declines };
    }) };
}
function fetchFixture(snapshot = fixture()) {
  const calls = [], content = JSON.stringify(snapshot);
  return { calls, content, fetcher: async (url, options) => {
    calls.push({ url, options });
    return new Response(calls.length === 1 ? JSON.stringify([{ sha: commit }]) : content);
  } };
}
test("immutable bounded source fetch matches the existing calculation and never downloads prices", async () => {
  const f = fetchFixture(), source = await fetchMcClellanSource({ fetcher: f.fetcher, asOf });
  const expectedBlob = createHash("sha1").update(`blob ${Buffer.byteLength(f.content)}\0`).update(f.content).digest("hex");
  assert.equal(source.blob, expectedBlob);
  assert.equal(source.commit, commit);
  assert.equal(f.calls.length, 2);
  assert.ok(f.calls[1].url.includes(`/${commit}/advance-decline/ad_line_historical.json`));
  assert.ok(f.calls.every(c => c.options.cache === "no-store" && c.options.redirect === "error"));
  const data = buildMcClellanData(source, asOf), existing = researchSnapshot(source.snapshot, { asOf });
  assert.equal(data.cutoffDate, "2026-11-20");
  assert.equal(data.points.length, 251);
  assert.equal(data.points.at(-1).oscillator, existing.series.at(-1).oscillator);
  assert.equal(data.points.at(-1).summation, existing.series.at(-1).summation);
  assert.ok(data.points.every(p => !Object.keys(p).some(key => /price|close|open|high|low/i.test(key))));
});
test("freshness is recomputed from a saved good source; stale candidates cannot replace it", async () => {
  const f = fetchFixture(), source = await fetchMcClellanSource({ fetcher: f.fetcher, asOf });
  const later = "2026-11-24T15:00:00Z";
  assert.equal(buildMcClellanData(source, later).stale, true);
  assert.equal(buildMcClellanData(source, later).cutoffDate, "2026-11-20");
  const retry = fetchFixture();
  await assert.rejects(fetchMcClellanSource({ fetcher: retry.fetcher, asOf: later }), /Latest closed session/);
});
test("HTTP errors, excessive bodies, wrong revisions and malformed source fail closed", async () => {
  for (const fetcher of [
    async () => new Response("limited", { status: 429 }),
    async () => new Response("x".repeat(100001)),
    async () => new Response("[]"),
    async () => new Response("{broken json"),
    async () => { throw new TypeError("fetch failed"); },
  ]) await assert.rejects(fetchMcClellanSource({ fetcher, asOf }), McClellanSourceError);
  const bad = fixture(); bad.data.splice(30, 1);
  const f = fetchFixture(bad);
  await assert.rejects(fetchMcClellanSource({ fetcher: f.fetcher, asOf }), McClellanSourceError);
});

const require = createRequire(import.meta.url), ts = require("typescript");
function cronHarness({ fail = false } = {}) {
  const calls = [];
  const source = readFileSync(new URL("../../app/api/cron/mcclellan/route.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  const req = name => {
    if (name === "node:crypto") return require(name);
    if (name === "next/cache") return { revalidateTag: (...args) => calls.push(["tag", ...args]), revalidatePath: value => calls.push(["path", value]) };
    if (name.endsWith("get-mcclellan-data")) return { MCCLELLAN_CACHE_TAG: "mc", getCachedMcClellanSource: async () => calls.push(["cached-refresh"]) };
    if (name.endsWith("mcclellan-source.mjs")) return { McClellanSourceError, fetchMcClellanSource: async () => { calls.push(["preflight"]); if (fail) throw new McClellanSourceError("unavailable"); return {}; }, buildMcClellanData: () => ({ cutoffDate: "2026-11-20" }) };
    throw new Error(name);
  };
  new Function("require", "module", "exports", code)(req, loaded, loaded.exports);
  return { calls, GET: loaded.exports.GET };
}
test("cron rejects missing or incorrect authentication before fetching/invalidation", async () => {
  const previous = process.env.CRON_SECRET;
  try {
    for (const secret of [undefined, "secret-fixture"]) {
      if (secret) process.env.CRON_SECRET = secret; else delete process.env.CRON_SECRET;
      const h = cronHarness();
      assert.equal((await h.GET(new Request("https://example.test/api/cron/mcclellan"))).status, 401);
      assert.deepEqual(h.calls, []);
    }
  } finally { if (previous === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous; }
});
test("cron preflights before SWR refresh and invalidates only its dashboard page", async () => {
  const previous = process.env.CRON_SECRET; process.env.CRON_SECRET = "secret-fixture";
  try {
    const h = cronHarness();
    const response = await h.GET(new Request("https://example.test/api/cron/mcclellan", { headers: { authorization: "Bearer secret-fixture" } }));
    assert.equal(response.status, 200);
    assert.deepEqual(h.calls, [["preflight"], ["tag", "mc", "max"], ["cached-refresh"], ["path", "/dashboard"]]);
  } finally { if (previous === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous; }
});
test("failed provider preflight preserves cache and prevents route invalidation", async () => {
  const previous = process.env.CRON_SECRET; process.env.CRON_SECRET = "secret-fixture";
  try {
    const h = cronHarness({ fail: true });
    const response = await h.GET(new Request("https://example.test/api/cron/mcclellan", { headers: { authorization: "Bearer secret-fixture" } }));
    assert.equal(response.status, 503);
    assert.deepEqual(h.calls, [["preflight"]]);
  } finally { if (previous === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previous; }
});
