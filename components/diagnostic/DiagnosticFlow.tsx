"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { DiagnosticPrintableReport } from "@/components/diagnostic/DiagnosticPrintableReport";
import { DiagnosticReportActions } from "@/components/diagnostic/DiagnosticReportActions";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RiskPill } from "@/components/ui/RiskPill";
import { getQuestionsForMode } from "@/lib/diagnostic/questions";
import { scoreDiagnostic } from "@/lib/diagnostic/scoring";
import { DIAGNOSTIC_PROFILE_LABELS, DIAGNOSTIC_PROFILES } from "@/lib/diagnostic/types";
import type { DiagnosticAnswers, DiagnosticFlag, DiagnosticLocale, DiagnosticMode, DiagnosticQuestion, DiagnosticScoreKey, PaiDimension, PaiMainWeakness, PaiStage, ReadinessLight } from "@/lib/diagnostic/types";

const copy = {
  es: {
    back: "Atrás",
    chooseDepth: "Elige profundidad",
    continue: "Continuar",
    depthTitle: "Diagnóstico del inversionista",
    fullDescription: "Lectura más profunda de experiencia, conducta, liquidez, concentración y comprensión de productos.",
    fullDuration: "15-20 minutos",
    fullQuestions: "45-55 base + adaptativas",
    fullTitle: "Diagnóstico completo",
    progress: "Progreso",
    question: "Pregunta",
    questionOf: "de",
    quickDescription: "29 preguntas base más adaptativas según productos marcados.",
    quickDuration: "7-10 minutos",
    quickQuestions: "29 + adaptativas",
    quickTitle: "Diagnóstico rápido premium",
    restart: "Volver al inicio del diagnóstico",
    seeResult: "Ver resultado",
    start: "Empezar",
    startDescription: "Perfil, expectativas y capacidad real antes de tomar riesgo. Tu perfil declarado importa, pero tu perfil bajo presión pesa más.",
    storageNote: "Las respuestas viven solo en esta sesión del navegador. No se guardan, no se envían a servidores externos y al recargar se pierden.",
    selected: "Seleccionado",
    result: "Resultado educativo",
    declared: "Perfil declarado",
    pressure: "Perfil bajo presión",
    expectation: "Expectativas y tensiones",
    loss: "Capacidad de pérdida",
    knowledge: "Conocimiento validado",
    complexity: "Complejidad a revisar",
    complexityNote: "La lectura compara productos marcados con comprensión validada, experiencia y conducta bajo presión.",
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
    depthTitle: "Open premium retail diagnostic",
    fullDescription: "Deeper read across experience, behavior, liquidity, concentration and product understanding.",
    fullDuration: "15-20 minutes",
    fullQuestions: "45-55 base + adaptive",
    fullTitle: "Full diagnostic",
    progress: "Progress",
    question: "Question",
    questionOf: "of",
    quickDescription: "29 base questions plus adaptive questions depending on selected products.",
    quickDuration: "7-10 minutes",
    quickQuestions: "29 + adaptive",
    quickTitle: "Premium quick diagnostic",
    restart: "Return to the diagnostic start",
    seeResult: "View result",
    start: "Start",
    startDescription: "Profile, expectations and real capacity before taking risk. Your declared profile matters, but your profile under pressure matters more.",
    storageNote: "Answers live only in this browser session. They are not stored, are not sent to external servers, and disappear on reload.",
    selected: "Selected",
    result: "Educational result",
    declared: "Declared profile",
    pressure: "Profile under pressure",
    expectation: "Expectations and tensions",
    loss: "Loss capacity",
    knowledge: "Validated knowledge",
    complexity: "Complexity to review",
    complexityNote: "This compares selected products with validated understanding, experience and behavior under pressure.",
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
  knowledgeValidated: { es: "Conocimiento validado", en: "Validated knowledge" },
  experienceReal: { es: "Experiencia real", en: "Real experience" },
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
  emotionalTolerance: { es: "Probable reacción ante caídas visibles con dinero real.", en: "Likely reaction to visible losses with real money." },
  patience: { es: "Capacidad de sostener un plan durante periodos lentos o negativos.", en: "Ability to hold a plan through slow or negative periods." },
  fomoSensitivity: { es: "Tendencia a cambiar de plan por comparación o miedo a quedarse por fuera.", en: "Tendency to change plans due to comparison or fear of missing out." },
  euphoriaRisk: { es: "Tendencia a aumentar riesgo después de ganancias rápidas.", en: "Tendency to increase risk after quick gains." },
  knowledgeValidated: { es: "Comprensión demostrada sobre productos y riesgos, no solo declarada.", en: "Demonstrated understanding of products and risks, not only declared." },
  experienceReal: { es: "Contacto previo con inversiones reales y caídas vividas.", en: "Previous contact with real investments and lived drawdowns." },
  expectationRealism: { es: "Coherencia entre retorno esperado, pérdida tolerada, liquidez y horizonte.", en: "Consistency between expected return, tolerated loss, liquidity and horizon." },
  consistency: { es: "Coherencia entre respuestas declaradas y comportamiento bajo presión.", en: "Alignment between stated answers and behavior under pressure." },
  productComplexity: { es: "Relación entre productos marcados, comprensión y experiencia.", en: "Relationship between selected products, understanding and experience." },
  overconfidence: { es: "Diferencia entre confianza declarada y comprensión validada.", en: "Gap between stated confidence and validated understanding." },
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
  "Validado alto": "High validated",
  "Básica": "Basic",
  "Intermedia": "Intermediate",
  "Alta": "High",
  "Compleja": "Complex",
  "Protege tu dinero": "Protect your money",
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
  red: { es: "Primero ordenar", en: "Organize first" },
  yellow: { es: "Preparar antes de avanzar", en: "Prepare before moving forward" },
  green: { es: "Base más sólida", en: "Stronger base" },
};

const paiWeaknessLabels: Record<PaiMainWeakness, { es: string; en: string }> = {
  liquidity: { es: "liquidez", en: "liquidity" },
  expensive_debt: { es: "deuda cara", en: "high-cost debt" },
  income_fragility: { es: "ingresos frágiles", en: "income fragility" },
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

function paiLightClass(light: ReadinessLight) {
  if (light === "green") return "border-[#6f8f7b] bg-[#eef3f2] text-[#2f5f48]";
  if (light === "yellow") return "border-brass/60 bg-[#f7f1df] text-[#7a5a18]";
  return "border-[#b66a5d] bg-[#f8e9e6] text-[#8a3f35]";
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
    "Elige la opción más cercana a tu reacción real.",
    "No hay una respuesta ideal; la utilidad está en responder con honestidad.",
    "Piensa en tu comportamiento habitual, no en una versión perfecta de ti.",
    "La respuesta sirve para conocerte mejor, no para aprobar un examen.",
    "Elige la opción que más se parezca a ti en una situación real.",
    "Responde con calma; buscamos aproximar tu reacción, no juzgarla.",
  ],
  en: [
    "Answer with what you would usually do, not with what sounds perfect.",
    "Choose the option closest to your real reaction.",
    "There is no ideal answer; the value is in answering honestly.",
    "Think about your usual behavior, not a perfect version of yourself.",
    "This is here to help you understand yourself, not to pass an exam.",
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
  if (question.id === "capital_reference") return localText(locale, question.helper);
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
  if (result.flags.includes("product_mismatch")) return complexityLabels.excessive[locale];
  return complexityLabels[result.complexity.band]?.[locale] ?? resultText(locale, result.complexity.band);
}

function isConservativePressureProfile(profile: ReturnType<typeof scoreDiagnostic>["pressureProfile"]) {
  return profile === DIAGNOSTIC_PROFILES[0] || profile === DIAGNOSTIC_PROFILES[1];
}

function routeHref(locale: DiagnosticLocale, href: string) {
  if (locale === "es") return href;
  if (href === "/protege-tu-dinero") return "/en/protect-your-money";
  if (href === "/niveles-estadisticos") return "/en/statistical-levels";
  if (href === "/recursos") return "/en/resources";
  if (href.startsWith("/diagnostico")) return href.replace("/diagnostico", "/en/diagnostic");
  return href;
}

function ModeCard({ active, description, duration, onClick, questions, title }: { active: boolean; description: string; duration: string; onClick: () => void; questions: string; title: string }) {
  return (
    <button type="button" onClick={onClick} className={`border p-5 text-left transition md:p-6 ${active ? "border-petrol bg-[#eef3f2]" : "border-line bg-panel hover:border-ink"}`}>
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">{duration}</span>
      <h3 className="mt-4 text-xl font-semibold text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
      <p className="mt-5 border-t border-line pt-4 text-sm font-semibold text-ink">{questions}</p>
    </button>
  );
}

function StartScreen({ locale, mode, setMode, start }: { locale: DiagnosticLocale; mode: DiagnosticMode | undefined; setMode: (mode: DiagnosticMode) => void; start: () => void }) {
  const text = copy[locale];
  const canStart = Boolean(mode);
  return (
    <section className="border border-line bg-panel p-5 md:p-7">
      <div className="grid gap-8 lg:grid-cols-[0.74fr_1.26fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">{text.chooseDepth}</p>
          <h2 className="mt-3 text-2xl font-semibold leading-tight text-ink md:text-3xl">{text.depthTitle}</h2>
          <p className="mt-4 text-sm leading-7 text-muted">{text.startDescription}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ModeCard active={mode === "quick"} description={text.quickDescription} duration={text.quickDuration} onClick={() => setMode("quick")} questions={text.quickQuestions} title={text.quickTitle} />
          <ModeCard active={mode === "complete"} description={text.fullDescription} duration={text.fullDuration} onClick={() => setMode("complete")} questions={text.fullQuestions} title={text.fullTitle} />
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-muted">{text.storageNote}</p>
        <button type="button" onClick={start} disabled={!canStart} className="w-fit border border-ink bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-ink disabled:cursor-not-allowed disabled:opacity-35">{text.start}</button>
      </div>
    </section>
  );
}

function isAnswered(answer: string | string[] | undefined) {
  return Array.isArray(answer) ? answer.length > 0 : Boolean(answer);
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
  const answered = isAnswered(answer);
  const progress = ((currentIndex + (answered ? 1 : 0)) / total) * 100;
  const selectedIds = Array.isArray(answer) ? answer : answer ? [answer] : [];

  return (
    <section className="border border-line bg-panel p-5 md:p-8">
      <div className="grid gap-6 lg:grid-cols-[0.72fr_0.28fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">{mode === "quick" ? text.quickTitle : text.fullTitle}</p>
          <p className="mt-4 text-sm font-semibold text-muted">{text.question} {currentIndex + 1} {text.questionOf} {total}</p>
        </div>
        <div>
          <div className="mb-2 flex justify-between text-xs text-muted"><span>{text.progress}</span><span>{Math.round(progress)}%</span></div>
          <ProgressBar value={progress} />
        </div>
      </div>

      <div className="mt-8 max-w-4xl">
        <h2 className="text-2xl font-semibold leading-tight text-ink md:text-4xl">{renderQuestionText(question, locale, answers, localText(locale, question.prompt))}</h2>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted">{getQuestionHint(question, locale)}</p>
      </div>

      <div className="mt-8 grid gap-3">
        {question.options.map((option, index) => {
          const active = selectedIds.includes(option.id);
          return (
            <button key={option.id} type="button" onClick={() => onAnswer(question, option.id)} className={`group grid gap-2 border px-5 py-4 text-left transition md:grid-cols-[2.25rem_1fr] md:items-start ${active ? "border-petrol bg-[#eef3f2] text-ink" : "border-line bg-panelSoft text-muted hover:border-ink hover:text-ink"}`}>
              <span className={`flex h-8 w-8 items-center justify-center border text-sm font-semibold ${active ? "border-petrol text-petrol" : "border-line text-muted group-hover:border-ink group-hover:text-ink"}`}>
                {question.multi && active ? "✓" : index + 1}
              </span>
              <span>
                <span className="block font-semibold leading-6">{localText(locale, option.label)}</span>
                {option.detail ? <span className="mt-1 block text-sm leading-6 text-muted">{localText(locale, option.detail)}</span> : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col-reverse justify-between gap-3 sm:flex-row">
        <button type="button" onClick={onBack} className="border border-line bg-panel px-4 py-2.5 text-sm font-medium text-muted transition hover:border-ink hover:text-ink">{text.back}</button>
        <button type="button" onClick={onNext} disabled={!answered} className="border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-ink disabled:cursor-not-allowed disabled:opacity-35">
          {currentIndex === total - 1 ? text.seeResult : text.continue}
        </button>
      </div>
    </section>
  );
}

function ScoreBar({ description, label, value }: { description: string; label: string; value: number }) {
  const accessibleLabel = `${label}: ${value}. ${description}`;
  return (
    <div className="group relative border border-line bg-panelSoft p-3" aria-label={accessibleLabel} tabIndex={0}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
          <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center border border-line bg-panel text-[0.7rem] font-semibold text-muted">?</span>
        </div>
        <p className="text-sm font-semibold text-ink">{value}</p>
      </div>
      <div className="mt-3 h-1.5 bg-panel"><div className="h-1.5 bg-[#6f8f7b]" style={{ width: `${value}%` }} /></div>
      <div className="pointer-events-none absolute left-3 right-3 top-10 z-20 hidden border border-line bg-panel p-3 text-xs leading-5 text-muted shadow-sm md:group-hover:block md:group-focus:block md:group-focus-within:block">
        {description}
      </div>
      <p className="mt-2 text-xs leading-5 text-muted md:hidden">{description}</p>
    </div>
  );
}

function ResultScreen({ answers, locale, mode, restart }: { answers: DiagnosticAnswers; locale: DiagnosticLocale; mode: DiagnosticMode; restart: () => void }) {
  const result = useMemo(() => scoreDiagnostic(answers, mode, locale), [answers, locale, mode]);
  const generatedAt = useMemo(() => new Date(), []);
  const text = copy[locale];
  const scoreEntries = Object.entries(result.scores) as Array<[DiagnosticScoreKey, number]>;
  const paiMatrix: Array<[PaiDimension, number]> = [
    ["producir", result.paiReadiness.producirScore],
    ["administrar", result.paiReadiness.administrarScore],
    ["invertir", result.paiReadiness.invertirScore],
  ];

  return (
    <>
    <div className="no-print grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="border border-line bg-panel p-5 md:p-7">
        <div className="flex flex-col gap-5 border-b border-line pb-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">{text.result}</p>
            <h2 className="mt-3 text-2xl font-semibold leading-tight text-ink md:text-3xl">{resultText(locale, result.profile)}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">{result.summary}</p>
          </div>
          <RiskPill label={resultText(locale, result.pressureProfile)} tone={isConservativePressureProfile(result.pressureProfile) ? "medium" : "low"} />
        </div>

        <div className="mt-6 border border-line bg-panelSoft p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-ink">{text.pai}</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{text.paiPrudence}</p>
            </div>
            <span className={`w-fit border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${paiLightClass(result.paiReadiness.light)}`}>
              {paiLightLabels[result.paiReadiness.light][locale]}
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="border border-line bg-panel p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted">{text.paiStage}</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{paiStageLabels[result.paiReadiness.stage][locale]}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{paiStageDescriptions[result.paiReadiness.stage][locale]}</p>
            </div>
            <div className="border border-line bg-panel p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted">{text.paiLight}</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{paiLightLabels[result.paiReadiness.light][locale]}</p>
            </div>
            <div className="border border-line bg-panel p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted">{text.paiWeakness}</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{paiWeaknessLabels[result.paiReadiness.mainWeakness][locale]}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {paiMatrix.map(([dimension, score]) => (
              <div key={dimension} className="border border-line bg-panel p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{paiDimensionLabels[dimension][locale]}</p>
                  <p className="text-sm font-semibold text-muted">{score}</p>
                </div>
                <div className="mt-3 h-1.5 bg-panelSoft"><div className="h-1.5 bg-[#6f8f7b]" style={{ width: `${score}%` }} /></div>
                <p className="mt-3 text-sm font-semibold text-muted">{paiStatus(score, locale)}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 border-l border-brass/60 pl-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{text.paiNextStep}</p>
            <p className="mt-2 text-sm leading-6 text-ink">{result.paiReadiness.nextEducationalStep}</p>
            {result.paiReadiness.baseLimitNote ? <p className="mt-2 text-sm leading-6 text-muted">{result.paiReadiness.baseLimitNote}</p> : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="border border-line bg-panelSoft p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted">{text.declared}</p><p className="mt-2 text-xl font-semibold text-ink">{resultText(locale, result.declaredProfile)}</p></div>
          <div className="border border-line bg-panelSoft p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted">{text.pressure}</p><p className="mt-2 text-xl font-semibold text-ink">{resultText(locale, result.pressureProfile)}</p></div>
          <div className="border border-line bg-panelSoft p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted">{text.complexity}</p><p className="mt-2 text-xl font-semibold text-ink">{complexityText(locale, result)}</p><p className="mt-2 text-sm leading-6 text-muted">{text.complexityNote}</p></div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="border border-line bg-panelSoft p-4"><p className="font-semibold text-ink">{text.loss}</p><p className="mt-2 text-2xl font-semibold text-ink">{resultText(locale, result.lossCapacity.label)}</p><p className="mt-2 text-sm leading-6 text-muted">{result.lossCapacity.note}</p></div>
          <div className="border border-line bg-panelSoft p-4"><p className="font-semibold text-ink">{text.knowledge}</p><p className="mt-2 text-2xl font-semibold text-ink">{resultText(locale, result.knowledge.label)}</p><p className="mt-2 text-sm leading-6 text-muted">{result.knowledge.note}</p></div>
          <div className="border border-line bg-panelSoft p-4"><p className="font-semibold text-ink">{text.route}</p><Link href={routeHref(locale, result.route.href)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xl font-semibold text-ink underline-offset-4 hover:underline">{resultText(locale, result.route.label)}</Link><p className="mt-2 text-sm leading-6 text-muted">{result.route.note}</p><p className="mt-2 text-xs leading-5 text-muted">{text.routeNewTab}</p></div>
        </div>

        <div className="mt-6 border border-line bg-panelSoft p-5">
          <h3 className="font-semibold text-ink">{text.expectation}</h3>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted">
            {result.expectationTensions.map((item) => <li key={item} className="border-l border-brass/60 pl-4">{item}</li>)}
          </ul>
        </div>

        <div className="mt-6 border border-line bg-panelSoft p-5">
          <h3 className="font-semibold text-ink">{text.alerts}</h3>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted">
            {result.alerts.map((alert) => <li key={alert} className="border-l border-line pl-4">{alert}</li>)}
          </ul>
        </div>
      </section>

      <aside className="space-y-5">
        <DiagnosticReportActions locale={locale} />

        <section className="border border-line bg-panel p-6">
          <h3 className="text-xl font-semibold text-ink">{text.scores}</h3>
          <div className="mt-5 grid gap-3">
            {scoreEntries.map(([key, value]) => <ScoreBar key={key} description={scoreDescriptions[key][locale]} label={scoreLabels[key][locale]} value={value} />)}
          </div>
        </section>

        <section className="border border-line bg-panel p-6">
          <h3 className="font-semibold text-ink">{text.flags}</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {result.flags.length ? result.flags.map((flag) => (
              <span key={flag} className="border border-line bg-panelSoft px-2.5 py-1 text-xs font-semibold text-muted">{flagLabels[flag][locale]}</span>
            )) : <span className="text-sm text-muted">{text.noFlags}</span>}
          </div>
        </section>

        <DisclaimerBox>{result.disclaimer}</DisclaimerBox>

        <p className="text-sm leading-6 text-muted">{text.restartNote}</p>
        <button type="button" onClick={restart} className="w-full border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-ink">{text.restart}</button>
      </aside>
    </div>
    <DiagnosticPrintableReport generatedAt={generatedAt} locale={locale} result={result} />
    </>
  );
}

export function DiagnosticFlow({ initialMode, locale = "es" }: { initialMode?: DiagnosticMode; locale?: DiagnosticLocale }) {
  const searchParams = useSearchParams();
  const restartToken = searchParams.get("restart");
  const [mode, setMode] = useState<DiagnosticMode | undefined>(initialMode);
  const [started, setStarted] = useState(Boolean(initialMode));
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<DiagnosticAnswers>({});
  const [completed, setCompleted] = useState(false);
  const questions = useMemo(() => mode ? getQuestionsForMode(mode, answers) : [], [answers, mode]);
  const question = questions[Math.min(index, questions.length - 1)];

  useEffect(() => {
    setMode(initialMode);
    setStarted(Boolean(initialMode));
    setCompleted(false);
    setIndex(0);
    setAnswers({});
  }, [initialMode, restartToken]);

  useEffect(() => {
    if (index >= questions.length) setIndex(Math.max(0, questions.length - 1));
  }, [index, questions.length]);

  function start() {
    if (!mode) return;
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
    setAnswers((current) => {
      if (!target.multi) return { ...current, [target.id]: value };
      const currentValues = Array.isArray(current[target.id]) ? current[target.id] as string[] : [];
      const nextValues = currentValues.includes(value) ? currentValues.filter((item) => item !== value) : [...currentValues, value];
      return { ...current, [target.id]: nextValues };
    });
  }

  function goBack() {
    if (index === 0) {
      setStarted(false);
      return;
    }
    setIndex((current) => current - 1);
  }

  function goNext() {
    if (!question || !isAnswered(answers[question.id])) return;
    if (index >= questions.length - 1) {
      setCompleted(true);
      return;
    }
    setIndex((current) => current + 1);
  }

  if (!started) return <StartScreen locale={locale} mode={mode} setMode={setMode} start={start} />;
  if (!mode) return <StartScreen locale={locale} mode={mode} setMode={setMode} start={start} />;
  if (completed) return <ResultScreen answers={answers} locale={locale} mode={mode} restart={restart} />;
  if (!question) return null;

  return (
    <QuestionScreen
      answer={answers[question.id]}
      answers={answers}
      currentIndex={index}
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
