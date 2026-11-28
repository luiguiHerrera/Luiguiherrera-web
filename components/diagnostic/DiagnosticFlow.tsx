"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { DiagnosticReadingGuide } from "./DiagnosticReadingGuide";
import { DiagnosticPrintableReport } from "@/components/diagnostic/DiagnosticPrintableReport";
import { DiagnosticReportActions } from "@/components/diagnostic/DiagnosticReportActions";
import styles from "./diagnostic.module.css";
import { diagnosticProgress, isAnswered, updateDiagnosticAnswer, validateDiagnosticAnswers } from "@/lib/diagnostic/answers";
import { getQuestionCounts, getQuestionsForMode } from "@/lib/diagnostic/questions";
import { scoreDiagnostic } from "@/lib/diagnostic/scoring";
import { DIAGNOSTIC_PROFILE_LABELS } from "@/lib/diagnostic/types";
import type { DiagnosticAnswers, DiagnosticFlag, DiagnosticLocale, DiagnosticMode, DiagnosticQuestion, DiagnosticScoreKey, PaiDimension, PaiMainWeakness, PaiStage, ReadinessLight } from "@/lib/diagnostic/types";

const copy = {
  es: {
    back: "Atrás",
    chooseDepth: "Elige profundidad",
    continue: "Continuar",
    depthTitle: "Diagnóstico del inversionista",
    fullDescription: "Lectura más profunda de experiencia, conducta, liquidez, concentración y comprensión de productos.",
    fullTitle: "Diagnóstico completo",
    progress: "Progreso",
    question: "Pregunta",
    questionOf: "de",
    quickDescription: "Lectura inicial con preguntas adaptativas según productos marcados.",
    quickTitle: "Diagnóstico rápido",
    restart: "Volver al inicio del diagnóstico",
    seeResult: "Ver resultado",
    start: "Empezar",
    startDescription: "Explora capacidad financiera, tolerancia declarada, conocimientos y escenarios por separado.",
    pace: "Responde a tu ritmo. Tómate el tiempo que necesites para pensar cada respuesta.",
    educationalNotice: "Este ejercicio es educativo y orientativo. No determina ni certifica tu perfil inversor. Para una evaluación de idoneidad o conveniencia, acude a una entidad legalmente autorizada para prestar el servicio de inversión correspondiente.",
    storageNote: "Las respuestas viven solo en esta sesión del navegador. No se guardan, no se envían a servidores externos y al recargar se pierden.",
    selected: "Seleccionado",
    result: "Resultado educativo",
    readings: "Capacidad, tolerancia y preparación",
    review: "Revisar mis respuestas",
    experience: "Experiencia declarada",
    limits: "Limitaciones identificadas",
    products: "Comprobaciones por producto",
    declared: "Tolerancia declarada",
    pressure: "Respuestas a escenarios hipotéticos",
    expectation: "Expectativas y tensiones",
    loss: "Capacidad de pérdida",
    knowledge: "Conceptos comprobados",
    complexity: "Complejidad a revisar",
    complexityNote: "La selección indica conocimiento o interés, no necesariamente uso. Consulta cada comprobación específica.",
    alerts: "Alertas principales",
    route: "Ruta sugerida dentro de la web",
    scores: "Mapa interno",
    flags: "Flags detectados",
    noFlags: "Sin flags dominantes",
    routeNewTab: "Se abrirá en una nueva pestaña para no perder este resultado.",
    pai: "Preparación para invertir",
    paiPrudence: "Esta lectura ubica tu base financiera antes de tomar más riesgo. No decide por ti; muestra qué parte conviene reforzar.",
    paiStage: "Etapa dominante",
    paiLight: "Semáforo de preparación",
    paiWeakness: "Principal punto a reforzar",
    paiNextStep: "Siguiente paso educativo",
    restartNote: "Puedes repetirlo si tu situación cambió o si quieres revisar tus respuestas con más calma.",
  },
  en: {
    back: "Back",
    chooseDepth: "Choose depth",
    continue: "Continue",
    depthTitle: "Investor diagnostic",
    fullDescription: "Deeper read across experience, behavior, liquidity, concentration and product understanding.",
    fullTitle: "Full diagnostic",
    progress: "Progress",
    question: "Question",
    questionOf: "of",
    quickDescription: "An initial read with adaptive questions according to selected products.",
    quickTitle: "Quick diagnostic",
    restart: "Return to the diagnostic start",
    seeResult: "View result",
    start: "Start",
    startDescription: "Explore financial capacity, stated tolerance, knowledge and scenarios separately.",
    pace: "Answer at your own pace. Take the time you need to think through each response.",
    educationalNotice: "This is an educational and indicative exercise. It does not determine or certify your investor profile. For a suitability or appropriateness assessment, consult a firm legally authorized to provide the relevant investment service.",
    storageNote: "Answers live only in this browser session. They are not stored, are not sent to external servers, and disappear on reload.",
    selected: "Selected",
    result: "Educational result",
    readings: "Capacity, tolerance and readiness",
    review: "Review my answers",
    experience: "Self-reported experience",
    limits: "Limitations identified",
    products: "Product-specific checks",
    declared: "Stated tolerance",
    pressure: "Hypothetical scenario responses",
    expectation: "Expectations and tensions",
    loss: "Loss capacity",
    knowledge: "Concepts checked",
    complexity: "Complexity to review",
    complexityNote: "Selection indicates knowledge or interest, not necessarily use. Review each specific check.",
    alerts: "Main alerts",
    route: "Suggested path inside the website",
    scores: "Internal map",
    flags: "Detected flags",
    noFlags: "No dominant flags",
    routeNewTab: "Opens in a new tab so you do not lose this result.",
    pai: "Investment readiness",
    paiPrudence: "This read places your financial base before taking more risk. It does not decide for you; it shows which area may need work.",
    paiStage: "Dominant stage",
    paiLight: "Readiness signal",
    paiWeakness: "Main point to reinforce",
    paiNextStep: "Next educational step",
    restartNote: "You can repeat it if your situation changed or if you want to review your answers more calmly.",
  },
};

