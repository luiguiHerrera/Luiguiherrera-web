import { getBtcEtfFlowsData } from "@/lib/dashboard/adapters/btc-etf-flows";
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
  const [sectorEtfs, btcEtfFlows, vix] = await Promise.all([
    getSectorEtfsData(),
    getBtcEtfFlowsData(),
    getVixData(),
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
    btcEtfFlows,
  };
}
