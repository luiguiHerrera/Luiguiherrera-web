// Internal operations only. Filesystem and observation state stay outside the
// canonical engine; none of these diagnostics feeds an adjudication rule.
import { randomUUID } from "node:crypto";
import { link, mkdir, open, realpath, unlink } from "node:fs/promises";
import path from "node:path";
import { C03, CONTRACT_HASHES, DECISION_TABLE, ENGINE_VERSION } from "../contract.ts";
import { evaluateRegime, type RegimeOutput } from "../engine.ts";
import { canonical, freeze, ge, hash, le } from "../math.ts";
import { instant } from "../temporal.ts";
import type { EngineInput, Pillars, Regime } from "../types.ts";

export const SNAPSHOT_SCHEMA_VERSION = "regime-v2-shadow-snapshot/1.0.0";
export const MAX_SNAPSHOT_BYTES = 16 * 1024 * 1024;
export type SnapshotFailure = { code: string; message: string };
export type V1Snapshot = { regime: string | null; score: number | null; confidence: number | string | null; version: string; outputHash: string };
type Age = { sessions: number; leftCensored: boolean };
type Run = Age & { regime: Regime; start: string; end: string };
type Counters = {
  completeObservations: number; transitions: number; flipFlopsWithin1: number; flipFlopsWithin2: number; flipFlopsWithin3: number; flipFlopsWithin5: number;
  conflictingPillarEpisodes: number; materialVolatilityEpisodes: number; stressEpisodes: number;
  absoluteStressObservations: number; jointStressObservations: number;
};
type Continuity = "FIRST_OBSERVATION" | "ADJACENT" | "GAP" | "SAME_SESSION" | "SAME_SESSION_REOBSERVED" | "OUT_OF_ORDER" | "VERSION_CHANGE" | "REPLAY_CLASS_CHANGE" | "EVIDENCE_BASIS_CHANGE" | "CURRENT_UNAVAILABLE" | "PREVIOUS_UNAVAILABLE";
export class ShadowSnapshotError extends Error {
  readonly code: string;
  constructor(code: string, message: string) { super(message); this.name = "ShadowSnapshotError"; this.code = code; }
}
const fail = (code: string, message: string): never => { throw new ShadowSnapshotError(code, message); };
const emptyCounters = (): Counters => ({ completeObservations: 0, transitions: 0, flipFlopsWithin1: 0, flipFlopsWithin2: 0, flipFlopsWithin3: 0, flipFlopsWithin5: 0, conflictingPillarEpisodes: 0, materialVolatilityEpisodes: 0, stressEpisodes: 0, absoluteStressObservations: 0, jointStressObservations: 0 });
const add = (value: number, amount = 1) => {
  if (!Number.isSafeInteger(value) || value < 0 || !Number.isSafeInteger(value + amount)) return fail("COUNTER_OVERFLOW", "Observation checkpoint exceeds safe integer bounds");
  return value + amount;
};
function jsonCopy<T>(value: T): T {
  let result: T;
  try { result = JSON.parse(JSON.stringify(value)) as T; }
  catch { return fail("NON_JSON_SNAPSHOT", "Snapshot values must be finite, acyclic JSON data"); }
  if (canonical(result) !== canonical(value)) return fail("NON_JSON_SNAPSHOT", "Snapshot serialization must preserve the exact normalized input and output");
  return result;
}
function versionManifest(input: EngineInput | null, output: RegimeOutput | null) {
  const sourceVersions = [...new Set(Object.values(output?.sourceStatus ?? {}).map(s => s.sourceId && s.sourceVersion ? `${s.sourceId}@${s.sourceVersion}` : null).filter((s): s is string => s !== null))].sort();
  const calendarVersions = Object.fromEntries(Object.entries(input?.calendars ?? {}).sort().map(([key, calendar]) => [key, calendar ? { id: calendar.id, version: calendar.version, kind: calendar.kind, sourceId: calendar.sourceId ?? null, sourceVersion: calendar.sourceVersion ?? null } : null]));
  return {
    engine: ENGINE_VERSION,
    parameterSet: { id: "C03" as const, parameterHash: hash(C03), manifestHash: CONTRACT_HASHES["parameter-manifest.json"] },
    featureContract: CONTRACT_HASHES["feature-registry-qualified.json"],
    decisionTable: { version: DECISION_TABLE.version, contentHash: hash(DECISION_TABLE) },
    sourceContract: { price: CONTRACT_HASHES["price-series-contract.json"], temporal: CONTRACT_HASHES["temporal-availability-contract.json"], freshness: CONTRACT_HASHES["freshness-policy.json"], sourceVersions, calendarVersions },
    snapshotSchema: SNAPSHOT_SCHEMA_VERSION,
  };
}
type Versions = ReturnType<typeof versionManifest>;
function measurementKey(input: EngineInput | null, output: RegimeOutput | null) {
  return hash({ input: input ? { ...input, asOf: "SAME_SESSION_COMPARISON" } : null, output: output ? { ...output, asOf: "SAME_SESSION_COMPARISON", diagnostics: { ...output.diagnostics, inputHash: "SAME_SESSION_COMPARISON" } } : null });
}
export type ShadowSnapshot = {
  snapshotId: string; schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION; versions: Versions;
  asOf: string; v1: V1Snapshot; v2: RegimeOutput | null; normalizedInput: EngineInput | null;
  error: SnapshotFailure | null; sourceStatus: Record<string, unknown>; replayClass: string;
  captureMetadata: Record<string, unknown>;
  comparison: { status: "NON_EQUIVALENT_TAXONOMY"; v1Regime: string | null; v2Regime: Regime | null; sameLiteralLabel: boolean | null; semanticallySame: null; v1IsTruthLabel: false };
  observation: {
    diagnosticOnly: true; promotion: "CONTROL_TOWER_REQUIRED"; previousSnapshotId: string | null;
    versionKey: string; continuity: Continuity; observationDate: string | null; previousRegime: Regime | null;
    regimeChanged: boolean | null; pillarChanges: { pillar: keyof Pillars; from: string; to: string }[];
    regimeAge: Age | null; pillarAges: Partial<Record<keyof Pillars, Age>>; timeSinceLastTransitionSessions: number | null;
    reasonCodes: string[]; missingReasons: unknown; concordance: RegimeOutput["concordance"] | null; uncertainty: RegimeOutput["uncertainty"] | null; dataQuality: RegimeOutput["dataQuality"] | null;
    checkpoint: { counters: Counters; lastClosedRun: Run | null; currentRun: Run | null; conflictActive: boolean; materialVolatilityActive: boolean; epochStart: string | null; epochLeftCensored: boolean };
    evidencePlan: { origin: "PROSPECTIVE_CAPTURE" | "R2_REPLAY" | "UNVERIFIED"; targets: { adjudicableTransitions: 100; conflictingPillarEpisodes: 100; materialVolatilityEpisodes: 60 }; observedTransitionCandidates: number; adjudicatedTransitions: 0; conflictingPillarEpisodeCandidates: number; materialVolatilityEpisodeCandidates: number; absoluteStressBranchObserved: boolean; jointStressBranchObserved: boolean; countsAreNotStatisticalGuarantees: true; automaticPromotion: false };
  };
};

