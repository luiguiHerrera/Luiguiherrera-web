import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  OFR_CATEGORY_KEYS, OFR_REGION_KEYS, OFR_SERIES_COLUMNS,
  buildOfrFsiSummary, exportOfrFsiCsv, getOfrDelta20, ofrReconciliationTolerance,
  parseOfrFsiCsv, reconcileOfrFsiObservation,
  type OfrFsiDataset, type OfrObservation, type OfrSeriesKey,
} from "./ofr-fsi";

// Official download retrieved 2026-11-25; the final twenty-one published rows.
// This frozen excerpt tests actual values independently of the fetching layer.
const SOURCE_CUT = `Date,OFR FSI,Credit,Equity valuation,Safe assets,Funding,Volatility,United States,Other advanced economies,Emerging markets
2026-10-23,-1.319,-0.841,-0.475,-0.283,-0.144,0.424,-0.978,0.154,-0.496
2026-10-26,-1.569,-0.865,-0.475,-0.287,-0.125,0.183,-1.022,-0.058,-0.49
2026-10-27,-1.913,-0.891,-0.487,-0.292,-0.134,-0.109,-1.092,-0.326,-0.495
2026-10-28,-1.829,-0.915,-0.498,-0.289,-0.143,0.016,-1.139,-0.186,-0.505
2026-10-29,-2.117,-0.886,-0.497,-0.29,-0.151,-0.292,-1.122,-0.495,-0.499
2026-10-30,-1.392,-0.836,-0.47,-0.284,0.045,0.151,-0.784,-0.119,-0.49
2026-11-02,-1.472,-0.83,-0.468,-0.291,-0.114,0.231,-0.876,-0.107,-0.489
2026-11-03,-1.484,-0.842,-0.458,-0.292,-0.129,0.237,-0.912,-0.093,-0.479
2026-11-04,-2.162,-0.861,-0.479,-0.298,-0.123,-0.402,-1.109,-0.572,-0.481
2026-11-05,-1.388,-0.843,-0.444,-0.3,-0.181,0.379,-0.67,-0.239,-0.479
2026-11-06,-1.079,-0.857,-0.402,-0.303,-0.172,0.654,-0.783,0.169,-0.465
2026-11-09,-1.56,-0.872,-0.424,-0.301,-0.171,0.208,-1.024,-0.069,-0.467
2026-11-10,-1.834,-0.91,-0.434,-0.298,-0.216,0.024,-1.088,-0.273,-0.473
2026-11-11,-1.95,-0.904,-0.454,-0.301,-0.22,-0.071,-1.155,-0.313,-0.481
2026-11-12,-1.88,-0.921,-0.444,-0.294,-0.195,-0.026,-1.091,-0.316,-0.473
2026-11-13,-1.874,-0.924,-0.439,-0.291,-0.191,-0.028,-1.056,-0.345,-0.472
2026-11-16,-1.555,-0.904,-0.405,-0.289,-0.128,0.171,-0.837,-0.262,-0.456
2026-11-17,-1.129,-0.873,-0.377,-0.29,-0.053,0.463,-0.644,-0.035,-0.45
2026-11-18,-1.387,-0.853,-0.368,-0.284,-0.122,0.24,-0.737,-0.203,-0.447
2026-11-19,-1.259,-0.841,-0.343,-0.281,-0.122,0.328,-0.561,-0.259,-0.44
2026-11-20,-0.449,-0.782,-0.284,-0.274,-0.016,0.906,-0.087,0.059,-0.421`;
const keys = Object.keys(OFR_SERIES_COLUMNS) as OfrSeriesKey[];
const header = SOURCE_CUT.split("\n")[0];
const close = (actual: number | null, expected: number) => {
  assert.notEqual(actual, null);
  assert.ok(Math.abs(actual! - expected) < 1e-12, `${actual} != ${expected}`);
};
function synthetic(values: Partial<OfrObservation> = {}): OfrObservation {
  return { date: "2026-01-01", fsi: 0, credit: 0, equityValuation: 0, safeAssets: 0,
    funding: 0, volatility: 0, unitedStates: 0, otherAdvancedEconomies: 0, emergingMarkets: 0, ...values };
}
function serialize(rows: OfrObservation[]) {
  return [header, ...rows.map(row => [row.date, ...keys.map(key => row[key] ?? "")].join(","))].join("\n");
}
function cut() { return parseOfrFsiCsv(SOURCE_CUT); }

test("real source uses t and t−20, with 21 distinct published observations", () => {
  const dataset = cut(), summary = buildOfrFsiSummary(dataset);
  assert.equal(dataset.observations.length, 21);
  assert.equal(summary.latest?.date, "2026-11-20");
  assert.equal(summary.latest?.fsi, -0.449);
  assert.equal(summary.comparison?.date, "2026-10-23");
  close(summary.delta20, 0.870);
  assert.equal(summary.state, "below");
  assert.equal(summary.trend, "increasing");
  assert.deepEqual(summary.focusCategories.map(item => item.key), ["volatility"]);
  assert.notEqual(summary.delta20, summary.latest!.fsi! - dataset.observations[1].fsi!);
  close(summary.categoryContributions.find(item => item.key === "volatility")!.delta20, 0.482);
  close(summary.regionContributions.find(item => item.key === "unitedStates")!.delta20, 0.891);
});

