import assert from "node:assert/strict";
import test from "node:test";
import { analyzePortfolioForDisplay } from "./analysis-view.ts";
import type { HistoryObservation } from "./engine.ts";
import { parsePortfolioText } from "./demo-data.ts";

const row = (assetId: string, date: string, value: number): HistoryObservation => ({
  assetId, date, value, currency: "USD", returnBasis: "TOTAL_RETURN",
  source: "test fixture", provenance: "test fixture",
});
const VALID_PORTFOLIO = parsePortfolioText("SPY 60\nTLT 40");
const NON_ISO_DATE_HISTORY = [
  row("SPY", "2020-01-02", 100), row("SPY", "03/01/2020", 101),
  row("TLT", "2020-01-02", 100), row("TLT", "2020-01-03", 101),
];
const DUPLICATE_ROW_HISTORY = [
  row("SPY", "2020-01-02", 100), row("SPY", "2020-01-02", 101),
  row("TLT", "2020-01-02", 100), row("TLT", "2020-01-03", 101),
];

// H1 regression: a history-origin INVALID_INPUT must never surface as a portfolio failure, because
// the portfolio branch drives portfolio-specific remediation copy and gates the recovery controls.
for (const [label, history] of [["non-ISO dates", NON_ISO_DATE_HISTORY], ["duplicate rows", DUPLICATE_ROW_HISTORY]] as const) {
  test("valid portfolio with " + label + " reports a history failure, not a portfolio failure", () => {
    const result = analyzePortfolioForDisplay(VALID_PORTFOLIO, history);
    assert.equal(result.status, "OK");
    if (result.status !== "OK") return;
    assert.equal(result.normalization.status, "OK");
    assert.equal(result.concentration.status, "OK");
    assert.equal(result.history.status, "UNAVAILABLE");
    if (result.history.status !== "UNAVAILABLE") return;
    assert.equal(result.history.reason_code, "INVALID_INPUT");
  });
}

test("capital metrics stay authoritative and identical whether history is invalid or absent", () => {
  const withBadHistory = analyzePortfolioForDisplay(VALID_PORTFOLIO, NON_ISO_DATE_HISTORY);
  const withoutHistory = analyzePortfolioForDisplay(VALID_PORTFOLIO, []);
  assert.equal(withBadHistory.status, "OK");
  assert.equal(withoutHistory.status, "OK");
  if (withBadHistory.status !== "OK" || withoutHistory.status !== "OK") return;
  assert.deepEqual(withBadHistory.concentration, withoutHistory.concentration);
  assert.deepEqual(withBadHistory.normalization, withoutHistory.normalization);
});

test("missing history keeps the capital-only path and its own reason code", () => {
  const result = analyzePortfolioForDisplay(VALID_PORTFOLIO, []);
  assert.equal(result.status, "OK");
  if (result.status !== "OK") return;
  assert.equal(result.history.status, "UNAVAILABLE");
  if (result.history.status !== "UNAVAILABLE") return;
  assert.equal(result.history.reason_code, "MISSING_EPISODE_COVERAGE");
});

test("an unnormalizable portfolio still fails at the top level so downstream gating holds", () => {
  const result = analyzePortfolioForDisplay(parsePortfolioText("SPY nope"), []);
  assert.equal(result.status, "UNAVAILABLE");
  if (result.status !== "UNAVAILABLE") return;
  assert.equal(result.reason_code, "INVALID_INPUT");
});

test("a short or leveraged portfolio keeps its own reason code", () => {
  const result = analyzePortfolioForDisplay(parsePortfolioText("SPY -10\nTLT 60"), []);
  assert.equal(result.status, "UNAVAILABLE");
  if (result.status !== "UNAVAILABLE") return;
  assert.equal(result.reason_code, "UNSUPPORTED_PORTFOLIO");
});

test("a broken portfolio is not masked as a history failure when history is also present", () => {
  for (const text of ["SPY nope", "SPY -10\nTLT 60", "SPY 60\nSPY 40"]) {
    const result = analyzePortfolioForDisplay(parsePortfolioText(text), NON_ISO_DATE_HISTORY);
    assert.equal(result.status, "UNAVAILABLE", text + " must remain a portfolio failure");
  }
});

test("a single-holding portfolio keeps every capital reading it can actually produce", () => {
  const result = analyzePortfolioForDisplay(parsePortfolioText("SPY 100"), []);
  assert.equal(result.status, "OK");
  if (result.status !== "OK" || result.concentration.status !== "OK") return;
  assert.equal(result.concentration.hhi, 1);
  assert.equal(result.concentration.effective_holdings, 1);
  assert.equal(result.concentration.top_n_concentration?.["1"], 1);
});
