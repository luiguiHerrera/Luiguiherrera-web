import { unstable_cache } from "next/cache.js";

import { getBtcEtfFlowsData } from "@/lib/dashboard/adapters/btc-etf-flows";
import { getSectorEtfsData } from "@/lib/dashboard/adapters/sector-etfs";
import { getVixData } from "@/lib/dashboard/adapters/vix";
import { getVixTermStructureData } from "@/lib/dashboard/adapters/vix-term-structure";
import { buildRegimeSummary } from "@/lib/dashboard/regime-scoring";
import type { RegimeSummary, SectorRotationData, VixDashboardData, VixTermStructureData } from "@/lib/dashboard/types";

export type HomeDashboardPreviewData = {
  regimeSummary: RegimeSummary;
  sectorRotation: SectorRotationData | null;
  vix: VixDashboardData | null;
  vixTermStructure: VixTermStructureData | null;
};

const getCachedHomeDashboardPreviewData = unstable_cache(async (): Promise<HomeDashboardPreviewData> => {
  const [sectorEtfs, btcEtfFlows, vix, vixTermStructure] = await Promise.all([
    getSectorEtfsData(),
    getBtcEtfFlowsData(),
    getVixData(),
    getVixTermStructureData(),
  ]);

  const regimeSummary = buildRegimeSummary({
    btcEtfFlows,
    sectorRotation: sectorEtfs.rotation,
    vix,
  });

  return {
    regimeSummary,
    sectorRotation: sectorEtfs.rotation,
    vix,
    vixTermStructure,
  };
}, ["home-dashboard-preview-data-v1"], { revalidate: 21600 });

export function getHomeDashboardPreviewData() {
  return getCachedHomeDashboardPreviewData();
}
