import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import type { AssetStatRecord } from "../statistical-levels/types";
import { sessionDates } from "../research/mcclellan-core.mjs";
import { PRICE_PARTICIPATION_SECTOR_TICKERS } from "./price-participation";
import {
  PRICE_PARTICIPATION_HISTORY_LIMIT, PRICE_PARTICIPATION_SOURCE_URL,
  PriceParticipationSourceError, extractPriceParticipationSeries, loadPriceParticipationPublication,
  type PriceParticipationSourceDependencies,
} from "./price-participation-source";

const baseline = { id: "published-adjusted-baseline", cutoff: "2026-11-24T19:40:02.151Z", rawManifestSha256: "d".repeat(64),
  schemaVersion: "statistical-levels.snapshot.v3", historicalDriftCause: "UNEXPLAINED" as const };
const snapshot = { id: "a".repeat(64), revision: "b".repeat(40) };
const dates = sessionDates("2025-01-02", "2026-11-24");
function asset(ticker: string): AssetStatRecord {
  return {
    ticker,
    dataAuthority: { baselineId: baseline.id, snapshotCutoff: baseline.cutoff, rawSha256: "c".repeat(64),
      lastCompletedObservation: { daily: "2026-11-23", weekly: "2026-11-20", monthly: "2026-10-30" }, historicalDriftCause: "UNEXPLAINED" },
    frequencies: { daily: { drawdownHistory: dates.map((date, index) => ({ date, close: 100 + index * 0.123456 })) } },
  } as unknown as AssetStatRecord;
}
function fixture() {
  const tickers = ["SPY", "RSP", ...PRICE_PARTICIPATION_SECTOR_TICKERS];
  const assets = new Map(tickers.map(ticker => [ticker, asset(ticker)]));
  const calls = { pages: [] as unknown[], sources: [] as unknown[], assets: [] as string[] };
  const page = { data: { asset: assets.get("SPY")!, manifest: { baseline, sourceUrl: "https://finance.yahoo.com/" } }, snapshot };
  const dependencies: PriceParticipationSourceDependencies = {
    loadPublishedPage: async selection => { calls.pages.push(selection); return page; },
    sourceForSnapshot: async (id, revision) => {
      calls.sources.push([id, revision]);
      return { snapshot, source: { getAsset: async ticker => { calls.assets.push(ticker); return assets.get(ticker)!; } } };
    },
    now: () => new Date("2026-11-25T10:00:00Z"),
  };
  return { dependencies, assets, calls, page };
}

test("one publication and one resolver supply SPY plus exactly twelve same-source asset reads", async () => {
  const f = fixture(), publication = await loadPriceParticipationPublication(f.dependencies);
  assert.deepEqual(f.calls.pages, [{ asset: "SPY", frequency: "daily", window: "Full" }]);
  assert.deepEqual(f.calls.sources, [[snapshot.id, snapshot.revision]]);
  assert.deepEqual(f.calls.assets, ["RSP", ...PRICE_PARTICIPATION_SECTOR_TICKERS]);
  assert.equal(publication.series.length, 13);
  assert.equal(new Set(publication.series.map(row => row.ticker)).size, 13);
  assert.equal(publication.priceThrough, "2026-11-23");
  assert.equal(publication.authority.id, baseline.id);
  assert.equal(publication.authority.revision, snapshot.revision);
  assert.equal(publication.authority.retrievedAt, "2026-11-25T10:00:00.000Z");
  assert.equal(publication.refreshStatus, "current");
});

test("all thirteen series retain only their last 300 completed daily observations", async () => {
  const f = fixture(), before = JSON.stringify([...f.assets]);
  const publication = await loadPriceParticipationPublication(f.dependencies);
  for (const series of publication.series) {
    assert.equal(series.points.length, PRICE_PARTICIPATION_HISTORY_LIMIT);
    assert.equal(series.points.at(-1)?.date, "2026-11-23");
    assert.ok(series.points.every(point => point.date <= "2026-11-23"));
  }
  assert.equal(JSON.stringify([...f.assets]), before);
  publication.series[0].points[0].close = 1;
  assert.equal(JSON.stringify([...f.assets]), before);
});

test("currentMark, top-level lastDate and lastClose are never consulted", async () => {
  const f = fixture();
  for (const record of f.assets.values()) {
    for (const field of ["currentMark", "lastDate", "lastClose", "compactSeries"]) Object.defineProperty(record, field, {
      get: () => { throw new Error(`Intraday/display field read: ${field}`); },
    });
  }
  const publication = await loadPriceParticipationPublication(f.dependencies);
  assert.equal(publication.priceThrough, "2026-11-23");
  assert.equal(publication.series[0].points.at(-1)?.date, "2026-11-23");
});

