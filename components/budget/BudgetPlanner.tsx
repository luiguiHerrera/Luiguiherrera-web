"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Locale = "es" | "en";

type BudgetInput = {
  currency: string;
  debtPayments: number;
  education: number;
  emergencyFund: number;
  enjoyment: number;
  essentials: number;
  monthlyIncome: number;
  nonMonthly: number;
  personalDevelopment: number;
  savingInvestment: number;
};

type BudgetStatus = "defense" | "stabilization" | "balance" | "growth" | "incomplete";

type BudgetCategory = {
  current: number;
  description: string;
  idealPercent: number;
  key: keyof typeof idealPercents;
  label: string;
};

const idealPercents = {
  essentials: 0.5,
  protection: 0.1,
  enjoyment: 0.1,
  freedom: 0.1,
  education: 0.1,
  personal: 0.1,
};

const copy = {
  es: {
    alerts: "Alertas educativas",
    assigned: "Total asignado",
    balance: "Equilibrio",
    balanceCopy: "Ya hay espacio para ordenar protección, disfrute, inversión y crecimiento.",
    basicDebtRatio: "Básicos + deuda / ingreso",
    basics: "Básicos y compromisos",
    ctaDebt: "Revisar deudas",
    ctaDiagnostic: "Ver diagnóstico de inversión",
    ctaLevels: "Explorar niveles estadísticos",
    current: "Actual",
    debt: "Pagos mensuales de deuda",
    deficit: "Déficit",
    deficitCopy: "Antes de buscar el presupuesto ideal, el foco es cerrar el déficit y recuperar margen.",
    difference: "Diferencia",
    education: "Educación / crecimiento profesional",
    educationAlert: "La capacidad de generar más ingresos también se cultiva.",
    emergencyFund: "Fondo de emergencia actual",
    enjoyment: "Disfrute consciente",
    enjoymentAlert: "Un presupuesto demasiado restrictivo puede ser difícil de sostener.",
    essentialsHelp: "Gastos básicos, vivienda, alimentación, transporte y compromisos recurrentes.",
    excess: "Excedente disponible",
    finalReading: "Qué mover primero",
    freedom: "Libertad financiera",
    freedomAlert: "La construcción patrimonial aún no tiene espacio propio.",
    freedomRatio: "Libertad financiera / ingreso",
    growth: "Crecimiento",
    growthCopy: "Hay margen para fortalecer inversión, educación y desarrollo personal.",
    heroBody:
      "El punto no es cumplir porcentajes perfectos desde el primer mes. El punto es entender dónde está tu dinero, qué bloque está absorbiendo tu libertad y cuál sería el siguiente ajuste razonable.",
    heroSubtitle: "Un mapa para ordenar tu dinero sin convertir tu vida en una cárcel.",
    heroTitle: "Presupuesto personal",
    ideal: "Ideal",
    idealModel: "Modelo ideal",
    income: "Ingreso mensual neto",
    incomplete: "Completa un ingreso mensual neto para calcular porcentajes útiles.",
    intro:
      "Este es un presupuesto ideal, no una obligación. Muchas personas no pueden aplicarlo todavía. La lectura importante es la brecha entre el punto actual y una versión más sostenible.",
    monthlyNonMonthly: "Gastos no mensuales estimados al mes",
    personal: "Desarrollo personal",
    personalAlert: "Algunas fugas financieras nacen en áreas no financieras: salud, hábitos, ansiedad, relaciones o energía.",
    protection: "Protección financiera",
    protectionAlert: "Puede faltar preparación para gastos no mensuales o emergencias.",
    protectionRatio: "Protección / ingreso",
    realistic: "Presupuesto realista",
    result: "Resultado actual",
    savingInvestment: "Ahorro/inversión actual",
    simulator: "Simulador",
    stabilization: "Estabilización",
    stabilizationCopy: "El presupuesto cubre lo principal, pero tiene poco margen de error.",
    survivalAlert: "El presupuesto está muy cargado en supervivencia y compromisos.",
    tableTitle: "Comparación contra ideal",
    disclaimer: "Esta herramienta es educativa. No reemplaza asesoría financiera, fiscal, legal ni de planificación patrimonial.",
  },
  en: {
    alerts: "Educational alerts",
    assigned: "Total assigned",
    balance: "Balance",
    balanceCopy: "There is already room to organize protection, enjoyment, investing, and growth.",
    basicDebtRatio: "Essentials + debt / income",
    basics: "Essentials and commitments",
    ctaDebt: "Review debt",
    ctaDiagnostic: "View investment diagnostic",
    ctaLevels: "Explore statistical levels",
    current: "Current",
    debt: "Monthly debt payments",
    deficit: "Deficit",
    deficitCopy: "Before chasing the ideal budget, the focus is closing the deficit and recovering margin.",
    difference: "Difference",
    education: "Education / professional growth",
    educationAlert: "The ability to generate more income is also cultivated.",
    emergencyFund: "Current emergency fund",
    enjoyment: "Conscious enjoyment",
    enjoymentAlert: "A budget that is too restrictive can be hard to sustain.",
    essentialsHelp: "Basic expenses, housing, food, transportation, and recurring commitments.",
    excess: "Available surplus",
    finalReading: "What to move first",
    freedom: "Financial freedom",
    freedomAlert: "Wealth building does not yet have its own space.",
    freedomRatio: "Financial freedom / income",
    growth: "Growth",
    growthCopy: "There is room to strengthen investing, education, and personal development.",
    heroBody:
      "The point is not to hit perfect percentages in the first month. The point is to understand where your money is going, which block is absorbing your freedom, and what the next reasonable adjustment could be.",
    heroSubtitle: "A map for organizing money without turning life into a cage.",
    heroTitle: "Personal budget",
    ideal: "Ideal",
    idealModel: "Ideal model",
    income: "Monthly net income",
    incomplete: "Add monthly net income to calculate useful percentages.",
    intro:
      "This is an ideal budget, not an obligation. Many people cannot apply it yet. The useful reading is the gap between the current point and a more sustainable version.",
    monthlyNonMonthly: "Estimated non-monthly expenses per month",
    personal: "Personal development",
    personalAlert: "Some financial leaks start in non-financial areas: health, habits, anxiety, relationships, or energy.",
    protection: "Financial protection",
    protectionAlert: "Preparation for non-monthly expenses or emergencies may be missing.",
    protectionRatio: "Protection / income",
    realistic: "Realistic budget",
    result: "Current result",
    savingInvestment: "Current savings/investing",
    simulator: "Simulator",
    stabilization: "Stabilization",
    stabilizationCopy: "The budget covers the main items, but has little margin for error.",
    survivalAlert: "The budget is heavily loaded toward survival and commitments.",
    tableTitle: "Comparison against ideal",
    disclaimer: "This tool is educational. It does not replace financial, tax, legal, or estate planning advice.",
  },
};

