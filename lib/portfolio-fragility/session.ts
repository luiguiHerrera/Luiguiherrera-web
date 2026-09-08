import { analyzePortfolio, type Holding, type HistoryObservation, type ReplayWindowId } from "./engine.ts";
import { previewPortfolio, sameDraft, type PortfolioDraft, type PortfolioPreview, type InputIssue } from "./holdings-input.ts";

export type HistoryDataset = { rows: HistoryObservation[]; kind: "demo" | "local"; name: string };
export type Scenario = { shocks: Record<string, string>; multiplier: number; lambda: number; applied: boolean };
export type Session = {
  draft: PortfolioDraft; preview: PortfolioPreview | null; issues: InputIssue[];
  committed: PortfolioPreview | null; portfolioSource: "local" | "demo";
  importedHistory: HistoryDataset | null; demoHistory: HistoryObservation[]; historyKind: "none" | "local" | "demo"; historyNotice: "retained" | "detached" | "cleared" | "loaded" | null;
  importRequest: number; loading: boolean; importError: boolean;
  scenarioDraft: Scenario; scenario: Scenario;
  episode: ReplayWindowId | ""; requestedEpisode: ReplayWindowId | null;
  experiment: { operation: "remove" | "change"; selected: string; target: number };
};
export function neutralScenario(): Scenario { return { shocks: {}, multiplier: 1, lambda: 0, applied: false }; }
export function initialSession(locale: "es" | "en"): Session {
  return {
    draft: { text: "SPY 60\nQQQ 25\nTLT 15", numberFormat: locale === "es" ? "comma" : "dot", unit: "percentages" },
    preview: null, issues: [], committed: null, portfolioSource: "local", importedHistory: null, demoHistory: [], historyKind: "none", historyNotice: null,
    importRequest: 0, loading: false, importError: false, scenario: neutralScenario(), scenarioDraft: neutralScenario(),
    episode: "", requestedEpisode: null, experiment: { operation: "change", selected: "SPY", target: 60 },
  };
}
export type SessionAction =
  | { type: "draft"; draft: PortfolioDraft } | { type: "preview" } | { type: "commit" }
  | { type: "demo"; history: HistoryObservation[] }
  | { type: "import-start" } | { type: "import-success"; request: number; dataset: HistoryDataset }
  | { type: "import-failure"; request: number } | { type: "clear-history" }
  | { type: "scenario-draft"; scenario: Scenario } | { type: "apply-scenario" }
  | { type: "episode"; episode: ReplayWindowId | "" } | { type: "run-replay" }
  | { type: "experiment"; experiment: Session["experiment"] };

