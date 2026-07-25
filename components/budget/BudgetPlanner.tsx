"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ReadingCard } from "@/components/seo/ReadingCard";

type Locale = "es" | "en";

type BudgetInput = {
  currency: string;
  debtPayments: number;
  education: number;
  emergencyFund: number;
  enjoyment: number;
  essentials: number;
  monthlyIncome: number;
  personalDevelopment: number;
  priority: BudgetPriority;
  savingInvestment: number;
};

type BudgetStatus = "defense" | "stabilization" | "balance" | "growth" | "incomplete";
type BudgetPriority = "peace" | "family" | "debt" | "emergency" | "investing" | "education" | "independence" | "other";
type Frequency = "monthly" | "quarterly" | "semiannual" | "annual" | "custom";
type AntFrequency = "daily" | "weekly" | "monthly" | "occasional";
type BudgetBlock = keyof typeof idealPercents;

type NonMonthlyExpense = {
  amount: number;
  frequency: Frequency;
  id: string;
  monthsFrequency: number;
  name: string;
};

type AntExpense = {
  amount: number;
  frequency: AntFrequency;
  id: string;
  name: string;
  pressureKey: BudgetBlock;
  timesPerMonth: number;
};

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
    balanceCopy: "Ya hay margen para distribuir mejor sin que todo dependa de fuerza de voluntad.",
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
    essentialsHelp: "Lo que mantiene tu vida funcionando: vivienda, comida, servicios, transporte, seguros necesarios y mínimos de deuda.",
    excess: "Excedente disponible",
    finalReading: "Qué mover primero",
    focusQuestion: "¿Qué quieres proteger o construir?",
    freedom: "Libertad financiera",
    freedomAlert: "La construcción patrimonial aún no tiene espacio propio.",
    freedomHelp: "Ahorro para invertir, construir patrimonio o comprar tiempo futuro.",
    freedomRatio: "Libertad financiera / ingreso",
    frequency: "Frecuencia",
    growth: "Crecimiento",
    growthCopy: "Hay espacio para construir patrimonio, educación y desarrollo sin abandonar protección.",
    heroBody:
      "El punto no es cumplir porcentajes perfectos desde el primer mes. El punto es entender dónde está tu dinero, qué bloque está absorbiendo tu libertad y cuál sería el siguiente ajuste razonable.",
    heroSubtitle: "Un mapa para ordenar tu dinero sin convertir tu vida en una cárcel.",
    heroTitle: "Presupuesto personal",
    ideal: "Ideal",
    idealModel: "Modelo ideal de referencia",
    income: "Ingreso mensual neto",
    incomplete: "Completa tu ingreso mensual neto para calcular porcentajes y comparar contra el modelo.",
    intro:
      "Este modelo no es una regla moral. Es una brújula. Si hoy no puedes cumplirlo, la pregunta no es culparte; es entender qué parte del presupuesto está absorbiendo tu margen.",
    moneyOrderBody: "Es dormir con menos ruido en la cabeza. Es poder decir que no. Es dejar de correr detrás de cada gasto. Es construir margen para cuidar lo importante, invertir mejor y tomar decisiones sin que la urgencia mande.",
    moneyOrderTitle: "Ordenar el dinero no es solo tener más dinero",
    monthlyEquivalent: "Equivalente mensual estimado",
    monthlyNonMonthly: "Gastos no mensuales",
    nonMonthlyCopy: "Muchos presupuestos fallan porque ignoran gastos que no llegan todos los meses, pero sí llegan.",
    nonMonthlyName: "Concepto",
    personal: "Desarrollo personal",
    personalHelp: "Salud, hábitos, terapia, deporte, relaciones o el área de tu vida que más fricción esté generando.",
    personalAlert: "Algunas fugas financieras nacen en áreas no financieras: salud, hábitos, ansiedad, relaciones o energía.",
    protection: "Protección financiera",
    protectionHelp: "Gastos no mensuales y fondo de emergencia. Es el dinero que evita que un imprevisto se convierta en deuda.",
    protectionAlert: "Puede faltar preparación para gastos no mensuales o emergencias.",
    protectionRatio: "Protección / ingreso",
    realistic: "Punto de partida sugerido",
    realisticIntro: "No conocemos tu vida, tus responsabilidades, tus dificultades ni tus privilegios. Pero si quieres acercarte a tu objetivo, este ajuste puede servirte como primer mapa para ordenar el presupuesto.",
    result: "Resultado actual",
    savingInvestment: "Ahorro/inversión actual",
    simulator: "Simulador",
    stabilization: "Estabilización",
    stabilizationCopy: "El flujo respira, pero poco. Aquí el riesgo es que cualquier imprevisto vuelva a romper el presupuesto.",
    survivalAlert: "El presupuesto está muy cargado en supervivencia y compromisos.",
    tableTitle: "Comparación contra ideal",
    disclaimer: "Esta herramienta es educativa. No reemplaza asesoría financiera, fiscal, legal ni de planificación patrimonial.",
    defenseSuggestedCopy: "En modo defensa, el objetivo no es parecer balanceado. Es recuperar oxígeno: cerrar déficit, revisar gastos, ordenar deuda y construir una reserva mínima.",
    currency: "Moneda / símbolo",
    addExpense: "Agregar gasto no mensual",
    addAntExpense: "Agregar gasto hormiga",
    antAnnualTotal: "Total gastos hormiga anual",
    antAnnualEquivalent: "Equivalente anual estimado",
    antCopy: "Los gastos pequeños no son el enemigo. El problema es no saber cuánto espacio ocupan.",
    antIncomeRatio: "% del ingreso mensual neto",
    antIntro: "Esto no significa eliminar todo. Significa decidir qué gasto pequeño sí vale la pena y cuál solo está quitando margen.",
    antMonthlyTotal: "Total gastos hormiga mensual",
    antName: "Concepto",
    antPressure: "Bloque que podría presionar",
    antTitle: "Gastos hormiga",
    monthlyTimes: "Veces al mes",
    remove: "Eliminar",
    separateBuckets: "Básicos, protección, disfrute consciente, libertad financiera, educación y desarrollo personal.",
    separateCopy: "Cumplir un presupuesto es más fácil cuando el dinero se separa al recibirlo, no cuando se intenta rescatar al final del mes. Una cuenta, bolsillo o sobre por bloque reduce la fricción y evita que todo compita contra todo.",
    separateTitle: "Sepáralo cuando entra",
    whyBase: "Cuando hay un porqué claro, el presupuesto deja de ser castigo y se vuelve dirección.",
    whyTitle: "Tu porqué importa",
  },
  en: {
    alerts: "Educational alerts",
    assigned: "Total assigned",
    balance: "Balance",
    balanceCopy: "There is already margin to distribute better without everything depending on willpower.",
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
    essentialsHelp: "What keeps life running: housing, food, utilities, transportation, necessary insurance, and debt minimums.",
    excess: "Available surplus",
    finalReading: "What to move first",
    focusQuestion: "What do you want to protect or build?",
    freedom: "Financial freedom",
    freedomAlert: "Wealth building does not yet have its own space.",
    freedomHelp: "Savings to invest, build wealth, or buy future time.",
    freedomRatio: "Financial freedom / income",
    frequency: "Frequency",
    growth: "Growth",
    growthCopy: "There is room to build wealth, education, and personal development without abandoning protection.",
    heroBody:
      "The point is not to hit perfect percentages in the first month. The point is to understand where your money is going, which block is absorbing your freedom, and what the next reasonable adjustment could be.",
    heroSubtitle: "A map for organizing money without turning life into a cage.",
    heroTitle: "Personal budget",
    ideal: "Ideal",
    idealModel: "Ideal reference model",
    income: "Monthly net income",
    incomplete: "Add monthly net income to calculate percentages and compare against the model.",
    intro:
      "This model is not a moral rule. It is a compass. If you cannot apply it today, the question is not blame; it is understanding which part of the budget is absorbing your margin.",
    moneyOrderBody: "It means sleeping with less noise in your head. It means being able to say no. It means no longer chasing every expense. It means building margin to protect what matters, invest better, and make decisions without urgency running the show.",
    moneyOrderTitle: "Organizing money is not only about having more money",
    monthlyEquivalent: "Estimated monthly equivalent",
    monthlyNonMonthly: "Non-monthly expenses",
    nonMonthlyCopy: "Many budgets fail because they ignore expenses that do not arrive every month, but still arrive.",
    nonMonthlyName: "Concept",
    personal: "Personal development",
    personalHelp: "Health, habits, therapy, sport, relationships, or the area of life creating the most friction.",
    personalAlert: "Some financial leaks start in non-financial areas: health, habits, anxiety, relationships, or energy.",
    protection: "Financial protection",
    protectionHelp: "Non-monthly expenses and emergency fund. This is the money that prevents surprises from becoming debt.",
    protectionAlert: "Preparation for non-monthly expenses or emergencies may be missing.",
    protectionRatio: "Protection / income",
    realistic: "Suggested starting point",
    realisticIntro: "We do not know your full life, responsibilities, difficulties or advantages. But if you want to move closer to your goal, this adjustment can work as a first map for organizing your budget.",
    result: "Current result",
    savingInvestment: "Current savings/investing",
    simulator: "Simulator",
    stabilization: "Stabilization",
    stabilizationCopy: "Cash flow breathes, but only a little. The risk here is that any surprise can break the budget again.",
    survivalAlert: "The budget is heavily loaded toward survival and commitments.",
    tableTitle: "Comparison against ideal",
    disclaimer: "This tool is educational. It does not replace financial, tax, legal, or estate planning advice.",
    defenseSuggestedCopy: "In defense mode, the goal is not to look balanced. It is to recover oxygen: close the deficit, review expenses, organize debt, and build a minimum reserve.",
    currency: "Currency / symbol",
    addExpense: "Add non-monthly expense",
    addAntExpense: "Add small expense",
    antAnnualTotal: "Annual small-expense total",
    antAnnualEquivalent: "Estimated annual equivalent",
    antCopy: "Small expenses are not the enemy. The problem is not knowing how much space they occupy.",
    antIncomeRatio: "% of monthly net income",
    antIntro: "This does not mean eliminating everything. It means deciding which small expense is worth it and which one is just taking margin away.",
    antMonthlyTotal: "Monthly small-expense total",
    antName: "Concept",
    antPressure: "Block it may pressure",
    antTitle: "Small recurring expenses",
    monthlyTimes: "Times per month",
    remove: "Remove",
    separateBuckets: "Essentials, protection, conscious enjoyment, financial freedom, education, and personal development.",
    separateCopy: "Following a budget is easier when money is separated as it arrives, not when you try to rescue it at the end of the month. One account, pocket, or envelope per block reduces friction and prevents everything from competing with everything.",
    separateTitle: "Separate it when it arrives",
    whyBase: "When the why is clear, the budget stops feeling like punishment and becomes direction.",
    whyTitle: "Your why matters",
  },
};

