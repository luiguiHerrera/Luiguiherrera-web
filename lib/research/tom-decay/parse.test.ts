import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDataset,
  parseCalendarPairwise,
  parseCsv,
  parseRegimeSummary,
  parseRollingPremium,
  TomDecayDataError,
} from "./parse.ts";
import { frozenTomDecaySources } from "./generated/frozen-sources.ts";

const regimeHeader =
  "regime_type,regime,observations,tom_days,tom_daily_mean,all_other_days_mean,"
  + "tom_minus_all_other_daily,hac_se,hac_z,hac_p,hac_lags,tom_win_rate,other_win_rate";

const regimeRows = [
  "publication_regime,PRE_PUBLICATION,9295,1773,0.00134,0.00007,0.001274,0.00022,5.5,0.00000002,10,0.59,0.5",
  "publication_regime,PUBLISHED_PRE_DECIMAL,3605,687,0.00142,0.00026,0.001165,0.00044,2.6,0.008,8,0.56,0.53",
  "publication_regime,POST_DECIMAL_PRE_T2,4127,786,0.00048,0.00021,0.000271,0.00043,0.62,0.52,9,0.52,0.53",
  "publication_regime,T2,1692,322,0.0007,0.00048,0.000222,0.00073,0.3,0.76,7,0.54,0.54",
  "publication_regime,T1,557,108,0.00082,0.0007,0.000121,0.00099,0.12,0.9,5,0.64,0.55",
];

const validRegimeCsv = [regimeHeader, ...regimeRows].join("\n");

test("parseCsv rejects a row whose cell count does not match the header", () => {
  assert.throws(
    () => parseCsv("a,b,c\n1,2", "sample.csv"),
    (error: unknown) => error instanceof TomDecayDataError && /has 2 cells, expected 3/.test((error as Error).message),
  );
});

test("parseCsv rejects a file with no data rows", () => {
  assert.throws(() => parseCsv("a,b,c\n", "sample.csv"), TomDecayDataError);
});

test("parseRegimeSummary returns regimes in canonical order and converts to bps", () => {
  const shuffled = [regimeHeader, regimeRows[2], regimeRows[0], regimeRows[4], regimeRows[1], regimeRows[3]].join("\n");
  const parsed = parseRegimeSummary(shuffled, "regimes.csv");
  assert.deepEqual(
    parsed.map((estimate) => estimate.regime),
    ["PRE_PUBLICATION", "PUBLISHED_PRE_DECIMAL", "POST_DECIMAL_PRE_T2", "T2", "T1"],
  );
  assert.equal(parsed[0].premiumDaily, 0.001274);
  assert.equal(Number(parsed[0].premiumBps.toFixed(2)), 12.74);
});

test("parseRegimeSummary fails when a regime is missing", () => {
  const incomplete = [regimeHeader, ...regimeRows.slice(0, 4)].join("\n");
  assert.throws(
    () => parseRegimeSummary(incomplete, "regimes.csv"),
    (error: unknown) => error instanceof TomDecayDataError && /missing regime\(s\): T1/.test((error as Error).message),
  );
});

test("parseRegimeSummary fails on a missing required column", () => {
  const withoutP = validRegimeCsv
    .split("\n")
    .map((line) => {
      const cells = line.split(",");
      cells.splice(9, 1);
      return cells.join(",");
    })
    .join("\n");
  assert.throws(
    () => parseRegimeSummary(withoutP, "regimes.csv"),
    (error: unknown) => error instanceof TomDecayDataError && /missing column\(s\): hac_p/.test((error as Error).message),
  );
});

test("parseRegimeSummary rejects a p-value outside [0, 1]", () => {
  const broken = validRegimeCsv.replace(",0.008,8,", ",1.4,8,");
  assert.throws(
    () => parseRegimeSummary(broken, "regimes.csv"),
    (error: unknown) => error instanceof TomDecayDataError && /is not a p-value/.test((error as Error).message),
  );
});

test("parseRegimeSummary rejects a non-numeric premium", () => {
  const broken = validRegimeCsv.replace("0.001274", "n/a");
  assert.throws(
    () => parseRegimeSummary(broken, "regimes.csv"),
    (error: unknown) => error instanceof TomDecayDataError && /is not finite/.test((error as Error).message),
  );
});

