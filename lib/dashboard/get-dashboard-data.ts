import { getBtcEtfFlowsData } from "@/lib/dashboard/adapters/btc-etf-flows";
import { getFedWatchData } from "@/lib/dashboard/adapters/fedwatch";
import { getGldFlowPressure } from "@/lib/dashboard/adapters/gld-flow-pressure";
import { getRadarRows } from "@/lib/dashboard/adapters/radar";
import { getSectorEtfsData } from "@/lib/dashboard/adapters/sector-etfs";
import { getVixData } from "@/lib/dashboard/adapters/vix";
import { getVixTermStructureData } from "@/lib/dashboard/adapters/vix-term-structure";
import { buildRegimeSummary } from "@/lib/dashboard/regime-scoring";
import type { DashboardData } from "@/lib/dashboard/types";

export async function getDashboardData(): Promise<DashboardData> {
  const [sectorEtfs, btcEtfFlows, fedWatchData, vixData, vixTermStructure, gldFlowPressure] = await Promise.all([
    getSectorEtfsData(),
    getBtcEtfFlowsData(),
    getFedWatchData(),
    getVixData(),
    getVixTermStructureData(),
    getGldFlowPressure(),
  ]);
  const regimeSummary = buildRegimeSummary({
    btcEtfFlows,
    fedWatch: fedWatchData,
    sectorRotation: sectorEtfs.rotation,
    vix: vixData,
  });

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
    vixTermStructure,
    btcEtfFlows,
    ethEtfFlows: null,
    gldFlowPressure,
  };
}
