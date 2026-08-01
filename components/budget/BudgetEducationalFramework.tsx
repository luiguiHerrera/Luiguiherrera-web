import Link from "next/link";
import { budgetTargetCopy } from "@/components/budget/budget-target-copy";
import {
  allocationCategories,
  type AllocationCategory,
} from "@/lib/personal-finance/budget/target-types";
import type { BudgetLocale } from "@/lib/personal-finance/budget/types";

const frameworkCopy = {
  es: {
    alpClf: {
      action: "Entender la diferencia",
      alpDetail: "Gastos no mensuales · imprevistos · fondo",
      alpPurpose: "Proteger y preparar",
      clfDetail: "Inversión · vivienda · negocio · activos",
      clfPurpose: "Construir patrimonio",
      close: "Ocultar diferencia",
      detail: "ALP organiza previsión y estabilidad: gastos no mensuales, imprevistos y fondo de emergencia. CLF organiza patrimonio y libertad futura: inversión, vivienda, negocio y otros activos. Ambos pueden existir en tu distribución y clasificar el ahorro actual es opcional.",
      title: "ALP y CLF cumplen funciones distintas",
    },
    categoryActions: { close: "Ocultar ejemplos", open: "Ver ejemplos" },
    categoryFunctions: {
      alp: "Prepararte para gastos futuros e imprevistos.",
      clf: "Construir patrimonio y libertad futura.",
      education: "Ampliar capacidades y desarrollo profesional.",
      enjoyment: "Elegir experiencias y consumo consciente.",
      essentials: "Sostener tu vida y compromisos actuales.",
      serAndGiving: "Cuidar tu bienestar y contribuir.",
    },
    categorySignals: {
      alp: "Proteger próximos meses",
      clf: "Construir patrimonio",
      education: "Ampliar capacidades",
      enjoyment: "Elegir experiencias",
      essentials: "Sostener hoy",
      serAndGiving: "Bienestar y contribución",
    },
    fundReserve: {
      balance: "Saldo acumulado",
      fundCopy: "Saldo acumulado de protección",
      fundTitle: "Fondo de emergencia",
      reserveCopy: "Cantidad mensual para gastos pequeños inesperados que no estén incluidos en otros bloques",
      reserveTitle: "Reserva para imprevistos",
      title: "Fondo de emergencia y reserva",
      contribution: "Aporte mensual",
    },
    intro: "Comprende las seis categorías y construye una distribución propia sin seguir una regla universal.",
    neutral: "La herramienta describe tus datos y decisiones. No califica categorías ni promete resultados.",
    privacy: "Tus datos se procesan en este dispositivo. No se guardan ni se envían.",
    resources: "Recursos relacionados con el presupuesto",
    rule: {
      detail: "Las seis categorías utilizan el mismo ingreso. Puedes explorar por debajo o por encima del 100 %, y la herramienta mostrará lo pendiente o el exceso sin redistribuir nada automáticamente. El 100 % describe un estado de distribución, no una respuesta universalmente correcta.",
      title: "La regla del 100 %",
    },
    title: "Del punto de partida a una distribución propia",
  },
  en: {
    alpClf: {
      action: "Understand the difference",
      alpDetail: "Non-monthly expenses · contingencies · fund",
      alpPurpose: "Protect and prepare",
      clfDetail: "Investing · housing · business · assets",
      clfPurpose: "Build wealth",
      close: "Hide the difference",
      detail: "ALP organizes planning and stability: non-monthly expenses, contingencies, and an emergency fund. CLF organizes wealth and future freedom: investing, housing, a business, and other assets. Both can exist in your allocation, and classifying your current savings is optional.",
      title: "ALP and CLF serve different purposes",
    },
    categoryActions: { close: "Hide examples", open: "View examples" },
    categoryFunctions: {
      alp: "Prepare for future expenses and contingencies.",
      clf: "Build wealth and future freedom.",
      education: "Expand skills and professional development.",
      enjoyment: "Choose experiences and intentional spending.",
      essentials: "Support current needs and commitments.",
      serAndGiving: "Support well-being and contribution.",
    },
    categorySignals: {
      alp: "Protect the months ahead",
      clf: "Build wealth",
      education: "Expand capabilities",
      enjoyment: "Choose experiences",
      essentials: "Support today",
      serAndGiving: "Well-being and contribution",
    },
    fundReserve: {
      balance: "Accumulated balance",
      fundCopy: "Accumulated protective balance",
      fundTitle: "Emergency fund",
      reserveCopy: "Monthly amount for small unexpected expenses not already included elsewhere",
      reserveTitle: "Contingency reserve",
      title: "Emergency fund and reserve",
      contribution: "Monthly contribution",
    },
    intro: "Understand the six categories and build your own allocation without following a universal rule.",
    neutral: "The tool describes your data and decisions. It does not rate categories or promise outcomes.",
    privacy: "Your data is processed on this device. It is not stored or sent anywhere.",
    resources: "Budget-related resources",
    rule: {
      detail: "The six categories use the same income. You can explore below or above 100%, and the tool will show the unallocated share or excess without redistributing anything automatically. A 100% allocation describes a distribution state, not a universally correct answer.",
      title: "The 100% rule",
    },
    title: "From your starting point to your own allocation",
  },
} satisfies Record<BudgetLocale, {
  alpClf: Record<"action" | "alpDetail" | "alpPurpose" | "clfDetail" | "clfPurpose" | "close" | "detail" | "title", string>;
  categoryActions: Record<"close" | "open", string>;
  categoryFunctions: Record<AllocationCategory, string>;
  categorySignals: Record<AllocationCategory, string>;
  fundReserve: Record<"balance" | "contribution" | "fundCopy" | "fundTitle" | "reserveCopy" | "reserveTitle" | "title", string>;
  intro: string;
  neutral: string;
  privacy: string;
  resources: string;
  rule: Record<"detail" | "title", string>;
  title: string;
}>;

