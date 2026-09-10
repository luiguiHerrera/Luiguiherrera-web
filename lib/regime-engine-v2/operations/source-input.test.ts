import assert from "node:assert/strict";
import test from "node:test";
import type { CaptureRecord } from "../capture.ts";
import { evaluateRegime } from "../engine.ts";
import { TICKERS } from "../contract.ts";
import { bytesHash, hash } from "../math.ts";
import { resolveCalendar } from "../temporal.ts";
import type { Calendar } from "../types.ts";
import { prepareSourceInput, prepareSourceVintage, resolveSourceVintage, SOURCE_BUNDLE_VERSION, SOURCE_LIMITS, SourceBundleError } from "./source-input.ts";
import type { CalendarPacket, SourceBundle, SourceCapture } from "./source-input.ts";
import { createSnapshot, replaySnapshot } from "./snapshot.ts";
import { withDashboardShadow } from "./dashboard-shadow.ts";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { EngineInput } from "../types.ts";

// Entirely synthetic raw bytes and capture times. OFFICIAL below tests the
// governed packet format, and does not claim these fixtures are exchange data.
function capture(bytes: string, sourceId: string, sourceUrl: string, completedAt = "2026-11-27T19:00:00Z", origin: CaptureRecord["origin"] = "PROSPECTIVE"): CaptureRecord {
  const sourceVersion = "synthetic-maintainer-fixture/1", rawHash = bytesHash(bytes);
  const body = { sourceId, sourceVersion, sourceUrl, startedAt: completedAt, completedAt, rawHash, rawBase64: Buffer.from(bytes).toString("base64"), origin,
    metadata: { sourceId, sourceVersion, vintageHash: rawHash, sourcePublishedAt: null, capturedAt: completedAt, availableAt: completedAt,
      availabilityCertainty: "CONSERVATIVE_BOUND" as const, availabilityEvidence: "SYNTHETIC_TEST_CAPTURE", replayClass: origin === "R2_IMPORT" ? "R2" as const : "R0" as const, status: "AVAILABLE" } };
  return { ...body, captureId: hash(body) };
}
function calendar(sessions = [{ session: "2026-11-25", closedAt: "2026-11-25T21:00:00Z" }, { session: "2026-11-27", closedAt: "2026-11-27T18:00:00Z" }, { session: "2026-11-30", closedAt: "2026-11-30T21:00:00Z" }]): CalendarPacket {
  const c = capture("SYNTHETIC calendar schedule for format tests only", "SYNTHETIC_CALENDAR", "https://www.nyse.com/trade/hours-calendars", "2026-01-01T00:00:00Z");
  const cal: Calendar = { ...c.metadata, id: "SYNTHETIC_OFFICIAL_FORMAT_FIXTURE", version: "fixture/1", timezone: "America/New_York", kind: "OFFICIAL",
    coverageStart: sessions[0].session, coverageEnd: sessions.at(-1)!.session, completeIntervalCoverage: true, sessions };
  return { calendar: cal, capture: c, transformVersion: "synthetic-manual-transcription/1", calendarHash: hash(cal) };
}
function bundle(captures: SourceCapture[] = [], mode: SourceBundle["mode"] = "R0"): SourceBundle {
  const c = calendar(); return { schemaVersion: SOURCE_BUNDLE_VERSION, mode, captures, calendars: { equity: c, vix: c, vx: c, btc: c, gld: c } };
}
function yahoo(dates = ["2026-11-25", "2026-11-27"], values: (number | null)[] = [100, 103], adjclose = true): SourceCapture {
  const payload = { chart: { result: [{ meta: { symbol: "XLK", currency: "USD", exchangeTimezoneName: "America/New_York" }, timestamp: dates.map(d => Date.parse(d + "T15:00:00Z") / 1000), indicators: adjclose ? { adjclose: [{ adjclose: values }], quote: [{ close: [100, 103] }] } : { quote: [{ close: values }] } }], error: null } };
  return { kind: "YAHOO_ADJCLOSE", ticker: "XLK", capture: capture(JSON.stringify(payload), "EQUITY_ADJUSTED", "https://query1.finance.yahoo.com/v8/finance/chart/XLK") };
}
function vix(date = "11/27/2026"): SourceCapture {
  return { kind: "CBOE_VIX_CSV", capture: capture(`DATE,OPEN,HIGH,LOW,CLOSE\n${date},20,21,19,20\n`, "VIX_OFFICIAL", "https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv") };
}
const cut = "2026-11-27T20:00:00Z";

