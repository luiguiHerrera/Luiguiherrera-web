import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, readdir, rm, writeFile, mkdir } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../../../", import.meta.url));
const cli = path.join(repository, "scripts/regime-v2-run-shadow.mts");
const fallback = path.join(repository, "scripts/regime-v2-terminal-fallback.mjs");
// Test-only clock and network interception. No fixture bytes are attributed to
// providers, and no request can leave the subprocess. Each cwd starts empty.
const preload = `
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';
import {syncBuiltinESMExports} from 'node:module';
const RealDate=Date;
globalThis.Date=class extends RealDate { constructor(...args){super(...(args.length?args:['2026-09-09T13:05:00.000Z']));} static now(){return RealDate.parse('2026-09-09T13:05:00.000Z');} };
let attempts=0;
const deny=()=>{attempts++;throw Error('TEST_NETWORK_FORBIDDEN');};
globalThis.fetch=process.env.JOB_TEST_BLOCK_FETCH==='1'?()=>{process.stderr.write('TEST_FETCH_BLOCKED_NO_NETWORK\\n');return new Promise(()=>{});}:deny;
for(const [api,keys] of [[http,['get','request']],[https,['get','request']],[net,['connect','createConnection']],[tls,['connect']],[dns,['lookup','resolve','resolve4','resolve6']]])for(const key of keys)api[key]=deny;
const rejectPrior=p=>{const value=String(p);if(value.includes('/shadow-readiness-rc1/')||value.includes('/.codex/attachments/')||value.includes('regime-v2-shadow-readiness-'))throw Error('TEST_PRIOR_RUNTIME_FORBIDDEN');};
for(const [api,keys] of [[fs,['readFileSync','readFile','readdirSync','readdir']],[fsp,['readFile','readdir']]])for(const key of keys){const original=api[key];api[key]=function(p,...args){rejectPrior(p);return original.call(this,p,...args);};}
syncBuiltinESMExports();
process.on('beforeExit',()=>{process.stderr.write('__NETWORK_ATTEMPTS__='+attempts+'\\n');if(attempts)process.exitCode=86;});
`;
const importGuard = "data:text/javascript;base64," + Buffer.from(preload).toString("base64");
const nodeArgs = ["--no-warnings", "--experimental-strip-types", "--import", importGuard];
const environment = extra => ({ ...process.env, V2_SHADOW_JOB_ENABLED: "OFF", GITHUB_ACTIONS: "false", JOB_TEST_BLOCK_FETCH: "0", ...extra });
async function directory(t) { const value = await mkdtemp(path.join(os.tmpdir(), "regime-job-cli-test-")); t.after(() => rm(value, { recursive: true, force: true })); return value; }
function invoke(script, args, cwd, env = {}) {
  const result = spawnSync(process.execPath, [...nodeArgs, script, ...args], { cwd, env: environment(env), encoding: "utf8", timeout: 15000 });
  assert.equal(result.error, undefined, String(result.error));
  assert.match(result.stderr, /__NETWORK_ATTEMPTS__=0/);
  return result;
}
const stdoutJson = result => JSON.parse(result.stdout);

test("CLI defaults OFF in a fresh cwd without acquisition or storage", async t => {
  const cwd = await directory(t), result = invoke(cli, [], cwd);
  assert.equal(result.status, 0); assert.equal(stdoutJson(result).state, "OFF");
  assert.equal(stdoutJson(result).fetchCalls, 0); assert.equal(stdoutJson(result).terminalStored, false);
  assert.deepEqual(await readdir(cwd), []);
});

test("portable preflight requires no previous runtime directory or source GET", async t => {
  const cwd = await directory(t), result = invoke(cli, ["--preflight"], cwd);
  assert.equal(result.status, 0); const output = stdoutJson(result);
  assert.equal(output.state, "PREFLIGHT_VALIDATED"); assert.equal(output.expectedSession, "2026-09-08");
  assert.equal(output.networkCalls, 0); assert.equal(output.storageOperational, false);
  assert.equal(output.durableStorage, "NOT_CONFIGURED"); assert.equal(output.shadowActivated, false);
  assert.deepEqual(await readdir(cwd), []);
});