test("six-decimal source prices and null observations survive extraction without rounding or zero filling", () => {
  const record = asset("SPY");
  record.frequencies.daily.drawdownHistory = [
    { date: "2026-11-20", close: 689.809998 },
    { date: "2026-11-23", close: 722.289978 },
    { date: "2026-11-24", close: 717.58 },
  ];
  const extracted = extractPriceParticipationSeries(record, "SPY", baseline);
  assert.deepEqual(extracted.points, [{ date: "2026-11-20", close: 689.809998 }, { date: "2026-11-23", close: 722.289978 }]);
  (record.frequencies.daily.drawdownHistory[1] as { date: string; close: number | null }).close = null;
  assert.equal(extractPriceParticipationSeries(record, "SPY", baseline).points.at(-1)?.close, null);
});

test("a lagging sector preserves its own cutoff instead of moving SPY or copying a later mark", async () => {
  const f = fixture();
  f.assets.get("XLK")!.dataAuthority!.lastCompletedObservation.daily = "2026-11-20";
  const publication = await loadPriceParticipationPublication(f.dependencies);
  assert.equal(publication.priceThrough, "2026-11-23");
  assert.equal(publication.series.find(row => row.ticker === "XLK")?.points.at(-1)?.date, "2026-11-20");
  assert.equal(publication.series.find(row => row.ticker === "SPY")?.points.at(-1)?.date, "2026-11-23");
});

test("a SPY row omitted on a session published by another ETF becomes null without compressing intervals", async () => {
  for (const missingDate of ["2026-11-10", "2026-11-23"]) {
    const f = fixture(), spy = f.assets.get("SPY")!;
    spy.frequencies.daily.drawdownHistory = spy.frequencies.daily.drawdownHistory.filter(point => point.date !== missingDate);
    const publication = await loadPriceParticipationPublication(f.dependencies);
    const points = publication.series[0].points;
    assert.equal(points.length, 300);
    assert.deepEqual(points.find(point => point.date === missingDate), { date: missingDate, close: null });
    assert.equal(points.at(-1)?.date, "2026-11-23");
    assert.ok(points.every(point => dates.includes(point.date)));
  }
});

test("all assets must match the selected ticker, baseline, cutoff and valid authority binding", async () => {
  for (const change of [
    (record: AssetStatRecord) => { record.ticker = "WRONG"; },
    (record: AssetStatRecord) => { record.dataAuthority!.baselineId = "another-baseline"; },
    (record: AssetStatRecord) => { record.dataAuthority!.snapshotCutoff = "2026-11-23T19:40:02Z"; },
    (record: AssetStatRecord) => { record.dataAuthority!.rawSha256 = "not-a-hash"; },
  ]) {
    const f = fixture(); change(f.assets.get("XLC")!);
    await assert.rejects(loadPriceParticipationPublication(f.dependencies), /Incoherent/);
  }
});

test("invalid or missing selected snapshot authority is rejected before producing any publication", async () => {
  const missing = fixture(); missing.dependencies.sourceForSnapshot = async () => null;
  await assert.rejects(loadPriceParticipationPublication(missing.dependencies), /no longer available/);
  const wrong = fixture(); wrong.dependencies.sourceForSnapshot = async () => ({ snapshot: { ...snapshot, id: "e".repeat(64) }, source: { getAsset: async ticker => asset(ticker) } });
  await assert.rejects(loadPriceParticipationPublication(wrong.dependencies), /no longer available/);
  const malformed = fixture(); malformed.page.snapshot = { ...snapshot, id: "not-a-snapshot" };
  await assert.rejects(loadPriceParticipationPublication(malformed.dependencies), /snapshot identity/);
});

test("invalid histories reject a candidate; identical duplicates coalesce before the history limit", () => {
  const record = asset("SPY"), points = record.frequencies.daily.drawdownHistory;
  record.frequencies.daily.drawdownHistory = [...points.toReversed(), { ...points[0] }];
  const result = extractPriceParticipationSeries(record, "SPY", baseline);
  assert.equal(result.points.length, 300);
  assert.equal(result.points.at(-1)?.date, "2026-11-23");
  record.frequencies.daily.drawdownHistory.push({ ...points[0], close: 1 });
  assert.throws(() => extractPriceParticipationSeries(record, "SPY", baseline), /Conflicting/);
  for (const value of [0, -1, NaN, Infinity]) {
    const invalid = asset("SPY"); invalid.frequencies.daily.drawdownHistory[0].close = value;
    assert.throws(() => extractPriceParticipationSeries(invalid, "SPY", baseline), /Invalid adjusted/);
  }
  const invalidDate = asset("SPY"); invalidDate.frequencies.daily.drawdownHistory[0].date = "2026-02-30";
  assert.throws(() => extractPriceParticipationSeries(invalidDate, "SPY", baseline), /Invalid adjusted/);
});

