import Link from "next/link";
import { notFound } from "next/navigation";
import { DiagnosticFlow } from "./DiagnosticFlow";
import { patchAnswers } from "@/lib/diagnostic/scoring.fixtures";
import { validateDiagnosticAnswers } from "@/lib/diagnostic/answers";
import type { DiagnosticAnswers, DiagnosticLocale, DiagnosticMode } from "@/lib/diagnostic/types";
import styles from "./diagnostic.module.css";

const samples: Array<{ id: string; mode: DiagnosticMode; label: Record<DiagnosticLocale, string>; patch: DiagnosticAnswers }> = [
  { id: "initial", mode: "quick", label: { es: "Rápido · Primeros pasos", en: "Quick · Getting started" },
    patch: { products_known: ["none"], years_real: "lt1", real_drawdown: "no", declared_drop: "10" } },
  { id: "solid", mode: "complete", label: { es: "Completo · Base sólida", en: "Full · Strong financial base" }, patch: {} },
  { id: "constraints", mode: "complete", label: { es: "Completo · Restricciones y adaptativas", en: "Full · Restrictions and adaptive questions" },
    patch: { income_stability: "uncertain", surplus_cash_flow: "tight_or_deficit", expensive_debt: "pending_priority", emergency_months: "none", cash_need_12m: "certain", loss_life_effect: "serious",
      products_known: ["indexFunds", "individualStocks", "bonds", "crypto", "options", "leverage"], options_check: "guaranteed", leverage_check: "interest_only" } },
];

export function DiagnosticReviewPage({ locale, profile }: { locale: DiagnosticLocale; profile?: string | string[] }) {
  if (process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development") notFound();
  const title = locale === "es" ? "Perfiles ficticios de revisión" : "Fictional review profiles";
  const diagnostic = locale === "es" ? "/diagnostico" : "/en/diagnostic";
  const path = diagnostic + (locale === "es" ? "/revision" : "/review");
  const sample = samples.find((item) => item.id === profile) ?? samples[0];
  const answers = validateDiagnosticAnswers(patchAnswers(sample.mode, sample.patch), sample.mode);
  if (!answers.valid) throw new Error("Invalid diagnostic review sample: " + answers.issues.join(", "));

  return (
    <div className={styles.shell} lang={locale}>
      <section className={`no-print ${styles.reviewPanel}`} aria-labelledby="diagnostic-review">
        <h2 id="diagnostic-review" className={styles.sectionTitle}>{title}</h2>
        <p>{locale === "es" ? "Datos ficticios para revisar el diseño. Disponible solo en la vista previa." : "Fictional data for design review. Available only in preview."}</p>
        <div>{samples.map((item) => <Link key={item.id} href={path + "?profile=" + item.id} aria-current={item.id === sample.id ? "page" : undefined}>{item.label[locale]}</Link>)}</div>
        <Link href={diagnostic}>{locale === "es" ? "Abrir el cuestionario" : "Open the questionnaire"}</Link>
      </section>
      <DiagnosticFlow key={sample.id} locale={locale} reviewSample={{ mode: sample.mode, answers: answers.answers }} />
    </div>
  );
}
