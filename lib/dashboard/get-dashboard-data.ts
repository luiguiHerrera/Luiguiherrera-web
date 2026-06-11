import { getBtcEtfFlowsData } from "@/lib/dashboard/adapters/btc-etf-flows";
import { getFedWatchData } from "@/lib/dashboard/adapters/fedwatch";
import { getRadarRows } from "@/lib/dashboard/adapters/radar";
import { getSectorEtfsData } from "@/lib/dashboard/adapters/sector-etfs";
import { getVixData } from "@/lib/dashboard/adapters/vix";
import { regimeSummary } from "@/lib/dashboard/regime-scoring";
import type { DashboardData } from "@/lib/dashboard/types";

export async function getDashboardData(): Promise<DashboardData> {
  const [sectorEtfs, btcEtfFlows, fedWatchData, vixData] = await Promise.all([
    getSectorEtfsData(),
    getBtcEtfFlowsData(),
    getFedWatchData(),
    getVixData(),
  ]);

  return {
    dashboardModules: [
      fedWatchData.module,
      sectorEtfs.module,
      vixData.module,
      btcEtfFlows.module,
    ],
    crossSignalRadar: getRadarRows(),
    regimeSummary,
    sectorRotation: sectorEtfs.rotation,
    quantRisk: sectorEtfs.quantRisk,
    fedWatch: fedWatchData,
    vix: vixData,
    btcEtfFlows,
  };
}
