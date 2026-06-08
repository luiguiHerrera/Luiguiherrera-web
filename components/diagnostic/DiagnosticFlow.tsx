"use client";

import { useMemo, useState } from "react";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RiskPill } from "@/components/ui/RiskPill";
import { trackEvent } from "@/lib/analytics/trackEvent";
import { DiagnosticAnswers, scoreDiagnostic } from "@/lib/scoring/diagnostic";

const steps = [
  {
    title: "Objetivo",
    questions: [
      { id: "purpose", label: "¿Para qué inviertes?", options: ["Preservar", "Crecer", "Ingresos futuros"] },
      { id: "horizon", label: "¿Cuándo podrías necesitar ese dinero?", options: ["Menos de 1 año", "1 a 5 años", "Más de 10 años"] },
      { id: "priority", label: "¿Qué te importa más?", options: ["Preservar", "Crecer", "Liquidez"] },
    ],
  },
  {
    title: "Experiencia",
    questions: [
      { id: "experience", label: "¿Has invertido antes?", options: ["No", "Sí, poco", "Sí, varios años"] },
      { id: "assets", label: "¿Qué activos entiendes mejor?", options: ["Efectivo y bonos", "Acciones", "Cripto y alternativos"] },
      { id: "crash", label: "¿Has vivido una caída fuerte de mercado?", options: ["No", "Sí, y vendí", "Sí, y mantuve"] },
    ],
  },
  {
    title: "Tolerancia a caídas",
    questions: [
      { id: "drop10", label: "Si tu portafolio cae 10%, ¿qué haces?", options: ["Comprar más", "Mantener", "Vender una parte"] },
      { id: "drop25", label: "Si cae 25%, ¿qué haces?", options: ["Comprar más", "Mantener", "Vender una parte"] },
      { id: "drop40", label: "Si cae 40%, ¿qué haces?", options: ["Comprar más", "Mantener", "Vender todo"] },
    ],
  },
  {
    title: "Capacidad real de pérdida",
    questions: [
      { id: "wealthShare", label: "¿Qué parte de tu patrimonio representa lo invertido?", options: ["Menos de 10%", "10% a 40%", "Más de 40%"] },
      { id: "emergency", label: "¿Tienes fondo de emergencia?", options: ["Sí", "Parcial", "No"] },
      { id: "debt", label: "¿Tienes deudas relevantes?", options: ["No", "Algunas", "Sí"] },
      { id: "dependency", label: "¿Dependes de ese dinero en el corto plazo?", options: ["No", "Parcialmente", "Sí, dependo de él"] },
    ],
  },
  {
    title: "Portafolio actual simplificado",
    allocation: true,
    questions: [],
  },
  {
    title: "Mini stress test educativo",
    questions: [
      { id: "equityStress", label: "Mercado accionario cae fuerte", options: ["Me afecta poco", "Me preocupa", "Me obliga a vender"] },
      { id: "cryptoStress", label: "Cripto cae fuerte", options: ["No tengo exposición", "Lo tolero", "Me golpea mucho"] },
      { id: "ratesStress", label: "Tasas suben", options: ["Lo entiendo", "No lo tengo claro", "Me afecta bastante"] },
      { id: "inflationStress", label: "Inflación alta", options: ["Estoy preparado", "Tengo dudas", "Me afecta mucho"] },
      { id: "dollarStress", label: "Dólar se mueve en contra", options: ["Riesgo bajo", "Riesgo medio", "Riesgo alto"] },
      { id: "recessionStress", label: "Recesión", options: ["Tengo margen", "Depende", "No tengo margen"] },
    ],
  },
];

const allocationFields = [
  ["stocks", "Acciones"],
  ["bonds", "Bonos"],
  ["gold", "Oro"],
  ["crypto", "Cripto"],
  ["cash", "Efectivo"],
  ["realEstate", "Finca raíz"],
  ["other", "Otros"],
];

export function DiagnosticFlow() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<DiagnosticAnswers>({});
  const [completed, setCompleted] = useState(false);
  const current = steps[step];
  const progress = completed ? 100 : (step / steps.length) * 100;
  const result = useMemo(() => scoreDiagnostic(answers), [answers]);

  function updateAnswer(id: string, value: string | number) {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [id]: value }));
  }

  function nextStep() {
    if (step === 0) {
      trackEvent("diagnostic_started");
    }
    trackEvent("diagnostic_step_completed", { step: current.title });
    if (step < steps.length - 1) {
      setStep((currentStep) => currentStep + 1);
      return;
    }
    trackEvent("diagnostic_completed");
    setCompleted(true);
  }

  if (completed) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="rounded-lg border border-line bg-panel p-6">
          <RiskPill label={result.profile} />
          <h2 className="mt-5 text-3xl font-semibold text-white">Resultado educativo</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <RiskPill label={`Riesgo emocional: ${result.emotionalRisk}`} tone={result.emotionalRisk === "Alto" ? "high" : "medium"} />
            <RiskPill label={`Liquidez: ${result.liquidityRisk}`} tone={result.liquidityRisk === "Alto" ? "high" : "medium"} />
            <RiskPill label={`Concentración: ${result.concentrationRisk}`} tone={result.concentrationRisk === "Alto" ? "high" : result.concentrationRisk === "Medio" ? "medium" : "low"} />
          </div>
          <h3 className="mt-8 font-semibold text-white">Vulnerabilidades principales</h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-muted">
            {result.vulnerabilities.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <aside className="space-y-5">
          <div className="rounded-lg border border-line bg-panel p-6">
            <h3 className="font-semibold text-white">Preguntas antes de invertir más</h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
              {result.questions.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <DisclaimerBox>
            Este diagnóstico es educativo y se basa en tus respuestas durante esta sesión. No constituye asesoramiento financiero, recomendación personalizada ni una propuesta de inversión.
          </DisclaimerBox>
        </aside>
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-line bg-panel p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.16em] text-brass">Paso {step + 1} de {steps.length}</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">{current.title}</h2>
        </div>
        <div className="w-full md:w-64"><ProgressBar value={progress} /></div>
      </div>

      {current.allocation ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {allocationFields.map(([id, label]) => (
            <label key={id} className="rounded border border-line bg-panelSoft p-4">
              <span className="text-sm text-muted">{label}</span>
              <input
                min="0"
                max="100"
                type="number"
                value={answers[id] ?? ""}
                onChange={(event) => updateAnswer(id, Math.max(0, Math.min(100, Number(event.target.value))))}
                className="mt-3 w-full rounded border border-line bg-ink px-3 py-2 text-white outline-none focus:border-petrol"
                placeholder="%"
              />
            </label>
          ))}
        </div>
      ) : (
        <div className="mt-8 space-y-7">
          {current.questions.map((question) => (
            <div key={question.id}>
              <p className="font-semibold text-white">{question.label}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {question.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => updateAnswer(question.id, option)}
                    className={`rounded border px-4 py-3 text-sm transition ${answers[question.id] === option ? "border-petrol bg-petrol/20 text-white" : "border-line bg-panelSoft text-muted hover:text-white"}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <button
          onClick={() => setStep((currentStep) => Math.max(0, currentStep - 1))}
          disabled={step === 0}
          className="rounded border border-line px-4 py-2 text-sm text-muted disabled:opacity-40"
        >
          Atrás
        </button>
        <button onClick={nextStep} className="rounded bg-sage px-5 py-2 text-sm font-semibold text-ink">
          {step === steps.length - 1 ? "Ver resultado" : "Continuar"}
        </button>
      </div>
    </section>
  );
}
