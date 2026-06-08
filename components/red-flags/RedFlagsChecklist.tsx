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
    <div className="grid gap-6 lg:grid-cols-[1fr_0.68fr]">
      <section className="rounded-lg border border-line bg-panel p-5 shadow-quiet md:p-6">
        <div className="grid gap-3">
          {redFlagQuestions.map((item, index) => (
            <label
              key={item.question}
              className={`flex cursor-pointer gap-4 rounded-lg border p-4 transition ${checked[index] ? "border-brass/70 bg-brass/10 shadow-[inset_3px_0_0_rgba(199,163,90,0.8)]" : "border-line bg-panelSoft hover:border-petrol/70"}`}
            >
              <input
                type="checkbox"
                checked={Boolean(checked[index])}
                onChange={() => toggle(index)}
                className="mt-1 h-5 w-5 shrink-0 accent-[#9dbb9b]"
              />
              <span>
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-brass">{item.category}</span>
                <span className="mt-1 block leading-6 text-white">{item.question}</span>
                <span className="mt-2 block text-sm leading-6 text-muted">{item.why}</span>
              </span>
            </label>
          ))}
        </div>
        <button onClick={complete} className="mt-6 w-full rounded bg-sage px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white sm:w-auto">
          Calcular lectura
        </button>
      </section>
      <aside className="space-y-5">
        <div className="rounded-lg border border-line bg-panel p-6 shadow-quiet lg:sticky lg:top-28">
          <div className="flex items-center justify-between gap-3 border-b border-line pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">Resultado</p>
              <p className="mt-2 text-3xl font-semibold text-white">{count}/{redFlagQuestions.length}</p>
            </div>
            {reviewed ? <RiskPill label={result.label} tone={result.tone} /> : <RiskPill label="Lectura pendiente" />}
          </div>
          <p className="mt-5 leading-7 text-muted">
            {reviewed ? result.text : "Marca las señales que veas y calcula una lectura prudente. La herramienta no declara que algo sea legal, ilegal, adecuado o inadecuado."}
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
          Esta herramienta no determina si una propuesta es legal o ilegal. Solo organiza señales de alerta comunes para ayudarte a investigar mejor.
        </DisclaimerBox>
      </aside>
    </div>
  );
}
