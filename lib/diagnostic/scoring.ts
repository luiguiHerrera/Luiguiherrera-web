import { diagnosticQuestions, getQuestionsForMode } from "@/lib/diagnostic/questions";
import type { DiagnosticAnswers, DiagnosticDimension, DiagnosticMode, DiagnosticOption, DiagnosticResult, ProductConvenience, ProductConvenienceRow } from "@/lib/diagnostic/types";

const dimensions: DiagnosticDimension[] = [
  "knowledgeScore",
  "experienceScore",
  "psychologicalToleranceScore",
  "riskCapacityScore",
  "liquidityPressureScore",
  "timeHorizonScore",
  "behavioralRiskScore",
  "consistencyScore",
];

const defaultScores: Record<DiagnosticDimension, number> = {
  knowledgeScore: 45,
  experienceScore: 40,
  psychologicalToleranceScore: 50,
  riskCapacityScore: 50,
  liquidityPressureScore: 50,
  timeHorizonScore: 50,
  behavioralRiskScore: 45,
  consistencyScore: 70,
};

const productOrder = [
  "Liquidez / fondos monetarios",
  "Bonos simples",
  "Fondos indexados diversificados",
  "Acciones individuales",
  "ETFs sectoriales/temáticos",
  "Criptoactivos",
  "Derivados",
  "Apalancamiento",
  "Venta en corto",
];

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function selectedOptions(answers: DiagnosticAnswers): Array<{ option: DiagnosticOption; questionId: string }> {
  return diagnosticQuestions
    .map((question) => {
      const answer = answers[question.id];
      const option = question.options.find((candidate) => candidate.label === answer);
      return option ? { option, questionId: question.id } : null;
    })
    .filter((item): item is { option: DiagnosticOption; questionId: string } => item !== null);
}

function flagSet(answers: DiagnosticAnswers) {
  const flags = new Set<string>();
  for (const { option } of selectedOptions(answers)) {
    for (const flag of option.flags ?? []) flags.add(flag);
  }
  return flags;
}

function averageScores(answers: DiagnosticAnswers): Record<DiagnosticDimension, number> {
  const buckets = Object.fromEntries(dimensions.map((dimension) => [dimension, [] as number[]])) as Record<DiagnosticDimension, number[]>;

  for (const { option } of selectedOptions(answers)) {
    for (const dimension of dimensions) {
      const score = option.scores?.[dimension];
      if (typeof score === "number") buckets[dimension].push(score);
    }
  }

  return Object.fromEntries(
    dimensions.map((dimension) => {
      const values = buckets[dimension];
      const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : defaultScores[dimension];
      return [dimension, clamp(average)];
    }),
  ) as Record<DiagnosticDimension, number>;
}

function applyConsistencyPenalties(scores: Record<DiagnosticDimension, number>, flags: Set<string>) {
  let penalty = 0;

  if (flags.has("declares_high_tolerance") && (flags.has("sells_mild_drop") || flags.has("sells_crisis") || flags.has("panic_exit"))) penalty += 22;
  if ((flags.has("liquidity_under_12m") || flags.has("near_liquidity_need")) && flags.has("high_vol_preference")) penalty += 18;
  if (flags.has("claims_complex_knowledge") && flags.has("complex_knowledge_low")) penalty += 20;
  if ((flags.has("no_emergency_fund") || flags.has("emergency_partial")) && flags.has("wants_high_risk")) penalty += 18;
  if (flags.has("low_vol_preference") && flags.has("wants_high_risk")) penalty += 16;
  if (flags.has("claims_complex_experience") && flags.has("complex_knowledge_low")) penalty += 18;
  if (flags.has("no_written_plan") && (flags.has("fomo") || flags.has("loss_recovery_bias"))) penalty += 12;

  return {
    ...scores,
    consistencyScore: clamp(scores.consistencyScore - penalty),
  };
}

function labelFromScore(score: number, labels: [string, string, string, string, string]) {
  if (score < 25) return labels[0];
  if (score < 45) return labels[1];
  if (score < 65) return labels[2];
  if (score < 82) return labels[3];
  return labels[4];
}

