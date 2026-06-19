import "server-only";
import { getStatisticalLevelsAsset } from "@/lib/statistical-levels/get-statistical-levels-data";

export type Sp500StatLevelsPreviewData = {
  distanceToLongAverage: number | null;
  extensionPercentile: number | null;
  latestClose: number | null;
  latestDate: string | null;
  monthlyRange: {
    high: number | null;
    low: number | null;
  };
  sparkline: Array<{
    close: number;
    date: string;
  }>;
  ticker: string;
  weeklyScale: {
    high: number | null;
    low: number | null;
  };
  weeklyRange: {
    high: number | null;
    low: number | null;
  };
  zScore: number | null;
};

export async function getSp500StatLevelsPreviewData(): Promise<Sp500StatLevelsPreviewData> {
  const asset = await getStatisticalLevelsAsset("SPY");
  const weekly = asset.frequencies.weekly;
  const weeklyWindow = weekly.windows["5Y"];
  const weeklyLevels = asset.keyStatisticalLevels.weekly.levels;
  const monthlyLevels = asset.keyStatisticalLevels.monthly.levels;

  return {
    distanceToLongAverage: weekly.mlFeatures.distance_to_long_ma ?? weekly.distanceToMovingAverages[weekly.longMovingAverageKey] ?? null,
    extensionPercentile: weeklyWindow.ma200ExtensionPercentile,
    latestClose: weekly.lastClose ?? asset.lastClose,
    latestDate: weekly.lastDate ?? asset.lastDate,
    monthlyRange: {
      high: monthlyLevels.MAHE ?? null,
      low: monthlyLevels.MALE ?? null,
    },
    sparkline: weekly.compactSeries.slice(-18).map((point) => ({
      close: point.close,
      date: point.date,
    })),
    ticker: asset.ticker,
    weeklyScale: {
      high: weeklyLevels.WSHE ?? weeklyLevels.WAHE ?? null,
      low: weeklyLevels.WSLE ?? weeklyLevels.WALE ?? null,
    },
    weeklyRange: {
      high: weeklyLevels.WAHE ?? null,
      low: weeklyLevels.WALE ?? null,
    },
    zScore: weekly.mlFeatures.extension_zscore ?? weeklyWindow.ma200ExtensionZScore,
  };
}