const initialInput: BudgetInput = {
  currency: "€",
  debtPayments: 0,
  education: 0,
  emergencyFund: 0,
  enjoyment: 0,
  essentials: 0,
  monthlyIncome: 0,
  personalDevelopment: 0,
  priority: "peace",
  savingInvestment: 0,
};

const initialNonMonthlyExpenses: NonMonthlyExpense[] = [
  { amount: 0, frequency: "annual", id: "expense-1", monthsFrequency: 12, name: "" },
];

const initialAntExpenses: AntExpense[] = [
  { amount: 0, frequency: "daily", id: "ant-1", name: "", pressureKey: "enjoyment", timesPerMonth: 1 },
];

const currencyOptions: Array<{ label: Record<Locale, string>; value: string }> = [
  { value: "AUD", label: { es: "AUD — Dólar australiano", en: "AUD — Australian dollar" } },
  { value: "CAD", label: { es: "CAD — Dólar canadiense", en: "CAD — Canadian dollar" } },
  { value: "CHF", label: { es: "CHF — Franco suizo", en: "CHF — Swiss franc" } },
  { value: "CNY", label: { es: "CNY — Yuan chino", en: "CNY — Chinese yuan" } },
  { value: "COP", label: { es: "COP — Peso colombiano", en: "COP — Colombian peso" } },
  { value: "EUR", label: { es: "EUR — Euro", en: "EUR — Euro" } },
  { value: "GBP", label: { es: "GBP — Libra esterlina", en: "GBP — Pound sterling" } },
  { value: "HKD", label: { es: "HKD — Dólar de Hong Kong", en: "HKD — Hong Kong dollar" } },
  { value: "JPY", label: { es: "JPY — Yen japonés", en: "JPY — Japanese yen" } },
  { value: "MXN", label: { es: "MXN — Peso mexicano", en: "MXN — Mexican peso" } },
  { value: "SGD", label: { es: "SGD — Dólar de Singapur", en: "SGD — Singapore dollar" } },
  { value: "USD", label: { es: "USD — Dólar estadounidense", en: "USD — US dollar" } },
  { value: "$", label: { es: "$ — Símbolo genérico", en: "$ — Generic symbol" } },
  { value: "€", label: { es: "€ — Símbolo euro", en: "€ — Euro symbol" } },
  { value: "Otro", label: { es: "Otro", en: "Other" } },
];

