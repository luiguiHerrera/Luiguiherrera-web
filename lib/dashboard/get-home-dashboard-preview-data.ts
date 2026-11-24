import { getDashboardData } from "./get-dashboard-data";
import type { DashboardData } from "./types";

export type HomeDashboardPreviewData = Pick<DashboardData,
  "regimeSummary" | "sectorRotation" | "vix" | "vixTermStructure" | "marketContext">;

export async function getHomeDashboardPreviewData(): Promise<HomeDashboardPreviewData> {
  const { regimeSummary, sectorRotation, vix, vixTermStructure, marketContext } = await getDashboardData();
  return { regimeSummary, sectorRotation, vix, vixTermStructure, marketContext };
}
