import { buildRiskIndicatorReferences } from './risk-indicator-history.ts';
import { createHash } from "node:crypto";
import { isClosed, isSession } from "../research/mcclellan-core.mjs";
import { historicalSpyRisk, sectorAbsorptionRatio, SECTOR_RISK_SYMBOLS, type RiskPriceHistory, type RiskPricePoint } from "./historical-risk.ts";
import type { HistoricalRiskMetrics } from "./risk-metric-types.ts";

export const RISK_HISTORY_SOURCE_NAME = "Yahoo Finance · cierres diarios ajustados";
export const RISK_HISTORY_SOURCE_URL = "https://help.yahoo.com/kb/SLN28256.html";
export const RISK_HISTORY_ADJUSTMENT = "Cierres ajustados por splits y distribuciones";
export class RiskHistorySourceError extends Error {}

// Extend the dashboard's existing independently specified NYSE calendar to
// cover the full five-year SPY window. Juneteenth first closed NYSE in 2022.
const EARLIER_HOLIDAYS = new Set([
  "2020-01-01", "2020-01-20", "2020-02-17", "2020-04-10", "2020-05-25", "2020-07-03", "2020-09-07", "2020-11-26", "2020-12-25",
  "2021-01-01", "2021-01-18", "2021-02-15", "2021-04-02", "2021-05-31", "2021-07-05", "2021-09-06", "2021-11-25", "2021-12-24",
  "2022-01-17", "2022-02-21", "2022-04-15", "2022-05-30", "2022-06-20", "2022-07-04", "2022-09-05", "2022-11-24", "2022-12-26",
  "2023-01-02", "2023-01-16", "2023-02-20", "2023-04-07", "2023-05-29", "2023-06-19", "2023-07-04", "2023-09-04", "2023-11-23", "2023-12-25",
]);

export function riskSessionDates(start: string, end: string) {
  if (![start, end].every(value => /^\d{4}-\d{2}-\d{2}$/.test(value)) || start < "2020-01-01" || end > "2028-12-31" || start > end) {
    throw new RiskHistorySourceError("Risk trading-session calendar is outside its verified 2020–2028 coverage");
  }
  const dates: string[] = [];
  for (const day = new Date(start + "T12:00:00Z"); day.toISOString().slice(0, 10) <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    const date = day.toISOString().slice(0, 10);
    if (date >= "2024-01-01" ? isSession(date) : ![0, 6].includes(day.getUTCDay()) && !EARLIER_HOLIDAYS.has(date)) dates.push(date);
  }
  return dates;
}

export function latestRiskSession(asOf = new Date().toISOString()) {
  if (!Number.isFinite(Date.parse(asOf))) throw new RiskHistorySourceError("Invalid risk observation timestamp");
  const day = new Date(asOf);
  for (let n = 0; n < 14; n++, day.setUTCDate(day.getUTCDate() - 1)) {
    const date = day.toISOString().slice(0, 10);
    if (isClosed(date, asOf)) return date;
  }
  throw new RiskHistorySourceError("No completed exchange session available");
}

export type RiskHistorySource = {
  schema: "dashboard-adjusted-risk-history.v1";
  acquiredAt: string;
  cutoffDate: string;
  spy: RiskPricePoint[];
  sectors: RiskPriceHistory[];
  references?: HistoricalRiskMetrics["references"];
  provenance: { symbol: string; sha256: string; sourceUrl: string; adjustedClose: true }[];
};

/** Strictly consume the provider's adjusted field; raw quote.close is never a substitute. */
export function parseRiskYahooChart(payload: unknown, symbol: string, cutoffDate: string, count: number, retainAvailableHistory = false): RiskPricePoint[] {
  const chart = (payload as { chart?: { error?: unknown; result?: Array<{ meta?: { symbol?: string; currency?: string; exchangeTimezoneName?: string; dataGranularity?: string }; timestamp?: number[]; indicators?: { adjclose?: { adjclose?: (number | null)[] }[] } }> } })?.chart;
  const result = chart?.result?.[0];
  const adjusted = result?.indicators?.adjclose?.[0]?.adjclose;
  if (chart?.error || result?.meta?.symbol !== symbol || result.meta.currency !== "USD" || result.meta.exchangeTimezoneName !== "America/New_York" ||
      result.meta.dataGranularity !== "1d" || !result.timestamp?.length || !Array.isArray(adjusted) || adjusted.length !== result.timestamp.length) {
    throw new RiskHistorySourceError(`Missing verified adjusted daily prices for ${symbol}`);
  }
  const rows: RiskPricePoint[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < result.timestamp.length; index++) {
    const timestamp = result.timestamp[index];
    if (!Number.isFinite(timestamp)) throw new RiskHistorySourceError(`Invalid daily timestamp for ${symbol}`);
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
    if (seen.has(date)) throw new RiskHistorySourceError(`Duplicate daily session for ${symbol}`);
    seen.add(date);
    if (date > cutoffDate) continue;
    const close = adjusted[index];
    // Preserve a missing session as absent; the fixed-calendar check below
    // rejects its window rather than joining prices across the missing day.
    if (typeof close === "number" && Number.isFinite(close) && close > 0) rows.push({ date, close });
  }
  const dates = riskSessionDates("2020-01-01", cutoffDate).slice(-count);
  const indexed = new Map(rows.map(row => [row.date, row]));
  const missing = dates.filter(date => !indexed.has(date));
  if (dates.length !== count || missing.length) throw new RiskHistorySourceError(`${symbol} adjusted closes: ${count - missing.length}/${count}; missing session ${missing[0] ?? "calendar coverage"}`);
  return retainAvailableHistory ? rows.filter(row=>row.date >= "2020-01-01").sort((a,b)=>a.date.localeCompare(b.date)) : dates.map(date => indexed.get(date)!);
}

