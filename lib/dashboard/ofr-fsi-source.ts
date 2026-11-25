import { createHash } from "node:crypto";
import { OfrFsiDataError, parseOfrFsiCsv, type OfrFsiSnapshot } from "./ofr-fsi.ts";

export const OFR_FSI_SOURCE_URL = "https://www.financialresearch.gov/financial-stress-index/data/fsi.csv";

/** A rejected refresh retains the complete previous publication and both dates. */
export async function refreshOfrFsiSnapshot(
  previous: OfrFsiSnapshot,
  fetcher: typeof fetch = fetch,
  now: () => Date = () => new Date(),
): Promise<OfrFsiSnapshot> {
  const retained = (): OfrFsiSnapshot => ({ ...previous, refreshStatus: "retained", lastRefreshError: "Official source could not be refreshed" });
  let csv: string;
  try {
    const response = await fetcher(OFR_FSI_SOURCE_URL, {
      cache: "no-store", signal: AbortSignal.timeout(20_000), headers: { Accept: "text/csv" },
    });
    if (!response.ok) return retained();
    csv = await response.text();
  } catch (error) {
    // Fetch's network errors and timeouts only; parsing/programming errors below
    // are not mistaken for transport failures.
    if (!(error instanceof TypeError || error instanceof DOMException)) throw error;
    return retained();
  }
  let dataset;
  try {
    dataset = parseOfrFsiCsv(csv);
    if (!dataset.observations.some(row => row.fsi !== null)) throw new OfrFsiDataError("OFR publication has no index values");
  } catch (error) {
    if (!(error instanceof OfrFsiDataError)) throw error;
    return retained();
  }
  // Missing contributions remain null. They never cause a reconstructed FSI.
  return { dataset, retrievedAt: now().toISOString(), sourceHash: createHash("sha256").update(csv).digest("hex"), refreshStatus: "current" };
}
