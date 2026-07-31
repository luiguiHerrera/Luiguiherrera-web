import Link from "next/link";
import { BudgetFaq } from "@/components/budget/BudgetFaq";
import { BudgetWizard } from "@/components/budget/BudgetWizard";
import { budgetCopy } from "@/components/budget/budget-copy";
import { budgetTargetCopy } from "@/components/budget/budget-target-copy";
import { ReadingCard } from "@/components/seo/ReadingCard";
import { InstitutionalHero } from "@/components/ui/InstitutionalHero";
import { allocationCategories } from "@/lib/personal-finance/budget/target-types";
import type { BudgetLocale } from "@/lib/personal-finance/budget/types";

export function BudgetPlanner({ locale }: { locale: BudgetLocale }) {
  const labels = budgetCopy[locale];
  const targetLabels = budgetTargetCopy[locale];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-14">
      <InstitutionalHero
        chips={locale === "en" ? ["Income", "Spending", "Protection", "Saving"] : ["Ingresos", "Gastos", "Protección", "Ahorro"]}
        description={labels.heroSubtitle}
        eyebrow={locale === "es" ? "Herramienta educativa" : "Educational tool"}
        note={labels.heroBody}
        title={labels.heroTitle}
        variant="educational"
      />

      <ReadingCard title={locale === "en" ? "Reading card" : "Ficha de lectura"} items={locale === "en" ? [
        { label: "What it is", value: "An educational budget simulator to organize income, spending, saving, investing, financial protection and non-monthly expenses." },
        { label: "What it is for", value: "It helps check whether money has a clear structure before taking debt, investing or adding risk." },
        { label: "Limits", value: "It does not store personal data, know your full life context or define a universal budget rule." },
        { label: "Next step", value: "Review debt and margin of safety before moving to the investor diagnostic." },
      ] : [
        { label: "Qué es", value: "Un simulador educativo para ordenar ingresos, gastos, ahorro, inversión, protección financiera y gastos no mensuales." },
        { label: "Para qué sirve", value: "Sirve para ver si el dinero tiene una estructura clara antes de asumir deuda, invertir o tomar más riesgo." },
        { label: "Límites", value: "No guarda datos personales, no conoce tu vida completa y no define una regla universal de presupuesto." },
        { label: "Siguiente paso", value: "Revisar deudas y margen de seguridad antes de pasar al diagnóstico del inversionista." },
      ]} />

      <section className="mt-8 rounded-[6px] border border-petrol/20 bg-[#f3efe6] p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{locale === "es" ? "Foco" : "Focus"}</p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{labels.educationalFocusTitle}</h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">{labels.educationalFocusBody}</p>
      </section>

      <section className="mt-6 rounded-[6px] border border-petrol/20 bg-[#f3efe6] p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{locale === "es" ? "Tu porqué importa" : "Your why matters"}</p>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">
          {locale === "es"
            ? "Cuando hay un porqué claro, el presupuesto deja de ser castigo y se vuelve dirección."
            : "When the why is clear, the budget stops feeling like punishment and becomes direction."}
        </p>
      </section>

      <BudgetWizard locale={locale} />

      <section
        aria-labelledby="budget-target-context-title"
        className="mt-8 rounded-[6px] border border-line bg-panel p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">
          {locale === "es" ? "Marco educativo" : "Educational framework"}
        </p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink" id="budget-target-context-title">
          {locale === "es" ? "Del punto de partida a una distribución propia" : "From your starting point to your own allocation"}
        </h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">
          {locale === "es"
            ? "Este simulador separa el diagnóstico de los importes introducidos de la distribución objetivo que tú construyes. Su propósito es hacer visibles equivalencias, límites y decisiones, no imponer una regla universal."
            : "This simulator separates the diagnosis of the amounts you entered from the target allocation you build. Its purpose is to make equivalents, constraints, and decisions visible, not to impose a universal rule."}
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {allocationCategories.map((category) => (
            <article className="min-w-0 border border-line bg-white/60 p-4" key={category}>
              <h3 className="font-semibold leading-6 text-ink">{targetLabels.categories[category].name}</h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-petrol">{targetLabels.categories[category].subtitle}</p>
              <p className="mt-3 text-sm leading-6 text-muted">{targetLabels.categories[category].description}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <article>
            <h3 className="text-base font-semibold text-ink">{locale === "es" ? "ALP y CLF cumplen funciones distintas" : "ALP and CLF serve different purposes"}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              {locale === "es"
                ? "ALP organiza previsión y estabilidad: gastos no mensuales, imprevistos y fondo de emergencia. CLF organiza patrimonio y libertad futura: inversión, vivienda, negocio y otros activos. Clasificar el importe actual es opcional."
                : "ALP organizes planning and stability: non-monthly expenses, contingencies, and an emergency fund. CLF organizes wealth and future freedom: investing, housing, a business, and other assets. Classifying the current amount is optional."}
            </p>
          </article>
          <article>
            <h3 className="text-base font-semibold text-ink">{locale === "es" ? "Fondo de emergencia y reserva" : "Emergency fund and reserve"}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              {locale === "es"
                ? "El fondo de emergencia es un saldo de protección. La reserva para imprevistos es una cantidad mensual adicional para gastos pequeños inesperados que no estén incluidos en otros bloques."
                : "An emergency fund is a protective balance. A contingency reserve is an additional monthly amount for small unexpected expenses that are not included elsewhere."}
            </p>
          </article>
          <article>
            <h3 className="text-base font-semibold text-ink">{locale === "es" ? "La regla del 100 %" : "The 100% rule"}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              {locale === "es"
                ? "Las seis categorías utilizan el mismo ingreso. Puedes explorar por debajo o por encima del 100 %, y la herramienta mostrará lo pendiente o el exceso sin redistribuir nada automáticamente."
                : "The six categories use the same income. You can explore below or above 100%, and the tool will show the unallocated share or excess without redistributing anything automatically."}
            </p>
          </article>
          <article>
            <h3 className="text-base font-semibold text-ink">{locale === "es" ? "Lectura neutral y límites" : "Neutral reading and limits"}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              {locale === "es"
                ? "El punto de partida describe tus datos; el objetivo expresa tus decisiones. La herramienta no califica una categoría como buena o mala, no recomienda inversiones, no promete rentabilidad y no garantiza mayores ingresos."
                : "The starting point describes your inputs; the target reflects your decisions. The tool does not label a category as good or bad, recommend investments, promise returns, or guarantee higher income."}
            </p>
          </article>
        </div>
        <p className="mt-6 max-w-4xl border-l border-petrol/40 pl-3 text-sm leading-6 text-muted">{targetLabels.privacy}</p>
        <nav aria-label={locale === "es" ? "Recursos relacionados con el presupuesto" : "Budget-related resources"} className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold">
          <Link className="text-petrol underline-offset-4 hover:underline" href={locale === "es" ? "/empezar" : "/en/start"}>{locale === "es" ? "Empezar" : "Start here"}</Link>
          <Link className="text-petrol underline-offset-4 hover:underline" href={locale === "es" ? "/deudas" : "/en/debt"}>{locale === "es" ? "Revisar deudas" : "Review debt"}</Link>
          <Link className="text-petrol underline-offset-4 hover:underline" href={locale === "es" ? "/metodologia" : "/en/methodology"}>{locale === "es" ? "Consultar metodología" : "Read the methodology"}</Link>
        </nav>
      </section>

      <BudgetFaq locale={locale} />

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
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">04</p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{locale === "es" ? "Qué mover primero" : "What to move first"}</h2>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link className="inline-flex items-center justify-center rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol" href={locale === "es" ? "/deudas" : "/en/debt"}>
            {locale === "es" ? "Revisar deudas" : "Review debt"}
          </Link>
          <Link className="inline-flex items-center justify-center rounded-[4px] border border-petrol/25 bg-white/70 px-4 py-2.5 text-sm font-semibold text-petrol transition hover:border-petrol hover:bg-white" href={locale === "es" ? "/diagnostico" : "/en/diagnostic"}>
            {locale === "es" ? "Ver diagnóstico de inversión" : "View investment diagnostic"}
          </Link>
          <Link className="inline-flex items-center justify-center rounded-[4px] border border-petrol/25 bg-white/70 px-4 py-2.5 text-sm font-semibold text-petrol transition hover:border-petrol hover:bg-white" href={locale === "es" ? "/niveles-estadisticos" : "/en/statistical-levels"}>
            {locale === "es" ? "Explorar niveles estadísticos" : "Explore statistical levels"}
          </Link>
        </div>
        <p className="mt-5 max-w-4xl border-l border-petrol/40 pl-3 text-xs leading-5 text-muted">{labels.disclaimer}</p>
      </section>
    </div>
  );
}
