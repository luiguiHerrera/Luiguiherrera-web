import type { DebtInput, DebtPlanResult, DebtProfileInput, DebtReading, DebtReference, DebtSummary, ExtraContributionInput, PayoffMethod, PayoffPlan, PayoffStep } from "@/lib/debt/types";

const MAX_MONTHS = 600;
const EPSILON = 0.01;

function positive(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function ratio(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

function adjustedAnnualCost(debt: DebtInput) {
  const balance = positive(debt.balance);
  const annualRate = positive(debt.annualRate);
  if (balance <= 0) return annualRate;
  return annualRate + (positive(debt.monthlyFee) * 12 * 100) / balance;
}

function buildReferences(debts: DebtInput[]): DebtReference[] {
  return debts
    .filter((debt) => positive(debt.balance) > 0)
    .map((debt) => ({
      adjustedAnnualCost: adjustedAnnualCost(debt),
      annualRate: positive(debt.annualRate),
      balance: positive(debt.balance),
      id: debt.id,
      monthlyFee: positive(debt.monthlyFee),
      name: debt.name.trim() || "Debt",
    }));
}

function summarize(profile: DebtProfileInput, debts: DebtInput[], references: DebtReference[]): DebtSummary {
  const totalDebt = debts.reduce((sum, debt) => sum + positive(debt.balance), 0);
  const monthlyMinimums = debts.reduce((sum, debt) => sum + (positive(debt.balance) > 0 ? positive(debt.minimumPayment) : 0), 0);
  const weightedAnnualCost = totalDebt > 0
    ? references.reduce((sum, reference) => sum + reference.adjustedAnnualCost * reference.balance, 0) / totalDebt
    : null;
  const fixedMonthlyExpenses = positive(profile.fixedMonthlyExpenses);
  const availableDebtPayment = positive(profile.availableDebtPayment);
  const monthlyNetIncome = positive(profile.monthlyNetIncome);
  const monthlyCashAfterExpenses = monthlyNetIncome - fixedMonthlyExpenses;
  const cashAfterDebtPlan = monthlyCashAfterExpenses - availableDebtPayment;
  const minimumPaymentGap = availableDebtPayment - monthlyMinimums;
  const minimumDebtToIncomeRatio = ratio(monthlyMinimums, monthlyNetIncome);
  const plannedDebtToIncomeRatio = ratio(availableDebtPayment, monthlyNetIncome);
  const debtLoadStatus =
    minimumDebtToIncomeRatio === null ? "incomplete" :
    minimumDebtToIncomeRatio >= 0.6 ? "strong-alert" :
    minimumDebtToIncomeRatio > 0.5 ? "high-fragility" :
    minimumDebtToIncomeRatio > 0.4 ? "high-pressure" :
    minimumDebtToIncomeRatio > 0.3 ? "attention" :
    "manageable";
  const payoffStatus =
    minimumPaymentGap > EPSILON ? "extra" :
    minimumPaymentGap < -EPSILON ? "below-minimums" :
    "minimums-only";
  const incomeDataIsIncomplete = monthlyNetIncome <= 0;
  const sustainabilityStatus =
    incomeDataIsIncomplete ? "incomplete" :
    fixedMonthlyExpenses + monthlyMinimums > monthlyNetIncome || availableDebtPayment + EPSILON < monthlyMinimums || cashAfterDebtPlan < -EPSILON ? "deficit" :
    minimumDebtToIncomeRatio !== null && minimumDebtToIncomeRatio > 0.3 ? "tight" :
    cashAfterDebtPlan <= monthlyNetIncome * 0.1 || (ratio(positive(profile.emergencyFund), fixedMonthlyExpenses) ?? Infinity) < 3 ? "tight" :
    "sustainable";

  return {
    cashAfterDebtPlan,
    debtToLiquidNetWorth: ratio(totalDebt, positive(profile.liquidNetWorth)),
    debtLoadStatus,
    emergencyFundMonths: ratio(positive(profile.emergencyFund), fixedMonthlyExpenses),
    estimatedMonthlyMargin: cashAfterDebtPlan,
    fixedAndMinimumsToIncome: ratio(fixedMonthlyExpenses + monthlyMinimums, monthlyNetIncome),
    minimumPaymentGap,
    minimumsToIncome: minimumDebtToIncomeRatio,
    monthlyCashAfterExpenses,
    monthlyMinimums,
    payoffStatus,
    plannedDebtToIncomeRatio,
    sustainabilityStatus,
    totalDebt,
    weightedAnnualCost,
  };
}

function readingFromSummary(summary: DebtSummary): DebtReading {
  const monthlyPressure = summary.minimumsToIncome;
  const fixedAndDebt = summary.fixedAndMinimumsToIncome;
  const emergencyMonths = summary.emergencyFundMonths;

  return {
    emergencyFundLabel:
      emergencyMonths === null ? "Insufficient income data" :
      emergencyMonths < 3 ? "Vulnerable" :
      emergencyMonths < 6 ? "Partial base" :
      emergencyMonths < 12 ? "Reasonable base" :
      "Strong fund",
    fixedAndDebtLabel:
      fixedAndDebt === null ? "Insufficient income data" :
      fixedAndDebt <= 0.6 ? "Reasonable margin" :
      fixedAndDebt <= 0.8 ? "Narrow margin" :
      "Fragile margin",
    monthlyPressureLabel:
      monthlyPressure === null ? "Insufficient income data" :
      monthlyPressure <= 0.2 ? "Low/moderate pressure" :
      monthlyPressure <= 0.35 ? "Relevant pressure" :
      "High pressure",
  };
}

function orderedDebts(method: PayoffMethod, debts: DebtInput[]) {
  const activeDebts = debts
    .map((debt, index) => ({ ...debt, index }))
    .filter((debt) => positive(debt.balance) > 0);

  if (method === "avalanche") {
    return activeDebts.sort((a, b) => {
      const costDifference = adjustedAnnualCost(b) - adjustedAnnualCost(a);
      if (Math.abs(costDifference) > EPSILON) return costDifference;
      const balanceDifference = positive(b.balance) - positive(a.balance);
      if (Math.abs(balanceDifference) > EPSILON) return balanceDifference;
      return a.index - b.index;
    });
  }

  return activeDebts.sort((a, b) => {
    const balanceDifference = positive(a.balance) - positive(b.balance);
    if (Math.abs(balanceDifference) > EPSILON) return balanceDifference;
    const costDifference = adjustedAnnualCost(b) - adjustedAnnualCost(a);
    if (Math.abs(costDifference) > EPSILON) return costDifference;
    return a.index - b.index;
  });
}

function payoffSequence(method: PayoffMethod, debts: ReturnType<typeof orderedDebts>, payoffMonths = new Map<string, number>()): PayoffStep[] {
  return debts.map((debt) => ({
    adjustedAnnualCost: adjustedAnnualCost(debt),
    annualRate: positive(debt.annualRate),
    id: debt.id,
    initialBalance: positive(debt.balance),
    minimumPayment: positive(debt.minimumPayment),
    name: debt.name.trim() || "Debt",
    payoffMonth: payoffMonths.get(debt.id) ?? null,
    priorityReason: method === "avalanche" ? "highest-adjusted-cost" : "lowest-balance",
  }));
}

function liquidationSequence(method: PayoffMethod, debts: ReturnType<typeof orderedDebts>, payoffMonths = new Map<string, number>()): PayoffStep[] {
  return payoffSequence(method, debts, payoffMonths).sort((a, b) => {
    if (a.payoffMonth === null && b.payoffMonth === null) return 0;
    if (a.payoffMonth === null) return 1;
    if (b.payoffMonth === null) return -1;
    if (a.payoffMonth !== b.payoffMonth) return a.payoffMonth - b.payoffMonth;
    return 0;
  });
}

function activePriorityDebt(method: PayoffMethod, debts: ReturnType<typeof orderedDebts>, balances: Map<string, number>) {
  const activeDebts = debts.filter((debt) => (balances.get(debt.id) ?? 0) > EPSILON);

  if (method === "avalanche") {
    return activeDebts.sort((a, b) => {
      const aBalance = balances.get(a.id) ?? 0;
      const bBalance = balances.get(b.id) ?? 0;
      const costDifference = adjustedAnnualCost({ ...b, balance: bBalance }) - adjustedAnnualCost({ ...a, balance: aBalance });
      if (Math.abs(costDifference) > EPSILON) return costDifference;
      const balanceDifference = bBalance - aBalance;
      if (Math.abs(balanceDifference) > EPSILON) return balanceDifference;
      return a.index - b.index;
    })[0] ?? null;
  }

  return activeDebts.sort((a, b) => {
    const aBalance = balances.get(a.id) ?? 0;
    const bBalance = balances.get(b.id) ?? 0;
    const balanceDifference = aBalance - bBalance;
    if (Math.abs(balanceDifference) > EPSILON) return balanceDifference;
    const costDifference = adjustedAnnualCost({ ...b, balance: bBalance }) - adjustedAnnualCost({ ...a, balance: aBalance });
    if (Math.abs(costDifference) > EPSILON) return costDifference;
    return a.index - b.index;
  })[0] ?? null;
}

function buildPayoffPlan({
  estimatedFeeCost,
  estimatedInterestCost,
  extraContributionsApplied,
  firstDebtName,
  initialPrincipal,
  method,
  months,
  ordered,
  payoffMonths,
  warning,
}: {
  estimatedFeeCost: number;
  estimatedInterestCost: number;
  extraContributionsApplied: number;
  firstDebtName: string | null;
  initialPrincipal: number;
  method: PayoffMethod;
  months: number | null;
  ordered: ReturnType<typeof orderedDebts>;
  payoffMonths?: Map<string, number>;
  warning: string | null;
}): PayoffPlan {
  const totalInterestAndFees = estimatedInterestCost + estimatedFeeCost;
  const prioritySequence = payoffSequence(method, ordered, payoffMonths);

  return {
    estimatedFeeCost,
    estimatedInterestCost,
    estimatedTotalPayment: initialPrincipal + totalInterestAndFees,
    extraContributionsApplied,
    firstDebtName,
    initialPrincipal,
    method,
    months,
    order: ordered.map((debt) => debt.name.trim() || "Debt"),
    liquidationSequence: liquidationSequence(method, ordered, payoffMonths),
    prioritySequence,
    sequence: prioritySequence,
    totalInterestAndFees,
    warning,
  };
}

function normalizeExtraContributions(extraContributions: ExtraContributionInput[] = []) {
  return extraContributions
    .map((contribution) => ({
      ...contribution,
      amount: positive(contribution.amount),
      monthNumber: Math.max(1, Math.round(positive(contribution.monthNumber))),
    }))
    .filter((contribution) => contribution.amount > EPSILON && contribution.monthNumber >= 1)
    .sort((a, b) => a.monthNumber - b.monthNumber);
}

function applyPriorityPayment(
  method: PayoffMethod,
  ordered: ReturnType<typeof orderedDebts>,
  balances: Map<string, number>,
  payoffMonths: Map<string, number>,
  amount: number,
  month: number,
) {
  let remainingPayment = positive(amount);
  let applied = 0;

  while (remainingPayment > EPSILON) {
    const debt = activePriorityDebt(method, ordered, balances);
    if (debt === null) break;
    const balance = balances.get(debt.id) ?? 0;
    const payment = Math.min(remainingPayment, balance);
    const nextBalance = balance - payment;
    balances.set(debt.id, nextBalance);
    remainingPayment -= payment;
    applied += payment;
    if (nextBalance <= EPSILON && !payoffMonths.has(debt.id)) {
      payoffMonths.set(debt.id, month);
    }
  }

  return applied;
}

function simulatePayoff(method: PayoffMethod, debts: DebtInput[], availablePayment: number, extraContributions: ExtraContributionInput[] = []): PayoffPlan {
  const ordered = orderedDebts(method, debts);
  const firstDebtName = ordered[0]?.name.trim() || (ordered.length > 0 ? "Debt" : null);
  const monthlyPayment = positive(availablePayment);
  const startingMinimums = ordered.reduce((sum, debt) => sum + positive(debt.minimumPayment), 0);
  const initialPrincipal = ordered.reduce((sum, debt) => sum + positive(debt.balance), 0);
  const normalizedExtraContributions = normalizeExtraContributions(extraContributions);

  if (ordered.length === 0) {
    return buildPayoffPlan({
      estimatedFeeCost: 0,
      estimatedInterestCost: 0,
      extraContributionsApplied: 0,
      firstDebtName,
      initialPrincipal,
      method,
      months: 0,
      ordered,
      warning: null,
    });
  }

  if (monthlyPayment + EPSILON < startingMinimums) {
    return buildPayoffPlan({
      estimatedFeeCost: 0,
      estimatedInterestCost: 0,
      extraContributionsApplied: 0,
      firstDebtName,
      initialPrincipal,
      method,
      months: null,
      ordered,
      warning: "Available monthly payment does not cover minimum payments.",
    });
  }

  const balances = new Map(ordered.map((debt) => [debt.id, positive(debt.balance)]));
  const payoffMonths = new Map<string, number>();
  let estimatedFeeCost = 0;
  let estimatedInterestCost = 0;
  let extraContributionsApplied = 0;

  for (let month = 1; month <= MAX_MONTHS; month += 1) {
    let paymentPool = monthlyPayment;
    let previousTotal = 0;

    for (const debt of ordered) {
      const balance = balances.get(debt.id) ?? 0;
      if (balance <= EPSILON) continue;
      previousTotal += balance;
      const interest = balance * (positive(debt.annualRate) / 100 / 12);
      const fee = positive(debt.monthlyFee);
      const nextBalance = balance + interest;
      estimatedInterestCost += interest;
      estimatedFeeCost += fee;
      balances.set(debt.id, nextBalance);
    }

    for (const debt of ordered) {
      if (paymentPool <= EPSILON) break;
      const balance = balances.get(debt.id) ?? 0;
      if (balance <= EPSILON) continue;
      const minimumPayment = Math.min(positive(debt.minimumPayment), balance, paymentPool);
      const nextBalance = balance - minimumPayment;
      balances.set(debt.id, nextBalance);
      paymentPool -= minimumPayment;
      if (nextBalance <= EPSILON && !payoffMonths.has(debt.id)) {
        payoffMonths.set(debt.id, month);
      }
    }

    if (paymentPool > EPSILON) {
      paymentPool -= applyPriorityPayment(method, ordered, balances, payoffMonths, paymentPool, month);
    }

    const monthlyExtraContributions = normalizedExtraContributions
      .filter((contribution) => contribution.monthNumber === month)
      .reduce((sum, contribution) => sum + contribution.amount, 0);

    if (monthlyExtraContributions > EPSILON) {
      extraContributionsApplied += applyPriorityPayment(method, ordered, balances, payoffMonths, monthlyExtraContributions, month);
    }

    const remaining = [...balances.values()].reduce((sum, balance) => sum + Math.max(0, balance), 0);
    if (remaining <= EPSILON) {
      return buildPayoffPlan({
        estimatedFeeCost,
        estimatedInterestCost,
        extraContributionsApplied,
        firstDebtName,
        initialPrincipal,
        method,
        months: month,
        ordered,
        payoffMonths,
        warning: null,
      });
    }

    if (month >= 12 && remaining >= previousTotal - EPSILON) {
      return buildPayoffPlan({
        estimatedFeeCost,
        estimatedInterestCost,
        extraContributionsApplied,
        firstDebtName,
        initialPrincipal,
        method,
        months: null,
        ordered,
        payoffMonths,
        warning: "Debt balance is not declining in a stable way under this payment scenario.",
      });
    }
  }

  return buildPayoffPlan({
    estimatedFeeCost,
    estimatedInterestCost,
    extraContributionsApplied,
    firstDebtName,
    initialPrincipal,
    method,
    months: null,
    ordered,
    payoffMonths,
    warning: "Scenario did not finish within 600 months.",
  });
}

export function calculateDebtPlan(profile: DebtProfileInput, debts: DebtInput[], options: { extraContributions?: ExtraContributionInput[] } = {}): DebtPlanResult {
  const references = buildReferences(debts);
  const summary = summarize(profile, debts, references);
  const extraContributions = options.extraContributions ?? [];

  return {
    avalanche: simulatePayoff("avalanche", debts, profile.availableDebtPayment, extraContributions),
    reading: readingFromSummary(summary),
    references,
    snowball: simulatePayoff("snowball", debts, profile.availableDebtPayment, extraContributions),
    summary,
  };
}
