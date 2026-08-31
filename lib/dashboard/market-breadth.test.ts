import assert from "node:assert/strict";
import test from "node:test";
import { buildMarketBreadthValues } from "./market-breadth.ts";
import type { WeeklyReportData } from "../reports/build-weekly-report-data.ts";

function stat(ticker: string, weeklyReturn: number, distanceToLongAverage = 0.05) {
  return {
    ticker,
    name: ticker,
    zScore: 0,
    percentile: 50,
    distanceToLongAverage,
    currentDrawdown: 0,
    returns: { "1D": null, "1W": weeklyReturn, "1M": null, "3M": null, "6M": null, YTD: null, "1Y": null, "3Y": null, "5Y": null, "10Y": null, Full: null },
    lastClose: 100,
    lastDate: "2026-08-28",
    status: "available",
  };
}

test("breadth preserves independent real fields when sector participation is unavailable", () => {
  const data = {
    sectors: { data: null, leaders: [], laggards: [] },
    statisticalLevels: [stat("SPY", 0.01), stat("RSP", 0.006), stat("IWM", 0.004), stat("QQQ", 0.012), stat("XLK", 0.01), stat("XLF", 0.01, -0.02)],
  } as unknown as WeeklyReportData;
  const values = buildMarketBreadthValues(data, "en");
  assert.equal(values.rspVsSpy, "-0.4 pp");
  assert.equal(values.iwmVsSpy, "-0.6 pp");
  assert.equal(values.qqqVsSpy, "+0.2 pp");
  assert.equal(values.positiveSectors, "Pending");
  assert.equal(values.sectorsOverLongAverage, "1/2");
});
