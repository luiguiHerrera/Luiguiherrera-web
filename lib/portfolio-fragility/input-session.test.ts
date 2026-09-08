import assert from "node:assert/strict";
import test from "node:test";
import { previewPortfolio, parsePortfolioText } from "./holdings-input.ts";
import { activeHistory, initialSession, sessionReducer, hasUnanalyzedChanges, validateHistoryReplacement, scenarioValues, type Session } from "./session.ts";
import { analyzePortfolioForDisplay, experimentResult, historyEvidence, scenarioResult } from "./analysis-view.ts";
import { buildDemoHistory, parseHistoryCsv } from "./demo-data.ts";

function preview(text: string, numberFormat: "dot" | "comma" = "dot", unit: "percentages" | "fractions" | "relative" = "percentages") {
  const result = previewPortfolio({ text, numberFormat, unit }); assert.ok(result.ok); return result.preview;
}
function commit(state = initialSession("en"), text = state.draft.text) {
  return sessionReducer(sessionReducer(sessionReducer(state, { type: "draft", draft: { ...state.draft, text } }), { type: "preview" }), { type: "commit" });
}
function imported(): Session {
  let state = commit(initialSession("en"), "SPY 35\nQQQ 35\nTLT 20\nGLD 10");
  state = sessionReducer(state, { type: "import-start" });
  return sessionReducer(state, { type: "import-success", request: state.importRequest, dataset: { rows: buildDemoHistory(), kind: "local", name: "synthetic-test.csv" } });
}
test("A/B: comma decimals preserve full meaning and dot mode rejects the same token", () => {
  const p = preview("SPY 35,5", "comma"); assert.equal(p.rows[0].interpreted, 35.5); assert.equal(p.rows[0].input, "35,5"); assert.equal(p.holdings[0].rawWeight, .355);
  assert.equal(previewPortfolio({ text: "SPY 35,5", numberFormat: "dot", unit: "percentages" }).ok, false);
});
for (const text of ["SPY,35,5", "SPY 35 5", "SPY 35foo", "SPY 1.000,5", "SPY 1,000.5", "SPY NaN", "SPY Infinity", "SPY -1", "SPY 1e2", "SPY 1 000", "SPY 35%%", "SPY 35;5", "SPY 1\nspy 2", "SPY 0\nQQQ 0", "SPY", ""]) {
  test("strictly rejects malformed portfolio: " + JSON.stringify(text), () => assert.equal(previewPortfolio({ text, numberFormat: "dot", unit: "percentages" }).ok, false));
}
test("D: incomplete percentages rescale visibly using the unchanged normalization kernel", () => {
  const p = preview("SPY 60\nTLT 30"); assert.equal(p.enteredTotal, 90); assert.ok(p.rescaled); assert.equal(p.normalizedTotal, 1);
  assert.ok(Math.abs(p.rows[0].normalized - 2 / 3) < 1e-12); assert.ok(Math.abs(p.rows[1].normalized - 1 / 3) < 1e-12);
});
test("all explicit units, suffixes and delimiters preserve interpretation; units are never guessed", () => {
  assert.deepEqual(preview("SPY;60 %\nQQQ\t25%\nTLT 15").rows.map((r) => r.normalized), [.6, .25, .15]);
  assert.deepEqual(preview("SPY 0.6\nQQQ 0.25\nTLT 0.15", "dot", "fractions").rows.map((r) => r.normalized), [.6, .25, .15]);
  assert.deepEqual(preview("SPY 6\nQQQ 2.5\nTLT 1.5", "dot", "relative").rows.map((r) => r.normalized), [.6, .25, .15]);
  assert.equal(preview("SPY 0.6").rows[0].interpreted, .6);
  assert.throws(() => parsePortfolioText("SPY 50%", "dot", "fractions"));
  assert.equal(preview("SPY 1,000", "comma").rows[0].interpreted, 1);
});
test("zero rows are visible in preview but absent from positive-weight analysis", () => {
  const p = preview("SPY 60\nQQQ 0\nTLT 40"); assert.equal(p.rows.length, 3); assert.equal(p.rows[1].normalized, 0);
  const a = analyzePortfolioForDisplay(p.holdings, []); assert.equal(a.status, "OK"); if (a.status === "OK" && a.normalization.status === "OK") assert.deepEqual(a.normalization.asset_ids, ["SPY", "TLT"]);
});
test("overflow and nonzero underflow cannot silently change input meaning", () => {
  for (const token of ["9007199254740993", "9".repeat(400), "0." + "0".repeat(400) + "1"]) assert.equal(previewPortfolio({ text: "SPY " + token, numberFormat: "dot", unit: "percentages" }).ok, false);
});
test("C: no-history capital insight is exact and historical unavailability stays separate", () => {
  const p = preview("SPY 60\nQQQ 25\nTLT 15"); const a = analyzePortfolioForDisplay(p.holdings, []);
  assert.equal(a.status, "OK"); if (a.status !== "OK" || a.concentration.status !== "OK") return;
  assert.equal(a.concentration.hhi, .445); assert.ok(Math.abs(a.concentration.effective_holdings - 2.247191011235955) < 1e-12); assert.equal(a.history.status, "UNAVAILABLE");
});
test("a preview is required; edits to text, unit or number format invalidate it without mutating committed results", () => {
  let state = initialSession("en"); assert.equal(sessionReducer(state, { type: "commit" }), state); state = commit(state);
  const committed = state.committed;
  for (const draft of [{ ...state.draft, text: "SPY 50\nQQQ 25\nTLT 25" }, { ...state.draft, numberFormat: "comma" as const }, { ...state.draft, unit: "relative" as const }]) {
    const changed = sessionReducer(state, { type: "draft", draft }); assert.equal(changed.preview, null); assert.ok(hasUnanalyzedChanges(changed));
    assert.equal(sessionReducer(changed, { type: "commit" }).committed, committed);
  }
});
test("E/F: re-analysis retains imported series and weight edits recompute their contribution", () => {
  const state = imported(); const twice = commit(state); assert.equal(activeHistory(twice), activeHistory(state));
  const changed = commit(twice, "SPY 60\nQQQ 15\nTLT 15\nGLD 10"); assert.equal(activeHistory(changed), activeHistory(state));
  const a = analyzePortfolioForDisplay(state.committed!.holdings, activeHistory(state)); const b = analyzePortfolioForDisplay(changed.committed!.holdings, activeHistory(changed));
  assert.equal(a.status, "OK"); assert.equal(b.status, "OK"); if (a.status !== "OK" || b.status !== "OK" || a.history.status !== "OK" || b.history.status !== "OK") return;
  assert.deepEqual(a.history.covariance, b.history.covariance); assert.notDeepEqual(a.history.risk, b.history.risk);
});
test("removal keeps loaded series; adding an unmatched positive identity blocks history, not capital", () => {
  const state = imported(); const removed = commit(state, "SPY 50\nQQQ 30\nTLT 20"); assert.equal(activeHistory(removed), activeHistory(state));
  assert.equal(analyzePortfolioForDisplay(removed.committed!.holdings, activeHistory(removed)).status, "OK");
  const added = commit(removed, "SPY 50\nQQQ 20\nTLT 20\nNEW 10"); const a = analyzePortfolioForDisplay(added.committed!.holdings, activeHistory(added));
  assert.equal(a.status, "OK"); if (a.status === "OK") { assert.equal(a.concentration.status, "OK"); assert.equal(a.history.status, "UNAVAILABLE"); }
});
test("failed or late replacement cannot erase or overwrite the last dataset", () => {
  const state = imported(); let reading = sessionReducer(state, { type: "import-start" });
  const failed = sessionReducer(reading, { type: "import-failure", request: reading.importRequest }); assert.equal(activeHistory(failed), activeHistory(state)); assert.ok(failed.importError);
  const oldRequest = reading.importRequest; reading = sessionReducer(reading, { type: "clear-history" });
  assert.equal(sessionReducer(reading, { type: "import-success", request: oldRequest, dataset: state.importedHistory! }), reading);
  assert.throws(() => validateHistoryReplacement(parseHistoryCsv("date,asset,value,currency,return_basis\n2024-02-30,SPY,100,USD,TOTAL_RETURN")));
  const rows = buildDemoHistory(); assert.throws(() => validateHistoryReplacement([...rows, rows[0]]));
});
test("G: demo matching personal ticker strings never attaches synthetic history; prior imports survive demo", () => {
  const demo = sessionReducer(initialSession("en"), { type: "demo", history: buildDemoHistory() }); assert.ok(activeHistory(demo).length);
  const personal = commit(demo, "SPY 35\nQQQ 35\nTLT 20\nGLD 10"); assert.equal(activeHistory(personal).length, 0); assert.equal(personal.historyNotice, "detached"); assert.ok(personal.demoHistory.length);
  const original = imported(); const back = commit(sessionReducer(original, { type: "demo", history: buildDemoHistory() }), original.draft.text); assert.equal(activeHistory(back), activeHistory(original));
});
test("H: replay starts unrequested and changing the window removes stale replay", () => {
  let state = imported(); assert.equal(state.requestedEpisode, null);
  state = sessionReducer(state, { type: "episode", episode: "COVID_CRASH" }); assert.equal(state.requestedEpisode, null);
  state = sessionReducer(state, { type: "run-replay" }); assert.equal(state.requestedEpisode, "COVID_CRASH");
  state = sessionReducer(state, { type: "episode", episode: "GFC_HOUSING_CREDIT" }); assert.equal(state.requestedEpisode, null);
});
test("history evidence reports actual return sample, currency, nature and source rather than CSV count", () => {
  const state = imported(); const a = analyzePortfolioForDisplay(state.committed!.holdings, activeHistory(state)); const e = historyEvidence(a, activeHistory(state));
  assert.ok(e); assert.equal(e.count, 252); assert.equal(e.end, "2026-02-20"); assert.equal(e.currency, "USD"); assert.ok(e.synthetic); assert.ok(e.sources.length); assert.ok(e.provenance.length);
});
test("stress is neutral until applied and malformed fields never become zero", () => {
  const state = imported(); assert.equal(state.scenario.applied, false); assert.equal(state.scenario.lambda, 0); assert.equal(state.scenario.multiplier, 1);
  for (const token of ["", "-101", "-10abc", "-10,5", "NaN"]) assert.equal(scenarioValues({ ...state.scenario, shocks: { SPY: token } }, ["SPY"]), null);
});
test("chosen direct stress and weight experiment use existing kernels and unchanged assumptions", () => {
  const state = commit(); const a = analyzePortfolioForDisplay(state.committed!.holdings, []);
  const scenario = { ...state.scenario, shocks: { SPY: "-10", QQQ: "-20", TLT: "0" }, applied: true };
  const e = experimentResult(a, "change", "SPY", 40, scenario); assert.ok(e); assert.equal(e.changed.status, "OK");
  assert.equal(e.concentration?.status, "OK"); if (e.concentration?.status === "OK") assert.ok(Math.abs(e.concentration.hhi - .35125) < 1e-12);
  assert.equal(e.stress?.direct?.status, "OK"); if (e.stress?.direct?.status === "OK") assert.ok(Math.abs(e.stress.direct.portfolio_stress_return + .115) < 1e-12);
});
test("full correlation convergence loses imperfect-correlation benefit; removal respects group minimum", () => {
  const state = imported(); const a = analyzePortfolioForDisplay(state.committed!.holdings, activeHistory(state)); if (a.status !== "OK" || a.normalization.status !== "OK") return assert.fail();
  const stressed = scenarioResult(a.normalization.asset_ids, a.normalization.normalized_weights, { ...state.scenario, lambda: 1, applied: true }, a.history);
  assert.equal(stressed.stressedRisk?.status, "OK"); if (stressed.stressedRisk?.status === "OK") assert.ok(Math.abs(stressed.stressedRisk.diversification_ratio - 1) < 1e-12);
  const three = commit(state, "SPY 40\nQQQ 40\nTLT 20"); const base = analyzePortfolioForDisplay(three.committed!.holdings, activeHistory(three)); const e = experimentResult(base, "remove", "TLT", 0, state.scenario);
  assert.equal(e?.groups?.status, "UNAVAILABLE"); assert.equal(e?.risk?.status, "OK");
});
