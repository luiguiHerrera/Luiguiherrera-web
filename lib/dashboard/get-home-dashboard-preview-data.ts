import { unstable_cache } from "next/cache.js";

import { getBtcEtfFlowsData } from "@/lib/dashboard/adapters/btc-etf-flows";
import { assertUsableSectorRotation, getStrictSectorEtfsData, SectorDataUnavailableError } from "@/lib/dashboard/adapters/sector-etfs";
import { getVixData } from "@/lib/dashboard/adapters/vix";
import { getVixTermStructureData } from "@/lib/dashboard/adapters/vix-term-structure";
import { buildRegimeSummary } from "@/lib/dashboard/regime-scoring";
import type { BtcEtfFlowsDashboardData, RegimeSummary, SectorRotationData, VixDashboardData, VixTermStructureData } from "@/lib/dashboard/types";

export type HomeDashboardPreviewData = {
  regimeSummary: RegimeSummary;
  sectorRotation: SectorRotationData | null;
  vix: VixDashboardData | null;
  vixTermStructure: VixTermStructureData | null;
};

type HomeSnapshot = Omit<HomeDashboardPreviewData, "regimeSummary"> & {
  btcEtfFlows: BtcEtfFlowsDashboardData | null;
};

// Carries only this operation's completed inputs; never stored as a cache value.
class HomeSectorUnavailableError extends Error {
  constructor(readonly snapshot: HomeSnapshot) {
    super("Home sector snapshot unavailable; cache not updated");
  }
}

const getCachedHomeDashboardPreviewData = unstable_cache(async (): Promise<HomeSnapshot> => {
  const [sectorEtfs, btcEtfFlows, vix, vixTermStructure] = await Promise.all([
    getStrictSectorEtfsData().catch((error: unknown) => {
      if (!(error instanceof SectorDataUnavailableError)) throw error;
      return error;
    }),
    getBtcEtfFlowsData(),
    getVixData(),
    getVixTermStructureData(),
  ]);

  const snapshot: HomeSnapshot = {
    btcEtfFlows,
    sectorRotation: sectorEtfs instanceof SectorDataUnavailableError ? null : sectorEtfs.rotation,
    vix,
    vixTermStructure,
  };
  if (sectorEtfs instanceof SectorDataUnavailableError) throw new HomeSectorUnavailableError(snapshot);
  try {
    assertUsableSectorRotation(snapshot.sectorRotation);
  } catch (error) {
    if (!(error instanceof SectorDataUnavailableError)) throw error;
    throw new HomeSectorUnavailableError(snapshot);
  }
  return snapshot;
}, ["home-dashboard-preview-data-v2-valid-sector"], { revalidate: 21600 });

export async function getHomeDashboardPreviewData() {
  let snapshot: HomeSnapshot;
  try {
    snapshot = await getCachedHomeDashboardPreviewData();
  } catch (error) {
    if (!(error instanceof HomeSectorUnavailableError)) throw error;
    snapshot = error.snapshot;
  }
  try {
    assertUsableSectorRotation(snapshot.sectorRotation);
  } catch (error) {
    if (!(error instanceof SectorDataUnavailableError)) throw error;
    snapshot = { ...snapshot, sectorRotation: null };
  }
  return {
    regimeSummary: buildRegimeSummary(snapshot),
    sectorRotation: snapshot.sectorRotation,
    vix: snapshot.vix,
    vixTermStructure: snapshot.vixTermStructure,
  } satisfies HomeDashboardPreviewData;
}
