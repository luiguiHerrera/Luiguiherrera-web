/** Evaluate preserved real source bytes through the unchanged RC1 boundary/core.
 * The wall clock is sampled once after preparation. No asOf argument, network,
 * fixture loading, manual value correction, or production activation exists.
 */
import { mkdir, readFile, writeFile, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";

const option = name => {
  const at = process.argv.indexOf(name);
  if (at < 0 || !process.argv[at + 1]) throw new Error(`Missing ${name}`);
  return process.argv[at + 1];
};
const root = await realpath(path.resolve(option("--root"))), directory = await realpath(path.resolve(option("--directory")));
// Explicit compatibility input only. The default portable path has no calendar
// raw-capture dependency and never reads historical readiness artifacts.
const calendarsFile = process.argv.includes("--calendars") ? await realpath(path.resolve(option("--calendars"))) : null;
if (directory === root || directory.startsWith(root + path.sep)) throw new Error("Runtime data must be outside repository");
if (calendarsFile && (calendarsFile === root || calendarsFile.startsWith(root + path.sep))) throw new Error("Legacy calendar raw must be outside repository");
const load = name => import(pathToFileURL(path.join(root, "lib/regime-engine-v2", name)));
const { SOURCE_BUNDLE_VERSION, prepareSourceVintage, prepareSourceVintageWithReviewedCalendars, resolveSourceVintage } = await load("operations/source-input.ts");
const { loadReviewedCalendars } = await load("operations/calendar-package.ts");
const { evaluateRegime } = await load("engine.ts");
const { REGISTRY, TICKERS, PRICE_BASIS } = await load("contract.ts");
const { instant, resolveCalendar, windowValues } = await load("temporal.ts");
const { canonical, hash } = await load("math.ts");
const codeHash = createHash("sha256").update(await readFile(new URL(import.meta.url))).digest("hex");
const reviewed = calendarsFile ? null : loadReviewedCalendars(new Date().toISOString());
const acquisition = JSON.parse(await readFile(path.join(directory, "market/market-acquisition.json"), "utf8"));
const calendars = calendarsFile ? JSON.parse(await readFile(calendarsFile, "utf8")) : {};
const out = path.join(directory, "evaluation");
await mkdir(out); // Fail instead of replacing a previous decision cut.
const acceptedKinds = new Set(["YAHOO_ADJCLOSE", "CBOE_VIX_CSV", "CFE_MONTHLY_CATALOG", "CFE_MONTHLY_CSV"]);
const captures = acquisition.captures.filter(entry => acceptedKinds.has(entry.kind) && entry.httpStatus >= 200 && entry.httpStatus < 300)
  .map(({ kind, capture, ticker, identity }) => ({ kind, capture, ...(ticker ? { ticker } : {}), ...(identity ? { identity } : {}) }));
const bundle = { schemaVersion: SOURCE_BUNDLE_VERSION, mode: "R2", calendars, captures };
const bundleFile = path.join(out, "source-bundle.json");
await writeFile(bundleFile, JSON.stringify(bundle) + "\n", { flag: "wx" });

const preparationStart = performance.now();
const vintage = reviewed ? prepareSourceVintageWithReviewedCalendars(bundle, reviewed) : prepareSourceVintage(bundle);
const preparationMs = performance.now() - preparationStart;
const asOf = new Date().toISOString();
const resolveStart = performance.now();
const prepared = resolveSourceVintage(vintage, asOf);
const input = JSON.parse(JSON.stringify(prepared.input));
const resolveMs = performance.now() - resolveStart;
const engineStart = performance.now(), output = evaluateRegime(input), engineMs = performance.now() - engineStart;

// R2 intentionally retains historical windows. The live eligibility audit is
// stricter about present-day availability/calendar provenance without changing
// or relabelling any row, feature, calendar, or canonical decision rule.
const strictCalendars = Object.fromEntries(["equity", "vix", "vx"].map(family => [family, resolveCalendar(input.calendars[family], asOf, "R0")]));
const expectedSession = strictCalendars.equity.target;
const bounds = record => instant(record.capturedAt) !== null && instant(record.availableAt) !== null
  && instant(record.capturedAt) <= instant(asOf) && instant(record.availableAt) <= instant(asOf)
  && ["EXACT", "CONSERVATIVE_BOUND"].includes(record.availabilityCertainty);
const calendarRows = Object.entries(strictCalendars).map(([family, resolution]) => ({ family, target: resolution.target, reason: resolution.reason,
  official: input.calendars[family]?.kind === "OFFICIAL", completeCoverage: input.calendars[family]?.completeIntervalCoverage === true,
  boundsValid: bounds(input.calendars[family] ?? {}), sourcePublishedAt: input.calendars[family]?.sourcePublishedAt ?? "UNKNOWN" }));
const captureRows = captures.map(entry => ({ kind: entry.kind, ticker: entry.ticker ?? null, identity: entry.identity ?? null,
  sourceId: entry.capture.sourceId, capturedAt: entry.capture.completedAt, availableAt: entry.capture.metadata.availableAt,
  sourcePublishedAt: "UNKNOWN", certainty: entry.capture.metadata.availabilityCertainty, boundsValid: bounds(entry.capture.metadata),
  rawHash: entry.capture.rawHash, captureId: entry.capture.captureId }));
const cut = { mode: "R2", asOf, targetSession: expectedSession ?? "", expectedSessions: strictCalendars.equity.sessions, equity: input.equity };
const equityWarmup = TICKERS.map(ticker => ({ ticker, requiredCloses: 64, sufficient: windowValues(input.equity[ticker], cut, 64, "adjusted_close", PRICE_BASIS) !== null,
  basis: input.equity[ticker]?.priceBasis ?? null, currency: input.equity[ticker]?.currency ?? null, sourceStatus: output.sourceStatus[ticker] }));
const vixCut = { ...cut, expectedSessions: strictCalendars.vix.sessions };
const vixWarmup = windowValues(input.vix, vixCut, 6, "value") !== null;
const sourceKeys = [...TICKERS, "VIX", "VX"];
const coreUnknowns = REGISTRY.filter(row => row.required).map(row => output.evidence.find(item => item.featureId === row.id))
  .filter(item => !item || item.status !== "AVAILABLE").map(item => item?.featureId ?? "MISSING_REQUIRED_FEATURE");
const near = input.vx?.contracts.slice(0, 2) ?? [];
const wantedDates = new Set(strictCalendars.equity.sessions.slice(-64));
const vixDates = new Set(strictCalendars.vix.sessions.slice(-6));
const selectedRows = [
  ...TICKERS.flatMap(ticker => (input.equity[ticker]?.rows ?? []).filter(row => wantedDates.has(row.observationDate)).map(row => ({ ...input.equity[ticker], ...row }))),
  ...(input.vix?.rows ?? []).filter(row => vixDates.has(row.observationDate)).map(row => ({ ...input.vix, ...row })),
  ...near,
];
const rowBoundsValid = selectedRows.every(row => bounds(row) && instant(row.observationEndAt) !== null && instant(row.observationEndAt) <= instant(asOf));
const gates = {
  officialCalendar: calendarRows.every(row => row.official && row.completeCoverage && row.boundsValid && row.reason === null && row.target === expectedSession) && expectedSession !== null,
  coreSourcesAvailableAndFresh: sourceKeys.every(key => output.sourceStatus[key]?.status === "AVAILABLE" && output.sourceStatus[key]?.observationDate === expectedSession),
  equityWarmup: equityWarmup.every(row => row.sufficient), vixWarmup,
  nearMonthlyContracts: near.length === 2 && near.every(contract => contract.expirationDate > expectedSession && Number.isFinite(contract.settlement) && contract.settlement > 0 && contract.status === "AVAILABLE"),
  captureBounds: captureRows.every(row => row.boundsValid), selectedCoreRowBounds: rowBoundsValid,
  noCoreUnknowns: coreUnknowns.length === 0,
  economicRegime: output.systemState !== "INCOMPLETE" && ["RISK_ON_BROAD", "RISK_ON_SELECTIVE", "TRANSITION", "DEFENSIVE", "STRESS"].includes(output.regime),
};
const reasonCodes = [...new Set([...output.diagnostics.missingReasons, ...output.evidence.flatMap(item => item.reasons)])].sort();
const result = { schemaVersion: "regime-v2-readiness-evaluation/1.0.0", codeHash, asOf, expectedSession,
  calendarPath: reviewed ? "COMMITTED_REVIEWED_RELEASE" : "EXPLICIT_LEGACY_RAW_PACKETS",
  calendarReleaseIdentity: reviewed?.releaseIdentity ?? null,
  calendarPreflight: reviewed ? { asOf: reviewed.preflightAsOf, expectedSession: reviewed.expectedSession, expiry: reviewed.expiry } : null,
  executionRole: "REPLAY_OPERATOR_FOR_ALREADY_CAPTURED_BYTES; NOT_THE_DAILY_CAPTURE_COORDINATOR",
  asOfRule: "One actual runtime clock sample after preparation, before session resolution and C03 evaluation; no historical cut chosen from observed market data.",
  gates, liveV2AdjudicableCapture: Object.values(gates).every(Boolean), coreUnknowns, calendarRows, captureRows, equityWarmup,
  coreSelectedRowsAudited: selectedRows.length, selectedCoreRowBounds: rowBoundsValid,
  output: { engineVersion: output.engineVersion, parameterSet: output.parameterSet, regime: output.regime, systemState: output.systemState,
    pillarStates: output.pillarStates, concordance: output.concordance, uncertainty: output.uncertainty, dataQuality: output.dataQuality, reasonCodes, sourceStatus: output.sourceStatus },
  historicalReplayClass: "R2", liveOutputReplayClass: output.replayClass, pointInTimeOosClaim: false,
  temporalGuarantee: "CONSERVATIVE_BOUND_AT_REAL_CAPTURE; HISTORICAL_WINDOWS_AND_FINAL_OUTPUT_R2; ORIGINAL_PUBLICATION_UNKNOWN",
  rowReplayClasses: Object.fromEntries(sourceKeys.map(key => { const packet = key === "VIX" ? input.vix : key === "VX" ? input.vx : input.equity[key]; const rows = packet?.rows ?? packet?.contracts ?? [];
    return [key, { packet: packet?.replayClass ?? "UNKNOWN", latest: rows.filter(row => row.observationDate === expectedSession).map(row => row.replayClass), counts: rows.reduce((acc, row) => { const k = row.replayClass ?? "UNKNOWN"; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {}) }]; })),
  timing: { captureAndValidationNormalizationMs: preparationMs, calendarResolutionAndInputJsonMs: resolveMs, v2EngineMs: engineMs,
    acquisitionWallMs: Date.parse(acquisition.completedAt) - Date.parse(acquisition.startedAt), note: "Existing preparation combines validation and normalization; separate audited timings may be measured later without changing the engine." },
  bundleFile, bundleHash: hash(bundle), inputHash: hash(input), outputHash: hash(output), normalizationIssues: prepared.issues,
  sourceMetadata: prepared.captureMetadata, normalizedInputBytes: Buffer.byteLength(JSON.stringify(input)),
  realBytesOnly: true, syntheticInputsUsed: false, shadowActivated: false, productionChanged: false };
await writeFile(path.join(out, "normalized-input.json"), JSON.stringify(input) + "\n", { flag: "wx" });
await writeFile(path.join(out, "v2-output.json"), canonical(output) + "\n", { flag: "wx" });
await writeFile(path.join(out, "evaluation.json"), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
process.stdout.write(JSON.stringify({ asOf, expectedSession, gates, liveV2AdjudicableCapture: result.liveV2AdjudicableCapture,
  regime: output.regime, systemState: output.systemState, pillarStates: output.pillarStates, concordance: output.concordance,
  uncertainty: output.uncertainty, dataQuality: output.dataQuality, coreUnknowns, normalizedInputBytes: result.normalizedInputBytes,
  timing: result.timing, evaluationFile: path.join(out, "evaluation.json") }, null, 2) + "\n");
