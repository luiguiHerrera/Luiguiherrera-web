/** Offline acceptance only. Never imported by the production engine. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { C03, CONTRACT_HASHES, REGISTRY, TICKERS } from "../lib/regime-engine-v2/contract.ts";
import { evaluateCore } from "../lib/regime-engine-v2/core.ts";
import { evaluateRegime } from "../lib/regime-engine-v2/engine.ts";
import { bytesHash } from "../lib/regime-engine-v2/math.ts";
import { normalizeYahoo, normalizeVixCsv, normalizeMonthlyCatalog, normalizeVxHistory, assembleVx } from "../lib/regime-engine-v2/normalize.ts";
import type { Calendar, CoreInput, CoreFeatures, EngineInput, NumericParameters, Packet, Temporal } from "../lib/regime-engine-v2/types.ts";
const root = fileURLToPath(new URL("../", import.meta.url));
const p8 = path.join(root, "docs/regime-engine-v2/p8");
// Audit reruns preserve the original Builder delivery bytes by choosing a destination.
const outputFlag = process.argv.indexOf("--output-dir");
if (outputFlag >= 0 && !process.argv[outputFlag + 1]) throw new Error("--output-dir requires a directory");
const builder = outputFlag >= 0 ? path.resolve(process.argv[outputFlag + 1]) : path.join(root, "docs/regime-engine-v2/builder");
const json = (name: string) => JSON.parse(readFileSync(path.join(p8, name), "utf8"));
const metadataKeys: Record<string, string> = { as_of: "asOf", target_session: "targetSession", expected_sessions: "expectedSessions", price_basis: "priceBasis", series_type: "seriesType", observation_date: "observationDate", observation_end_at: "observationEndAt", available_at: "availableAt", captured_at: "capturedAt", source_published_at: "sourcePublishedAt", availability_certainty: "availabilityCertainty", expiration_date: "expirationDate", expected_contracts: "expectedContracts" };
export function fromP8(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(fromP8);
  return value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, v]) => [metadataKeys[key] ?? key, fromP8(v)])) : value;
}
export function compare(actual: unknown, expected: unknown, label = "root") {
  if (typeof expected === "number") { assert.equal(typeof actual, "number", label); assert.ok(Number.isFinite(actual) && Math.abs((actual as number) - expected) <= 1e-10, `${label}: ${actual} != ${expected}`); return; }
  if (expected === null || typeof expected !== "object") { assert.equal(actual, expected, label); return; }
  assert.ok(actual !== null && typeof actual === "object", label);
  assert.deepEqual(Object.keys(actual!).sort(), Object.keys(expected).sort(), label + " keys");
  for (const [key, value] of Object.entries(expected)) compare((actual as Record<string, unknown>)[key], value, `${label}.${key}`);
}
function projection(result: ReturnType<typeof evaluateCore>, mode: string) {
  return { regime: result.regime, reading_status: result.systemState, rule_id: result.ruleId, pillar_states: result.pillarStates, concordance: result.concordance, uncertainty: result.uncertainty, plausible_regimes: result.plausibleRegimes, family_descriptors: result.dependencyUnits, core_family_count: result.coreFamilyCount, features: result.features, missing_reasons: result.missingReasons, replay_class: mode };
}
function loadSource(name: string): { bytes: string; meta: Temporal } {
  const m = json(`evidence/${name}.metadata.json`), bytes = gunzipSync(readFileSync(path.join(p8, `evidence/${name}.gz`))).toString("utf8");
  assert.equal(bytesHash(bytes), m.raw_sha256);
  return { bytes, meta: { sourceVersion: "p8-source-contract/1.0.0", capturedAt: m.captured_at, availableAt: m.available_at, availabilityCertainty: "CONSERVATIVE_BOUND", sourcePublishedAt: null, vintageHash: m.raw_sha256, replayClass: "R2", status: "AVAILABLE" } };
}
function main() {
  mkdirSync(builder, { recursive: true });
  for (const [name, expected] of Object.entries(CONTRACT_HASHES)) assert.equal(bytesHash(readFileSync(path.join(p8, name), "utf8")), expected);
  assert.deepEqual(C03, json("parameter-manifest.json").scalar_thresholds);
  const qualified = json("feature-registry-qualified.json").features as { feature_id: string; minimization: { primary_role: string; data_kind: string; required_transitive_core_input: boolean } }[];
  assert.deepEqual(REGISTRY.map(r => [r.id, r.role, r.kind, r.required]), qualified.map(r => [r.feature_id, r.minimization.primary_role, r.minimization.data_kind, r.minimization.required_transitive_core_input]));
  const fixtures = JSON.parse(gunzipSync(readFileSync(path.join(p8, "raw-fixtures.json.gz"))).toString()).fixtures as { id: string; category: string; raw: unknown; parameters: NumericParameters }[];
  const frozen = json("raw-check-results.json").results as { output: unknown }[];
  let c03Cases = 0;
  for (let i = 0; i < fixtures.length; i++) {
    const c = fixtures[i], raw = fromP8(c.raw) as CoreInput;
    const result = evaluateCore(raw, c.parameters);
    compare(projection(result, raw.mode), frozen[i].output, c.id);
    if (JSON.stringify(c.parameters) === JSON.stringify(C03)) { compare(projection(evaluateCore(raw), raw.mode), frozen[i].output, c.id + "-fixed-C03"); c03Cases++; }
  }
  // Expand outputs from the unchanged executable P8 oracle into Builder evidence.
  // No P8 file is written and no parameter selection/qualification is executed.
  const python = spawnSync("python3", ["-c", `import sys,json\nsys.path.insert(0,sys.argv[1])\nfrom reference_model import classify_features\nfrom pathlib import Path\np=Path(sys.argv[1])\nf=json.loads((p/'historical-features-r2.json').read_text())['rows']\nparams=json.loads((p/'parameter-manifest.json').read_text())['scalar_thresholds']\nprint(json.dumps([{'date':r['date'],'features':r['features'],'missingReasons':r['missing_reasons'],'output':classify_features(r['features'],params)} for r in f]))`, p8], { encoding: "utf8", maxBuffer: 20_000_000, env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } });
  assert.equal(python.status, 0, python.stderr);
  const oracle = JSON.parse(python.stdout) as { date: string; features: CoreFeatures; missingReasons: string[]; output: { regime: string; pillar_states: unknown; rule_id: string; reading_status: string } }[];
  const equity: Record<string, Packet> = {};
  for (const ticker of [...TICKERS, "SPY"]) { const s = loadSource(`yahoo-${ticker}.json`); equity[ticker] = normalizeYahoo(s.bytes, s.meta, ticker); }
  const vs = loadSource("vix-history.csv"), vix = normalizeVixCsv(vs.bytes, vs.meta);
  const cs = loadSource("cfe-contract-index.json"), catalog = normalizeMonthlyCatalog(json("evidence/selected-contracts.json"));
  const histories = catalog.map(identity => { const s = loadSource(`vx-${identity.expirationDate}.csv`); return normalizeVxHistory(s.bytes, identity, s.meta); });
  const calendar = equity.SPY.rows.map(r => r.observationDate!).filter(d => d <= "2026-09-04").sort();
  const byDate = Object.fromEntries(Object.entries(equity).map(([ticker, packet]) => [ticker, new Map(packet.rows.map(row => [row.observationDate!, row]))]));
  const vixByDate = new Map(vix.rows.map(r => [r.observationDate!, r]));
  const outputs: unknown[] = [];
  let shadowInput: EngineInput | undefined;
  for (const expected of oracle) {
    const index = calendar.indexOf(expected.date), sessions = calendar.slice(Math.max(0, index - 63), index + 1);
    const frameEquity = Object.fromEntries(TICKERS.map(t => [t, { ...equity[t], rows: sessions.map(d => byDate[t].get(d)).filter(r => r !== undefined) }]));
    const raw: CoreInput = { mode: "R2", asOf: expected.date + "T23:59:59.999999Z", targetSession: expected.date, expectedSessions: sessions, equity: frameEquity, vix: { ...vix, rows: sessions.slice(-6).map(d => vixByDate.get(d)).filter(r => r !== undefined) }, vx: assembleVx(expected.date, catalog, cs.meta, histories) };
    const result = evaluateCore(raw);
    compare(result.features, expected.features, expected.date + ".features"); assert.deepEqual(result.missingReasons, expected.missingReasons);
    assert.deepEqual(result.pillarStates, expected.output.pillar_states); assert.equal(result.regime, expected.output.regime); assert.equal(result.ruleId, expected.output.rule_id);
    const cal: Calendar = { id: "P8_SPY_OBSERVED_PROXY", version: "p8-r2/1", kind: "R2_OBSERVED_PROXY", timezone: "America/New_York", replayClass: "R2", availabilityCertainty: "UNKNOWN", coverageStart: sessions[0], coverageEnd: expected.date, completeIntervalCoverage: true, sessions: sessions.map(session => ({ session, closedAt: session + "T23:59:59.999999Z" })) };
    shadowInput = { mode: "R2", asOf: raw.asOf, equity: raw.equity, vix: raw.vix, vx: raw.vx, calendars: { equity: cal, vix: cal, vx: cal } };
    const engine = evaluateRegime(shadowInput);
    compare(engine.diagnostics.coreFeatures, expected.features, expected.date + ".production.features"); assert.deepEqual(engine.pillarStates, expected.output.pillar_states); assert.equal(engine.regime, expected.output.regime); assert.equal(engine.replayClass, "R2");
    assert.equal(engine.concordance, (expected.output as unknown as { concordance: string }).concordance); assert.equal(engine.uncertainty, (expected.output as unknown as { uncertainty: string }).uncertainty);
    outputs.push({ date: expected.date, regime: result.regime, pillarStates: result.pillarStates, ruleId: result.ruleId, replayClass: "R2", dataQuality: engine.dataQuality, inputHash: engine.diagnostics.inputHash });
  }
  const witnessDates = { DEFENSIVE: "2019-01-02", TRANSITION: "2019-01-04", RISK_ON_BROAD: "2019-01-30", RISK_ON_SELECTIVE: "2019-02-25", STRESS: "2020-02-25" };
  for (const [state, date] of Object.entries(witnessDates)) assert.equal(oracle.find(r => r.date === date)?.output.regime, state);
  const report = { status: "PASS", scope: "P8_ORACLE_CONFORMANCE_R2_NOT_PIT_OOS", goldenPassed: fixtures.length, goldenTotal: fixtures.length, fixedC03GoldenCases: c03Cases, otherParametersScope: "Internal numeric kernel with the unchanged frozen fixture parameters; public engine has no parameter override", historicalPassed: oracle.length, historicalTotal: oracle.length, publicC03HistoricalPassed: outputs.length, historicalWitnesses: witnessDates, numericAbsoluteTolerance: 1e-10, contractHashes: CONTRACT_HASHES, oracleExpandedFromFrozenCode: true, frozenOracleFilesModified: false };
  writeFileSync(path.join(builder, "conformance.json"), JSON.stringify(report, null, 2) + "\n");
  writeFileSync(path.join(builder, "historical-r2-output.json"), JSON.stringify(outputs, null, 2) + "\n");
  writeFileSync(path.join(builder, "shadow-input-r2.json"), JSON.stringify(shadowInput, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
