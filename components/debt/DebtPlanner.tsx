"use client";

import { useMemo, useState } from "react";
import { calculateDebtPlan } from "@/lib/debt/calculate-debt-plan";
import type { DebtInput, DebtKind, DebtPlanResult, DebtProfileInput, ExtraContributionInput, PayoffMethod, PayoffPlan } from "@/lib/debt/types";

type Locale = "es" | "en";

const debtTypes: Array<{ label: Record<Locale, string>; value: DebtKind }> = [
  { value: "card", label: { es: "Tarjeta", en: "Card" } },
  { value: "personal", label: { es: "Personal", en: "Personal" } },
  { value: "vehicle", label: { es: "Vehículo", en: "Vehicle" } },
  { value: "mortgage", label: { es: "Hipoteca", en: "Mortgage" } },
  { value: "education", label: { es: "Educativo", en: "Education" } },
  { value: "other", label: { es: "Otro", en: "Other" } },
];

const debtNameSuggestions: Record<Locale, string[]> = {
  es: [
    "Tarjeta de crédito",
    "Crédito personal",
    "Crédito de vehículo",
    "Hipoteca",
    "Crédito educativo",
    "Crédito familiar",
    "Línea de crédito",
    "Compra a cuotas",
    "Otro",
  ],
  en: [
    "Credit card",
    "Personal loan",
    "Vehicle loan",
    "Mortgage",
    "Student loan",
    "Family loan",
    "Credit line",
    "Installment purchase",
    "Other",
  ],
};

