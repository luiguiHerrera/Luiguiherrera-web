import { getQuestionsForMode } from "./questions";
import type { DiagnosticAnswers, DiagnosticConstraint, DiagnosticFlag, DiagnosticLocale, DiagnosticMode, DiagnosticProduct, DiagnosticProductCheck } from "./types";

// Existing complexity anchors, counted once and never averaged across products.
export const productComplexity: Record<DiagnosticProduct, number> = {
  cash: 10, bonds: 28, indexFunds: 35, individualStocks: 55, sectorEtfs: 60,
  crypto: 72, options: 90, leverage: 92, shortSelling: 95,
};

export const knowledgeQuestions = new Set([
  "stock_basic", "risk_return", "diversification", "bond_rates", "product_costs_complete", "liquidity_product_complete",
]);

export const scenarioQuestions = new Set([
  "pressure_drop", "slow_underperformance", "fast_gain", "fomo_behavior", "loss_recovery", "concentration",
  "single_position_30_complete", "large_position_down_complete", "winner_too_large_complete", "social_comparison_complete",
  "headline_stress_complete", "priority_tradeoff_complete", "discomfort_tradeoff_complete", "sacrifice_first_complete",
]);

const correctChecks: Record<string, string> = {
  options_check: "decay", leverage_check: "margin_call", short_check: "unbounded",
  crypto_check: "risks", stocks_check: "single_outcome", bond_check: "creditor",
};

const productLabels: Record<DiagnosticProduct, [string, string]> = {
  cash: ["Liquidez / fondos monetarios", "Cash / money market funds"], bonds: ["Bonos simples", "Simple bonds"],
  indexFunds: ["Fondos indexados diversificados", "Diversified index funds"], individualStocks: ["Acciones individuales", "Individual stocks"],
  sectorEtfs: ["ETFs sectoriales o temáticos", "Sector or thematic ETFs"], crypto: ["Criptoactivos", "Cryptoassets"],
  options: ["Opciones", "Options"], leverage: ["Apalancamiento / margen", "Leverage / margin"], shortSelling: ["Venta en corto", "Short selling"],
};

export function assessProducts(answers: DiagnosticAnswers, mode: DiagnosticMode, products: DiagnosticProduct[], locale: DiagnosticLocale): DiagnosticProductCheck[] {
  const questions = getQuestionsForMode(mode, answers);
  return products.map((product) => {
    const question = questions.find((candidate) => candidate.adaptiveFor?.includes(product) && candidate.id in correctChecks);
    const option = question?.options.find((candidate) => candidate.id === answers[question.id]);
    const understanding = !question ? "not_assessed" : option?.id === correctChecks[question.id] ? "supported" : option?.id === "unsure" ? "uncertain" : "gap";
    const notes = {
      supported: ["Comprobación puntual correcta. No acredita comprensión completa ni experiencia en este producto.", "One specific check was answered correctly. This does not establish complete understanding or experience with this product."],
      gap: ["La respuesta no identifica el riesgo preguntado. Comprender otros productos no elimina esta brecha.", "The answer does not identify the risk asked about. Understanding other products does not remove this gap."],
      uncertain: ["Has reconocido una duda sobre este riesgo. Es una necesidad de aprendizaje, no una señal de sobreconfianza.", "You acknowledged uncertainty about this risk. This is a learning need, not evidence of overconfidence."],
      not_assessed: ["Este cuestionario no incluye una comprobación específica de este producto. La selección no demuestra comprensión ni uso real.", "This questionnaire has no specific check for this product. Selecting it does not demonstrate understanding or actual use."],
    };
    return { product, label: productLabels[product][locale === "es" ? 0 : 1], complexity: productComplexity[product], understanding,
      questionId: question?.id, response: option?.label[locale], note: notes[understanding][locale === "es" ? 0 : 1] };
  });
}

