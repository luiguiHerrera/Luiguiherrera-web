import { readFile } from "node:fs/promises";
import path from "node:path";
import type { StatisticalLevelsSeasonalityGeneratedData } from "@/lib/statistical-levels/types";

const seasonalityDataPath = path.join(process.cwd(), "lib/statistical-levels/generated-seasonality-data.json");

export async function getStatisticalLevelsSeasonalityData(): Promise<StatisticalLevelsSeasonalityGeneratedData> {
  const raw = await readFile(seasonalityDataPath, "utf8");
  return JSON.parse(raw) as StatisticalLevelsSeasonalityGeneratedData;
}