export function metricsFromRiskHistory(source: RiskHistorySource, asOf = new Date().toISOString()): HistoricalRiskMetrics {
  const requiredSymbols: string[] = ["SPY", ...SECTOR_RISK_SYMBOLS];
  if (source.schema !== "dashboard-adjusted-risk-history.v1" || !Number.isFinite(Date.parse(source.acquiredAt)) || source.acquiredAt > asOf ||
      source.cutoffDate > asOf.slice(0, 10) || source.provenance.length !== requiredSymbols.length || new Set(source.provenance.map(item => item.symbol)).size !== requiredSymbols.length ||
      requiredSymbols.some(symbol => !source.provenance.some(item => item.symbol === symbol)) ||
      source.provenance.some(item => !item.adjustedClose || !/^[a-f0-9]{64}$/.test(item.sha256))) {
    throw new RiskHistorySourceError("Invalid adjusted risk history provenance");
  }
  const sessions = riskSessionDates("2020-01-01", source.cutoffDate);
  return {
    references: source.references,
    spy: historicalSpyRisk(source.spy, sessions, source.cutoffDate),
    absorption: sectorAbsorptionRatio(source.sectors, sessions, source.cutoffDate),
    sourceName: RISK_HISTORY_SOURCE_NAME,
    sourceUrl: RISK_HISTORY_SOURCE_URL,
    adjustment: RISK_HISTORY_ADJUSTMENT,
    updatedAt: source.acquiredAt,
    updateStatus: source.cutoffDate === latestRiskSession(asOf) ? "current" : "retained",
  };
}

/** Same free Yahoo chart provider already used by the hosted AC producer. */
export async function fetchHistoricalRiskSource({ fetcher = fetch, asOf = new Date().toISOString() } = {}): Promise<RiskHistorySource> {
  try {
    const cutoffDate = latestRiskSession(asOf);
    const symbols = ["SPY", ...SECTOR_RISK_SYMBOLS];
    const records = await Promise.all(symbols.map(async symbol => {
      const params = new URLSearchParams({ period1: String(Math.floor(Date.parse("2020-01-01T00:00:00Z") / 1000)), period2: String(Math.floor(Date.parse(asOf) / 1000)), interval: "1d", events: "div,splits", includeAdjustedClose: "true" });
      const sourceUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?${params}`;
      const response = await fetcher(sourceUrl, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12000), headers: { "User-Agent": "luiguiherrera-market-lab/1.0 educational risk calculations", Accept: "application/json" } });
      if (!response.ok) throw new RiskHistorySourceError(`Adjusted history HTTP ${response.status}`);
      const bytes = await response.text();
      if (bytes.length > 2_000_000) throw new RiskHistorySourceError("Adjusted source exceeds size limit");
      const prices = parseRiskYahooChart(JSON.parse(bytes), symbol, cutoffDate, symbol === "SPY" ? 1261 : 501, true);
      return { symbol, prices, provenance: { symbol, sha256: createHash("sha256").update(bytes).digest("hex"), sourceUrl, adjustedClose: true as const } };
    }));
    const source: RiskHistorySource = { schema: "dashboard-adjusted-risk-history.v1", acquiredAt: asOf, cutoffDate,
      spy: records[0].prices, sectors: records.slice(1).map(({ symbol, prices }) => ({ symbol, prices })), provenance: records.map(record => record.provenance) };
    const metrics = metricsFromRiskHistory(source, asOf);
    if (metrics.spy.status !== "available" || metrics.absorption.status !== "available") throw new RiskHistorySourceError("Adjusted history did not produce valid fixed-window risk metrics");
    source.references = buildRiskIndicatorReferences(source, riskSessionDates("2020-01-01", cutoffDate));
    return source;
  } catch (error) {
    if (error instanceof RiskHistorySourceError || error instanceof Error && "digest" in error) throw error;
    throw new RiskHistorySourceError("Verified adjusted risk histories unavailable", { cause: error });
  }
}

