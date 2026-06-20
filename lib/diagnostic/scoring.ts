import { diagnosticQuestions, getQuestionsForMode, getSelectedProducts } from "@/lib/diagnostic/questions";
import type {
  ComplexityBand,
  DiagnosticAnswers,
  DiagnosticFlag,
  DiagnosticLocale,
  DiagnosticMode,
  DiagnosticOption,
  DiagnosticProduct,
  DiagnosticProfile,
  DiagnosticResult,
  DiagnosticScoreKey,
  DiagnosticScores,
} from "@/lib/diagnostic/types";

const scoreKeys: DiagnosticScoreKey[] = [
  "financialCapacity",
  "liquidityStrength",
  "timeHorizon",
  "emotionalTolerance",
  "patience",
  "fomoSensitivity",
  "euphoriaRisk",
  "knowledgeValidated",
  "experienceReal",
  "expectationRealism",
  "consistency",
  "productComplexity",
  "overconfidence",
  "calibration",
];

const defaults: DiagnosticScores = {
  financialCapacity: 50,
  liquidityStrength: 50,
  timeHorizon: 50,
  emotionalTolerance: 50,
  patience: 50,
  fomoSensitivity: 35,
  euphoriaRisk: 35,
  knowledgeValidated: 45,
  experienceReal: 40,
  expectationRealism: 60,
  consistency: 65,
  productComplexity: 25,
  overconfidence: 35,
  calibration: 55,
};

const productComplexity: Record<DiagnosticProduct, number> = {
  cash: 10,
  bonds: 28,
  indexFunds: 35,
  individualStocks: 55,
  sectorEtfs: 60,
  crypto: 72,
  options: 90,
  leverage: 92,
  shortSelling: 95,
};

const profileLabels: Record<DiagnosticProfile, Record<DiagnosticLocale, string>> = {
  "Preservación": { es: "Preservación", en: "Preservation" },
  "Equilibrio prudente": { es: "Equilibrio prudente", en: "Prudent balance" },
  "Crecimiento moderado": { es: "Crecimiento moderado", en: "Moderate growth" },
  "Crecimiento dinámico": { es: "Crecimiento dinámico", en: "Dynamic growth" },
  "Riesgo especulativo": { es: "Riesgo especulativo", en: "Speculative risk" },
};

const scoringCopy = {
  es: {
    summary: (profile: DiagnosticProfile) =>
      `Tu perfil declarado importa, pero la lectura final se apoya más en capacidad real, liquidez y conducta bajo presión. Resultado orientativo: ${profileLabels[profile].es}.`,
    pressureAligned: "El perfil declarado y el perfil bajo presión aparecen razonablemente alineados.",
    pressureGap: (pressure: DiagnosticProfile, declared: DiagnosticProfile) =>
      `El perfil bajo presión (${profileLabels[pressure].es}) queda por debajo del perfil declarado (${profileLabels[declared].es}). Conviene diseñar el proceso desde la versión bajo presión.`,
    lossFragile: "Una pérdida relevante podría afectar caja, sueño o decisiones obligadas.",
    lossBalanced: "La capacidad de pérdida parece menos restrictiva que la conducta y expectativas.",
    knowledgeGap: "El conocimiento declarado no quedó totalmente confirmado por las preguntas espejo.",
    knowledgeBalanced: "La lectura diferencia entre saber admitir límites y sobreestimar comprensión.",
    complexityGap: "Hay productos marcados cuya complejidad exige más validación antes de usarlos con dinero relevante.",
    complexityBalanced: "La complejidad razonable se estima desde productos marcados, experiencia y conocimiento validado.",
    disclaimer: "Lectura educativa inspirada en criterios de conveniencia e idoneidad. No sustituye una evaluación regulatoria formal ni constituye asesoramiento financiero.",
  },
  en: {
    summary: (profile: DiagnosticProfile) =>
      `Your declared profile matters, but the final read leans more on real capacity, liquidity and behavior under pressure. Indicative result: ${profileLabels[profile].en}.`,
    pressureAligned: "The declared profile and the profile under pressure appear reasonably aligned.",
    pressureGap: (pressure: DiagnosticProfile, declared: DiagnosticProfile) =>
      `The profile under pressure (${profileLabels[pressure].en}) is below the declared profile (${profileLabels[declared].en}). The process should be designed from the under-pressure version.`,
    lossFragile: "A relevant loss could affect cash, sleep or forced decisions.",
    lossBalanced: "Loss capacity appears less restrictive than behavior and expectations.",
    knowledgeGap: "Declared knowledge was not fully confirmed by the mirror questions.",
    knowledgeBalanced: "The read separates knowing your limits from overestimating understanding.",
    complexityGap: "Some selected products require more validation before using them with meaningful money.",
    complexityBalanced: "Reasonable complexity is estimated from selected products, experience and validated knowledge.",
    disclaimer: "Educational reading inspired by suitability and appropriateness criteria. It does not replace a formal regulatory assessment and is not financial advice.",
  },
};