const scoreLabels: Record<DiagnosticScoreKey, { es: string; en: string }> = {
  incomeStability: { es: "Estabilidad de ingresos", en: "Income stability" },
  surplusCashFlow: { es: "Capacidad de excedente", en: "Surplus capacity" },
  expensiveDebtControl: { es: "Control de deuda cara", en: "High-cost debt control" },
  goalClarity: { es: "Claridad de objetivos", en: "Goal clarity" },
  financialCapacity: { es: "Capacidad financiera", en: "Financial capacity" },
  liquidityStrength: { es: "Fortaleza de liquidez", en: "Liquidity strength" },
  timeHorizon: { es: "Horizonte real", en: "Real horizon" },
  emotionalTolerance: { es: "Tolerancia emocional", en: "Emotional tolerance" },
  patience: { es: "Paciencia", en: "Patience" },
  fomoSensitivity: { es: "Sensibilidad FOMO", en: "FOMO sensitivity" },
  euphoriaRisk: { es: "Riesgo de euforia", en: "Euphoria risk" },
  knowledgeValidated: { es: "Conceptos comprobados", en: "Concepts checked" },
  experienceReal: { es: "Experiencia declarada", en: "Self-reported experience" },
  expectationRealism: { es: "Realismo de expectativas", en: "Expectation realism" },
  consistency: { es: "Consistencia", en: "Consistency" },
  productComplexity: { es: "Complejidad de productos", en: "Product complexity" },
  overconfidence: { es: "Sobreconfianza", en: "Overconfidence" },
  calibration: { es: "Calibración", en: "Calibration" },
};

const scoreDescriptions: Record<DiagnosticScoreKey, { es: string; en: string }> = {
  incomeStability: { es: "Qué tan previsible es la fuente principal de ingresos.", en: "How predictable the main income source is." },
  surplusCashFlow: { es: "Margen que queda después de cubrir gastos normales.", en: "Margin left after covering normal expenses." },
  expensiveDebtControl: { es: "Nivel de presión de deudas de alto coste o pagos mensuales exigentes.", en: "Pressure from expensive debt or demanding monthly payments." },
  goalClarity: { es: "Qué tan claro está para qué es el dinero y cuándo podría necesitarse.", en: "How clear the purpose and timing of this money are." },
  financialCapacity: { es: "Margen financiero para asumir pérdidas sin afectar pagos importantes.", en: "Financial margin to absorb losses without affecting important payments." },
  liquidityStrength: { es: "Capacidad de cubrir imprevistos sin vender inversiones en mal momento.", en: "Ability to handle surprises without selling investments at a bad time." },
  timeHorizon: { es: "Tiempo durante el cual el dinero puede permanecer invertido sin necesidad cercana.", en: "How long the money can remain invested without near-term need." },
  emotionalTolerance: { es: "Disposición a soportar caídas que declaras en la pregunta directa.", en: "Willingness to tolerate losses as stated in the direct question." },
  patience: { es: "Capacidad de sostener un plan durante periodos lentos o negativos.", en: "Ability to hold a plan through slow or negative periods." },
  fomoSensitivity: { es: "Tendencia a cambiar de plan por comparación o miedo a quedarse por fuera.", en: "Tendency to change plans due to comparison or fear of missing out." },
  euphoriaRisk: { es: "Tendencia a aumentar riesgo después de ganancias rápidas.", en: "Tendency to increase risk after quick gains." },
  knowledgeValidated: { es: "Comprensión demostrada sobre productos y riesgos, no solo declarada.", en: "Demonstrated understanding of products and risks, not only declared." },
  experienceReal: { es: "Contacto previo con inversiones reales y caídas vividas.", en: "Previous contact with real investments and lived drawdowns." },
  expectationRealism: { es: "Coherencia entre retorno esperado, pérdida tolerada, liquidez y horizonte.", en: "Consistency between expected return, tolerated loss, liquidity and horizon." },
  consistency: { es: "Patrones de respuestas sobre reglas y escenarios; no conducta observada.", en: "Response patterns about rules and scenarios; not observed behavior." },
  productComplexity: { es: "Mayor complejidad entre los productos marcados; no demuestra comprensión.", en: "Highest complexity among selected products; this does not demonstrate understanding." },
  overconfidence: { es: "Señales heurísticas de confianza excesiva en las respuestas; no es un rasgo medido.", en: "Heuristic signs of excessive confidence in the answers; this is not a measured trait." },
  calibration: { es: "Capacidad de reconocer cuándo algo no está claro.", en: "Ability to recognize when something is not clear." },
};