test("categories and regions reconcile separately, for both levels and changes", () => {
  const { reconciliation: r } = buildOfrFsiSummary(cut());
  for (const result of Object.values(r)) assert.equal(result.status, "reconciled");
  close(r.categories.residual, -0.001);
  close(r.regions.residual, 0);
  close(r.categoryChanges.residual, -0.001);
  close(r.regionChanges.residual, 0.001);
  assert.equal(r.categories.tolerance, 0.003);
  assert.equal(r.regions.tolerance, 0.002);
  assert.equal(r.categoryChanges.tolerance, 0.006);
  assert.equal(r.regionChanges.tolerance, 0.004);
});

test("CSV normalization supports BOM, CRLF, quoted and reordered columns", () => {
  const rows = SOURCE_CUT.split("\n").map(line => line.split(",").reverse());
  rows[0] = rows[0].map(name => ` ${name.toUpperCase().replaceAll(" ", "_")} `);
  const quoted = "\uFEFF" + rows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\r\n");
  assert.deepEqual(parseOfrFsiCsv(quoted).observations, cut().observations);
});

test("chronological sorting coalesces identical dates and rejects conflicting duplicates", () => {
  const [head, ...rows] = SOURCE_CUT.split("\n");
  const dataset = parseOfrFsiCsv([head, ...rows.toReversed(), rows[0]].join("\n"));
  assert.deepEqual(dataset.observations, cut().observations);
  assert.equal(dataset.duplicateDatesRemoved, 1);
  assert.throws(() => parseOfrFsiCsv(SOURCE_CUT + "\n" + rows[0].replace("-1.319", "-1.320")), /Conflicting/);
});

test("twenty records contain only nineteen intervals and cannot supply Δ20", () => {
  const dataset = cut();
  dataset.observations.shift();
  const summary = buildOfrFsiSummary(dataset);
  assert.equal(summary.comparison, null);
  assert.equal(summary.delta20, null);
  assert.equal(summary.trend, "unavailable");
  assert.ok(summary.categoryContributions.every(item => item.delta20 === null));
});

test("missing endpoints stay missing, while a missing middle cell never shifts endpoints", () => {
  const dataset = cut();
  dataset.observations[0].fsi = null;
  assert.equal(buildOfrFsiSummary(dataset).delta20, null);
  assert.equal(buildOfrFsiSummary(dataset).comparison?.date, "2026-10-23");
  assert.equal(dataset.observations.length, 21);
  const middle = cut();
  middle.observations[10].fsi = null;
  close(buildOfrFsiSummary(middle).delta20, 0.870);
  for (const index of [-1, 0, 19, 20.5, 500]) assert.equal(getOfrDelta20(middle, index), null);
});

test("missing contribution reduces coverage without replacing official FSI or a region", () => {
  const dataset = cut();
  dataset.observations[20].funding = null;
  const summary = buildOfrFsiSummary(dataset);
  assert.equal(summary.latest?.fsi, -0.449);
  assert.equal(summary.coverage.categories, 4);
  assert.equal(summary.coverage.categoryChanges, 4);
  assert.equal(summary.reconciliation.categories.status, "incomplete");
  assert.deepEqual(summary.reconciliation.categories.missing, ["funding"]);
  assert.equal(summary.reconciliation.categories.sum, null);
  assert.equal(summary.reconciliation.regions.status, "reconciled");
  const parsed = parseOfrFsiCsv(serialize(dataset.observations));
  assert.equal(parsed.observations[20].funding, null);
});

test("malformed schema, dates and non-finite numeric cells fail explicitly", () => {
  const row = SOURCE_CUT.split("\n")[1];
  for (const date of ["2026-02-30", "2026-2-01", "not-a-date"]) {
    assert.throws(() => parseOfrFsiCsv(header + "\n" + row.replace("2026-10-23", date)), /date/);
  }
  for (const value of ["NaN", "Infinity", "1e999", "not-a-number"]) {
    assert.throws(() => parseOfrFsiCsv(header + "\n" + row.replace("-1.319", value)), /numeric|Non-finite/);
  }
  assert.throws(() => parseOfrFsiCsv(SOURCE_CUT.replace("Credit,", "Unknown,")), /Missing/);
  assert.throws(() => parseOfrFsiCsv(SOURCE_CUT.replace("Credit,", "OFR FSI,")), /Duplicate/);
  assert.throws(() => parseOfrFsiCsv(header + '\n"2026-10-23'), /Unterminated/);
  assert.throws(() => parseOfrFsiCsv(header), /no observations/);
});

