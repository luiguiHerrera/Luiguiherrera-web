"use client";

import { useMemo, useState } from "react";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { RiskPill } from "@/components/ui/RiskPill";
import { redFlagQuestions } from "@/lib/mock-data/redFlags";
import { scoreRedFlags } from "@/lib/scoring/redFlags";
import { trackEvent } from "@/lib/analytics/trackEvent";

type RedFlagDimension = "entity" | "product" | "conduct" | "documentation";

const dimensionLabels: Record<RedFlagDimension, string> = {
  entity: "Riesgo de entidad",
  product: "Riesgo de producto",
  conduct: "Conducta comercial",
  documentation: "Documentación",
};

const dimensionCopy: Record<RedFlagDimension, string> = {
  entity: "Autorización, registro, recuperación de fondos y señales de entidad.",
  product: "Comprensión, costes, liquidez y escenarios de pérdida.",
  conduct: "Presión, promesas, captación inesperada y urgencia comercial.",
  documentation: "Información escrita, perfil del inversor y trazabilidad.",
};

function dimensionTone(count: number): "low" | "medium" | "high" {
  if (count >= 2) return "high";
  if (count === 1) return "medium";
  return "low";
}

function dimensionLabel(count: number) {
  if (count >= 2) return "Alto";
  if (count === 1) return "Medio";
  return "Bajo";
}

export function RedFlagsChecklist() {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [reviewed, setReviewed] = useState(false);
  const count = Object.values(checked).filter(Boolean).length;
  const result = useMemo(() => scoreRedFlags(count), [count]);
  const dimensionCounts = useMemo(() => {
    const initial: Record<RedFlagDimension, number> = {
      conduct: 0,
      documentation: 0,
      entity: 0,
      product: 0,
    };

    redFlagQuestions.forEach((item, index) => {
      if (checked[index]) {
        initial[item.dimension as RedFlagDimension] += 1;
      }
    });

    return initial;
  }, [checked]);

  function toggle(index: number) {
    setChecked((current) => ({ ...current, [index]: !current[index] }));
    setReviewed(false);
  }

  function complete() {
    trackEvent("red_flags_completed");
    setReviewed(true);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.56fr] lg:items-start">
      <section className="border border-line bg-panel p-4 md:p-5">
        <div className="grid gap-2 sm:grid-cols-2">
          {redFlagQuestions.map((item, index) => (
            <label
              key={item.question}
              className={`flex cursor-pointer gap-3 border p-3 transition ${
                checked[index] ? "border-brass/70 bg-brass/10 shadow-[inset_3px_0_0_rgba(133,116,91,0.65)]" : "border-line bg-panelSoft hover:border-petrol/70"
              }`}
            >
              <input
                type="checkbox"
                checked={Boolean(checked[index])}
                onChange={() => toggle(index)}
                className="mt-1 h-5 w-5 shrink-0 accent-[#9dbb9b]"
              />
              <span>
                <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-brass">{item.category}</span>
                <span className="mt-1 block text-sm font-semibold leading-6 text-ink">{item.question}</span>
                <span className="mt-1 block text-xs leading-5 text-muted">{item.why}</span>
              </span>
            </label>
          ))}
        </div>
        <button onClick={complete} className="mt-5 w-full border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-ink sm:w-auto">
          Calcular nivel de alerta
        </button>
      </section>

      <aside className="space-y-4">
        <div className="border border-line bg-panel p-5 lg:sticky lg:top-28">
          <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">Resultado educativo</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{count}/{redFlagQuestions.length}</p>
            </div>
            {reviewed ? <RiskPill label={result.label} tone={result.tone} /> : <RiskPill label="Lectura pendiente" />}
          </div>

          <p className="mt-4 text-sm leading-6 text-muted">
            {reviewed ? result.text : "Marca las señales que veas y calcula una lectura prudente. Esta herramienta no determina si una propuesta es legal, ilegal, adecuada o inadecuada."}
          </p>

          <div className="mt-4 grid gap-2">
            {(Object.keys(dimensionLabels) as RedFlagDimension[]).map((dimension) => {
              const dimensionCount = dimensionCounts[dimension];
              return (
                <div key={dimension} className="border border-line bg-panelSoft p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{dimensionLabels[dimension]}</p>
                      <p className="mt-1 text-xs leading-5 text-muted">{dimensionCopy[dimension]}</p>
                    </div>
                    <RiskPill label={dimensionLabel(dimensionCount)} tone={dimensionTone(dimensionCount)} />
                  </div>
                </div>
              );
            })}
          </div>

          {reviewed ? (
            <div className="mt-4 border border-line bg-panelSoft p-3 text-sm leading-6 text-muted">
              <span className="block font-semibold text-ink">Siguiente paso prudente</span>
              {result.nextStep}
            </div>
          ) : null}
        </div>

        <DisclaimerBox>
          No sustituye verificación oficial en CNMV ni asesoría legal o financiera. Organiza señales de alerta para orientar una primera revisión.
        </DisclaimerBox>
      </aside>
    </div>
  );
}