function clamp(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function profileFromScore(score: number): DiagnosticProfile {
  if (score < 28) return "Preservación";
  if (score < 48) return "Equilibrio prudente";
  if (score < 66) return "Crecimiento moderado";
  if (score < 82) return "Crecimiento dinámico";
  return "Riesgo especulativo";
}

function selectedOptions(answers: DiagnosticAnswers, mode: DiagnosticMode): DiagnosticOption[] {
  const allowed = new Set(getQuestionsForMode(mode, answers).map((question) => question.id));
  const options: DiagnosticOption[] = [];

  for (const question of diagnosticQuestions) {
    if (!allowed.has(question.id)) continue;
    const raw = answers[question.id];
    const ids = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const id of ids) {
      const option = question.options.find((candidate) => candidate.id === id);
      if (option) options.push(option);
    }
  }

  return options;
}

function averageScores(options: DiagnosticOption[], selectedProducts: DiagnosticProduct[]) {
  const buckets = Object.fromEntries(scoreKeys.map((key) => [key, [] as number[]])) as Record<DiagnosticScoreKey, number[]>;

  for (const option of options) {
    for (const key of scoreKeys) {
      const value = option.scores?.[key];
      if (typeof value === "number") buckets[key].push(value);
    }
  }

  for (const product of selectedProducts) buckets.productComplexity.push(productComplexity[product]);

  return Object.fromEntries(scoreKeys.map((key) => {
    const values = buckets[key];
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : defaults[key];
    return [key, clamp(average)];
  })) as DiagnosticScores;
}

function flagList(options: DiagnosticOption[], scores: DiagnosticScores, selectedProducts: DiagnosticProduct[]) {
  const flags = new Set<DiagnosticFlag>();
  for (const option of options) for (const flag of option.flags ?? []) flags.add(flag);

  if (flags.has("declared_high_tolerance") && flags.has("pressure_low_tolerance")) flags.add("panic_sell");
  if (flags.has("claims_knowledge") && scores.knowledgeValidated < 55) flags.add("knowledge_gap_basic");
  if (selectedProducts.some((product) => productComplexity[product] >= 70) && scores.knowledgeValidated < 62) flags.add("product_mismatch");
  if (scores.liquidityStrength < 35 || scores.financialCapacity < 35) flags.add("liquidity_fragility");
  if (scores.fomoSensitivity > 70) flags.add("fomo_entry");
  if (scores.overconfidence > 72) flags.add("overconfidence");

  return Array.from(flags);
}

function applyGates(rawScore: number, scores: DiagnosticScores, flags: DiagnosticFlag[]) {
  let score = rawScore;
  if (flags.includes("near_cash_need")) score = Math.min(score, 42);
  if (flags.includes("liquidity_fragility")) score = Math.min(score, 46);
  if (flags.includes("capital_concentration")) score = Math.min(score, 58);
  if (flags.includes("panic_sell")) score = Math.min(score, 50);
  if (flags.includes("product_mismatch")) score -= 8;
  if (scores.consistency < 42) score -= 8;
  if (scores.expectationRealism < 35) score -= 7;
  return clamp(score);
}

function complexityBand(score: number): ComplexityBand {
  if (score < 30) return "Básica";
  if (score < 58) return "Intermedia";
  if (score < 78) return "Alta";
  return "Compleja";
}

function labelFromScore(score: number, labels: [string, string, string, string]) {
  if (score < 35) return labels[0];
  if (score < 58) return labels[1];
  if (score < 78) return labels[2];
  return labels[3];
}

