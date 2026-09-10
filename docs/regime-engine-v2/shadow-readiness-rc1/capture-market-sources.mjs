/** Explicit read-only P8 acquisition for a local readiness assessment.
 * No scheduler, production flag, provider substitution or decision rules.
 * Raw bytes stay in the supplied private directory; HTTP errors are evidence,
 * never usable market packets. Each URL is requested once per new acquisition.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";

const option = name => {
  const at = process.argv.indexOf(name);
  if (at < 0 || !process.argv[at + 1]) throw new Error(`Missing ${name}`);
  return process.argv[at + 1];
};
const root = path.resolve(option("--root")), directory = path.resolve(option("--directory"));
if (directory === root || directory.startsWith(root + path.sep)) throw new Error("Private storage must be outside the repository");
const { captureScope, persistCapture } = await import(pathToFileURL(path.join(root, "lib/regime-engine-v2/capture.ts")));
const { TICKERS } = await import(pathToFileURL(path.join(root, "lib/regime-engine-v2/contract.ts")));
const { normalizeMonthlyCatalog } = await import(pathToFileURL(path.join(root, "lib/regime-engine-v2/normalize.ts")));
const scope = captureScope(), acquired = [], attempts = [];
const collectorSourceHash = createHash("sha256").update(await readFile(new URL(import.meta.url))).digest("hex");
const startedAt = new Date().toISOString();
const acquisitionFile = path.join(directory, "market-acquisition.json");
try { await readFile(acquisitionFile); throw new Error("Acquisition already exists; retain it and use a new directory for another run"); }
catch (error) { if (error.code !== "ENOENT") throw error; }
await mkdir(directory, { recursive: true });
const sourceVersion = "p8-source-contract/1.0.0";
const period2 = Math.floor(Date.parse(startedAt) / 1000);
const period1 = period2 - 550 * 86400;
const urls = {
  vix: "https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv",
  catalog: "https://www-api.cboe.com/us/futures/market_statistics/historical_data/product/list/VX/",
  btc: "https://farside.co.uk/bitcoin-etf-flow-all-data/",
  gld: "https://www.ssga.com/library-content/products/fund-data/etfs/us/navhist-us-en-gld.xlsx",
};
async function acquire(entry, url) {
  const attempt = { ...entry, url, startedAt: new Date().toISOString(), method: "GET", redirectsFollowed: 0 };
  attempts.push(attempt);
  try {
    const capture = await scope.capture({ sourceId: entry.sourceId, sourceVersion, sourceUrl: url, origin: "PROSPECTIVE" }, async () => {
      const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(25000), headers: { "User-Agent": "Mozilla/5.0 (compatible; RegimeV2Readiness/1.0)", Accept: "*/*" } });
      attempt.httpStatus = response.status;
      attempt.contentType = response.headers.get("content-type");
      attempt.httpDateNotPublication = response.headers.get("date");
      attempt.responseUrl = response.url;
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > 8 * 1024 * 1024) throw new Error("Response exceeds existing source capture byte limit");
      return bytes;
    });
    const filename = await persistCapture(path.join(directory, "captures"), capture);
    Object.assign(attempt, { completedAt: capture.completedAt, captureId: capture.captureId, rawHash: capture.rawHash, bytes: Buffer.from(capture.rawBase64, "base64").length,
      sourcePublishedAt: "UNKNOWN", availableAt: capture.completedAt, availabilityCertainty: "CONSERVATIVE_BOUND", rawCapture: filename,
      result: attempt.httpStatus >= 200 && attempt.httpStatus < 300 ? "CAPTURED_REQUIRES_CONTRACT_VALIDATION" : "HTTP_SOURCE_UNAVAILABLE" });
    const record = { ...entry, capture, httpStatus: attempt.httpStatus };
    acquired.push(record);
    return record;
  } catch (error) {
    Object.assign(attempt, { completedAt: new Date().toISOString(), result: "FETCH_FAILED", error: error.message, cause: error.cause?.code ?? null });
    return null;
  } finally {
    await writeFile(path.join(directory, "market-attempts.json"), JSON.stringify({ startedAt, attempts }, null, 2) + "\n");
  }
}
// Bounded concurrency avoids an unbounded provider burst.
async function batch(entries) {
  const queue = [...entries];
  await Promise.all(Array.from({ length: Math.min(3, queue.length) }, async () => {
    while (queue.length) { const [entry, url] = queue.shift(); await acquire(entry, url); }
  }));
}
const equities = [...TICKERS, "SPY", "RSP", "IWM"];
await batch(equities.map(ticker => [{ kind: "YAHOO_ADJCLOSE", sourceId: "EQUITY_ADJUSTED", ticker },
  `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=1d&events=div%2Csplits&includeAdjustedClose=true`]));
