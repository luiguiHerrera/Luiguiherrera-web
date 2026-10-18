// Operational coordinator only. Public aggregators never import this module.
import { randomUUID } from "node:crypto";
import { C03, ENGINE_VERSION, PRICE_BASIS, REGISTRY, TICKERS } from "../contract.ts";
import { evaluateRegime, type RegimeOutput } from "../engine.ts";
import { hash } from "../math.ts";
import { instant, resolveCalendar, windowValues } from "../temporal.ts";
import type { EngineInput, Temporal } from "../types.ts";
import { loadReviewedCalendars, type CalendarExpiry } from "./calendar-package.ts";
import { acquireJobSources } from "./job-sources.ts";
import { createProductionJobStore, type JobLatest, type JobStorage, type JobStorageTransaction } from "./job-storage.ts";
import { prepareSourceVintageWithReviewedCalendars, resolveSourceVintage, type SourceBundle } from "./source-input.ts";
import { createSnapshot, replaySnapshot, type ShadowSnapshot } from "./snapshot.ts";

export const JOB_POLICY = "regime-v2-shadow-job/2.0.0";
export const AS_OF_POLICY = "ACTUAL_CLOCK_AFTER_PREPARATION_PINNED_SESSION/1";
const namespace = `${ENGINE_VERSION.replaceAll("/", "-")}/C03`;
export const LATEST_KEY = "regime-v2/indexes/latest.json";
export type TerminalState = "SUCCESS" | "NO_NEW_SESSION" | "INCOMPLETE" | "SOURCE_FAILURE" | "CALENDAR_FAILURE" | "ENGINE_FAILURE" | "STORAGE_FAILURE" | "PUBLICATION_CONFLICT" | "TIMEOUT" | "OFF";
export type JobTerminal = {
  schemaVersion: typeof JOB_POLICY; attemptId: string; trigger: "schedule" | "workflow_dispatch";
  startedAt: string; completedAt: string; state: TerminalState; code: string;
  expectedSession: string | null; observationId: string | null; observationKey: string | null;
  fetchCalls: number; fetchCountCertainty: "EXACT" | "STARTED_REQUEST_UPPER_BOUND"; sourceAttempts: unknown[]; calendarExpiry: CalendarExpiry | null; stages: string[];
  terminalStored: boolean; shadowActivated: false;
};
export type JobObservation = {
  kind: "ECONOMIC_OBSERVATION"; observationId: string; expectedSession: string; asOf: string;
  inputIdentity: unknown; compatibility: string; bundleKey: string; snapshot: ShadowSnapshot;
  fullV1Output: null; v1Availability: "NOT_CAPTURED_BY_SEPARATE_JOB";
  eligibility: Record<string, boolean>;
};
type Acquisition = { bundle: SourceBundle; fetchCalls: number; completedAt: string };
export type ShadowJobOptions = {
  enabled?: string; trigger?: "schedule" | "workflow_dispatch"; timeoutMs?: number;
  // Injection points are for isolated operational tests, never workflow inputs.
  clock?: () => string; store?: () => Promise<JobStorage> | JobStorage;
  loadCalendars?: typeof loadReviewedCalendars;
  acquire?: (options: { expectedSession: string; signal: AbortSignal; onAttempt?: (attempt: unknown) => void }) => Promise<Acquisition>;
  evaluate?: typeof evaluateRegime;
  onTerminal: (record: JobTerminal) => Promise<void> | void;
};

