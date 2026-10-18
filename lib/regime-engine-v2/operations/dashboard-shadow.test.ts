import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { EngineInput } from "../types.ts";
import { evaluateRegime, RegimeInputError } from "../engine.ts";
import { bytesHash, hash } from "../math.ts";
import { withDashboardShadow, externalDirectory } from "./dashboard-shadow.ts";
import type { ShadowOptions } from "./dashboard-shadow.ts";
import { readSnapshot, replaySnapshot } from "./snapshot.ts";
import { pipelineScope, readObservedResponse } from "./pipeline-capture.ts";

const raw = JSON.parse(readFileSync(new URL("../../../docs/regime-engine-v2/sweeper/shadow-input-r2.json", import.meta.url), "utf8")) as EngineInput;
const v1 = Object.freeze({ regimeSummary: Object.freeze({ current: "Risk-on selectivo", regimeScore: 74, confidence: 88 }), publicSentinel: "exact same V1 object" });
const baselineHash = hash(v1);
async function run(options: Partial<ShadowOptions> = {}, mutate?: (input: EngineInput) => void) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "regime-maintainer-test-"));
  const input = structuredClone(raw); mutate?.(input);
  const diagnostics: string[] = [];
  try {
    const value = await withDashboardShadow(async () => v1, { enabled: true, directory, now: () => raw.asOf,
      loadInput: async () => ({ input, issues: [], sourceStatus: {}, captureMetadata: { fixture: "PRESERVED_R2_NOT_PROSPECTIVE" } }), onDiagnostic: d => diagnostics.push(d.code), ...options });
    assert.equal(value, v1); assert.equal(hash(value), baselineHash);
    const id = (await readFile(path.join(directory, "latest.txt"), "utf8")).trim();
    const snapshot = await readSnapshot(path.join(directory, "snapshots", id + ".json"));
    return { snapshot, diagnostics };
  } finally { await rm(directory, { recursive: true, force: true }); }
}