const flagLabels: Record<DiagnosticFlag, { es: string; en: string }> = {
  income_fragility: { es: "ingresos frágiles", en: "income fragility" },
  low_surplus: { es: "excedente bajo", en: "low surplus" },
  expensive_debt: { es: "deuda cara", en: "high-cost debt" },
  low_emergency_fund: { es: "fondo de emergencia bajo", en: "low emergency fund" },
  unclear_horizon: { es: "horizonte poco claro", en: "unclear horizon" },
  liquidity_fragility: { es: "fragilidad de liquidez", en: "liquidity fragility" },
  near_cash_need: { es: "necesidad cercana de caja", en: "near cash need" },
  capital_concentration: { es: "concentración de capital", en: "capital concentration" },
  declared_high_tolerance: { es: "alta tolerancia declarada", en: "declared high tolerance" },
  pressure_low_tolerance: { es: "baja tolerancia bajo presión", en: "low tolerance under pressure" },
  panic_sell: { es: "venta por presión", en: "pressure selling" },
  fomo_entry: { es: "entrada por FOMO", en: "FOMO entry" },
  social_pressure: { es: "presión social", en: "social pressure" },
  overconfidence: { es: "sobreconfianza", en: "overconfidence" },
  euphoria_sizing: { es: "aumento por euforia", en: "euphoria sizing" },
  knowledge_gap_basic: { es: "brecha de conocimiento básico", en: "basic knowledge gap" },
  knowledge_gap_complex: { es: "brecha de producto complejo", en: "complex product gap" },
  claims_knowledge: { es: "conocimiento declarado", en: "declared knowledge" },
  humble_uncertainty: { es: "incertidumbre bien calibrada", en: "well-calibrated uncertainty" },
  unrealistic_expectations: { es: "expectativas incompatibles", en: "incompatible expectations" },
  loss_recovery_bias: { es: "sesgo de recuperar pérdida", en: "loss recovery bias" },
  complex_products_selected: { es: "productos complejos marcados", en: "complex products selected" },
  product_mismatch: { es: "complejidad desalineada", en: "complexity mismatch" },
  no_written_process: { es: "sin proceso escrito", en: "no written process" },
  concentration_bias: { es: "sesgo de concentración", en: "concentration bias" },
};

const translateResult: Record<string, string> = {
  "Frágil": "Fragile",
  "Limitada": "Limited",
  "Suficiente": "Sufficient",
  "Robusta": "Robust",
  "Inicial": "Initial",
  "Básico": "Basic",
  "Intermedio": "Intermediate",
  "Alto en estas preguntas": "High on these questions",
  "Básica declarada": "Basic self-reported",
  "Intermedia declarada": "Intermediate self-reported",
  "Amplia declarada": "Extensive self-reported",
  "Básica": "Basic",
  "Intermedia": "Intermediate",
  "Alta": "High",
  "Compleja": "Complex",
  "Alertas para tu dinero": "Money warning signs",
  "Repetir con calma": "Repeat calmly",
  "Explorar niveles estadísticos": "Explore statistical levels",
  "Revisar recursos": "Review resources",
};

const complexityLabels: Record<string, { es: string; en: string }> = {
  Básica: { es: "Simple", en: "Simple" },
  Intermedia: { es: "Moderada", en: "Moderate" },
  Alta: { es: "Avanzada", en: "Advanced" },
  Compleja: { es: "Avanzada", en: "Advanced" },
  excessive: { es: "Excesiva por ahora", en: "Too high for now" },
};

const paiDimensionLabels: Record<PaiDimension, { es: string; en: string }> = {
  producir: { es: "Producir", en: "Produce" },
  administrar: { es: "Administrar", en: "Administer" },
  invertir: { es: "Invertir", en: "Invest" },
};

const paiStageLabels: Record<PaiStage, { es: string; en: string }> = {
  orden: { es: "Orden", en: "Order" },
  preparacion: { es: "Preparación", en: "Preparation" },
  expansion: { es: "Expansión", en: "Expansion" },
};

const paiStageDescriptions: Record<PaiStage, { es: string; en: string }> = {
  orden: {
    es: "Primero fortalecer ingresos, liquidez o control financiero.",
    en: "First strengthen income, liquidity or financial control.",
  },
  preparacion: {
    es: "La base existe, pero hay puntos que conviene reforzar antes de tomar más riesgo.",
    en: "The base exists, but some areas may need work before taking more risk.",
  },
  expansion: {
    es: "La estructura parece más sólida para estudiar inversión con mayor criterio.",
    en: "The structure appears stronger for studying investment with more judgment.",
  },
};

const paiLightLabels: Record<ReadinessLight, { es: string; en: string }> = {
  red: { es: "Prioridad de revisión", en: "Priority for review" },
  yellow: { es: "Preparar antes de avanzar", en: "Prepare before moving forward" },
  green: { es: "Base más sólida", en: "Stronger base" },
};