await batch([
  [{ kind: "CBOE_VIX_CSV", sourceId: "VIX_OFFICIAL" }, urls.vix],
  [{ kind: "CFE_MONTHLY_CATALOG", sourceId: "VX_OFFICIAL" }, urls.catalog],
  [{ kind: "BTC_UPSTREAM_HTML", sourceId: "BTC_NATIVE" }, urls.btc],
  [{ kind: "GLD_UPSTREAM_XLSX", sourceId: "GLD_NATIVE" }, urls.gld],
]);
const catalog = acquired.find(entry => entry.kind === "CFE_MONTHLY_CATALOG" && entry.httpStatus === 200);
let monthlyIdentities = [];
if (catalog) {
  try {
    const payload = JSON.parse(Buffer.from(catalog.capture.rawBase64, "base64").toString("utf8"));
    const catalogRows = Array.isArray(payload) ? payload : Object.values(payload).flatMap(value => Array.isArray(value) ? value : []);
    monthlyIdentities = normalizeMonthlyCatalog(payload)
      .filter(identity => identity.expirationDate >= startedAt.slice(0, 10)).slice(0, 9);
    await batch(monthlyIdentities.map(identity => {
      const matches = catalogRows.filter(row => row.duration_type === "M" && row.futures_root === "VX"
        && row.expire_date === identity.expirationDate && "VX/" + String(row.product_display).split("/").at(-1) === identity.symbol);
      if (matches.length !== 1 || typeof matches[0].path !== "string") throw new Error("Monthly contract requires one explicit official catalog path");
      const url = new URL(matches[0].path, "https://cdn.cboe.com/");
      if (url.protocol !== "https:" || url.hostname !== "cdn.cboe.com" || !url.pathname.startsWith("/data/us/futures/market_statistics/historical_data/VX/") || !url.pathname.endsWith(".csv")) throw new Error("Monthly catalog path outside the frozen CFE source contract");
      return [{ kind: "CFE_MONTHLY_CSV", sourceId: "VX_OFFICIAL", identity, catalogPath: matches[0].path }, url.href];
    }));
  } catch (error) { catalog.catalogParseError = error.message; }
}
const result = { schemaVersion: "regime-v2-readiness-market-acquisition/1.0.0", startedAt, completedAt: new Date().toISOString(),
  collectorSourceHash,
  sourceVersionMeaning: "Frozen local P8 adapter contract identity; not an invented provider publication/version timestamp.",
  runtimeAsOfPolicy: "Set a new runtime wall-clock asOf at evaluation after required calendar/source acquisition; never select a historical passing cut.",
  equityRequestWindow: { period1, period2, calendarDays: 550 }, monthlyIdentities,
  attempts: attempts.sort((a, b) => a.startedAt.localeCompare(b.startedAt)), captures: acquired,
  fetchCalls: attempts.length, unobservedExternalNetwork: "UNKNOWN_OUTSIDE_THIS_COLLECTOR", shadowActivated: false, externalWrites: false };
await writeFile(acquisitionFile, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
process.stdout.write(JSON.stringify({ acquisitionFile, startedAt, completedAt: result.completedAt, fetchCalls: result.fetchCalls,
  captured: acquired.length, statuses: result.attempts.map(({ kind, ticker, identity, httpStatus, result, bytes, error, cause }) => ({ kind, ticker, identity, httpStatus, result, bytes, error, cause })) }, null, 2) + "\n");