const summaryClassName = "cursor-pointer list-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-petrol [&::-webkit-details-marker]:hidden";

export function BudgetEducationalFramework({ locale }: { locale: BudgetLocale }) {
  const labels = frameworkCopy[locale];
  const targetLabels = budgetTargetCopy[locale];

  return (
    <section
      aria-labelledby="budget-target-context-title"
      className="mt-8 rounded-[6px] border border-line bg-panel p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">
        {locale === "es" ? "Marco educativo" : "Educational framework"}
      </p>
      <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink" id="budget-target-context-title">
        {labels.title}
      </h2>
      <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">{labels.intro}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {allocationCategories.map((category) => {
          const categoryLabels = targetLabels.categories[category];
          return (
            <details className="group min-w-0 border border-line bg-white/60 p-4 open:bg-white" key={category}>
              <summary className={summaryClassName}>
                <h3 className="font-semibold leading-6 text-ink">{categoryLabels.name}</h3>
                <p className="mt-2 text-sm leading-5 text-muted">{labels.categoryFunctions[category]}</p>
                <span className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-petrol">
                  <span aria-hidden="true" className="flex items-end gap-0.5">
                    <span className="h-1.5 w-2 bg-petrol/35" />
                    <span className="h-2.5 w-2 bg-petrol/60" />
                    <span className="h-3.5 w-2 bg-petrol" />
                  </span>
                  {labels.categorySignals[category]}
                </span>
                <span className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-petrol underline-offset-4 group-open:hidden">
                  {labels.categoryActions.open}
                </span>
                <span className="mt-4 hidden min-h-10 items-center text-sm font-semibold text-petrol underline-offset-4 group-open:inline-flex">
                  {labels.categoryActions.close}
                </span>
              </summary>
              <div className="mt-3 border-t border-line pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-petrol">{categoryLabels.subtitle}</p>
                <p className="mt-3 text-sm leading-6 text-muted">{categoryLabels.description}</p>
                {categoryLabels.limit ? <p className="mt-3 text-sm leading-6 text-muted">{categoryLabels.limit}</p> : null}
              </div>
            </details>
          );
        })}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <article className="border border-line bg-white/55 p-4 md:p-5">
          <h3 className="text-base font-semibold text-ink">{labels.alpClf.title}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="border-l-2 border-brass bg-panelSoft p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-petrol">ALP</p>
              <p className="mt-1 font-semibold text-ink">{labels.alpClf.alpPurpose}</p>
              <p className="mt-2 text-sm leading-5 text-muted">{labels.alpClf.alpDetail}</p>
            </div>
            <div className="border-l-2 border-petrol bg-panelSoft p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-petrol">CLF</p>
              <p className="mt-1 font-semibold text-ink">{labels.alpClf.clfPurpose}</p>
              <p className="mt-2 text-sm leading-5 text-muted">{labels.alpClf.clfDetail}</p>
            </div>
          </div>
          <details className="group mt-3">
            <summary className={`${summaryClassName} inline-flex min-h-11 items-center text-sm font-semibold text-petrol`}>
              <span className="group-open:hidden">{labels.alpClf.action}</span>
              <span className="hidden group-open:inline">{labels.alpClf.close}</span>
            </summary>
            <p className="border-t border-line pt-3 text-sm leading-6 text-muted">{labels.alpClf.detail}</p>
          </details>
        </article>

        <article className="border border-line bg-white/55 p-4 md:p-5">
          <h3 className="text-base font-semibold text-ink">{labels.fundReserve.title}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
            <div className="bg-panelSoft p-3">
              <p className="font-semibold text-ink">{labels.fundReserve.fundTitle}</p>
              <p className="mt-2 text-sm leading-5 text-muted">{labels.fundReserve.fundCopy}</p>
            </div>
            <div aria-hidden="true" className="flex items-center justify-center text-lg text-petrol">↔</div>
            <div className="bg-panelSoft p-3">
              <p className="font-semibold text-ink">{labels.fundReserve.reserveTitle}</p>
              <p className="mt-2 text-sm leading-5 text-muted">{labels.fundReserve.reserveCopy}</p>
            </div>
          </div>
          <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.08em] text-petrol">
            {labels.fundReserve.balance} <span aria-hidden="true">↔</span> {labels.fundReserve.contribution}
          </p>
        </article>
      </div>

      <article className="mt-5 border border-line bg-white/55 p-4 md:p-5">
        <h3 className="text-base font-semibold text-ink">{labels.rule.title}</h3>
        <p className="mt-3 text-sm leading-6 text-muted">{labels.rule.detail}</p>
      </article>

      <div className="mt-5 border-l-2 border-petrol bg-panelSoft px-4 py-3 text-sm leading-6 text-muted">
        <p>{labels.neutral}</p>
        <p className="mt-1">{labels.privacy}</p>
      </div>

      <nav aria-label={labels.resources} className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold">
        <Link className="text-petrol underline-offset-4 hover:underline" href={locale === "es" ? "/empezar" : "/en/start"}>{locale === "es" ? "Empezar" : "Start here"}</Link>
        <Link className="text-petrol underline-offset-4 hover:underline" href={locale === "es" ? "/deudas" : "/en/debt"}>{locale === "es" ? "Revisar deudas" : "Review debt"}</Link>
        <Link className="text-petrol underline-offset-4 hover:underline" href={locale === "es" ? "/metodologia" : "/en/methodology"}>{locale === "es" ? "Consultar metodología" : "Read the methodology"}</Link>
      </nav>
    </section>
  );
}