const paiWeaknessLabels: Record<PaiMainWeakness, { es: string; en: string }> = {
  liquidity: { es: "liquidez", en: "liquidity" },
  expensive_debt: { es: "deuda cara", en: "high-cost debt" },
  income_fragility: { es: "ingresos frágiles", en: "income fragility" },
  low_surplus: { es: "excedente insuficiente", en: "insufficient surplus" },
  low_emergency_fund: { es: "fondo de emergencia bajo", en: "low emergency fund" },
  unclear_horizon: { es: "horizonte poco claro", en: "unclear horizon" },
  unrealistic_expectations: { es: "expectativas exigentes", en: "demanding expectations" },
  low_product_understanding: { es: "comprensión de productos", en: "product understanding" },
  impulsivity: { es: "impulsividad", en: "impulsivity" },
  concentration: { es: "concentración", en: "concentration" },
  none: { es: "sin tensión dominante", en: "no dominant tension" },
};

function paiStatus(score: number, locale: DiagnosticLocale) {
  if (score >= 66) return locale === "es" ? "Fuerte" : "Strong";
  if (score >= 45) return locale === "es" ? "A reforzar" : "Needs work";
  return locale === "es" ? "Zona de atención" : "Attention zone";
}

function localText(locale: DiagnosticLocale, text: { es: string; en: string }) {
  return text[locale];
}

function referenceAmount(answers: DiagnosticAnswers) {
  const raw = answers.capital_reference;
  if (typeof raw !== "string" || raw === "generic") return null;
  const amount = Number(raw);
  return Number.isFinite(amount) ? amount : null;
}

function formatMoney(locale: DiagnosticLocale, amount: number) {
  const formatted = new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
  return locale === "es" ? `${formatted} €` : `€${formatted}`;
}

function scenarioFallback(questionId: string, locale: DiagnosticLocale) {
  const fall20 = {
    es: "Tu inversión cae aproximadamente -20%. ¿Qué tanto afectaría tu vida diaria?",
    en: "Your investment falls approximately -20%. How much would it affect your daily life?",
  };
  const fall18 = {
    es: "Tres meses después, tu inversión vale aproximadamente -18% menos. Redes y prensa hablan de más caídas. ¿Qué haces primero?",
    en: "Three months later, your investment is down approximately -18%. Social media and news talk about further losses. What do you do first?",
  };
  const gain45 = {
    es: "Una posición sube 45% en pocas semanas y ahora pesa mucho más dentro de tu cartera. ¿Qué haces primero?",
    en: "A position rises 45% in a few weeks and now represents a much larger part of your portfolio. What do you do first?",
  };
  const concentration60 = {
    es: "Tener 60% del capital en una sola posición o temática implica principalmente...",
    en: "Having 60% of capital in a single position or theme mainly implies...",
  };
  if (questionId === "loss_life_effect") return fall20[locale];
  if (questionId === "pressure_drop") return fall18[locale];
  if (questionId === "fast_gain") return gain45[locale];
  if (questionId === "stocks_check") return concentration60[locale];
  return null;
}

function renderQuestionText(question: DiagnosticQuestion, locale: DiagnosticLocale, answers: DiagnosticAnswers, text: string) {
  const amount = referenceAmount(answers);
  if (!amount && text.includes("{amount")) return scenarioFallback(question.id, locale) ?? text;
  if (!amount) return text;

  const values = {
    amount: formatMoney(locale, amount),
    amountMinus18: formatMoney(locale, amount * 0.82),
    amountMinus20: formatMoney(locale, amount * 0.8),
    amountPlus45: formatMoney(locale, amount * 1.45),
    amount60: formatMoney(locale, amount * 0.6),
  };

  return text.replace(/\{(amount|amountMinus18|amountMinus20|amountPlus45|amount60)\}/g, (_, key: keyof typeof values) => values[key]);
}

const genericQuestionHints = {
  es: [
    "Responde con lo que harías normalmente, no con lo que sonaría perfecto.",
    "Elige la opción más cercana a lo que crees que harías.",
    "La utilidad está en describir tu situación y reconocer lo que no sabes.",
    "Piensa en tu comportamiento habitual, no en una versión perfecta de ti.",
    "La respuesta aporta una referencia educativa, no una autorización para operar.",
    "Elige la opción que más se parezca a ti en una situación real.",
    "Responde con calma; buscamos aproximar tu reacción, no juzgarla.",
  ],
  en: [
    "Answer with what you would usually do, not with what sounds perfect.",
    "Choose the option closest to what you think you would do.",
    "The value is in describing your situation and recognizing what you do not know.",
    "Think about your usual behavior, not a perfect version of yourself.",
    "The answer provides an educational reference, not authorization to trade.",
    "Choose the option that best resembles you in a real situation.",
    "Answer calmly; the goal is to approximate your reaction, not judge it.",
  ],
};

function questionHasUnsureOption(question: DiagnosticQuestion) {
  return question.options.some((option) => (
    option.id === "unsure" ||
    option.label.es.toLowerCase().includes("no estoy seguro") ||
    option.label.en.toLowerCase().includes("not sure") ||
    option.label.en.toLowerCase().includes("not certain")
  ));
}

function hintIndex(questionId: string) {
  return Array.from(questionId).reduce((sum, char) => sum + char.charCodeAt(0), 0) % genericQuestionHints.es.length;
}

