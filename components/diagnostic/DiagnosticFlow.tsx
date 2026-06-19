"use client";

import { useEffect, useMemo, useState } from "react";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RiskPill } from "@/components/ui/RiskPill";
import { getQuestionsForMode } from "@/lib/diagnostic/questions";
import { scoreDiagnostic } from "@/lib/diagnostic/scoring";
import type { DiagnosticAnswers, DiagnosticDimension, DiagnosticMode, DiagnosticQuestion, ProductConvenience } from "@/lib/diagnostic/types";

const dimensionLabels: Record<DiagnosticDimension, string> = {
  knowledgeScore: "Conocimiento",
  experienceScore: "Experiencia",
  psychologicalToleranceScore: "Tolerancia psicológica",
  riskCapacityScore: "Capacidad de riesgo",
  liquidityPressureScore: "Presión de liquidez",
  timeHorizonScore: "Horizonte temporal",
  behavioralRiskScore: "Riesgo conductual",
  consistencyScore: "Consistencia",
};

const dimensionHelp: Partial<Record<DiagnosticDimension, string>> = {
  liquidityPressureScore: "Más alto implica más presión de liquidez.",
  behavioralRiskScore: "Más alto implica más riesgo de decisiones impulsivas.",
};

const productTone: Record<ProductConvenience, "low" | "medium" | "high" | "neutral"> = {
  "Adecuado para aprender": "low",
  "Requiere más formación": "medium",
  "No conveniente según respuestas": "high",
  "Evitar hasta comprender riesgos": "high",
};

type DiagnosticLocale = "es" | "en";

const flowCopy = {
  es: {
    areasTraining: "Áreas que requieren más formación",
    back: "Atrás",
    chooseDepth: "Elige profundidad",
    confidence: "Confianza",
    continue: "Continuar",
    currentCapacity: "Capacidad actual",
    depthTitle: "Un diagnóstico, dos niveles de detalle",
    educationAlerts: "Alertas educativas",
    educationalConvenience: "Conveniencia educativa por productos",
    educationalResult: "Resultado educativo",
    fullDescription: "Lectura granular por bloques: capacidad, objetivos, conducta, conocimiento, experiencia y consistencia.",
    fullDuration: "18-25 minutos",
    fullQuestions: "50 preguntas",
    fullTitle: "Diagnóstico completo",
    knowledge: "Conocimiento",
    mode: "Modo",
    modeComplete: "Completo",
    modeQuick: "Rápido",
    progress: "Progreso",
    question: "Pregunta",
    questionOf: "de",
    quickDescription: "Lectura inicial para ubicar horizonte, liquidez, tolerancia, conocimiento básico y sesgos principales.",
    quickDuration: "8-10 minutos",
    quickQuestions: "20 preguntas",
    quickTitle: "Diagnóstico rápido",
    restart: "Empezar de nuevo",
    seeResult: "Ver resultado",
    start: "Empezar",
    startDescription: "Este diagnóstico educativo cruza conocimientos, experiencia, tolerancia psicológica y capacidad real de asumir riesgo. No sustituye una evaluación formal de idoneidad ni constituye asesoría personalizada.",
    storageNote: "No se guardan respuestas. No se envían a servidores externos. Si recargas la página, la sesión se pierde.",
  },
  en: {
    areasTraining: "Areas that need more training",
    back: "Back",
    chooseDepth: "Choose depth",
    confidence: "Confidence",
    continue: "Continue",
    currentCapacity: "Current capacity",
    depthTitle: "One diagnostic, two levels of detail",
    educationAlerts: "Educational alerts",
    educationalConvenience: "Educational product convenience",
    educationalResult: "Educational result",
    fullDescription: "Granular block-by-block read: capacity, goals, behavior, knowledge, experience and consistency.",
    fullDuration: "18-25 minutes",
    fullQuestions: "50 questions",
    fullTitle: "Full diagnostic",
    knowledge: "Knowledge",
    mode: "Mode",
    modeComplete: "Full",
    modeQuick: "Quick",
    progress: "Progress",
    question: "Question",
    questionOf: "of",
    quickDescription: "Initial read to place horizon, liquidity, tolerance, basic knowledge and main biases.",
    quickDuration: "8-10 minutes",
    quickQuestions: "20 questions",
    quickTitle: "Quick diagnostic",
    restart: "Start again",
    seeResult: "View result",
    start: "Start",
    startDescription: "This educational diagnostic connects knowledge, experience, psychological tolerance and real risk capacity. It does not replace a formal suitability assessment or personalized advice.",
    storageNote: "Answers are not stored or sent to external servers. Reloading the page resets the session.",
  },
};

