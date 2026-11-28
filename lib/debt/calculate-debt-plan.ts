import { contractualMinimum, simulateDebtPlan, unavailablePlan, type AmortizableDebt, type ScheduledExtra } from "./amortization.ts";
import { monthlyInterest, monthlyRate, validateDebtInputs } from "./debt-input.ts";
import { assessDebtPlan } from "./interpret-debt-plan.ts";
import type { DebtInput, DebtPlanResult, DebtProfileInput, DebtReference, DebtSummary, ExtraContributionInput, PayoffPlan } from "./types.ts";

const zero = BigInt(0);
const asMinor = (value: number | null) => value === null ? null : BigInt(value);
const sum = (items: bigint[]) => items.reduce((total, value) => total + value, zero);

function ratio(a: bigint | null, b: bigint | null) {
  return a === null || b === null || b === zero ? null : Number(a) / Number(b);
}

function knownSum(values: (bigint | null)[]) {
  return values.every(value => value !== null) ? sum(values as bigint[]) : null;
}

function difference(a: bigint | null, b: bigint | null) {
  return a === null || b === null ? null : a - b;
}

function termsFromDebt(d: DebtInput, order: number): AmortizableDebt | null {
  if (d.balance === null || d.annualRate === null || d.rateType === "unknown"
    || d.minimumPayment === null || d.monthlyFee === null) return null;
  const fee = BigInt(d.monthlyFee);
  return {
    id: d.id, order, balance: BigInt(d.balance), fee,
    monthlyMinimum: BigInt(d.minimumPayment) + (d.minimumIncludesFees ? zero : fee),
    rate: monthlyRate(d.annualRate, d.rateType),
  };
}

function firstMonthMinimum(debt: DebtInput, terms: AmortizableDebt | null) {
  if (terms) {
    const exact = contractualMinimum(terms, terms.balance + monthlyInterest(terms.balance, terms.rate) + terms.fee);
    return { exact, lowerBound: exact };
  }

  // This is called only for a reported positive balance. Missing charges can add to the amount due.
  const balance = BigInt(debt.balance!);
  const knownFee = asMinor(debt.monthlyFee) ?? zero;
  const knownInterest = debt.annualRate === null || debt.rateType === "unknown"
    ? zero : monthlyInterest(balance, monthlyRate(debt.annualRate, debt.rateType));
  const dueFloor = balance + knownInterest + knownFee;
  const minimum = asMinor(debt.minimumPayment);
  // A reported fee also bounds an omitted minimum that includes it, by the input validation rule.
  const scheduledFloor = (minimum ?? zero) + (debt.minimumIncludesFees && minimum !== null ? zero : knownFee);
  const lowerBound = scheduledFloor < dueFloor ? scheduledFloor : dueFloor;
  const exact = minimum !== null && (debt.minimumIncludesFees || debt.monthlyFee !== null) && lowerBound === scheduledFloor
    ? lowerBound : null;
  return { exact, lowerBound };
}

function buildReferences(active: DebtInput[]): DebtReference[] {
  return active.map(d => {
    const annualRatePercent = d.annualRate === null || d.rateType === "unknown" ? null : d.annualRate / 10_000;
    const rate = annualRatePercent === null || d.rateType === "unknown" ? null : monthlyRate(d.annualRate!, d.rateType);
    const annualizedInterestAndFees = rate === null || d.monthlyFee === null
      ? null
      : 1200 * (Number(rate.numerator) / Number(rate.denominator) + d.monthlyFee / d.balance!);
    return {
      id: d.id, name: d.name, balance: BigInt(d.balance!), annualRatePercent, rateType: d.rateType, annualizedInterestAndFees,
    };
  });
}