function getQuestionHint(question: DiagnosticQuestion, locale: DiagnosticLocale) {
  if (question.id === "capital_reference" || question.id === "products_known" || question.block === "financial") return localText(locale, question.helper);
  if (questionHasUnsureOption(question)) {
    return locale === "es"
      ? "Si no lo tienes claro, elegir “No estoy seguro” también es una respuesta útil."
      : "If you are not sure, choosing “Not sure” is also useful information.";
  }
  return genericQuestionHints[locale][hintIndex(question.id)];
}

function isDiagnosticProfile(value: string): value is keyof typeof DIAGNOSTIC_PROFILE_LABELS {
  return value in DIAGNOSTIC_PROFILE_LABELS;
}

function resultText(locale: DiagnosticLocale, value: string) {
  if (locale === "en" && isDiagnosticProfile(value)) return DIAGNOSTIC_PROFILE_LABELS[value].en;
  return locale === "en" ? translateResult[value] ?? value : value;
}

function complexityText(locale: DiagnosticLocale, result: ReturnType<typeof scoreDiagnostic>) {
  if (!result.selectedProducts.length) return locale === "es" ? "Sin selección" : "No selection";
  if (result.flags.includes("product_mismatch")) return locale === "es" ? "Brecha por producto" : "Product-specific gap";
  return complexityLabels[result.complexity.band]?.[locale] ?? resultText(locale, result.complexity.band);
}


function routeHref(locale: DiagnosticLocale, href: string) {
  if (locale === "es") return href;
  if (href === "/protege-tu-dinero") return "/en/protect-your-money";
  if (href === "/analisiscuantitativo") return "/en/quantitative-analysis";
  if (href === "/recursos") return "/en/resources";
  if (href.startsWith("/diagnostico")) return href.replace("/diagnostico", "/en/diagnostic");
  return href;
}

function ModeCard({ active, description, duration, onClick, questions, title }: {
  active: boolean; description: string; duration: string; onClick: () => void; questions: string; title: string;
}) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={styles.modeCard}>
      <span className={styles.choiceMark} aria-hidden="true" />
      <span className={styles.modeTitle}>{title}</span>
      <span className={styles.modeDescription}>{description}</span>
      <span className={styles.modeMeta}><strong>{questions}</strong><span>{duration}</span></span>
    </button>
  );
}

function StartScreen({ locale, mode, setMode, start }: {
  locale: DiagnosticLocale; mode?: DiagnosticMode; setMode: (mode: DiagnosticMode) => void; start: () => void;
}) {
  const text = copy[locale];
  const modes = [
    { id: "quick", title: text.quickTitle, description: text.quickDescription, minutes: "20–30" },
    { id: "complete", title: text.fullTitle, description: text.fullDescription, minutes: "40–60" },
  ] as const;
  return (
    <section className={styles.start} aria-labelledby="diagnostic-depth">
      <div className={styles.startCopy}>
        <p className={styles.eyebrow}>{text.chooseDepth}</p>
        <h2 id="diagnostic-depth" tabIndex={-1} className={styles.sectionTitle}>{text.depthTitle}</h2>
        <p>{text.startDescription}</p>
        <p>{text.pace}</p>
      </div>
      <div className={styles.modeGrid}>
        {modes.map(({ id, title, description, minutes }) => {
          const { base, maximum } = getQuestionCounts(id);
          const questions = locale === "es"
            ? `${base} preguntas, hasta ${maximum} con adaptativas`
            : `${base} questions, up to ${maximum} with adaptive questions`;
          const duration = locale === "es" ? `Tiempo estimado: ${minutes} min` : `Estimated time: ${minutes} min`;
          return <ModeCard key={id} active={mode === id} title={title} description={description} questions={questions} duration={duration} onClick={() => setMode(id)} />;
        })}
      </div>
      <div className={styles.startFooter}>
        <div>
          <p>{text.educationalNotice}</p>
          <p>{text.storageNote}</p>
        </div>
        <button type="button" onClick={start} disabled={!mode} className={styles.primary}>{text.start}</button>
      </div>
    </section>
  );
}

// These are the figures already used in the corresponding prompts and their generic fallbacks.
const scenarioChanges: Record<string, number> = {
  loss_life_effect: -20,
  pressure_drop: -18,
  fast_gain: 45,
  large_position_down_complete: -40,
};
const scenarioShares: Record<string, number> = { stocks_check: 60, single_position_30_complete: 30 };

function ScenarioGraphic({ id, answers, locale }: { id: string; answers: DiagnosticAnswers; locale: DiagnosticLocale }) {
  const share = scenarioShares[id];
  const change = scenarioChanges[id];
  const amount = referenceAmount(answers);
  if (share !== undefined) {
    const label = `${share}%`;
    return (
      <div className={styles.scenarioShare} aria-hidden="true" data-diagnostic-scenario={id}>
        <span className={styles.scenarioTrack}><span style={{ width: share + "%" }} /></span><strong>{label}</strong>
      </div>
    );
  }
  if (change === undefined) return null;
  if (!amount || id === "large_position_down_complete") {
    return <div className={styles.scenarioDelta} aria-hidden="true" data-diagnostic-scenario={id}>{change > 0 ? "+" : "−"}{Math.abs(change)}%</div>;
  }
  const ratio = (100 + change) / 100;
  const after = amount * ratio;
  const scale = Math.max(1, ratio);
  return (
    <div className={styles.scenarioLevels} aria-hidden="true" data-diagnostic-scenario={id}>
      {[[amount, 1], [after, ratio]].map(([figure, fraction]) => (
        <div key={figure}><span className={styles.scenarioTrack}><span style={{ width: fraction / scale * 100 + "%" }} /></span><strong>{formatMoney(locale, figure)}</strong></div>
      ))}
    </div>
  );
}

