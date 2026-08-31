import { cache } from "react";

import { getBtcEtfFlowsData } from "@/lib/dashboard/adapters/btc-etf-flows";
import { getGldFlowPressure } from "@/lib/dashboard/adapters/gld-flow-pressure";
import { getRadarRows } from "@/lib/dashboard/adapters/radar";
import { getSectorEtfsData } from "@/lib/dashboard/adapters/sector-etfs";
import { getVixData } from "@/lib/dashboard/adapters/vix";
import { getVixTermStructureData } from "@/lib/dashboard/adapters/vix-term-structure";
import { buildRegimeSummary } from "@/lib/dashboard/regime-scoring";
import type { DashboardData } from "@/lib/dashboard/types";

export const getDashboardData = cache(async (): Promise<DashboardData> => {
  const [sectorEtfs, btcEtfFlows, vixData, vixTermStructure, gldFlowPressure] = await Promise.all([
    getSectorEtfsData(),
    getBtcEtfFlowsData(),
    getVixData(),
    getVixTermStructureData(),
    getGldFlowPressure(),
  ]);
  const regimeSummary = buildRegimeSummary({
    btcEtfFlows,
    sectorRotation: sectorEtfs.rotation,
    vix: vixData,
  });

  return {
    dashboardModules: [
      sectorEtfs.module,
      vixData.module,
      btcEtfFlows.module,
    ],
    crossSignalRadar: getRadarRows(),
    regimeSummary,
    sectorModule: sectorEtfs.module,
    sectorRotation: sectorEtfs.rotation,
    quantRisk: sectorEtfs.quantRisk,
    vix: vixData,
    vixTermStructure,
    btcEtfFlows,
    ethEtfFlows: null,
    gldFlowPressure,
  };
});
