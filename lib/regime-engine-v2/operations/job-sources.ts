// Job-only P8 acquisition. No V1 adapter, persistence, calendar discovery or engine execution.
import { captureScope } from "../capture.ts";
import { TICKERS } from "../contract.ts";
import { normalizeMonthlyCatalog } from "../normalize.ts";
import { validDate } from "../temporal.ts";
import type { ContractIdentity } from "../types.ts";
import type { SourceBundle, SourceCapture } from "./source-input.ts";

export type JobSourceCode = "SOURCE_UNAVAILABLE" | "INVALID_CATALOG" | "SOURCE_LIMIT_EXCEEDED" | "SOURCE_ABORTED" | "INVALID_EXPECTED_SESSION";
export type JobSourceAttempt = {
  sequence: number; kind: SourceCapture["kind"]; ticker?: string; symbol?: string; expirationDate?: string;
  url: string; method: "GET"; redirectsFollowed: 0; startedAt: string; completedAt?: string;
  status: "STARTED" | "CAPTURED" | "SOURCE_UNAVAILABLE"; httpStatus?: number; bytes: number;
  rawHash?: string; captureId?: string; errorCode?: JobSourceCode;
};
export class JobSourceError extends Error {
  readonly code: JobSourceCode;
  readonly attempts: JobSourceAttempt[];
  readonly fetchCalls: number;
  constructor(code: JobSourceCode, message: string, attempts: JobSourceAttempt[] = [], fetchCalls = 0) {
    super(message); this.name = "JobSourceError"; this.code = code;
    this.attempts = structuredClone(attempts); this.fetchCalls = fetchCalls;
  }
}
export const JOB_SOURCE_POLICY = Object.freeze({ sourceVersion: "p8-source-contract/1.0.0", maxResponseBytes: 8 * 1024 * 1024, maxTotalBytes: 32 * 1024 * 1024, concurrency: 3, timeoutMs: 25000, historyCalendarDays: 550, maxMonthlyContracts: 9 });
const VIX_URL = "https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv";
const CATALOG_URL = "https://www-api.cboe.com/us/futures/market_statistics/historical_data/product/list/VX/";
type Entry = { kind: SourceCapture["kind"]; sourceId: string; ticker?: string; identity?: ContractIdentity; url: string };
type Options = { expectedSession: string; signal?: AbortSignal; onAttempt?: (attempt: Readonly<JobSourceAttempt>) => void; fetcher?: typeof fetch };

function failure(code: JobSourceCode, message: string): never { throw new JobSourceError(code, message); }
function abortable<T>(operation: () => Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new JobSourceError("SOURCE_ABORTED", "Source acquisition was aborted or timed out"));
  return new Promise((resolve, reject) => {
    const aborted = () => reject(new JobSourceError("SOURCE_ABORTED", "Source acquisition was aborted or timed out"));
    signal.addEventListener("abort", aborted, { once: true });
    Promise.resolve().then(operation).then(resolve, reject).finally(() => signal.removeEventListener("abort", aborted));
  });
}
function monthlyEntries(payload: unknown, expectedSession: string): Entry[] {
  const rows = Array.isArray(payload) ? payload : payload && typeof payload === "object" ? Object.values(payload).flatMap(value => Array.isArray(value) ? value : []) : [];
  const identities = normalizeMonthlyCatalog(payload).filter(identity => identity.expirationDate > expectedSession).slice(0, JOB_SOURCE_POLICY.maxMonthlyContracts);
  if (identities.length < 2 || new Set(identities.map(item => item.expirationDate)).size !== identities.length || new Set(identities.map(item => item.symbol)).size !== identities.length) failure("INVALID_CATALOG", "Expected two to nine unambiguous active monthly VX contracts");
  const selected = identities.map(identity => {
    const matches = rows.filter(row => row && typeof row === "object" && row.duration_type === "M" && row.futures_root === "VX" && row.expire_date === identity.expirationDate && "VX/" + String(row.product_display).split("/").at(-1) === identity.symbol);
    if (matches.length !== 1 || typeof matches[0].path !== "string") failure("INVALID_CATALOG", "Monthly identity must have one explicit official catalog path");
    let url: URL;
    try { url = new URL(matches[0].path, "https://cdn.cboe.com/"); } catch { return failure("INVALID_CATALOG", "Invalid official monthly catalog path"); }
    if (url.protocol !== "https:" || url.hostname !== "cdn.cboe.com" || url.port || url.username || url.password || url.search || url.hash || !/^\/data\/us\/futures\/market_statistics\/historical_data\/VX\/[A-Za-z0-9_./-]+\.csv$/.test(url.pathname)) failure("INVALID_CATALOG", "Monthly catalog path is outside the CFE source contract");
    return { kind: "CFE_MONTHLY_CSV" as const, sourceId: "VX_OFFICIAL", identity, url: url.href };
  });
  if (new Set(selected.map(entry => entry.url)).size !== selected.length) failure("INVALID_CATALOG", "Distinct monthly identities must have distinct official history paths");
  return selected;
}

