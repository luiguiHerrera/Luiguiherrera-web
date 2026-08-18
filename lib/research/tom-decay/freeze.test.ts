import assert from "node:assert/strict";
import test from "node:test";
import { adjacentTest, breakTest, regime, rollingAt, tomDecayData, tomToolVersion } from "./dataset.ts";
import { buildTomDecayView } from "./presentation.ts";
import { tomDecayContent } from "./content.ts";
import type { TomDecayDataset } from "./types.ts";

const { yahoo, french } = tomDecayData;
const round = (value: number, digits: number) => Number(value.toFixed(digits));

test("the frozen research tool version is qtomdecay 0.3.1", () => {
  assert.equal(tomToolVersion, "0.3.1");
  assert.equal(yahoo.toolVersion, "0.3.1");
  assert.equal(french.toolVersion, "0.3.1");
});

test("the canonical TOM window is T, T+1, T+2, T+3 in both samples", () => {
  assert.deepEqual([...yahoo.canonicalTomDays], [0, 1, 2, 3]);
  assert.deepEqual([...french.canonicalTomDays], [0, 1, 2, 3]);
});

test("both public samples start in 1950 and use a 10-year rolling window", () => {
  assert.equal(yahoo.start, "1950-01-03");
  assert.equal(french.start, "1950-01-03");
  assert.equal(yahoo.rollingYears, 10);
  assert.equal(french.rollingYears, 10);
});

test("Yahoo regime premiums match the research freeze", () => {
  const expected: [Parameters<typeof regime>[1], number, number][] = [
    ["PRE_PUBLICATION", 12.74, 2.553876e-8],
    ["PUBLISHED_PRE_DECIMAL", 11.66, 0.008158],
    ["POST_DECIMAL_PRE_T2", 2.72, 0.529643],
    ["T2", 2.22, 0.763284],
    ["T1", 1.21, 0.902665],
  ];
  for (const [id, bps, hacP] of expected) {
    const estimate = regime(yahoo, id);
    assert.equal(round(estimate.premiumBps, 2), bps, `${id} premium`);
    assert.equal(round(estimate.hacP, 6), round(hacP, 6), `${id} p-value`);
  }
});

test("French matched regime premiums match the research freeze", () => {
  const expected: [Parameters<typeof regime>[1], number, number][] = [
    ["PRE_PUBLICATION", 12.58, 1.120814e-8],
    ["PUBLISHED_PRE_DECIMAL", 14.43, 0.001014],
    ["POST_DECIMAL_PRE_T2", 2.97, 0.498579],
    ["T2", 1.84, 0.810307],
    ["T1", -4.19, 0.69241],
  ];
  for (const [id, bps, hacP] of expected) {
    const estimate = regime(french, id);
    assert.equal(round(estimate.premiumBps, 2), bps, `${id} premium`);
    assert.equal(round(estimate.hacP, 6), round(hacP, 6), `${id} p-value`);
  }
});

test("the publication-era transition shows no detected immediate collapse", () => {
  const yahooTest = adjacentTest(yahoo, "PRE_PUBLICATION", "PUBLISHED_PRE_DECIMAL");
  assert.equal(round(yahooTest.changeDaily, 6), -0.000109);
  assert.equal(round(yahooTest.changeHacP, 6), 0.829258);

  const frenchTest = adjacentTest(french, "PRE_PUBLICATION", "PUBLISHED_PRE_DECIMAL");
  assert.equal(round(frenchTest.changeDaily, 6), 0.000185);
  assert.equal(round(frenchTest.changeHacP, 6), 0.710647);

  for (const test_ of [yahooTest, frenchTest]) {
    assert.ok(test_.changeHacP > 0.05, "the publication-era change must remain non-significant");
  }
});

