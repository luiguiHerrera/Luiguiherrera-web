// Server-side acquisition boundary. No fetch, clock, persistence or decision rules.
import { assertEngineInput } from "../boundary.ts";
import type { CaptureRecord } from "../capture.ts";
import { TICKERS } from "../contract.ts";
import { bytesHash, canonical, freeze, hash } from "../math.ts";
import { assembleVx, normalizeBtcTable, normalizeGldRows, normalizeMonthlyCatalog, normalizeVixCsv, normalizeVxHistory, normalizeYahoo } from "../normalize.ts";
import type { MonthlyHistory } from "../normalize.ts";
import { instant, resolveCalendar, validDate, weakest } from "../temporal.ts";
import type { Calendar, ContractIdentity, EngineInput, Packet, ReplayClass, Row, Temporal } from "../types.ts";
import { assertReviewedCalendarPackage } from "./calendar-package.ts";
import type { ReviewedCalendarPackage } from "./calendar-package.ts";

export const SOURCE_BUNDLE_VERSION = "regime-v2-source-bundle/1.0.0";
export const SOURCE_PREPARATION_VERSION = "regime-v2-source-preparation/1.0.0";
export const SOURCE_LIMITS = Object.freeze({ captures: 4096, bytesPerCapture: 8 * 1024 * 1024, totalRawBytes: 32 * 1024 * 1024, totalRows: 1000000, calendarSessions: 20000 });
type CalendarKey = keyof EngineInput["calendars"];
export type CalendarPacket = { calendar: Calendar; capture: CaptureRecord; transformVersion: string; calendarHash: string };
export type SourceCapture = {
  kind: "YAHOO_ADJCLOSE" | "CBOE_VIX_CSV" | "CFE_MONTHLY_CATALOG" | "CFE_MONTHLY_CSV" | "BTC_NATIVE_TABLE_JSON" | "GLD_NATIVE_ROWS_JSON";
  capture: CaptureRecord;
  ticker?: string;
  identity?: ContractIdentity;
  observationDates?: string[];
  upstreamCapture?: CaptureRecord;
  transformVersion?: string;
  unitEventDates?: string[];
};
export type SourceBundle = { schemaVersion: typeof SOURCE_BUNDLE_VERSION; mode: "R0" | "R1" | "R2"; captures: SourceCapture[]; calendars: Partial<Record<CalendarKey, CalendarPacket>> };
export class SourceBundleError extends Error {
  readonly code = "INVALID_SOURCE_BUNDLE";
  readonly inputPath: string;
  constructor(inputPath: string, detail: string) { super(`${inputPath}: ${detail}`); this.inputPath = inputPath; this.name = "SourceBundleError"; }
}
const fail = (path: string, detail: string): never => { throw new SourceBundleError(path, detail); };
function object(value: unknown, path: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "expected a plain object");
}
function plainData(value: unknown) {
  const active = new WeakSet<object>(); let nodes = 0;
  function visit(node: unknown, path: string, depth: number) {
    if (++nodes > 1500000 || depth > 32) fail(path, "bounded plain-data envelope exceeded");
    if (node === null || ["string", "boolean", "number"].includes(typeof node)) return;
    if (typeof node !== "object") fail(path, "non-JSON data");
    const obj = node as object, proto = Object.getPrototypeOf(obj);
    if (Array.isArray(obj) ? proto !== Array.prototype : proto !== Object.prototype && proto !== null) fail(path, "non-plain object");
    if (active.has(obj)) fail(path, "cycle");
    active.add(obj);
    for (const key of Reflect.ownKeys(obj)) {
      if (typeof key !== "string") fail(path, "symbol property");
      const descriptor = Object.getOwnPropertyDescriptor(obj, key)!;
      if (descriptor.get || descriptor.set) fail(path, "accessor property");
      visit(descriptor.value, `${path}.${String(key)}`, depth + 1);
    }
    active.delete(obj);
  }
  visit(value, "bundle", 0);
}
function requiredText(value: unknown, path: string): asserts value is string {
  if (typeof value !== "string" || !value.length) fail(path, "expected nonempty string");
}
function validCapture(value: unknown, path: string): { capture: CaptureRecord; bytes: string } {
  object(value, path);
  for (const key of ["captureId", "sourceId", "sourceVersion", "sourceUrl", "startedAt", "completedAt", "rawHash", "rawBase64"]) requiredText(value[key], `${path}.${key}`);
  if (value.origin !== "PROSPECTIVE" && value.origin !== "R2_IMPORT") fail(path, "unknown capture origin");
  object(value.metadata, `${path}.metadata`);
  const c = value as unknown as CaptureRecord;
  if (instant(c.startedAt) === null || instant(c.completedAt) === null || instant(c.completedAt)! < instant(c.startedAt)!) fail(path, "invalid capture interval");
  if (!/^https:\/\//.test(c.sourceUrl) || !/^[a-f0-9]{64}$/.test(c.captureId) || !/^[a-f0-9]{64}$/.test(c.rawHash)) fail(path, "invalid source URL or hash");
  if (c.rawBase64.length > Math.ceil(SOURCE_LIMITS.bytesPerCapture / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(c.rawBase64)) fail(path, "invalid or excessive raw bytes");
  const raw = Buffer.from(c.rawBase64, "base64"), { captureId, ...body } = c;
  if (raw.length > SOURCE_LIMITS.bytesPerCapture || raw.toString("base64") !== c.rawBase64 || hash(body) !== captureId || bytesHash(new Uint8Array(raw)) !== c.rawHash) fail(path, "capture hash mismatch");
  if (c.metadata.sourceId !== c.sourceId || c.metadata.sourceVersion !== c.sourceVersion || c.metadata.vintageHash !== c.rawHash || c.metadata.capturedAt !== c.completedAt || c.metadata.availableAt !== c.completedAt) fail(path, "capture provenance mismatch");
  // JSON/CSV normalizers consume UTF-8; preserve exact raw hash and reject lossy decoding.
  const bytes = raw.toString("utf8");
  if (!Buffer.from(bytes, "utf8").equals(new Uint8Array(raw))) fail(path, "invalid UTF-8 capture");
  return { capture: c, bytes };
}
function metadata(c: CaptureRecord, replayClass: ReplayClass): Temporal {
  return { sourceId: c.sourceId, sourceVersion: c.sourceVersion, vintageHash: c.rawHash, capturedAt: c.completedAt, availableAt: c.completedAt,
    sourcePublishedAt: null, availabilityCertainty: "CONSERVATIVE_BOUND", availabilityEvidence: "ACTUAL_CAPTURE_COMPLETED_PROVIDER_PUBLICATION_UNKNOWN", replayClass, status: "AVAILABLE" };
}
const kinds = ["YAHOO_ADJCLOSE", "CBOE_VIX_CSV", "CFE_MONTHLY_CATALOG", "CFE_MONTHLY_CSV", "BTC_NATIVE_TABLE_JSON", "GLD_NATIVE_ROWS_JSON"] as const;
const family = (kind: SourceCapture["kind"]): CalendarKey => kind === "YAHOO_ADJCLOSE" ? "equity" : kind === "CBOE_VIX_CSV" ? "vix" : kind.startsWith("CFE_") ? "vx" : kind === "BTC_NATIVE_TABLE_JSON" ? "btc" : "gld";
const source = (kind: SourceCapture["kind"]) => ({ equity: "EQUITY_ADJUSTED", vix: "VIX_OFFICIAL", vx: "VX_OFFICIAL", btc: "BTC_NATIVE", gld: "GLD_NATIVE" })[family(kind)];
function sourceUrl(c: CaptureRecord, entry: SourceCapture, path: string) {
  let url: URL; try { url = new URL((entry.upstreamCapture ?? c).sourceUrl); } catch { return fail(path, "malformed source URL"); }
  const acceptable = entry.kind === "YAHOO_ADJCLOSE" ? ["query1.finance.yahoo.com", "query2.finance.yahoo.com"].includes(url.hostname) && url.pathname.startsWith("/v8/finance/chart/")
    : entry.kind === "CBOE_VIX_CSV" ? url.hostname === "cdn.cboe.com" && url.pathname === "/api/global/us_indices/daily_prices/VIX_History.csv"
    : entry.kind === "CFE_MONTHLY_CATALOG" ? url.hostname === "www-api.cboe.com" && url.pathname.startsWith("/us/futures/market_statistics/historical_data/product/list/VX")
    : entry.kind === "CFE_MONTHLY_CSV" ? url.hostname === "cdn.cboe.com" && url.pathname.startsWith("/data/us/futures/market_statistics/historical_data/VX/")
    : entry.kind === "BTC_NATIVE_TABLE_JSON" ? url.hostname === "farside.co.uk"
    : ["www.spdrgoldshares.com", "www.ssga.com"].includes(url.hostname);
  if (!acceptable || c.sourceId !== source(entry.kind)) fail(path, "source identity/endpoint does not implement this source contract");
}

/** Validate and normalize one immutable vintage, independently of a decision cut.
 * Capture-time eligibility depends on the original capture, never the later asOf.
 * The caller may retain this preparation in a bounded, versioned cache. */
export function prepareSourceVintage(bundle: unknown) {
  return prepareSourceVintageInner(bundle);
}

/** Separately authenticated operational release, with unchanged row semantics.
 * Raw market captures remain subject to the existing acquisition boundary. */
export function prepareSourceVintageWithReviewedCalendars(bundle: unknown, reviewed: ReviewedCalendarPackage) {
  assertReviewedCalendarPackage(reviewed);
  return prepareSourceVintageInner(bundle, reviewed);
}

function prepareSourceVintageInner(bundle: unknown, reviewed?: ReviewedCalendarPackage) {
  plainData(bundle); object(bundle, "bundle");
  if (bundle.schemaVersion !== SOURCE_BUNDLE_VERSION || !["R0", "R1", "R2"].includes(bundle.mode as string)) fail("bundle", "unknown schema/mode");
  if (!Array.isArray(bundle.captures) || bundle.captures.length > SOURCE_LIMITS.captures) fail("bundle.captures", "expected bounded capture list");
  object(bundle.calendars, "bundle.calendars");
  if (reviewed && (bundle.mode !== "R2" || Object.keys(bundle.calendars).length !== 0)) fail("bundle.calendars", "reviewed release requires R2 mode and an empty calendar envelope");
  // Empty asOf is used for structural validation only and never evaluated or
  // returned. resolveSourceVintage supplies the independently validated cut.
  const input: EngineInput = { mode: bundle.mode as SourceBundle["mode"], asOf: "", calendars: {}, equity: {} }, issues: string[] = [];
  const captureMetadata: { captureId: string; rawHash: string; sourceId: string; sourceVersion: string; sourceUrl: string; capturedAt: string; availableAt: string; sourcePublishedAt: null; origin: string; bytes: number; selectedObservations: { observationDate: string; replayClass: ReplayClass }[] }[] = [];
  let rawBytes = 0, totalRows = 0, parseCount = 0;
  const checked = (value: unknown, path: string) => {
    const result = validCapture(value, path); rawBytes += Buffer.byteLength(result.bytes);
    if (rawBytes > SOURCE_LIMITS.totalRawBytes) fail(path, "total capture byte bound exceeded");
    captureMetadata.push({ captureId: result.capture.captureId, rawHash: result.capture.rawHash, sourceId: result.capture.sourceId, sourceVersion: result.capture.sourceVersion, sourceUrl: result.capture.sourceUrl,
      capturedAt: result.capture.completedAt, availableAt: result.capture.completedAt, sourcePublishedAt: null, origin: result.capture.origin, bytes: Buffer.byteLength(result.bytes), selectedObservations: [] });
    return result;
  };
  for (const [key, value] of Object.entries(bundle.calendars)) {
    if (!["equity", "vix", "vx", "btc", "gld"].includes(key)) fail(`calendars.${key}`, "unknown calendar family");
    object(value, `calendars.${key}`); object(value.calendar, `calendars.${key}.calendar`);
    requiredText(value.transformVersion, `calendars.${key}.transformVersion`);
    const c = value.calendar as unknown as Calendar, captured = checked(value.capture, `calendars.${key}.capture`).capture;
    if (hash(c) !== value.calendarHash) fail(`calendars.${key}`, "calendar normalization hash mismatch");
    if (!Array.isArray(c.sessions) || c.sessions.length > SOURCE_LIMITS.calendarSessions) fail(`calendars.${key}`, "calendar sessions exceed bound");
    if (c.sourceId !== captured.sourceId || c.sourceVersion !== captured.sourceVersion || c.vintageHash !== captured.rawHash || c.capturedAt !== captured.completedAt || c.availableAt !== captured.completedAt) fail(`calendars.${key}`, "calendar raw provenance mismatch");
    const cal = { ...c, sourcePublishedAt: null, replayClass: captured.origin === "R2_IMPORT" ? "R2" as const : c.replayClass };
    // resolveCalendar applies frozen OFFICIAL/coverage/known-at/DST-aware instants.
    input.calendars[key as CalendarKey] = cal;
  }
  if (reviewed) input.calendars = { ...reviewed.calendars };
  // Existing boundary validates all calendar fields without trusting declarations.
  try { assertEngineInput(input); } catch (error) { fail("bundle.calendars", error instanceof Error ? error.message : "invalid calendar"); }
  const closeMaps = Object.fromEntries(Object.entries(input.calendars).map(([key, calendar]) => [key, new Map(calendar?.sessions.map(row => [row.session, row.closedAt]))])) as Partial<Record<CalendarKey, Map<string, string>>>;
  const captureSessions = new Map<string, ReturnType<typeof resolveCalendar>>();
  const packets = new Map<string, Packet[]>(), histories: MonthlyHistory[] = [];
  let catalog: { identities: ContractIdentity[]; metadata: Temporal } | undefined;
  for (const [index, value] of (bundle.captures as unknown[]).entries()) {
    const path = `captures[${index}]`; object(value, path);
    if (!kinds.includes(value.kind as SourceCapture["kind"])) fail(path, "unknown source kind");
    const entry = value as unknown as SourceCapture, { capture: c, bytes } = checked(entry.capture, `${path}.capture`), ledger = captureMetadata.at(-1)!;
    if (entry.upstreamCapture) checked(entry.upstreamCapture, `${path}.upstreamCapture`);
    if (["BTC_NATIVE_TABLE_JSON", "GLD_NATIVE_ROWS_JSON"].includes(entry.kind) && (!entry.upstreamCapture || !entry.transformVersion)) fail(path, "native extracted JSON requires upstream raw capture and transform version");
    sourceUrl(c, entry, path);
    if (entry.upstreamCapture && (entry.upstreamCapture.sourceId !== c.sourceId || instant(entry.upstreamCapture.completedAt)! > instant(c.completedAt)!)) fail(path, "invalid extraction ancestry");
    if (entry.observationDates && (!Array.isArray(entry.observationDates) || entry.observationDates.some(d => !validDate(d)) || new Set(entry.observationDates).size !== entry.observationDates.length)) fail(path, "invalid observation selection");
    const key = family(entry.kind), calendar = input.calendars[key];
    const calendarCacheKey = `${key}|${c.completedAt}`;
    let captureSession = captureSessions.get(calendarCacheKey);
    if (!captureSession) { captureSession = resolveCalendar(calendar, c.completedAt, "R0"); captureSessions.set(calendarCacheKey, captureSession); }
    const selected = entry.observationDates ? new Set(entry.observationDates) : null;
    const base = metadata(c, "R2");
    const rowMetadata = (row: Row): Row => {
      const date = row.observationDate ?? row.date ?? "", close = closeMaps[key]?.get(date);
      const replayClass: ReplayClass = c.origin === "PROSPECTIVE" && entry.upstreamCapture?.origin !== "R2_IMPORT" && captureSession.target === date && captureSession.reason === null ? "R0" : "R2";
      ledger.selectedObservations.push({ observationDate: date, replayClass });
      return { ...row, ...metadata(c, replayClass), observationDate: date, observationEndAt: close ?? row.observationEndAt,
        observationEndCertainty: close ? "EXACT" : row.observationEndCertainty, status: row.status ?? "AVAILABLE" };
    };
    const normalizeRows = (rows: Row[]) => {
      totalRows += rows.length; if (totalRows > SOURCE_LIMITS.totalRows) fail(path, "total normalized row bound exceeded; retain an explicit bounded capture bundle without truncating methodology");
      const chosen = rows.filter(row => !selected || selected.has(row.observationDate ?? row.date ?? "")).map(rowMetadata);
      const observed = new Set(chosen.map(row => row.observationDate));
      if (selected && [...selected].some(date => !observed.has(date))) issues.push(`${path}:SELECTED_OBSERVATION_MISSING`);
      return chosen;
    };
    parseCount++;
    if (entry.kind === "CFE_MONTHLY_CATALOG") {
      if (catalog) fail(path, "one explicit catalog vintage required");
      let payload: unknown; try { payload = JSON.parse(bytes); } catch { fail(path, "malformed catalog JSON"); }
      catalog = { identities: normalizeMonthlyCatalog(payload), metadata: metadata(c, c.origin === "PROSPECTIVE" ? "R0" : "R2") }; continue;
    }
    if (entry.kind === "CFE_MONTHLY_CSV") {
      if (!entry.identity || typeof entry.identity.symbol !== "string" || !validDate(entry.identity.expirationDate)) fail(path, "missing monthly identity");
      const normalized = normalizeVxHistory(bytes, entry.identity!, base), rows = normalizeRows(normalized.rows);
      histories.push({ ...normalized, metadata: { ...base, replayClass: weakest(rows.map(r => r.replayClass)) }, rows }); continue;
    }
    let packet: Packet, packetKey: string;
    if (entry.kind === "YAHOO_ADJCLOSE") {
      if (![...TICKERS, "SPY", "RSP", "IWM"].includes(entry.ticker ?? "")) fail(path, "unsupported equity ticker");
      packetKey = entry.ticker!; packet = normalizeYahoo(bytes, base, packetKey);
    } else if (entry.kind === "CBOE_VIX_CSV") { packetKey = "VIX"; packet = normalizeVixCsv(bytes, base); }
    else {
      let payload: unknown; try { payload = JSON.parse(bytes); } catch { fail(path, "malformed native JSON"); }
      if (entry.kind === "BTC_NATIVE_TABLE_JSON") { packetKey = "BTC"; packet = normalizeBtcTable(payload, base); }
      else { packetKey = "GLD"; packet = normalizeGldRows(payload, base, entry.unitEventDates ?? []); }
    }
    packet.rows = normalizeRows(packet.rows);
    packet.vintageHash = c.rawHash; // Raw bytes, including whitespace, are the captured identity.
    packet.replayClass = weakest(packet.rows.map(r => r.replayClass));
    if (packet.status !== "AVAILABLE") issues.push(`${path}:${packet.status ?? "UNKNOWN_NORMALIZER_STATUS"}`);
    const list = packets.get(packetKey) ?? []; list.push(packet); packets.set(packetKey, list);
  }
  const combine = (parts: Packet[]): Packet => {
    const first = parts[0], versions = new Set(parts.map(p => p.sourceVersion));
    if (versions.size !== 1 || parts.some(p => p.seriesType !== first.seriesType || p.priceBasis !== first.priceBasis || p.currency !== first.currency || canonical(p.expectedFunds) !== canonical(first.expectedFunds))) fail("bundle.captures", "incompatible packet versions or native units");
    const rows = parts.flatMap(p => p.rows).sort((a, b) => (a.observationDate ?? "").localeCompare(b.observationDate ?? ""));
    const latest = parts.reduce((a, b) => instant(a.capturedAt)! >= instant(b.capturedAt)! ? a : b);
    return { ...first, rows, availableAt: latest.availableAt, capturedAt: latest.capturedAt, sourcePublishedAt: null,
      vintageHash: parts.length === 1 ? first.vintageHash : hash(parts.map(p => p.vintageHash).sort()), replayClass: weakest(parts.map(p => p.replayClass)),
      status: parts.length === 1 ? first.status : parts.some(p => p.status !== "AVAILABLE") ? "INVALID_PARENT" : "AVAILABLE",
      declaredStart: parts.map(p => p.declaredStart).filter((d): d is string => !!d).sort()[0], unitEventDates: [...new Set(parts.flatMap(p => p.unitEventDates ?? []))] };
  };
  for (const [key, parts] of packets) {
    const packet = combine(parts);
    if (key === "VIX") input.vix = packet; else if (key === "BTC") input.btc = packet; else if (key === "GLD") input.gld = packet; else input.equity[key] = packet;
  }
  // Materialize JSON once per vintage: rows retain an identical representation
  // across all cuts, and freezing cannot mutate the caller's source bundle.
  const normalizedInput = JSON.parse(JSON.stringify(input)) as EngineInput;
  assertEngineInput(normalizedInput);
  return freeze({ preparationVersion: SOURCE_PREPARATION_VERSION, inputBase: { mode: normalizedInput.mode, calendars: normalizedInput.calendars, equity: normalizedInput.equity,
    ...(normalizedInput.vix ? { vix: normalizedInput.vix } : {}), ...(normalizedInput.btc ? { btc: normalizedInput.btc } : {}), ...(normalizedInput.gld ? { gld: normalizedInput.gld } : {}) },
    catalog: catalog ? JSON.parse(JSON.stringify(catalog)) as NonNullable<typeof catalog> : null,
    histories: JSON.parse(JSON.stringify(histories)) as MonthlyHistory[], issues,
    hasR2History: captureMetadata.some(c => c.selectedObservations.some(o => o.replayClass === "R2")),
    captureMetadata: { schemaVersion: SOURCE_BUNDLE_VERSION, bundleHash: reviewed ? hash({ bundle, reviewedCalendarRelease: reviewed.releaseIdentity }) : hash(bundle), captures: captureMetadata, rawBytes, parseCount,
      ...(reviewed ? { reviewedCalendarRelease: { releaseIdentity: reviewed.releaseIdentity, preflightAsOf: reviewed.preflightAsOf, provenance: reviewed.provenance } } : {}),
      providerPublicationPolicy: "UNKNOWN_UNLESS_SEPARATELY_PROVED; CAPTURE_TIME_IS_NOT_PROVIDER_PUBLICATION", boundary: "DECLARED_NORMALIZATION_PROVENANCE_NOT_PROVIDER_AUTHENTICATION" },
    sourceStatus: { normalization: "PREPARED", parseCount, rawBytes, normalizedRows: totalRows } });
}
export type PreparedSourceVintage = ReturnType<typeof prepareSourceVintage>;

/** Every cut resolves calendars and CFE maturities again; no output/freshness TTL.
 * Only the factory-produced immutable vintage is accepted on this internal path. */
export function resolveSourceVintage(vintage: PreparedSourceVintage, asOf: string) {
  if (instant(asOf) === null) fail("asOf", "invalid decision cutoff");
  if (!Object.isFrozen(vintage) || vintage.preparationVersion !== SOURCE_PREPARATION_VERSION) fail("vintage", "unsupported or mutable preparation");
  const input: EngineInput = { ...vintage.inputBase, asOf }, issues = [...vintage.issues];
  const calendarStatus = Object.fromEntries((["equity", "vix", "vx", "btc", "gld"] as const).map(key => [key, resolveCalendar(input.calendars[key], asOf, input.mode)]));
  const target = calendarStatus.equity.target;
  if (vintage.catalog && target) {
    input.vx = assembleVx(target, vintage.catalog.identities, vintage.catalog.metadata, vintage.histories);
    // Assembly's date-only fallback is conservative day-end. Once raw rows have
    // evidenced source-calendar close instants, propagate the latest near-parent
    // observation end; never reuse the equity clock for CFE settlement.
    const ends = input.vx.contracts.slice(0, 2).map(c => c.observationEndAt);
    if (ends.length === 2 && ends.every(end => instant(end) !== null)) input.vx.observationEndAt = ends.reduce((a, b) => instant(a)! >= instant(b)! ? a : b);
    // Only the newly assembled near-contract packet needs JSON materialization.
    input.vx = JSON.parse(JSON.stringify(input.vx)) as EngineInput["vx"];
  }
  else issues.push(vintage.catalog ? "VX:UNKNOWN_CALENDAR" : "VX:MISSING_MONTHLY_CATALOG");
  for (const [key, resolution] of Object.entries(calendarStatus)) {
    if (resolution.reason) issues.push(`${key}:${resolution.reason}`);
  }
  if (vintage.hasR2History) issues.push("R2_HISTORY_RETAINED_NO_RETROACTIVE_UPGRADE");
  return freeze({ input, issues, captureMetadata: { ...vintage.captureMetadata, asOf }, sourceStatus: { ...vintage.sourceStatus, calendarStatus } });
}

/** Public raw-boundary convenience path; fresh preparation without shared state. */
export function prepareSourceInput(bundle: unknown, asOf: string) {
  if (instant(asOf) === null) fail("asOf", "invalid decision cutoff");
  return resolveSourceVintage(prepareSourceVintage(bundle), asOf);
}