test("production ON with no approved store fails before source acquisition and persists a terminal", async t => {
  const cwd = await directory(t), diagnostics = path.join(cwd, "diagnostics");
  const result = invoke(cli, ["--diagnostics-dir", diagnostics], cwd, { V2_SHADOW_JOB_ENABLED: "ON", GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "schedule" });
  assert.equal(result.status, 1); const terminal = stdoutJson(result);
  assert.equal(terminal.state, "JOB_FAILURE"); assert.equal(terminal.code, "STORAGE_NOT_CONFIGURED");
  assert.equal(terminal.canonicalObservation, false);
  assert.deepEqual(JSON.parse(await readFile(path.join(diagnostics, "terminal.json"), "utf8")), terminal);
});

test("GitHub Actions cannot select the explicitly local test backing", async t => {
  const cwd = await directory(t), local = path.join(cwd, "store");
  const result = invoke(cli, ["--local-store", local], cwd, { V2_SHADOW_JOB_ENABLED: "ON", GITHUB_ACTIONS: "true" });
  assert.equal(result.status, 1); assert.equal(stdoutJson(result).state, "JOB_FAILURE");
  assert.deepEqual(await readdir(cwd), []);
});

test("missing option values and unknown options produce structured boot failures", async t => {
  const cwd = await directory(t);
  for (const args of [["--diagnostics-dir"], ["--local-store"], ["--unknown"], ["--preflight", "--unknown"]]) {
    const result = invoke(cli, args, cwd); assert.equal(result.status, 1);
    const terminal = stdoutJson(result);
    assert.equal(terminal.schemaVersion, "regime-v2-shadow-job-bootstrap/1.0.0");
    assert.equal(terminal.state, "JOB_FAILURE"); assert.equal(terminal.canonicalObservation, false);
  }
  assert.deepEqual(await readdir(cwd), []);
});

test("relative diagnostic path fails semantically without creating that path", async t => {
  const cwd = await directory(t), result = invoke(cli, ["--diagnostics-dir", "relative"], cwd);
  assert.equal(result.status, 1);
  const diagnostic = result.stderr.split("\n").find(line => line.startsWith('{"schemaVersion"'));
  assert.equal(JSON.parse(diagnostic).state, "JOB_FAILURE"); assert.deepEqual(await readdir(cwd), []);
});

test("fallback creates attempt-only evidence and leaves its bytes unchanged on retry", async t => {
  const cwd = await directory(t), diagnostics = path.join(cwd, "diagnostics");
  const first = invoke(fallback, [diagnostics], cwd, { SHADOW_STEP_OUTCOME: "failure" });
  assert.equal(first.status, 0); const terminal = stdoutJson(first);
  assert.equal(terminal.state, "JOB_FAILURE"); assert.equal(terminal.code, "NO_COORDINATOR_TERMINAL_BOOT_TIMEOUT_OR_CANCELLATION");
  assert.equal(terminal.evidenceKind, "ATTEMPT_ONLY"); assert.equal(terminal.canonicalObservation, false);
  const original = await readFile(path.join(diagnostics, "terminal.json"));
  assert.equal(invoke(fallback, [diagnostics], cwd).status, 0);
  assert.deepEqual(await readFile(path.join(diagnostics, "terminal.json")), original);
});

test("fallback preserves a real coordinator terminal byte for byte", async t => {
  const cwd = await directory(t), diagnostics = path.join(cwd, "diagnostics");
  assert.equal(invoke(cli, ["--diagnostics-dir", diagnostics], cwd).status, 0);
  const original = await readFile(path.join(diagnostics, "terminal.json"));
  assert.equal(invoke(fallback, [diagnostics], cwd).status, 0);
  assert.deepEqual(await readFile(path.join(diagnostics, "terminal.json")), original);
  assert.deepEqual(await readdir(diagnostics), ["terminal.json"]);
});

test("fallback rejects syntactically valid non-terminals and preserves invalid bytes and its failure sidecar", async t => {
  const cwd = await directory(t);
  for (const [index, bytes] of ["null", "[]", '"hello"', '{"state":"SUCCESS"}', "{broken"].entries()) {
    const diagnostics = path.join(cwd, String(index)); await mkdir(diagnostics);
    const filename = path.join(diagnostics, "terminal.json"); await writeFile(filename, bytes);
    const result = invoke(fallback, [diagnostics], cwd); assert.equal(result.status, 1);
    assert.equal(stdoutJson(result).code, "INVALID_COORDINATOR_TERMINAL");
    assert.equal(await readFile(filename, "utf8"), bytes);
    const sidecar = await readFile(path.join(diagnostics, "terminal-fallback-failure.json"));
    assert.equal(invoke(fallback, [diagnostics], cwd).status, 1);
    assert.deepEqual(await readFile(path.join(diagnostics, "terminal-fallback-failure.json")), sidecar);
    assert.equal(await readFile(filename, "utf8"), bytes);
  }
});

