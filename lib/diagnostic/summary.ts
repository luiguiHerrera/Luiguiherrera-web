import { DIAGNOSTIC_PROFILE_LABELS } from "./types";
import type { DiagnosticLocale, DiagnosticResult } from "./types";

/** Plain-text export from the computed result only; no network or storage. */
export function diagnosticSummaryText(result: DiagnosticResult, locale: DiagnosticLocale) {
  const es = locale === "es";
  const t = (spanish: string, english: string) => es ? spanish : english;
  const pai = result.paiReadiness;
  const signal = { red: t("Prioridad de revisión", "Priority for review"), yellow: t("Preparar antes de avanzar", "Prepare before moving forward"), green: t("Base más sólida", "Stronger base") };
  const stage = { orden: t("Orden", "Order"), preparacion: t("Preparación", "Preparation"), expansion: t("Expansión", "Expansion") };
  return [
    t("Resumen educativo del diagnóstico", "Educational diagnostic summary"),
    "luiguiherrera.com", "",
    result.methodologyNote, result.disclaimer, "",
    t("Modalidad: ", "Mode: ") + (result.mode === "quick" ? t("Rápida", "Quick") : t("Completa", "Complete")),
    t("Semáforo educativo: ", "Educational signal: ") + signal[pai.light],
    t("Etapa: ", "Stage: ") + stage[pai.stage],
    t("Producir: ", "Produce: ") + pai.producirScore,
    t("Administrar: ", "Manage: ") + pai.administrarScore,
    t("Invertir (índice orientativo): ", "Invest (indicative index): ") + pai.invertirScore,
    pai.baseLimitNote ?? "", "",
    t("Tolerancia declarada: ", "Stated tolerance: ") + result.declaredLoss + " · " + DIAGNOSTIC_PROFILE_LABELS[result.declaredProfile][locale],
    t("Respuestas hipotéticas: ", "Hypothetical responses: ") + DIAGNOSTIC_PROFILE_LABELS[result.pressureProfile][locale],
    result.pressureSummary,
    t("Capacidad de pérdida (índice): ", "Loss capacity (index): ") + result.lossCapacity.score + ". " + result.lossCapacity.note,
    t("Conceptos comprobados (índice): ", "Concepts checked (index): ") + result.knowledge.score + ". " + result.knowledge.note,
    t("Experiencia declarada (índice): ", "Self-reported experience (index): ") + result.experience.score + ". " + result.experience.note,
    result.complexity.note, "",
    t("LIMITACIONES IDENTIFICADAS", "LIMITATIONS IDENTIFIED"),
    ...result.constraints.map((item) => {
      const scope = { general: t("Base financiera general", "General financial base"), capital: t("Capital evaluado", "Capital assessed"), product: t("Producto", "Product"), learning: t("Aprendizaje", "Learning") };
      return "- " + item.label + " (" + scope[item.scope] + "): " + item.note;
    }), "",
    t("COMPROBACIONES POR PRODUCTO", "PRODUCT-SPECIFIC CHECKS"),
    ...result.productChecks.map((item) => "- " + item.label + ": " + (item.response ? item.response + ". " : "") + item.note), "",
    t("ALERTAS Y TENSIONES", "ALERTS AND TENSIONS"),
    ...[...result.alerts, ...result.expectationTensions].map((item) => "- " + item), "",
    t("SIGUIENTE PASO EDUCATIVO", "NEXT EDUCATIONAL STEP"), pai.nextEducationalStep,
    result.route.label, result.route.note, "https://www.luiguiherrera.com" + result.route.href, "",
    t("Respuestas procesadas en esta sesión, sin enviarlas ni conservarlas en la web.", "Answers processed in this session without sending them or keeping them on the website."),
  ].join("\n");
}