const initialInput: BudgetInput = {
  currency: "$",
  debtPayments: 0,
  education: 0,
  emergencyFund: 0,
  enjoyment: 0,
  essentials: 0,
  monthlyIncome: 0,
  nonMonthly: 0,
  personalDevelopment: 0,
  savingInvestment: 0,
};

function normalizeMoneyInput(raw: string) {
  return raw.replace(/\D/g, "");
}

function moneyInputToNumber(raw: string) {
  const digits = normalizeMoneyInput(raw);
  return digits === "" ? 0 : Number(digits);
}

function formatMoneyInput(value: number, locale: Locale) {
  const safe = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    maximumFractionDigits: 0,
  }).format(safe);
}

function formatMoney(value: number, currency: string, locale: Locale) {
  const safe = Number.isFinite(value) ? value : 0;
  return `${currency || "$"}${new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(safe))}`;
}

function ratio(value: number, income: number) {
  if (income <= 0) return null;
  return value / income;
}

function formatPercent(value: number | null, locale: Locale) {
  if (value === null || !Number.isFinite(value)) return "n/d";
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value);
}

function statusText(status: BudgetStatus, locale: Locale) {
  const labels = copy[locale];
  if (status === "defense") return { title: locale === "es" ? "Defensa" : "Defense", body: labels.deficitCopy };
  if (status === "stabilization") return { title: labels.stabilization, body: labels.stabilizationCopy };
  if (status === "balance") return { title: labels.balance, body: labels.balanceCopy };
  if (status === "growth") return { title: labels.growth, body: labels.growthCopy };
  return { title: "n/d", body: labels.incomplete };
}

