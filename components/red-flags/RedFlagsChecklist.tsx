"use client";

import { useMemo, useState } from "react";
import { DisclaimerBox } from "@/components/ui/DisclaimerBox";
import { RiskPill } from "@/components/ui/RiskPill";
import { redFlagQuestions } from "@/lib/mock-data/redFlags";
import { scoreRedFlags } from "@/lib/scoring/redFlags";
import { trackEvent } from "@/lib/analytics/trackEvent";

export function RedFlagsChecklist() {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const count = Object.values(checked).filter(Boolean).length;
  const result = useMemo(() => scoreRedFlags(count), [count]);

  function toggle(index: number) {
    setChecked((current) => ({ ...current, [index]: !current[index] }));
  }

  function complete() {
    trackEvent("red_flags_completed", { checked_count: count });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.7fr]">
      <section className="rounded-lg border border-line bg-panel p-6">
        <div className="space-y-3">
          {redFlagQuestions.map((question, index) => (
            <label key={question} className="flex cursor-pointer gap-4 rounded border border-line bg-panelSoft p-4">
              <input
                type="checkbox"
                checked={Boolean(checked[index])}
                onChange={() => toggle(index)}
                className="mt-1 h-4 w-4 accent-[#9dbb9b]"
              />
              <span className="leading-6 text-white">{question}</span>
            </label>
          ))}
        </div>
        <button onClick={complete} className="mt-6 rounded bg-sage px-5 py-2 text-sm font-semibold text-ink">
          Calcular lectura
        </button>
      </section>
      <aside className="space-y-5">
        <div className="rounded-lg border border-line bg-panel p-6">
          <RiskPill label={result.label} tone={result.tone} />
          <p className="mt-5 leading-7 text-muted">{result.text}</p>
          <p className="mt-5 text-sm text-muted">Señales marcadas: {count} de {redFlagQuestions.length}</p>
        </div>
        <DisclaimerBox>
          Esta herramienta no determina si una oportunidad es legal o ilegal. Solo organiza señales de alerta comunes para ayudarte a investigar mejor.
        </DisclaimerBox>
      </aside>
    </div>
  );
}
