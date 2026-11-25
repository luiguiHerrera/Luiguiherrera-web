import { timingSafeEqual } from "node:crypto";
import { getOfrFsiData } from "@/lib/dashboard/get-ofr-fsi-data";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = new TextEncoder().encode(request.headers.get("authorization") ?? "");
  const expected = new TextEncoder().encode(`Bearer ${secret ?? ""}`);
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Daily hosted access also triggers the hourly validated cache refresh. Next
  // completes background refreshes after the response; no local machine is used.
  const snapshot = await getOfrFsiData();
  return Response.json({ refreshRequested: true, observationDate: snapshot.dataset.observations.at(-1)?.date, retrievedAt: snapshot.retrievedAt, refreshStatus: snapshot.refreshStatus });
}