const copy = {
  es: {
    addDebt: "Agregar deuda",
    addExtraContribution: "Agregar abono extraordinario",
    adjustedCost: "Costo anual ajustado",
    amount: "Monto",
    avalanche: "Avalancha",
    avalancheBody: "Prioriza primero la deuda con mayor costo anual ajustado.",
    availableDebtPayment: "Pago mensual para deuda",
    availableDebtPaymentHelp:
      "Usa aquí el total que puedes destinar a deuda este mes. Conviene incluir los pagos mínimos. Si ya metiste los mínimos dentro de gastos fijos, no los dupliques mentalmente: este campo se usa para simular el plan de pago.",
    balance: "Saldo pendiente",
    baseline: "Punto de partida",
    cashAfterDebtPlan: "Margen después del plan",
    compare: "Diferencia entre métodos",
    costAndFeesDifference: "Diferencia de intereses + costos",
    currentPayment: "Pago mensual actual",
    cheapestMethod: "Método más barato",
    debtName: "Nombre",
    debtSingular: "Deuda",
    debts: "Deudas",
    debtType: "Tipo",
    debtLoadAttention: "Zona de atención: supera el umbral educativo de 30%.",
    debtLoadHighFragility: "Alerta: los mínimos consumen más de la mitad del ingreso neto.",
    debtLoadHighPressure: "Presión alta: los mínimos consumen una parte elevada del ingreso neto.",
    debtLoadManageable: "Dentro de un rango más manejable.",
    debtLoadStrongAlert: "Alerta fuerte: los mínimos representan una parte muy alta del ingreso neto.",
    deficitCopy: "Si una persona gasta y debe más de lo que ingresa, el primer paso no es elegir una estrategia de pago. Primero debe cerrar el déficit: reajustar gastos, buscar ingresos adicionales, renegociar obligaciones, vender activos si no hay otra salida, o consultar alternativas legales con un profesional. Esto no constituye asesoría financiera ni legal.",
    deficitTitle: "Déficit mensual",
    disclaimer: "Esta herramienta es educativa. No reemplaza asesoría financiera, legal, fiscal ni de insolvencia.",
    emergencyFund: "Fondo de emergencia",
    emergencyMonths: "Meses de fondo",
    estimatedMargin: "Margen mensual estimado",
    estimatedSavings: "Ahorro estimado",
    extraContributionExamples: "Ejemplos: cesantías, prima, vacaciones, bonus, venta de activo, devolución de impuestos o ingreso extraordinario.",
    extraContributionImpact: "Impacto estimado de abonos",
    extraContributionMonth: "Mes",
    extraContributionName: "Concepto opcional",
    extraContributionNote: "Los abonos extraordinarios suelen tener más impacto cuando reducen capital de deudas caras. La diferencia aparece en intereses futuros que dejan de causarse.",
    extraContributionSavings: "Ahorro adicional por abonos",
    extraMargin: "Hay margen mensual disponible",
    extraMarginBody: "Después de gastos fijos y pago mensual de deuda queda aire en el mes. Una posibilidad educativa es usar parte de ese margen para aumentar pagos y reducir intereses; otra es construir fondo de emergencia o invertir con prudencia.",
    extraMarginExample: "Si usas parte de este margen para aumentar pagos, podrías reducir intereses.",
    extraPayment: "Excedente sobre mínimos",
    fixedAndDebt: "Gastos fijos + mínimos / ingreso",
    fixedExpenses: "Gastos fijos mensuales",
    firstDebt: "Primera deuda priorizada",
    financialTotal: "Total financiero estimado",
    fixedMonthlyIncrease: "Incremento mensual fijo",
    income: "Ingreso mensual neto",
    liquidity: "Patrimonio líquido",
    minimumPayment: "Pago mínimo mensual",
    minimumPaymentGap: "Brecha frente a mínimos",
    minimums: "Pago mínimo total",
    minimumsOnlyCopy: "Tu pago mensual cubre exactamente los mínimos. En este caso, avalancha y bola de nieve pueden verse iguales porque todavía no hay excedente para priorizar una deuda sobre otra.",
    minimumsOnlySuggestion: "Para ver diferencia entre métodos, aumenta el pago mensual o agrega un abono extraordinario.",
    minimumsOnlyTitle: "Sin excedente sobre mínimos",
    minimumsToIncome: "Mínimos / ingreso neto",
    monthlyCashAfterExpenses: "Ingreso libre antes de deuda",
    monthlyFee: "Seguro/comisión mensual",
    months: "Meses estimados",
    monthsAhead: "Meses adelantados",
    newPayment: "Nuevo pago mensual",
    paidOffMonth: "Mes de liquidación",
    noDebts: "Agrega al menos una deuda con saldo para ver referencias comparables.",
    noExtraContributions: "Agrega un abono extraordinario para estimar su impacto.",
    noViablePlanCopy: "El pago mensual disponible no cubre los mínimos. Antes de comparar estrategias, hay que ajustar gastos, aumentar ingresos, renegociar pagos o revisar alternativas con un profesional.",
    noViablePlanTitle: "Antes de comparar métodos",
    estimatedLiquidation: "Liquidación estimada",
    order: "Prioridad del método",
    payoffComparisonCopy:
      "En este escenario, la simulación ayuda a comparar coste y tiempo sin convertir el resultado en recomendación personalizada.",
    payoffFlowWarning: "La comparación entre métodos ayuda a ordenar pagos, pero no reemplaza el análisis del flujo. Si los mínimos ya consumen demasiado ingreso, el problema principal puede ser capacidad de pago, no solo orden de pago.",
    plannedDebtToIncome: "Pago plan / ingreso neto",
    paymentIncrease: "¿Cuánto ahorro si pago más?",
    paymentIncreaseCopy: "Este ahorro no viene de magia. Viene de reducir el tiempo durante el cual la deuda sigue cobrando intereses.",
    payoffSequence: "Prioridad del método",
    principalPaid: "Capital pagado",
    priorityReason: "Motivo",
    pressure: "Presión mensual",
    rate: "Tasa anual %",
    reading: "Lectura educativa",
    references: "Rentabilidad mínima comparable",
    referencesText: "Para que una inversión compita con esta deuda, tendría que superar esta referencia con suficiente margen, después de costes, impuestos y riesgo.",
    referencesRiskNote: "Renta variable puede implicar pérdida de capital. Y muchas alternativas de renta fija suelen rentar menos que el coste efectivo de una deuda cara. Por eso la comparación no es solo qué rentabilidad espero, sino qué riesgo asumo para intentar superar una obligación que ya tiene coste cierto.",
    remove: "Eliminar",
    scenarioPayment: "Pago usado en escenario",
    selectedMethod: "Método para la simulación",
    selectedMethodCopy: "Este método se usa para estimar el ahorro por pagos adicionales y abonos extraordinarios.",
    simulationNotViableCopy: "Antes de estimar ahorros por pagos adicionales, conviene resolver el déficit o la brecha frente a mínimos. La simulación puede ordenar escenarios, pero no vuelve viable un flujo que no alcanza.",
    snowball: "Bola de nieve",
    snowballBody: "Prioriza primero la deuda con menor saldo pendiente.",
    snowballPriority: "menor saldo pendiente",
    fastestMethod: "Método más rápido",
    avalanchePriority: "mayor costo anual ajustado",
    estimatedFees: "Costos/comisiones estimados",
    estimatedInterest: "Intereses estimados",
    totalDebt: "Deuda total",
    totalCost: "Intereses y costos estimados",
    weightedCost: "Costo anual ponderado",
    debtToLiquidity: "Deuda / patrimonio líquido",
    fragileCopy: "Una deuda puede parecer razonable por tasa o propósito, pero volverse frágil si consume demasiado flujo mensual, reduce liquidez o impide construir margen de seguridad.",
    fixedAndMinimumsNote: "Este ratio asume que los gastos fijos no incluyen pagos mínimos de deuda. Si ya los incluiste, lee este dato con cautela.",
    metricInfo: {
      debtToLiquidity: "Compara lo que debes con tu base líquida disponible. Ayuda a ver si la deuda pesa mucho frente a tu colchón.",
      emergencyMonths: "Cuánto tiempo podrías cubrir gastos básicos sin ingresos.",
      estimatedMargin: "El aire que queda después de gastos y deuda. Si es negativo, el plan está apretado.",
      fixedAndDebt: "Qué parte del ingreso se va en gastos recurrentes y mínimos de deuda. Si ya contaste mínimos en gastos, léelo con cautela.",
      minimums: "Lo mínimo exigido al mes para no atrasarse.",
      minimumsToIncome: "Qué parte de tu ingreso mensual se va solo en pagos mínimos.",
      totalDebt: "Todo lo que todavía está pendiente según las deudas escritas.",
      weightedCost: "Una referencia del costo promedio de tus deudas. Si es alto, invertir tiene que competir contra una deuda cara.",
    },
    namingCopy: "El punto no es etiquetar la deuda por su nombre, sino valorar si es manejable o frágil según su tasa, flujo, liquidez y margen de seguridad.",
    sameMethodsCopy: "Con los datos actuales, ambos métodos producen el mismo resultado porque no hay excedente sobre pagos mínimos o porque el orden práctico de liquidación no cambia.",
    sustainability: "Sostenibilidad del flujo",
    sustainableCopy: "El ingreso cubre gastos y el pago de deuda, y el pago mensual alcanza los mínimos.",
    sustainableTitle: "Escenario sostenible",
    tightCopy: "El escenario cubre los mínimos, pero el margen es frágil. En esta zona, una deuda que parecía manejable puede volverse problemática si aparece un gasto inesperado, baja el ingreso o se usa nueva deuda para sostener consumo.",
    tightTitle: "Escenario ajustado",
    tradeoffCopy: "Avalancha tiende a buscar menor coste financiero. Bola de nieve puede dar primeras victorias más rápidas si eso ayuda a sostener el hábito.",
    fragileDebtCopy: "Una deuda puede haber nacido con un propósito razonable, como educación, negocio, vivienda o liquidez, y aun así volverse riesgosa si empieza a absorber demasiado flujo mensual. La calidad de una deuda no depende solo del motivo inicial, también de si el flujo la puede sostener.",
    warning: "Advertencia",
  },
  en: {
    addDebt: "Add debt",
    addExtraContribution: "Add extra principal payment",
    adjustedCost: "Adjusted annual cost",
    amount: "Amount",
    avalanche: "Avalanche",
    avalancheBody: "Prioritizes the debt with the highest adjusted annual cost first.",
    avalanchePriority: "highest adjusted annual cost",
    availableDebtPayment: "Monthly debt payment",
    availableDebtPaymentHelp:
      "Use the total amount you can allocate to debt this month. It should include minimum payments. If you already included minimum payments inside fixed expenses, do not mentally double count them: this field is used for the payoff simulation.",
    balance: "Outstanding balance",
    baseline: "Starting point",
    cashAfterDebtPlan: "Margin after debt plan",
    compare: "Difference between methods",
    costAndFeesDifference: "Interest + costs difference",
    currentPayment: "Current monthly payment",
    cheapestMethod: "Cheapest method",
    debtName: "Name",
    debtSingular: "Debt",
    debts: "Debt",
    debtType: "Type",
    debtLoadAttention: "Attention zone: above the educational 30% threshold.",
    debtLoadHighFragility: "Alert: minimums consume more than half of net income.",
    debtLoadHighPressure: "High pressure: minimums consume an elevated share of net income.",
    debtLoadManageable: "Within a more manageable range.",
    debtLoadStrongAlert: "Strong alert: minimums represent a very high share of net income.",
    deficitCopy: "If a person spends and owes more than they earn, the first step is not choosing a payoff strategy. The first step is closing the deficit: adjusting expenses, seeking additional income, renegotiating obligations, selling assets if there is no other exit, or reviewing legal alternatives with a professional. This is not financial or legal advice.",
    deficitTitle: "Monthly deficit",
    disclaimer: "This tool is educational. It does not replace financial, legal, tax, or insolvency advice.",
    emergencyFund: "Emergency fund",
    emergencyMonths: "Emergency fund months",
    estimatedMargin: "Estimated monthly margin",
    estimatedSavings: "Estimated savings",
    extraContributionExamples: "Examples: severance, annual bonus, vacation payout, bonus, asset sale, tax refund, or other extraordinary income.",
    extraContributionImpact: "Estimated impact of extra payments",
    extraContributionMonth: "Month",
    extraContributionName: "Optional label",
    extraContributionNote: "Extra principal payments usually have more impact when they reduce principal on expensive debt. The difference shows up in future interest that stops accruing.",
    extraContributionSavings: "Additional savings from extra payments",
    extraMargin: "Monthly margin available",
    extraMarginBody: "After fixed expenses and monthly debt payment, there is room left in the month. One educational possibility is using part of that margin to increase payments and reduce interest; another is building an emergency fund or investing prudently.",
    extraMarginExample: "If you use part of this margin to increase payments, you could reduce interest.",
    extraPayment: "Extra above minimums",
    fixedAndDebt: "Fixed expenses + minimums / income",
    fixedExpenses: "Monthly fixed expenses",
    firstDebt: "First prioritized debt",
    financialTotal: "Estimated financial total",
    fixedMonthlyIncrease: "Fixed monthly increase",
    income: "Monthly net income",
    liquidity: "Liquid net worth",
    minimumPayment: "Monthly minimum payment",
    minimumPaymentGap: "Gap versus minimums",
    minimums: "Total minimum payment",
    minimumsOnlyCopy: "Your monthly payment exactly covers the minimums. In this case, avalanche and snowball can look the same because there is not yet extra money to prioritize one debt over another.",
    minimumsOnlySuggestion: "To see a difference between methods, increase the monthly payment or add an extra principal payment.",
    minimumsOnlyTitle: "No extra above minimums",
    minimumsToIncome: "Minimums / net income",
    monthlyCashAfterExpenses: "Cash before debt",
    monthlyFee: "Monthly insurance/fee",
    months: "Estimated months",
    monthsAhead: "Months earlier",
    newPayment: "New monthly payment",
    paidOffMonth: "Payoff month",
    noDebts: "Add at least one debt with balance to see comparable references.",
    noExtraContributions: "Add an extra principal payment to estimate its impact.",
    noViablePlanCopy: "The available monthly payment does not cover minimums. Before comparing strategies, the scenario needs expense adjustments, more income, payment renegotiation, or professional review.",
    noViablePlanTitle: "Before comparing methods",
    estimatedLiquidation: "Estimated liquidation",
    order: "Method priority",
    payoffComparisonCopy:
      "In this scenario, the simulation helps compare cost and time without turning the result into personalized advice.",
    payoffFlowWarning: "Comparing methods helps organize payments, but it does not replace cash-flow analysis. If minimums already consume too much income, the main issue may be payment capacity, not only payment order.",
    plannedDebtToIncome: "Plan payment / net income",
    paymentIncrease: "How much do I save if I pay more?",
    paymentIncreaseCopy: "This saving does not come from magic. It comes from reducing the time during which debt continues charging interest.",
    payoffSequence: "Method priority",
    principalPaid: "Principal paid",
    priorityReason: "Reason",
    pressure: "Monthly pressure",
    rate: "Annual rate %",
    reading: "Educational read",
    references: "Comparable minimum return",
    referencesText: "For an investment to compete with this debt, it would need to exceed this reference with enough margin, after costs, taxes and risk.",
    referencesRiskNote: "Equity investments can lose part or all of their capital. And many fixed-income alternatives often yield less than the effective cost of expensive debt. So the comparison is not only what return I expect, but what risk I take to beat an obligation with a known cost.",
    remove: "Remove",
    scenarioPayment: "Scenario payment",
    selectedMethod: "Simulation method",
    selectedMethodCopy: "This method is used to estimate savings from additional payments and extra principal payments.",
    simulationNotViableCopy: "Before estimating savings from additional payments, the deficit or minimum-payment gap needs attention. The simulation can organize scenarios, but it does not make an insufficient cash flow viable.",
    snowball: "Snowball",
    snowballBody: "Prioritizes the debt with the lowest outstanding balance first.",
    snowballPriority: "lowest outstanding balance",
    fastestMethod: "Fastest method",
    estimatedFees: "Estimated costs/fees",
    estimatedInterest: "Estimated interest",
    totalDebt: "Total debt",
    totalCost: "Estimated interest and costs",
    weightedCost: "Weighted annual cost",
    debtToLiquidity: "Debt / liquid net worth",
    fragileCopy: "A debt can look reasonable because of rate or purpose, but become fragile if it consumes too much monthly cash flow, reduces liquidity, or blocks a margin of safety.",
    fixedAndMinimumsNote: "This ratio assumes fixed expenses do not already include debt minimums. If you included them there, read this figure with caution.",
    metricInfo: {
      debtToLiquidity: "Compares what is owed with the available liquid base. It helps show whether debt is heavy relative to the cushion.",
      emergencyMonths: "How long you could cover basic expenses without income.",
      estimatedMargin: "The room left after expenses and debt. If it is negative, the monthly plan is tight.",
      fixedAndDebt: "How much of income goes to recurring expenses and debt minimums. If you already counted minimums inside expenses, read it with caution.",
      minimums: "The minimum you need to pay each month to avoid falling behind.",
      minimumsToIncome: "How much of monthly income goes only to minimum payments.",
      totalDebt: "Everything still outstanding based on the debts entered.",
      weightedCost: "A reference for the average cost of your debt. If it is high, investing has to compete with expensive debt.",
    },
    namingCopy: "The point is not to label debt as good or bad by name. The point is to look at rate, cash flow, liquidity and fragility.",
    sameMethodsCopy: "With the current inputs, both methods produce the same result because there is no extra above minimum payments or because the practical payoff order does not change.",
    sustainability: "Cash-flow sustainability",
    sustainableCopy: "Income covers expenses and the debt payment, and the monthly payment reaches the minimums.",
    sustainableTitle: "Sustainable scenario",
    tightCopy: "The scenario covers minimums, but the margin is fragile. In this zone, debt that looked manageable can become problematic if an unexpected expense appears, income falls, or new debt is used to sustain consumption.",
    tightTitle: "Tight scenario",
    tradeoffCopy: "Avalanche tends to seek lower financial cost. Snowball may deliver earlier wins if that helps maintain the habit.",
    fragileDebtCopy: "A debt may have started with a reasonable purpose, such as education, business, housing, or liquidity, and still become risky if it begins absorbing too much monthly cash flow. Debt quality does not depend only on the initial reason, but also on whether cash flow can sustain it.",
    warning: "Warning",
  },
};