test("outer process termination is reported by fallback without a late canonical observation", async t => {
  const cwd = await directory(t), diagnostics = path.join(cwd, "diagnostics"), store = path.join(cwd, "store");
  const child = spawn(process.execPath, [...nodeArgs, cli, "--local-store", store, "--diagnostics-dir", diagnostics], {
    cwd, env: environment({ V2_SHADOW_JOB_ENABLED: "ON", JOB_TEST_BLOCK_FETCH: "1" }), stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  const ended = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("Child did not reach mocked acquisition")); }, 10000);
    child.on("error", error => { clearTimeout(timeout); reject(error); });
    child.stderr.on("data", chunk => { stderr += chunk; if (stderr.includes("TEST_FETCH_BLOCKED_NO_NETWORK")) child.kill("SIGTERM"); });
    child.on("close", (code, signal) => { clearTimeout(timeout); resolve({ code, signal }); });
  });
  assert.equal(ended.signal, "SIGTERM"); assert.match(stderr, /TEST_FETCH_BLOCKED_NO_NETWORK/);
  const result = invoke(fallback, [diagnostics], cwd, { SHADOW_STEP_OUTCOME: "cancelled" });
  assert.equal(result.status, 0); assert.equal(stdoutJson(result).canonicalObservation, false);
  const topLevel = await readdir(store);
  assert.equal(topLevel.includes("latest"), false); assert.equal(topLevel.includes("regime-v2"), false);
  // A hard kill may leave the exclusive-writer lock. Recovery requires an
  // operator review; the test never treats removing it as automatic recovery.
});

