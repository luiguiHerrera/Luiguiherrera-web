import type { WeeklyReportData } from "../reports/build-weekly-report-data.ts";

export type MarketBreadthValues = {
  rspVsSpy: string;
  iwmVsSpy: string;
  qqqVsSpy: string;
  positiveSectors: string;
  sectorsOverLongAverage: string;
};

function formatPpSpread(value: number | null | undefined, benchmark: number | null | undefined, pending: string, flat: string) {
  if (value === null || value === undefined || benchmark === null || benchmark === undefined) return pending;
  const spread = (value - benchmark) * 100;
  if (Math.abs(spread) < 0.05) return flat;
  return `${spread > 0 ? "+" : ""}${spread.toFixed(1)} pp`;
}

export function buildMarketBreadthValues(data: WeeklyReportData, locale: "es" | "en"): MarketBreadthValues {
  const statsByTicker = new Map(data.statisticalLevels.map((asset) => [asset.ticker, asset]));
  const spyLevel = statsByTicker.get("SPY");
  const rspLevel = statsByTicker.get("RSP");
  const iwmLevel = statsByTicker.get("IWM");
  const qqqLevel = statsByTicker.get("QQQ");
  const sectorStats = data.statisticalLevels.filter((asset) => asset.ticker.startsWith("XL"));
  const sectorsPositive = data.sectors.data?.sectors.filter((sector) => sector.return1w > 0).length ?? null;
  const sectorTotal = data.sectors.data?.sectors.length ?? null;
  const sectorsOverLongAverage = sectorStats.filter((asset) => (asset.distanceToLongAverage ?? -Infinity) > 0).length;
  const pending = locale === "en" ? "Pending" : "Pendiente";
  const flat = locale === "en" ? "Flat" : "Plano";

  return {
    rspVsSpy: spyLevel && rspLevel ? formatPpSpread(rspLevel.returns["1W"], spyLevel.returns["1W"], pending, flat) : pending,
    iwmVsSpy: spyLevel && iwmLevel ? formatPpSpread(iwmLevel.returns["1W"], spyLevel.returns["1W"], pending, flat) : pending,
    qqqVsSpy: spyLevel && qqqLevel ? formatPpSpread(qqqLevel.returns["1W"], spyLevel.returns["1W"], pending, flat) : pending,
    positiveSectors: sectorsPositive !== null && sectorTotal ? `${sectorsPositive}/${sectorTotal}` : pending,
    sectorsOverLongAverage: sectorStats.length ? `${sectorsOverLongAverage}/${sectorStats.length}` : pending,
  };
}