function observe(input: EngineInput | null, output: RegimeOutput | null, versions: Versions, capture: Record<string, unknown>, previous?: ShadowSnapshot): ShadowSnapshot["observation"] {
  const versionKey = hash(versions), date = output?.observationDate ?? null;
  const usable = output?.systemState === "COMPLETE" && output.regime !== null && date !== null;
  const priorOutput = previous?.v2, prior = previous?.observation;
  const origin = output?.replayClass === "R2" ? "R2_REPLAY" : output?.replayClass === "R0" && input?.mode === "R0" && capture.origin === "PROSPECTIVE" ? "PROSPECTIVE_CAPTURE" : "UNVERIFIED";
  let continuity: Continuity = "FIRST_OBSERVATION";
  if (!usable) continuity = "CURRENT_UNAVAILABLE";
  else if (previous) {
    if (prior?.versionKey !== versionKey) continuity = "VERSION_CHANGE";
    else if (previous.replayClass !== output.replayClass) continuity = "REPLAY_CLASS_CHANGE";
    else if (prior.evidencePlan.origin !== origin) continuity = "EVIDENCE_BASIS_CHANGE";
    else if (!priorOutput?.regime || !priorOutput.observationDate) continuity = "PREVIOUS_UNAVAILABLE";
    else if (date! < priorOutput.observationDate || instant(output.asOf)! < instant(previous.asOf)!) continuity = "OUT_OF_ORDER";
    else if (date === priorOutput.observationDate) continuity = measurementKey(input, output) === measurementKey(previous.normalizedInput, priorOutput) ? "SAME_SESSION_REOBSERVED" : "SAME_SESSION";
    else continuity = output.diagnostics.calendarStatus.equity.sessions.at(-2) === priorOutput.observationDate ? "ADJACENT" : "GAP";
  }
  if (continuity === "SAME_SESSION_REOBSERVED" && prior && previous) {
    return { ...jsonCopy(prior), continuity, previousSnapshotId: previous.snapshotId, previousRegime: priorOutput!.regime, regimeChanged: null, pillarChanges: [] };
  }
  const adjacent = continuity === "ADJACENT";
  // A new epoch makes corrections, gaps and failures explicitly censored. A
  // bounded previous checkpoint suffices; no historical directory scan occurs.
  const counters = adjacent && prior ? { ...prior.checkpoint.counters } : emptyCounters();
  const changed = adjacent && usable ? priorOutput!.regime !== output!.regime : null;
  const pillarChanges: ShadowSnapshot["observation"]["pillarChanges"] = [];
  const pillarAges: ShadowSnapshot["observation"]["pillarAges"] = {};
  let currentRun: Run | null = null, lastClosedRun: Run | null = adjacent && prior ? prior.checkpoint.lastClosedRun : null;
  if (usable && output && date) {
    counters.completeObservations = add(counters.completeObservations);
    const oldRun = adjacent ? prior?.checkpoint.currentRun : null;
    currentRun = changed === false && oldRun ? { ...oldRun, sessions: add(oldRun.sessions), end: date } : { regime: output.regime!, sessions: 1, start: date, end: date, leftCensored: !adjacent };
    for (const [name, state] of Object.entries(output.pillarStates)) {
      const pillar = name as keyof Pillars, oldAge = prior?.pillarAges[pillar];
      if (adjacent && priorOutput!.pillarStates[pillar] !== state) pillarChanges.push({ pillar, from: priorOutput!.pillarStates[pillar], to: state });
      const same = adjacent && priorOutput!.pillarStates[pillar] === state;
      pillarAges[pillar] = same && oldAge ? { sessions: add(oldAge.sessions), leftCensored: oldAge.leftCensored } : { sessions: 1, leftCensored: !adjacent };
    }
    if (changed && oldRun) {
      counters.transitions = add(counters.transitions);
      if (lastClosedRun?.regime === output.regime && !oldRun.leftCensored) {
        for (const window of [1, 2, 3, 5] as const) if (oldRun.sessions <= window) {
          const key = `flipFlopsWithin${window}` as const; counters[key] = add(counters[key]);
        }
      }
      lastClosedRun = oldRun;
    }
    if (output.regime === "STRESS" && (!adjacent || priorOutput!.regime !== "STRESS")) counters.stressEpisodes = add(counters.stressEpisodes);
  }
  const conflict = !!usable && output?.concordance === "LOW";
  // C03 already defines WATCH/ADVERSE/STRESS. "Material" is this observed
  // episode candidate, requiring later adjudication; it is not a new threshold.
  const material = !!usable && output?.pillarStates.volatility !== "BENIGN";
  if (conflict && (!adjacent || !prior?.checkpoint.conflictActive)) counters.conflictingPillarEpisodes = add(counters.conflictingPillarEpisodes);
  if (material && (!adjacent || !prior?.checkpoint.materialVolatilityActive)) counters.materialVolatilityEpisodes = add(counters.materialVolatilityEpisodes);
  const f = output?.diagnostics.coreFeatures;
  const absoluteStress = !!usable && output?.regime === "STRESS" && f?.vix !== null && f?.vix !== undefined && ge(f.vix, C03.v_stress);
  const jointStress = !!usable && output?.regime === "STRESS" && f?.vix !== null && f?.vix !== undefined && ge(f.vix, C03.v_adverse) && ((f.jump_1 !== null && ge(f.jump_1, C03.jump_1)) || (f.jump_5 !== null && ge(f.jump_5, C03.jump_5))) && f.slope !== null && le(f.slope, -C03.curve_adverse);
  if (absoluteStress) counters.absoluteStressObservations = add(counters.absoluteStressObservations);
  if (jointStress) counters.jointStressObservations = add(counters.jointStressObservations);
  const prospective = origin === "PROSPECTIVE_CAPTURE";
  return {
    diagnosticOnly: true, promotion: "CONTROL_TOWER_REQUIRED", previousSnapshotId: previous?.snapshotId ?? null, versionKey, continuity, observationDate: date, previousRegime: priorOutput?.regime ?? null,
    regimeChanged: changed, pillarChanges, regimeAge: currentRun ? { sessions: currentRun.sessions, leftCensored: currentRun.leftCensored } : null, pillarAges,
    timeSinceLastTransitionSessions: currentRun && !currentRun.leftCensored ? currentRun.sessions - 1 : null,
    reasonCodes: output ? [output.diagnostics.ruleId, ...output.diagnostics.missingReasons] : [], missingReasons: output?.diagnostics.missingReasons ?? [], concordance: output?.concordance ?? null, uncertainty: output?.uncertainty ?? null, dataQuality: output?.dataQuality ?? null,
    checkpoint: { counters, currentRun, lastClosedRun, conflictActive: conflict, materialVolatilityActive: material, epochStart: adjacent ? prior!.checkpoint.epochStart : date, epochLeftCensored: true },
    evidencePlan: { origin, targets: { adjudicableTransitions: 100, conflictingPillarEpisodes: 100, materialVolatilityEpisodes: 60 }, observedTransitionCandidates: prospective ? counters.transitions : 0, adjudicatedTransitions: 0, conflictingPillarEpisodeCandidates: prospective ? counters.conflictingPillarEpisodes : 0, materialVolatilityEpisodeCandidates: prospective ? counters.materialVolatilityEpisodes : 0, absoluteStressBranchObserved: prospective && counters.absoluteStressObservations > 0, jointStressBranchObserved: prospective && counters.jointStressObservations > 0, countsAreNotStatisticalGuarantees: true, automaticPromotion: false },
  };
}