export function activeHistory(state: Session): HistoryObservation[] {
  return state.historyKind === "demo" && state.portfolioSource === "demo" ? state.demoHistory : state.historyKind === "local" ? state.importedHistory?.rows ?? [] : [];
}
export function hasUnanalyzedChanges(state: Session) {
  return !!state.committed && (!sameDraft(state.draft, state.committed.draft) || state.portfolioSource === "demo");
}
export function scenarioValues(scenario: Scenario, ids: string[]) {
  const shocks: number[] = [];
  for (const id of ids) {
    const text = scenario.shocks[id] ?? "0";
    // Scenario fields use explicitly labelled dot decimals independently of holdings format.
    if (!/^-?\d+(?:\.\d+)?$/.test(text)) return null;
    const value = Number(text) / 100;
    if (!Number.isFinite(value) || value < -1) return null;
    shocks.push(value);
  }
  return shocks;
}
export function sessionReducer(state: Session, action: SessionAction): Session {
  switch (action.type) {
    case "draft": return { ...state, draft: action.draft, preview: null, issues: [] };
    case "preview": {
      const result = previewPortfolio(state.draft);
      return { ...state, preview: result.ok ? result.preview : null, issues: result.ok ? [] : result.issues };
    }
    case "commit": {
      if (!state.preview || !sameDraft(state.preview.draft, state.draft)) return state;
      const ids = state.preview.holdings.filter((h) => h.rawWeight > 0).map((h) => h.assetId);
      const oldIds = state.committed?.holdings.filter((h) => h.rawWeight > 0).map((h) => h.assetId) ?? [];
      const sameIds = ids.length === oldIds.length && ids.every((id) => oldIds.includes(id));
      const selected = ids.includes(state.experiment.selected) ? state.experiment.selected : ids[0];
      return { ...state, committed: state.preview, portfolioSource: "local", importRequest: state.importRequest + 1, loading: false,
        historyKind: state.historyKind === "demo" ? state.importedHistory ? "local" : "none" : state.historyKind,
        historyNotice: state.historyKind === "demo" ? "detached" : state.importedHistory ? "retained" : null,
        scenario: sameIds && state.portfolioSource === "local" ? state.scenario : neutralScenario(),
        scenarioDraft: sameIds && state.portfolioSource === "local" ? state.scenarioDraft : neutralScenario(),
        experiment: { ...state.experiment, selected }, requestedEpisode: null };
    }
    case "demo": {
      const result = previewPortfolio({ text: "SPY 35\nQQQ 35\nTLT 20\nGLD 10", numberFormat: "dot", unit: "percentages" });
      if (!result.ok) return state;
      return { ...state, committed: result.preview, portfolioSource: "demo", demoHistory: action.history, historyKind: "demo",
        historyNotice: null, preview: null, issues: [], loading: false, importError: false, importRequest: state.importRequest + 1,
        scenario: neutralScenario(), scenarioDraft: neutralScenario(), requestedEpisode: null, episode: "", experiment: { operation: "change", selected: "SPY", target: 35 } };
    }
    case "import-start": return { ...state, importRequest: state.importRequest + 1, loading: true, importError: false };
    case "import-success": return action.request === state.importRequest ? { ...state, importedHistory: action.dataset, historyKind: "local", historyNotice: "loaded", loading: false, importError: false, requestedEpisode: null } : state;
    case "import-failure": return action.request === state.importRequest ? { ...state, loading: false, importError: true } : state;
    case "clear-history": return { ...state, importedHistory: state.historyKind === "demo" ? state.importedHistory : null, demoHistory: state.historyKind === "demo" ? [] : state.demoHistory, historyKind: "none", historyNotice: "cleared", loading: false, importError: false, importRequest: state.importRequest + 1, requestedEpisode: null };
    case "scenario-draft": return { ...state, scenarioDraft: action.scenario };
    case "apply-scenario": {
      const ids = state.committed?.holdings.filter((h) => h.rawWeight > 0).map((h) => h.assetId) ?? [];
      return scenarioValues(state.scenarioDraft, ids) ? { ...state, scenario: { ...state.scenarioDraft, shocks: { ...state.scenarioDraft.shocks }, applied: true } } : state;
    }
    case "episode": return { ...state, episode: action.episode, requestedEpisode: null };
    case "run-replay": return state.episode ? { ...state, requestedEpisode: state.episode } : state;
    case "experiment": return { ...state, experiment: action.experiment };
  }
}

// Validate a replacement before touching the last loaded dataset. This is not a new import wizard.
export function validateHistoryReplacement(rows: HistoryObservation[]) {
  if (!rows.length) throw new Error("Empty history");
  const metadata = new Map<string, string>();
  for (const row of rows) {
    if (!row.assetId || !/^[A-Z]{3}$/.test(row.currency) || !["TOTAL_RETURN", "PRICE_RETURN_SPLIT_ADJUSTED", "UNADJUSTED_PRICE"].includes(row.returnBasis)) throw new Error("Invalid history metadata");
    const signature = JSON.stringify([row.currency, row.returnBasis, row.source, row.provenance, row.inceptionDate]);
    if (metadata.has(row.assetId) && metadata.get(row.assetId) !== signature) throw new Error("Inconsistent series metadata");
    metadata.set(row.assetId, signature);
  }
  const holdings: Holding[] = [...metadata.keys()].map((assetId) => ({ assetId, rawWeight: 1 }));
  const result = analyzePortfolio(holdings, rows);
  if (result.status === "UNAVAILABLE" || (result.history.status === "UNAVAILABLE" && result.history.reason_code === "INVALID_INPUT")) throw new Error("Malformed history");
}
