import { getBtcEtfFlowsData } from "@/lib/dashboard/adapters/btc-etf-flows";
import { getFedWatchData } from "@/lib/dashboard/adapters/fedwatch";
import { getSectorEtfsData } from "@/lib/dashboard/adapters/sector-etfs";
import { getVixData } from "@/lib/dashboard/adapters/vix";
import { buildRegimeSummary } from "@/lib/dashboard/regime-scoring";
import type { BtcEtfFlowsDashboardData, RegimeSummary, SectorRotationData, VixDashboardData } from "@/lib/dashboard/types";

export type HomeDashboardPreviewData = {
  regimeSummary: RegimeSummary;
  sectorRotation: SectorRotationData | null;
  vix: VixDashboardData | null;
  btcEtfFlows: BtcEtfFlowsDashboardData | null;
};

export async function getHomeDashboardPreviewData(): Promise<HomeDashboardPreviewData> {
  const [sectorEtfs, btcEtfFlows, fedWatch, vix] = await Promise.all([
    getSectorEtfsData(),
    getBtcEtfFlowsData(),
    getFedWatchData(),
    getVixData(),
  ]);

  const regimeSummary = buildRegimeSummary({
    btcEtfFlows,
    fedWatch,
    sectorRotation: sectorEtfs.rotation,
    vix,
  });

  return {
    regimeSummary,
    sectorRotation: sectorEtfs.rotation,
    vix,
    btcEtfFlows,
  };
}