const initialProfile: DebtProfileInput = {
  availableDebtPayment: 0,
  emergencyFund: 0,
  fixedMonthlyExpenses: 0,
  liquidNetWorth: 0,
  monthlyNetIncome: 0,
};

function emptyDebt(id = "debt-1"): DebtInput {
  return {
    annualRate: 0,
    balance: 0,
    id,
    minimumPayment: 0,
    monthlyFee: 0,
    name: "",
    type: "card",
  };
}

function emptyExtraContribution(id = "extra-1"): ExtraContributionInput {
  return {
    amount: 0,
    id,
    label: "",
    monthNumber: 1,
  };
}

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

function percentInputToNumber(raw: string) {
  const normalized = raw.replace(",", ".").replace(/[^\d.]/g, "");
  const parts = normalized.split(".");
  const cleaned = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("")}` : parts[0];
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "USD",
  }).format(value);
}

function pendingLabel(locale: Locale) {
  return locale === "es" ? "Completa datos" : "Complete data";
}

function formatPercent(value: number | null, locale: Locale) {
  if (value === null) return pendingLabel(locale);
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value);
}

function formatAnnualPercent(value: number | null, locale: Locale) {
  if (value === null) return pendingLabel(locale);
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    maximumFractionDigits: 1,
  }).format(value) + "%";
}

function formatMonths(months: number | null, locale: Locale) {
  if (months === null) return pendingLabel(locale);
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) return locale === "es" ? `${remainingMonths} meses` : `${remainingMonths} months`;
  return locale === "es" ? `${years} años ${remainingMonths} meses` : `${years} years ${remainingMonths} months`;
}

function readingLabel(label: string, locale: Locale) {
  const labels: Record<string, Record<Locale, string>> = {
    "Fragile margin": { es: "Margen frágil", en: "Fragile margin" },
    "High pressure": { es: "Presión alta", en: "High pressure" },
    "Insufficient income data": { es: "Datos de ingreso insuficientes", en: "Insufficient income data" },
    "Low/moderate pressure": { es: "Presión baja/moderada", en: "Low/moderate pressure" },
    "More margin": { es: "Mayor margen", en: "More margin" },
    "Narrow margin": { es: "Margen estrecho", en: "Narrow margin" },
    "Partial base": { es: "Base parcial", en: "Partial base" },
    "Reasonable margin": { es: "Margen razonable", en: "Reasonable margin" },
    "Reasonable base": { es: "Base razonable", en: "Reasonable base" },
    "Relevant pressure": { es: "Presión relevante", en: "Relevant pressure" },
    "Strong fund": { es: "Fondo fuerte", en: "Strong fund" },
    Vulnerable: { es: "Vulnerable", en: "Vulnerable" },
  };
  return labels[label]?.[locale] ?? label;
}

function emergencyFundCopy(months: number | null, locale: Locale) {
  const baseCopy = locale === "es"
    ? "El fondo de emergencia evita que una sorpresa te obligue a endeudarte más o vender inversiones en mal momento. Como referencia educativa, 6 meses suele ser una base prudente. Si tus ingresos son variables, tienes familia a cargo o negocio propio, acercarte a 12 meses da más margen."
    : "An emergency fund helps prevent a surprise from forcing you to borrow more or sell investments at a bad time. As an educational reference, 6 months is often a prudent base. If your income is variable, you support family, or you run your own business, moving closer to 12 months gives more margin.";

  if (months === null) return baseCopy;

  if (months < 3) {
    return locale === "es"
      ? `${baseCopy} En tu caso, cubre menos de 3 meses: es una zona vulnerable.`
      : `${baseCopy} In your case, it covers less than 3 months: that is a vulnerable zone.`;
  }

  if (months < 6) {
    return locale === "es"
      ? `${baseCopy} En tu caso, tienes una base parcial entre 3 y 6 meses.`
      : `${baseCopy} In your case, you have a partial base between 3 and 6 months.`;
  }

  if (months < 12) {
    return locale === "es"
      ? `${baseCopy} En tu caso, tienes una base razonable entre 6 y 12 meses.`
      : `${baseCopy} In your case, you have a reasonable base between 6 and 12 months.`;
  }

  return locale === "es"
    ? `${baseCopy} En tu caso, tienes un margen fuerte de 12 meses o más.`
    : `${baseCopy} In your case, you have a strong margin of 12 months or more.`;
}

function warningText(warning: string | null, locale: Locale) {
  if (warning === null) return null;
  const warnings: Record<string, Record<Locale, string>> = {
    "Available monthly payment does not cover minimum payments.": {
      es: "El pago mensual disponible no cubre los pagos mínimos.",
      en: "Available monthly payment does not cover minimum payments.",
    },
    "Debt balance is not declining in a stable way under this payment scenario.": {
      es: "El saldo no baja de forma estable bajo este escenario de pago.",
      en: "Debt balance is not declining in a stable way under this payment scenario.",
    },
    "Scenario did not finish within 600 months.": {
      es: "El escenario no termina dentro del límite de 600 meses.",
      en: "Scenario did not finish within 600 months.",
    },
  };
  return warnings[warning]?.[locale] ?? warning;
}

function methodName(method: "avalanche" | "snowball", locale: Locale) {
  if (method === "avalanche") return copy[locale].avalanche;
  return copy[locale].snowball;
}

function priorityReasonText(reason: "highest-adjusted-cost" | "lowest-balance", locale: Locale) {
  return reason === "highest-adjusted-cost" ? copy[locale].avalanchePriority : copy[locale].snowballPriority;
}

function planForMethod(result: DebtPlanResult, method: PayoffMethod) {
  return method === "avalanche" ? result.avalanche : result.snowball;
}

function plansAreEquivalent(avalanche: PayoffPlan, snowball: PayoffPlan) {
  return (
    avalanche.months === snowball.months &&
    Math.abs(avalanche.totalInterestAndFees - snowball.totalInterestAndFees) < 0.01 &&
    Math.abs(avalanche.estimatedTotalPayment - snowball.estimatedTotalPayment) < 0.01
  );
}

function formatMonthDifference(value: number | null, locale: Locale) {
  if (value === null) return pendingLabel(locale);
  return `${Math.max(0, value)} ${locale === "es" ? "meses" : "months"}`;
}

function debtLoadText(status: DebtPlanResult["summary"]["debtLoadStatus"], locale: Locale) {
  const labels = copy[locale];
  if (status === "manageable") return labels.debtLoadManageable;
  if (status === "attention") return labels.debtLoadAttention;
  if (status === "high-pressure") return labels.debtLoadHighPressure;
  if (status === "high-fragility") return labels.debtLoadHighFragility;
  if (status === "strong-alert") return labels.debtLoadStrongAlert;
  return locale === "es" ? "Carga de deuda pendiente de calcular." : "Debt load pending calculation.";
}

function debtLoadTone(status: DebtPlanResult["summary"]["debtLoadStatus"]): "normal" | "attention" | "warning" | "alert" {
  if (status === "manageable" || status === "incomplete") return "normal";
  if (status === "attention") return "attention";
  if (status === "high-pressure") return "warning";
  return "alert";
}

function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        aria-label={text}
        className="flex size-5 items-center justify-center rounded-full border border-line bg-white text-[11px] font-bold text-muted outline-none transition hover:border-petrol hover:text-petrol focus:border-petrol focus:text-petrol"
        title={text}
        type="button"
      >
        i
      </button>
      <span className="pointer-events-none absolute right-0 top-7 z-10 w-60 border border-line bg-white p-3 text-xs font-normal leading-5 text-muted opacity-0 shadow-[0_12px_28px_rgba(11,52,54,0.12)] transition group-hover:opacity-100 group-focus-within:opacity-100">
        {text}
      </span>
    </span>
  );
}

function MoneyField({
  info,
  label,
  locale,
  onChange,
  value,
}: {
  info?: string;
  label: string;
  locale: Locale;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
        {info ? <InfoTip text={info} /> : null}
      </span>
      <input
        className="rounded-[4px] border border-line bg-white/80 px-2.5 py-2 text-sm font-semibold text-ink outline-none transition focus:border-petrol focus:bg-white"
        inputMode="numeric"
        onChange={(event) => onChange(moneyInputToNumber(event.target.value))}
        type="text"
        value={formatMoneyInput(value, locale)}
      />
    </label>
  );
}

function NumberField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
      <input
        className="rounded-[4px] border border-line bg-white/80 px-2.5 py-2 text-sm font-semibold text-ink outline-none transition focus:border-petrol focus:bg-white"
        inputMode="numeric"
        min={1}
        onChange={(event) => onChange(Math.max(1, Math.round(moneyInputToNumber(event.target.value))))}
        type="text"
        value={formatMoneyInput(value, "en")}
      />
    </label>
  );
}

function RateField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  const [draft, setDraft] = useState({
    sourceValue: value,
    text: String(value),
  });
  const draftValue = draft.sourceValue === value ? draft.text : String(value);

  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
      <input
        className="rounded-[4px] border border-line bg-white/80 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol focus:bg-white"
        inputMode="decimal"
        onChange={(event) => {
          const nextValue = percentInputToNumber(event.target.value);
          setDraft({ sourceValue: nextValue, text: event.target.value });
          onChange(nextValue);
        }}
        type="text"
        value={draftValue}
      />
    </label>
  );
}

function Metric({
  helper,
  info,
  label,
  tone = "normal",
  value,
}: {
  helper?: string;
  info?: string;
  label: string;
  tone?: "normal" | "attention" | "warning" | "alert";
  value: string;
}) {
  const toneClass =
    tone === "alert" ? "border-brass/50 bg-[#f7f0e2]" :
    tone === "warning" ? "border-brass/35 bg-white" :
    tone === "attention" ? "border-petrol/25 bg-white" :
    "border-line bg-panelSoft";

  return (
    <div className={`border px-3 py-3 ${toneClass}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
        {info ? <InfoTip text={info} /> : null}
      </div>
      <p className="mt-2 text-lg font-semibold leading-6 text-ink">{value}</p>
      {helper ? <p className="mt-2 text-xs leading-5 text-muted">{helper}</p> : null}
    </div>
  );
}

