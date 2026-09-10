import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { fromP8 } from "../../../scripts/regime-v2-conformance.mts";
import { TICKERS } from "../contract.ts";
import { evaluateRegime } from "../engine.ts";
import { canonical, hash } from "../math.ts";
import type { Calendar, CoreInput, EngineInput, Packet, Temporal } from "../types.ts";
import { assertSnapshot, createSnapshot, persistSnapshot, readSnapshot, replaySnapshot, type ShadowSnapshot } from "./snapshot.ts";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const fixtures = JSON.parse(gunzipSync(readFileSync(path.join(repositoryRoot, "docs/regime-engine-v2/p8/raw-fixtures.json.gz"))).toString()).fixtures as { id: string; raw: unknown }[];
const v1 = { regime: "RISK_ON", score: 73, confidence: "HIGH", version: "existing-v1-test", outputHash: hash({ regime: "RISK_ON", score: 73, confidence: "HIGH" }) };
function frame(id = "C03-broad", shift = 0): EngineInput {
  const r = fromP8(fixtures.find(item => item.id === id)!.raw) as CoreInput;
  const sessions = [...r.expectedSessions, "2025-04-01", "2025-04-02", "2025-04-03", "2025-04-04", "2025-04-07", "2025-04-08", "2025-04-09"];
  const moved = new Map(r.expectedSessions.map((date, index) => [date, sessions[index + shift]]));
  const target = moved.get(r.targetSession)!;
  const meta: Temporal = { sourceVersion: "synthetic-proof/1", capturedAt: `${target}T21:30:00Z`, availableAt: `${target}T21:30:00Z`, sourcePublishedAt: null, availabilityCertainty: "CONSERVATIVE_BOUND", replayClass: "R0", vintageHash: hash("synthetic-provenance"), status: "AVAILABLE" };
  const calendar: Calendar = { ...meta, sourceId: "SYNTHETIC_CALENDAR_PROOF", id: "synthetic-contract-fixture", version: "1", kind: "OFFICIAL", timezone: "America/New_York", coverageStart: sessions[0], coverageEnd: target, completeIntervalCoverage: true, sessions: sessions.filter(date => date <= target).map(session => ({ session, closedAt: `${session}T21:00:00Z` })) };
  const packet = (value: Packet, sourceId: string): Packet => ({ ...value, ...meta, sourceId, declaredStart: moved.get(r.expectedSessions[0]), rows: value.rows.map(row => ({ ...row, ...(row.date ? { date: moved.get(row.date) ?? row.date } : {}), ...(row.observationDate ? { observationDate: moved.get(row.observationDate) ?? row.observationDate } : {}) })) });
  return { mode: "R0", asOf: `${target}T22:00:00Z`, calendars: { equity: calendar, vix: structuredClone(calendar), vx: structuredClone(calendar), btc: structuredClone(calendar), gld: structuredClone(calendar) }, equity: Object.fromEntries(TICKERS.map(ticker => [ticker, packet(r.equity[ticker]!, "EQUITY_ADJUSTED")])), vix: packet(r.vix!, "VIX_OFFICIAL"), vx: { ...r.vx!, ...meta, sourceId: "VX_OFFICIAL", ...(r.vx!.observationDate ? { observationDate: target } : {}) } };
}
function snapshot(id = "C03-broad", shift = 0, previous?: ShadowSnapshot) {
  const input = frame(id, shift);
  return createSnapshot({ asOf: input.asOf, v1, input, output: evaluateRegime(input), error: null, captureMetadata: { origin: "PROSPECTIVE", proof: "SYNTHETIC_TEST_ONLY" }, previous });
}
function rehash(value: ShadowSnapshot): ShadowSnapshot {
  const { snapshotId: ignored, ...body } = value;
  void ignored;
  return { ...body, snapshotId: hash(body) };
}

