import { cache } from "react";
import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache.js";

import { getBtcEtfFlowsData } from "@/lib/dashboard/adapters/btc-etf-flows";
import { getGldFlowPressure } from "@/lib/dashboard/adapters/gld-flow-pressure";
import { getRadarRows } from "@/lib/dashboard/adapters/radar";
import { getSectorEtfsData } from "@/lib/dashboard/adapters/sector-etfs";
import { getVixData } from "@/lib/dashboard/adapters/vix";
import { getVixTermStructureData } from "@/lib/dashboard/adapters/vix-term-structure";
import { buildRegimeSummary } from "@/lib/dashboard/regime-scoring";
import type { DashboardData } from "@/lib/dashboard/types";
import { getMcClellanData } from "./get-mcclellan-data";
import { getPublishedCapitalFlows } from "./get-published-capital-flows";
import { getPublishedEwjFlows } from "./get-ewj-capital-flows";

async function loadDashboardSnapshot(): Promise<DashboardData> {
  const [sectorEtfs, btcEtfFlows, vixData, vixTermStructure, gldFlowPressure, breadth, publishedFlows] = await Promise.all([
    getSectorEtfsData(),
    getBtcEtfFlowsData(),
    getVixData(),
    getVixTermStructureData(),
    getGldFlowPressure(),
    getMcClellanData(),
    getPublishedCapitalFlows(),
  ]);
  const regimeSummary = buildRegimeSummary({
    btcEtfFlows,
    sectorRotation: sectorEtfs.rotation,
    vix: vixData,
  });

  const data: DashboardData = {
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
  const flows = [...publishedFlows, getPublishedEwjFlows()];
  const id = createHash("sha256").update(JSON.stringify({ data, breadth, flows })).digest("hex");
  return { ...data, marketContext: { id, capturedAt: new Date().toISOString(), breadth, flows } };
}

// A single, locale-independent snapshot, including explicit partial availability.
const getSharedDashboardSnapshot = unstable_cache(loadDashboardSnapshot,
  ["dashboard-shared-market-snapshot-v3-no-sector-index"], { revalidate: 300, tags: ["dashboard-shared-market-snapshot"] });
export const getDashboardData = cache(getSharedDashboardSnapshot);
