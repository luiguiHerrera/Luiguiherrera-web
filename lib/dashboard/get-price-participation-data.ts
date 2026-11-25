import "server-only";
import { unstable_cache } from "next/cache";
import { loadPublishedPage, sourceForSnapshot } from "../statistical-levels/published-data";
import {
  loadPriceParticipationPublication, PriceParticipationSourceError,
  type PriceParticipationPublication,
} from "./price-participation-source";

export const PRICE_PARTICIPATION_CACHE_TAG = "dashboard-price-participation-publication-v1";

// Only a complete, validated publication resolves this callback. Next retains
// its last successful value if a background refresh rejects. On a cold failure
// there is no fabricated seed or alternate provider to substitute.
const readPriceParticipationPublication = unstable_cache(
  () => loadPriceParticipationPublication({ loadPublishedPage, sourceForSnapshot }),
  [PRICE_PARTICIPATION_CACHE_TAG],
  { revalidate: 3600, tags: [PRICE_PARTICIPATION_CACHE_TAG] },
);

export async function getPriceParticipationData(): Promise<PriceParticipationPublication | null> {
  try { return await readPriceParticipationPublication(); }
  catch (error) {
    if (!(error instanceof PriceParticipationSourceError)) throw error;
    console.warn("[dashboard:price-participation] Verified prices unavailable; no fabricated fallback");
    return null;
  }
}