function knowledgeLabel(score: number) {
  if (score < 35) return "Inicial";
  if (score < 58) return "Básico";
  if (score < 78) return "Intermedio";
  return "Avanzado";
}

function capacityLabel(score: number) {
  return labelFromScore(score, ["Baja", "Media-baja", "Media", "Media-alta", "Alta"]);
}

function profileFromScores(scores: Record<DiagnosticDimension, number>, flags: Set<string>) {
  const capacityAdjustedRisk =
    scores.riskCapacityScore * 0.28 +
    scores.timeHorizonScore * 0.18 +
    scores.psychologicalToleranceScore * 0.22 +
    scores.knowledgeScore * 0.16 +
    (100 - scores.liquidityPressureScore) * 0.1 +
    (100 - scores.behavioralRiskScore) * 0.06;

  let score = capacityAdjustedRisk;
  if ((flags.has("no_emergency_fund") || flags.has("emergency_partial")) && flags.has("high_responsibilities")) score = Math.min(score, 58);
  if (flags.has("no_emergency_fund") && flags.has("high_responsibilities")) score = Math.min(score, 48);
  if (flags.has("liquidity_under_12m")) score = Math.min(score, 42);
  if (scores.consistencyScore < 45) score -= 10;
  if (scores.behavioralRiskScore > 75) score -= 8;

  if (score < 30) return "Defensivo";
  if (score < 48) return "Conservador dinámico";
  if (score < 64) return "Moderado";
  if (score < 78) return "Crecimiento controlado";
  if (score < 90) return "Crecimiento agresivo";
  return "Especulativo / no conveniente para la mayoría";
}

function statusForProduct(product: string, scores: Record<DiagnosticDimension, number>, flags: Set<string>): ProductConvenience {
  const knowledge = scores.knowledgeScore;
  const experience = scores.experienceScore;
  const capacity = scores.riskCapacityScore;
  const behavior = scores.behavioralRiskScore;
  const liquidity = scores.liquidityPressureScore;
  const complexLow = knowledge < 62 || flags.has("complex_knowledge_low");
  const capacityLimited = capacity < 45 || liquidity > 72;
  const disciplineWeak = behavior > 72 || scores.consistencyScore < 45;

  if (product === "Liquidez / fondos monetarios") return "Adecuado para aprender";
  if (product === "Bonos simples") return knowledge < 35 ? "Requiere más formación" : "Adecuado para aprender";
  if (product === "Fondos indexados diversificados") return capacityLimited && knowledge < 45 ? "Requiere más formación" : "Adecuado para aprender";
  if (product === "Acciones individuales") {
    if (knowledge < 45 || experience < 45 || capacityLimited) return "Requiere más formación";
    return disciplineWeak ? "Requiere más formación" : "Adecuado para aprender";
  }
  if (product === "ETFs sectoriales/temáticos") {
    if (knowledge < 52 || experience < 45 || capacityLimited) return "Requiere más formación";
    return disciplineWeak ? "Requiere más formación" : "Adecuado para aprender";
  }
  if (product === "Criptoactivos") {
    if (knowledge < 55 || capacityLimited || behavior > 78) return "No conveniente según respuestas";
    return "Requiere más formación";
  }
  if (product === "Derivados" || product === "Apalancamiento" || product === "Venta en corto") {
    if (complexLow || capacityLimited || disciplineWeak) return "Evitar hasta comprender riesgos";
    if (knowledge < 82 || experience < 75) return "No conveniente según respuestas";
    return "Requiere más formación";
  }
  return "Requiere más formación";
}

function noteForStatus(status: ProductConvenience) {
  if (status === "Adecuado para aprender") return "Puede estudiarse con foco educativo, tamaño prudente y comprensión de riesgos.";
  if (status === "Requiere más formación") return "Conviene reforzar conceptos, costes, liquidez y escenarios adversos antes de usarlo.";
  if (status === "No conveniente según respuestas") return "Las respuestas sugieren que el producto podría superar la capacidad, experiencia o disciplina actual.";
  return "Producto complejo; mejor evitarlo hasta poder explicar pérdida máxima, liquidez, margen y escenarios extremos.";
}