test("calendar uses explicit DST close instants, with no fixed UTC closing hour", () => {
  const c = calendar([{ session: "2026-03-06", closedAt: "2026-03-06T21:00:00Z" }, { session: "2026-03-09", closedAt: "2026-03-09T20:00:00Z" }]);
  assert.equal(resolveCalendar(c.calendar, "2026-03-09T19:59:59Z", "R0").target, "2026-03-06");
  assert.equal(resolveCalendar(c.calendar, "2026-03-09T20:00:00Z", "R0").target, "2026-03-09");
});
test("holiday and early close are resolved from declared source sessions", () => {
  const c = calendar().calendar;
  assert.equal(resolveCalendar(c, "2026-11-26T22:00:00Z", "R0").target, "2026-11-25");
  assert.equal(resolveCalendar(c, "2026-11-27T17:59:59Z", "R0").target, "2026-11-25");
  assert.equal(resolveCalendar(c, "2026-11-27T18:00:00Z", "R0").target, "2026-11-27");
});
test("missing calendar remains UNKNOWN_CALENDAR and INCOMPLETE", () => {
  const b = bundle([vix()]); b.calendars = {};
  const prepared = prepareSourceInput(b, cut), output = evaluateRegime(prepared.input);
  assert.equal(output.systemState, "INCOMPLETE");
  assert.equal(output.sourceStatus.VIX.status, "UNKNOWN_CALENDAR");
  assert.equal(prepared.input.vix?.rows[0].replayClass, "R2");
});
test("prospective mode rejects an observed-SPY proxy calendar", () => {
  const b = bundle([vix()]); b.calendars.vix!.calendar.kind = "R2_OBSERVED_PROXY";
  b.calendars.vix!.calendarHash = hash(b.calendars.vix!.calendar);
  const p = prepareSourceInput(b, cut);
  assert.equal(evaluateRegime(p.input).sourceStatus.VIX.status, "UNKNOWN_CALENDAR");
});
test("a calendar revision captured after the cut is unavailable", () => {
  const b = bundle(); const c = b.calendars.equity!;
  const replacement = capture("SYNTHETIC future calendar", c.capture.sourceId, c.capture.sourceUrl, "2026-11-28T00:00:00Z");
  c.capture = replacement; c.calendar = { ...c.calendar, ...replacement.metadata }; c.calendarHash = hash(c.calendar);
  assert.equal(prepareSourceInput(b, cut).sourceStatus.calendarStatus.equity.reason, "UNKNOWN_CALENDAR");
});
test("a fresh capture does not upgrade its older historical rows", () => {
  const p = prepareSourceInput(bundle([yahoo()]), cut), rows = p.input.equity.XLK!.rows;
  assert.deepEqual(rows.map(row => row.replayClass), ["R2", "R0"]);
  assert.equal(p.input.equity.XLK!.replayClass, "R2");
  assert.equal(evaluateRegime(p.input).sourceStatus.XLK.status, "TEMPORALLY_INELIGIBLE");
  assert.ok(p.issues.includes("R2_HISTORY_RETAINED_NO_RETROACTIVE_UPGRADE"));
});
test("explicit contemporaneous row selection uses capture bound, never publication fiction", () => {
  const e = yahoo(); e.observationDates = ["2026-11-27"];
  const p = prepareSourceInput(bundle([e]), cut), row = p.input.equity.XLK!.rows[0];
  assert.equal(row.replayClass, "R0"); assert.equal(row.availableAt, e.capture.completedAt);
  assert.equal(row.sourcePublishedAt, null); assert.equal(row.observationEndAt, "2026-11-27T18:00:00Z");
  assert.equal(evaluateRegime(p.input).sourceStatus.XLK.status, "AVAILABLE");
});
test("R2_IMPORT stays R2 even when its date is the current closed session", () => {
  const e = vix(), c = e.capture;
  e.capture = capture(Buffer.from(c.rawBase64, "base64").toString("utf8"), c.sourceId, c.sourceUrl, c.completedAt, "R2_IMPORT");
  const p = prepareSourceInput(bundle([e]), cut);
  assert.equal(p.input.vix!.replayClass, "R2");
  assert.equal(p.input.vix!.rows[0].replayClass, "R2");
});
test("historical bundle mode remains R2 despite a contemporaneous source parent", () => {
  const p = prepareSourceInput(bundle([vix()], "R2"), cut);
  assert.equal(p.input.mode, "R2"); assert.notEqual(evaluateRegime(p.input).replayClass, "R0");
});
test("missing adjclose never falls back to Yahoo quote.close", () => {
  const p = prepareSourceInput(bundle([yahoo(undefined, undefined, false)], "R2"), cut);
  assert.ok(p.input.equity.XLK!.rows.every(row => row.adjusted_close === null));
  assert.equal(evaluateRegime(p.input).sourceStatus.XLK.status, "MISALIGNED_ADJCLOSE_ARRAY");
});
test("stale VIX is stale after the newly closed expected session", () => {
  const p = prepareSourceInput(bundle([vix("11/25/2026")], "R2"), cut);
  assert.equal(evaluateRegime(p.input).sourceStatus.VIX.status, "STALE_OR_WRONG_SESSION");
});
test("missing nearest VX cannot promote a later monthly contract", () => {
  const catalog: SourceCapture = { kind: "CFE_MONTHLY_CATALOG", capture: capture(JSON.stringify([
    { duration_type: "M", futures_root: "VX", expire_date: "2026-12-16", product_display: "VX/Z6" },
    { duration_type: "M", futures_root: "VX", expire_date: "2027-01-20", product_display: "VX/F7" }]), "VX_OFFICIAL", "https://www-api.cboe.com/us/futures/market_statistics/historical_data/product/list/VX/") };
  const distant: SourceCapture = { kind: "CFE_MONTHLY_CSV", identity: { symbol: "VX/F7", expirationDate: "2027-01-20" }, capture: capture("Trade Date,Futures,Close,Settle\n2026-11-27,F (Jan 2027),999,22\n", "VX_OFFICIAL", "https://cdn.cboe.com/data/us/futures/market_statistics/historical_data/VX/VX_2027-01-20.csv") };
  const p = prepareSourceInput(bundle([catalog, distant], "R2"), cut);
  assert.equal(p.input.vx!.expectedContracts[0].symbol, "VX/Z6"); assert.equal(p.input.vx!.contracts[0].settlement, null);
  assert.equal(p.input.vx!.contracts[1].settlement, 22);
  assert.equal(evaluateRegime(p.input).pillarStates.volatility, "UNAVAILABLE");
});
test("tampered raw bytes are rejected before normalization", () => {
  const b = bundle([vix()]); b.captures[0].capture.rawBase64 = Buffer.from("changed").toString("base64");
  assert.throws(() => prepareSourceInput(b, cut), SourceBundleError);
});
test("tampered normalized calendar is rejected by its normalization hash", () => {
  const b = bundle(); b.calendars.equity!.calendar.sessions[0].closedAt = "2026-11-25T00:00:00Z";
  assert.throws(() => prepareSourceInput(b, cut), /calendar normalization hash mismatch/);
});
test("FRED VIX endpoint cannot substitute for Cboe official daily source", () => {
  const e = vix(); e.capture = capture("DATE,CLOSE\n11/27/2026,20", "VIX_OFFICIAL", "https://fred.stlouisfed.org/graph/?id=VIXCLS");
  assert.throws(() => prepareSourceInput(bundle([e]), cut), /source identity\/endpoint/);
});
test("malformed bundle produces a governed typed failure", () => {
  assert.throws(() => prepareSourceInput({ schemaVersion: SOURCE_BUNDLE_VERSION, mode: "R0", captures: "not an array", calendars: {} }, cut), SourceBundleError);
});
test("executable getters do not run at raw boundary", () => {
  let touched = false; const b = { get captures() { touched = true; return []; } };
  assert.throws(() => prepareSourceInput(b, cut), SourceBundleError); assert.equal(touched, false);
});
test("excessive capture count is rejected with no history truncation", () => {
  const b = bundle(); b.captures = Array.from({ length: SOURCE_LIMITS.captures + 1 }, () => vix());
  assert.throws(() => prepareSourceInput(b, cut), /bounded capture list/);
});
test("captured bundle deterministically replays identical normalized input and complete output", () => {
  const b = bundle([vix(), yahoo()], "R2"), before = JSON.stringify(b);
  const first = prepareSourceInput(b, cut), second = prepareSourceInput(JSON.parse(before), cut);
  assert.deepEqual(first, second); assert.deepEqual(evaluateRegime(first.input), evaluateRegime(second.input));
  assert.equal(JSON.stringify(b), before);
});
test("native parsed JSON without upstream bytes is rejected", () => {
  const e: SourceCapture = { kind: "BTC_NATIVE_TABLE_JSON", capture: capture('{"columns":["Date","IBIT","Total"],"rows":[["2026-11-27",0,0]]}', "BTC_NATIVE", "https://farside.co.uk/btc/") };
  assert.throws(() => prepareSourceInput(bundle([e]), cut), /upstream raw capture/);
});
test("native reported zero and GLD shares/NAV remain contextual with raw extraction ancestry", () => {
  const btcJson = '{"columns":["Date","IBIT","Total"],"rows":[["2026-11-27",0,0]]}', btcUrl = "https://farside.co.uk/btc/";
  const gldJson = '[{"date":"2026-11-25","shares outstanding":100,"nav":10,"total net assets":1000},{"date":"2026-11-27","shares outstanding":102,"nav":11,"total net assets":1122}]', gldUrl = "https://www.spdrgoldshares.com/usa/historical-data/";
  const entries: SourceCapture[] = [
    { kind: "BTC_NATIVE_TABLE_JSON", capture: capture(btcJson, "BTC_NATIVE", btcUrl), upstreamCapture: capture("SYNTHETIC HTML source table with reported zero", "BTC_NATIVE", btcUrl), transformVersion: "synthetic-table-extraction/1" },
    { kind: "GLD_NATIVE_ROWS_JSON", capture: capture(gldJson, "GLD_NATIVE", gldUrl), upstreamCapture: capture("SYNTHETIC native fund table shares NAV AUM", "GLD_NATIVE", gldUrl), transformVersion: "synthetic-table-extraction/1" },
  ];
  const prepared = prepareSourceInput(bundle(entries, "R2"), cut), output = evaluateRegime(prepared.input);
  assert.equal(prepared.input.btc!.rows[0].total, 0);
  assert.equal(output.evidence.find(e => e.featureId === "btc_daily")!.value, 0);
  assert.equal(output.evidence.find(e => e.featureId === "gld_pressure_usd_1")!.value, 22);
  assert.equal(output.evidence.find(e => e.featureId === "gld_pressure_usd_20")!.status, "UNAVAILABLE");
  assert.equal(output.regime, null); assert.equal(output.systemState, "INCOMPLETE");
  assert.ok(prepared.captureMetadata.captures.some(c => c.rawHash === entries[0].upstreamCapture!.rawHash));
});
test("a retained normalized vintage resolves every new cut with fresh calendars and identical uncached output", () => {
  const b = bundle([vix(), yahoo()], "R2"), prepared = prepareSourceVintage(b);
  const cuts = ["2026-11-27T17:59:59Z", "2026-11-27T20:00:00Z", "2026-11-30T22:00:00Z", "2026-12-01T22:00:00Z"];
  const results = cuts.map(asOf => resolveSourceVintage(prepared, asOf));
  for (const [index, result] of results.entries()) {
    assert.deepEqual(result, prepareSourceInput(b, cuts[index]));
    assert.equal(result.input.asOf, cuts[index]); assert.equal(result.captureMetadata.asOf, cuts[index]);
    assert.deepEqual(evaluateRegime(result.input), evaluateRegime(prepareSourceInput(b, cuts[index]).input));
    assert.equal(result.input.equity, prepared.inputBase.equity);
  }
  assert.equal(results[0].sourceStatus.calendarStatus.equity.target, "2026-11-25");
  assert.equal(results[1].sourceStatus.calendarStatus.equity.target, "2026-11-27");
  assert.equal(evaluateRegime(results[1].input).sourceStatus.VIX.status, "AVAILABLE");
  assert.equal(evaluateRegime(results[2].input).sourceStatus.VIX.status, "STALE_OR_WRONG_SESSION");
  assert.equal(results[3].sourceStatus.calendarStatus.equity.reason, "UNKNOWN_CALENDAR");
  assert.equal(results[1].input.asOf, cuts[1]);
});
test("same cached vintage reassembles VX observation date and maturity slots across expiry", () => {
  const identities = [
    { symbol: "VX/X6", expirationDate: "2026-11-27", label: "X (Nov 2026)", old: 15, current: 16 },
    { symbol: "VX/Z6", expirationDate: "2026-12-16", label: "Z (Dec 2026)", old: 17, current: 18 },
    { symbol: "VX/F7", expirationDate: "2027-01-20", label: "F (Jan 2027)", old: 19, current: 20 },
  ];
  const b = bundle([], "R2");
  b.captures.push({ kind: "CFE_MONTHLY_CATALOG", capture: capture(JSON.stringify(identities.map(i => ({ duration_type: "M", futures_root: "VX", expire_date: i.expirationDate, product_display: i.symbol }))), "VX_OFFICIAL", "https://www-api.cboe.com/us/futures/market_statistics/historical_data/product/list/VX/") });
  for (const i of identities) b.captures.push({ kind: "CFE_MONTHLY_CSV", identity: { symbol: i.symbol, expirationDate: i.expirationDate }, capture: capture(`Trade Date,Futures,Settle\n2026-11-25,${i.label},${i.old}\n2026-11-27,${i.label},${i.current}\n`, "VX_OFFICIAL", `https://cdn.cboe.com/data/us/futures/market_statistics/historical_data/VX/VX_${i.expirationDate}.csv`) });
  const vintage = prepareSourceVintage(b), before = resolveSourceVintage(vintage, "2026-11-25T23:00:00Z"), after = resolveSourceVintage(vintage, "2026-11-27T23:00:00Z");
  assert.equal(before.input.vx!.contracts[0].symbol, "VX/X6"); assert.equal(before.input.vx!.contracts[0].settlement, 15);
  assert.equal(after.input.vx!.contracts[0].symbol, "VX/Z6"); assert.equal(after.input.vx!.contracts[0].settlement, 18);
  assert.equal(after.input.vx!.observationDate, "2026-11-27");
  assert.deepEqual(after, prepareSourceInput(b, "2026-11-27T23:00:00Z"));
  assert.equal(before.input.vx!.observationDate, "2026-11-25");
});
test("the vintage cache invalidates on changed source version, changed raw vintage and a return to older bytes", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "regime-vintage-cache-"));
  const filename = path.join(directory, "source.json"), b = bundle([vix(), yahoo()], "R2");
  const publicV1 = { regimeSummary: { current: "SYNTHETIC_UNCHANGED", regimeScore: 50, confidence: 60 } };
  let observedInput: EngineInput | undefined;
  const invoke = async (sourceBundle: SourceBundle, asOf: string) => {
    await writeFile(filename, JSON.stringify(sourceBundle));
    await withDashboardShadow(async () => publicV1, { enabled: true, directory, inputFile: filename, now: () => asOf,
      evaluate: input => { observedInput = input; return evaluateRegime(input); }, onDiagnostic: () => {} });
    assert.deepEqual(observedInput, prepareSourceInput(sourceBundle, asOf).input);
    const id = (await readFile(path.join(directory, "latest.txt"), "utf8")).trim();
    return JSON.parse(await readFile(path.join(directory, "snapshots", id + ".json"), "utf8"));
  };
  try {
    await invoke(b, "2026-11-27T20:00:00Z"); const firstRows = observedInput!.equity.XLK!.rows;
    await invoke(b, "2026-11-27T20:00:01Z"); assert.equal(observedInput!.equity.XLK!.rows, firstRows);
    const changedVersion = structuredClone(b), c = changedVersion.captures[0].capture;
    c.sourceVersion = "synthetic-maintainer-fixture/2"; c.metadata.sourceVersion = c.sourceVersion;
    const { captureId: oldId, ...body } = c; assert.ok(oldId); c.captureId = hash(body);
    await invoke(changedVersion, "2026-11-27T20:00:02Z");
    assert.notEqual(observedInput!.equity.XLK!.rows, firstRows);
    assert.equal(observedInput!.vix!.sourceVersion, "synthetic-maintainer-fixture/2");
    const changedRaw = structuredClone(b); changedRaw.captures[0].capture = capture("DATE,CLOSE\n11/27/2026,35\n", "VIX_OFFICIAL", "https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv");
    const latest = await invoke(changedRaw, "2026-11-27T20:00:03Z");
    assert.equal(observedInput!.vix!.rows[0].value, 35); assert.equal(latest.v2.asOf, "2026-11-27T20:00:03Z");
    const metadata = latest.captureMetadata.sourceInput;
    assert.equal(metadata.asOf, "2026-11-27T20:00:03Z"); assert.equal(metadata.bundleHash, hash(changedRaw));
    await invoke(b, "2026-11-30T22:00:00Z");
    assert.equal(observedInput!.vix!.rows[0].value, 20);
    assert.equal(evaluateRegime(observedInput).sourceStatus.VIX.status, "STALE_OR_WRONG_SESSION");
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test("per-session prospective vintages accumulate a complete R0 window and replay through the snapshot schema", () => {
  // Artificial consecutive-day exchange, explicit fixture schedule only. This
  // is not a weekday generator or a production source calendar.
  const dates = Array.from({ length: 64 }, (_, i) => new Date(Date.UTC(2026, 5, i + 1)).toISOString().slice(0, 10));
  const cal = calendar(dates.map(session => ({ session, closedAt: session + "T20:00:00Z" })));
  const b = bundle(); b.calendars = { equity: cal, vix: cal, vx: cal, btc: cal, gld: cal };
  for (const [tickerIndex, ticker] of TICKERS.entries()) for (const [index, date] of dates.entries()) {
    const value = 100 + index * 0.1 + Math.sin(index * 0.7 + tickerIndex) * 0.5;
    const payload = { chart: { result: [{ meta: { symbol: ticker, currency: "USD", exchangeTimezoneName: "America/New_York" }, timestamp: [Date.parse(date + "T15:00:00Z") / 1000], indicators: { adjclose: [{ adjclose: [value] }] } }], error: null } };
    b.captures.push({ kind: "YAHOO_ADJCLOSE", ticker, observationDates: [date], capture: capture(JSON.stringify(payload), "EQUITY_ADJUSTED", `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`, date + "T22:00:00Z") });
  }
  for (const date of dates.slice(-6)) b.captures.push({ kind: "CBOE_VIX_CSV", observationDates: [date], capture: capture(`DATE,CLOSE\n${date.slice(5, 7)}/${date.slice(8)}/${date.slice(0, 4)},16\n`, "VIX_OFFICIAL", "https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv", date + "T22:00:00Z") });
  const date = dates.at(-1)!;
  b.captures.push({ kind: "CFE_MONTHLY_CATALOG", capture: capture(JSON.stringify([
    { duration_type: "M", futures_root: "VX", expire_date: "2026-09-16", product_display: "VX/U6" },
    { duration_type: "M", futures_root: "VX", expire_date: "2026-10-21", product_display: "VX/V6" }]), "VX_OFFICIAL", "https://www-api.cboe.com/us/futures/market_statistics/historical_data/product/list/VX/", date + "T22:00:00Z") });
  for (const [symbol, expirationDate, name, settle] of [["VX/U6", "2026-09-16", "U (Sep 2026)", 18], ["VX/V6", "2026-10-21", "V (Oct 2026)", 19]] as const) {
    b.captures.push({ kind: "CFE_MONTHLY_CSV", identity: { symbol, expirationDate }, capture: capture(`Trade Date,Futures,Settle\n${date},${name},${settle}\n`, "VX_OFFICIAL", `https://cdn.cboe.com/data/us/futures/market_statistics/historical_data/VX/VX_${expirationDate}.csv`, date + "T22:00:00Z") });
  }
  const asOf = date + "T23:00:00Z", prepared = prepareSourceInput(b, asOf), output = evaluateRegime(prepared.input);
  assert.equal(output.systemState, "COMPLETE", JSON.stringify({ missing: output.diagnostics.missingReasons, sources: output.sourceStatus })); assert.equal(output.replayClass, "R0");
  assert.equal(output.parameterSet, "C03"); assert.equal(output.diagnostics.pointInTimeOosClaim, false);
  const snapshot = createSnapshot({ asOf, input: prepared.input, output, error: null, captureMetadata: prepared.captureMetadata,
    v1: { regime: "UNCHANGED_SYNTHETIC_V1", score: 50, confidence: 60, version: "fixture-v1", outputHash: hash("fixture-v1-public-bytes") } });
  const replay = replaySnapshot(JSON.parse(JSON.stringify(snapshot)));
  assert.equal(replay.status, "MATCH");
  if (replay.status === "MATCH") assert.deepEqual(replay.output, output);
});
