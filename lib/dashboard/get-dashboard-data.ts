import { getBtcEtfFlowsModule } from "@/lib/dashboard/adapters/btc-etf-flows";
import { getFedWatchModule } from "@/lib/dashboard/adapters/fedwatch";
import { getRadarRows } from "@/lib/dashboard/adapters/radar";
import { getSectorEtfsData } from "@/lib/dashboard/adapters/sector-etfs";
import { getVixData } from "@/lib/dashboard/adapters/vix";
import { regimeSummary } from "@/lib/dashboard/regime-scoring";
import type { DashboardData } from "@/lib/dashboard/types";

export async function getDashboardData(): Promise<DashboardData> {
  const [sectorEtfs, btcEtfFlowsModule, vixData] = await Promise.all([
    getSectorEtfsData(),
    getBtcEtfFlowsModule(),
    getVixData(),
  ]);

  return {
    dashboardModules: [
      getFedWatchModule(),
      sectorEtfs.module,
      vixData.module,
      btcEtfFlowsModule,
    ],
    crossSignalRadar: getRadarRows(),
    regimeSummary,
    sectorRotation: sectorEtfs.rotation,
    quantRisk: sectorEtfs.quantRisk,
    vix: vixData,
  };
}
