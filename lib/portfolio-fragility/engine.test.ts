import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { analyzePortfolio, covarianceStress, directStress, historicalReplay, normalizeWeights, removeHolding } from "./engine.ts";
import { buildDemoHistory, DEMO_HOLDINGS, parseHistoryCsv, parsePortfolioText } from "./demo-data.ts";

function analysisHistoryStatus(rows: ReturnType<typeof buildDemoHistory>) {
  const result = analyzePortfolio(DEMO_HOLDINGS, rows);
  return result.status === "UNAVAILABLE" ? result : result.history;
}

test("normalization rejects duplicates, negative and non-finite inputs", () => {
  const reason = (value: ReturnType<typeof normalizeWeights>) => value.status === "UNAVAILABLE" ? value.reason_code : "OK";
  assert.equal(reason(normalizeWeights(parsePortfolioText("SPY 60\nSPY 40"))), "INVALID_INPUT");
  assert.equal(reason(normalizeWeights(parsePortfolioText("SPY -1\nTLT 2"))), "UNSUPPORTED_PORTFOLIO");
  assert.equal(reason(normalizeWeights(parsePortfolioText("SPY nope"))), "INVALID_INPUT");
});

test("missing history preserves capital metrics and returns typed unavailable", () => {
  const result = analyzePortfolio(DEMO_HOLDINGS, []);
  assert.equal(result.status, "OK");
  if (result.status !== "OK") return;
  assert.equal(result.history.status, "UNAVAILABLE");
  assert.equal(result.concentration.status, "OK");
});

test("bundled demonstration analysis is deterministic and complete", () => {
  const history = buildDemoHistory();
  const first = analyzePortfolio(DEMO_HOLDINGS, history);
  const second = analyzePortfolio(DEMO_HOLDINGS, history);
  assert.deepEqual(first, second);
  assert.equal(first.status, "OK");
  if (first.status !== "OK") return;
  assert.equal(first.history.status, "OK");
  if (first.history.status === "OK") {
    assert.equal(first.history.clustering.status, "OK");
    assert.equal(first.history.drawdown.status, "OK");
    assert.equal(first.history.risk.status, "OK");
  }
});

test("mixed basis, currency mismatch, and partial history never silently coerce", () => {
  const history = buildDemoHistory();
  const mixed = history.map((row, index) => index === 0 ? { ...row, returnBasis: "PRICE_RETURN_SPLIT_ADJUSTED" as const } : row);
  const currency = history.map((row) => row.assetId === "TLT" ? { ...row, currency: "EUR" } : row);
  const partial = history.filter((row) => row.assetId !== "TLT");
  for (const [rows, reason] of [[mixed, "UNAVAILABLE_PRICE_ONLY"], [currency, "FX_UNAVAILABLE"], [partial, "MISSING_EPISODE_COVERAGE"]] as const) {
    const result = analyzePortfolio(DEMO_HOLDINGS, rows);
    assert.equal(result.status, "OK"); if (result.status === "OK") assert.equal(result.history.status === "UNAVAILABLE" && result.history.reason_code, reason);
  }
});

test("historical replay is explicit, uses no proxy, and respects inception", () => {
  const history = buildDemoHistory();
  const gfc = historicalReplay(DEMO_HOLDINGS, history, "GFC_HOUSING_CREDIT");
  assert.equal(gfc.status, "OK"); if (gfc.status === "OK") assert.equal(gfc.semantics, "HISTORICAL_REPLAY");
  const dotcom = historicalReplay(DEMO_HOLDINGS, history, "DOTCOM_TECH_UNWIND");
  assert.equal(dotcom.status, "UNAVAILABLE");
  assert.ok(dotcom.status === "UNAVAILABLE" && ["ASSET_NOT_EXIST", "MISSING_EPISODE_COVERAGE"].includes(dotcom.reason_code));
  const diagnostic = historicalReplay(DEMO_HOLDINGS, history, "2022_EQUITY_DRAWDOWN_DIAGNOSTIC");
  assert.equal(diagnostic.status, "OK");
  if (diagnostic.status === "OK") {
    assert.equal(diagnostic.episode_id, "INFLATION_RATES_2022");
    assert.equal(diagnostic.replay_window_id, "2022_EQUITY_DRAWDOWN_DIAGNOSTIC");
  }
});

test("stress and counterfactual math preserve explicit assumptions", () => {
  const normalized = normalizeWeights(DEMO_HOLDINGS); assert.equal(normalized.status, "OK"); if (normalized.status !== "OK") return;
  assert.equal(directStress(normalized.asset_ids, normalized.normalized_weights, [-0.1, -0.2, -0.3, 0]).status, "OK");
  assert.equal(covarianceStress(["A", "B"], [0.5, 0.5], [0.2, 0.1], [[1, 0.2], [0.2, 1]], [1.5, 1.5], 0.5).status, "OK");
  const removed = removeHolding(normalized.asset_ids, normalized.normalized_weights, normalized.asset_ids[0]);
  assert.equal(removed.status, "OK"); if (removed.status === "OK") assert.ok(Math.abs(removed.normalized_weights.reduce((a, b) => a + b, 0) - 1) < 1e-12);
});

test("local CSV parser requires an explicit documented basis", () => {
  assert.throws(() => parseHistoryCsv("date,asset,value\n2024-01-01,SPY,100"));
  assert.equal(parseHistoryCsv("date,asset,value,currency,return_basis\n2024-01-01,SPY,100,USD,TOTAL_RETURN")[0].assetId, "SPY");
  assert.throws(() => parseHistoryCsv("date,asset,value,currency,return_basis\n2024-01-01,SPY,100,USD,TOTAL_RETURN,EXTRA"), /exactly one value/);
  assert.throws(() => parseHistoryCsv("date,asset,value,currency,return_basis,unknown\n2024-01-01,SPY,100,USD,TOTAL_RETURN,x"), /unsupported column/);
});

