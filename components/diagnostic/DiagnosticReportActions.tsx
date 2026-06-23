"use client";

import type { DiagnosticLocale } from "@/lib/diagnostic/types";

const copy = {
  es: {
    aria: "Descargar resumen educativo del diagnóstico",
    button: "Descargar resumen educativo",
    note: "Se genera desde esta sesión para que puedas conservar tu resultado. No es una evaluación regulatoria ni una recomendación de inversión.",
    printTip: "Para un PDF más limpio, desactiva “Encabezados y pies de página” y activa “Gráficos de fondo” en el cuadro de impresión.",
    title: "Conservar resultado",
    text: "Puedes descargar un resumen educativo para revisarlo después. El archivo se genera desde esta sesión y no guarda tus respuestas en la web.",
  },
  en: {
    aria: "Download educational diagnostic summary",
    button: "Download educational summary",
    note: "Generated from this session so you can keep your result. It is not a regulatory assessment or an investment recommendation.",
    printTip: "For a cleaner PDF, disable “Headers and footers” and enable “Background graphics” in the print dialog.",
    title: "Keep your result",
    text: "You can download an educational summary to review later. The file is generated from this session and your answers are not stored on the website.",
  },
};

export function DiagnosticReportActions({ locale }: { locale: DiagnosticLocale }) {
  const text = copy[locale];

  function printSummary() {
    if (typeof window === "undefined" || typeof window.print !== "function") return;
    window.print();
  }

  return (
    <section className="border border-line bg-panel p-6">
      <h3 className="font-semibold text-ink">{text.title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted">{text.text}</p>
      <button
        type="button"
        onClick={printSummary}
        aria-label={text.aria}
        className="mt-5 w-full border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-ink"
      >
        {text.button}
      </button>
      <p className="mt-3 text-xs leading-5 text-muted">{text.note}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{text.printTip}</p>
    </section>
  );
}