function buildAlerts(scores: DiagnosticScores, flags: DiagnosticFlag[], locale: DiagnosticLocale) {
  const alerts: string[] = [];
  if (locale === "es") {
    if (flags.includes("liquidity_fragility")) alerts.push("Fragilidad de liquidez: una pérdida podría afectar decisiones o gastos reales.");
    if (flags.includes("near_cash_need")) alerts.push("Horizonte y liquidez están en tensión: podrías necesitar el capital antes de que el plan madure.");
    if (flags.includes("declared_high_tolerance") && flags.includes("pressure_low_tolerance")) alerts.push("La tolerancia declarada es mayor que la tolerancia mostrada bajo presión.");
    if (flags.includes("fomo_entry")) alerts.push("Aparece sensibilidad a FOMO o comparación social.");
    if (flags.includes("overconfidence") || flags.includes("euphoria_sizing")) alerts.push("Las ganancias rápidas podrían empujar a aumentar tamaño demasiado pronto.");
    if (flags.includes("knowledge_gap_basic")) alerts.push("Hay brechas de conocimiento básico frente a lo declarado.");
    if (flags.includes("product_mismatch")) alerts.push("La complejidad de productos marcados supera el conocimiento validado actual.");
    if (flags.includes("loss_recovery_bias")) alerts.push("Tras pérdidas aparece riesgo de buscar recuperación rápida.");
    if (flags.includes("no_written_process")) alerts.push("Faltan reglas escritas para actuar durante caídas, subidas o estancamiento.");
    if (scores.expectationRealism < 45) alerts.push("Las expectativas de retorno podrían ser incompatibles con un proceso sostenible.");
    if (!alerts.length) alerts.push("No aparecen tensiones dominantes, pero la lectura sigue siendo educativa y no regulatoria.");
    return alerts.slice(0, 8);
  }

  if (flags.includes("liquidity_fragility")) alerts.push("Liquidity fragility: a loss could affect real spending or decisions.");
  if (flags.includes("near_cash_need")) alerts.push("Horizon and liquidity are in tension: you may need the capital before the plan matures.");
  if (flags.includes("declared_high_tolerance") && flags.includes("pressure_low_tolerance")) alerts.push("Declared tolerance is higher than tolerance shown under pressure.");
  if (flags.includes("fomo_entry")) alerts.push("FOMO or social comparison sensitivity appears.");
  if (flags.includes("overconfidence") || flags.includes("euphoria_sizing")) alerts.push("Fast gains could push position size too early.");
  if (flags.includes("knowledge_gap_basic")) alerts.push("Basic knowledge gaps appear versus what was declared.");
  if (flags.includes("product_mismatch")) alerts.push("Selected product complexity exceeds current validated knowledge.");
  if (flags.includes("loss_recovery_bias")) alerts.push("After losses, there is risk of chasing a quick recovery.");
  if (flags.includes("no_written_process")) alerts.push("Written rules are missing for drawdowns, rallies or stagnation.");
  if (scores.expectationRealism < 45) alerts.push("Return expectations may be incompatible with a sustainable process.");
  if (!alerts.length) alerts.push("No dominant tensions appear, but the read remains educational and non-regulatory.");
  return alerts.slice(0, 8);
}

function expectationTensions(scores: DiagnosticScores, flags: DiagnosticFlag[], locale: DiagnosticLocale) {
  const tensions: string[] = [];
  if (locale === "es") {
    if (flags.includes("unrealistic_expectations")) tensions.push("Retornos esperados altos frente a riesgo real de años negativos.");
    if (flags.includes("social_pressure")) tensions.push("Comparación social frente a paciencia de proceso.");
    if (flags.includes("capital_concentration")) tensions.push("Tamaño del capital invertido frente a margen financiero disponible.");
    if (flags.includes("concentration_bias")) tensions.push("Convicción frente a concentración razonable.");
    if (flags.includes("claims_knowledge") && flags.includes("knowledge_gap_basic")) tensions.push("Conocimiento declarado frente a conocimiento validado.");
    if (scores.fomoSensitivity > 65 && scores.consistency < 58) tensions.push("Deseo de participar frente a reglas previas insuficientes.");
    return tensions.length ? tensions : ["Expectativas y conducta aparecen razonablemente alineadas para una primera lectura."];
  }

  if (flags.includes("unrealistic_expectations")) tensions.push("High expected returns versus the real risk of negative years.");
  if (flags.includes("social_pressure")) tensions.push("Social comparison versus process patience.");
  if (flags.includes("capital_concentration")) tensions.push("Invested capital size versus available financial margin.");
  if (flags.includes("concentration_bias")) tensions.push("Conviction versus reasonable concentration.");
  if (flags.includes("claims_knowledge") && flags.includes("knowledge_gap_basic")) tensions.push("Declared knowledge versus validated knowledge.");
  if (scores.fomoSensitivity > 65 && scores.consistency < 58) tensions.push("Desire to participate versus insufficient prior rules.");
  return tensions.length ? tensions : ["Expectations and behavior appear reasonably aligned for a first read."];
}

