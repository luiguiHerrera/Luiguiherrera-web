import { getBtcEtfFlowsModule } from "@/lib/dashboard/adapters/btc-etf-flows";
import { getFedWatchModule } from "@/lib/dashboard/adapters/fedwatch";
import { getRadarRows } from "@/lib/dashboard/adapters/radar";
import { getSectorEtfsModule } from "@/lib/dashboard/adapters/sector-etfs";
import { getVixModule } from "@/lib/dashboard/adapters/vix";
import { regimeSummary } from "@/lib/dashboard/regime-scoring";
import type { DashboardData } from "@/lib/dashboard/types";

export async function getDashboardData(): Promise<DashboardData> {
  const [sectorEtfsModule, btcEtfFlowsModule] = await Promise.all([
    getSectorEtfsModule(),
    getBtcEtfFlowsModule(),
  ]);

  return {
    dashboardModules: [
      getFedWatchModule(),
      sectorEtfsModule,
      getVixModule(),
      btcEtfFlowsModule,
    ],
    crossSignalRadar: getRadarRows(),
    regimeSummary,
  };
}
