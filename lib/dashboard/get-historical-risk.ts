import "server-only";
import { unstable_cache } from "next/cache";
import seed from "./risk-history-seed.json";
import { fetchHistoricalRiskSource, metricsFromRiskHistory, RiskHistorySourceError, type RiskHistorySource } from "./risk-history-source";
import type { HistoricalRiskMetrics } from "./risk-metric-types";

export const HISTORICAL_RISK_CACHE_TAG = "dashboard-adjusted-risk-history-v1";

// Persist the validated adjusted closes and source hashes across requests and
// deployments, using the dashboard's existing hosted Next/Vercel Data Cache.
// A throwing refresh cannot replace its last successful history with a failure.
export const getCachedHistoricalRiskSource = unstable_cache(
  () => fetchHistoricalRiskSource(),
  [HISTORICAL_RISK_CACHE_TAG],
  { revalidate: 86400, tags: [HISTORICAL_RISK_CACHE_TAG] },
);

export async function getHistoricalRiskMetrics(): Promise<HistoricalRiskMetrics> {
  try { return metricsFromRiskHistory(await getCachedHistoricalRiskSource()); }
  catch (error) {
    if (!(error instanceof RiskHistorySourceError)) throw error;
    // This immutable, SHA-verified AC raw archive is a last-valid cold-cache
    // history, never synthetic observations or a fresh-date replacement.
    return { ...metricsFromRiskHistory(seed as RiskHistorySource), updateStatus: "retained" };
  }
}
