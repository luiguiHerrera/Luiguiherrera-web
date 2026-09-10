import assert from "node:assert/strict";
import test from "node:test";
import { FakeS3 } from "./s3-storage.test-fixture.ts";
import { preflight, captured, cut, syntheticBundle } from "./shadow-job.test-fixture.ts";
import { LATEST_KEY, runShadowObservation, type JobObservation, type JobTerminal, type ShadowJobOptions } from "./shadow-job.ts";
import { jobObjectCodec } from "./job-storage.ts";

function harness(fake = new FakeS3()) {
  const terminals: JobTerminal[] = []; let fetches = 0;
  const run = (extra: Partial<ShadowJobOptions> = {}) => {
    let samples = 0;
    return runShadowObservation({ enabled: "ON", store: () => fake.store(), clock: () => samples++ === 0 ? preflight : cut,
      acquire: async () => { fetches++; return { bundle: syntheticBundle(), fetchCalls: 18, completedAt: captured }; },
      onTerminal: record => { terminals.push(structuredClone(record)); }, ...extra });
  };
  const economic = () => [...fake.objects].filter(([, object]) => (jobObjectCodec.decode(object.bytes) as { kind?: string }).kind === "ECONOMIC_OBSERVATION");
  const runs = () => [...fake.objects.keys()].filter(key => key.endsWith("/terminal.json"));
  return { fake, run, terminals, economic, runs, fetches: () => fetches };
}
function twoWritersBeforeObservation(fake: FakeS3) {
  let count = 0, release!: () => void; const both = new Promise<void>(resolve => { release = resolve; });
  fake.beforePut = async key => {
    if (/\/2026-09-08\/[a-f0-9]{64}\.json$/.test(key)) {
      if (++count === 2) release();
      await both;
    }
  };
}
test("independent S3 attempts with identical full inputs create one economic object and two immutable terminal records", { timeout: 15000 }, async () => {
  const h = harness(); twoWritersBeforeObservation(h.fake);
  const results = await Promise.all([h.run(), h.run()]);
  assert.deepEqual(results.map(row => row.state).sort(), ["NO_NEW_SESSION", "SUCCESS"], JSON.stringify(results));
  assert.equal(results[0].observationId, results[1].observationId); assert.notEqual(results[0].attemptId, results[1].attemptId);
  assert.equal(h.economic().length, 1); assert.equal(h.runs().length, 2); assert.equal(h.terminals.length, 2);
  assert.equal(h.fetches(), 2); // Independent workers may acquire twice; no global lock is claimed.
  const repeat = await h.run(); assert.equal(repeat.fetchCalls, 0); assert.equal(repeat.observationId, results[0].observationId);
  assert.equal(h.runs().length, 3);
});
test("a slower identical acquisition rechecks the completed session before creating a second predecessor snapshot", async () => {
  const h = harness(); let entered!: () => void, release!: () => void;
  const waiting = new Promise<void>(resolve => { entered = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const slow = h.run({ acquire: async () => { entered(); await gate; return { bundle: syntheticBundle(), fetchCalls: 18, completedAt: captured }; } });
  await waiting; const fast = await h.run(); assert.equal(fast.state, "SUCCESS"); release();
  const late = await slow; assert.equal(late.state, "NO_NEW_SESSION"); assert.equal(late.observationId, fast.observationId);
  assert.equal(h.economic().length, 1); assert.equal(h.runs().length, 2);
});
test("different actual cuts retain distinct immutable candidates while first session election reuses original inputs", { timeout: 15000 }, async () => {
  const h = harness(); twoWritersBeforeObservation(h.fake); let samples = 0;
  const laterCut = "2026-09-09T13:04:00.000Z";
  const results = await Promise.all([h.run(), h.run({ clock: () => samples++ === 0 ? preflight : laterCut })]);
  assert.deepEqual(results.map(row => row.state).sort(), ["NO_NEW_SESSION", "SUCCESS"], JSON.stringify(results));
  assert.equal(h.economic().length, 2); assert.equal(h.runs().length, 2);
  const candidates = h.economic().map(([, object]) => jobObjectCodec.decode(object.bytes) as JobObservation);
  assert.notEqual(candidates[0].observationId, candidates[1].observationId);
  assert.deepEqual(candidates.map(row => row.asOf).sort(), [cut, laterCut]);
  assert.equal(results[0].observationId, results[1].observationId);
  const before = h.fake.objects.get(results[0].observationKey!)!.bytes;
  const retry = await h.run({ clock: () => "2026-09-09T13:05:00.000Z", acquire: async () => { throw new Error("Do not recapture a claimed session"); } });
  assert.equal(retry.fetchCalls, 0); assert.equal(h.fake.objects.get(retry.observationKey!)!.bytes, before);
});
test("exhausted latest CAS preserves the verified orphan and a later attempt recovers it with zero market requests", async () => {
  const h = harness(); h.fake.latestConflicts = 10;
  const failed = await h.run(); assert.equal(failed.state, "PUBLICATION_CONFLICT", JSON.stringify(failed)); assert.equal(failed.terminalStored, true);
  assert.equal(h.economic().length, 1); assert.equal(h.fake.objects.has(LATEST_KEY), false);
  const original = h.fake.objects.get(failed.observationKey!)!.bytes; h.fake.latestConflicts = 0;
  const recovered = await h.run(); assert.equal(recovered.state, "NO_NEW_SESSION"); assert.equal(recovered.fetchCalls, 0);
  assert.equal(recovered.observationId, failed.observationId); assert.equal(h.fake.objects.get(recovered.observationKey!)!.bytes, original);
  assert.equal(h.runs().length, 2); assert.equal(h.fetches(), 1); assert.ok(h.fake.objects.has(LATEST_KEY));
});
test("S3 observation write failure creates a terminal record and no economic pointer", async () => {
  const h = harness(); h.fake.beforePut = async key => { if (/\/2026-09-08\/[a-f0-9]{64}\.json$/.test(key)) h.fake.denyWrites.add(key); };
  const failed = await h.run(); assert.equal(failed.state, "STORAGE_FAILURE"); assert.equal(failed.terminalStored, true);
  assert.equal(h.economic().length, 0); assert.equal(h.fake.objects.has(LATEST_KEY), false); assert.equal(h.runs().length, 1);
});
test("S3 terminal persistence failure leaves a verified observation and reports the failed attempt through onTerminal", async () => {
  const h = harness(); h.fake.beforePut = async key => { if (key.endsWith("/terminal.json")) h.fake.denyWrites.add(key); };
  const failed = await h.run(); assert.equal(failed.state, "STORAGE_FAILURE"); assert.equal(failed.code, "TERMINAL_STORAGE_FAILED"); assert.equal(failed.terminalStored, false);
  assert.equal(h.economic().length, 1); assert.equal(h.runs().length, 0); assert.ok(h.fake.objects.has(LATEST_KEY));
  assert.equal(h.terminals.length, 1); assert.deepEqual(h.terminals[0], failed);
});
test("S3 source failure and incomplete raw evidence never create an economic observation or latest", async () => {
  const h = harness();
  const unavailable = await h.run({ acquire: async () => { throw Object.assign(new Error("offline fixture"), { code: "SOURCE_UNAVAILABLE", fetchCalls: 3 }); } });
  assert.equal(unavailable.state, "SOURCE_FAILURE"); assert.equal(unavailable.fetchCalls, 3); assert.equal(unavailable.terminalStored, true);
  const incomplete = await h.run({ acquire: async () => { const bundle = syntheticBundle(); bundle.captures = bundle.captures.filter(row => row.ticker !== "XLK"); return { bundle, fetchCalls: 17, completedAt: captured }; } });
  assert.equal(incomplete.state, "INCOMPLETE", JSON.stringify(incomplete)); assert.equal(h.economic().length, 0);
  assert.equal(h.fake.objects.has(LATEST_KEY), false); assert.equal(h.runs().length, 2);
  assert.ok([...h.fake.objects.keys()].some(key => key.startsWith("regime-v2/runs/") && key.endsWith("/incomplete.json")));
});
test("OFF and unknown calendar make zero S3 CLI calls and zero source acquisitions", async () => {
  const h = harness();
  assert.equal((await h.run({ enabled: "OFF" })).state, "OFF");
  assert.equal((await h.run({ clock: () => "2026-11-01T08:30:00Z" })).state, "CALENDAR_FAILURE");
  assert.equal(h.fake.calls.length, 0); assert.equal(h.fetches(), 0); assert.equal(h.terminals.length, 2);
});
