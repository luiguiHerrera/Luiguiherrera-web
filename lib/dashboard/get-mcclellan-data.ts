import "server-only";
import { unstable_cache } from "next/cache.js";
import { buildMcClellanData, fetchMcClellanSource, McClellanSourceError } from "./mcclellan-source.mjs";
import { createDevelopmentSourceCache } from "./development-source-cache.mjs";

export const MCCLELLAN_CACHE_TAG = "dashboard-mcclellan-source-v1";
// Only validated, complete, calendar-closed candidates enter persistent Next/Vercel cache.
// A failed background refresh keeps the previous successful entry.
const readPersistentMcClellanSource = unstable_cache(
  () => fetchMcClellanSource(),
  [MCCLELLAN_CACHE_TAG],
  { revalidate: process.env.NODE_ENV === "development" ? false : 3600, tags: [MCCLELLAN_CACHE_TAG] },
);
const getDevelopmentMcClellanSource = createDevelopmentSourceCache({
  load: () => fetchMcClellanSource(),
  readPrevious: () => readPersistentMcClellanSource(),
  isSourceError: error => error instanceof McClellanSourceError,
});
export const getCachedMcClellanSource = () => process.env.NODE_ENV === "development"
  ? getDevelopmentMcClellanSource("mcclellan")
  : readPersistentMcClellanSource();

export async function getMcClellanData() {
  try {
    // Freshness is evaluated at consumption time, independently of the cached calculation.
    return buildMcClellanData(await getCachedMcClellanSource());
  } catch (error) {
    if (!(error instanceof McClellanSourceError)) throw error;
    console.warn("[dashboard:mcclellan] Source unavailable; no fabricated fallback");
    return null;
  }
}