test("parseRegimeSummary rejects an unknown regime id", () => {
  const broken = validRegimeCsv.replace("POST_DECIMAL_PRE_T2", "POST_DECIMAL_OPTIMIZED");
  assert.throws(() => parseRegimeSummary(broken, "regimes.csv"), TomDecayDataError);
});

const rollingHeader =
  "window_end,window_start,years,observations,tom_days,tom_premium_daily,hac_se,ci95_lo,ci95_hi,hac_z,hac_p,hac_lags";

test("parseRollingPremium marks only windows ending after the data end as incomplete", () => {
  const csv = [
    rollingHeader,
    "2024-12-31,2014-12-31,10,2516,480,-0.0001,0.00055,-0.0011,0.00099,-0.18,0.855,8",
    "2025-12-31,2015-12-31,10,2514,480,-0.00008,0.00054,-0.00115,0.00098,-0.15,0.876,8",
    "2026-12-31,2016-12-31,10,2418,463,0.00021,0.00056,-0.0008,0.00133,0.38,0.701,8",
  ].join("\n");
  const parsed = parseRollingPremium(csv, "rolling.csv", "2026-08-17");
  assert.deepEqual(parsed.map((point) => point.isPartialWindow), [false, false, true]);
  assert.deepEqual(parsed.map((point) => point.year), [2024, 2025, 2026]);
});

test("parseRollingPremium rejects an inverted confidence interval", () => {
  const csv = [
    rollingHeader,
    "2024-12-31,2014-12-31,10,2516,480,-0.0001,0.00055,0.00099,-0.0011,-0.18,0.855,8",
    "2025-12-31,2015-12-31,10,2514,480,-0.00008,0.00054,-0.00115,0.00098,-0.15,0.876,8",
  ].join("\n");
  assert.throws(
    () => parseRollingPremium(csv, "rolling.csv", "2026-08-17"),
    (error: unknown) => error instanceof TomDecayDataError && /inverted 95% interval/.test((error as Error).message),
  );
});

test("parseRollingPremium rejects windows that are not in ascending order", () => {
  const csv = [
    rollingHeader,
    "2025-12-31,2015-12-31,10,2514,480,-0.00008,0.00054,-0.00115,0.00098,-0.15,0.876,8",
    "2024-12-31,2014-12-31,10,2516,480,-0.0001,0.00055,-0.0011,0.00099,-0.18,0.855,8",
  ].join("\n");
  assert.throws(
    () => parseRollingPremium(csv, "rolling.csv", "2026-08-17"),
    (error: unknown) => error instanceof TomDecayDataError && /ascending year order/.test((error as Error).message),
  );
});

test("parseRollingPremium rejects a malformed window date", () => {
  const csv = [
    rollingHeader,
    "2024,2014-12-31,10,2516,480,-0.0001,0.00055,-0.0011,0.00099,-0.18,0.855,8",
    "2025-12-31,2015-12-31,10,2514,480,-0.00008,0.00054,-0.00115,0.00098,-0.15,0.876,8",
  ].join("\n");
  assert.throws(
    () => parseRollingPremium(csv, "rolling.csv", "2026-08-17"),
    (error: unknown) => error instanceof TomDecayDataError && /is not an ISO date/.test((error as Error).message),
  );
});

test("parseCalendarPairwise rejects an unknown calendar group", () => {
  const csv = [
    "group_a,group_b,months,mean_a,mean_b,difference_b_minus_a,difference_hac_se,difference_hac_z,difference_hac_p,hac_lags",
    "REGULAR,JANUARY_ONLY,766,0.004,0.0039,-0.0001,0.0018,-0.1,0.916,6",
  ].join("\n");
  assert.throws(() => parseCalendarPairwise(csv, "calendar.csv"), TomDecayDataError);
});

test("buildDataset fails loudly when the research report is not valid JSON", () => {
  assert.throws(
    () => buildDataset("yahoo", { ...frozenTomDecaySources.yahoo, researchReport: "{" }),
    (error: unknown) => error instanceof TomDecayDataError && /is not valid JSON/.test((error as Error).message),
  );
});

test("buildDataset fails loudly when the research report loses its provenance", () => {
  const report = JSON.parse(frozenTomDecaySources.yahoo.researchReport);
  delete report.source_provenance;
  assert.throws(
    () => buildDataset("yahoo", { ...frozenTomDecaySources.yahoo, researchReport: JSON.stringify(report) }),
    (error: unknown) => error instanceof TomDecayDataError && /source_provenance is not an object/.test((error as Error).message),
  );
});
