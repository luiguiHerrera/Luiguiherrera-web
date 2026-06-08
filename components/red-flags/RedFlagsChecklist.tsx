"use client";

import { useMemo, useState } from "react";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { RiskPill } from "@/components/ui/RiskPill";
import { redFlagQuestions } from "@/lib/mock-data/redFlags";
import { scoreRedFlags } from "@/lib/scoring/redFlags";
import { trackEvent } from "@/lib/analytics/trackEvent";

export function RedFlagsChecklist() {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [reviewed, setReviewed] = useState(false);
  const count = Object.values(checked).filter(Boolean).length;
  const result = useMemo(() => scoreRedFlags(count), [count]);

  function toggle(index: number) {
    setChecked((current) => ({ ...current, [index]: !current[index] }));
    setReviewed(false);
  }

  function complete() {
    trackEvent("red_flags_completed");
    setReviewed(true);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.7fr]">
      <section className="rounded-lg border border-line bg-panel p-6">
        <div className="space-y-3">
          {redFlagQuestions.map((item, index) => (
            <label
              key={item.question}
              className={`flex cursor-pointer gap-4 rounded border p-4 transition ${checked[index] ? "border-brass/60 bg-brass/10" : "border-line bg-panelSoft hover:border-petrol/70"}`}
            >
              <input
                type="checkbox"
                checked={Boolean(checked[index])}
                onChange={() => toggle(index)}
                className="mt-1 h-4 w-4 accent-[#9dbb9b]"
              />
              <span>
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{item.category}</span>
                <span className="mt-1 block leading-6 text-white">{item.question}</span>
                <span className="mt-2 block text-sm leading-6 text-muted">{item.why}</span>
              </span>
            </label>
          ))}
        </div>
        <button onClick={complete} className="mt-6 rounded bg-sage px-5 py-2 text-sm font-semibold text-ink">
          Calcular lectura
        </button>
      </section>
      <aside className="space-y-5">
        <div className="rounded-lg border border-line bg-panel p-6">
          {reviewed ? <RiskPill label={result.label} tone={result.tone} /> : <RiskPill label="Lectura pendiente" />}
          <p className="mt-5 leading-7 text-muted">
            {reviewed ? result.text : "Marca las señales que veas y calcula una lectura prudente. La herramienta no declara que algo sea legal, ilegal, bueno o malo."}
          </p>
          {reviewed ? (
            <div className="mt-5 rounded border border-line bg-panelSoft p-4 text-sm leading-6 text-muted">
              <span className="block font-semibold text-white">Siguiente paso prudente</span>
              {result.nextStep}
            </div>
          ) : null}
          <p className="mt-5 text-sm text-muted">Señales marcadas: {count} de {redFlagQuestions.length}</p>
        </div>
        <DisclaimerBox>
          Esta herramienta no determina si una oportunidad es legal o ilegal. Solo organiza señales de alerta comunes para ayudarte a investigar mejor.
        </DisclaimerBox>
      </aside>
    </div>
  );
}