test("OFF executes only V1 and never loads/evaluates/persists the sidecar", async () => {
  let calls = 0;
  const actual = await withDashboardShadow(async () => { calls++; return v1; }, { enabled: false, directory: "/not-used", loadInput: async () => { throw Error("must not run"); }, evaluate: () => { throw Error("must not run"); } });
  assert.equal(actual, v1); assert.equal(calls, 1);
});
test("ON stores exact V1 numbers and reproducible complete C03 at the same cut", async () => {
  const { snapshot } = await run();
  assert.equal(snapshot.v1.regime, v1.regimeSummary.current); assert.equal(snapshot.v1.score, 74); assert.equal(snapshot.v1.confidence, 88);
  assert.equal(snapshot.asOf, snapshot.v2?.asOf); assert.equal(snapshot.v2?.regime, evaluateRegime(raw).regime);
  assert.equal(snapshot.comparison.status, "NON_EQUIVALENT_TAXONOMY"); assert.equal(snapshot.replayClass, "R2");
  assert.equal(replaySnapshot(snapshot).status, "MATCH");
});
test("V2 malformed source records a typed failure while preserving V1", async () => {
  const { snapshot } = await run({}, input => { input.equity.XLK = { ...input.equity.XLK!, rows: null } as unknown as EngineInput["equity"][string]; });
  assert.equal(snapshot.error?.code, "V2_TYPED_INPUT_FAILURE"); assert.equal(snapshot.v2, null);
});
test("V2 missing native adjclose records INCOMPLETE without close substitution", async () => {
  const { snapshot } = await run({}, input => { input.equity.XLK!.rows.at(-1)!.adjusted_close = null; input.equity.XLK!.rows.at(-1)!.close = 100; });
  assert.equal(snapshot.v2?.systemState, "INCOMPLETE"); assert.ok(snapshot.v2?.diagnostics.missingReasons.includes("EQUITY_22_CLOSES_UNAVAILABLE"));
});
test("V2 unknown calendar records its source reason and cannot harm V1", async () => {
  const { snapshot } = await run({}, input => { input.calendars = {}; });
  assert.equal(snapshot.v2?.systemState, "INCOMPLETE"); assert.equal(snapshot.v2?.sourceStatus.XLK.status, "UNKNOWN_CALENDAR");
});
test("missing VX near contract stays incomplete and cannot promote next maturity", async () => {
  const { snapshot } = await run({}, input => { input.vx!.contracts.shift(); });
  assert.equal(snapshot.v2?.systemState, "INCOMPLETE"); assert.ok(snapshot.v2?.diagnostics.missingReasons.includes("VX_NEAR_CONTRACTS_UNAVAILABLE"));
});
test("stale core observation is not accepted because V1 has usable data", async () => {
  const { snapshot } = await run({}, input => { input.equity.XLK!.rows.pop(); });
  assert.equal(snapshot.v2?.systemState, "INCOMPLETE"); assert.equal(snapshot.v2?.sourceStatus.XLK.status, "STALE_OR_WRONG_SESSION");
});
test("an internal typed V2 failure is recorded without changing V1", async () => {
  const { snapshot } = await run({ evaluate: () => { throw new RegimeInputError("internal", "injected typed failure"); } });
  assert.equal(snapshot.error?.code, "V2_TYPED_INPUT_FAILURE"); assert.equal(snapshot.v2, null);
});
test("an unexpected V2 calculation exception is recorded without changing V1", async () => {
  const { snapshot } = await run({ evaluate: () => { throw Error("injected computation failure"); } });
  assert.equal(snapshot.error?.code, "V2_CALCULATION_OR_SOURCE_FAILURE");
});
for (const satellite of ["btc", "gld"] as const) test(`missing ${satellite} remains zero-vote optional evidence`, async () => {
  const { snapshot } = await run({}, input => { delete input[satellite]; });
  assert.equal(snapshot.v2?.regime, evaluateRegime(raw).regime); assert.equal(snapshot.v2?.systemState, "COMPLETE"); assert.equal(snapshot.v2?.dataQuality, "PARTIAL");
});
test("V1 failure is propagated by identity and cannot be masked by healthy V2", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "regime-maintainer-v1-error-")); const error = new Error("original V1 failure");
  try {
    await assert.rejects(withDashboardShadow(async () => { throw error; }, { enabled: true, directory, now: () => raw.asOf, loadInput: async () => ({ input: raw, issues: [], captureMetadata: {}, sourceStatus: {} }), onDiagnostic: () => {} }), e => e === error);
    const id = (await readFile(path.join(directory, "latest.txt"), "utf8")).trim(), snapshot = await readSnapshot(path.join(directory, "snapshots", id + ".json"));
    assert.equal(snapshot.error?.code, "V1_FAILURE"); assert.equal(snapshot.v1.regime, null);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test("storage and logging failure cannot fail V1", async () => {
  assert.equal(await withDashboardShadow(async () => v1, { enabled: true, directory: "/dev/null/invalid", onDiagnostic: () => { throw Error("observer failed"); } }), v1);
});
test("a stalled V2 source read cannot hold the public V1 request indefinitely", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "regime-maintainer-timeout-"));
  let release: (() => void) | undefined; const blocked = new Promise<void>(resolve => { release = resolve; }); const diagnostics: string[] = [];
  try {
    const value = await withDashboardShadow(async () => v1, { enabled: true, directory, timeoutMs: 5, now: () => raw.asOf,
      loadInput: async () => { await blocked; throw Error("released failed source"); }, onDiagnostic: d => diagnostics.push(d.code) });
    assert.equal(value, v1); assert.ok(diagnostics.includes("SHADOW_IO_TIMEOUT"));
    release!();
    // Await the private operation's completion before removing its test directory.
    for (let i = 0; i < 100 && !diagnostics.includes("V2_CALCULATION_OR_SOURCE_FAILURE"); i++) await new Promise(resolve => setTimeout(resolve, 5));
    assert.ok(diagnostics.includes("V2_CALCULATION_OR_SOURCE_FAILURE"));
  } finally { release?.(); await rm(directory, { recursive: true, force: true }); }
});
test("storage inside repository/public is rejected before writing", async () => {
  await assert.rejects(externalDirectory(path.join(process.cwd(), "public", "regime-runtime-test"), process.cwd()), /REPOSITORY_FORBIDDEN/);
});
test("missing source bundle records genuine UNKNOWN_CALENDAR/INCOMPLETE", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "regime-maintainer-missing-"));
  try {
    await withDashboardShadow(async () => v1, { enabled: true, directory, now: () => raw.asOf, onDiagnostic: () => {} });
    const id = (await readFile(path.join(directory, "latest.txt"), "utf8")).trim(), snap = await readSnapshot(path.join(directory, "snapshots", id + ".json"));
    assert.equal(snap.v2?.systemState, "INCOMPLETE"); assert.equal(snap.replayClass, "UNKNOWN");
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test("actual source bundle bytes are retained immutably and keyed by vintage", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "regime-maintainer-bundle-"));
  try {
    const file = path.join(directory, "input.json"), bytes = JSON.stringify({ schemaVersion: "regime-v2-source-bundle/1.0.0", mode: "R2", captures: [], calendars: {} }); await writeFile(file, bytes);
    await withDashboardShadow(async () => v1, { enabled: true, directory, inputFile: file, now: () => raw.asOf, onDiagnostic: () => {} });
    assert.equal(await readFile(path.join(directory, "bundles", bytesHash(bytes) + ".json"), "utf8"), bytes);
    await writeFile(file, bytes + "\n");
    await withDashboardShadow(async () => v1, { enabled: true, directory, inputFile: file, now: () => raw.asOf, onDiagnostic: () => {} });
    assert.equal((await readdir(path.join(directory, "bundles"))).length, 2);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test("capture tap preserves Response.text semantics and exact raw bytes, no automatic R0", async () => {
  const bytes = new Uint8Array([239,187,191,...Buffer.from("Settle,Close\n20,999\n")]);
  const expected = await new Response(bytes).text(), tap = pipelineScope();
  const actual = await tap.run(() => readObservedResponse(new Response(bytes), { sourceId: "VX_OFFICIAL", sourceVersion: "test", sourceUrl: "https://www-api.cboe.com/test" }));
  assert.equal(actual, expected); assert.equal(tap.captures.length, 1);
  assert.equal(tap.captures[0].rawHash, bytesHash(bytes)); assert.equal(tap.captures[0].metadata.replayClass, "UNKNOWN"); assert.equal(tap.captures[0].metadata.sourcePublishedAt, null);
});