/** Caller must first resolve the reviewed calendar and expectedSession. Calendar
 * packets are supplied by the coordinator afterwards; acquisition never invents
 * them. Newly fetched historical rows remain honestly R2 at the source boundary.
 */
export async function acquireJobSources(options: Options): Promise<{ bundle: SourceBundle; fetchCalls: number; attempts: JobSourceAttempt[]; completedAt: string }> {
  if (!validDate(options.expectedSession)) failure("INVALID_EXPECTED_SESSION", "A resolved official expected session is required before acquisition");
  const scope = captureScope(), attempts: JobSourceAttempt[] = [], captures: SourceCapture[] = [];
  const controller = new AbortController(), abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, JOB_SOURCE_POLICY.timeoutMs);
  const startedAt = new Date().toISOString(), period2 = Math.floor(Date.parse(startedAt) / 1000), period1 = period2 - JOB_SOURCE_POLICY.historyCalendarDays * 86400;
  const fetcher = options.fetcher ?? globalThis.fetch;
  let fetchCalls = 0, totalBytes = 0;
  function emit(attempt: JobSourceAttempt) {
    // Observer failures cannot turn provider data into a different source result.
    try { options.onAttempt?.(Object.freeze(structuredClone(attempt))); } catch { /* terminal job diagnostics remain the coordinator's responsibility */ }
  }
  async function acquire(entry: Entry) {
    if (controller.signal.aborted) failure("SOURCE_ABORTED", "Acquisition aborted before the next provider request");
    const attempt: JobSourceAttempt = { sequence: attempts.length + 1, kind: entry.kind, ...(entry.ticker ? { ticker: entry.ticker } : {}), ...(entry.identity ? { symbol: entry.identity.symbol, expirationDate: entry.identity.expirationDate } : {}), url: entry.url, method: "GET", redirectsFollowed: 0, startedAt: new Date().toISOString(), status: "STARTED", bytes: 0 };
    attempts.push(attempt); emit(attempt);
    try {
      const capture = await scope.capture({ sourceId: entry.sourceId, sourceVersion: JOB_SOURCE_POLICY.sourceVersion, sourceUrl: entry.url, origin: "PROSPECTIVE" }, async () => {
        const response = await abortable(() => {
          if (controller.signal.aborted) failure("SOURCE_ABORTED", "Acquisition aborted before fetch");
          fetchCalls++;
          return fetcher(entry.url, { method: "GET", redirect: "manual", signal: controller.signal, headers: { "User-Agent": "Mozilla/5.0 (compatible; RegimeV2ShadowJob/1.0)", Accept: "*/*" } });
        }, controller.signal);
        attempt.httpStatus = response.status;
        if (!response.ok || response.redirected || (response.url && response.url !== entry.url)) failure("SOURCE_UNAVAILABLE", "Provider did not return a direct successful response");
        const length = response.headers.get("content-length");
        if (length !== null && Number(length) > JOB_SOURCE_POLICY.maxResponseBytes) failure("SOURCE_LIMIT_EXCEEDED", "Response exceeds the capture byte limit");
        if (!response.body) failure("SOURCE_UNAVAILABLE", "Provider returned no response body");
        const reader = response.body.getReader(), chunks: Uint8Array[] = [];
        try {
          for (;;) {
            const part = await abortable(() => reader.read(), controller.signal);
            if (part.done) break;
            attempt.bytes += part.value.byteLength; totalBytes += part.value.byteLength;
            if (attempt.bytes > JOB_SOURCE_POLICY.maxResponseBytes || totalBytes > JOB_SOURCE_POLICY.maxTotalBytes) failure("SOURCE_LIMIT_EXCEEDED", "Capture or aggregate source bytes exceed the existing source boundary");
            chunks.push(part.value);
          }
        } finally { reader.releaseLock(); }
        const bytes = new Uint8Array(attempt.bytes); let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
        return bytes;
      });
      Object.assign(attempt, { completedAt: capture.completedAt, status: "CAPTURED", rawHash: capture.rawHash, captureId: capture.captureId });
      const result: SourceCapture = { kind: entry.kind, capture, ...(entry.ticker ? { ticker: entry.ticker } : {}), ...(entry.identity ? { identity: entry.identity } : {}) };
      captures.push(result); return result;
    } catch (error) {
      const code = error instanceof JobSourceError ? error.code : controller.signal.aborted ? "SOURCE_ABORTED" : "SOURCE_UNAVAILABLE";
      Object.assign(attempt, { completedAt: new Date().toISOString(), status: "SOURCE_UNAVAILABLE", errorCode: code });
      throw new JobSourceError(code, "Source acquisition failed; see bounded attempt metadata");
    } finally { emit(attempt); }
  }
  async function batch(entries: Entry[]) {
    let cursor = 0, firstFailure: unknown;
    await Promise.all(Array.from({ length: Math.min(JOB_SOURCE_POLICY.concurrency, entries.length) }, async () => {
      while (cursor < entries.length && !controller.signal.aborted) {
        const entry = entries[cursor++];
        try { await acquire(entry); } catch (error) { firstFailure ??= error; controller.abort(); }
      }
    }));
    if (firstFailure) throw firstFailure;
    if (controller.signal.aborted) failure("SOURCE_ABORTED", "Source acquisition was aborted or timed out");
  }
  try {
    await batch([...TICKERS, "SPY", "RSP", "IWM"].map(ticker => ({ kind: "YAHOO_ADJCLOSE", sourceId: "EQUITY_ADJUSTED", ticker, url: `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=1d&events=div%2Csplits&includeAdjustedClose=true` })));
    await batch([{ kind: "CBOE_VIX_CSV", sourceId: "VIX_OFFICIAL", url: VIX_URL }, { kind: "CFE_MONTHLY_CATALOG", sourceId: "VX_OFFICIAL", url: CATALOG_URL }]);
    const catalog = captures.find(entry => entry.kind === "CFE_MONTHLY_CATALOG")!;
    let selected: Entry[];
    try {
      const raw = Buffer.from(catalog.capture.rawBase64, "base64");
      if (!Buffer.from(raw.toString("utf8"), "utf8").equals(new Uint8Array(raw))) failure("INVALID_CATALOG", "Official catalog is not lossless UTF-8");
      selected = monthlyEntries(JSON.parse(raw.toString("utf8")), options.expectedSession);
    } catch (error) { if (error instanceof JobSourceError) throw error; return failure("INVALID_CATALOG", "Unable to parse the official monthly catalog"); }
    await batch(selected);
    const order = new Map(attempts.map(attempt => [attempt.captureId, attempt.sequence]));
    captures.sort((a, b) => order.get(a.capture.captureId)! - order.get(b.capture.captureId)!);
    return { bundle: { schemaVersion: "regime-v2-source-bundle/1.0.0", mode: "R2", captures, calendars: {} }, fetchCalls, attempts: structuredClone(attempts), completedAt: new Date().toISOString() };
  } catch (error) {
    controller.abort();
    throw new JobSourceError(error instanceof JobSourceError ? error.code : "SOURCE_UNAVAILABLE", error instanceof JobSourceError ? error.message : "Source acquisition failed", attempts, fetchCalls);
  } finally { clearTimeout(timeout); options.signal?.removeEventListener("abort", abort); }
}