test("versioned snapshot exactly replays every V2 dimension, source, evidence and reason", () => {
  const value = snapshot();
  assert.equal(value.v2!.regime, "RISK_ON_BROAD");
  const result = replaySnapshot(value);
  assert.equal(result.status, "MATCH");
  if (result.status === "MATCH") assert.deepEqual(result.output, value.v2);
  assert.equal(value.versions.parameterSet.id, "C03");
  assert.equal(value.versions.featureContract, value.v2!.versions["feature-registry-qualified.json"]);
  assert.equal(value.versions.decisionTable.version, "regime-v2-rules/1.0.0-symbolic");
  assert.ok(value.versions.sourceContract.sourceVersions.includes("EQUITY_ADJUSTED@synthetic-proof/1"));
  assert.equal(value.captureMetadata.proof, "SYNTHETIC_TEST_ONLY");
});
test("snapshot is deeply immutable and never freezes caller-owned input", () => {
  const input = frame(), output = evaluateRegime(input), original = canonical(input);
  const value = createSnapshot({ asOf: input.asOf, v1, input, output, error: null });
  assert.ok(Object.isFrozen(value.normalizedInput!.equity.XLK!.rows));
  assert.ok(!Object.isFrozen(input));
  input.equity.XLK!.rows[0].adjusted_close = -1;
  assert.equal(canonical(value.normalizedInput), original);
  assert.throws(() => { value.v1.score = 0; }, TypeError);
});
test("literal regime equality never becomes a semantic taxonomy equivalence or V1 truth label", () => {
  const input = frame();
  const value = createSnapshot({ asOf: input.asOf, v1: { ...v1, regime: "RISK_ON_BROAD" }, input, output: evaluateRegime(input), error: null });
  assert.equal(value.comparison.sameLiteralLabel, true);
  assert.equal(value.comparison.status, "NON_EQUIVALENT_TAXONOMY");
  assert.equal(value.comparison.semanticallySame, null);
  assert.equal(value.comparison.v1IsTruthLabel, false);
});
test("same-session revisions, out-of-order cuts and calendar gaps cannot extend ages or transition counts", () => {
  const first = snapshot();
  assert.equal(snapshot("C03-broad", 0, first).observation.continuity, "SAME_SESSION_REOBSERVED");
  assert.equal(snapshot("C03-stress", 0, first).observation.continuity, "SAME_SESSION");
  const later = snapshot("C03-broad", 2, first);
  assert.equal(later.observation.continuity, "GAP");
  assert.deepEqual(later.observation.regimeAge, { sessions: 1, leftCensored: true });
  const earlier = snapshot("C03-broad", 1, later);
  assert.equal(earlier.observation.continuity, "OUT_OF_ORDER");
  assert.equal(earlier.observation.regimeChanged, null);
  assert.equal(earlier.observation.checkpoint.counters.transitions, 0);
});
test("repeated same-session cuts preserve transition counts and ages without counting the session twice", () => {
  const first = snapshot(), transition = snapshot("C03-stress", 1, first);
  const input = structuredClone(transition.normalizedInput!); input.asOf = "2025-04-01T23:00:00Z";
  const repeated = createSnapshot({ asOf: input.asOf, v1, input, output: evaluateRegime(input), error: null, captureMetadata: { origin: "PROSPECTIVE" }, previous: transition });
  assert.equal(repeated.observation.continuity, "SAME_SESSION_REOBSERVED");
  assert.deepEqual(repeated.observation.checkpoint, transition.observation.checkpoint);
  assert.deepEqual(repeated.observation.regimeAge, transition.observation.regimeAge);
  assert.deepEqual(repeated.observation.pillarAges, transition.observation.pillarAges);
  assert.equal(repeated.observation.regimeChanged, null);
  assert.equal(repeated.observation.checkpoint.counters.transitions, 1);
  const older = createSnapshot({ asOf: transition.asOf, v1, input: transition.normalizedInput, output: transition.v2, error: null, captureMetadata: { origin: "PROSPECTIVE" }, previous: repeated });
  assert.equal(older.observation.continuity, "OUT_OF_ORDER");
});
test("both frozen STRESS branches can be observed without creating a new rule or promotion", () => {
  for (const branch of ["absolute", "joint"] as const) {
    const input = frame();
    for (const row of input.vix!.rows) row.value = branch === "absolute" ? 40 : 20;
    if (branch === "joint") input.vix!.rows.at(-1)!.value = 26;
    input.vx!.contracts[0].settlement = 30;
    input.vx!.contracts[1].settlement = branch === "joint" ? 27 : 33;
    const output = evaluateRegime(input);
    assert.equal(output.regime, "STRESS");
    const value = createSnapshot({ asOf: input.asOf, v1, input, output, error: null, captureMetadata: { origin: "PROSPECTIVE" } });
    assert.equal(value.observation.evidencePlan.absoluteStressBranchObserved, branch === "absolute");
    assert.equal(value.observation.evidencePlan.jointStressBranchObserved, branch === "joint");
    assert.equal(value.observation.promotion, "CONTROL_TOWER_REQUIRED");
    assert.equal(value.observation.evidencePlan.automaticPromotion, false);
  }
});
test("regime and pillar ages are observations; STRESS is immediate and A-B-A reversals remain visible", () => {
  const a = snapshot(), b = snapshot("C03-broad", 1, a), c = snapshot("C03-stress", 2, b), d = snapshot("C03-broad", 3, c);
  assert.equal(b.observation.continuity, "ADJACENT");
  assert.deepEqual(b.observation.regimeAge, { sessions: 2, leftCensored: true });
  assert.equal(b.observation.pillarAges.participation!.sessions, 2);
  assert.equal(c.v2!.regime, "STRESS");
  assert.equal(c.observation.regimeChanged, true);
  assert.equal(c.observation.checkpoint.counters.stressEpisodes, 1);
  assert.deepEqual(c.observation.regimeAge, { sessions: 1, leftCensored: false });
  assert.equal(d.observation.checkpoint.counters.transitions, 2);
  for (const window of [1, 2, 3, 5] as const) assert.equal(d.observation.checkpoint.counters[`flipFlopsWithin${window}`], 1);
  assert.equal(d.observation.timeSinceLastTransitionSessions, 0);
  assert.equal(d.observation.evidencePlan.automaticPromotion, false);
  assert.equal(d.observation.evidencePlan.adjudicatedTransitions, 0);
});
test("INCOMPLETE and typed failures explicitly terminate continuity without smoothing", () => {
  const first = snapshot();
  const input = frame("C03-broad", 1);
  delete input.calendars.equity;
  const missing = createSnapshot({ asOf: input.asOf, v1, input, output: evaluateRegime(input), error: null, previous: first });
  assert.equal(missing.v2!.systemState, "INCOMPLETE");
  assert.equal(missing.observation.continuity, "CURRENT_UNAVAILABLE");
  assert.equal(missing.observation.regimeAge, null);
  assert.ok(missing.observation.reasonCodes.length > 0);
  const failure = createSnapshot({ asOf: "2025-04-02T22:00:00Z", v1, input: null, output: null, error: { code: "TYPED_FAILURE", message: "Source validation failed" }, previous: first });
  assert.equal(failure.error!.code, "TYPED_FAILURE");
  assert.equal(replaySnapshot(failure).status, "NOT_REPLAYABLE_FAILURE");
  const resumed = snapshot("C03-broad", 3, failure);
  assert.notEqual(resumed.observation.continuity, "ADJACENT");
  assert.equal(resumed.observation.regimeAge!.sessions, 1);
});
test("engine/contract version changes cannot reuse a duration checkpoint", () => {
  const previous = structuredClone(snapshot());
  previous.versions.engine = "regime-v2/historical-different-engine";
  previous.observation.versionKey = hash(previous.versions);
  const sealed = rehash(previous);
  assert.equal(snapshot("C03-broad", 1, sealed).observation.continuity, "VERSION_CHANGE");
  assert.throws(() => replaySnapshot(sealed), /original engine/);
});
test("R2 remains R2 and never contributes captured prospective evidence counts", () => {
  const input = frame();
  input.mode = "R2";
  for (const packet of [...Object.values(input.equity), input.vix, input.vx, ...Object.values(input.calendars)]) if (packet) packet.replayClass = "R2";
  const value = createSnapshot({ asOf: input.asOf, v1, input, output: evaluateRegime(input), error: null, captureMetadata: { origin: "PROSPECTIVE" } });
  assert.equal(value.replayClass, "R2");
  assert.equal(value.observation.evidencePlan.origin, "R2_REPLAY");
  assert.equal(value.observation.evidencePlan.materialVolatilityEpisodeCandidates, 0);
  assert.equal(value.observation.evidencePlan.observedTransitionCandidates, 0);
});
test("switching from unverified R0 to captured R0 starts a separate evidence epoch", () => {
  const input = frame(), output = evaluateRegime(input);
  const first = createSnapshot({ asOf: input.asOf, v1, input, output, error: null });
  const value = snapshot("C03-broad", 1, first);
  assert.equal(value.observation.continuity, "EVIDENCE_BASIS_CHANGE");
  assert.equal(value.observation.checkpoint.counters.completeObservations, 1);
});
test("snapshot rejects malformed identity, altered bytes, unsafe counters and non-JSON input", () => {
  const first = snapshot(), changed = structuredClone(first);
  changed.v1.score = 0;
  assert.throws(() => assertSnapshot(changed), /immutable identity/);
  const counter = structuredClone(first); counter.observation.checkpoint.counters.transitions = -1;
  assert.throws(() => assertSnapshot(rehash(counter)), /safe integer/);
  assert.throws(() => createSnapshot({ asOf: "bad", v1, input: null, output: null, error: { code: "X", message: "X" } }), /exact asOf/);
  const input = frame(); input.equity.XLK!.rows[0].accidentalUndefined = undefined;
  assert.throws(() => createSnapshot({ asOf: input.asOf, v1, input, output: evaluateRegime(input), error: null }), /serialization/);
});
test("replay rejects a rehashed output mutation rather than accepting a new expected result", () => {
  const altered = structuredClone(snapshot());
  altered.v2!.concordance = "LOW";
  assert.throws(() => replaySnapshot(rehash(altered)), /Replay changed/);
});
test("atomic immutable snapshots persist outside Git, are idempotent, and replay after read", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "regime-shadow-snapshot-"));
  try {
    const value = snapshot(), [a, b] = await Promise.all([persistSnapshot(directory, value, { repositoryRoot }), persistSnapshot(directory, value, { repositoryRoot })]);
    assert.equal(a, b);
    assert.deepEqual(await readdir(directory), [value.snapshotId + ".json"]);
    assert.equal(replaySnapshot(await readSnapshot(a)).status, "MATCH");
    assert.equal(await readFile(a, "utf8"), canonical(value) + "\n");
    await writeFile(a, "CORRUPT");
    await assert.rejects(persistSnapshot(directory, value, { repositoryRoot }));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test("runtime persistence rejects repository, public and symlink aliases into Git", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "regime-shadow-path-"));
  try {
    const value = snapshot();
    for (const location of [repositoryRoot, path.join(repositoryRoot, "public", "shadow-runtime")]) await assert.rejects(persistSnapshot(location, value, { repositoryRoot }), /outside the repository/);
    const alias = path.join(directory, "repo-alias"); await symlink(repositoryRoot, alias);
    await assert.rejects(persistSnapshot(path.join(alias, "public", "shadow-runtime"), value, { repositoryRoot }), /symlink resolves/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