function QuestionScreen({ answer, answers, currentIndex, locale, mode, onAnswer, onBack, onNext, question, total }: {
  answer: string | string[] | undefined;
  answers: DiagnosticAnswers;
  currentIndex: number;
  locale: DiagnosticLocale;
  mode: DiagnosticMode;
  onAnswer: (question: DiagnosticQuestion, value: string) => void;
  onBack: () => void;
  onNext: () => void;
  question: DiagnosticQuestion;
  total: number;
}) {
  const text = copy[locale];
  const answered = isAnswered(question, answer);
  const { percent } = diagnosticProgress(answers, mode);
  const progress = Math.round(percent);
  const selectedIds = Array.isArray(answer) ? answer : answer ? [answer] : [];
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    heading.current?.closest("section")?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [question.id]);

  return (
    <section className={styles.question} data-diagnostic-question={question.id}>
      <div className={styles.questionProgress}>
        <div>
          <p className={styles.eyebrow}>{mode === "quick" ? text.quickTitle : text.fullTitle}</p>
          <p>{text.question} {currentIndex + 1} {text.questionOf} {total}</p>
        </div>
        <div>
          <p><span>{text.progress}</span> <strong>{progress}%</strong></p>
          <progress aria-label={text.progress} max={100} value={percent} />
        </div>
        <p className={styles.progressNote}>{locale === "es" ? "El total se ajusta a los productos seleccionados." : "The total adjusts to the products selected."}</p>
      </div>
      <div key={question.id} className={styles.questionBody}>
        <h1 id="diagnostic-question" ref={heading} tabIndex={-1}>{renderQuestionText(question, locale, answers, localText(locale, question.prompt))}</h1>
        <p className={styles.questionHint}>{getQuestionHint(question, locale)}</p>
        <ScenarioGraphic id={question.id} answers={answers} locale={locale} />
        <div className={styles.options} role="group" aria-labelledby="diagnostic-question">
          {question.options.map((option) => (
            <button key={option.id} type="button" aria-pressed={selectedIds.includes(option.id)} data-option-id={option.id} data-multi={question.multi || undefined} onClick={() => onAnswer(question, option.id)} className={styles.option}>
              <span className={styles.choiceMark} aria-hidden="true" />
              <span>
                <span className={styles.optionLabel}>{localText(locale, option.label)}</span>
                {option.detail ? <span className={styles.optionDetail}>{localText(locale, option.detail)}</span> : null}
              </span>
            </button>
          ))}
        </div>
        <div className={styles.questionNav}>
          <button type="button" onClick={onBack} className={styles.secondary}>{text.back}</button>
          <button type="button" onClick={onNext} disabled={!answered} className={styles.primary}>
            {currentIndex === total - 1 ? text.seeResult : text.continue}
          </button>
        </div>
      </div>
    </section>
  );
}

function ScoreBar({ description, label, value }: { description: string; label: string; value: number }) {
  return (
    <div className={styles.scoreRow}>
      <p><strong>{label}</strong><span>{value}</span></p>
      <div className={styles.scoreTrack} aria-hidden="true"><span style={{ width: value + "%" }} /></div>
      <p className={styles.scoreDescription}>{description}</p>
    </div>
  );
}

function ResultDetail({ title, children, count }: { title: string; children: ReactNode; count?: number }) {
  return (
    <details className={styles.detail}>
      <summary><span>{title}</span>{count !== undefined ? <span className={styles.detailCount}>{count}</span> : null}</summary>
      <div className={styles.detailBody}>{children}</div>
    </details>
  );
}

const scopeLabels = {
  general: { es: "Base financiera general", en: "General financial base" },
  capital: { es: "Capital evaluado", en: "Capital assessed" },
  product: { es: "Producto", en: "Product" },
  learning: { es: "Aprendizaje", en: "Learning" },
};

function ConstraintList({ items, locale }: { items: ReturnType<typeof scoreDiagnostic>["constraints"]; locale: DiagnosticLocale }) {
  return (
    <ul className={styles.readingList}>
      {items.map((item) => (
        <li key={item.id} data-constraint={item.id}>
          <strong>{item.label} · {scopeLabels[item.scope][locale]}</strong>
          <p>{item.note}</p>
        </li>
      ))}
    </ul>
  );
}