/** Additional live admission checks; the R2 engine and its output remain unchanged. */
export function liveEligibility(input: EngineInput, output: RegimeOutput, bundle: SourceBundle, expectedSession: string) {
  const asOf = input.asOf, end = instant(asOf)!;
  const calendars = Object.fromEntries(["equity", "vix", "vx"].map(family => [family, resolveCalendar(input.calendars[family as "equity"], asOf, "R0")]));
  const bounds = (row: Temporal) => instant(row.capturedAt) !== null && instant(row.availableAt) !== null && instant(row.capturedAt)! <= end && instant(row.availableAt)! <= end && ["EXACT", "CONSERVATIVE_BOUND"].includes(row.availabilityCertainty ?? "");
  const cut = { mode: "R2" as const, asOf, targetSession: expectedSession, expectedSessions: calendars.equity.sessions, equity: input.equity };
  const near = input.vx?.contracts.slice(0, 2) ?? [];
  const dates = new Set(calendars.equity.sessions.slice(-64)), vixDates = new Set(calendars.vix.sessions.slice(-6));
  const rows = [...TICKERS.flatMap(ticker => (input.equity[ticker]?.rows ?? []).filter(row => dates.has(row.observationDate ?? "")).map(row => ({ ...input.equity[ticker], ...row }))), ...(input.vix?.rows ?? []).filter(row => vixDates.has(row.observationDate ?? "")).map(row => ({ ...input.vix, ...row })), ...near];
  return {
    officialCalendars: Object.entries(calendars).every(([family, value]) => value.reason === null && value.target === expectedSession && bounds(input.calendars[family as "equity"]!)),
    coreFresh: [...TICKERS, "VIX", "VX"].every(key => output.sourceStatus[key]?.status === "AVAILABLE" && output.sourceStatus[key]?.observationDate === expectedSession),
    equityWarmup: TICKERS.every(ticker => windowValues(input.equity[ticker], cut, 64, "adjusted_close", PRICE_BASIS) !== null),
    vixWarmup: windowValues(input.vix, { ...cut, expectedSessions: calendars.vix.sessions }, 6, "value") !== null,
    nearMonthly: near.length === 2 && near.every(row => row.expirationDate > expectedSession && typeof row.settlement === "number" && Number.isFinite(row.settlement) && row.settlement > 0 && row.status === "AVAILABLE"),
    captureBounds: bundle.captures.every(entry => bounds(entry.capture.metadata)),
    coreRowBounds: rows.length === 712 && rows.every(row => bounds(row) && instant(row.observationEndAt) !== null && instant(row.observationEndAt)! <= end),
    requiredFeatures: REGISTRY.filter(row => row.required).every(row => output.evidence.some(item => item.featureId === row.id && item.status === "AVAILABLE")),
    economicRegime: output.systemState === "COMPLETE" && output.regime !== null,
  };
}

/** Operational identity v2 binds the actual normalized cut, full retained source
 * identities and exact immutable snapshot (including predecessor). Different
 * capture clocks/asOf/predecessors are never declared byte-equivalent. A retry
 * via SESSION_REFERENCE reuses the winner's original inputs and asOf verbatim. */
export function observationIdentity(args: { bundle: SourceBundle; input: EngineInput; snapshot: ShadowSnapshot; expectedSession: string; calendarRelease: string }) {
  const inputIdentity = { engineVersion: ENGINE_VERSION, parameterSet: "C03", parameterHash: hash(C03), expectedSession: args.expectedSession,
    asOf: args.input.asOf, asOfPolicy: AS_OF_POLICY, jobPolicy: JOB_POLICY, calendarRelease: args.calendarRelease,
    normalizedInputHash: hash(args.input), sourceBundleHash: hash(args.bundle), snapshotId: args.snapshot.snapshotId };
  return { inputIdentity, observationId: hash(inputIdentity) };
}
type SessionReference = JobLatest & { kind: "SESSION_REFERENCE" };

