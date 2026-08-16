import { analyzePortfolio, type Analysis, type HistoryObservation, type Holding, type Unavailable } from "./engine.ts";

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