test("workflow keeps the authorized clock, OFF gate and non-overlapping concurrency", async () => {
  const source = await readFile(path.join(repository, ".github/workflows/regime-v2-shadow.yml"), "utf8");
  assert.match(source, /cron:\s*"30 8 \* \* 2-6"/);
  assert.equal((source.match(/cron:/g) ?? []).length, 1);
  assert.match(source, /if:\s*\$\{\{ needs\.gate\.outputs\.execute == 'true' \}\}/);
  assert.match(source, /V2_SHADOW_JOB_ENABLED:\s*\$\{\{ vars\.V2_SHADOW_JOB_ENABLED \|\| 'OFF' \}\}/);
  assert.doesNotMatch(source, /--local-store|V2_SHADOW_ENABLED:\s*['"]?(?:1|true|ON)/);
  assert.match(source, /default: preflight/); assert.match(source, /RUN_ONE_SHADOW_OBSERVATION/);
  assert.match(source, /concurrency:\s*\n\s*group: regime-v2-shadow\s*\n\s*cancel-in-progress: false/);
  assert.match(source, /permissions:\s*\n\s*contents: read/);
});

test("workflow retains attempt diagnostics after failure and never uploads raw or snapshots", async () => {
  const source = await readFile(path.join(repository, ".github/workflows/regime-v2-shadow.yml"), "utf8");
  assert.match(source, /timeout-minutes: 25/); assert.match(source, /timeout-minutes: 20/);
  assert.match(source, /run: npm ci/); assert.match(source, /regime-v2-run-shadow\.mts/); assert.match(source, /--diagnostics-dir/);
  assert.match(source, /if:\s*\$\{\{ always\(\) \}\}[\s\S]*regime-v2-terminal-fallback\.mjs/);
  assert.match(source, /actions\/upload-artifact@/); assert.match(source, /if-no-files-found: error/);
  const paths = source.match(/path: \|\n((?:[ ]{12}.+\n)+)/)?.[1].trim().split("\n").map(line => line.trim());
  assert.deepEqual(paths, ["${{ runner.temp }}/regime-v2-attempt/terminal.json", "${{ runner.temp }}/regime-v2-attempt/terminal-fallback-failure.json"]);
  assert.match(source, /retention-days: 30/);
});

test("scheduled OFF ignores unusable S3 configuration and performs no storage or market work", async t => {
  const cwd = await directory(t);
  const result = invoke(cli, ["--mode", "schedule", "--storage", "s3"], cwd, { GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "schedule", AWS_REGION: "invalid", S3_BUCKET: "invalid", SHADOW_ROLE_ARN: "invalid" });
  assert.equal(result.status, 0); const terminal = stdoutJson(result);
  assert.equal(terminal.state, "OFF"); assert.equal(terminal.fetchCalls, 0); assert.equal(terminal.terminalStored, false);
  assert.deepEqual(await readdir(cwd), []);
});

test("manual GitHub invocation defaults to preflight and missing S3 config fails before market", async t => {
  const cwd = await directory(t);
  const result = invoke(cli, [], cwd, { GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "workflow_dispatch", V2_SHADOW_JOB_ENABLED: "ON" });
  assert.equal(result.status, 1); assert.equal(stdoutJson(result).code, "STORAGE_NOT_CONFIGURED");
  assert.deepEqual(await readdir(cwd), []);
});

test("canary requires explicit manual context and exact confirmation before creating storage", async t => {
  const cwd = await directory(t);
  for (const [args, env] of [
    [["--mode", "canary", "--storage", "s3"], { GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "workflow_dispatch" }],
    [["--mode", "canary", "--storage", "s3", "--confirm-canary", "yes"], { GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "workflow_dispatch" }],
    [["--mode", "canary", "--storage", "s3", "--confirm-canary", "RUN_ONE_SHADOW_OBSERVATION"], { GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "schedule" }],
    [["--mode", "canary", "--storage", "s3", "--confirm-canary", "RUN_ONE_SHADOW_OBSERVATION"], { GITHUB_ACTIONS: "false" }],
  ]) {
    const result = invoke(cli, args, cwd, env); assert.equal(result.status, 1); assert.equal(stdoutJson(result).state, "JOB_FAILURE");
  }
  assert.deepEqual(await readdir(cwd), []);
});

test("production CLI rejects historical asOf, duplicate flags and mixed local/S3 configuration", async t => {
  const cwd = await directory(t);
  for (const args of [["--as-of", "2020-01-01T00:00:00Z"], ["--asOf", "2020-01-01"], ["--preflight", "--preflight"], ["--mode", "preflight", "--mode", "canary"], ["--mode", "preflight", "--preflight"], ["--storage", "s3", "--local-store", path.join(cwd, "store")], ["--storage", "filesystem"], ["--mode", "preflight", "--confirm-canary", "RUN_ONE_SHADOW_OBSERVATION"]]) {
    const result = invoke(cli, args, cwd); assert.equal(result.status, 1); assert.equal(stdoutJson(result).state, "JOB_FAILURE");
  }
  assert.deepEqual(await readdir(cwd), []);
});

test("S3 preflight calls only the storage preflight contract and fallback preserves its terminal", async t => {
  const cwd = await directory(t), diagnostics = path.join(cwd, "diagnostics");
  // Explicit module doubles exercise CLI routing, not AWS behavior or live data.
  // Coordinator entry is a throwing sentinel; no real provider is substituted.
  const storageModule = `export function createLocalJobStore(){throw Error('LOCAL_FORBIDDEN');} export function createProductionJobStore(){return {kind:'S3',operational:true,async preflight(){process.stderr.write('__S3_PREFLIGHT_ONLY__\\n');return {kind:'S3',operational:true,checks:{CONTROL:'PASS'}};}};}`;
  const coordinatorModule = `export function runShadowObservation(){throw Error('COORDINATOR_FORBIDDEN_DURING_PREFLIGHT');}`;
  const hook = `import {registerHooks} from 'node:module';registerHooks({resolve(s,c,n){if(s.endsWith('/job-storage.ts'))return {url:'data:text/javascript;base64,${Buffer.from(storageModule).toString('base64')}',shortCircuit:true};if(s.endsWith('/shadow-job.ts'))return {url:'data:text/javascript;base64,${Buffer.from(coordinatorModule).toString('base64')}',shortCircuit:true};return n(s,c);}});`;
  const result = spawnSync(process.execPath, [...nodeArgs, "--import", "data:text/javascript;base64," + Buffer.from(hook).toString("base64"), cli, "--mode", "preflight", "--storage", "s3", "--diagnostics-dir", diagnostics], {
    cwd, env: environment({ GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "workflow_dispatch" }), encoding: "utf8", timeout: 15000,
  });
  assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /__S3_PREFLIGHT_ONLY__/); assert.match(result.stderr, /__NETWORK_ATTEMPTS__=0/);
  const terminal = stdoutJson(result); assert.equal(terminal.state, "PREFLIGHT_VALIDATED"); assert.equal(terminal.storageOperational, true);
  assert.equal(terminal.marketRequests, 0); assert.equal(terminal.fetchCalls, 0); assert.equal(terminal.canonicalObservation, false);
  const bytes = await readFile(path.join(diagnostics, "terminal.json"));
  assert.equal(invoke(fallback, [diagnostics], cwd).status, 0);
  assert.deepEqual(await readFile(path.join(diagnostics, "terminal.json")), bytes);
});

test("confirmed canary routes exactly one coordinator invocation while the schedule setting remains OFF", async t => {
  const cwd = await directory(t);
  const coordinator = `export async function runShadowObservation(o){const r={state:'OFF',evidenceKind:'TEST_ROUTING_CONTROL',enabled:o.enabled,trigger:o.trigger,storeFactoryPresent:typeof o.store==='function',invocations:1};await o.onTerminal(r);return r;}`;
  const hook = `import {registerHooks} from 'node:module';registerHooks({resolve(s,c,n){if(s.endsWith('/shadow-job.ts'))return {url:'data:text/javascript;base64,${Buffer.from(coordinator).toString('base64')}',shortCircuit:true};return n(s,c);}});`;
  const result = spawnSync(process.execPath, [...nodeArgs, "--import", "data:text/javascript;base64," + Buffer.from(hook).toString("base64"), cli, "--mode", "canary", "--storage", "s3", "--confirm-canary", "RUN_ONE_SHADOW_OBSERVATION"], {
    cwd, env: environment({ GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "workflow_dispatch" }), encoding: "utf8", timeout: 15000,
  });
  assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr); assert.match(result.stderr, /__NETWORK_ATTEMPTS__=0/);
  assert.deepEqual(stdoutJson(result), { state: "OFF", evidenceKind: "TEST_ROUTING_CONTROL", enabled: "ON", trigger: "workflow_dispatch", storeFactoryPresent: true, invocations: 1 });
  assert.deepEqual(await readdir(cwd), []);
});