function realisticPercents(status: BudgetStatus) {
  if (status === "defense") {
    return { essentials: 0.68, protection: 0.05, enjoyment: 0.05, freedom: 0.05, education: 0.07, personal: 0.1 };
  }
  if (status === "stabilization") {
    return { essentials: 0.62, protection: 0.08, enjoyment: 0.07, freedom: 0.07, education: 0.08, personal: 0.08 };
  }
  if (status === "growth") {
    return { essentials: 0.43, protection: 0.1, enjoyment: 0.1, freedom: 0.14, education: 0.12, personal: 0.11 };
  }
  return idealPercents;
}

function MoneyField({
  label,
  locale,
  onChange,
  value,
}: {
  label: string;
  locale: Locale;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
      <input
        className="rounded-[4px] border border-line bg-white/80 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol focus:bg-white"
        inputMode="numeric"
        onChange={(event) => onChange(moneyInputToNumber(event.target.value))}
        type="text"
        value={formatMoneyInput(value, locale)}
      />
    </label>
  );
}

function Metric({ helper, label, value }: { helper?: string; label: string; value: string }) {
  return (
    <div className="border border-line bg-panelSoft px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 text-lg font-semibold leading-6 text-ink">{value}</p>
      {helper ? <p className="mt-2 text-xs leading-5 text-muted">{helper}</p> : null}
    </div>
  );
}