export async function runShadowObservation(options: ShadowJobOptions): Promise<JobTerminal> {
  const clock = options.clock ?? (() => new Date().toISOString()), startedAt = clock();
  let store: JobStorage | undefined, phase: TerminalState = "CALENDAR_FAILURE";
  const record: JobTerminal = { schemaVersion: JOB_POLICY, attemptId: randomUUID(), trigger: options.trigger ?? "workflow_dispatch", startedAt, completedAt: startedAt,
    state: "OFF", code: "JOB_DISABLED", expectedSession: null, observationId: null, observationKey: null, fetchCalls: 0, fetchCountCertainty: "EXACT", sourceAttempts: [], calendarExpiry: null, stages: [], terminalStored: false, shadowActivated: false };
  const abort = new AbortController();
  const timeoutMs = options.timeoutMs ?? 15 * 60 * 1000;
  const validTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0 && timeoutMs <= 25 * 60 * 1000;
  const deadline = performance.now() + (validTimeout ? timeoutMs : 0);
  const timer = setTimeout(() => abort.abort(), validTimeout ? timeoutMs : 1);
  const checkpoint = () => { if (abort.signal.aborted || performance.now() >= deadline) throw Object.assign(new Error("Job deadline exceeded"), { code: "JOB_TIMEOUT" }); };
  try {
    if ((options.enabled ?? "OFF") !== "ON") return record;
    if (!validTimeout) throw Object.assign(new Error("Invalid job timeout"), { code: "INVALID_JOB_CONFIG" });
    checkpoint();
    const calendar = (options.loadCalendars ?? loadReviewedCalendars)(startedAt);
    record.calendarExpiry = calendar.expiry; record.expectedSession = calendar.expectedSession;
    record.stages.push("LOAD_REVIEWED_CALENDAR", "RESOLVE_EXPECTED_SESSION");
    phase = "STORAGE_FAILURE";
    store = await (options.store ?? createProductionJobStore)();
    await store.preflight();
    const work = async (tx: JobStorageTransaction) => {
      checkpoint();
      const compatibility = hash({ engineVersion: ENGINE_VERSION, parameterSet: "C03", parameterHash: hash(C03), jobPolicy: JOB_POLICY, calendarRelease: calendar.releaseIdentity });
      const sessionKey = `regime-v2/observations/${namespace}/sessions/${calendar.expectedSession}-${compatibility}.json`;
      const pointerFor = (observation: JobObservation, observationKey: string): JobLatest => ({ expectedSession: observation.expectedSession, asOf: observation.asOf, observationId: observation.observationId, observationKey, compatibility });
      async function verifyObservation(pointer: JobLatest): Promise<JobObservation> {
        const previous = await tx.readJson<JobObservation>(pointer.observationKey);
        const identity = previous?.inputIdentity as ReturnType<typeof observationIdentity>["inputIdentity"] | undefined;
        if (!previous || previous.kind !== "ECONOMIC_OBSERVATION" || previous.observationId !== pointer.observationId || !identity || hash(identity) !== previous.observationId ||
          previous.expectedSession !== pointer.expectedSession || previous.asOf !== pointer.asOf || previous.compatibility !== compatibility || pointer.compatibility !== compatibility ||
          hash({ engineVersion: identity.engineVersion, parameterSet: identity.parameterSet, parameterHash: identity.parameterHash, jobPolicy: identity.jobPolicy, calendarRelease: identity.calendarRelease }) !== compatibility || identity.snapshotId !== previous.snapshot.snapshotId ||
          identity.normalizedInputHash !== hash(previous.snapshot.normalizedInput) || identity.asOf !== previous.asOf || replaySnapshot(previous.snapshot).status !== "MATCH")
          throw Object.assign(new Error("Canonical observation failed verification"), { code: "STORAGE_CORRUPT" });
        const bundle = await tx.readJson<SourceBundle>(previous.bundleKey);
        if (!bundle || hash(bundle) !== identity.sourceBundleHash) throw Object.assign(new Error("Retained source bundle failed verification"), { code: "STORAGE_CORRUPT" });
        return previous;
      }
      function checkSession(reference: SessionReference | null): asserts reference is SessionReference {
        if (!reference || reference.kind !== "SESSION_REFERENCE" || reference.expectedSession !== calendar.expectedSession || reference.compatibility !== compatibility)
          throw Object.assign(new Error("Session reference identity is incompatible"), { code: "STORAGE_CORRUPT" });
      }
      const priorSession = await tx.readJson<SessionReference>(sessionKey);
      if (priorSession) {
        checkSession(priorSession);
        const previous = await verifyObservation(priorSession);
        checkpoint(); await tx.putLatest(LATEST_KEY, pointerFor(previous, priorSession.observationKey));
        Object.assign(record, { state: "NO_NEW_SESSION", code: "REUSED_CANONICAL_OBSERVATION", observationId: priorSession.observationId, observationKey: priorSession.observationKey });
        record.stages.push("VERIFY_REUSE", "MONOTONIC_LATEST"); return;
      }
      phase = "SOURCE_FAILURE"; record.stages.push("CAPTURE_MARKET_SOURCES");
      let cancelListener: (() => void) | undefined;
      const timedOut = new Promise<never>((_, reject) => {
        cancelListener = () => reject(Object.assign(new Error("Source acquisition deadline exceeded"), { code: "JOB_TIMEOUT" }));
        abort.signal.addEventListener("abort", cancelListener, { once: true });
      });
      let acquired: Acquisition;
      try { acquired = await Promise.race([(options.acquire ?? acquireJobSources)({ expectedSession: calendar.expectedSession, signal: abort.signal, onAttempt: (event: unknown) => {
        if (abort.signal.aborted) return;
        record.sourceAttempts.push(event);
        if (event && typeof event === "object" && "status" in event && event.status === "STARTED") { record.fetchCalls++; record.fetchCountCertainty = "STARTED_REQUEST_UPPER_BOUND"; }
      } }), timedOut]); }
      finally { if (cancelListener) abort.signal.removeEventListener("abort", cancelListener); }
      checkpoint(); record.fetchCalls = acquired.fetchCalls; record.fetchCountCertainty = "EXACT";
      // The real capture interval must follow calendar preflight. Never backdate a cut.
      if (acquired.bundle.captures.some(entry => instant(entry.capture.startedAt) === null || instant(entry.capture.startedAt)! < instant(startedAt)! || instant(entry.capture.completedAt)! < instant(entry.capture.startedAt)!)) throw Object.assign(new Error("Capture preceded calendar preflight"), { code: "TEMPORAL_ORDER" });
      record.stages.push("VALIDATE_AND_NORMALIZE");
      const vintage = prepareSourceVintageWithReviewedCalendars(acquired.bundle, calendar);
      checkpoint();
      const asOf = clock();
      if (instant(asOf) === null || instant(asOf)! < instant(startedAt)! || acquired.bundle.captures.some(entry => instant(entry.capture.completedAt)! > instant(asOf)!)) throw Object.assign(new Error("Capture exceeds actual decision cut"), { code: "TEMPORAL_ORDER" });
      if (["equity", "vix", "vx"].some(family => resolveCalendar(calendar.calendars[family as "equity"], asOf, "R0").target !== calendar.expectedSession)) throw Object.assign(new Error("Session advanced during acquisition; retry at a new actual preflight"), { code: "SESSION_CHANGED_DURING_RUN" });
      const prepared = resolveSourceVintage(vintage, asOf);
      phase = "ENGINE_FAILURE"; record.stages.push("EVALUATE_C03");
      const input = prepared.input, output = (options.evaluate ?? evaluateRegime)(input);
      checkpoint();
      const eligibility = liveEligibility(input, output, acquired.bundle, calendar.expectedSession);
      const admissible = Object.values(eligibility).every(Boolean);
      phase = "STORAGE_FAILURE";
      // A competing attempt can publish while this one acquires sources. Reuse
      // the verified original before deriving a different predecessor snapshot.
      const completedSession = await tx.readJson<SessionReference>(sessionKey);
      if (completedSession) {
        checkSession(completedSession); const previous = await verifyObservation(completedSession);
        checkpoint(); await tx.putLatest(LATEST_KEY, pointerFor(previous, completedSession.observationKey));
        Object.assign(record, { state: "NO_NEW_SESSION", code: "CONCURRENT_SESSION_WINNER_REUSED", observationId: completedSession.observationId, observationKey: completedSession.observationKey });
        record.stages.push("VERIFY_REUSE", "MONOTONIC_LATEST"); return;
      }
      const latest = await tx.readJson<JobLatest>(LATEST_KEY);
      if (latest && latest.compatibility !== compatibility) throw Object.assign(new Error("Predecessor version is incompatible"), { code: "PUBLICATION_CONFLICT" });
      const prior = latest ? await verifyObservation(latest) : null;
      if (latest && prior && latest.expectedSession === calendar.expectedSession) {
        checkpoint();
        Object.assign(record, { state: "NO_NEW_SESSION", code: "CONCURRENT_LATEST_SESSION_REUSED", observationId: latest.observationId, observationKey: latest.observationKey });
        record.stages.push("VERIFY_REUSE", "MONOTONIC_LATEST"); return;
      }
      const snapshot = createSnapshot({ asOf, v1: { regime: null, score: null, confidence: null, version: "V1_NOT_CAPTURED_BY_SEPARATE_JOB", outputHash: hash(null) }, input, output, error: null,
        captureMetadata: { ...prepared.captureMetadata, origin: "PROSPECTIVE", jobPolicy: JOB_POLICY, calendarPreflightAsOf: startedAt, actualAsOfPolicy: AS_OF_POLICY, eligibility }, ...(prior ? { previous: prior.snapshot } : {}) });
      if (replaySnapshot(snapshot).status !== "MATCH") throw Object.assign(new Error("Exact output replay failed"), { code: "REPLAY_MISMATCH" });
      checkpoint(); record.stages.push("WRITE_IMMUTABLE", "VERIFY_IMMUTABLE");
      // Sorting the retained captures removes arrival-order noise without changing
      // any capture bytes, clocks or source identity. Snapshot identity still binds
      // the exact prepared metadata and predecessor actually used by this attempt.
      const retainedBundle: SourceBundle = { ...acquired.bundle, captures: [...acquired.bundle.captures].sort((a, b) => hash(a).localeCompare(hash(b))) };
      const identity = observationIdentity({ bundle: retainedBundle, input, snapshot, expectedSession: calendar.expectedSession, calendarRelease: calendar.releaseIdentity });
      const observationKey = `regime-v2/observations/${namespace}/${calendar.expectedSession}/${identity.observationId}.json`;
      const bundleKey = `regime-v2/observations/${namespace}/bundles/${hash(retainedBundle)}.json`;
      const observation: JobObservation = { kind: "ECONOMIC_OBSERVATION", ...identity, compatibility, expectedSession: calendar.expectedSession, asOf, bundleKey, snapshot, eligibility, fullV1Output: null, v1Availability: "NOT_CAPTURED_BY_SEPARATE_JOB" };
      Object.assign(record, { observationId: identity.observationId, observationKey });
      if (!admissible) {
        const failureBundleKey = `regime-v2/runs/${namespace}/${record.attemptId}/capture.json`;
        const failureKey = `regime-v2/runs/${namespace}/${record.attemptId}/incomplete.json`;
        await tx.createJson(failureBundleKey, retainedBundle);
        await tx.createJson(failureKey, { ...observation, kind: "INCOMPLETE_ATTEMPT", bundleKey: failureBundleKey });
        record.observationKey = failureKey; record.observationId = null;
        record.state = output.systemState === "INCOMPLETE" ? "INCOMPLETE" : "SOURCE_FAILURE";
        record.code = "LIVE_ADMISSION_FAILED"; return;
      }
      await tx.createJson(bundleKey, retainedBundle); checkpoint();
      // Strict immutable create: an incompatible observation body is never
      // converted into an idempotent reuse, even during a race.
      await tx.createJson(observationKey, observation); checkpoint();
      const pointer = pointerFor(observation, observationKey);
      await verifyObservation(pointer);
      const reference: SessionReference = { kind: "SESSION_REFERENCE", ...pointer };
      let winner = reference;
      try { await tx.createJson(sessionKey, reference); }
      catch (error) {
        if (!error || typeof error !== "object" || !("code" in error) || error.code !== "CRITICAL_IDENTITY_COLLISION") throw error;
        // This key is a typed first-writer session election, not a content-addressed
        // observation identity. Losing references may differ; observations may not.
        const elected = await tx.readJson<SessionReference>(sessionKey); checkSession(elected);
        await verifyObservation(elected); winner = elected;
      }
      checkpoint();
      const electedObservation = winner.observationId === pointer.observationId ? observation : await verifyObservation(winner);
      const publication = await tx.putLatest(LATEST_KEY, pointerFor(electedObservation, winner.observationKey));
      const lostElection = winner.observationId !== pointer.observationId;
      Object.assign(record, { observationId: winner.observationId, observationKey: winner.observationKey });
      record.stages.push("MONOTONIC_LATEST");
      record.state = publication.status === "STALE" || publication.status === "UNCHANGED" || lostElection ? "NO_NEW_SESSION" : "SUCCESS";
      record.code = lostElection ? "CONCURRENT_SESSION_WINNER_REUSED" : publication.status === "STALE" ? "OLDER_OBSERVATION_RETAINED_LATEST_UNCHANGED" : publication.status === "UNCHANGED" ? "REUSED_IDENTICAL_OBSERVATION" : "OBSERVATION_PUBLISHED";
    };
    if (store.withExclusive) await store.withExclusive(work);
    else await work(store);
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : "UNCLASSIFIED_FAILURE";
    record.state = code === "JOB_TIMEOUT" ? "TIMEOUT" : code === "PUBLICATION_CONFLICT" || code === "STORAGE_CONFLICT" ? "PUBLICATION_CONFLICT" : phase; record.code = code;
    if (error && typeof error === "object" && "fetchCalls" in error && typeof error.fetchCalls === "number") { record.fetchCalls = error.fetchCalls; record.fetchCountCertainty = "EXACT"; }
    if (error && typeof error === "object" && "expiry" in error && error.expiry) record.calendarExpiry = error.expiry as CalendarExpiry;
  } finally {
    clearTimeout(timer); abort.abort(); record.completedAt = clock();
    if (store) {
      try { await store.createJson(`regime-v2/runs/${namespace}/${record.attemptId}/terminal.json`, { ...record, terminalStored: true }); record.terminalStored = true; }
      catch { record.state = "STORAGE_FAILURE"; record.code = "TERMINAL_STORAGE_FAILED"; }
    }
    // Workflow diagnostics remain authoritative for the attempt if storage fails.
    await options.onTerminal(record);
  }
  return record;
}