test("an unavailable sector can remain absent, but an unavailable SPY cannot become a publication", () => {
  const sector = asset("XLK");
  sector.dataAuthority!.lastCompletedObservation.daily = null;
  sector.frequencies.daily.drawdownHistory = [];
  assert.deepEqual(extractPriceParticipationSeries(sector, "XLK", baseline), { ticker: "XLK", points: [] });
  const spy = asset("SPY"); spy.frequencies.daily.drawdownHistory = [];
  assert.throws(() => extractPriceParticipationSeries(spy, "SPY", baseline), /No completed SPY/);
});

test("valid public source URLs are retained; unsafe URLs fall back to the published repository", async () => {
  const f = fixture();
  assert.equal((await loadPriceParticipationPublication(f.dependencies)).authority.sourceUrl, "https://finance.yahoo.com/");
  for (const url of ["javascript:alert(1)", "https://user:password@example.test/", "not-a-url"]) {
    f.page.data.manifest.sourceUrl = url;
    assert.equal((await loadPriceParticipationPublication(f.dependencies)).authority.sourceUrl, PRICE_PARTICIPATION_SOURCE_URL);
  }
});

test("publication I/O failures reject rather than resolve a substitute; framework exceptions retain identity", async () => {
  const f = fixture(); f.dependencies.loadPublishedPage = async () => { throw new TypeError("network unavailable"); };
  await assert.rejects(loadPriceParticipationPublication(f.dependencies), PriceParticipationSourceError);
  const files = fixture(); files.dependencies.sourceForSnapshot = async () => ({ snapshot, source: { getAsset: async () => { throw new Error("asset unavailable"); } } });
  await assert.rejects(loadPriceParticipationPublication(files.dependencies), PriceParticipationSourceError);
  const framework = fixture(), signal = Object.assign(new Error("framework control flow"), { digest: "NEXT_CONTROL_FLOW" });
  framework.dependencies.loadPublishedPage = async () => { throw signal; };
  await assert.rejects(loadPriceParticipationPublication(framework.dependencies), error => error === signal);
});

const require = createRequire(import.meta.url), ts = require("typescript");
function getterHarness() {
  let failure: Error | null = null;
  const candidate = { marker: "validated-publication" };
  let callback: (() => Promise<unknown>) | null = null;
  let cacheOptions: unknown;
  const source = readFileSync(new URL("./get-price-participation-data.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} as { getPriceParticipationData(): Promise<unknown> } };
  const req = (name: string) => {
    if (name === "server-only") return {};
    if (name === "next/cache") return { unstable_cache: (read: () => Promise<unknown>, _keys: string[], options: unknown) => {
      callback = read; cacheOptions = options; return read;
    } };
    if (name.endsWith("/published-data")) return { loadPublishedPage: () => {}, sourceForSnapshot: () => {} };
    if (name === "./price-participation-source") return { PriceParticipationSourceError,
      loadPriceParticipationPublication: async () => { if (failure) throw failure; return candidate; } };
    throw new Error(name);
  };
  new Function("require", "module", "exports", "console", code)(req, loaded, loaded.exports, { warn() {} });
  return { get: loaded.exports.getPriceParticipationData, candidate, fail: (error: Error) => { failure = error; },
    strict: () => callback!(), options: () => cacheOptions };
}

test("the hosted cache is hourly and its strict callback propagates refresh failures", async () => {
  const harness = getterHarness();
  assert.equal(await harness.get(), harness.candidate);
  assert.deepEqual(harness.options(), { revalidate: 3600, tags: ["dashboard-price-participation-publication-v1"] });
  harness.fail(new PriceParticipationSourceError("source refresh failed"));
  await assert.rejects(harness.strict(), PriceParticipationSourceError);
  assert.equal(await harness.get(), null);
});

test("cold source failure returns null, while unrelated framework/programming errors propagate", async () => {
  const harness = getterHarness(); harness.fail(new PriceParticipationSourceError("source unavailable"));
  assert.equal(await harness.get(), null);
  const unexpected = new Error("unrelated failure"); harness.fail(unexpected);
  await assert.rejects(harness.get(), error => error === unexpected);
});