export function financialConstraints(answers: DiagnosticAnswers, flags: DiagnosticFlag[], products: DiagnosticProductCheck[], locale: DiagnosticLocale): DiagnosticConstraint[] {
  const constraints: DiagnosticConstraint[] = [];
  const add = (id: string, scope: DiagnosticConstraint["scope"], priority: boolean, sources: string[], es: [string, string], en: [string, string]) => {
    const [label, note] = locale === "es" ? es : en;
    constraints.push({ id, scope, severity: priority ? "priority" : "attention", label, note, sources });
  };
  if (flags.includes("expensive_debt")) add("expensive_debt", "general", true, ["expensive_debt"],
    ["Deuda cara", "Has indicado deuda que te presiona o que es una prioridad pendiente. El conocimiento no elimina esa obligación."],
    ["High-cost debt", "You reported debt that creates pressure or remains a priority. Knowledge does not remove that obligation."]);
  if (flags.includes("low_surplus")) add("low_surplus", "general", answers.surplus_cash_flow === "tight_or_deficit", ["surplus_cash_flow"],
    ["Excedente insuficiente", "El presupuesto merece atención antes de depender de resultados del mercado."],
    ["Insufficient surplus", "The budget needs attention before relying on market outcomes."]);
  if (flags.includes("income_fragility")) add("income_fragility", "general", false, ["income_stability"],
    ["Ingresos frágiles", "La fuente de ingresos es variable o incierta. Separa esta vulnerabilidad de tu disposición a asumir riesgo."],
    ["Fragile income", "Income is variable or uncertain. Separate this vulnerability from your willingness to take risk."]);
  if (flags.includes("low_emergency_fund")) add("low_emergency_fund", "general", answers.emergency_months === "none", ["emergency_months"],
    ["Fondo de emergencia insuficiente", "Has indicado menos de tres meses o ausencia de un fondo separado. Revisa liquidez y protección financiera."],
    ["Insufficient emergency buffer", "You reported less than three months or no separate buffer. Review liquidity and financial protection."]);
  if (["adjust", "uncomfortable", "serious"].includes(String(answers.loss_life_effect))) add("loss_capacity", "capital", answers.loss_life_effect !== "adjust", ["loss_life_effect"],
    ["Impacto de una pérdida en este capital", "Has indicado que una caída del capital afectaría gastos o decisiones. Esta restricción no describe tu tolerancia psicológica."],
    ["Impact of losing this capital", "You reported that a loss would affect spending or decisions. This restriction does not describe psychological tolerance."]);
  const capitalPriority = ["likely", "certain"].includes(String(answers.cash_need_12m)) ||
    ["likely", "critical"].includes(String(answers.income_stability_complete)) || answers.known_expenses_complete === "yes_unclear";
  if (flags.includes("near_cash_need")) add("near_cash_need", "capital", capitalPriority, ["cash_need_12m", "income_stability_complete", "known_expenses_complete", "horizon_conflict_complete"],
    ["Plazo y disponibilidad de este capital", "Separa el dinero que podrías necesitar pronto. La señal se refiere al capital evaluado, no a todo tu patrimonio."],
    ["Timing and availability of this capital", "Separate money you may need soon. This signal concerns the capital assessed, not your entire wealth."]);
  if (flags.includes("liquidity_fragility") && !constraints.some((item) => item.id === "loss_capacity" || item.id === "near_cash_need")) add("liquidity_fragility", "capital", false, ["savings_share", "loss_life_effect"],
    ["Margen de liquidez", "Hay tensión entre el capital considerado y el margen disponible. Otras fortalezas no borran esta limitación."],
    ["Liquidity margin", "There is tension between the capital considered and available financial room. Other strengths do not erase this limitation."]);
  for (const product of products.filter((item) => item.understanding === "gap" || item.understanding === "uncertain")) add("product_" + product.product, "product", false, product.questionId ? [product.questionId] : [],
    [product.label, product.note], [product.label, product.note]);
  return constraints;
}
