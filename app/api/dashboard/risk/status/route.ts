import { getHistoricalRiskMetrics } from "@/lib/dashboard/get-historical-risk";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const metrics = await getHistoricalRiskMetrics();
  return Response.json({ metrics, specification: {
    spy: { symbol: "SPY", currency: "USD", exposure: "unlevered long", sessions: 1, confidence: 0.95, returns: 1260, closes: 1261, tailObservations: 63, varNearestRank: 1197 },
    absorption: { universe: ["XLB", "XLC", "XLE", "XLF", "XLI", "XLK", "XLP", "XLRE", "XLU", "XLV", "XLY"], returns: 500, halfLife: 250, components: 2, matrix: "weighted centered covariance" },
  } }, { headers: { "Cache-Control": "no-store" } });
}
