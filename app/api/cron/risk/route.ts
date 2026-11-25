import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { getCachedHistoricalRiskSource, HISTORICAL_RISK_CACHE_TAG } from "@/lib/dashboard/get-historical-risk";
import { fetchHistoricalRiskSource, RiskHistorySourceError } from "@/lib/dashboard/risk-history-source";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = new TextEncoder().encode(request.headers.get("authorization") ?? "");
  const expected = new TextEncoder().encode(`Bearer ${secret ?? ""}`);
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // Validate all adjusted histories before invalidating the last successful entry.
    const candidate = await fetchHistoricalRiskSource();
    revalidateTag(HISTORICAL_RISK_CACHE_TAG, "max");
    await getCachedHistoricalRiskSource();
    for (const path of ["/dashboard", "/en/dashboard", "/dashboard/preview-riesgo", "/en/dashboard/risk-preview"]) revalidatePath(path);
    return Response.json({ refreshRequested: true, validatedCutoff: candidate.cutoffDate });
  } catch (error) {
    if (!(error instanceof RiskHistorySourceError)) throw error;
    return Response.json({ refreshRequested: false, retainedPrevious: true, error: "Verified adjusted history unavailable" }, { status: 503 });
  }
}