export function BudgetPlanner({ locale }: { locale: Locale }) {
  const labels = copy[locale];
  const [input, setInput] = useState<BudgetInput>(initialInput);

  const data = useMemo(() => {
    const categories: BudgetCategory[] = [
      {
        current: input.essentials + input.debtPayments,
        description: labels.essentialsHelp,
        idealPercent: idealPercents.essentials,
        key: "essentials",
        label: labels.basics,
      },
      {
        current: input.nonMonthly,
        description: locale === "es" ? "Reserva mensual para gastos no mensuales, seguros, colchón y emergencias." : "Monthly reserve for non-monthly expenses, insurance, cushion, and emergencies.",
        idealPercent: idealPercents.protection,
        key: "protection",
        label: labels.protection,
      },
      {
        current: input.enjoyment,
        description: locale === "es" ? "Gasto elegido con intención para sostener una vida viable." : "Intentional spending that helps make the plan livable.",
        idealPercent: idealPercents.enjoyment,
        key: "enjoyment",
        label: labels.enjoyment,
      },
      {
        current: input.savingInvestment,
        description: locale === "es" ? "Ahorro, inversión o construcción patrimonial de largo plazo." : "Savings, investing, or long-term wealth building.",
        idealPercent: idealPercents.freedom,
        key: "freedom",
        label: labels.freedom,
      },
      {
        current: input.education,
        description: locale === "es" ? "Cursos, libros, herramientas o habilidades que aumentan capacidad futura." : "Courses, books, tools, or skills that increase future capacity.",
        idealPercent: idealPercents.education,
        key: "education",
        label: labels.education,
      },
      {
        current: input.personalDevelopment,
        description: locale === "es" ? "Salud, hábitos, energía, terapia, relaciones y otras bases personales." : "Health, habits, energy, therapy, relationships, and other personal foundations.",
        idealPercent: idealPercents.personal,
        key: "personal",
        label: labels.personal,
      },
    ];

    const totalAssigned = categories.reduce((sum, category) => sum + category.current, 0);
    const surplus = input.monthlyIncome - totalAssigned;
    const basicDebtRatio = ratio(input.essentials + input.debtPayments, input.monthlyIncome);
    const protectionRatio = ratio(input.nonMonthly, input.monthlyIncome);
    const freedomRatio = ratio(input.savingInvestment, input.monthlyIncome);
    const marginRatio = ratio(surplus, input.monthlyIncome);
    const hasDeficit = input.monthlyIncome > 0 && surplus < 0;
    const status: BudgetStatus =
      input.monthlyIncome <= 0 ? "incomplete" :
      hasDeficit || (basicDebtRatio !== null && basicDebtRatio > 0.7) ? "defense" :
      (basicDebtRatio !== null && basicDebtRatio >= 0.6) || (marginRatio !== null && marginRatio < 0.05) ? "stabilization" :
      basicDebtRatio !== null && basicDebtRatio >= 0.45 ? "balance" :
      "growth";

    const alerts: string[] = [];
    if (basicDebtRatio !== null && basicDebtRatio > 0.6) alerts.push(labels.survivalAlert);
    if (protectionRatio !== null && protectionRatio < 0.05) alerts.push(labels.protectionAlert);
    if (input.monthlyIncome > 0 && input.savingInvestment <= 0) alerts.push(labels.freedomAlert);
    if (input.monthlyIncome > 0 && input.enjoyment <= 0) alerts.push(labels.enjoymentAlert);
    if (input.monthlyIncome > 0 && input.education <= 0) alerts.push(labels.educationAlert);
    if (input.monthlyIncome > 0 && input.personalDevelopment <= 0) alerts.push(labels.personalAlert);

    const realistic = realisticPercents(status);

    return {
      alerts,
      basicDebtRatio,
      categories,
      freedomRatio,
      protectionRatio,
      realistic,
      status,
      surplus,
      totalAssigned,
    };
  }, [input, labels, locale]);

  const status = statusText(data.status, locale);

  function updateInput(field: keyof BudgetInput, value: number | string) {
    setInput((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-14">
      <section className="grid gap-8 border-b border-line pb-10 lg:grid-cols-[0.58fr_0.42fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">{locale === "es" ? "Herramienta educativa" : "Educational tool"}</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">{labels.heroTitle}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">{labels.heroSubtitle}</p>
        </div>
        <div className="rounded-[6px] border border-petrol/20 bg-white/70 p-5 text-sm leading-7 text-muted shadow-[0_12px_32px_rgba(11,52,54,0.045)]">
          {labels.heroBody}
        </div>
      </section>

      <section className="mt-8 rounded-[6px] border border-line bg-panel p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">01</p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{labels.idealModel}</h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">{labels.intro}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.categories.map((category) => (
            <article key={category.key} className="border border-line bg-white/75 p-4">
              <p className="text-sm font-semibold text-petrol">{formatPercent(category.idealPercent, locale)}</p>
              <h3 className="mt-2 text-lg font-semibold text-ink">{category.label}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{category.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-[6px] border border-line bg-panel p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">02</p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{labels.simulator}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{locale === "es" ? "Moneda" : "Currency"}</span>
            <input
              className="rounded-[4px] border border-line bg-white/80 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol focus:bg-white"
              maxLength={8}
              onChange={(event) => updateInput("currency", event.target.value)}
              type="text"
              value={input.currency}
            />
          </label>
          <MoneyField label={labels.income} locale={locale} onChange={(value) => updateInput("monthlyIncome", value)} value={input.monthlyIncome} />
          <MoneyField label={labels.basics} locale={locale} onChange={(value) => updateInput("essentials", value)} value={input.essentials} />
          <MoneyField label={labels.debt} locale={locale} onChange={(value) => updateInput("debtPayments", value)} value={input.debtPayments} />
          <MoneyField label={labels.monthlyNonMonthly} locale={locale} onChange={(value) => updateInput("nonMonthly", value)} value={input.nonMonthly} />
          <MoneyField label={labels.savingInvestment} locale={locale} onChange={(value) => updateInput("savingInvestment", value)} value={input.savingInvestment} />
          <MoneyField label={labels.enjoyment} locale={locale} onChange={(value) => updateInput("enjoyment", value)} value={input.enjoyment} />
          <MoneyField label={labels.education} locale={locale} onChange={(value) => updateInput("education", value)} value={input.education} />
          <MoneyField label={labels.personal} locale={locale} onChange={(value) => updateInput("personalDevelopment", value)} value={input.personalDevelopment} />
          <MoneyField label={labels.emergencyFund} locale={locale} onChange={(value) => updateInput("emergencyFund", value)} value={input.emergencyFund} />
        </div>
      </section>

      <section className="mt-6 rounded-[6px] border border-line bg-panel p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">03</p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{labels.result}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label={labels.assigned} value={formatMoney(data.totalAssigned, input.currency, locale)} />
          <Metric label={data.surplus < 0 ? labels.deficit : labels.excess} value={formatMoney(Math.abs(data.surplus), input.currency, locale)} />
          <Metric label={labels.basicDebtRatio} value={formatPercent(data.basicDebtRatio, locale)} />
          <Metric label={labels.protectionRatio} value={formatPercent(data.protectionRatio, locale)} />
          <Metric label={labels.freedomRatio} value={formatPercent(data.freedomRatio, locale)} />
          <Metric helper={locale === "es" ? "Saldo actual, no gasto mensual." : "Current balance, not monthly spending."} label={labels.emergencyFund} value={formatMoney(input.emergencyFund, input.currency, locale)} />
        </div>
        <div className="mt-5 border border-petrol/20 bg-white/75 p-4">
          <p className="text-sm font-semibold text-ink">{status.title}</p>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">{status.body}</p>
        </div>
      </section>

      <section className="mt-6 rounded-[6px] border border-line bg-panel p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">04</p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{labels.tableTitle}</h2>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-[0.14em] text-muted">
                <th className="py-3 pr-4 font-semibold">{locale === "es" ? "Bloque" : "Block"}</th>
                <th className="px-4 py-3 font-semibold">{labels.current}</th>
                <th className="px-4 py-3 font-semibold">{labels.ideal}</th>
                <th className="px-4 py-3 font-semibold">{labels.difference}</th>
              </tr>
            </thead>
            <tbody>
              {data.categories.map((category) => {
                const actualPercent = ratio(category.current, input.monthlyIncome);
                const idealValue = input.monthlyIncome > 0 ? input.monthlyIncome * category.idealPercent : 0;
                const difference = category.current - idealValue;
                return (
                  <tr key={category.key} className="border-b border-line/70 last:border-b-0">
                    <td className="py-3 pr-4 font-semibold text-ink">{category.label}</td>
                    <td className="px-4 py-3 text-muted">{formatMoney(category.current, input.currency, locale)} · {formatPercent(actualPercent, locale)}</td>
                    <td className="px-4 py-3 text-muted">{formatMoney(idealValue, input.currency, locale)} · {formatPercent(category.idealPercent, locale)}</td>
                    <td className="px-4 py-3 font-semibold text-ink">{difference >= 0 ? "+" : "-"}{formatMoney(Math.abs(difference), input.currency, locale)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-[6px] border border-line bg-panel p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">05</p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{labels.realistic}</h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">{status.body}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.categories.map((category) => {
            const percent = data.realistic[category.key];
            const value = input.monthlyIncome > 0 ? input.monthlyIncome * percent : 0;
            return (
              <article key={category.key} className="border border-line bg-white/75 p-4">
                <p className="text-sm font-semibold text-petrol">{formatPercent(percent, locale)}</p>
                <h3 className="mt-2 text-lg font-semibold text-ink">{category.label}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{formatMoney(value, input.currency, locale)}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-6 rounded-[6px] border border-line bg-[#f3efe6] p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">06</p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{labels.finalReading}</h2>
        {data.alerts.length > 0 ? (
          <div className="mt-5 grid gap-2">
            <p className="text-sm font-semibold text-ink">{labels.alerts}</p>
            {data.alerts.map((alert) => (
              <p key={alert} className="border-l border-brass/60 pl-3 text-sm leading-6 text-muted">{alert}</p>
            ))}
          </div>
        ) : (
          <p className="mt-4 max-w-4xl text-sm leading-6 text-muted">{locale === "es" ? "No aparecen alertas principales con los datos actuales. La siguiente mejora puede ser afinar prioridades." : "No major alerts appear with the current inputs. The next improvement can be refining priorities."}</p>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link className="inline-flex items-center justify-center rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol" href={locale === "es" ? "/deudas" : "/en/debt"}>
            {labels.ctaDebt}
          </Link>
          <Link className="inline-flex items-center justify-center rounded-[4px] border border-petrol/25 bg-white/70 px-4 py-2.5 text-sm font-semibold text-petrol transition hover:border-petrol hover:bg-white" href={locale === "es" ? "/diagnostico" : "/en/diagnostic"}>
            {labels.ctaDiagnostic}
          </Link>
          <Link className="inline-flex items-center justify-center rounded-[4px] border border-petrol/25 bg-white/70 px-4 py-2.5 text-sm font-semibold text-petrol transition hover:border-petrol hover:bg-white" href={locale === "es" ? "/niveles-estadisticos" : "/en/statistical-levels"}>
            {labels.ctaLevels}
          </Link>
        </div>
        <p className="mt-5 max-w-4xl border-l border-petrol/40 pl-3 text-xs leading-5 text-muted">{labels.disclaimer}</p>
      </section>
    </div>
  );
}
