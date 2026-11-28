import type { DiagnosticLocale } from "@/lib/diagnostic/types";

const copy = {
  es: {
    title: "Sobre este diagnóstico",
    items: [
      { label: "Qué es", value: "Un diagnóstico educativo del inversionista que ordena horizonte, liquidez, experiencia, tolerancia psicológica, comportamiento y capacidad real para asumir riesgo." },
      { label: "Para qué sirve", value: "Sirve para diferenciar deseo de invertir, tolerancia emocional y capacidad financiera antes de tomar decisiones." },
      { label: "Límites", value: "No es una evaluación regulatoria de idoneidad o conveniencia y no guarda respuestas personales." },
      { label: "Siguiente paso", value: "Usar el resultado como punto de conversación y revisar protección, deudas o mercado según el caso." },
    ],
  },
  en: {
    title: "About this diagnostic",
    items: [
      { label: "What it is", value: "An educational investor diagnostic that organizes horizon, liquidity, experience, psychological tolerance, behavior and real capacity to take risk." },
      { label: "What it is for", value: "It helps separate the desire to invest, emotional tolerance and financial capacity before making decisions." },
      { label: "Limits", value: "It is not a regulatory suitability or appropriateness assessment and does not store personal answers." },
      { label: "Next step", value: "Use the result as a conversation starting point and review protection, debt or market context as needed." },
    ],
  },
};

export function DiagnosticReadingGuide({ locale = "es", compact = false }: { locale?: DiagnosticLocale; compact?: boolean }) {
  const text = copy[locale];
  return (
    <details className={compact ? "group mt-4 border-t border-line" : "group mb-8 border-y border-line"} data-diagnostic-guide="">
      <summary className={`cursor-pointer list-none items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-petrol [&::-webkit-details-marker]:hidden ${compact ? "inline-flex min-h-11 gap-2 text-xs font-medium text-muted" : "flex justify-between gap-6 py-5 text-sm font-semibold text-ink"}`}>
        {text.title}
        <span aria-hidden="true" className="text-xl font-normal text-brass transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none">+</span>
      </summary>
      <dl className="grid gap-6 pb-7 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        {text.items.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-brass">{item.label}</dt>
            <dd className="mt-3 text-sm leading-6 text-muted">{item.value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