export function createSnapshot(args: { asOf: string; v1: V1Snapshot; input: EngineInput | null; output: RegimeOutput | null; error: SnapshotFailure | null; sourceStatus?: Record<string, unknown>; captureMetadata?: Record<string, unknown>; previous?: ShadowSnapshot }): ShadowSnapshot {
  if (instant(args.asOf) === null || !args.v1.version || !/^[a-f0-9]{64}$/.test(args.v1.outputHash)) fail("INVALID_SNAPSHOT_IDENTITY", "Snapshot requires an exact asOf, V1 version and output hash");
  if (args.input && args.input.asOf !== args.asOf || args.output && args.output.asOf !== args.asOf) fail("ASOF_MISMATCH", "V1/V2 shadow cut must share one explicit asOf");
  if (args.output && !args.input) fail("MISSING_NORMALIZED_INPUT", "Successful V2 snapshots must retain the exact normalized input");
  if (!args.output && !args.error) fail("MISSING_FAILURE", "Unavailable V2 must record an explicit error");
  if (args.output && (args.output.engineVersion !== ENGINE_VERSION || args.output.parameterSet !== "C03" || canonical(args.output.versions) !== canonical(CONTRACT_HASHES))) fail("ENGINE_VERSION_MISMATCH", "Snapshot cannot relabel another engine or parameter version");
  if (args.previous) assertSnapshot(args.previous);
  const input = jsonCopy(args.input), output = jsonCopy(args.output), v1 = jsonCopy(args.v1), captureMetadata = jsonCopy(args.captureMetadata ?? {});
  const versions = versionManifest(input, output);
  const observation = observe(input, output, versions, captureMetadata, args.previous);
  observation.reasonCodes = [...new Set([...(output ? [output.diagnostics.ruleId, ...output.diagnostics.missingReasons] : []), ...(args.error ? [args.error.code] : [])])];
  const body: Omit<ShadowSnapshot, "snapshotId"> = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION, versions, asOf: args.asOf, v1, v2: output, normalizedInput: input,
    error: jsonCopy(args.error), sourceStatus: jsonCopy(args.sourceStatus ?? output?.sourceStatus ?? {}), replayClass: output?.replayClass ?? "UNKNOWN", captureMetadata,
    comparison: { status: "NON_EQUIVALENT_TAXONOMY" as const, v1Regime: v1.regime, v2Regime: output?.regime ?? null, sameLiteralLabel: v1.regime !== null && output?.regime ? v1.regime === output.regime : null, semanticallySame: null, v1IsTruthLabel: false as const },
    observation,
  };
  const result: ShadowSnapshot = { ...body, snapshotId: hash(body) };
  if (Buffer.byteLength(canonical(result)) > MAX_SNAPSHOT_BYTES) fail("SNAPSHOT_TOO_LARGE", "Snapshot exceeds the bounded 16 MiB storage contract");
  return freeze(result);
}

