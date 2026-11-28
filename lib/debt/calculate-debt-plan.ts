import { contractualMinimum, simulateDebtPlan, unavailablePlan, type AmortizableDebt, type ScheduledExtra } from "./amortization.ts";
import { monthlyInterest, monthlyRate, validateDebtInputs } from "./debt-input.ts";
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

function declaredMinimum(d: DebtInput, terms: AmortizableDebt | null) {
  if (d.minimumPayment === null || d.monthlyFee === null) return null;
  if (!terms) return BigInt(d.minimumPayment) + (d.minimumIncludesFees ? zero : BigInt(d.monthlyFee));
  return contractualMinimum(terms, terms.balance + monthlyInterest(terms.balance, terms.rate) + terms.fee);
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
  profile: DebtProfileInput, totalDebt: bigint | null, monthlyMinimums: bigint | null, references: DebtReference[],
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
  return {
    totalDebt, monthlyMinimums, monthlyCashAfterExpenses, cashAfterDebtPlan, minimumPaymentGap, emergencyFundMonths,
    debtToLiquidNetWorth: ratio(totalDebt, asMinor(profile.liquidNetWorth)),
    minimumsToIncome,
    fixedAndMinimumsToIncome: ratio(obligations, income),
    plannedDebtToIncomeRatio: ratio(budget, income),
    payoffStatus: minimumPaymentGap === null ? "incomplete" :
      minimumPaymentGap < zero ? "below-minimums" : minimumPaymentGap === zero ? "minimums-only" : "extra",
    debtLoadStatus: minimumsToIncome === null ? "incomplete" :
      minimumsToIncome >= 0.6 ? "strong-alert" :
      minimumsToIncome > 0.5 ? "high-fragility" :
      minimumsToIncome > 0.4 ? "high-pressure" : minimumsToIncome > 0.3 ? "attention" : "manageable",
    sustainabilityStatus: cashAfterDebtPlan === null || obligations === null || income === null ? "incomplete" :
      cashAfterDebtPlan < zero || obligations > income ? "deficit" :
      cashAfterDebtPlan * BigInt(10) <= income || (minimumsToIncome ?? 0) > 0.3 || (emergencyFundMonths !== null && emergencyFundMonths < 3)
        ? "tight" : "sustainable",
    weightedAnnualCost: totalDebt === null || totalDebt === zero || references.some(r => r.annualizedInterestAndFees === null)
      ? null
      : references.reduce((total, ref) => total + ref.annualizedInterestAndFees! * Number(ref.balance) / Number(totalDebt), 0),
  };
}

export function calculateDebtPlan(
  profile: DebtProfileInput, debts: DebtInput[], {
    extraContributions = [], invalidProjectionInput = false,
  }: { extraContributions?: ExtraContributionInput[]; invalidProjectionInput?: boolean } = {},
): DebtPlanResult {
  const valid = validateDebtInputs(profile, debts, extraContributions);
  if (!valid) return {
    summary: summarize({ availableDebtPayment: null, emergencyFund: null, fixedMonthlyExpenses: null, liquidNetWorth: null, monthlyNetIncome: null }, null, null, []),
    references: [],
    avalanche: unavailablePlan("avalanche", "invalid-input", null, []),
    snowball: unavailablePlan("snowball", "invalid-input", null, []),
  };

  const totalDebt = knownSum(debts.map(d => asMinor(d.balance)));
  const active = debts.filter(d => d.balance !== null && d.balance > 0);
  const terms = active.map(termsFromDebt);
  const monthlyMinimums = totalDebt === null ? null : knownSum(active.map((d, i) => declaredMinimum(d, terms[i])));
  const references = buildReferences(active);
  const summary = summarize(profile, totalDebt, monthlyMinimums, references);
  const extras: ScheduledExtra[] = extraContributions.flatMap(e => (
    e.amount === null || e.monthNumber === null ? [] : [{ id: e.id, label: e.label, month: e.monthNumber, planned: BigInt(e.amount) }]
  ));
  const missing = totalDebt === null || terms.some(term => term === null) || extras.length !== extraContributions.length
    || (active.length > 0 && profile.availableDebtPayment === null);

  const build = (method: "avalanche" | "snowball") => missing || invalidProjectionInput
    ? unavailablePlan(method, invalidProjectionInput ? "invalid-input" : "data-missing", totalDebt, extras)
    : simulateDebtPlan(method, terms as AmortizableDebt[], BigInt(profile.availableDebtPayment ?? 0), extras);
  return { summary, references, avalanche: build("avalanche"), snowball: build("snowball") };
}

export function compareDebtScenarios(reference: PayoffPlan, alternative: PayoffPlan) {
  return {
    costDifference: difference(alternative.totalPayoffCost, reference.totalPayoffCost),
    monthDifference: alternative.months === null || reference.months === null ? null : alternative.months - reference.months,
  };
}