function routeFor(scores: DiagnosticScores, flags: DiagnosticFlag[], locale: DiagnosticLocale) {
  if (flags.includes("knowledge_gap_basic") || flags.includes("product_mismatch")) {
    return {
      href: "/protege-tu-dinero",
      label: locale === "es" ? "Protege tu dinero" : "Protect your money",
      note: locale === "es"
        ? "Refuerza alertas, complejidad y riesgos antes de aumentar productos."
        : "Reinforce alerts, complexity and risks before adding products.",
    };
  }
  if (flags.includes("fomo_entry") || flags.includes("overconfidence") || flags.includes("loss_recovery_bias")) {
    return {
      href: "/diagnostico?mode=quick",
      label: locale === "es" ? "Repetir con calma" : "Repeat calmly",
      note: locale === "es"
        ? "Vuelve a responder cuando no haya presión de mercado o comparación social."
        : "Answer again when market pressure or social comparison is not present.",
    };
  }
  if (scores.knowledgeValidated >= 65 && scores.consistency >= 65) {
    return {
      href: "/niveles-estadisticos",
      label: locale === "es" ? "Explorar niveles estadísticos" : "Explore statistical levels",
      note: locale === "es"
        ? "Usa contexto histórico sin convertirlo en señal de compra o venta."
        : "Use historical context without turning it into a buy or sell signal.",
    };
  }
  return {
    href: "/recursos",
    label: locale === "es" ? "Revisar recursos" : "Review resources",
    note: locale === "es"
      ? "Ordena conceptos y proceso antes de pasar a productos más complejos."
      : "Organize concepts and process before moving to more complex products.",
  };
}

export function scoreDiagnostic(answers: DiagnosticAnswers, mode: DiagnosticMode, locale: DiagnosticLocale = "es"): DiagnosticResult {
  const selectedProducts = getSelectedProducts(answers);
  const options = selectedOptions(answers, mode);
  const scores = averageScores(options, selectedProducts);
  const flags = flagList(options, scores, selectedProducts);

  const declaredScore =
    scores.emotionalTolerance * 0.34 +
    scores.timeHorizon * 0.22 +
    scores.financialCapacity * 0.18 +
    scores.knowledgeValidated * 0.14 +
    (100 - scores.fomoSensitivity) * 0.06 +
    (100 - scores.overconfidence) * 0.06;

  const pressureScore =
    scores.emotionalTolerance * 0.22 +
    scores.patience * 0.2 +
    scores.consistency * 0.22 +
    scores.liquidityStrength * 0.16 +
    scores.expectationRealism * 0.12 +
    (100 - scores.fomoSensitivity) * 0.08;

  const gatedScore = applyGates(Math.min(declaredScore, pressureScore), scores, flags);
  const profile = profileFromScore(gatedScore);
  const declaredProfile = profileFromScore(declaredScore);
  const pressureProfile = profileFromScore(applyGates(pressureScore, scores, flags));
  const complexity = complexityBand(scores.productComplexity);
  const knowledgeLabel = labelFromScore(scores.knowledgeValidated, ["Inicial", "Básico", "Intermedio", "Validado alto"]);
  const lossLabel = labelFromScore((scores.financialCapacity + scores.liquidityStrength) / 2, ["Frágil", "Limitada", "Suficiente", "Robusta"]);
  const text = scoringCopy[locale];
  const route = routeFor(scores, flags, locale);

  return {
    mode,
    profile,
    declaredProfile,
    pressureProfile,
    summary: text.summary(profile),
    pressureSummary: declaredProfile === pressureProfile
      ? text.pressureAligned
      : text.pressureGap(pressureProfile, declaredProfile),
    expectationTensions: expectationTensions(scores, flags, locale),
    lossCapacity: {
      label: lossLabel,
      note: flags.includes("liquidity_fragility")
        ? text.lossFragile
        : text.lossBalanced,
      score: clamp((scores.financialCapacity + scores.liquidityStrength) / 2),
    },
    knowledge: {
      label: knowledgeLabel,
      note: flags.includes("claims_knowledge") && flags.includes("knowledge_gap_basic")
        ? text.knowledgeGap
        : text.knowledgeBalanced,
      score: scores.knowledgeValidated,
    },
    complexity: {
      band: complexity,
      note: flags.includes("product_mismatch")
        ? text.complexityGap
        : text.complexityBalanced,
      score: scores.productComplexity,
    },
    alerts: buildAlerts(scores, flags, locale),
    flags,
    route,
    scores,
    selectedProducts,
    disclaimer: text.disclaimer,
  };
}