export function assertSnapshot(value: unknown): asserts value is ShadowSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("INVALID_SNAPSHOT", "Snapshot must be an object");
  const candidate = value as ShadowSnapshot;
  if (candidate.schemaVersion !== SNAPSHOT_SCHEMA_VERSION || !/^[a-f0-9]{64}$/.test(candidate.snapshotId ?? "")) fail("INVALID_SNAPSHOT_SCHEMA", "Unknown snapshot schema or malformed content address");
  const { snapshotId, ...body } = candidate;
  if (hash(body) !== snapshotId) fail("SNAPSHOT_HASH_MISMATCH", "Snapshot content does not match its immutable identity");
  if (!candidate.observation || !candidate.observation.checkpoint || !candidate.versions || candidate.versions.snapshotSchema !== SNAPSHOT_SCHEMA_VERSION) fail("INVALID_SNAPSHOT_STRUCTURE", "Snapshot lacks versioned observation state");
  for (const value of Object.values(candidate.observation.checkpoint.counters)) add(value, 0);
  if (candidate.observation.versionKey !== hash(candidate.versions)) fail("CHECKPOINT_VERSION_MISMATCH", "Observation checkpoint belongs to a different version");
}

export function replaySnapshot(snapshot: ShadowSnapshot) {
  assertSnapshot(snapshot);
  if (canonical(snapshot.versions) !== canonical(versionManifest(snapshot.normalizedInput, snapshot.v2))) fail("UNSUPPORTED_REPLAY_VERSION", "Exact replay requires the original engine and contract versions");
  if (!snapshot.normalizedInput || !snapshot.v2) return { status: "NOT_REPLAYABLE_FAILURE" as const, error: snapshot.error };
  const output = evaluateRegime(snapshot.normalizedInput);
  if (canonical(output) !== canonical(snapshot.v2)) fail("REPLAY_OUTPUT_MISMATCH", "Replay changed the V2 output, dimensions, evidence or reasons");
  return freeze({ status: "MATCH" as const, snapshotId: snapshot.snapshotId, engineVersion: output.engineVersion, parameterSet: output.parameterSet, outputHash: hash(output), output });
}

