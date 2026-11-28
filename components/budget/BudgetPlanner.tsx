import Link from "next/link";
import { BudgetEducationalFramework } from "@/components/budget/BudgetEducationalFramework";
import { BudgetFaq } from "@/components/budget/BudgetFaq";
import { BudgetWizard } from "@/components/budget/BudgetWizard";
import { budgetCopy } from "@/components/budget/budget-copy";
import styles from "./BudgetEditorial.module.css";
import type { BudgetLocale } from "@/lib/personal-finance/budget/types";

export function BudgetPlanner({ locale }: { locale: BudgetLocale }) {
  const labels = budgetCopy[locale];
  const es = locale === "es";
  const readingItems = !es ? [
        { label: "What it is", value: "An educational budget simulator to organize income, spending, saving, investing, financial protection and non-monthly expenses." },
        { label: "What it is for", value: "It helps check whether money has a clear structure before taking debt, investing or adding risk." },
        { label: "Limits", value: "It does not store personal data, know your full life context or define a universal budget rule." },
        { label: "Next step", value: "Review debt and margin of safety before moving to the investor diagnostic." },
      ] : [
        { label: "Qué es", value: "Un simulador educativo para ordenar ingresos, gastos, ahorro, inversión, protección financiera y gastos no mensuales." },
        { label: "Para qué sirve", value: "Sirve para ver si el dinero tiene una estructura clara antes de asumir deuda, invertir o tomar más riesgo." },
        { label: "Límites", value: "No guarda datos personales, no conoce tu vida completa y no define una regla universal de presupuesto." },
        { label: "Siguiente paso", value: "Revisar deudas y margen de seguridad antes de pasar al diagnóstico del inversionista." },
      ];

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.panorama} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{es ? "Herramienta educativa" : "Educational tool"}</p>
          <h1>{labels.heroTitle}</h1>
          <p className={styles.subtitle}>{labels.heroSubtitle}</p>
        </div>
      </header>

      <details className={styles.about}>
        <summary>{es ? "Sobre esta herramienta" : "About this tool"}</summary>
        <div className={styles.aboutBody}>
          <div>
            <h2>{labels.educationalFocusTitle}</h2>
            <p>{labels.educationalFocusBody}</p>
            <p>{labels.heroBody}</p>
            <p>{es
              ? "Cuando hay un porqué claro, el presupuesto deja de ser castigo y se vuelve dirección."
              : "When the why is clear, the budget stops feeling like punishment and becomes direction."}</p>
          </div>
          <dl>
            {readingItems.map(({ label, value }) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        </div>
      </details>
      <aside className={styles.privacy} aria-label={labels.noDataSaved}>
        <span>{labels.noDataSaved}</span>
        <p>{labels.privacyLong} {labels.disclaimer}</p>
      </aside>

      <BudgetWizard locale={locale} />

      <div className={styles.education}>
        <BudgetEducationalFramework locale={locale} />
        <BudgetFaq locale={locale} />
      </div>

      <section
        aria-labelledby="budget-expense-context-title"
        className="mt-6 rounded-[6px] border border-petrol/20 bg-[#f3efe6] p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">
          {locale === "es" ? "Contexto" : "Context"}
        </p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink" id="budget-expense-context-title">
          {labels.staticExpenseContextTitle}
        </h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <article>
            <h3 className="text-base font-semibold text-ink">{labels.staticNonMonthlyTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{labels.staticNonMonthlyCopy}</p>
          </article>
          <article>
            <h3 className="text-base font-semibold text-ink">{labels.staticSmallTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{labels.staticSmallCopy}</p>
          </article>
        </div>
      </section>

      <section className="mt-6 rounded-[6px] border border-petrol/20 bg-[#f3efe6] p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{labels.separateTitle}</p>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">{labels.separateCopy}</p>
        <p className="mt-4 max-w-4xl border-l border-petrol/40 pl-3 text-sm leading-6 text-muted">{labels.separateBuckets}</p>
      </section>

      <section className="mt-6 rounded-[6px] border border-line bg-[#f3efe6] p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{locale === "es" ? "Qué mover primero" : "What to move first"}</h2>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link className="inline-flex items-center justify-center rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol" href={locale === "es" ? "/deudas" : "/en/debt"}>
            {locale === "es" ? "Revisar deudas" : "Review debt"}
          </Link>
          <Link className="inline-flex items-center justify-center rounded-[4px] border border-petrol/25 bg-white/70 px-4 py-2.5 text-sm font-semibold text-petrol transition hover:border-petrol hover:bg-white" href={locale === "es" ? "/diagnostico" : "/en/diagnostic"}>
            {locale === "es" ? "Ver diagnóstico de inversión" : "View investment diagnostic"}
          </Link>
          <Link className="inline-flex items-center justify-center rounded-[4px] border border-petrol/25 bg-white/70 px-4 py-2.5 text-sm font-semibold text-petrol transition hover:border-petrol hover:bg-white" href={locale === "es" ? "/analisiscuantitativo" : "/en/quantitative-analysis"}>
            {locale === "es" ? "Explorar niveles estadísticos" : "Explore statistical levels"}
          </Link>
        </div>
        <p className="mt-5 max-w-4xl border-l border-petrol/40 pl-3 text-xs leading-5 text-muted">{labels.disclaimer}</p>
      </section>
    </div>
  );
}
