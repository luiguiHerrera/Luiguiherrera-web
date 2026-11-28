import { DiagnosticFlow } from "./DiagnosticFlow";
import { DiagnosticReadingGuide } from "./DiagnosticReadingGuide";
import type { DiagnosticLocale } from "@/lib/diagnostic/types";
import styles from "./diagnostic.module.css";

const entry = {
  es: {
    chips: ["Horizonte", "Liquidez", "Tolerancia", "Capacidad"],
    description: "Elige una ruta rápida o completa para cruzar conocimientos, experiencia, tolerancia psicológica y capacidad real de asumir riesgo. Todo se calcula en tu navegador durante esta sesión.",
    eyebrow: "Diagnóstico del inversionista",
    note: "No guardamos respuestas, portafolios ni resultados individuales. Si recargas la página, la sesión se pierde. Esta es una lectura educativa, no asesoramiento financiero.",
    title: "Antes de mirar el mercado, conviene mirar al inversionista.",
  },
  en: {
    chips: ["Horizon", "Liquidity", "Tolerance", "Capacity"],
    description: "Choose a quick or complete path to organize knowledge, experience, psychological tolerance and real risk capacity. The calculation runs in your browser during this session.",
    eyebrow: "Investor diagnostic",
    note: "We do not store answers, portfolios or individual results. Reloading the page resets the session. This is an educational read, not financial advice.",
    title: "Before reading the market, read the investor.",
  },
};

export type DiagnosticSearch = { mode?: string | string[]; restart?: string | string[] };

export function DiagnosticPage({ locale, params }: { locale: DiagnosticLocale; params?: DiagnosticSearch }) {
  const initialMode = params?.mode === "quick" || params?.mode === "complete" ? params.mode : undefined;
  const restart = Array.isArray(params?.restart) ? params.restart[0] : params?.restart;
  const text = entry[locale];
  return (
    <div lang={locale} className={styles.shell}>
      <DiagnosticFlow key={`${initialMode ?? "none"}:${restart ?? ""}`} initialMode={initialMode} locale={locale} entryContent={
        <>
          <header className={styles.hero}>
            <div className={styles.heroImage} aria-hidden="true" style={{ backgroundImage: 'url("/images/diagnostic/panorama.webp")' }} />
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{text.eyebrow}</p>
              <h1>{text.title}</h1>
              <p className={styles.heroDescription}>{text.description}</p>
              <ul className={styles.chips}>{text.chips.map((chip) => <li key={chip}>{chip}</li>)}</ul>
            </div>
          </header>
          <p className={styles.privacy}>{text.note}</p>
          <DiagnosticReadingGuide locale={locale} />
        </>
      } />
    </div>
  );
}