const frequencyOptions: Array<{ label: Record<Locale, string>; months: number; value: Frequency }> = [
  { value: "monthly", months: 1, label: { es: "Mensual", en: "Monthly" } },
  { value: "quarterly", months: 3, label: { es: "Trimestral", en: "Quarterly" } },
  { value: "semiannual", months: 6, label: { es: "Semestral", en: "Semiannual" } },
  { value: "annual", months: 12, label: { es: "Anual", en: "Annual" } },
  { value: "custom", months: 1, label: { es: "Cada X meses", en: "Every X months" } },
];

const antFrequencyOptions: Array<{ label: Record<Locale, string>; value: AntFrequency }> = [
  { value: "daily", label: { es: "Diario", en: "Daily" } },
  { value: "weekly", label: { es: "Semanal", en: "Weekly" } },
  { value: "monthly", label: { es: "Mensual", en: "Monthly" } },
  { value: "occasional", label: { es: "Ocasional / veces al mes", en: "Occasional / times per month" } },
];

const priorityOptions: Array<{ label: Record<Locale, string>; value: BudgetPriority }> = [
  { value: "peace", label: { es: "Tranquilidad", en: "Peace of mind" } },
  { value: "family", label: { es: "Hogar", en: "Household" } },
  { value: "debt", label: { es: "Salir de deudas", en: "Getting out of debt" } },
  { value: "emergency", label: { es: "Fondo de emergencia", en: "Emergency fund" } },
  { value: "investing", label: { es: "Invertir con más orden", en: "Investing with more order" } },
  { value: "education", label: { es: "Estudiar / crecer profesionalmente", en: "Study / professional growth" } },
  { value: "independence", label: { es: "Independencia", en: "Independence" } },
  { value: "other", label: { es: "Otro", en: "Other" } },
];