test("the later adjacent decay matches the research freeze", () => {
  const yahooTest = adjacentTest(yahoo, "PUBLISHED_PRE_DECIMAL", "POST_DECIMAL_PRE_T2");
  assert.equal(round(yahooTest.changeDaily, 6), -0.000894);
  assert.equal(round(yahooTest.changeHacP, 6), 0.148749);

  const frenchTest = adjacentTest(french, "PUBLISHED_PRE_DECIMAL", "POST_DECIMAL_PRE_T2");
  assert.equal(round(frenchTest.changeDaily, 6), -0.001145);
  assert.equal(round(frenchTest.changeHacP, 6), 0.066145);
});

test("cumulative break tests match the research freeze", () => {
  assert.equal(round(breakTest(yahoo, "DECIMALIZATION_2001").changeHacP, 6), 0.015043);
  assert.equal(round(breakTest(french, "DECIMALIZATION_2001").changeHacP, 6), 0.008128);
  assert.equal(round(breakTest(yahoo, "SETTLEMENT_T5_TO_T3_1995").changeHacP, 6), 0.017666);
  assert.equal(round(breakTest(french, "SETTLEMENT_T5_TO_T3_1995").changeHacP, 6), 0.012804);
});

test("recent rolling windows are statistically indistinguishable from zero", () => {
  const expected: [TomDecayDataset, number, number, number, number, number][] = [
    [yahoo, 2015, 0.000029, -0.001074, 0.001132, 0.958462],
    [yahoo, 2025, -0.000085, -0.001151, 0.000981, 0.876354],
    [french, 2015, 0.000058, -0.001068, 0.001183, 0.920031],
    [french, 2025, -0.000134, -0.001242, 0.000975, 0.812929],
  ];
  for (const [dataset, year, premium, low, high, hacP] of expected) {
    const point = rollingAt(dataset, year);
    assert.equal(round(point.premiumBps / 10_000, 6), premium, `${dataset.id} ${year} premium`);
    assert.equal(round(point.ci95LoBps / 10_000, 6), low, `${dataset.id} ${year} CI low`);
    assert.equal(round(point.ci95HiBps / 10_000, 6), high, `${dataset.id} ${year} CI high`);
    assert.equal(round(point.hacP, 6), hacP, `${dataset.id} ${year} p-value`);
    assert.ok(point.ci95LoBps < 0 && point.ci95HiBps > 0, `${dataset.id} ${year} interval must include zero`);
  }
});

test("pressure and reversal stays a secondary, non-headline result", () => {
  assert.equal(round(yahoo.pressureReversal.correlation, 6), -0.209644);
  assert.equal(round(yahoo.pressureReversal.differenceBps / 10_000, 6), 0.003004);
  assert.equal(round(yahoo.pressureReversal.differenceHacP, 6), 0.014788);

  assert.equal(round(french.pressureReversal.correlation, 6), -0.19657);
  assert.equal(round(french.pressureReversal.differenceBps / 10_000, 6), 0.002344);
  assert.equal(round(french.pressureReversal.differenceHacP, 6), 0.058517);

  assert.ok(
    french.pressureReversal.differenceHacP > 0.05,
    "the matched replication must remain only marginally significant",
  );
});

test("calendar concentration is not robust in either sample", () => {
  const expected: Record<string, number> = {
    "yahoo:REGULAR:QUARTER_ONLY": 0.916017,
    "yahoo:REGULAR:SEMI_YEAR": 0.258102,
    "yahoo:QUARTER_ONLY:SEMI_YEAR": 0.348071,
    "french:REGULAR:QUARTER_ONLY": 0.546139,
    "french:REGULAR:SEMI_YEAR": 0.301104,
    "french:QUARTER_ONLY:SEMI_YEAR": 0.215881,
  };
  for (const dataset of [yahoo, french]) {
    for (const pairwise of dataset.calendarPairwise) {
      const key = `${dataset.id}:${pairwise.groupA}:${pairwise.groupB}`;
      assert.equal(round(pairwise.differenceHacP, 6), expected[key], key);
      assert.ok(pairwise.differenceHacP > 0.2, `${key} must stay above 0.20`);
    }
  }
});

