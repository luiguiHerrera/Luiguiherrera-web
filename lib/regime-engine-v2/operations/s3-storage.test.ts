import assert from "node:assert/strict";
import test from "node:test";
import { createS3JobStore, S3_LATEST_KEY } from "./s3-storage.ts";
import { FakeS3, TEST_S3_CONFIG } from "./s3-storage.test-fixture.ts";
import { jobObjectCodec, type JobLatest, type JobStorage } from "./job-storage.ts";

const observationKey = (id: string) => `regime-v2/observations/test/C03/${id}.json`;
const runKey = "regime-v2/runs/test/attempt/terminal.json";
const code = (expected: string) => (error: unknown) => !!error && typeof error === "object" && "code" in error && error.code === expected;
function pointer(session: string, id = session): JobLatest { return { expectedSession: session, asOf: `${session}T23:00:00Z`, observationId: id, observationKey: observationKey(id), compatibility: "a".repeat(64) }; }
async function observation(store: JobStorage, value: JobLatest) { await store.createJson(value.observationKey, { kind: "ECONOMIC_OBSERVATION", observationId: value.observationId, expectedSession: value.expectedSession, asOf: value.asOf, compatibility: value.compatibility }); }

test("S3 construction is inert and rejects missing or unapproved resource configuration", () => {
  const fake = new FakeS3(); fake.store(); assert.equal(fake.calls.length, 0);
  assert.throws(() => createS3JobStore({ ...TEST_S3_CONFIG, bucket: "" }), code("STORAGE_NOT_CONFIGURED"));
  for (const extra of [{ region: "eu-west-1" }, { bucket: "another-bucket" }, { roleArn: "arn:aws:iam::732159826922:role/RegimeV2S3Probe" }, { maxCasAttempts: 100 }, { timeoutMs: Infinity }]) {
    assert.throws(() => createS3JobStore({ ...TEST_S3_CONFIG, ...extra, executor: fake.execute }), code("STORAGE_INVALID_CONFIG"));
  }
  assert.equal(fake.calls.length, 0);
});
test("preflight validates CLI capabilities, assumed writer identity and only three bucket controls", async () => {
  const fake = new FakeS3(), store = fake.store(), result = await store.preflight();
  assert.equal(result.kind, "S3"); assert.equal(result.operational, true); assert.equal(Object.keys(result.checks).length, 6);
  await store.preflight(); assert.equal(fake.calls.length, 6);
  assert.deepEqual(fake.calls.map(c => c.args[1] ?? "version"), ["version", "put-object", "get-caller-identity", "get-bucket-versioning", "get-public-access-block", "get-bucket-encryption"]);
  assert.equal(store.withExclusive, undefined);
});
test("unsupported CLI, wrong identity and unsafe bucket controls fail before object operations", async () => {
  for (const setting of ["cliVersion", "conditionalCli", "callerRole", "versioning", "publicAccess", "encryption"] as const) {
    const fake = new FakeS3();
    if (setting === "cliVersion") fake.cliVersion = "aws-cli/1.0.0";
    if (setting === "conditionalCli") fake.conditionalCli = false;
    if (setting === "callerRole") fake.callerRole = "RegimeV2S3Probe";
    if (setting === "versioning") fake.versioning = "Suspended";
    if (setting === "publicAccess") fake.publicAccess = false;
    if (setting === "encryption") fake.encryption = "aws:kms";
    await assert.rejects(fake.store().preflight(), code("STORAGE_PREFLIGHT_FAILED"));
    assert.equal(fake.objects.size, 0);
  }
});
test("key plan refuses probe, arbitrary indexes, traversal and shell-shaped inputs before CLI", async () => {
  const fake = new FakeS3(), store = fake.store();
  for (const key of ["regime-v2/_probe/test.json", "regime-v2/indexes/other.json", "runs/test.json", "regime-v2/observations/../x.json", "regime-v2/runs/$(touch_owned).json", S3_LATEST_KEY]) await assert.rejects(store.createJson(key, {}), code("STORAGE_INVALID_KEY"));
  assert.equal(fake.calls.length, 0);
});
test("immutable create reads back the canonical envelope and equal bytes are idempotent", async () => {
  const fake = new FakeS3(), store = fake.store(), key = observationKey("one");
  const created = await store.createJson(key, { b: 2, a: 1 }); assert.equal(created.status, "CREATED");
  assert.deepEqual(await store.createJson(key, { a: 1, b: 2 }), { ...created, status: "UNCHANGED" });
  assert.deepEqual(await store.readJson(key), { a: 1, b: 2 }); assert.equal(fake.objects.size, 1);
  const puts = fake.calls.filter(c => c.args[1] === "put-object" && !c.args.includes("--generate-cli-skeleton"));
  assert.ok(puts.every(c => c.args.includes("--if-none-match") && c.args[c.args.indexOf("--if-none-match") + 1] === "*"));
  assert.ok(fake.calls.filter(c => c.args[0] === "s3api" && !c.args.includes("--generate-cli-skeleton")).every(c => c.args.includes("--expected-bucket-owner")));
});
test("incompatible existing immutable bytes are a critical collision and never overwritten", async () => {
  const fake = new FakeS3(), store = fake.store(), key = observationKey("collision");
  await store.createJson(key, { value: 1 }); const original = fake.objects.get(key)!.bytes;
  await assert.rejects(store.createJson(key, { value: 2 }), code("CRITICAL_IDENTITY_COLLISION"));
  assert.equal(fake.objects.get(key)!.bytes, original);
});
test("read-back rejects envelope corruption and mismatched created version", async () => {
  for (const fault of ["corruptReads", "wrongReadVersions"] as const) {
    const fake = new FakeS3(), key = observationKey(fault); fake[fault].add(key);
    await assert.rejects(fake.store().createJson(key, { safe: true }), code("STORAGE_CORRUPT"));
    assert.equal(fake.objects.size, 1); assert.equal(fake.objects.has(S3_LATEST_KEY), false);
  }
});
test("403 on a missing key requires an exact-key ListObjectsV2 with max-keys1 and no pagination", async () => {
  const fake = new FakeS3(), store = fake.store(); assert.equal(await store.readJson(S3_LATEST_KEY), null);
  const list = fake.calls.find(c => c.args[1] === "list-objects-v2")!.args;
  assert.equal(list[list.indexOf("--prefix") + 1], S3_LATEST_KEY); assert.equal(list[list.indexOf("--max-keys") + 1], "1"); assert.ok(list.includes("--no-paginate"));
});
test("403 for an existing object or denied existence list stays a failure", async () => {
  const fake = new FakeS3(), key = observationKey("denied"); fake.putRaw(key, jobObjectCodec.encode({ value: 1 }).bytes); fake.denyReads.add(key);
  await assert.rejects(fake.store().readJson(key), code("STORAGE_IO"));
  const missing = new FakeS3(); missing.denyList = true;
  await assert.rejects(missing.store().readJson(key), code("STORAGE_IO")); assert.equal(missing.objects.size, 0);
});
test("an ambiguous existence listing cannot authorize treating a key as absent", async () => {
  const fake = new FakeS3(), key = observationKey("prefix"); fake.putRaw(key + "-extra", jobObjectCodec.encode({ value: 1 }).bytes);
  await assert.rejects(fake.store().readJson(key), code("STORAGE_CORRUPT"));
});
test("latest cannot precede its exact read-verified observation", async () => {
  const fake = new FakeS3(), store = fake.store(), value = pointer("2026-09-08");
  await assert.rejects(store.putLatest(S3_LATEST_KEY, value), code("STORAGE_MISSING_OBSERVATION"));
  await store.createJson(value.observationKey, { observationId: value.observationId, expectedSession: value.expectedSession, asOf: "2026-09-09T00:00:00Z" });
  await assert.rejects(store.putLatest(S3_LATEST_KEY, value), code("STORAGE_MISSING_OBSERVATION"));
  assert.equal(fake.objects.has(S3_LATEST_KEY), false);
});
test("latest first create, CAS advance, identical reuse and stale rejection retain the newest pointer", async () => {
  const fake = new FakeS3(), store = fake.store(), first = pointer("2026-09-08"), next = pointer("2026-09-09");
  await observation(store, first); await observation(store, next);
  assert.equal((await store.putLatest(S3_LATEST_KEY, first)).status, "CREATED");
  assert.equal((await store.putLatest(S3_LATEST_KEY, next)).status, "ADVANCED");
  assert.equal((await store.putLatest(S3_LATEST_KEY, next)).status, "UNCHANGED");
  assert.equal((await store.putLatest(S3_LATEST_KEY, first)).status, "STALE");
  assert.deepEqual(await store.readJson(S3_LATEST_KEY), next);
});
test("different version compatibility and equal ordering with different observations cannot advance", async () => {
  const fake = new FakeS3(), store = fake.store(), first = pointer("2026-09-08"), other = pointer("2026-09-08", "other"), newer = { ...pointer("2026-09-09"), compatibility: "b".repeat(64) };
  for (const value of [first, other, newer]) await observation(store, value);
  await store.putLatest(S3_LATEST_KEY, first);
  await assert.rejects(store.putLatest(S3_LATEST_KEY, other), code("STORAGE_CONFLICT"));
  await assert.rejects(store.putLatest(S3_LATEST_KEY, newer), code("STORAGE_CONFLICT"));
  assert.deepEqual(fake.value(S3_LATEST_KEY), first);
});
test("two independent adapters cannot let the older stale ETag writer rewind latest", async () => {
  const fake = new FakeS3(), olderStore = fake.store(), newerStore = fake.store();
  const base = pointer("2026-09-08"), older = pointer("2026-09-09"), newer = pointer("2026-09-10");
  for (const value of [base, older, newer]) await observation(olderStore, value);
  await olderStore.putLatest(S3_LATEST_KEY, base);
  let ready!: () => void, release!: () => void; const entered = new Promise<void>(resolve => { ready = resolve; }), resumed = new Promise<void>(resolve => { release = resolve; }); let blocked = false;
  fake.beforePut = async key => { if (key === S3_LATEST_KEY && !blocked) { blocked = true; ready(); await resumed; } };
  const oldAttempt = olderStore.putLatest(S3_LATEST_KEY, older); await entered;
  assert.equal((await newerStore.putLatest(S3_LATEST_KEY, newer)).status, "ADVANCED"); release();
  assert.equal((await oldAttempt).status, "STALE"); assert.deepEqual(fake.value(S3_LATEST_KEY), newer);
  assert.ok(fake.objects.has(older.observationKey)); assert.ok(fake.objects.has(newer.observationKey));
});
test("CAS conflict rereads are bounded and never fall back to an unconditional put", async () => {
  const fake = new FakeS3(), store = fake.store({ maxCasAttempts: 3 }), value = pointer("2026-09-08");
  await observation(store, value); fake.latestConflicts = 9;
  await assert.rejects(store.putLatest(S3_LATEST_KEY, value), code("PUBLICATION_CONFLICT"));
  const attempts = fake.calls.filter(c => c.args[1] === "put-object" && c.args.includes(S3_LATEST_KEY));
  assert.equal(attempts.length, 3); assert.ok(attempts.every(c => c.args.includes("--if-none-match")));
  assert.equal(fake.objects.has(S3_LATEST_KEY), false); assert.ok(fake.objects.has(value.observationKey));
});
test("observation and latest write failures preserve existing objects and never delete", async () => {
  const fake = new FakeS3(), store = fake.store(), first = pointer("2026-09-08"), next = pointer("2026-09-09");
  await observation(store, first); await store.putLatest(S3_LATEST_KEY, first); fake.denyWrites.add(next.observationKey);
  await assert.rejects(observation(store, next), code("STORAGE_IO")); assert.deepEqual(fake.value(S3_LATEST_KEY), first);
  fake.denyWrites.clear(); await observation(store, next); fake.denyWrites.add(S3_LATEST_KEY);
  await assert.rejects(store.putLatest(S3_LATEST_KEY, next), code("STORAGE_IO")); assert.deepEqual(fake.value(S3_LATEST_KEY), first); assert.ok(fake.objects.has(next.observationKey));
  assert.ok(!fake.calls.some(c => c.args[1]?.startsWith("delete")));
});
test("run records are immutable per attempt and a run write failure cannot change observations", async () => {
  const fake = new FakeS3(), store = fake.store(), value = pointer("2026-09-08"); await observation(store, value);
  await store.createJson(runKey, { attemptId: "one", state: "SUCCESS" });
  await assert.rejects(store.createJson(runKey, { attemptId: "two" }), code("CRITICAL_IDENTITY_COLLISION"));
  fake.denyWrites.add("regime-v2/runs/test/two/terminal.json");
  await assert.rejects(store.createJson("regime-v2/runs/test/two/terminal.json", {}), code("STORAGE_IO"));
  assert.ok(fake.objects.has(value.observationKey)); assert.equal(fake.objects.size, 2);
});
test("CLI errors retain a bounded AWS class without provider error details", async () => {
  const fake = new FakeS3(), store = fake.store(); fake.denyWrites.add(runKey);
  await assert.rejects(store.createJson(runKey, {}), error => { assert.ok(error instanceof Error); assert.match(error.message, /AccessDenied/); assert.ok(!error.message.includes("PRIVATE_ERROR_DO_NOT_LOG")); return true; });
});
test("JSON AWS error codes preserve missing, denied and conditional behavior without private details", async () => {
  const fake = new FakeS3(); fake.jsonErrors = true; const store = fake.store(), key = observationKey("json");
  assert.equal(await store.readJson(key), null); fake.missing403 = false;
  assert.equal(await store.readJson(key), null);
  await store.createJson(key, { value: 1 }); assert.equal((await store.createJson(key, { value: 1 })).status, "UNCHANGED");
  fake.denyReads.add(key);
  await assert.rejects(store.readJson(key), error => { assert.match(String(error), /AccessDenied/); assert.doesNotMatch(String(error), /PRIVATE_ERROR/); return true; });
});
test("GetObject range bounds downloaded bytes before any body is parsed", async () => {
  const fake = new FakeS3(), key = observationKey("oversize"); fake.putRaw(key, "x".repeat(jobObjectCodec.maxBytes + 2));
  await assert.rejects(fake.store().readJson(key), code("STORAGE_CORRUPT"));
  const get = fake.calls.find(c => c.args[1] === "get-object")!.args;
  assert.equal(get[get.indexOf("--range") + 1], `bytes=0-${jobObjectCodec.maxBytes}`);
});
test("pointer compatibility cannot be asserted over an incompatible observation or prior pointer", async () => {
  const fake = new FakeS3(), store = fake.store(), first = pointer("2026-09-08"), next = pointer("2026-09-09");
  await observation(store, first); await observation(store, next);
  await assert.rejects(store.putLatest(S3_LATEST_KEY, { ...first, compatibility: "b".repeat(64) }), code("STORAGE_MISSING_OBSERVATION"));
  fake.putRaw(S3_LATEST_KEY, jobObjectCodec.encode({ ...first, observationId: "not-the-observation" }).bytes);
  await assert.rejects(store.putLatest(S3_LATEST_KEY, next), code("STORAGE_MISSING_OBSERVATION"));
});
test("missing caller credentials and an unavailable bucket fail preflight with safe bounded diagnostics", async () => {
  for (const failedOperation of ["get-caller-identity", "get-bucket-versioning"]) {
    const fake = new FakeS3();
    const store = createS3JobStore({ ...TEST_S3_CONFIG, executor: (args, timeout) => args[1] === failedOperation ? Promise.resolve({ exitCode: 254, stdout: "", stderr: `An error occurred (${failedOperation === "get-caller-identity" ? "ExpiredToken" : "NoSuchBucket"}) when calling the operation: PRIVATE_ERROR_DO_NOT_LOG` }) : fake.execute(args, timeout) });
    await assert.rejects(store.preflight(), error => { assert.match(String(error), /ExpiredToken|NoSuchBucket/); assert.doesNotMatch(String(error), /PRIVATE_ERROR/); return true; });
    assert.equal(fake.objects.size, 0);
  }
});