function ResultScreen({ answers, locale, mode, restart, review }: { answers: DiagnosticAnswers; locale: DiagnosticLocale; mode: DiagnosticMode; restart: () => void; review: () => void }) {
  const result = useMemo(() => scoreDiagnostic(answers, mode, locale), [answers, mode, locale]);
  const generatedAt = useMemo(() => new Date(), []);
  const text = copy[locale];
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, []);
  const scoreEntries = Object.entries(result.scores) as Array<[DiagnosticScoreKey, number]>;
  const paiMatrix: Array<[PaiDimension, number]> = [
    ["producir", result.paiReadiness.producirScore],
    ["administrar", result.paiReadiness.administrarScore],
    ["invertir", result.paiReadiness.invertirScore],
  ];
  const priorities = result.constraints.filter((item) => item.severity === "priority");
  const scale = locale === "es" ? "Índices orientativos · 0 a 100" : "Indicative indices · 0 to 100";
  const methodTitle = locale === "es" ? "Metodología" : "Methodology";
  const firstAlert = result.alerts[0];

  return (
    <>
      <div className={`no-print ${styles.results}`} data-diagnostic-result={mode}>
        <header className={styles.resultHeader}>
          <p className={styles.eyebrow}>{text.result}</p>
          <h1 ref={heading} tabIndex={-1}>{text.readings}</h1>
          <p>{result.summary}</p>
        </header>

        <section className={styles.readiness} aria-labelledby="diagnostic-readiness">
          <div className={styles.readinessHead}>
            <div><h2 id="diagnostic-readiness" className={styles.sectionTitle}>{text.pai}</h2><p>{text.paiPrudence}</p></div>
            <div className={styles.signal} data-readiness-light={result.paiReadiness.light}>
              <span className={styles.signalDot} aria-hidden="true" />
              <div><p className={styles.eyebrow}>{text.paiLight}</p><strong>{paiLightLabels[result.paiReadiness.light][locale]}</strong></div>
            </div>
          </div>
          <dl className={styles.readinessFacts}>
            <div><dt>{text.paiStage}</dt><dd>{paiStageLabels[result.paiReadiness.stage][locale]}</dd><dd>{paiStageDescriptions[result.paiReadiness.stage][locale]}</dd></div>
            <div><dt>{text.paiWeakness}</dt><dd>{paiWeaknessLabels[result.paiReadiness.mainWeakness][locale]}</dd></div>
          </dl>
          <p className={styles.eyebrow}>{scale}</p>
          <div className={styles.scoreGrid}>
            {paiMatrix.map(([dimension, score]) => (
              <ScoreBar key={dimension} value={score} label={paiDimensionLabels[dimension][locale]} description={dimension === "invertir" && result.paiReadiness.light !== "green" ? (locale === "es" ? "Consulta las limitaciones; el índice no las elimina." : "Review the limitations; the index does not remove them.") : paiStatus(score, locale)} />
            ))}
          </div>
          <div className={styles.nextStep}>
            <p className={styles.eyebrow}>{text.paiNextStep}</p>
            <p>{result.paiReadiness.nextEducationalStep}</p>
            {result.paiReadiness.baseLimitNote ? <p>{result.paiReadiness.baseLimitNote}</p> : null}
          </div>
        </section>

        <div className={styles.metrics}>
          <section>
            <h2>{scoreLabels.financialCapacity[locale]}</h2>
            <p className={styles.metricValue}>{result.scores.financialCapacity}<small> / 100</small></p>
            <p><strong>{text.loss} · {resultText(locale, result.lossCapacity.label)}</strong></p>
            <p>{result.lossCapacity.note}</p>
          </section>
          <section>
            <h2>{text.declared}</h2>
            <p className={styles.metricValue}>{resultText(locale, result.declaredProfile)}</p>
            <p>{result.declaredLoss}</p>
          </section>
          <section>
            <h2>{text.pressure}</h2>
            <p className={styles.metricValue}>{resultText(locale, result.pressureProfile)}</p>
            <p>{result.pressureSummary}</p>
          </section>
        </div>

        <section className={styles.route}>
          <h2 className={styles.eyebrow}>{text.route}</h2>
          <Link href={routeHref(locale, result.route.href)} target="_blank" rel="noopener noreferrer">{resultText(locale, result.route.label)}</Link>
          <p>{result.route.note}</p>
          <p>{text.routeNewTab}</p>
        </section>

        {priorities.length || firstAlert ? (
          <section className={styles.priority} aria-labelledby="diagnostic-priority">
            <h2 id="diagnostic-priority" className={styles.sectionTitle}>{priorities.length ? text.limits : text.alerts}</h2>
            {priorities.length ? <ConstraintList items={priorities} locale={locale} /> : null}
            {firstAlert ? <p>{firstAlert}</p> : null}
          </section>
        ) : null}

        <div className={styles.resultLower}>
          <section className={styles.detailGroup} aria-label={locale === "es" ? "Lectura en profundidad" : "Detailed reading"}>
            <h2 className={styles.sectionTitle}>{locale === "es" ? "Lectura en profundidad" : "Detailed reading"}</h2>
            {result.constraints.length ? <ResultDetail title={text.limits} count={result.constraints.length}><ConstraintList items={result.constraints} locale={locale} /></ResultDetail> : null}
            <ResultDetail title={text.products} count={result.productChecks.length}>
              <p><strong>{text.complexity} · {complexityText(locale, result)}</strong></p>
              <p>{text.complexityNote}</p>
              {result.productChecks.length ? <>
                <p>{locale === "es" ? "Estas comprobaciones no acreditan experiencia por producto ni autorizan a utilizarlo." : "These checks do not establish experience with each product or authorize its use."}</p>
                <ul className={styles.readingList}>{result.productChecks.map((item) => <li key={item.product}>
                  <strong>{item.label}</strong>
                  {item.response ? <p>{locale === "es" ? "Tu respuesta: " : "Your answer: "}{item.response}</p> : null}
                  <p>{item.note}</p>
                </li>)}</ul>
              </> : <p>{result.complexity.note}</p>}
            </ResultDetail>
            <ResultDetail title={text.experience}>
              <p><strong>{resultText(locale, result.experience.label)}</strong></p><p>{result.experience.note}</p>
            </ResultDetail>
            <ResultDetail title={text.expectation} count={result.expectationTensions.length}>
              <ul className={styles.readingList}>{result.expectationTensions.map((item) => <li key={item}>{item}</li>)}</ul>
            </ResultDetail>
            <ResultDetail title={text.alerts} count={result.alerts.length}>
              <ul className={styles.readingList}>{result.alerts.map((alert) => <li key={alert}>{alert}</li>)}</ul>
              <p><strong>{text.flags}</strong></p>
              <ul className={styles.chips}>{result.flags.length ? result.flags.map((flag) => <li key={flag}>{flagLabels[flag][locale]}</li>) : <li>{text.noFlags}</li>}</ul>
            </ResultDetail>
            <ResultDetail title={text.scores}>
              <p><strong>{text.knowledge} · {resultText(locale, result.knowledge.label)}</strong></p><p>{result.knowledge.note}</p>
              <p>{result.methodologyNote}</p>
              <div className={styles.scoreGrid}>
                {scoreEntries.map(([key, value]) => <ScoreBar key={key} description={scoreDescriptions[key][locale]} label={scoreLabels[key][locale]} value={value} />)}
              </div>
            </ResultDetail>
            <ResultDetail title={methodTitle}>
              <p>{result.methodologyNote}</p>
              <DiagnosticReadingGuide locale={locale} />
            </ResultDetail>
          </section>
          <aside className={styles.actions}>
            <DiagnosticReportActions locale={locale} result={result} />
            <p>{text.restartNote}</p>
            <button type="button" onClick={review} className={styles.secondary}>{text.review}</button>
            <button type="button" onClick={restart} className={styles.secondary}>{text.restart}</button>
          </aside>
        </div>
        <DisclaimerBox>{result.disclaimer}</DisclaimerBox>
      </div>
      <DiagnosticPrintableReport generatedAt={generatedAt} locale={locale} result={result} />
    </>
  );
}