const inside = (root: string, location: string) => location === root || (!path.relative(root, location).startsWith(`..${path.sep}`) && path.relative(root, location) !== ".." && !path.isAbsolute(path.relative(root, location)));
async function runtimeDirectory(directory: string, repositoryRoot: string) {
  if (!path.isAbsolute(directory) || !path.isAbsolute(repositoryRoot)) fail("ABSOLUTE_STORAGE_PATH_REQUIRED", "Runtime storage and repository root must be absolute");
  const repo = await realpath(repositoryRoot), requested = path.resolve(directory);
  if (inside(repo, requested) || inside(path.resolve(repositoryRoot), requested)) fail("RUNTIME_DATA_IN_REPOSITORY", "Runtime snapshots must remain outside the repository and public tree");
  let ancestor = requested;
  for (;;) {
    try {
      const resolved = path.resolve(await realpath(ancestor), path.relative(ancestor, requested));
      if (inside(repo, resolved)) fail("RUNTIME_DATA_IN_REPOSITORY", "Storage symlink resolves into the repository");
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT" || path.dirname(ancestor) === ancestor) throw error;
      ancestor = path.dirname(ancestor);
    }
  }
  await mkdir(requested, { recursive: true, mode: 0o700 });
  const resolved = await realpath(requested);
  if (inside(repo, resolved)) fail("RUNTIME_DATA_IN_REPOSITORY", "Resolved runtime directory is inside the repository");
  return resolved;
}