function productConvenience(scores: Record<DiagnosticDimension, number>, flags: Set<string>): ProductConvenienceRow[] {
  return productOrder.map((product) => {
    const status = statusForProduct(product, scores, flags);
    return { product, status, note: noteForStatus(status) };
  });
}

function alerts(scores: Record<DiagnosticDimension, number>, flags: Set<string>) {
  const result: string[] = [];
  if ((flags.has("no_emergency_fund") || flags.has("emergency_partial")) && flags.has("high_responsibilities")) {
    result.push("Colchón de emergencia y responsabilidades limitan el perfil máximo de riesgo educativo.");
  }
  if (flags.has("liquidity_under_12m") || flags.has("near_liquidity_need")) {
    result.push("Hay presión de liquidez cercana; conviene separar capital de corto plazo de inversión de largo plazo.");
  }
  if (scores.psychologicalToleranceScore > 70 && scores.riskCapacityScore < 45) {
    result.push("Tu deseo de asumir riesgo parece superior a tu capacidad actual.");
  }
  if (scores.riskCapacityScore > 70 && scores.psychologicalToleranceScore < 45) {
    result.push("Tu situación permitiría más riesgo, pero tu comodidad emocional sugiere una exposición más gradual.");
  }
  if (scores.knowledgeScore > 70 && scores.behavioralRiskScore > 70) {
    result.push("El conocimiento no compensa una mala disciplina de ejecución.");
  }
  if (scores.consistencyScore < 50) {
    result.push("Hay respuestas en tensión; la confianza del resultado se reduce.");
  }
  if (flags.has("complex_knowledge_low")) {
    result.push("Productos complejos requieren más formación antes de considerarse convenientes.");
  }
  if (result.length === 0) {
    result.push("No aparecen contradicciones fuertes, pero la lectura sigue siendo educativa y debe contrastarse con datos reales.");
  }
  return result;
}

function confidenceLabel(consistencyScore: number) {
  if (consistencyScore < 45) return "Baja";
  if (consistencyScore < 70) return "Media";
  return "Alta";
}

export function scoreDiagnostic(answers: DiagnosticAnswers, mode: DiagnosticMode): DiagnosticResult {
  const allowedIds = new Set(getQuestionsForMode(mode).map((question) => question.id));
  const scopedAnswers = Object.fromEntries(Object.entries(answers).filter(([id]) => allowedIds.has(id)));
  const flags = flagSet(scopedAnswers);
  const averaged = applyConsistencyPenalties(averageScores(scopedAnswers), flags);
  const profile = profileFromScores(averaged, flags);
  const capacity = capacityLabel(averaged.riskCapacityScore);
  const knowledge = knowledgeLabel(averaged.knowledgeScore);
  const warningList = alerts(averaged, flags);

  return {
    mode,
    profile,
    capacityLabel: capacity,
    knowledgeLabel: knowledge,
    confidenceLabel: confidenceLabel(averaged.consistencyScore),
    summary:
      mode === "quick"
        ? "Lectura inicial basada en preguntas esenciales de capacidad, tolerancia, conocimiento y conducta."
        : "Lectura granular basada en situación financiera, objetivos, tolerancia psicológica, conocimiento, experiencia, sesgos y consistencia.",
    dimensions: averaged,
    alerts: warningList,
    productConvenience: productConvenience(averaged, flags),
    explanation: "El resultado cruza lo que puedes tolerar emocionalmente con lo que tu situación actual parece poder absorber. La matriz de productos es educativa y prioriza formación cuando falta conocimiento o experiencia.",
    disclaimer: "Este resultado es educativo. No constituye asesoría financiera personalizada ni evaluación formal de idoneidad regulatoria. Sirve para ordenar información sobre tu relación con el riesgo y detectar áreas que requieren más formación.",
  };
}
