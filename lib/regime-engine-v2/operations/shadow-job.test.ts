import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadReviewedCalendars } from "./calendar-package.ts";
import { createLocalJobStore, type JobStorage } from "./job-storage.ts";
import type { SourceBundle } from "./source-input.ts";
import { LATEST_KEY, observationIdentity, runShadowObservation, type JobObservation, type JobTerminal, type ShadowJobOptions } from "./shadow-job.ts";

import { preflight, captured, cut, syntheticBundle } from "./shadow-job.test-fixture.ts";

async function harness(t: { after: (fn: () => Promise<void>) => void }) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "v2-job-test-")); t.after(() => rm(directory, { recursive: true, force: true }));
  const store = await createLocalJobStore({ mode: "TEST", directory });
  const terminals: JobTerminal[] = []; let fetches = 0;
  const run = (extra: Partial<ShadowJobOptions> = {}) => {
    let samples = 0;
    return runShadowObservation({ enabled: "ON", store: () => store, clock: () => samples++ === 0 ? preflight : cut,
      acquire: async () => { fetches++; return { bundle: syntheticBundle(), fetchCalls: 18, completedAt: captured }; },
      onTerminal: value => { terminals.push(structuredClone(value)); }, ...extra });
  };
  return { store, run, terminals, fetches: () => fetches };
}
for (const trigger of ["schedule", "workflow_dispatch"] as const) test(`${trigger} happy path uses raw boundary, C03, replay and publication`, async t => {
  const h = await harness(t), result = await h.run({ trigger });
  assert.equal(result.state, "SUCCESS", JSON.stringify(result)); assert.equal(result.fetchCalls, 18); assert.equal(h.terminals.length, 1);
  const observation = await h.store.readJson<JobObservation>(result.observationKey!);
  assert.equal(observation?.snapshot.v2?.systemState, "COMPLETE"); assert.equal(observation?.snapshot.replayClass, "R2");
  assert.equal(observation?.snapshot.observation.checkpoint.counters.transitions, 0);
  assert.deepEqual(result.stages, ["LOAD_REVIEWED_CALENDAR", "RESOLVE_EXPECTED_SESSION", "CAPTURE_MARKET_SOURCES", "VALIDATE_AND_NORMALIZE", "EVALUATE_C03", "WRITE_IMMUTABLE", "VERIFY_IMMUTABLE", "MONOTONIC_LATEST"]);
});
test("same observation rerun reuses exact output and identity with zero new GETs", async t => {
  const h = await harness(t), first = await h.run(), prior = await h.store.readJson(first.observationKey!); assert.equal(first.state, "SUCCESS");
  const repeat = await h.run(); assert.equal(repeat.state, "NO_NEW_SESSION"); assert.equal(repeat.observationId, first.observationId); assert.equal(repeat.fetchCalls, 0);
  assert.notEqual(repeat.attemptId, first.attemptId); assert.deepEqual(await h.store.readJson(repeat.observationKey!), prior); assert.equal(h.fetches(), 1);
});
test("weekend trigger without a new closed session reuses Friday observation", async t => {
  const h = await harness(t); let sample = 0;
  const friday = "2026-09-11T23:00:00.000Z", completion = "2026-09-11T23:00:01.000Z";
  const first = await h.run({ clock: () => sample++ === 0 ? friday : "2026-09-11T23:01:00.000Z",
    acquire: async () => ({ bundle: syntheticBundle(friday, completion), fetchCalls: 18, completedAt: completion }) });
  assert.equal(first.state, "SUCCESS"); assert.equal(first.expectedSession, "2026-09-11");
  const noNew = await h.run({ clock: () => "2026-09-12T08:30:00.000Z", acquire: async () => { throw new Error("Weekend must reuse"); } });
  assert.equal(noNew.state, "NO_NEW_SESSION"); assert.equal(noNew.observationId, first.observationId); assert.equal(noNew.fetchCalls, 0);
});
test("two concurrent attempts have one canonical observation and one acquisition", async t => {
  const h = await harness(t), results = await Promise.all([h.run(), h.run()]);
  assert.deepEqual(results.map(r => r.state).sort(), ["NO_NEW_SESSION", "SUCCESS"]); assert.equal(results[0].observationId, results[1].observationId); assert.equal(h.fetches(), 1);
});
test("operational identity binds exact cut, temporal source identities and predecessor snapshot", async t => {
  const h = await harness(t), first = await h.run();
  const observation = (await h.store.readJson<JobObservation>(first.observationKey!))!;
  const bundle = (await h.store.readJson<SourceBundle>(observation.bundleKey))!;
  const args = { bundle, input: observation.snapshot.normalizedInput!, snapshot: observation.snapshot, expectedSession: observation.expectedSession, calendarRelease: loadReviewedCalendars(preflight).releaseIdentity };
  assert.equal(observationIdentity(args).observationId, observation.observationId);
  assert.notEqual(observationIdentity({ ...args, input: { ...args.input, asOf: "2026-09-09T13:04:00Z" } }).observationId, observation.observationId);
  const temporal = structuredClone(bundle); temporal.captures[0].capture.startedAt = "2026-09-09T13:02:00Z";
  assert.notEqual(observationIdentity({ ...args, bundle: temporal }).observationId, observation.observationId);
  assert.notEqual(observationIdentity({ ...args, snapshot: { ...args.snapshot, snapshotId: "a".repeat(64) } }).observationId, observation.observationId);
});
test("source unavailable ends with durable terminal and no latest", async t => {
  const h = await harness(t), r = await h.run({ acquire: async () => { throw Object.assign(new Error("unavailable"), { code: "SOURCE_UNAVAILABLE" }); } });
  assert.equal(r.state, "SOURCE_FAILURE"); assert.equal(r.terminalStored, true); assert.equal(await h.store.readJson(LATEST_KEY), null);
});
for (const [label, asOf] of [["expired", "2026-11-01T08:30:00Z"], ["unknown before authority was known", "2026-09-09T12:00:00Z"]]) test(`calendar ${label} fails before capture`, async t => {
  const h = await harness(t), r = await h.run({ clock: () => asOf }); assert.equal(r.state, "CALENDAR_FAILURE"); assert.equal(r.code, "UNKNOWN_CALENDAR"); assert.equal(h.fetches(), 0);
});
test("engine INCOMPLETE is retained as failure evidence without latest or economic session index", async t => {
  const h = await harness(t), r = await h.run({ acquire: async () => { const bundle = syntheticBundle(); bundle.captures = bundle.captures.filter(row => row.ticker !== "XLK"); return { bundle, fetchCalls: 17, completedAt: captured }; } });
  assert.equal(r.state, "INCOMPLETE", JSON.stringify(r)); assert.match(r.observationKey!, /^regime-v2\/runs\//); assert.equal(await h.store.readJson(LATEST_KEY), null);
  assert.equal((await h.run()).state, "SUCCESS");
});
test("engine exception is terminal with no latest", async t => {
  const h = await harness(t), r = await h.run({ evaluate: () => { throw Object.assign(new Error("test"), { code: "ENGINE_TEST_ERROR" }); } }); assert.equal(r.state, "ENGINE_FAILURE"); assert.equal(await h.store.readJson(LATEST_KEY), null);
});
function faultStore(store: JobStorage, operation: "write" | "latest"): JobStorage {
  return { ...store, withExclusive: work => store.withExclusive!(tx => work({ ...tx,
    createJson: (key, value) => operation === "write" && key.startsWith("regime-v2/") ? Promise.reject(Object.assign(new Error("write failed"), { code: "STORAGE_IO" })) : tx.createJson(key, value),
    putLatest: (key, value) => operation === "latest" ? Promise.reject(Object.assign(new Error("pointer failed"), { code: "STORAGE_IO" })) : tx.putLatest(key, value),
  })) };
}
test("snapshot write failure never publishes latest", async t => {
  const h = await harness(t), r = await h.run({ store: () => faultStore(h.store, "write") }); assert.equal(r.state, "STORAGE_FAILURE"); assert.equal(await h.store.readJson(LATEST_KEY), null);
});
test("latest failure retains verified immutable snapshot and recovery does not reacquire", async t => {
  const h = await harness(t), r = await h.run({ store: () => faultStore(h.store, "latest") }); assert.equal(r.state, "STORAGE_FAILURE");
  assert.ok(await h.store.readJson(r.observationKey!)); assert.equal(await h.store.readJson(LATEST_KEY), null);
  const recovered = await h.run(); assert.equal(recovered.state, "NO_NEW_SESSION"); assert.equal(recovered.observationId, r.observationId); assert.equal(h.fetches(), 1); assert.ok(await h.store.readJson(LATEST_KEY));
});
test("timeout during non-cooperating acquisition emits one terminal and no late publication", async t => {
  const h = await harness(t); let release!: (value: { bundle: SourceBundle; fetchCalls: number; completedAt: string }) => void;
  const r = await h.run({ timeoutMs: 30, acquire: () => new Promise(resolve => { release = resolve; }) }); assert.equal(r.state, "TIMEOUT"); assert.equal(h.terminals.length, 1);
  release({ bundle: syntheticBundle(), fetchCalls: 18, completedAt: captured }); await new Promise(resolve => setTimeout(resolve, 10)); assert.equal(await h.store.readJson(LATEST_KEY), null); assert.equal(h.terminals.length, 1);
});
test("rollback OFF calls no calendar, capture, engine or storage", async t => {
  const h = await harness(t), r = await h.run({ enabled: "OFF", loadCalendars: () => { throw new Error("called"); }, store: () => { throw new Error("called"); } }); assert.equal(r.state, "OFF"); assert.equal(h.fetches(), 0); assert.equal(h.terminals.length, 1);
});
test("production store absent is terminal and fail-closed before fetch", async t => {
  const h = await harness(t), r = await h.run({ store: undefined }); assert.equal(r.state, "STORAGE_FAILURE"); assert.equal(r.code, "STORAGE_NOT_CONFIGURED"); assert.equal(h.fetches(), 0);
});
test("market capture before calendar preflight is rejected", async t => {
  const h = await harness(t), r = await h.run({ clock: () => "2026-09-09T13:02:02Z" }); assert.equal(r.state, "SOURCE_FAILURE"); assert.equal(r.code, "TEMPORAL_ORDER"); assert.equal(await h.store.readJson(LATEST_KEY), null);
});
test("session changing during acquisition rejects the cut without retrospective selection", async t => {
  const h = await harness(t); let count = 0;
  const r = await h.run({ clock: () => count++ === 0 ? preflight : "2026-09-09T23:00:00Z" }); assert.equal(r.state, "SOURCE_FAILURE"); assert.equal(r.code, "SESSION_CHANGED_DURING_RUN");
});
