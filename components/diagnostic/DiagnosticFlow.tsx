"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RiskPill } from "@/components/ui/RiskPill";
import { getQuestionsForMode } from "@/lib/diagnostic/questions";
import { scoreDiagnostic } from "@/lib/diagnostic/scoring";
import type { DiagnosticAnswers, DiagnosticFlag, DiagnosticLocale, DiagnosticMode, DiagnosticQuestion, DiagnosticScoreKey } from "@/lib/diagnostic/types";

const copy = {
  es: {
    back: "Atrás",
    chooseDepth: "Elige profundidad",
    continue: "Continuar",
    depthTitle: "Diagnóstico premium retail abierto",
    fullDescription: "Lectura más profunda de experiencia, conducta, liquidez, concentración y comprensión de productos.",
    fullDuration: "15-20 minutos",
    fullQuestions: "45-55 base + adaptativas",
    fullTitle: "Diagnóstico completo",
    progress: "Progreso",
    question: "Pregunta",
    questionOf: "de",
    quickDescription: "25 preguntas base más 6-12 adaptativas según productos marcados.",
    quickDuration: "7-10 minutos",
    quickQuestions: "25 + adaptativas",
    quickTitle: "Diagnóstico rápido premium",
    restart: "Empezar de nuevo",
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
    complexity: "Complejidad razonable",
    alerts: "Alertas principales",
    route: "Ruta sugerida dentro de la web",
    scores: "Mapa interno",
    flags: "Flags detectados",
    noFlags: "Sin flags dominantes",
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
    quickDescription: "25 base questions plus 6-12 adaptive questions depending on selected products.",
    quickDuration: "7-10 minutes",
    quickQuestions: "25 + adaptive",
    quickTitle: "Premium quick diagnostic",
    restart: "Start again",
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
    complexity: "Reasonable complexity",
    alerts: "Main alerts",
    route: "Suggested path inside the website",
    scores: "Internal map",
    flags: "Detected flags",
    noFlags: "No dominant flags",
  },
};

const scoreLabels: Record<DiagnosticScoreKey, { es: string; en: string }> = {
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

const flagLabels: Record<DiagnosticFlag, { es: string; en: string }> = {
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
  "Preservación": "Preservation",
  "Equilibrio prudente": "Prudent balance",
  "Crecimiento moderado": "Moderate growth",
  "Crecimiento dinámico": "Dynamic growth",
  "Riesgo especulativo": "Speculative risk",
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
  if (questionId === "loss_life_effect") return fall20[locale];
  if (questionId === "pressure_drop") return fall18[locale];
  if (questionId === "fast_gain") return gain45[locale];
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
  };

  return text.replace(/\{(amount|amountMinus18|amountMinus20|amountPlus45)\}/g, (_, key: keyof typeof values) => values[key]);
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

function resultText(locale: DiagnosticLocale, value: string) {
  return locale === "en" ? translateResult[value] ?? value : value;
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

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-line bg-panelSoft p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
        <p className="text-sm font-semibold text-ink">{value}</p>
      </div>
      <div className="mt-3 h-1.5 bg-panel"><div className="h-1.5 bg-[#6f8f7b]" style={{ width: `${value}%` }} /></div>
    </div>
  );
}

function ResultScreen({ answers, locale, mode, restart }: { answers: DiagnosticAnswers; locale: DiagnosticLocale; mode: DiagnosticMode; restart: () => void }) {
  const result = useMemo(() => scoreDiagnostic(answers, mode, locale), [answers, locale, mode]);
  const text = copy[locale];
  const scoreEntries = Object.entries(result.scores) as Array<[DiagnosticScoreKey, number]>;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="border border-line bg-panel p-5 md:p-7">
        <div className="flex flex-col gap-5 border-b border-line pb-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">{text.result}</p>
            <h2 className="mt-3 text-2xl font-semibold leading-tight text-ink md:text-3xl">{resultText(locale, result.profile)}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">{result.summary}</p>
          </div>
          <RiskPill label={resultText(locale, result.pressureProfile)} tone={result.pressureProfile === "Preservación" || result.pressureProfile === "Equilibrio prudente" ? "medium" : "low"} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="border border-line bg-panelSoft p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted">{text.declared}</p><p className="mt-2 text-xl font-semibold text-ink">{resultText(locale, result.declaredProfile)}</p></div>
          <div className="border border-line bg-panelSoft p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted">{text.pressure}</p><p className="mt-2 text-xl font-semibold text-ink">{resultText(locale, result.pressureProfile)}</p></div>
          <div className="border border-line bg-panelSoft p-4"><p className="text-xs uppercase tracking-[0.14em] text-muted">{text.complexity}</p><p className="mt-2 text-xl font-semibold text-ink">{resultText(locale, result.complexity.band)}</p></div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="border border-line bg-panelSoft p-4"><p className="font-semibold text-ink">{text.loss}</p><p className="mt-2 text-2xl font-semibold text-ink">{resultText(locale, result.lossCapacity.label)}</p><p className="mt-2 text-sm leading-6 text-muted">{result.lossCapacity.note}</p></div>
          <div className="border border-line bg-panelSoft p-4"><p className="font-semibold text-ink">{text.knowledge}</p><p className="mt-2 text-2xl font-semibold text-ink">{resultText(locale, result.knowledge.label)}</p><p className="mt-2 text-sm leading-6 text-muted">{result.knowledge.note}</p></div>
          <div className="border border-line bg-panelSoft p-4"><p className="font-semibold text-ink">{text.route}</p><Link href={routeHref(locale, result.route.href)} className="mt-2 inline-block text-xl font-semibold text-ink underline-offset-4 hover:underline">{resultText(locale, result.route.label)}</Link><p className="mt-2 text-sm leading-6 text-muted">{result.route.note}</p></div>
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
        <section className="border border-line bg-panel p-6">
          <h3 className="text-xl font-semibold text-ink">{text.scores}</h3>
          <div className="mt-5 grid gap-3">
            {scoreEntries.map(([key, value]) => <ScoreBar key={key} label={scoreLabels[key][locale]} value={value} />)}
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

        <button type="button" onClick={restart} className="w-full border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-ink">{text.restart}</button>
      </aside>
    </div>
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
