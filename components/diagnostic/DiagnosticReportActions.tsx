"use client";

import type { DiagnosticLocale, DiagnosticResult } from "@/lib/diagnostic/types";
import { diagnosticSummaryText } from "@/lib/diagnostic/summary";

const copy = {
  es: {
    aria: "Imprimir o guardar el resumen educativo como PDF",
    button: "Imprimir / guardar PDF",
    note: "Se genera desde esta sesión para que puedas conservar tu resultado. No es una evaluación regulatoria ni una recomendación de inversión.",
    printTip: "Para un PDF más limpio, desactiva “Encabezados y pies de página” y activa “Gráficos de fondo” en el cuadro de impresión.",
    title: "Conservar resultado",
    text: "Abre el cuadro de impresión del navegador. Desde allí puedes imprimir o elegir Guardar como PDF. El resumen se genera en esta sesión, sin enviar respuestas.",
  },
  en: {
    aria: "Print or save the educational summary as PDF",
    button: "Print / save PDF",
    note: "Generated from this session so you can keep your result. It is not a regulatory assessment or an investment recommendation.",
    printTip: "For a cleaner PDF, disable “Headers and footers” and enable “Background graphics” in the print dialog.",
    title: "Keep your result",
    text: "Open the browser print dialog. From there you can print or choose Save as PDF. The summary is generated in this session without sending answers.",
  },
};

export function DiagnosticReportActions({ locale, result }: { locale: DiagnosticLocale; result: DiagnosticResult }) {
  const text = copy[locale];

  function printSummary() {
    if (typeof window === "undefined" || typeof window.print !== "function") return;
    window.print();
  }

  function downloadSummary() {
    const blob = new Blob([diagnosticSummaryText(result, locale)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = (locale === "es" ? "resumen-diagnostico-" : "diagnostic-summary-") + result.mode + ".txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
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
      <button type="button" onClick={downloadSummary} className="mt-3 w-full border border-line bg-panel px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-ink">
        {locale === "es" ? "Descargar resumen (.txt)" : "Download summary (.txt)"}
      </button>
      <p className="mt-3 text-xs leading-5 text-muted">{text.note}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{text.printTip}</p>
    </section>
  );
}