test("missing internal observation fails analysis and replay without complete-case deletion", () => {
  const missing = buildDemoHistory().filter((row) => !(row.assetId === "SPY" && row.date === "2020-02-20"));
  const analysis = analysisHistoryStatus(missing);
  assert.equal(analysis.status, "UNAVAILABLE");
  if (analysis.status === "UNAVAILABLE") {
    assert.equal(analysis.reason_code, "MISSING_EPISODE_COVERAGE");
    assert.deepEqual(analysis.observed, { missing_dates_by_asset: [{ asset_id: "SPY", missing_dates: ["2020-02-20"] }] });
  }
  const replay = historicalReplay(DEMO_HOLDINGS, missing, "COVID_CRASH");
  assert.equal(replay.status, "UNAVAILABLE");
  if (replay.status === "UNAVAILABLE") assert.equal(replay.reason_code, "MISSING_EPISODE_COVERAGE");
});

test("aligned history accepts shared non-trading calendar gaps without inventing a trading calendar", () => {
  const sharedCalendar = buildDemoHistory().filter((row) => {
    if (row.date < "2025-01-02") return false;
    const day = new Date(row.date + "T00:00:00Z").getUTCDay();
    return day === 1 || day === 3 || day === 5;
  });
  const result = analysisHistoryStatus(sharedCalendar);
  assert.equal(result.status, "OK");
});

test("partial replay window and mismatched asset grids are explicit coverage failures", () => {
  const history = buildDemoHistory();
  const partialWindow = history.filter((row) => row.date < "2020-02-19" || row.date > "2020-03-23" || row.date >= "2020-02-26");
  const partial = historicalReplay(DEMO_HOLDINGS, partialWindow, "COVID_CRASH");
  assert.equal(partial.status, "UNAVAILABLE");
  if (partial.status === "UNAVAILABLE") assert.equal(partial.reason_code, "MISSING_EPISODE_COVERAGE");
  const mismatch = history.filter((row) => !(row.assetId === "TLT" && row.date === "2025-05-05"));
  const mismatchResult = analysisHistoryStatus(mismatch);
  assert.equal(mismatchResult.status, "UNAVAILABLE");
  if (mismatchResult.status === "UNAVAILABLE") assert.equal(mismatchResult.reason_code, "MISSING_EPISODE_COVERAGE");
});

test("duplicate asset/date rows fail before replay maps can overwrite evidence", () => {
  const history = buildDemoHistory();
  const original = history.find((row) => row.assetId === "SPY" && row.date === "2020-02-20");
  assert.ok(original);
  for (const duplicate of [{ ...original }, { ...original, value: 999 }]) {
    const rows = [...history, duplicate];
    const analysis = analysisHistoryStatus(rows);
    assert.equal(analysis.status, "UNAVAILABLE");
    if (analysis.status === "UNAVAILABLE") assert.equal(analysis.reason_code, "INVALID_INPUT");
    const replay = historicalReplay(DEMO_HOLDINGS, rows, "COVID_CRASH");
    assert.equal(replay.status, "UNAVAILABLE");
    if (replay.status === "UNAVAILABLE") {
      assert.equal(replay.reason_code, "INVALID_INPUT");
      assert.deepEqual(replay.observed, { duplicate_asset_dates: [{ asset_id: "SPY", date: "2020-02-20" }] });
    }
  }
});

test("duplicates remain invalid after unsorted input, chunk concatenation, or in one otherwise valid asset", () => {
  const history = buildDemoHistory();
  const duplicate = { ...history.find((row) => row.assetId === "QQQ" && row.date === "2022-06-01")! };
  const chunks = [history.slice(0, 500), history.slice(500), [duplicate]];
  const concatenated = chunks.flat();
  const duplicateResult = analysisHistoryStatus(concatenated);
  assert.equal(duplicateResult.status, "UNAVAILABLE");
  if (duplicateResult.status === "UNAVAILABLE") assert.equal(duplicateResult.reason_code, "INVALID_INPUT");
  const unsortedDuplicate = [...history].reverse().concat(duplicate);
  const unsortedDuplicateResult = analysisHistoryStatus(unsortedDuplicate);
  assert.equal(unsortedDuplicateResult.status, "UNAVAILABLE");
  if (unsortedDuplicateResult.status === "UNAVAILABLE") assert.equal(unsortedDuplicateResult.reason_code, "INVALID_INPUT");
});

test("unsorted unique history fails explicitly while unique ascending control remains valid", () => {
  const history = buildDemoHistory();
  const unsorted = [...history].reverse();
  const rejected = analysisHistoryStatus(unsorted);
  assert.equal(rejected.status, "UNAVAILABLE");
  if (rejected.status === "UNAVAILABLE") {
    assert.equal(rejected.reason_code, "INVALID_INPUT");
    assert.equal(rejected.required.date_order, "strictly ascending within each asset");
  }
  assert.equal(analysisHistoryStatus(history).status, "OK");
});

test("source contains no market-data network or persistence calls", () => {
  const sources = ["engine.ts", "demo-data.ts"].map((name) => readFileSync(new URL("./" + name, import.meta.url), "utf8")).join("\n");
  assert.doesNotMatch(sources, /fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|Twelve Data|CoinGecko|api[_-]?key/i);
});
