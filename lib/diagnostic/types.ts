export type DiagnosticMode = "quick" | "complete";
export type DiagnosticLocale = "es" | "en";

export type DiagnosticScoreKey =
  | "financialCapacity"
  | "liquidityStrength"
  | "timeHorizon"
  | "emotionalTolerance"
  | "patience"
  | "fomoSensitivity"
  | "euphoriaRisk"
  | "knowledgeValidated"
  | "experienceReal"
  | "expectationRealism"
  | "consistency"
  | "productComplexity"
  | "overconfidence"
  | "calibration";

export type DiagnosticScores = Record<DiagnosticScoreKey, number>;

export type DiagnosticBlock =
  | "setup"
  | "financial"
  | "pressure"
  | "expectations"
  | "knowledge"
  | "experience"
  | "bias"
  | "products";

export type DiagnosticProduct =
  | "cash"
  | "bonds"
  | "indexFunds"
  | "individualStocks"
  | "sectorEtfs"
  | "crypto"
  | "options"
  | "leverage"
  | "shortSelling";

export type DiagnosticFlag =
  | "liquidity_fragility"
  | "near_cash_need"
  | "capital_concentration"
  | "declared_high_tolerance"
  | "pressure_low_tolerance"
  | "panic_sell"
  | "fomo_entry"
  | "social_pressure"
  | "overconfidence"
  | "euphoria_sizing"
  | "knowledge_gap_basic"
  | "knowledge_gap_complex"
  | "claims_knowledge"
  | "humble_uncertainty"
  | "unrealistic_expectations"
  | "loss_recovery_bias"
  | "complex_products_selected"
  | "product_mismatch"
  | "no_written_process"
  | "concentration_bias";

export type LocalizedText = Record<DiagnosticLocale, string>;

export type DiagnosticOption = {
  id: string;
  label: LocalizedText;
  detail?: LocalizedText;
  scores?: Partial<DiagnosticScores>;
  flags?: DiagnosticFlag[];
  products?: DiagnosticProduct[];
};

export type DiagnosticQuestion = {
  id: string;
  block: DiagnosticBlock;
  prompt: LocalizedText;
  helper: LocalizedText;
  mode: DiagnosticMode[];
  multi?: boolean;
  adaptiveFor?: DiagnosticProduct[];
  options: DiagnosticOption[];
};

export type DiagnosticAnswers = Record<string, string | string[]>;

export type DiagnosticProfile =
  | "Preservación"
  | "Equilibrio prudente"
  | "Crecimiento moderado"
  | "Crecimiento dinámico"
  | "Riesgo especulativo";

export type ComplexityBand = "Básica" | "Intermedia" | "Alta" | "Compleja";

export type DiagnosticResult = {
  mode: DiagnosticMode;
  profile: DiagnosticProfile;
  declaredProfile: DiagnosticProfile;
  pressureProfile: DiagnosticProfile;
  summary: string;
  pressureSummary: string;
  expectationTensions: string[];
  lossCapacity: {
    label: string;
    note: string;
    score: number;
  };
  knowledge: {
    label: string;
    note: string;
    score: number;
  };
  complexity: {
    band: ComplexityBand;
    note: string;
    score: number;
  };
  alerts: string[];
  flags: DiagnosticFlag[];
  route: {
    href: string;
    label: string;
    note: string;
  };
  scores: DiagnosticScores;
  selectedProducts: DiagnosticProduct[];
  disclaimer: string;
};