function summarize(
  profile: DebtProfileInput, totalDebt: bigint | null, monthlyMinimums: bigint | null,
  references: DebtReference[], minimumBasis: DebtSummary["minimumBasis"],
  minimumsLowerBound: bigint | null, invalidExpenses = false,
): DebtSummary {
  const income = asMinor(profile.monthlyNetIncome);
  const expenses = asMinor(profile.fixedMonthlyExpenses);
  const budget = asMinor(profile.availableDebtPayment);
  const monthlyCashAfterExpenses = difference(income, expenses);
  const cashAfterDebtPlan = difference(monthlyCashAfterExpenses, budget);
  const minimumPaymentGap = difference(budget, monthlyMinimums);
  const obligations = knownSum([expenses, monthlyMinimums]);
  const minimumsToIncome = ratio(monthlyMinimums, income);
  const emergencyFundMonths = ratio(asMinor(profile.emergencyFund), obligations);
  const marginAfterMinimums = difference(monthlyCashAfterExpenses, monthlyMinimums);
  const marginAfterMinimumsUpperBound = income === null || invalidExpenses
    ? null : income - (expenses ?? zero) - (minimumsLowerBound ?? zero);
  const minimumPaymentGapUpperBound = difference(budget, minimumsLowerBound);
  const knownCapacityShortfall = marginAfterMinimumsUpperBound !== null && marginAfterMinimumsUpperBound < zero;
  return {
    ordinaryBudget: budget, minimumBasis, marginAfterMinimums,
    minimumsLowerBound, marginAfterMinimumsUpperBound, minimumPaymentGapUpperBound,
    economicCapacity: knownCapacityShortfall ? "insufficient" : marginAfterMinimums === null ? "unknown" : "sufficient",
    reservedMarginStatus: cashAfterDebtPlan === null ? "unknown" : cashAfterDebtPlan < zero ? "deficit" : "compatible",
    emergencyReserveStatus: emergencyFundMonths === null ? "unknown" : emergencyFundMonths < 3 ? "limited" : "at-reference",
    minimumMarginStatus: knownCapacityShortfall ? "deficit" :
      marginAfterMinimums === null || income === null ? "unknown" :
      marginAfterMinimums * BigInt(10) <= income ? "tight" : "comfortable",
    totalDebt, monthlyMinimums, monthlyCashAfterExpenses, cashAfterDebtPlan, minimumPaymentGap, emergencyFundMonths,
    debtToLiquidNetWorth: ratio(totalDebt, asMinor(profile.liquidNetWorth)),
    minimumsToIncome,
    fixedAndMinimumsToIncome: ratio(obligations, income),
    plannedDebtToIncomeRatio: ratio(budget, income),
    payoffStatus: (minimumPaymentGapUpperBound ?? zero) < zero ? "below-minimums" :
      minimumPaymentGap === null ? "incomplete" : minimumPaymentGap === zero ? "minimums-only" : "extra",
    debtLoadStatus: minimumsToIncome === null ? "incomplete" :
      minimumsToIncome >= 0.6 ? "strong-alert" :
      minimumsToIncome > 0.5 ? "high-fragility" :
      minimumsToIncome > 0.4 ? "high-pressure" : minimumsToIncome > 0.3 ? "attention" : "manageable",
    sustainabilityStatus: knownCapacityShortfall || (cashAfterDebtPlan ?? zero) < zero ? "deficit" :
      cashAfterDebtPlan === null || obligations === null || income === null ? "incomplete" :
      cashAfterDebtPlan * BigInt(10) <= income || (minimumsToIncome ?? 0) > 0.3 || (emergencyFundMonths !== null && emergencyFundMonths < 3)
        ? "tight" : "sustainable",
    weightedAnnualCost: totalDebt === null || totalDebt === zero || references.some(r => r.annualizedInterestAndFees === null)
      ? null
      : references.reduce((total, ref) => total + ref.annualizedInterestAndFees! * Number(ref.balance) / Number(totalDebt), 0),
  };
}

function withAssessment(summary: DebtSummary, references: DebtReference[], avalanche: PayoffPlan, snowball: PayoffPlan): DebtPlanResult {
  return {
    summary, references, avalanche, snowball,
    assessments: { avalanche: assessDebtPlan(avalanche, summary), snowball: assessDebtPlan(snowball, summary) },
  };
}

export function calculateDebtPlan(
  profile: DebtProfileInput, debts: DebtInput[], {
    extraContributions = [], invalidProjectionInput = false, invalidSummaryInputs = {},
  }: {
    extraContributions?: ExtraContributionInput[];
    invalidProjectionInput?: boolean;
    invalidSummaryInputs?: { debts?: boolean; ordinaryExpenses?: boolean };
  } = {},
): DebtPlanResult {
  const valid = validateDebtInputs(profile, debts, extraContributions);
  if (!valid) return withAssessment(
    summarize({ availableDebtPayment: null, emergencyFund: null, fixedMonthlyExpenses: null, liquidNetWorth: null, monthlyNetIncome: null }, null, null, [], "unknown", null),
    [], unavailablePlan("avalanche", "invalid-input", null, []), unavailablePlan("snowball", "invalid-input", null, []),
  );

  const totalDebt = knownSum(debts.map(d => asMinor(d.balance)));
  const active = debts.filter(d => d.balance !== null && d.balance > 0);
  const terms = active.map(termsFromDebt);
  const minimums = active.map((debt, index) => firstMonthMinimum(debt, terms[index]));
  const monthlyMinimums = totalDebt === null || invalidSummaryInputs.debts ? null : knownSum(minimums.map(value => value.exact));
  // A debt with unreported balance could already be paid off, so its provable contribution is zero.
  const minimumsLowerBound = invalidSummaryInputs.debts ? null : sum(minimums.map(value => value.lowerBound));
  const references = buildReferences(active);
  const minimumBasis = monthlyMinimums === null ? "unknown" : terms.some(term => term === null) ? "declared" : "calendar";
  const summary = summarize(
    profile, totalDebt, monthlyMinimums, references, minimumBasis, minimumsLowerBound, invalidSummaryInputs.ordinaryExpenses,
  );
  const extras: ScheduledExtra[] = extraContributions.flatMap(e => (
    e.amount === null || e.monthNumber === null ? [] : [{ id: e.id, label: e.label, month: e.monthNumber, planned: BigInt(e.amount) }]
  ));
  const missing = totalDebt === null || terms.some(term => term === null) || extras.length !== extraContributions.length
    || (active.length > 0 && profile.availableDebtPayment === null);

  const build = (method: "avalanche" | "snowball") => missing || invalidProjectionInput
    ? unavailablePlan(method, invalidProjectionInput ? "invalid-input" : "data-missing", totalDebt, extras)
    : simulateDebtPlan(method, terms as AmortizableDebt[], BigInt(profile.availableDebtPayment ?? 0), extras);
  return withAssessment(summary, references, build("avalanche"), build("snowball"));
}

export function compareDebtScenarios(reference: PayoffPlan, alternative: PayoffPlan) {
  return {
    costDifference: difference(alternative.totalPayoffCost, reference.totalPayoffCost),
    monthDifference: alternative.months === null || reference.months === null ? null : alternative.months - reference.months,
  };
}