test("zero is historical average, and negative categories never become stress focuses", () => {
  const dataset = cut();
  dataset.observations = dataset.observations.map(row => synthetic({ date: row.date }));
  const summary = buildOfrFsiSummary(dataset);
  assert.equal(summary.state, "average");
  assert.equal(summary.trend, "unchanged");
  assert.deepEqual(summary.focusCategories, []);
  dataset.observations[20] = synthetic({ date: "2026-11-20", fsi: -5, credit: -1, equityValuation: -1,
    safeAssets: -1, funding: -1, volatility: -1 });
  assert.deepEqual(buildOfrFsiSummary(dataset).focusCategories, []);
});

test("current level focuses differ from drivers of the change", () => {
  const dataset = cut();
  dataset.observations[0] = synthetic({ date: "2026-10-23", credit: 4, equityValuation: 1, volatility: -4 });
  dataset.observations[20] = synthetic({ date: "2026-11-20", credit: 3, equityValuation: 2, volatility: 0.5 });
  const summary = buildOfrFsiSummary(dataset);
  assert.deepEqual(summary.focusCategories.map(item => item.key), ["credit", "equityValuation"]);
  assert.deepEqual(summary.changeDrivers.increases.map(item => item.key), ["volatility", "equityValuation"]);
  assert.deepEqual(summary.changeDrivers.decreases.map(item => item.key), ["credit"]);
});

test("reconciliation tolerances reflect nominal publication precision, not stripped zeroes", () => {
  assert.equal(ofrReconciliationTolerance(5), 0.003);
  const mismatch = synthetic({ fsi: 0.5, credit: 0.506 });
  assert.equal(reconcileOfrFsiObservation(mismatch, OFR_CATEGORY_KEYS).status, "mismatch");
  const boundary = synthetic({ fsi: 0.5, credit: 0.503 });
  assert.equal(reconcileOfrFsiObservation(boundary, OFR_CATEGORY_KEYS).status, "reconciled");
});

test("an official historical regional inconsistency is retained and flagged without altering it", () => {
  const historical = "2018-11-01,-1.623,-0.256,0.377,-0.138,-0.511,-1.095,-0.837,-0.84,-0.054";
  const dataset = parseOfrFsiCsv(SOURCE_CUT + "\n" + historical);
  const summary = buildOfrFsiSummary(dataset);
  assert.equal(dataset.observations[0].fsi, -1.623);
  assert.equal(reconcileOfrFsiObservation(dataset.observations[0], OFR_REGION_KEYS).status, "mismatch");
  assert.equal(summary.historicalIssues.length, 1);
  assert.equal(summary.historicalIssues[0].date, "2018-11-01");
  assert.equal(summary.historicalIssues[0].dimension, "regions");
  close(summary.historicalIssues[0].residual, -0.108);
  assert.equal(summary.reconciliation.regions.status, "reconciled");
});

test("export distinguishes official and derived columns and uses endpoints outside the display window", () => {
  const dataset = cut();
  const csv = exportOfrFsiCsv(dataset, dataset.observations.slice(-1));
  const [exportHeader, last] = csv.trim().split("\r\n").map(row => row.split(","));
  assert.deepEqual(exportHeader.slice(0, 10), header.split(","));
  assert.equal(exportHeader[10], "Derived comparison date (20 published sessions earlier)");
  assert.equal(exportHeader[11], "Derived Delta20 OFR FSI (index points)");
  assert.equal(last[0], "2026-11-20");
  assert.equal(last[1], "-0.449");
  assert.equal(last[10], "2026-10-23");
  close(Number(last[11]), 0.870);
  assert.equal(last[11], "0.870");
  const first = exportOfrFsiCsv(dataset, dataset.observations.slice(0, 1)).trimEnd().split("\r\n")[1].split(",");
  assert.equal(first[10], "");
  assert.ok(first.slice(11).every(value => value === ""));
  assert.throws(() => exportOfrFsiCsv(dataset, [synthetic()]), /outside source/);
});

test("full reparse incorporates source revisions without mutating a prior snapshot", () => {
  const prior = cut();
  const revised = parseOfrFsiCsv(SOURCE_CUT.replace("-0.841,-0.475", "-0.840,-0.475"));
  assert.equal(prior.observations[0].credit, -0.841);
  assert.equal(revised.observations[0].credit, -0.840);
  close(getOfrDelta20(revised, 20, "credit"), 0.058);
  close(getOfrDelta20(prior, 20, "credit"), 0.059);
});

// Optional reproducible audit of the complete official file, without network in tests.
test("complete official download audit", { skip: !process.env.OFR_FSI_AUDIT_FILE }, () => {
  const dataset: OfrFsiDataset = parseOfrFsiCsv(readFileSync(process.env.OFR_FSI_AUDIT_FILE!, "utf8"));
  const summary = buildOfrFsiSummary(dataset);
  assert.equal(dataset.observations.length, 6807);
  assert.equal(summary.latest?.date, "2026-11-20");
  close(summary.delta20, 0.870);
  assert.deepEqual(summary.historicalIssues.map(issue => [issue.date, issue.dimension]), [["2018-11-01", "regions"]]);
});
