import { unstable_cache } from "next/cache";
import published from "./ofr-fsi-published.json";
import { parseOfrFsiCsv, OfrFsiDataError, type OfrFsiSnapshot } from "./ofr-fsi";
import { refreshOfrFsiSnapshot } from "./ofr-fsi-source";

export const OFR_FSI_CACHE_TAG = "ofr-fsi-publication-v1";
const seed: OfrFsiSnapshot = {
  dataset: parseOfrFsiCsv(published.csv), retrievedAt: published.retrievedAt,
  sourceHash: published.sourceHash, refreshStatus: "current",
};

/** One persistent validated publication and a small, separate refresh-status record.
 * Failed callbacks NEVER write old data over a newer successful publication.
 * Both hourly refreshes share the same source request when run together. */
export async function getOfrFsiData(): Promise<OfrFsiSnapshot> {
  let attempt: Promise<OfrFsiSnapshot> | undefined;
  const download = () => attempt ??= refreshOfrFsiSnapshot(seed);
  const readStatus = unstable_cache(async () => {
    const candidate = await download();
    return { failed: candidate.refreshStatus !== "current" };
  }, [OFR_FSI_CACHE_TAG, "refresh-status"], { revalidate: 3600, tags: [OFR_FSI_CACHE_TAG] });
  // The status record also bounds retries after an outage. A stale status read
  // starts its refresh now; both callbacks then share that attempt Promise.
  const status = await readStatus();
  const refreshPublication = async () => {
    if (status.failed && !attempt) throw new OfrFsiDataError("OFR retry deferred; retaining cached publication");
    const candidate = await download();
    if (candidate.refreshStatus !== "current") throw new OfrFsiDataError("OFR refresh failed; retaining cached publication");
    return candidate;
  };
  const readPublication = unstable_cache(refreshPublication, [OFR_FSI_CACHE_TAG], {
    revalidate: status.failed && !attempt ? false : 3600, tags: [OFR_FSI_CACHE_TAG],
  });
  const publication = await readPublication().catch(error => {
    if (!(error instanceof OfrFsiDataError)) throw error;
    return { ...seed, refreshStatus: "retained" as const, lastRefreshError: "Official source could not be refreshed" };
  });
  return status.failed ? { ...publication, refreshStatus: "retained", lastRefreshError: "Official source could not be refreshed" } : publication;
}
