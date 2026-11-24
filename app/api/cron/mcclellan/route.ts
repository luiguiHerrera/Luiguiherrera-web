import { timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { getCachedMcClellanSource, MCCLELLAN_CACHE_TAG } from "@/lib/dashboard/get-mcclellan-data";
import { buildMcClellanData, fetchMcClellanSource, McClellanSourceError } from "@/lib/dashboard/mcclellan-source.mjs";

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
    // Preflight happens before invalidation, preserving the last valid cache on provider failure.
    const candidate = buildMcClellanData(await fetchMcClellanSource());
    revalidateTag(MCCLELLAN_CACHE_TAG, "max");
    await getCachedMcClellanSource(); // triggers Next's validated background refresh
    revalidatePath("/dashboard");
    return Response.json({ refreshRequested: true, cutoffDate: candidate.cutoffDate, sourceCommit: candidate.sourceCommit });
  } catch (error) {
    if (!(error instanceof McClellanSourceError)) throw error;
    return Response.json({ refreshRequested: false, retainedPrevious: true, error: "Validated source not available" }, { status: 503 });
  }
}