function PlanCard({ locale, plan, text }: { locale: Locale; plan: PayoffPlan; text: string }) {
  const labels = copy[locale];
  const warning = warningText(plan.warning, locale);

  return (
    <article className="border border-line bg-white/75 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold leading-tight text-ink">
            {plan.method === "avalanche" ? labels.avalanche : labels.snowball}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
        </div>
        {warning ? <span className="rounded-[4px] border border-brass/35 bg-[#f7f0e2] px-2.5 py-1 text-xs font-semibold text-brass">{labels.warning}</span> : null}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Metric label={labels.months} value={formatMonths(plan.months, locale)} />
        <Metric label={labels.principalPaid} value={formatMoney(plan.initialPrincipal, locale)} />
        <Metric label={labels.estimatedInterest} value={formatMoney(plan.estimatedInterestCost, locale)} />
        <Metric label={labels.estimatedFees} value={formatMoney(plan.estimatedFeeCost, locale)} />
        <Metric label={labels.totalCost} value={formatMoney(plan.totalInterestAndFees, locale)} />
        <Metric label={labels.financialTotal} value={formatMoney(plan.estimatedTotalPayment, locale)} />
        <Metric label={labels.firstDebt} value={plan.firstDebtName ?? pendingLabel(locale)} />
        <Metric label={labels.order} value={plan.order.length > 0 ? plan.order.join(" -> ") : pendingLabel(locale)} />
      </div>
      {plan.prioritySequence.length > 0 ? (
        <div className="mt-4 border border-line bg-panelSoft p-3">
          <p className="text-sm font-semibold text-ink">{labels.payoffSequence}</p>
          <div className="mt-3 grid gap-2">
            {plan.prioritySequence.map((step, index) => (
              <div key={step.id} className="grid gap-1 border-t border-line pt-2 text-sm leading-6 text-muted first:border-t-0 first:pt-0 md:grid-cols-[1fr_auto] md:items-start">
                <div>
                  <p className="font-semibold text-ink">{index + 1}. {step.name}</p>
                  <p>
                    {labels.balance}: <span className="font-semibold text-ink">{formatMoney(step.initialBalance, locale)}</span>
                  </p>
                  <p>
                    {labels.minimumPayment}: <span className="font-semibold text-ink">{formatMoney(step.minimumPayment, locale)}</span>
                  </p>
                </div>
                <div className="md:text-right">
                  <p>
                    {labels.rate}: <span className="font-semibold text-ink">{formatAnnualPercent(step.annualRate, locale)}</span>
                  </p>
                  <p>
                    {labels.adjustedCost}: <span className="font-semibold text-ink">{formatAnnualPercent(step.adjustedAnnualCost, locale)}</span>
                  </p>
                  <p>
                    {labels.priorityReason}: <span className="font-semibold text-ink">{priorityReasonText(step.priorityReason, locale)}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {plan.liquidationSequence.length > 0 ? (
        <div className="mt-3 border border-line bg-white/70 p-3">
          <p className="text-sm font-semibold text-ink">{labels.estimatedLiquidation}</p>
          <div className="mt-3 grid gap-2">
            {plan.liquidationSequence.map((step, index) => (
              <div key={step.id} className="flex flex-col gap-1 border-t border-line pt-2 text-sm leading-6 text-muted first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-semibold text-ink">{index + 1}. {step.name}</p>
                <p>
                    {labels.paidOffMonth}: <span className="font-semibold text-ink">{step.payoffMonth === null ? pendingLabel(locale) : step.payoffMonth}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {warning ? <p className="mt-4 border-l border-brass/60 pl-3 text-sm leading-6 text-muted">{warning}</p> : null}
    </article>
  );
}

function PlanDifference({ locale, result }: { locale: Locale; result: DebtPlanResult }) {
  const labels = copy[locale];
  const { avalanche, snowball } = result;
  const sameResult = plansAreEquivalent(avalanche, snowball);
  const monthDifference = avalanche.months !== null && snowball.months !== null ? snowball.months - avalanche.months : null;
  const costDifference = snowball.totalInterestAndFees - avalanche.totalInterestAndFees;
  const cheapestMethod =
    avalanche.months === null || snowball.months === null ? pendingLabel(locale) :
    Math.abs(costDifference) < 0.01 ? (locale === "es" ? "Empate" : "Tie") :
    costDifference > 0 ? methodName("avalanche", locale) :
    methodName("snowball", locale);
  const fastestMethod =
    avalanche.months === null || snowball.months === null ? pendingLabel(locale) :
    snowball.months === avalanche.months ? (locale === "es" ? "Empate" : "Tie") :
    snowball.months > avalanche.months ? methodName("avalanche", locale) :
    methodName("snowball", locale);

  return (
    <div className="border border-line bg-panelSoft p-4">
      <p className="text-sm font-semibold text-ink">{labels.compare}</p>
      {sameResult ? (
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{labels.sameMethodsCopy}</p>
      ) : (
        <>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-muted md:grid-cols-2">
            <p>{labels.months}: <span className="font-semibold text-ink">{monthDifference === null ? pendingLabel(locale) : `${Math.abs(monthDifference)} ${locale === "es" ? "meses" : "months"}`}</span></p>
            <p>{labels.costAndFeesDifference}: <span className="font-semibold text-ink">{avalanche.months === null || snowball.months === null ? pendingLabel(locale) : formatMoney(Math.abs(costDifference), locale)}</span></p>
            <p>{labels.cheapestMethod}: <span className="font-semibold text-ink">{cheapestMethod}</span></p>
            <p>{labels.fastestMethod}: <span className="font-semibold text-ink">{fastestMethod}</span></p>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{labels.tradeoffCopy}</p>
        </>
      )}
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{labels.payoffComparisonCopy}</p>
    </div>
  );
}

export function DebtPlanner({ locale }: { locale: Locale }) {
  const labels = copy[locale];
  const [profile, setProfile] = useState<DebtProfileInput>(initialProfile);
  const [debts, setDebts] = useState<DebtInput[]>([emptyDebt()]);
  const [extraContributions, setExtraContributions] = useState<ExtraContributionInput[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PayoffMethod>("avalanche");
  const [paymentScenario, setPaymentScenario] = useState({ fixedMonthlyIncrease: 0, newDebtPayment: 0 });
  const baselineResult = useMemo(() => calculateDebtPlan(profile, debts), [profile, debts]);
  const result = useMemo(() => calculateDebtPlan(profile, debts, { extraContributions }), [profile, debts, extraContributions]);
  const targetDebtPayment = Math.max(
    profile.availableDebtPayment,
    paymentScenario.newDebtPayment,
    profile.availableDebtPayment + paymentScenario.fixedMonthlyIncrease,
  );
  const higherPaymentResult = useMemo(
    () => calculateDebtPlan({ ...profile, availableDebtPayment: targetDebtPayment }, debts, { extraContributions }),
    [debts, extraContributions, profile, targetDebtPayment],
  );
  const selectedCurrentPlan = planForMethod(result, selectedMethod);
  const selectedBaselinePlan = planForMethod(baselineResult, selectedMethod);
  const selectedHigherPaymentPlan = planForMethod(higherPaymentResult, selectedMethod);
  const monthlyPaymentHasIncrease = targetDebtPayment > profile.availableDebtPayment;
  const paymentSavings = monthlyPaymentHasIncrease && selectedCurrentPlan.months !== null && selectedHigherPaymentPlan.months !== null
    ? Math.max(0, selectedCurrentPlan.totalInterestAndFees - selectedHigherPaymentPlan.totalInterestAndFees)
    : null;
  const paymentMonthsAhead = monthlyPaymentHasIncrease && selectedCurrentPlan.months !== null && selectedHigherPaymentPlan.months !== null
    ? Math.max(0, selectedCurrentPlan.months - selectedHigherPaymentPlan.months)
    : null;
  const contributionSavings = selectedBaselinePlan.months !== null && selectedCurrentPlan.months !== null
    ? Math.max(0, selectedBaselinePlan.totalInterestAndFees - selectedCurrentPlan.totalInterestAndFees)
    : null;
  const contributionMonthsAhead = selectedBaselinePlan.months !== null && selectedCurrentPlan.months !== null
    ? Math.max(0, selectedBaselinePlan.months - selectedCurrentPlan.months)
    : null;
  const showPlanComparison = result.summary.sustainabilityStatus !== "deficit" && result.summary.payoffStatus !== "below-minimums";
  const simulationIsViable = showPlanComparison;
  const samePlanResult = plansAreEquivalent(result.avalanche, result.snowball);

  function updateProfile(field: keyof DebtProfileInput, value: number) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function updateDebt(id: string, patch: Partial<DebtInput>) {
    setDebts((current) => current.map((debt) => debt.id === id ? { ...debt, ...patch } : debt));
  }

  function addDebt() {
    setDebts((current) => [...current, emptyDebt(`debt-${current.length + 1}-${Date.now()}`)]);
  }

  function removeDebt(id: string) {
    setDebts((current) => current.length <= 1 ? [emptyDebt()] : current.filter((debt) => debt.id !== id));
  }

  function addExtraContribution() {
    setExtraContributions((current) => [...current, emptyExtraContribution(`extra-${current.length + 1}-${Date.now()}`)]);
  }

  function updateExtraContribution(id: string, patch: Partial<ExtraContributionInput>) {
    setExtraContributions((current) => current.map((contribution) => contribution.id === id ? { ...contribution, ...patch } : contribution));
  }

  function removeExtraContribution(id: string) {
    setExtraContributions((current) => current.filter((contribution) => contribution.id !== id));
  }

  return (
    <div className="mt-8 grid gap-6">
      <section className="technical-surface rounded-[6px] border border-petrol/20 p-4 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">01</p>
        <h2 className="mt-2 text-xl font-semibold leading-tight text-ink">{labels.baseline}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <MoneyField label={labels.liquidity} locale={locale} onChange={(value) => updateProfile("liquidNetWorth", value)} value={profile.liquidNetWorth} />
          <MoneyField label={labels.income} locale={locale} onChange={(value) => updateProfile("monthlyNetIncome", value)} value={profile.monthlyNetIncome} />
          <MoneyField label={labels.fixedExpenses} locale={locale} onChange={(value) => updateProfile("fixedMonthlyExpenses", value)} value={profile.fixedMonthlyExpenses} />
          <MoneyField label={labels.emergencyFund} locale={locale} onChange={(value) => updateProfile("emergencyFund", value)} value={profile.emergencyFund} />
          <MoneyField
            info={labels.availableDebtPaymentHelp}
            label={labels.availableDebtPayment}
            locale={locale}
            onChange={(value) => updateProfile("availableDebtPayment", value)}
            value={profile.availableDebtPayment}
          />
        </div>
      </section>

      <section className="rounded-[6px] border border-line bg-panel p-4 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">02</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{labels.debts}</h2>
          </div>
          <button type="button" onClick={addDebt} className="w-fit rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol">
            {labels.addDebt}
          </button>
        </div>
        <div className="mt-5 grid gap-4">
          <datalist id={`debt-name-suggestions-${locale}`}>
            {debtNameSuggestions[locale].map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
          {debts.map((debt, index) => (
            <div key={debt.id} className="rounded-[6px] border border-line bg-white/70 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-ink">{labels.debtSingular} {index + 1}</p>
                <button type="button" onClick={() => removeDebt(debt.id)} className="rounded-[4px] border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-petrol hover:text-petrol">
                  {labels.remove}
                </button>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
                <label className="grid gap-2 lg:col-span-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{labels.debtName}</span>
                  <input
                    autoComplete="off"
                    className="rounded-[4px] border border-line bg-white/80 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol focus:bg-white"
                    list={`debt-name-suggestions-${locale}`}
                    onChange={(event) => updateDebt(debt.id, { name: event.target.value })}
                    placeholder={locale === "es" ? "Ej. tarjeta principal" : "E.g. main card"}
                    type="text"
                    value={debt.name}
                  />
                </label>
                <div className="lg:col-span-2">
                  <MoneyField label={labels.balance} locale={locale} onChange={(value) => updateDebt(debt.id, { balance: value })} value={debt.balance} />
                </div>
                <div className="lg:col-span-2">
                  <RateField label={labels.rate} onChange={(value) => updateDebt(debt.id, { annualRate: value })} value={debt.annualRate} />
                </div>
                <div className="lg:col-span-2">
                  <MoneyField label={labels.minimumPayment} locale={locale} onChange={(value) => updateDebt(debt.id, { minimumPayment: value })} value={debt.minimumPayment} />
                </div>
                <div className="lg:col-span-2">
                  <MoneyField label={labels.monthlyFee} locale={locale} onChange={(value) => updateDebt(debt.id, { monthlyFee: value })} value={debt.monthlyFee} />
                </div>
                <label className="grid gap-2 lg:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{labels.debtType}</span>
                  <select
                    className="rounded-[4px] border border-line bg-white/80 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol focus:bg-white"
                    onChange={(event) => updateDebt(debt.id, { type: event.target.value as DebtKind })}
                    value={debt.type}
                  >
                    {debtTypes.map((type) => (
                      <option key={type.value} value={type.value}>{type.label[locale]}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[6px] border border-line bg-panel p-4 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">03</p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{locale === "es" ? "Resultados" : "Results"}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric info={labels.metricInfo.totalDebt} label={labels.totalDebt} value={formatMoney(result.summary.totalDebt, locale)} />
          <Metric info={labels.metricInfo.minimums} label={labels.minimums} value={formatMoney(result.summary.monthlyMinimums, locale)} />
          <Metric info={labels.metricInfo.weightedCost} label={labels.weightedCost} value={formatAnnualPercent(result.summary.weightedAnnualCost, locale)} />
          <Metric info={labels.metricInfo.debtToLiquidity} label={labels.debtToLiquidity} value={formatPercent(result.summary.debtToLiquidNetWorth, locale)} />
          <Metric
            helper={debtLoadText(result.summary.debtLoadStatus, locale)}
            info={labels.metricInfo.minimumsToIncome}
            label={labels.minimumsToIncome}
            tone={debtLoadTone(result.summary.debtLoadStatus)}
            value={formatPercent(result.summary.minimumsToIncome, locale)}
          />
          <Metric label={labels.plannedDebtToIncome} tone={debtLoadTone(result.summary.debtLoadStatus)} value={formatPercent(result.summary.plannedDebtToIncomeRatio, locale)} />
          <Metric info={labels.metricInfo.fixedAndDebt} label={labels.fixedAndDebt} value={formatPercent(result.summary.fixedAndMinimumsToIncome, locale)} />
          <Metric info={labels.metricInfo.estimatedMargin} label={labels.estimatedMargin} value={formatMoney(result.summary.estimatedMonthlyMargin, locale)} />
          <Metric info={labels.metricInfo.emergencyMonths} label={labels.emergencyMonths} value={result.summary.emergencyFundMonths === null ? pendingLabel(locale) : result.summary.emergencyFundMonths.toFixed(1)} />
          <Metric label={labels.monthlyCashAfterExpenses} value={formatMoney(result.summary.monthlyCashAfterExpenses, locale)} />
          <Metric label={labels.minimumPaymentGap} value={formatMoney(result.summary.minimumPaymentGap, locale)} />
          <Metric label={labels.extraPayment} value={formatMoney(Math.max(0, result.summary.minimumPaymentGap), locale)} />
          <Metric label={labels.cashAfterDebtPlan} value={formatMoney(result.summary.cashAfterDebtPlan, locale)} />
        </div>
        <p className="mt-4 max-w-3xl border-l border-line pl-3 text-xs leading-5 text-muted">{labels.fixedAndMinimumsNote}</p>
        <div className={`mt-4 border p-4 ${
          result.summary.sustainabilityStatus === "deficit"
            ? "border-brass/40 bg-[#f7f0e2]"
            : result.summary.debtLoadStatus === "strong-alert" || result.summary.debtLoadStatus === "high-fragility"
              ? "border-brass/40 bg-[#f7f0e2]"
            : result.summary.sustainabilityStatus === "tight"
              ? "border-brass/25 bg-white/70"
              : "border-petrol/20 bg-white/70"
        }`}>
          <p className="text-sm font-semibold text-ink">{labels.sustainability}</p>
          {result.summary.sustainabilityStatus === "incomplete" ? (
            <>
              <p className="mt-2 text-sm font-semibold text-ink">{readingLabel("Insufficient income data", locale)}</p>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">{locale === "es" ? "Completa ingreso, gastos y pagos mínimos para evaluar sostenibilidad mensual." : "Add income, expenses, and minimum payments to evaluate monthly sustainability."}</p>
            </>
          ) : result.summary.sustainabilityStatus === "deficit" ? (
            <>
              <p className="mt-2 text-sm font-semibold text-ink">{labels.deficitTitle}</p>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">{labels.deficitCopy}</p>
            </>
          ) : result.summary.sustainabilityStatus === "tight" ? (
            <>
              <p className="mt-2 text-sm font-semibold text-ink">{result.summary.debtLoadStatus === "strong-alert" || result.summary.debtLoadStatus === "high-fragility" ? debtLoadText(result.summary.debtLoadStatus, locale) : labels.tightTitle}</p>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">{labels.tightCopy}</p>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm font-semibold text-ink">{labels.sustainableTitle}</p>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">{labels.sustainableCopy}</p>
            </>
          )}
          {result.summary.debtLoadStatus !== "manageable" && result.summary.debtLoadStatus !== "incomplete" ? (
            <p className="mt-3 max-w-4xl border-l border-brass/50 pl-3 text-sm leading-6 text-muted">{labels.fragileDebtCopy}</p>
          ) : null}
        </div>
        {result.summary.estimatedMonthlyMargin > 0 ? (
          <div className="mt-4 border border-petrol/20 bg-white/70 p-4">
            <p className="text-sm font-semibold text-ink">{labels.extraMargin}</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{labels.extraMarginBody}</p>
            <p className="mt-2 max-w-3xl border-l border-petrol/30 pl-3 text-sm leading-6 text-muted">{labels.extraMarginExample}</p>
          </div>
        ) : null}
      </section>

      <section className="rounded-[6px] border border-line bg-panel p-4 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">04</p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{labels.references}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{labels.referencesText}</p>
        <p className="mt-3 max-w-3xl border-l border-brass/50 pl-3 text-sm leading-6 text-muted">{labels.referencesRiskNote}</p>
        {result.references.length === 0 ? (
          <p className="mt-5 border border-line bg-panelSoft px-3 py-2 text-sm text-muted">{labels.noDebts}</p>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {result.references.map((reference) => (
              <article key={reference.id} className="border border-line bg-white/75 p-4">
                <p className="text-lg font-semibold text-ink">{reference.name}</p>
                <div className="mt-3 grid gap-2 text-sm leading-6 text-muted">
                  <p>{labels.balance}: <span className="font-semibold text-ink">{formatMoney(reference.balance, locale)}</span></p>
                  <p>{labels.rate}: <span className="font-semibold text-ink">{formatAnnualPercent(reference.annualRate, locale)}</span></p>
                  <p>{labels.adjustedCost}: <span className="font-semibold text-ink">{formatAnnualPercent(reference.adjustedAnnualCost, locale)}</span></p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="rounded-[6px] border border-petrol/20 bg-white/75 p-4 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{labels.selectedMethod}</p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{labels.selectedMethodCopy}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["avalanche", "snowball"] as PayoffMethod[]).map((method) => (
            <button
              key={method}
              className={`rounded-[4px] border px-4 py-2.5 text-sm font-semibold transition ${
                selectedMethod === method
                  ? "border-petrol bg-petrol text-white"
                  : "border-line bg-white text-muted hover:border-petrol hover:text-petrol"
              }`}
              onClick={() => setSelectedMethod(method)}
              type="button"
            >
              {methodName(method, locale)}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-[6px] border border-line bg-panel p-4 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">05</p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{labels.paymentIncrease}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{labels.paymentIncreaseCopy}</p>
        {!simulationIsViable ? (
          <p className="mt-4 max-w-4xl border border-brass/40 bg-[#f7f0e2] p-4 text-sm leading-6 text-muted">{labels.simulationNotViableCopy}</p>
        ) : null}
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Metric label={labels.currentPayment} value={formatMoney(profile.availableDebtPayment, locale)} />
          <MoneyField
            label={labels.newPayment}
            locale={locale}
            onChange={(value) => setPaymentScenario((current) => ({ ...current, newDebtPayment: value }))}
            value={paymentScenario.newDebtPayment}
          />
          <MoneyField
            label={labels.fixedMonthlyIncrease}
            locale={locale}
            onChange={(value) => setPaymentScenario((current) => ({ ...current, fixedMonthlyIncrease: value }))}
            value={paymentScenario.fixedMonthlyIncrease}
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label={labels.selectedMethod} value={methodName(selectedMethod, locale)} />
          <Metric label={labels.scenarioPayment} value={simulationIsViable ? formatMoney(targetDebtPayment, locale) : pendingLabel(locale)} />
          <Metric label={labels.estimatedSavings} value={!simulationIsViable || paymentSavings === null ? pendingLabel(locale) : formatMoney(paymentSavings, locale)} />
          <Metric label={labels.monthsAhead} value={simulationIsViable ? formatMonthDifference(paymentMonthsAhead, locale) : pendingLabel(locale)} />
        </div>
      </section>

      <section className="rounded-[6px] border border-line bg-panel p-4 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">06</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{locale === "es" ? "Abonos extraordinarios" : "Extra principal payments"}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{labels.extraContributionNote}</p>
          </div>
          <button type="button" onClick={addExtraContribution} className="w-fit rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol">
            {labels.addExtraContribution}
          </button>
        </div>
        <p className="mt-3 max-w-3xl text-xs leading-5 text-muted">{labels.extraContributionExamples}</p>
        {!simulationIsViable ? (
          <p className="mt-4 max-w-4xl border border-brass/40 bg-[#f7f0e2] p-4 text-sm leading-6 text-muted">{labels.simulationNotViableCopy}</p>
        ) : null}
        <div className="mt-5 grid gap-4">
          {extraContributions.length === 0 ? (
            <p className="border border-line bg-panelSoft px-3 py-2 text-sm text-muted">{labels.noExtraContributions}</p>
          ) : (
            extraContributions.map((contribution) => (
              <div key={contribution.id} className="grid gap-4 rounded-[6px] border border-line bg-white/70 p-4 md:grid-cols-[0.5fr_1fr_1.3fr_auto] md:items-end">
                <NumberField
                  label={labels.extraContributionMonth}
                  onChange={(value) => updateExtraContribution(contribution.id, { monthNumber: value })}
                  value={contribution.monthNumber}
                />
                <MoneyField
                  label={labels.amount}
                  locale={locale}
                  onChange={(value) => updateExtraContribution(contribution.id, { amount: value })}
                  value={contribution.amount}
                />
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{labels.extraContributionName}</span>
                  <input
                    className="rounded-[4px] border border-line bg-white/80 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol focus:bg-white"
                    onChange={(event) => updateExtraContribution(contribution.id, { label: event.target.value })}
                    type="text"
                    value={contribution.label ?? ""}
                  />
                </label>
                <button type="button" onClick={() => removeExtraContribution(contribution.id)} className="rounded-[4px] border border-line bg-panel px-3 py-2.5 text-xs font-semibold text-muted transition hover:border-petrol hover:text-petrol">
                  {labels.remove}
                </button>
              </div>
            ))
          )}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label={labels.selectedMethod} value={methodName(selectedMethod, locale)} />
          <Metric label={labels.extraContributionSavings} value={!simulationIsViable || contributionSavings === null ? pendingLabel(locale) : formatMoney(contributionSavings, locale)} />
          <Metric label={labels.monthsAhead} value={simulationIsViable ? formatMonthDifference(contributionMonthsAhead, locale) : pendingLabel(locale)} />
          <Metric label={labels.extraContributionImpact} value={simulationIsViable ? formatMoney(selectedCurrentPlan.extraContributionsApplied, locale) : pendingLabel(locale)} />
        </div>
      </section>

      <section className="rounded-[6px] border border-line bg-panel p-4 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">07</p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{locale === "es" ? "Planes de pago" : "Payoff plans"}</h2>
        {result.summary.payoffStatus === "minimums-only" ? (
          <div className="mt-5 border border-brass/35 bg-[#f7f0e2] p-4">
            <p className="text-sm font-semibold text-ink">{labels.minimumsOnlyTitle}</p>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">{labels.minimumsOnlyCopy}</p>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">{labels.minimumsOnlySuggestion}</p>
          </div>
        ) : null}
        {showPlanComparison && result.summary.debtLoadStatus !== "manageable" && result.summary.debtLoadStatus !== "incomplete" ? (
          <div className="mt-5 border border-brass/35 bg-[#f7f0e2] p-4">
            <p className="text-sm font-semibold text-ink">{debtLoadText(result.summary.debtLoadStatus, locale)}</p>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">{labels.payoffFlowWarning}</p>
          </div>
        ) : null}
        {!showPlanComparison ? (
          <div className="mt-5 border border-brass/40 bg-[#f7f0e2] p-4">
            <p className="text-sm font-semibold text-ink">{labels.noViablePlanTitle}</p>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">{result.summary.sustainabilityStatus === "deficit" ? labels.deficitCopy : labels.noViablePlanCopy}</p>
          </div>
        ) : samePlanResult ? (
          <div className="mt-5 grid gap-4">
            <PlanCard locale={locale} plan={selectedCurrentPlan} text={selectedMethod === "avalanche" ? labels.avalancheBody : labels.snowballBody} />
            <PlanDifference locale={locale} result={result} />
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <PlanCard locale={locale} plan={result.avalanche} text={labels.avalancheBody} />
              <PlanCard locale={locale} plan={result.snowball} text={labels.snowballBody} />
            </div>
            <div className="mt-4">
              <PlanDifference locale={locale} result={result} />
            </div>
          </>
        )}
      </section>

      <section className="rounded-[6px] border border-petrol/20 bg-[#f3efe6] p-4 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">08</p>
        <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{labels.reading}</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Metric label={labels.pressure} value={readingLabel(result.reading.monthlyPressureLabel, locale)} />
          <Metric label={labels.fixedAndDebt} value={readingLabel(result.reading.fixedAndDebtLabel, locale)} />
          <Metric label={labels.emergencyMonths} value={readingLabel(result.reading.emergencyFundLabel, locale)} />
        </div>
        <div className="mt-5 grid gap-3 text-sm leading-6 text-muted">
          <p className="max-w-3xl">{emergencyFundCopy(result.summary.emergencyFundMonths, locale)}</p>
          <p className="max-w-3xl">{labels.fragileCopy}</p>
          <p className="max-w-3xl">{labels.namingCopy}</p>
          <p className="max-w-3xl border-l border-petrol/40 pl-3 text-xs leading-5">{labels.disclaimer}</p>
        </div>
      </section>
    </div>
  );
}
