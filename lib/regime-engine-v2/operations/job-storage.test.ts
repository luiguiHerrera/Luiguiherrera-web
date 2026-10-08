import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { createLocalJobStore, createProductionJobStore, JobStorageError, type JobLatest, type JobStorageTransaction } from "./job-storage.ts";

const moduleUrl = new URL("./job-storage.ts", import.meta.url).href;
async function local(t: { after(fn: () => Promise<void>): void }, wait = 1000) {
  const directory = await mkdtemp(path.join(tmpdir(), "regime-job-storage-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return { directory, store: await createLocalJobStore({ mode: "TEST", directory, lockWaitMs: wait }) };
}
function pointer(session: string, id = session, time = "22:00:00Z"): JobLatest {
  return { expectedSession: session, asOf: `${session}T${time}`, observationId: id, observationKey: `regime-v2/engine/C03/${session}/${id}.json` };
}
function code(expected: string) { return (error: unknown) => error instanceof JobStorageError && error.code === expected; }
async function publish(tx: JobStorageTransaction, value: JobLatest) {
  await tx.createJson(value.observationKey, { observationId: value.observationId, expectedSession: value.expectedSession, asOf: value.asOf });
  return tx.putLatest("latest/C03.json", value);
}

test("production factory fails closed without creating a local fallback", async () => {
  await assert.rejects(createProductionJobStore({}), code("STORAGE_NOT_CONFIGURED"));
});
test("local storage is explicit, private and never operational production storage", async t => {
  const { directory, store } = await local(t);
  assert.equal(store.kind, "TEST_FILESYSTEM"); assert.equal(store.operational, false);
  assert.equal((await createLocalJobStore({ mode: "LOCAL", directory })).operational, false);
  await assert.rejects(createLocalJobStore({ mode: "PRODUCTION" as "TEST", directory }), code("STORAGE_INVALID_CONFIG"));
  await assert.rejects(createLocalJobStore({ mode: "TEST", directory: "relative" }), code("STORAGE_INVALID_CONFIG"));
  await assert.rejects(createLocalJobStore({ mode: "TEST", directory: process.cwd() }), code("STORAGE_INVALID_CONFIG"));
  await assert.rejects(createLocalJobStore({ mode: "TEST", directory, lockWaitMs: Infinity }), code("STORAGE_INVALID_CONFIG"));
});
test("immutable create is deterministic across property ordering and rejects conflicting bytes", async t => {
  const { store } = await local(t), first = await store.createJson("runs/run.json", { b: 2, a: 1 });
  assert.equal(first.status, "CREATED");
  assert.deepEqual(await store.createJson("runs/run.json", { a: 1, b: 2 }), { status: "UNCHANGED", contentHash: first.contentHash });
  await assert.rejects(store.createJson("runs/run.json", { a: 3 }), code("CRITICAL_IDENTITY_COLLISION"));
  assert.deepEqual(await store.readJson("runs/run.json"), { a: 1, b: 2 });
});
test("read verification detects corrupted envelope and preserved content with wrong hash", async t => {
  const { directory, store } = await local(t);
  await store.createJson("runs/run.json", { status: "SUCCESS" });
  const target = path.join(directory, "runs/run.json"), original = await readFile(target, "utf8");
  await writeFile(target, original.replace("SUCCESS", "FAILURE"));
  await assert.rejects(store.readJson("runs/run.json"), code("STORAGE_CORRUPT"));
  await writeFile(target, "{"); await assert.rejects(store.readJson("runs/run.json"), code("STORAGE_CORRUPT"));
});
test("non-JSON, cyclic, sparse, accessor and oversized values cannot become observations", async t => {
  const { store } = await local(t), cycle: { self?: unknown } = {}; cycle.self = cycle;
  const getter = Object.defineProperty({}, "x", { enumerable: true, get: () => { throw new Error("getter must not execute"); } });
  const arrayGetter = Object.defineProperty([1], "0", { enumerable: true, get: () => { throw new Error("array getter must not execute"); } });
  for (const value of [undefined, NaN, Infinity, { a: undefined }, cycle, new Date(), Array(2), getter, arrayGetter, { [Symbol("x")]: 1 }, "x".repeat(32 * 1024 * 1024)]) {
    await assert.rejects(store.createJson("runs/invalid.json", value), code("STORAGE_INVALID_JSON"));
  }
  assert.equal(await store.readJson("runs/invalid.json"), null);
});
test("object keys cannot escape, enter reserved mutable namespace or traverse symlinks", async t => {
  const { directory, store } = await local(t), target = await mkdtemp(path.join(tmpdir(), "regime-storage-outside-"));
  t.after(() => rm(target, { recursive: true, force: true }));
  for (const key of ["../escape.json", "/absolute.json", "a/../escape.json", "a//x.json", "a\\b.json", "latest/C03.json", ".writer-lock/owner.json"]) await assert.rejects(store.createJson(key, {}), code("STORAGE_INVALID_KEY"));
  await symlink(target, path.join(directory, "linked"));
  await assert.rejects(store.createJson("linked/x.json", {}), code("STORAGE_INVALID_CONFIG"));
  assert.deepEqual(await readdir(target), []);
});
test("unsafe pre-existing directory permissions and repository symlinks fail config", async t => {
  const { directory } = await local(t), unsafe = path.join(directory, "open"), repoLink = path.join(directory, "repo");
  await mkdir(unsafe, { mode: 0o755 });
  await assert.rejects(createLocalJobStore({ mode: "TEST", directory: unsafe }), code("STORAGE_INVALID_CONFIG"));
  await symlink(process.cwd(), repoLink);
  await assert.rejects(createLocalJobStore({ mode: "TEST", directory: repoLink }), code("STORAGE_INVALID_CONFIG"));
});
test("latest cannot precede its verified immutable observation or point at a mismatched identity", async t => {
  const { store } = await local(t), value = pointer("2026-09-08");
  await store.withExclusive(async tx => {
    await assert.rejects(tx.putLatest("latest/C03.json", value), code("STORAGE_MISSING_OBSERVATION"));
    await tx.createJson(value.observationKey, { observationId: "wrong" });
    await assert.rejects(tx.putLatest("latest/C03.json", value), code("STORAGE_MISSING_OBSERVATION"));
  });
  assert.equal(await store.readJson("latest/C03.json"), null);
});
test("same observation is unchanged; an older session or older same-session asOf never rewinds latest", async t => {
  const { store } = await local(t), first = pointer("2026-09-08", "one"), second = pointer("2026-09-09", "two");
  await store.withExclusive(async tx => {
    assert.equal((await publish(tx, first)).status, "CREATED");
    assert.equal((await tx.putLatest("latest/C03.json", { ...first, asOf: "2026-09-08T23:00:00Z" })).status, "UNCHANGED");
    assert.equal((await publish(tx, second)).status, "ADVANCED");
    assert.equal((await tx.putLatest("latest/C03.json", first)).status, "STALE");
    assert.equal((await publish(tx, pointer("2026-09-09", "earlier", "21:00:00Z"))).status, "STALE");
  });
  assert.deepEqual(await store.readJson("latest/C03.json"), second);
});
test("equal canonical ordering with different identities conflicts without overwriting either snapshot", async t => {
  const { store } = await local(t), first = pointer("2026-09-08", "one"), conflict = pointer("2026-09-08", "two");
  await store.withExclusive(async tx => {
    await publish(tx, first);
    await assert.rejects(publish(tx, conflict), code("STORAGE_CONFLICT"));
  });
  assert.deepEqual(await store.readJson("latest/C03.json"), first);
  assert.ok(await store.readJson(conflict.observationKey));
});
test("pointer write failure leaves an already verified immutable snapshot recoverable", async t => {
  const { directory, store } = await local(t), value = pointer("2026-09-08");
  await mkdir(path.join(directory, "latest"), { mode: 0o700 });
  await mkdir(path.join(directory, "latest/C03.json"), { mode: 0o700 });
  await store.withExclusive(async tx => { await assert.rejects(publish(tx, value)); });
  assert.equal((await store.readJson<{ observationId: string }>(value.observationKey))!.observationId, value.observationId);
});
test("snapshot conflict cannot update canonical latest", async t => {
  const { store } = await local(t), first = pointer("2026-09-08");
  await store.withExclusive(async tx => {
    await publish(tx, first);
    await assert.rejects(tx.createJson(first.observationKey, { observationId: "contradiction" }), code("CRITICAL_IDENTITY_COLLISION"));
  });
  assert.deepEqual(await store.readJson("latest/C03.json"), first);
});
test("one transaction serializes overlapping publication operations", async t => {
  const { store } = await local(t), older = pointer("2026-09-08"), newer = pointer("2026-09-09");
  await store.withExclusive(async tx => {
    await Promise.all([tx.createJson(older.observationKey, { observationId: older.observationId }), tx.createJson(newer.observationKey, { observationId: newer.observationId })]);
    const result = await Promise.all([tx.putLatest("latest/C03.json", newer), tx.putLatest("latest/C03.json", older)]);
    assert.deepEqual(result.map(item => item.status), ["CREATED", "STALE"]);
  });
  assert.deepEqual(await store.readJson("latest/C03.json"), newer);
});
test("exclusive ownership persists through awaited work and is released on failure", async t => {
  const { directory, store } = await local(t), second = await createLocalJobStore({ mode: "TEST", directory });
  const sequence: string[] = [];
  const a = store.withExclusive(async () => { sequence.push("first-start"); await delay(60); sequence.push("first-end"); throw new Error("injected"); });
  const b = second.withExclusive(async () => { sequence.push("second"); });
  await assert.rejects(a, /injected/); await b;
  assert.deepEqual(sequence, ["first-start", "first-end", "second"]);
});
test("expired transaction capability cannot modify latest or create records", async t => {
  const { store } = await local(t); let old: JobStorageTransaction | undefined;
  await store.withExclusive(async tx => { old = tx; });
  await assert.rejects(old!.createJson("runs/late.json", {}), code("STORAGE_LOCK_REQUIRED"));
  assert.equal(await store.readJson("runs/late.json"), null);
});
test("an abandoned writer lock fails closed without deleting or stealing it", async t => {
  const { directory, store } = await local(t, 10);
  await mkdir(path.join(directory, ".writer-lock"), { mode: 0o700 });
  await writeFile(path.join(directory, ".writer-lock/owner.json"), "operator-audit-required", { mode: 0o600 });
  await assert.rejects(store.withExclusive(async () => assert.fail("must not run")), code("STORAGE_LOCKED"));
  assert.equal(await readFile(path.join(directory, ".writer-lock/owner.json"), "utf8"), "operator-audit-required");
});
test("separate OS processes preserve newer predecessor when the older run finishes last", async t => {
  const { directory, store } = await local(t);
  const child = (session: string, hold: number) => new Promise<string>((resolve, reject) => {
    const source = `import { createLocalJobStore } from ${JSON.stringify(moduleUrl)};
      const store = await createLocalJobStore({mode:'TEST', directory:process.argv[1], lockWaitMs:4000});
      const session=process.argv[2], value={expectedSession:session,asOf:session+'T22:00:00Z',observationId:session,observationKey:'observations/'+session+'.json'};
      await store.withExclusive(async tx=>{process.stdout.write('LOCKED\\n');await new Promise(r=>setTimeout(r,Number(process.argv[3])));await tx.createJson(value.observationKey,{observationId:session});const result=await tx.putLatest('latest/C03.json',value);process.stdout.write(result.status+'\\n');});`;
    const processChild = spawn(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--input-type=module", "-e", source, directory, session, String(hold)], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "";
    processChild.stdout.on("data", chunk => { stdout += chunk; }); processChild.stderr.on("data", chunk => { stderr += chunk; });
    processChild.on("error", reject); processChild.on("close", exit => exit === 0 ? resolve(stdout) : reject(new Error(stderr)));
  });
  // Wait for the newer process to own the shared lock, then start the older writer.
  const newer = child("2026-09-09", 200);
  const deadline = Date.now() + 3000;
  for (;;) { try { await readFile(path.join(directory, ".writer-lock/owner.json")); break; } catch { if (Date.now() > deadline) assert.fail("child did not acquire writer lock"); await delay(5); } }
  const older = child("2026-09-08", 0), results = await Promise.all([newer, older]);
  assert.match(results[0], /CREATED/); assert.match(results[1], /STALE/);
  assert.equal((await store.readJson<JobLatest>("latest/C03.json"))!.expectedSession, "2026-09-09");
  assert.ok(await store.readJson("observations/2026-09-08.json"));
});
test("immutable observations and pointer remain verifiable after reopening the adapter", async t => {
  const { directory, store } = await local(t), value = pointer("2026-09-08");
  await store.withExclusive(tx => publish(tx, value));
  const restored = await createLocalJobStore({ mode: "TEST", directory });
  assert.deepEqual(await restored.readJson("latest/C03.json"), value);
  assert.equal((await restored.readJson<{ observationId: string }>(value.observationKey))!.observationId, value.observationId);
  assert.equal(restored.operational, false);
});
