import { getDashboardData } from "./get-dashboard-data";
import { getOfrFsiData } from "./get-ofr-fsi-data";
import type { OfrFsiSnapshot } from "./ofr-fsi";
import type { DashboardData } from "./types";

export type HomeDashboardPreviewData = Pick<DashboardData,
  "regimeSummary" | "sectorRotation" | "vix" | "vixTermStructure" | "marketContext"> & { financialEnvironment: OfrFsiSnapshot };

export async function getHomeDashboardPreviewData(): Promise<HomeDashboardPreviewData> {
  const [dashboard, financialEnvironment] = await Promise.all([getDashboardData(), getOfrFsiData()]);
  const { regimeSummary, sectorRotation, vix, vixTermStructure, marketContext } = dashboard;
  return { regimeSummary, sectorRotation, vix, vixTermStructure, marketContext, financialEnvironment };
}
