import { sourceForSnapshot } from "@/lib/statistical-levels/published-data";
import { RUNTIME_SCHEMA, validateRuntimeAsset } from "@/lib/statistical-levels/runtime-snapshot";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ticker = url.searchParams.get("asset") ?? "";
  const id = url.searchParams.get("snapshot") ?? "";
  const revision = url.searchParams.get("revision");
  if ((revision !== null && !/^[0-9a-f]{40}$/.test(revision)) || url.searchParams.size !== (revision === null ? 2 : 3) || !/^[A-Z0-9.-]{1,12}$/.test(ticker) || !/^[0-9a-f]{64}$/.test(id)) {
    return Response.json({ error: "ASSET_REQUEST_REJECTED" }, { status: 400, headers });
  }
  try {
    const release = await sourceForSnapshot(id, revision);
    if (!release) return Response.json({ error: "SNAPSHOT_CHANGED" }, { status: 409, headers });
    const { source, snapshot } = release;
    if (!Object.hasOwn(snapshot.records, ticker)) return Response.json({ error: "ASSET_REQUEST_REJECTED" }, { status: 400, headers });
    const [asset, seasonality] = await Promise.all([source.getAsset(ticker), source.getSeasonality(ticker)]);
    const payload = { schema: RUNTIME_SCHEMA, ticker, snapshot: id, asset, seasonality };
    await validateRuntimeAsset(payload, ticker, snapshot);
    return Response.json(payload, { headers });
  } catch {
    return Response.json({ error: "ASSET_UNAVAILABLE" }, { status: 503, headers });
  }
}