export async function persistSnapshot(directory: string, snapshot: ShadowSnapshot, options: { repositoryRoot: string }): Promise<string> {
  assertSnapshot(snapshot);
  const bytes = canonical(snapshot) + "\n";
  if (Buffer.byteLength(bytes) > MAX_SNAPSHOT_BYTES) fail("SNAPSHOT_TOO_LARGE", "Snapshot exceeds the bounded storage contract");
  const storage = await runtimeDirectory(directory, options.repositoryRoot);
  const filename = path.join(storage, snapshot.snapshotId + ".json"), temporary = path.join(storage, `.${snapshot.snapshotId}.${randomUUID()}.tmp`);
  const handle = await open(temporary, "wx", 0o600);
  try {
    try { await handle.writeFile(bytes); await handle.sync(); }
    finally { await handle.close(); }
    try { await link(temporary, filename); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST" || (await readBounded(filename)).toString("utf8") !== bytes) throw error; }
  } finally { await unlink(temporary); }
  return filename;
}

export async function readSnapshot(filename: string): Promise<ShadowSnapshot> {
  const bytes = await readBounded(filename);
  const snapshot: unknown = JSON.parse(bytes.toString("utf8"));
  assertSnapshot(snapshot);
  return freeze(snapshot);
}

async function readBounded(filename: string): Promise<Buffer> {
  const handle = await open(filename, "r");
  try {
    const size = (await handle.stat()).size;
    if (size > MAX_SNAPSHOT_BYTES) fail("SNAPSHOT_TOO_LARGE", "Snapshot exceeds the bounded storage contract");
    const buffer = Buffer.alloc(size + 1);
    const view = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(view, offset, buffer.length - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    if (offset !== size) fail("SNAPSHOT_FILE_CHANGED", "Immutable snapshot changed while reading");
    return buffer.subarray(0, size);
  } finally { await handle.close(); }
}
