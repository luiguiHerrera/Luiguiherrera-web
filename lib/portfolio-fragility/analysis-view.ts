import { analyzePortfolio, behaviourClusters, changeHolding, concentrationMetrics, covarianceStress, directStress, portfolioRisk, removeHolding, simpleReturns, type Analysis, type HistoryObservation, type Holding, type Unavailable } from "./engine.ts";
import { scenarioValues, type Scenario } from "./session.ts";

// analyzePortfolio propagates a history-alignment INVALID_INPUT to the top level, so a valid
// portfolio with a malformed history is indistinguishable from a malformed portfolio. Re-running the
// same entry point without history isolates the origin: if the portfolio alone analyses, the failure
// belongs in the history slot where every other history failure already lives.
export function analyzePortfolioForDisplay(
  holdings: readonly Holding[], history: readonly HistoryObservation[],
): Analysis | Unavailable {
  const full = analyzePortfolio(holdings, history);
  if (full.status === "OK" || !history.length) return full;
  const capitalOnly = analyzePortfolio(holdings, []);
  return capitalOnly.status === "OK" ? { ...capitalOnly, history: full } : full;
}

export function largestPositions(ids: string[], weights: number[]) {
  const weight = Math.max(...weights);
  return { ids: ids.filter((_, i) => weights[i] === weight), weight };
}

// Presentation facts are projected from the actual engine sample, never the full CSV row count.
export function historyEvidence(analysis: Analysis | Unavailable | null, rows: HistoryObservation[]) {
  if (!analysis || analysis.status !== "OK" || analysis.history.status !== "OK" || analysis.normalization.status !== "OK") return null;
  const h = analysis.history; const returns = simpleReturns(h.dates, h.values);
  const count = h.covariance.status === "OK" ? h.covariance.observation_count : 0;
  const usedDates = returns.status === "OK" ? returns.dates.slice(-count) : [];
  const firstEndIndex = usedDates.length ? h.dates.indexOf(usedDates[0]) : -1;
  const active = rows.filter((row) => analysis.normalization.status === "OK" && analysis.normalization.asset_ids.includes(row.assetId));
  return {
    start: firstEndIndex > 0 ? h.dates[firstEndIndex - 1] : h.dates[0], end: usedDates.at(-1) ?? h.dates.at(-1), count,
    currency: h.currency, basis: h.returnBasis,
    sources: [...new Set(active.map((row) => row.source))], provenance: [...new Set(active.map((row) => row.provenance))],
    gaps: returns.status === "OK" ? returns.excluded_gap_end_dates : [], lowSample: count < 252,
    synthetic: active.some((row) => /synthetic|sint[eé]tic/i.test(row.source + " " + row.provenance)),
  };
}

export function scenarioResult(ids: string[], weights: number[], scenario: Scenario, historical: Analysis["history"] | null) {
  const shocks = scenarioValues(scenario, ids);
  const direct = shocks ? directStress(ids, weights, shocks) : null;
  const covariance = historical?.status === "OK" && historical.covariance.status === "OK" && historical.correlation.status === "OK"
    ? covarianceStress(ids, weights, historical.covariance.volatility_annual, historical.correlation.correlation, ids.map(() => scenario.multiplier), scenario.lambda) : null;
  const stressedRisk = covariance?.status === "OK" ? portfolioRisk(ids, weights, covariance.stressed_covariance as number[][]) : null;
  return { direct, covariance, stressedRisk };
}

export function experimentResult(analysis: Analysis | Unavailable | null, operation: "remove" | "change", selected: string, target: number, scenario: Scenario) {
  if (!analysis || analysis.status !== "OK" || analysis.normalization.status !== "OK") return null;
  const { asset_ids: ids, normalized_weights: weights } = analysis.normalization;
  const changed = operation === "remove" ? removeHolding(ids, weights, selected) : changeHolding(ids, weights, selected, target / 100);
  if (changed.status !== "OK") return { changed, concentration: null, risk: null, groups: null, stress: null, largest: null };
  const w = changed.normalized_weights; const h = analysis.history;
  const concentration = concentrationMetrics(ids, w);
  const risk = h.status === "OK" && h.covariance.status === "OK" ? portfolioRisk(ids, w, h.covariance.covariance_annual) : null;
  // The kernel retains zero rows in counterfactuals. Project its active submatrix for groups only.
  const active = ids.map((id, i) => ({ id, i })).filter(({ i }) => w[i] > 0);
  const groups = h.status === "OK" && h.correlation.status === "OK" && h.covariance.status === "OK"
    ? behaviourClusters(active.map(({ id }) => id), active.map(({ i }) => w[i]), active.map(({ i }) => active.map(({ i: j }) => h.correlation.status === "OK" ? h.correlation.correlation[i][j] : 0)), h.covariance.observation_count) : null;
  return { changed, concentration, risk, groups, largest: largestPositions(ids, w), stress: scenarioResult(ids, w, scenario, h) };
}