function normalizeMoneyInput(raw: string) {
  return raw.replace(/\D/g, "");
}

function parseMoneyInput(raw: string) {
  const digits = normalizeMoneyInput(raw);
  const parsed = digits === "" ? 0 : Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoneyInput(value: number, locale: Locale) {
  const safe = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    maximumFractionDigits: 0,
  }).format(safe);
}

function formatMoney(value: number, currency: string, locale: Locale) {
  const safe = Number.isFinite(value) ? value : 0;
  const cleanCurrency = (currency || "$").trim();
  const formatted = new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(safe));
  if (cleanCurrency === "Otro" || cleanCurrency === "Other") return `${locale === "es" ? "Moneda" : "Currency"} ${formatted}`;
  return cleanCurrency === "$" || cleanCurrency === "€" ? `${cleanCurrency}${formatted}` : `${cleanCurrency} ${formatted}`;
}

function ratio(value: number, income: number) {
  if (income <= 0) return null;
  return value / income;
}

function formatPercent(value: number | null, locale: Locale) {
  if (value === null || !Number.isFinite(value)) return locale === "es" ? "Completa ingreso" : "Add income";
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
  return { title: labels.income, body: labels.incomplete };
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
        onChange={(event) => onChange(parseMoneyInput(event.target.value))}
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

function frequencyMonths(expense: NonMonthlyExpense) {
  if (expense.frequency === "custom") return Math.max(1, expense.monthsFrequency);
  return frequencyOptions.find((option) => option.value === expense.frequency)?.months ?? 1;
}

function monthlyEquivalent(expense: NonMonthlyExpense) {
  return expense.amount / frequencyMonths(expense);
}

function antMonthlyEquivalent(expense: AntExpense) {
  if (expense.frequency === "daily") return expense.amount * 30;
  if (expense.frequency === "weekly") return expense.amount * (52 / 12);
  if (expense.frequency === "monthly") return expense.amount;
  return expense.amount * Math.max(0, expense.timesPerMonth);
}

function priorityReading(priority: BudgetPriority, locale: Locale) {
  const readings: Record<BudgetPriority, Record<Locale, string>> = {
    peace: {
      es: "Si tu prioridad es tranquilidad, el foco inicial es margen: menos improvisación, más protección y menos decisiones tomadas por urgencia.",
      en: "If your priority is peace of mind, the initial focus is margin: less improvisation, more protection, and fewer decisions made under urgency.",
    },
    family: {
      es: "Si tu prioridad es el hogar, el presupuesto necesita menos azar y más preparación para reducir fragilidad.",
      en: "If your priority is the household, the budget needs less chance and more preparation to reduce fragility.",
    },
    debt: {
      es: "Si tu prioridad es salir de deudas, el presupuesto debe liberar flujo para atacar capital sin romper lo básico.",
      en: "If your priority is getting out of debt, the budget needs to free cash flow to attack principal without breaking the basics.",
    },
    emergency: {
      es: "Si tu prioridad es fondo de emergencia, la protección financiera deja de ser opcional. Es el colchón que evita que un imprevisto se vuelva deuda.",
      en: "If your priority is an emergency fund, financial protection stops being optional. It is the cushion that keeps a surprise from becoming debt.",
    },
    investing: {
      es: "Si tu prioridad es invertir, primero conviene revisar que deuda, liquidez y gastos no estén rompiendo el flujo.",
      en: "If your priority is investing, it is worth checking first that debt, liquidity, and spending are not breaking cash flow.",
    },
    education: {
      es: "Si tu prioridad es crecer profesionalmente, la educación no es lujo: es una inversión en tu capacidad de servir mejor, producir más y ganar más.",
      en: "If your priority is professional growth, education is not a luxury: it is an investment in your ability to serve better, produce more, and earn more.",
    },
    independence: {
      es: "Si tu prioridad es independencia, el presupuesto debe comprar margen y tiempo futuro, no solo cerrar el mes.",
      en: "If your priority is independence, the budget should buy margin and future time, not only close the month.",
    },
    other: {
      es: "Usa tu objetivo como filtro: cada bloque del presupuesto debería acercarte a eso o, al menos, no alejarte.",
      en: "Use your goal as a filter: each budget block should move you closer to it or, at least, not move you away.",
    },
  };
  return readings[priority][locale];
}

export function BudgetPlanner({ locale }: { locale: Locale }) {
  const labels = copy[locale];
  const [input, setInput] = useState<BudgetInput>(initialInput);
  const [nonMonthlyExpenses, setNonMonthlyExpenses] = useState<NonMonthlyExpense[]>(initialNonMonthlyExpenses);
  const [antExpenses, setAntExpenses] = useState<AntExpense[]>(initialAntExpenses);

  const data = useMemo(() => {
    const monthlyNonMonthly = nonMonthlyExpenses.reduce((sum, expense) => sum + monthlyEquivalent(expense), 0);
    const monthlyAntExpenses = antExpenses.reduce((sum, expense) => sum + antMonthlyEquivalent(expense), 0);
    const categories: BudgetCategory[] = [
      {
        current: input.essentials + input.debtPayments,
        description: labels.essentialsHelp,
        idealPercent: idealPercents.essentials,
        key: "essentials",
        label: labels.basics,
      },
      {
        current: monthlyNonMonthly,
        description: labels.protectionHelp,
        idealPercent: idealPercents.protection,
        key: "protection",
        label: labels.protection,
      },
      {
        current: input.enjoyment,
        description: locale === "es" ? "Vivir también hace parte del plan. La idea es disfrutar sin romper el resto del presupuesto." : "Living is also part of the plan. The idea is to enjoy without breaking the rest of the budget.",
        idealPercent: idealPercents.enjoyment,
        key: "enjoyment",
        label: labels.enjoyment,
      },
      {
        current: input.savingInvestment,
        description: labels.freedomHelp,
        idealPercent: idealPercents.freedom,
        key: "freedom",
        label: labels.freedom,
      },
      {
        current: input.education,
        description: locale === "es" ? "Lo que aumenta tu capacidad de servir mejor, producir más y ganar más." : "What increases your ability to serve better, produce more, and earn more.",
        idealPercent: idealPercents.education,
        key: "education",
        label: labels.education,
      },
      {
        current: input.personalDevelopment,
        description: labels.personalHelp,
        idealPercent: idealPercents.personal,
        key: "personal",
        label: labels.personal,
      },
    ];

    const totalAssigned = categories.reduce((sum, category) => sum + category.current, 0);
    const surplus = input.monthlyIncome - totalAssigned;
    const basicDebtRatio = ratio(input.essentials + input.debtPayments, input.monthlyIncome);
    const protectionRatio = ratio(monthlyNonMonthly, input.monthlyIncome);
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
      monthlyAntExpenses,
      monthlyNonMonthly,
      protectionRatio,
      realistic,
      status,
      surplus,
      totalAssigned,
    };
  }, [antExpenses, input, labels, locale, nonMonthlyExpenses]);

  const status = statusText(data.status, locale);

  function updateInput(field: keyof BudgetInput, value: number | string) {
    setInput((current) => ({ ...current, [field]: value }));
  }

  function updateNonMonthlyExpense(id: string, patch: Partial<NonMonthlyExpense>) {
    setNonMonthlyExpenses((current) => current.map((expense) => {
      if (expense.id !== id) return expense;
      const next = { ...expense, ...patch };
      if (patch.frequency && patch.frequency !== "custom") {
        next.monthsFrequency = frequencyOptions.find((option) => option.value === patch.frequency)?.months ?? next.monthsFrequency;
      }
      return next;
    }));
  }

  function addNonMonthlyExpense() {
    setNonMonthlyExpenses((current) => [
      ...current,
      { amount: 0, frequency: "annual", id: `expense-${current.length + 1}-${Date.now()}`, monthsFrequency: 12, name: "" },
    ]);
  }

  function removeNonMonthlyExpense(id: string) {
    setNonMonthlyExpenses((current) => current.length <= 1 ? initialNonMonthlyExpenses : current.filter((expense) => expense.id !== id));
  }

  function updateAntExpense(id: string, patch: Partial<AntExpense>) {
    setAntExpenses((current) => current.map((expense) => expense.id === id ? { ...expense, ...patch } : expense));
  }

  function addAntExpense() {
    setAntExpenses((current) => [
      ...current,
      { amount: 0, frequency: "daily", id: `ant-${current.length + 1}-${Date.now()}`, name: "", pressureKey: "enjoyment", timesPerMonth: 1 },
    ]);
  }

  function removeAntExpense(id: string) {
    setAntExpenses((current) => current.length <= 1 ? initialAntExpenses : current.filter((expense) => expense.id !== id));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-5 md:py-14">
      <section className="estate-hero grid gap-8 rounded-[6px] border border-line px-5 py-7 shadow-[0_16px_42px_rgba(11,52,54,0.045)] md:px-7 md:py-9 lg:grid-cols-[0.58fr_0.42fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-petrol">{locale === "es" ? "Herramienta educativa" : "Educational tool"}</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.02] text-ink md:text-6xl">{labels.heroTitle}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">{labels.heroSubtitle}</p>
        </div>
        <div className="rounded-[6px] border border-petrol/20 bg-white/70 p-5 text-sm leading-7 text-muted shadow-[0_12px_32px_rgba(11,52,54,0.045)]">
          {labels.heroBody}
        </div>
      </section>

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
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{labels.moneyOrderTitle}</h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">{labels.moneyOrderBody}</p>
      </section>

      <section className="technical-surface mt-8 rounded-[6px] border border-petrol/20 p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
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
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{labels.currency}</span>
            <select
              className="max-w-[12rem] rounded-[4px] border border-line bg-white/80 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol focus:bg-white"
              onChange={(event) => updateInput("currency", event.target.value)}
              value={input.currency}
            >
              {currencyOptions.map((currency) => (
                <option key={currency.value} value={currency.value}>{currency.label[locale]}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{labels.focusQuestion}</span>
            <select
              className="rounded-[4px] border border-line bg-white/80 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol focus:bg-white"
              onChange={(event) => updateInput("priority", event.target.value as BudgetPriority)}
              value={input.priority}
            >
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label[locale]}</option>
              ))}
            </select>
          </label>
          <MoneyField label={labels.income} locale={locale} onChange={(value) => updateInput("monthlyIncome", value)} value={input.monthlyIncome} />
          <MoneyField label={labels.basics} locale={locale} onChange={(value) => updateInput("essentials", value)} value={input.essentials} />
          <MoneyField label={labels.debt} locale={locale} onChange={(value) => updateInput("debtPayments", value)} value={input.debtPayments} />
          <MoneyField label={labels.savingInvestment} locale={locale} onChange={(value) => updateInput("savingInvestment", value)} value={input.savingInvestment} />
          <MoneyField label={labels.enjoyment} locale={locale} onChange={(value) => updateInput("enjoyment", value)} value={input.enjoyment} />
          <MoneyField label={labels.education} locale={locale} onChange={(value) => updateInput("education", value)} value={input.education} />
          <MoneyField label={labels.personal} locale={locale} onChange={(value) => updateInput("personalDevelopment", value)} value={input.personalDevelopment} />
          <MoneyField label={labels.emergencyFund} locale={locale} onChange={(value) => updateInput("emergencyFund", value)} value={input.emergencyFund} />
        </div>
      </section>

      <section className="mt-6 rounded-[6px] border border-petrol/20 bg-[#f3efe6] p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{labels.whyTitle}</p>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">{labels.whyBase}</p>
        <p className="mt-4 max-w-4xl border-l border-brass/60 pl-3 text-sm leading-6 text-muted">{priorityReading(input.priority, locale)}</p>
      </section>

      <section className="mt-6 rounded-[6px] border border-line bg-panel p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">03</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{labels.monthlyNonMonthly}</h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">{labels.nonMonthlyCopy}</p>
          </div>
          <button type="button" onClick={addNonMonthlyExpense} className="w-fit rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol">
            {labels.addExpense}
          </button>
        </div>
        <div className="mt-5 grid gap-4">
          {nonMonthlyExpenses.map((expense) => (
            <div key={expense.id} className="grid gap-4 rounded-[6px] border border-line bg-white/75 p-4 lg:grid-cols-[1.2fr_1fr_1fr_0.8fr_auto] lg:items-end">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{labels.nonMonthlyName}</span>
                <input
                  className="rounded-[4px] border border-line bg-white/80 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol focus:bg-white"
                  onChange={(event) => updateNonMonthlyExpense(expense.id, { name: event.target.value })}
                  placeholder={locale === "es" ? "Seguro, impuestos..." : "Insurance, taxes..."}
                  type="text"
                  value={expense.name}
                />
              </label>
              <MoneyField label={locale === "es" ? "Monto" : "Amount"} locale={locale} onChange={(value) => updateNonMonthlyExpense(expense.id, { amount: value })} value={expense.amount} />
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{labels.frequency}</span>
                <select
                  className="rounded-[4px] border border-line bg-white/80 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol focus:bg-white"
                  onChange={(event) => updateNonMonthlyExpense(expense.id, { frequency: event.target.value as Frequency })}
                  value={expense.frequency}
                >
                  {frequencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label[locale]}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{locale === "es" ? "Meses" : "Months"}</span>
                <input
                  className="rounded-[4px] border border-line bg-white/80 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol focus:bg-white disabled:bg-panelSoft"
                  disabled={expense.frequency !== "custom"}
                  inputMode="numeric"
                  onChange={(event) => updateNonMonthlyExpense(expense.id, { monthsFrequency: Math.max(1, parseMoneyInput(event.target.value)) })}
                  type="text"
                  value={formatMoneyInput(frequencyMonths(expense), locale)}
                />
              </label>
              <button type="button" onClick={() => removeNonMonthlyExpense(expense.id)} className="rounded-[4px] border border-line bg-panel px-3 py-2.5 text-xs font-semibold text-muted transition hover:border-petrol hover:text-petrol">
                {labels.remove}
              </button>
              <p className="lg:col-span-5 text-sm leading-6 text-muted">
                {labels.monthlyEquivalent}: <span className="font-semibold text-ink">{formatMoney(monthlyEquivalent(expense), input.currency, locale)}</span>
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 border-l border-petrol/40 pl-3 text-sm leading-6 text-muted">
          {labels.monthlyEquivalent}: <span className="font-semibold text-ink">{formatMoney(data.monthlyNonMonthly, input.currency, locale)}</span>
        </p>
      </section>

      <section className="mt-6 rounded-[6px] border border-line bg-panel p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">04</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{labels.antTitle}</h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">{labels.antCopy}</p>
          </div>
          <button type="button" onClick={addAntExpense} className="w-fit rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol">
            {labels.addAntExpense}
          </button>
        </div>
        <div className="mt-5 grid gap-4">
          {antExpenses.map((expense) => {
            const monthly = antMonthlyEquivalent(expense);
            const annual = monthly * 12;
            const pressureLabel = data.categories.find((category) => category.key === expense.pressureKey)?.label ?? labels.enjoyment;
            return (
              <div key={expense.id} className="grid min-w-0 gap-4 rounded-[6px] border border-line bg-white/75 p-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_minmax(0,1fr)_auto] xl:items-end">
                <label className="grid min-w-0 gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{labels.antName}</span>
                  <input
                    className="min-w-0 rounded-[4px] border border-line bg-white/80 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol focus:bg-white"
                    onChange={(event) => updateAntExpense(expense.id, { name: event.target.value })}
                    placeholder={locale === "es" ? "Café, domicilios..." : "Coffee, delivery..."}
                    type="text"
                    value={expense.name}
                  />
                </label>
                <div className="min-w-0">
                  <MoneyField label={locale === "es" ? "Monto" : "Amount"} locale={locale} onChange={(value) => updateAntExpense(expense.id, { amount: value })} value={expense.amount} />
                </div>
                <label className="grid min-w-0 gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{labels.frequency}</span>
                  <select
                    className="min-w-0 rounded-[4px] border border-line bg-white/80 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol focus:bg-white"
                    onChange={(event) => updateAntExpense(expense.id, { frequency: event.target.value as AntFrequency })}
                    value={expense.frequency}
                  >
                    {antFrequencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label[locale]}</option>
                    ))}
                  </select>
                </label>
                <label className="grid min-w-0 gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{labels.monthlyTimes}</span>
                  <input
                    className="min-w-0 rounded-[4px] border border-line bg-white/80 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol focus:bg-white disabled:bg-panelSoft"
                    disabled={expense.frequency !== "occasional"}
                    inputMode="numeric"
                    onChange={(event) => updateAntExpense(expense.id, { timesPerMonth: Math.max(0, parseMoneyInput(event.target.value)) })}
                    type="text"
                    value={formatMoneyInput(expense.frequency === "occasional" ? expense.timesPerMonth : 0, locale)}
                  />
                </label>
                <label className="grid min-w-0 gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{labels.antPressure}</span>
                  <select
                    className="min-w-0 rounded-[4px] border border-line bg-white/80 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol focus:bg-white"
                    onChange={(event) => updateAntExpense(expense.id, { pressureKey: event.target.value as BudgetBlock })}
                    value={expense.pressureKey}
                  >
                    {data.categories.map((category) => (
                      <option key={category.key} value={category.key}>{category.label}</option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={() => removeAntExpense(expense.id)} className="w-fit rounded-[4px] border border-line bg-panel px-3 py-2.5 text-xs font-semibold text-muted transition hover:border-petrol hover:text-petrol xl:justify-self-end">
                  {labels.remove}
                </button>
                <p className="min-w-0 text-sm leading-6 text-muted lg:col-span-2 xl:col-span-6">
                  {labels.monthlyEquivalent}: <span className="font-semibold text-ink">{formatMoney(monthly, input.currency, locale)}</span>
                  {" · "}
                  {labels.antAnnualEquivalent}: <span className="font-semibold text-ink">{formatMoney(annual, input.currency, locale)}</span>
                  {" · "}
                  {labels.antPressure}: <span className="font-semibold text-ink">{pressureLabel}</span>
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Metric label={labels.antMonthlyTotal} value={formatMoney(data.monthlyAntExpenses, input.currency, locale)} />
          <Metric label={labels.antAnnualTotal} value={formatMoney(data.monthlyAntExpenses * 12, input.currency, locale)} />
          <Metric label={labels.antIncomeRatio} value={formatPercent(ratio(data.monthlyAntExpenses, input.monthlyIncome), locale)} />
        </div>
        <p className="mt-4 border-l border-brass/60 pl-3 text-sm leading-6 text-muted">{labels.antIntro}</p>
      </section>

      <section className="mt-6 rounded-[6px] border border-petrol/20 bg-[#f3efe6] p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{labels.separateTitle}</p>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">{labels.separateCopy}</p>
        <p className="mt-4 max-w-4xl border-l border-petrol/40 pl-3 text-sm leading-6 text-muted">{labels.separateBuckets}</p>
      </section>

      <section className="mt-6 rounded-[6px] border border-line bg-panel p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">05</p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{labels.result}</h2>
        {input.monthlyIncome <= 0 ? (
          <div className="mt-5 border border-petrol/20 bg-white/75 p-4">
            <p className="text-sm font-semibold text-ink">{labels.income}</p>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">{labels.incomplete}</p>
          </div>
        ) : (
          <>
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
              <p className="mt-3 max-w-4xl border-l border-brass/60 pl-3 text-sm leading-6 text-muted">{priorityReading(input.priority, locale)}</p>
            </div>
          </>
        )}
      </section>

      <section className="mt-6 rounded-[6px] border border-line bg-panel p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">06</p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{labels.tableTitle}</h2>
        {input.monthlyIncome <= 0 ? (
          <p className="mt-5 border border-line bg-panelSoft px-3 py-3 text-sm leading-6 text-muted">{labels.incomplete}</p>
        ) : (
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
        )}
      </section>

      <section className="mt-6 rounded-[6px] border border-line bg-panel p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">07</p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{labels.realistic}</h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-muted">{labels.realisticIntro}</p>
        {input.monthlyIncome <= 0 ? (
          <p className="mt-5 border border-line bg-panelSoft px-3 py-3 text-sm leading-6 text-muted">{labels.incomplete}</p>
        ) : data.status === "defense" ? (
          <p className="mt-5 border border-brass/40 bg-[#f7f0e2] p-4 text-sm leading-6 text-muted">{labels.defenseSuggestedCopy}</p>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.categories.map((category) => {
              const percent = data.realistic[category.key];
              const value = input.monthlyIncome * percent;
              return (
                <article key={category.key} className="border border-line bg-white/75 p-4">
                  <p className="text-sm font-semibold text-petrol">{formatPercent(percent, locale)}</p>
                  <h3 className="mt-2 text-lg font-semibold text-ink">{category.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{formatMoney(value, input.currency, locale)}</p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-[6px] border border-line bg-[#f3efe6] p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">08</p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{labels.finalReading}</h2>
        <p className="mt-4 max-w-4xl border-l border-petrol/40 pl-3 text-sm leading-6 text-muted">{priorityReading(input.priority, locale)}</p>
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