test("manual default with S3 runs only preflight and never prints sensitive failure messages", async t => {
  const cwd = await directory(t);
  const sensitive = "TEST_SECRET_MUST_NOT_APPEAR";
  const storage = `export function createLocalJobStore(){throw Error('LOCAL_FORBIDDEN');} export function createProductionJobStore(){return {async preflight(){process.stderr.write('__PREFLIGHT_ENTERED__\\n');throw Object.assign(Error('${sensitive}'),{code:'STORAGE_IO'});}};}`;
  const coordinator = `export function runShadowObservation(){throw Error('COORDINATOR_FORBIDDEN_DURING_PREFLIGHT');}`;
  const hook = `import {registerHooks} from 'node:module';registerHooks({resolve(s,c,n){if(s.endsWith('/job-storage.ts'))return {url:'data:text/javascript;base64,${Buffer.from(storage).toString('base64')}',shortCircuit:true};if(s.endsWith('/shadow-job.ts'))return {url:'data:text/javascript;base64,${Buffer.from(coordinator).toString('base64')}',shortCircuit:true};return n(s,c);}});`;
  const result = spawnSync(process.execPath, [...nodeArgs, "--import", "data:text/javascript;base64," + Buffer.from(hook).toString("base64"), cli, "--storage", "s3"], {
    cwd, env: environment({ GITHUB_ACTIONS: "true", GITHUB_EVENT_NAME: "workflow_dispatch", V2_SHADOW_JOB_ENABLED: "ON" }), encoding: "utf8", timeout: 15000,
  });
  assert.equal(result.error, undefined); assert.equal(result.status, 1); assert.match(result.stderr, /__PREFLIGHT_ENTERED__/);
  assert.match(result.stderr, /__NETWORK_ATTEMPTS__=0/); assert.equal(stdoutJson(result).code, "STORAGE_IO");
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(sensitive)); assert.deepEqual(await readdir(cwd), []);
});