test("the exploratory breakpoint disagrees across universes and stays exploratory", () => {
  assert.equal(yahoo.exploratoryBreakpoint.selectedYear, 1964);
  assert.equal(french.exploratoryBreakpoint.selectedYear, 1991);
  assert.notEqual(yahoo.exploratoryBreakpoint.selectedYear, french.exploratoryBreakpoint.selectedYear);
  for (const dataset of [yahoo, french]) {
    assert.equal(dataset.exploratoryBreakpoint.status, "EXPLORATORY_NOT_CONFIRMATORY");
  }
});

test("source provenance is preserved for both samples", () => {
  assert.equal(yahoo.provenance.provider, "Yahoo Finance via yfinance");
  assert.equal(yahoo.provenance.symbol, "^GSPC");
  assert.equal(french.provenance.provider, "Kenneth French Data Library");
  assert.equal(french.provenance.dataset, "Fama/French 3 Factors [Daily]");
  assert.equal(french.provenance.returnDefinition, "(Mkt-RF + RF) / 100");
  assert.equal(
    french.provenance.downloadSha256,
    "39f9ae1d0e9f575024bc23145980ac270cea508fb67e592578b3f4d65f36d006",
  );
});

test("both locales publish the same frozen numbers in their own number format", () => {
  const es = buildTomDecayView(tomDecayContent.es);
  const en = buildTomDecayView(tomDecayContent.en);

  assert.equal(es.findings[0].value, "12,74");
  assert.equal(en.findings[0].value, "12.74");
  assert.equal(es.findings[2].value, "2,72");
  assert.equal(en.findings[2].value, "2.72");

  assert.deepEqual(
    es.publicationPairs.map((pair) => [round(pair.fromBps, 2), round(pair.toBps, 2), round(pair.changeHacP, 6)]),
    en.publicationPairs.map((pair) => [round(pair.fromBps, 2), round(pair.toBps, 2), round(pair.changeHacP, 6)]),
  );

  assert.ok(es.publicationBody.some((line) => line.includes("12,74") && line.includes("11,66")));
  assert.ok(en.publicationBody.some((line) => line.includes("12.74") && line.includes("11.66")));
  assert.ok(es.rollingBody.some((line) => line.includes("2,72") && line.includes("2,97")));
  assert.ok(en.rollingBody.some((line) => line.includes("2.72") && line.includes("2.97")));

  const unresolved = /\{\w+\}/;
  for (const view of [es, en]) {
    assert.ok(!unresolved.test(JSON.stringify(view.findings)), "every finding placeholder must be resolved");
    assert.ok(!unresolved.test(JSON.stringify(view.publicationBody)), "every publication placeholder must be resolved");
    assert.ok(!unresolved.test(JSON.stringify(view.rollingBody)), "every decay placeholder must be resolved");
    assert.ok(!unresolved.test(JSON.stringify(view.secondaryCards)), "every mechanism placeholder must be resolved");
  }
});

test("the mechanism cards report both the S&P 500 and the matched replication", () => {
  const view = buildTomDecayView(tomDecayContent.en);
  const pressure = view.secondaryCards.find((card) => card.id === "pressure");
  assert.ok(pressure);
  assert.equal(pressure.status, "suggestive");
  assert.ok(pressure.evidence.some((item) => item.detail.includes("30.04") && item.detail.includes("0.0148")));
  assert.ok(pressure.evidence.some((item) => item.detail.includes("23.44") && item.detail.includes("0.0585")));

  const breakpoint = view.secondaryCards.find((card) => card.id === "breakpoint");
  assert.ok(breakpoint);
  assert.equal(breakpoint.status, "exploratory");
  assert.ok(breakpoint.body.includes("1964") && breakpoint.body.includes("1991"));
});