export function DiagnosticFlow({ initialMode, locale = "es", entryContent }: {
  initialMode?: DiagnosticMode; locale?: DiagnosticLocale; entryContent?: ReactNode;
}) {
  const [mode, setMode] = useState<DiagnosticMode | undefined>(initialMode);
  const [started, setStarted] = useState(Boolean(initialMode));
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<DiagnosticAnswers>({});
  const [completed, setCompleted] = useState(false);
  const questions = useMemo(() => mode ? getQuestionsForMode(mode, answers) : [], [answers, mode]);
  const safeIndex = Math.min(index, Math.max(0, questions.length - 1));
  const question = questions[safeIndex];
  const wasStarted = useRef(started);
  const entryFocus = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (wasStarted.current && !started) {
      const heading = entryFocus.current?.querySelector<HTMLElement>("#diagnostic-depth");
      heading?.focus();
    }
    wasStarted.current = started;
  }, [started]);

  function start() {
    if (!mode) return;
    const url = new URL(window.location.href);
    url.searchParams.set("mode", mode);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    setStarted(true);
    setCompleted(false);
    setIndex(0);
    setAnswers({});
  }

  function restart() {
    setStarted(false);
    setCompleted(false);
    setIndex(0);
    setAnswers({});
  }

  function updateAnswer(target: DiagnosticQuestion, value: string) {
    if (!mode) return;
    setAnswers((current) => updateDiagnosticAnswer(current, target, value, mode));
  }

  function goBack() {
    if (safeIndex === 0) {
      setStarted(false);
      return;
    }
    setIndex((current) => current - 1);
  }

  function goNext() {
    if (!question || !isAnswered(question, answers[question.id]) || !mode) return;
    if (safeIndex >= questions.length - 1) {
      const validation = validateDiagnosticAnswers(answers, mode);
      if (!validation.valid) { setIndex(Math.max(0, questions.findIndex((item) => validation.issues.includes(item.id)))); return; }
      setCompleted(true);
      return;
    }
    setIndex((current) => current + 1);
  }

  if (!started || !mode) return <div className="no-print" ref={entryFocus}>{entryContent}<StartScreen locale={locale} mode={mode} setMode={setMode} start={start} /></div>;
  if (completed && validateDiagnosticAnswers(answers, mode).valid) return <ResultScreen answers={answers} locale={locale} mode={mode} restart={restart} review={() => { setCompleted(false); setIndex(0); }} />;
  if (!question) return null;

  return (
    <QuestionScreen
      answer={answers[question.id]}
      answers={answers}
      currentIndex={safeIndex}
      locale={locale}
      mode={mode}
      onAnswer={updateAnswer}
      onBack={goBack}
      onNext={goNext}
      question={question}
      total={questions.length}
    />
  );
}