function ModeCard({
  active,
  description,
  duration,
  onClick,
  questions,
  title,
}: {
  active: boolean;
  description: string;
  duration: string;
  onClick: () => void;
  questions: string;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border p-5 text-left transition md:p-6 ${active ? "border-petrol bg-[#eef3f2]" : "border-line bg-panel hover:border-ink"}`}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">{duration}</span>
      <h3 className="mt-4 text-xl font-semibold text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
      <p className="mt-5 border-t border-line pt-4 text-sm font-semibold text-ink">{questions}</p>
    </button>
  );
}

function StartScreen({ locale, mode, setMode, start }: { locale: DiagnosticLocale; mode: DiagnosticMode; setMode: (mode: DiagnosticMode) => void; start: () => void }) {
  const copy = flowCopy[locale];

  return (
    <section className="border border-line bg-panel p-5 md:p-7">
      <div className="grid gap-8 lg:grid-cols-[0.74fr_1.26fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">{copy.chooseDepth}</p>
          <h2 className="mt-3 text-2xl font-semibold leading-tight text-ink md:text-3xl">{copy.depthTitle}</h2>
          <p className="mt-4 text-sm leading-7 text-muted">
            {copy.startDescription}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ModeCard
            active={mode === "quick"}
            description={copy.quickDescription}
            duration={copy.quickDuration}
            onClick={() => setMode("quick")}
            questions={copy.quickQuestions}
            title={copy.quickTitle}
          />
          <ModeCard
            active={mode === "complete"}
            description={copy.fullDescription}
            duration={copy.fullDuration}
            onClick={() => setMode("complete")}
            questions={copy.fullQuestions}
            title={copy.fullTitle}
          />
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
        <p className="max-w-2xl text-sm leading-6 text-muted">
          {copy.storageNote}
        </p>
        <button type="button" onClick={start} className="w-fit border border-ink bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-ink">
          {copy.start}
        </button>
      </div>
    </section>
  );
}

function QuestionScreen({
  answer,
  currentIndex,
  locale,
  mode,
  onAnswer,
  onBack,
  onNext,
  question,
  total,
}: {
  answer: string | undefined;
  currentIndex: number;
  locale: DiagnosticLocale;
  mode: DiagnosticMode;
  onAnswer: (value: string) => void;
  onBack: () => void;
  onNext: () => void;
  question: DiagnosticQuestion;
  total: number;
}) {
  const progress = ((currentIndex + (answer ? 1 : 0)) / total) * 100;
  const copy = flowCopy[locale];

  return (
    <section className="border border-line bg-panel p-5 md:p-8">
      <div className="grid gap-6 lg:grid-cols-[0.72fr_0.28fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass">{mode === "quick" ? copy.quickTitle : copy.fullTitle}</p>
          <p className="mt-4 text-sm font-semibold text-muted">{copy.question} {currentIndex + 1} {copy.questionOf} {total} · {question.block}</p>
        </div>
        <div>
          <div className="mb-2 flex justify-between text-xs text-muted">
            <span>{copy.progress}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>
      </div>

      <div className="mt-8 max-w-4xl">
        <h2 className="text-2xl font-semibold leading-tight text-ink md:text-4xl">{question.prompt}</h2>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted">{question.helper}</p>
      </div>

      <div className="mt-8 grid gap-3">
        {question.options.map((option, index) => (
          <button
            key={option.label}
            type="button"
            onClick={() => onAnswer(option.label)}
            className={`group grid gap-2 border px-5 py-4 text-left transition md:grid-cols-[2.25rem_1fr] md:items-start ${answer === option.label ? "border-petrol bg-[#eef3f2] text-ink" : "border-line bg-panelSoft text-muted hover:border-ink hover:text-ink"}`}
          >
            <span className={`flex h-8 w-8 items-center justify-center border text-sm font-semibold ${answer === option.label ? "border-petrol text-petrol" : "border-line text-muted group-hover:border-ink group-hover:text-ink"}`}>
              {index + 1}
            </span>
            <span>
              <span className="block font-semibold leading-6">{option.label}</span>
              {option.detail ? <span className="mt-1 block text-sm leading-6 text-muted">{option.detail}</span> : null}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-col-reverse justify-between gap-3 sm:flex-row">
        <button type="button" onClick={onBack} className="border border-line bg-panel px-4 py-2.5 text-sm font-medium text-muted transition hover:border-ink hover:text-ink">
          {copy.back}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!answer}
          className="border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-ink disabled:cursor-not-allowed disabled:opacity-35"
        >
          {currentIndex === total - 1 ? copy.seeResult : copy.continue}
        </button>
      </div>
    </section>
  );
}

function DimensionBar({ label, value, helper }: { label: string; value: number; helper?: string }) {
  return (
    <div className="border border-line bg-panelSoft p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-ink">{label}</p>
          {helper ? <p className="mt-1 text-xs leading-5 text-muted">{helper}</p> : null}
        </div>
        <p className="text-sm font-semibold text-ink">{value}/100</p>
      </div>
      <div className="mt-3 h-2 border border-line bg-panel">
        <div className="h-full bg-[#6f8f7b]" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ResultScreen({ answers, locale, mode, restart }: { answers: DiagnosticAnswers; locale: DiagnosticLocale; mode: DiagnosticMode; restart: () => void }) {
  const result = useMemo(() => scoreDiagnostic(answers, mode), [answers, mode]);
  const productsNeedingTraining = result.productConvenience.filter((row) => row.status !== "Adecuado para aprender");
  const copy = flowCopy[locale];

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="border border-line bg-panel p-5 md:p-7">
        <div className="flex flex-col gap-5 border-b border-line pb-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brass">{copy.educationalResult}</p>
            <h2 className="mt-3 text-2xl font-semibold leading-tight text-ink md:text-3xl">{result.profile}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">{result.summary}</p>
          </div>
          <RiskPill label={`${copy.confidence} ${result.confidenceLabel}`} tone={result.confidenceLabel === "Alta" ? "low" : result.confidenceLabel === "Media" ? "medium" : "high"} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="border border-line bg-panelSoft p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{copy.currentCapacity}</p>
            <p className="mt-2 text-xl font-semibold text-ink">{result.capacityLabel}</p>
          </div>
          <div className="border border-line bg-panelSoft p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{copy.knowledge}</p>
            <p className="mt-2 text-xl font-semibold text-ink">{result.knowledgeLabel}</p>
          </div>
          <div className="border border-line bg-panelSoft p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{copy.mode}</p>
            <p className="mt-2 text-xl font-semibold text-ink">{mode === "quick" ? copy.modeQuick : copy.modeComplete}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {(Object.entries(result.dimensions) as Array<[DiagnosticDimension, number]>).map(([dimension, value]) => (
            <DimensionBar key={dimension} label={dimensionLabels[dimension]} value={value} helper={dimensionHelp[dimension]} />
          ))}
        </div>

        <div className="mt-6 border border-line bg-panelSoft p-5">
          <h3 className="font-semibold text-ink">{copy.educationAlerts}</h3>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted">
            {result.alerts.map((alert) => <li key={alert} className="border-l border-brass/60 pl-4">{alert}</li>)}
          </ul>
        </div>
      </section>

      <aside className="space-y-5">
        <section className="border border-line bg-panel p-6">
          <h3 className="text-xl font-semibold text-ink">{copy.educationalConvenience}</h3>
          <div className="mt-5 grid gap-3">
            {result.productConvenience.map((row) => (
              <div key={row.product} className="border border-line bg-panelSoft p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <p className="font-semibold text-ink">{row.product}</p>
                  <RiskPill label={row.status} tone={productTone[row.status]} />
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">{row.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-line bg-panel p-6">
          <h3 className="font-semibold text-ink">{copy.areasTraining}</h3>
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted">
            {productsNeedingTraining.slice(0, 5).map((row) => <li key={row.product} className="border-l border-line pl-4">{row.product}: {row.status}</li>)}
          </ul>
          <p className="mt-5 border-t border-line pt-4 text-sm leading-6 text-muted">{result.explanation}</p>
        </section>

        <DisclaimerBox>{result.disclaimer}</DisclaimerBox>

        <button type="button" onClick={restart} className="w-full border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-ink">
          {copy.restart}
        </button>
      </aside>
    </div>
  );
}

export function DiagnosticFlow({ initialMode = "quick", locale = "es" }: { initialMode?: DiagnosticMode; locale?: DiagnosticLocale }) {
  const [mode, setMode] = useState<DiagnosticMode>(initialMode);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<DiagnosticAnswers>({});
  const [completed, setCompleted] = useState(false);
  const questions = useMemo(() => getQuestionsForMode(mode), [mode]);
  const question = questions[index];

  useEffect(() => {
    if (!started) setMode(initialMode);
  }, [initialMode, started]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!started || completed || !question) return;
      const optionIndex = Number(event.key) - 1;
      if (optionIndex >= 0 && optionIndex < question.options.length) {
        setAnswers((current) => ({ ...current, [question.id]: question.options[optionIndex].label }));
      }
      if (event.key === "Enter" && answers[question.id]) {
        event.preventDefault();
        goNext();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [answers, completed, question, started]);

  function start() {
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

  function updateAnswer(value: string) {
    setAnswers((current) => ({ ...current, [question.id]: value }));
  }

  function goBack() {
    if (index === 0) {
      setStarted(false);
      return;
    }
    setIndex((current) => current - 1);
  }

  function goNext() {
    if (!answers[question.id]) return;
    if (index >= questions.length - 1) {
      setCompleted(true);
      return;
    }
    setIndex((current) => current + 1);
  }

  if (!started) {
    return <StartScreen locale={locale} mode={mode} setMode={setMode} start={start} />;
  }

  if (completed) {
    return <ResultScreen answers={answers} locale={locale} mode={mode} restart={restart} />;
  }

  return (
    <QuestionScreen
      answer={answers[question.id]}
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
