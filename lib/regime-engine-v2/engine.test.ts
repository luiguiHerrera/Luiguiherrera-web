import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { fromP8 } from "../../scripts/regime-v2-conformance.mts";
import { C03, INITIAL_OPTIONALS, REGISTRY, TICKERS } from "./contract.ts";
import { evaluateCore } from "./core.ts";
import { evaluateRegime } from "./engine.ts";
import { bytesHash } from "./math.ts";
import { normalizeBtcTable, normalizeGldRows, normalizeMonthlyCatalog, normalizeVixCsv, normalizeVxHistory, normalizeYahoo, assembleVx } from "./normalize.ts";
import { resolveCalendar } from "./temporal.ts";
import { captureScope, persistCapture, readCapture } from "./capture.ts";
import { observeTransition, runShadow } from "./shadow.ts";
import type { Calendar, CoreInput, EngineInput, Packet, Temporal } from "./types.ts";
const p8 = fileURLToPath(new URL("../../docs/regime-engine-v2/p8/", import.meta.url));
const fixtures = JSON.parse(gunzipSync(readFileSync(path.join(p8, "raw-fixtures.json.gz"))).toString()).fixtures as { id: string; raw: unknown }[];
const hash = bytesHash("synthetic-provenance");
const meta: Temporal = { sourceVersion: "synthetic/1", capturedAt: "2025-03-31T21:30:00Z", availableAt: "2025-03-31T21:30:00Z", availabilityCertainty: "CONSERVATIVE_BOUND", replayClass: "R0", vintageHash: hash, status: "AVAILABLE" };
function fixture(id = "C03-broad"): EngineInput {
  const r = fromP8(fixtures.find(c => c.id === id)!.raw) as CoreInput;
  const calendar: Calendar = { ...meta, sourceId: "SYNTHETIC_CALENDAR_PROOF", id: "synthetic-official-contract-test", version: "1", kind: "OFFICIAL", timezone: "America/New_York", coverageStart: r.expectedSessions[0], coverageEnd: r.targetSession, completeIntervalCoverage: true, sessions: r.expectedSessions.map(session => ({ session, closedAt: session + "T21:00:00Z" })) };
  const withMeta = (packet: Packet, sourceId: string): Packet => ({ ...packet, ...meta, sourceId, declaredStart: r.expectedSessions[0] });
  return { mode: "R0", asOf: r.asOf, calendars: { equity: calendar, vix: structuredClone(calendar), vx: structuredClone(calendar), btc: structuredClone(calendar), gld: structuredClone(calendar) }, equity: Object.fromEntries(TICKERS.map(t => [t, withMeta(r.equity[t]!, "EQUITY_ADJUSTED")])), vix: withMeta(r.vix!, "VIX_OFFICIAL"), vx: { ...r.vx!, ...meta, sourceId: "VX_OFFICIAL" } };
}
function compact(input: EngineInput) { const r = evaluateRegime(input); return { regime: r.regime, pillars: r.pillarStates, concordance: r.concordance, uncertainty: r.uncertainty, rule: r.diagnostics.ruleId, units: r.diagnostics.dependencyContributions }; }
function rawFrame(input: EngineInput): CoreInput { const c = resolveCalendar(input.calendars.equity, input.asOf, input.mode); return { ...input, targetSession: c.target!, expectedSessions: c.sessions }; }
test("public C03 engine exposes qualitative dimensions, 59 roles and exactly two core units", () => {
  const result = evaluateRegime(fixture());
  assert.equal(result.regime, "RISK_ON_BROAD"); assert.equal(result.evidence.length, 59); assert.equal(result.diagnostics.coreFamilyCount, 2);
  assert.equal(result.dataQuality, "PARTIAL"); assert.equal(result.concordance, "HIGH"); assert.equal(result.uncertainty, "LOW");
  assert.equal(REGISTRY.filter(r => r.required).length, 16); assert.equal(REGISTRY.filter(r => r.role === "CORE_DECISION").length, 9);
  const keys = (v: unknown): string[] => v && typeof v === "object" ? Object.entries(v).flatMap(([k, x]) => [k, ...keys(x)]) : [];
  assert.ok(!keys(result).some(k => /score|confidence|probability|bullishness/i.test(k)));
  assert.equal(result.parameterSet, "C03"); assert.ok(Object.isFrozen(C03)); assert.ok(Object.isFrozen(result.evidence));
});
for (const [id, expected] of [["broad", "RISK_ON_BROAD"], ["selective", "RISK_ON_SELECTIVE"], ["transition", "TRANSITION"], ["defensive", "DEFENSIVE"], ["stress", "STRESS"], ["incomplete", null]] as const) test(`public raw witness ${id}`, () => { const r = evaluateRegime(fixture("C03-" + id)); assert.equal(r.regime, expected); assert.equal(r.systemState, expected ? "COMPLETE" : "INCOMPLETE"); });
for (const value of [null, undefined, NaN, Infinity, -1, 0, true]) test(`raw invalid price ${String(value)} stays missing`, () => { const input = fixture(); input.equity.XLK!.rows.at(-1)!.adjusted_close = value; const r = evaluateRegime(input); assert.equal(r.regime, null); assert.equal(r.dataQuality, "INSUFFICIENT"); assert.equal(r.pillarStates.participation, "UNAVAILABLE"); });
test("observed zero returns are adverse participation, not missing/neutral", () => { const input = fixture(); for (const p of Object.values(input.equity)) for (const r of p!.rows) r.adjusted_close = 100; const r = evaluateRegime(input); assert.equal(r.pillarStates.participation, "ADVERSE"); assert.equal(r.pillarStates.fragility, "UNAVAILABLE"); });
test("Yahoo requires native adjclose; close cannot fill it", () => {
  const native = { chart: { result: [{ meta: { symbol: "XLK", currency: "USD", exchangeTimezoneName: "America/New_York" }, timestamp: [1743454800], indicators: { quote: [{ close: [100] }] } }], error: null } };
  assert.equal(normalizeYahoo(JSON.stringify(native), meta, "XLK").rows[0].adjusted_close, null);
  const withAdjusted = structuredClone(native) as typeof native & { chart: { result: [{ indicators: { adjclose?: unknown } }] } };
  withAdjusted.chart.result[0].indicators.adjclose = [{ adjclose: [49] }];
  assert.equal(normalizeYahoo(JSON.stringify(withAdjusted), meta, "XLK").rows[0].adjusted_close, 49);
  assert.equal(normalizeYahoo(JSON.stringify(native), meta, "XLF").status, "INVALID");
});
test("mixed basis or currency cannot form a ratio/core price panel", () => { for (const key of ["priceBasis", "currency"] as const) { const input = fixture(); input.equity.XLK![key] = "WRONG"; assert.equal(evaluateRegime(input).regime, null); } });
test("Cboe VIX CLOSE and native VX Settle remain separate from equity/Close", () => {
  const v = normalizeVixCsv("DATE,OPEN,CLOSE\n03/31/2025,900,15\n", meta); assert.equal(v.rows[0].value, 15);
  const id = { symbol: "VX/J5", expirationDate: "2025-04-16" };
  const h = normalizeVxHistory("Trade Date,Close,Settle\n2025-03-31,999,20\n", id, meta); assert.equal(h.rows[0].settlement, 20);
  const h2 = normalizeVxHistory("Trade Date,Close\n2025-03-31,999\n", id, meta); assert.equal(h2.rows[0].settlement, null);
});
test("monthly catalog excludes weeklies and never promotes a missing near contract", () => {
  const catalog = normalizeMonthlyCatalog([{ duration_type: "M", futures_root: "VX", expire_date: "2025-04-16", product_display: "VX+VXT/J5" }, { duration_type: "M", futures_root: "VX", expire_date: "2025-05-21", product_display: "VX+VXT/K5" }, { duration_type: "W", futures_root: "VX", expire_date: "2025-04-09", product_display: "VX/J5" }]);
  assert.equal(catalog.length, 2);
  const h = normalizeVxHistory("Trade Date,Settle\n2025-03-31,22\n", catalog[1], meta);
  const vx = assembleVx("2025-03-31", catalog, meta, [h]); assert.equal(vx.contracts[0].settlement, null); assert.equal(vx.contracts[1].settlement, 22);
  const input = fixture(); input.vx = vx; assert.equal(evaluateRegime(input).regime, null);
});
for (const kind of ["missing", "late", "proxy", "partial", "expired"] as const) test(`calendar ${kind} yields honest unavailable`, () => {
  const input = fixture();
  if (kind === "missing") delete input.calendars.equity;
  else { const cal = input.calendars.equity!; if (kind === "late") cal.availableAt = "2030-01-01T00:00:00Z"; if (kind === "proxy") cal.kind = "R2_OBSERVED_PROXY"; if (kind === "partial") cal.completeIntervalCoverage = false; if (kind === "expired") cal.coverageEnd = "2025-01-01"; }
  const r = evaluateRegime(input); assert.equal(r.regime, null); assert.equal(r.sourceStatus.XLK.status, "UNKNOWN_CALENDAR");
});
test("calendar weekend, holiday, DST and early close use supplied sessions", () => {
  const cal = fixture().calendars.equity!; cal.coverageStart = "2026-03-01"; cal.coverageEnd = "2026-11-30";
  cal.sessions = [{ session: "2026-03-06", closedAt: "2026-03-06T21:00:00Z" }, { session: "2026-03-09", closedAt: "2026-03-09T20:00:00Z" }, { session: "2026-04-02", closedAt: "2026-04-02T20:00:00Z" }, { session: "2026-09-04", closedAt: "2026-09-04T20:00:00Z" }, { session: "2026-11-27", closedAt: "2026-11-27T18:00:00Z" }];
  for (const [cut, expected] of [["2026-03-09T19:59:59Z", "2026-03-06"], ["2026-03-09T20:00:00Z", "2026-03-09"], ["2026-04-03T21:00:00Z", "2026-04-02"], ["2026-09-06T21:00:00Z", "2026-09-04"], ["2026-09-07T21:00:00Z", "2026-09-04"], ["2026-11-27T18:01:00Z", "2026-11-27"]]) assert.equal(resolveCalendar(cal, cut, "R0").target, expected);
});
test("zero-session carry does not retreat to the latest available common source date", () => {
  const input = fixture(); const next = "2025-04-01"; input.asOf = next + "T22:00:00Z";
  for (const cal of Object.values(input.calendars)) { cal!.coverageEnd = next; cal!.sessions.push({ session: next, closedAt: next + "T21:00:00Z" }); }
  const r = evaluateRegime(input); assert.equal(r.observationDate, next); assert.equal(r.regime, null); assert.equal(r.sourceStatus.XLK.status, "STALE_OR_WRONG_SESSION");
});
test("availability before/equal/after, unknown and R2 origin are enforced", () => {
  for (const [cut, expected] of [["2025-03-31T21:29:59Z", null], ["2025-03-31T21:30:00Z", "RISK_ON_BROAD"], ["2025-03-31T21:30:01Z", "RISK_ON_BROAD"]] as const) { const input = fixture(); input.asOf = cut; assert.equal(evaluateRegime(input).regime, expected); }
  const input = fixture(); input.equity.XLK!.availabilityCertainty = "UNKNOWN"; assert.equal(evaluateRegime(input).regime, null);
  input.equity.XLK!.replayClass = "R2"; assert.equal(evaluateRegime(input).replayClass, "R2"); assert.equal(evaluateRegime(input).regime, null);
  input.mode = "R2"; assert.equal(evaluateRegime(input).regime, "RISK_ON_BROAD"); assert.equal(evaluateRegime(input).replayClass, "R2");
});
test("future rows cannot revise an earlier reading", () => {
  const input = fixture(), expected = compact(input); input.equity.XLK!.rows.push({ observationDate: "2030-01-01", adjusted_close: 1000000 });
  assert.deepEqual(compact(input), expected); assert.equal(evaluateRegime(input).sourceStatus.XLK.rejectedObservations.at(-1)?.reason, "FUTURE_OBSERVATION");
});
test("native BTC zero/missing, reported totals and incomplete sums stay distinct", () => {
  const packet = normalizeBtcTable({ columns: ["Date", "A", "B", "Total"], rows: [["31 Mar 2025", "0.0", "-", "0.0"]] }, meta);
  assert.deepEqual(packet.rows[0].funds, { A: 0, B: null }); assert.equal(packet.rows[0].total, 0); assert.equal(packet.rows[0].coverage, "PARTIAL");
  const missing = normalizeBtcTable({ columns: ["Date", "A", "B", "Total"], rows: [["31 Mar 2025", "1", "-", "-"]] }, meta); assert.equal(missing.rows[0].total, null);
});
test("GLD requires raw windows, monetary pressure is delta shares times latest NAV", () => {
  const input = fixture(); input.asOf = "2025-03-31T23:59:59.999999Z"; const sessions = input.calendars.gld!.sessions.map(r => r.session);
  const rows = sessions.slice(-20).map((date, i) => ({ date, nav: 300, sharesOutstanding: 100 + i, totalNetAssets: (100 + i) * 300 }));
  input.gld = normalizeGldRows(rows, meta);
  const e = evaluateRegime(input).evidence;
  assert.equal(e.find(f => f.featureId === "gld_pressure_usd_5")!.value, 1500);
  assert.equal(e.find(f => f.featureId === "gld_shares_change_20")!.value, null);
  assert.equal(e.find(f => f.featureId === "gld_pressure_usd_20")!.value, null);
  assert.equal(normalizeGldRows({ twentyDayShareChange: 99 }, meta).status, "INVALID");
  input.gld.unitEventDates = [sessions.at(-1)!]; assert.equal(evaluateRegime(input).evidence.find(f => f.featureId === "gld_shares_change_5")!.value, null);
});
test("21 true GLD rows enable the 20-session feature without presentation fallback", () => {
  const input = fixture(); input.asOf = "2025-03-31T23:59:59.999999Z"; input.gld = normalizeGldRows(input.calendars.gld!.sessions.slice(-21).map(({ session }, i) => ({ date: session, nav: 10, sharesOutstanding: 100 + i, totalNetAssets: 10 * (100 + i) })), meta);
  assert.equal(evaluateRegime(input).evidence.find(f => f.featureId === "gld_pressure_usd_20")!.value, 200);
});
for (const id of ["broad", "selective", "transition", "defensive", "stress"]) test(`satellite extremes leave every core dimension unchanged: ${id}`, () => {
  const input = fixture("C03-" + id); input.asOf = "2025-03-31T23:59:59.999999Z"; const expected = compact(input), dates = input.calendars.equity!.sessions.slice(-21).map(r => r.session);
  for (const direction of [-1, 0, 1]) {
    input.btc = normalizeBtcTable({ columns: ["Date", "A", "Total"], rows: dates.map(d => [d, String(direction * 1e9), String(direction * 1e9)]) }, meta);
    input.gld = normalizeGldRows(dates.map((date, i) => ({ date, nav: 300, sharesOutstanding: 1e9 + direction * i * 1e6, totalNetAssets: 300 * (1e9 + direction * i * 1e6) })), meta);
    assert.deepEqual(compact(input), expected);
    assert.equal(evaluateRegime(input).evidence.find(f => f.featureId === "btc_daily")!.value, direction * 1e9);
    assert.equal(evaluateRegime(input).evidence.find(f => f.featureId === "gld_pressure_usd_5")!.value, direction * 5e6 * 300);
  }
  input.btc!.status = "STALE"; input.gld!.status = "INVALID"; assert.deepEqual(compact(input), expected);
});
test("diagnostic/profile duplication never adds concordance units", () => {
  const input = fixture(), expected = compact(input); input.optionalFeatures = [...INITIAL_OPTIONALS, ...REGISTRY.filter(r => r.role === "DIAGNOSTIC").map(r => r.id), ...INITIAL_OPTIONALS];
  assert.deepEqual(compact(input), expected); assert.equal(evaluateRegime(input).diagnostics.coreFamilyCount, 2);
});
test("same input/version output and normalized row order are deterministic", () => {
  const input = fixture(); assert.deepEqual(evaluateRegime(input), evaluateRegime(structuredClone(input)));
  const first = evaluateRegime(input); for (const p of Object.values(input.equity)) p!.rows.reverse(); input.vix!.rows.reverse(); input.vx!.contracts.reverse();
  assert.deepEqual(evaluateRegime(input), first);
});
test("duplicate observations deduplicate identically, conflicts remain unavailable", () => {
  const input = fixture(), p = input.equity.XLK!; p.rows.push(structuredClone(p.rows.at(-1)!)); assert.equal(evaluateRegime(input).regime, "RISK_ON_BROAD");
  p.rows.at(-1)!.adjusted_close = 5; assert.equal(evaluateRegime(input).regime, null);
});
test("incomplete takes precedence over valid stress evidence", () => { const input = fixture("C03-stress"); delete input.equity.XLK; const r = evaluateRegime(input); assert.equal(r.pillarStates.volatility, "STRESS"); assert.equal(r.regime, null); assert.equal(r.diagnostics.ruleId, "R00"); });
test("new captures deduplicate requests, preserve R2 imports, and store immutable bytes", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "regime-capture-test-"));
  try {
    const scope = captureScope(); let calls = 0;
    const request = { sourceId: "VIX_OFFICIAL", sourceVersion: "1", sourceUrl: "https://cdn.cboe.com/test", origin: "PROSPECTIVE" as const };
    const fetch = async () => { calls++; return new TextEncoder().encode("raw original"); };
    const [a, b] = await Promise.all([scope.capture(request, fetch), scope.capture(request, fetch)]); assert.equal(calls, 1); assert.equal(a.captureId, b.captureId); assert.equal(a.metadata.replayClass, "R0"); assert.equal(a.metadata.availableAt, a.metadata.capturedAt);
    const filename = await persistCapture(directory, a); await persistCapture(directory, a); assert.deepEqual(await readCapture(filename), a);
    const later = await captureScope().capture({ ...request, origin: "R2_IMPORT" }, fetch); assert.equal(later.metadata.replayClass, "R2");
    const corrupt = JSON.parse(await readFile(filename, "utf8")); corrupt.rawBase64 = "Yg=="; await writeFile(filename, JSON.stringify(corrupt)); await assert.rejects(readCapture(filename), /Corrupt/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test("shadow preserves the exact V1 object on V2 failure, synchronous failure, or disablement", async () => {
  const v1 = Object.freeze({ regime_v1: "existing", score_v1: 74, confidence_v1: 82 });
  for (const load of [null, async () => { throw Error("source failed"); }, () => { throw Error("synchronous failed"); }]) { const result = await runShadow(async () => v1, load); assert.strictEqual(result.v1, v1); assert.equal(result.v2.value, null); }
  const ok = await runShadow(async () => v1, async () => fixture()); assert.strictEqual(ok.v1, v1); assert.equal(ok.v2.value?.regime, "RISK_ON_BROAD");
});
test("observability records regime/pillar/quality changes without feeding classification", () => {
  const firstInput = fixture(), first = evaluateRegime(firstInput), nextInput = fixture("C03-stress");
  const previous = { ...first, observationDate: firstInput.calendars.equity!.sessions.at(-2)!.session };
  const next = evaluateRegime(nextInput); const event = observeTransition(previous, next, 10);
  assert.deepEqual(event.regimeTransition, { from: "RISK_ON_BROAD", to: "STRESS" }); assert.equal(event.durationSessions, 1); assert.equal(evaluateRegime(nextInput).regime, "STRESS");
});
test("public C03 and internal kernel use identical numerical decisions on valid normalized input", () => { const input = fixture(); assert.deepEqual(evaluateRegime(input).pillarStates, evaluateCore(rawFrame(input)).pillarStates); });
test("sub-millisecond availability is not rounded into an earlier eligible cutoff", () => {
  const input = fixture(); input.asOf = "2025-03-31T21:30:00.000000Z";
  input.equity.XLK!.availableAt = "2025-03-31T21:30:00.000001Z";
  assert.equal(evaluateRegime(input).regime, null);
  input.asOf = "2025-03-31T21:30:00.000001Z"; assert.equal(evaluateRegime(input).regime, "RISK_ON_BROAD");
});
test("complete data can have LOW concordance and LOW uncertainty independently", () => {
  const input = fixture("C03-stress"); input.asOf = "2025-03-31T23:59:59.999999Z";
  input.vix!.declaredStart = input.vix!.rows[0].date;
  const dates = input.calendars.equity!.sessions.map(r => r.session);
  input.btc = normalizeBtcTable({ columns: ["Date", "A", "Total"], rows: dates.slice(-5).map(d => [d, "0", "0"]) }, meta);
  input.gld = normalizeGldRows(dates.slice(-21).map(date => ({ date, nav: 10, sharesOutstanding: 100, totalNetAssets: 1000 })), meta);
  const result = evaluateRegime(input);
  assert.equal(result.dataQuality, "COMPLETE"); assert.equal(result.concordance, "LOW"); assert.equal(result.uncertainty, "LOW"); assert.equal(result.regime, "STRESS");
});
test("calendar identity needs provenance, and a session cannot close before its own date", () => {
  const input = fixture(); delete input.calendars.equity!.vintageHash;
  assert.equal(evaluateRegime(input).regime, null);
  input.calendars.equity!.vintageHash = hash;
  input.calendars.equity!.sessions.at(-1)!.closedAt = "2025-01-01T21:00:00Z";
  assert.equal(evaluateRegime(input).diagnostics.calendarStatus.equity.reason, "UNKNOWN_CALENDAR");
});
test("observed duration extends adjacent sessions and preserves left censoring", () => {
  const input = fixture(), current = evaluateRegime(input), previous = { ...current, observationDate: input.calendars.equity!.sessions.at(-2)!.session };
  const known = observeTransition(previous, current, 5, false); assert.equal(known.durationSessions, 6); assert.equal(known.durationCensored, false);
  const bounded = observeTransition(previous, current); assert.equal(bounded.durationSessions, 2); assert.equal(bounded.durationCensored, true);
  const gap = observeTransition({ ...previous, observationDate: "2024-01-01" }, current, 5, false); assert.equal(gap.durationSessions, 1); assert.equal(gap.durationCensored, true);
});
