export type DiagnosticMode = "quick" | "complete";

export type DiagnosticDimension =
  | "knowledgeScore"
  | "experienceScore"
  | "psychologicalToleranceScore"
  | "riskCapacityScore"
  | "liquidityPressureScore"
  | "timeHorizonScore"
  | "behavioralRiskScore"
  | "consistencyScore";

export type DiagnosticBlock =
  | "Situación y capacidad"
  | "Objetivos"
  | "Tolerancia psicológica"
  | "Conocimiento financiero"
  | "Experiencia real"
  | "Sesgos y comportamiento"
  | "Consistencia";

export type DiagnosticOption = {
  label: string;
  detail?: string;
  scores?: Partial<Record<DiagnosticDimension, number>>;
  flags?: string[];
};

export type DiagnosticQuestion = {
  id: string;
  block: DiagnosticBlock;
  prompt: string;
  helper: string;
  quick?: boolean;
  options: DiagnosticOption[];
};

export type DiagnosticAnswers = Record<string, string>;

export type ProductConvenience =
  | "Adecuado para aprender"
  | "Requiere más formación"
  | "No conveniente según respuestas"
  | "Evitar hasta comprender riesgos";

export type ProductConvenienceRow = {
  product: string;
  status: ProductConvenience;
  note: string;
};

export type DiagnosticResult = {
  mode: DiagnosticMode;
  profile: string;
  capacityLabel: string;
  knowledgeLabel: string;
  confidenceLabel: string;
  summary: string;
  dimensions: Record<DiagnosticDimension, number>;
  alerts: string[];
  productConvenience: ProductConvenienceRow[];
  explanation: string;
  disclaimer: string;
};
