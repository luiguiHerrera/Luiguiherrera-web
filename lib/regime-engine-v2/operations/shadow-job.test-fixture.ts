// Synthetic operational test inputs only. No network or test registration.
import type { CaptureRecord } from "../capture.ts";
import { TICKERS } from "../contract.ts";
import { hash, bytesHash } from "../math.ts";
import { loadReviewedCalendars } from "./calendar-package.ts";
import { SOURCE_BUNDLE_VERSION, type SourceBundle, type SourceCapture } from "./source-input.ts";

export const preflight = "2026-09-09T13:02:00.000Z";
export const captured = "2026-09-09T13:02:01.000Z";
export const cut = "2026-09-09T13:03:00.000Z";
function raw(bytes: string, sourceId: string, sourceUrl: string, time = captured): CaptureRecord {
  const rawHash = bytesHash(bytes), sourceVersion = "SYNTHETIC_JOB_FIXTURE/1";
  const body = { sourceId, sourceVersion, sourceUrl, startedAt: time, completedAt: time, rawHash, rawBase64: Buffer.from(bytes).toString("base64"), origin: "PROSPECTIVE" as const,
    metadata: { sourceId, sourceVersion, vintageHash: rawHash, sourcePublishedAt: null, capturedAt: time, availableAt: time, availabilityCertainty: "CONSERVATIVE_BOUND" as const, availabilityEvidence: "SYNTHETIC_TEST_ONLY", replayClass: "R0" as const, status: "AVAILABLE" } };
  return { ...body, captureId: hash(body) };
}
// Portable synthetic raw provider-format responses, never represented as live proof.
export function syntheticBundle(preflightTime = preflight, captureTime = captured): SourceBundle {
  const makeRaw = (bytes: string, sourceId: string, sourceUrl: string) => raw(bytes, sourceId, sourceUrl, captureTime);
  const calendar = loadReviewedCalendars(preflightTime), dates = calendar.resolutions.equity.sessions;
  const captures: SourceCapture[] = [...TICKERS, "SPY", "RSP", "IWM"].map((ticker, t) => {
    const values = dates.map((_, i) => 100 * Math.exp(i * .0005 + .005 * Math.sin(i * .2) + .004 * Math.sin(i * (t + 1) * .13)));
    const payload = { chart: { result: [{ meta: { symbol: ticker, currency: "USD", exchangeTimezoneName: "America/New_York" }, timestamp: dates.map(d => Date.parse(d + "T15:00:00Z") / 1000), indicators: { adjclose: [{ adjclose: values }] } }], error: null } };
    return { kind: "YAHOO_ADJCLOSE", ticker, capture: makeRaw(JSON.stringify(payload), "EQUITY_ADJUSTED", `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`) };
  });
  captures.push({ kind: "CBOE_VIX_CSV", capture: makeRaw("DATE,OPEN,HIGH,LOW,CLOSE\n" + dates.map(d => `${d.slice(5, 7)}/${d.slice(8)}/${d.slice(0, 4)},18,19,17,18`).join("\n") + "\n", "VIX_OFFICIAL", "https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv") });
  const identities = [{ symbol: "VX/U6", expirationDate: "2026-09-16", title: "U (Sep 2026)" }, { symbol: "VX/V6", expirationDate: "2026-10-21", title: "V (Oct 2026)" }];
  captures.push({ kind: "CFE_MONTHLY_CATALOG", capture: makeRaw(JSON.stringify(identities.map(row => ({ duration_type: "M", futures_root: "VX", expire_date: row.expirationDate, product_display: row.symbol }))), "VX_OFFICIAL", "https://www-api.cboe.com/us/futures/market_statistics/historical_data/product/list/VX/") });
  identities.forEach((row, i) => captures.push({ kind: "CFE_MONTHLY_CSV", identity: { symbol: row.symbol, expirationDate: row.expirationDate }, capture: makeRaw(`Trade Date,Futures,Close,Settle\n${calendar.expectedSession},${row.title},999,${19 + i}\n`, "VX_OFFICIAL", `https://cdn.cboe.com/data/us/futures/market_statistics/historical_data/VX/VX_${row.expirationDate}.csv`) }));
  return { schemaVersion: SOURCE_BUNDLE_VERSION, mode: "R2", calendars: {}, captures };
}
