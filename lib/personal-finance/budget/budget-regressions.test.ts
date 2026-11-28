import assert from "node:assert/strict";
import test from "node:test";
import { calculateBudget, monthlyNonMonthlyAmount, monthlySmallExpenseAmount } from "./calculations.ts";
import {
  buildCurrentBudgetProjectionScenario,
  buildEducational5010BudgetProjectionScenario,
  buildTargetBudgetProjectionScenario,
  projectBudgetScenario,
} from "./projection-calculations.ts";
import {
  buildBudgetTargetSnapshot,
  classifyCurrentAllocation,
  rescaleMinorUnitsExact,
} from "./target-calculations.ts";
import { emptyTargetAllocation, type TargetAllocation } from "./target-types.ts";
import type { BudgetInput, SmallExpense } from "./types.ts";
import { formatMoney, parseLocalizedMoney } from "./validation.ts";

const budget: BudgetInput = {
  currency: "EUR",
  debtPaymentsMinor: 20_000,
  educationMinor: 0,
  emergencyFundMinor: null,
  enjoymentMinor: 0,
  essentialsMinor: 130_000,
  monthlyIncomeMinor: 300_000,
  nonMonthlyExpenses: [],
  personalDevelopmentMinor: 0,
  priority: "understand",
  savingInvestmentMinor: 0,
  smallExpenses: [],
};

function currentInput(input: BudgetInput, result = calculateBudget(input)) {
  return {
    debtPaymentsMinor: input.debtPaymentsMinor,
    educationMinor: input.educationMinor,
    enjoymentMinor: input.enjoymentMinor,
    essentialsMinor: input.essentialsMinor,
    incomeMinor: input.monthlyIncomeMinor,
    monthlyNonMonthlyMinor: result.monthlyNonMonthlyMinor,
    personalDevelopmentMinor: input.personalDevelopmentMinor,
    savingInvestmentMinor: input.savingInvestmentMinor,
    smallExpensesMinor: result.monthlySmallExpensesMinor,
  };
}

function target(input: BudgetInput, allocation: TargetAllocation) {
  const result = calculateBudget(input);
  const snapshot = buildBudgetTargetSnapshot({
    allocation,
    classification: { kind: "unclassified" },
    coverageBaseMinor: result.essentialsAndDebtMinor,
    currentInput: currentInput(input, result),
    emergencyFundMinor: result.emergencyFundMinor,
    emergencyPlan: { completionMonths: 12, target: { kind: "custom", months: 3 } },
    hasValidationErrors: false,
    reserve: { amountMinor: 6_000, kind: "amount" },
    serGiving: { kind: "closed" },
  });
  assert.equal(snapshot.status, "ok");
  return snapshot.value;
}

function smallExpense(frequency: SmallExpense["frequency"], amountMinor = 500): SmallExpense {
  return { amountMinor, frequency, id: frequency, name: frequency, timesPerMonth: 3 };
}

test("a 100% allocation preserves the €300 basics gap and the ALP gap", () => {
  const snapshot = target(budget, { ...emptyTargetAllocation, clf: 6_000, essentials: 4_000 });
  assert.equal(snapshot.status, "exact");
  assert.equal(snapshot.totalAllocatedMinor, BigInt(300_000));
  assert.equal(snapshot.amounts.essentials, BigInt(120_000));
  assert.equal(snapshot.essentialsShortfall?.amountMinor, BigInt(30_000));
  assert.equal(snapshot.alpShortfall?.amountMinor, BigInt(6_000));
  assert.equal(snapshot.isFinalViable, false);
  const scenario = buildTargetBudgetProjectionScenario(snapshot, "EUR");
  for (const horizon of [1, 12, 60] as const) {
    assert.equal(projectBudgetScenario(scenario, horizon).totalAllocatedMinor, BigInt(300_000) * BigInt(horizon));
  }
});

test("surplus, deficit, under 100%, and over 100% remain available to explore", () => {
  assert.equal(calculateBudget(budget).marginMinor, 150_000);
  assert.equal(calculateBudget({ ...budget, enjoymentMinor: 200_000 }).marginMinor, -50_000);
  assert.equal(target(budget, { ...emptyTargetAllocation, essentials: 9_000 }).remainingMinor, BigInt(30_000));
  assert.equal(target(budget, { ...emptyTargetAllocation, essentials: 11_000 }).excessMinor, BigInt(30_000));
});

test("unknown, declared-zero, and positive emergency balances stay distinct", () => {
  const noBalance = calculateBudget(budget);
  const declaredZero = { ...budget, emergencyFundMinor: 0 };
  const reportedPositive = { ...budget, emergencyFundMinor: 300_000 };
  assert.equal(noBalance.emergencyFundMinor, null);
  assert.equal(noBalance.coverageMonths, null);
  assert.equal(calculateBudget(declaredZero).coverageMonths, 0);
  assert.equal(calculateBudget(reportedPositive).coverageMonths, 2);
  assert.equal(calculateBudget({ ...reportedPositive, essentialsMinor: 0, debtPaymentsMinor: 0 }).coverageMonths, null);
  const unknown = target(budget, emptyTargetAllocation).coverage;
  assert.equal(unknown.status, "unknown-balance");
  assert.equal(unknown.targetAmountMinor, BigInt(450_000));
  assert.equal(unknown.shortfallMinor, null);
  assert.equal(unknown.monthlyContributionMinor, null);
  const zero = target(declaredZero, emptyTargetAllocation).coverage;
  assert.equal(zero.currentCoverageBasisPoints, 0);
  assert.equal(zero.shortfallMinor, BigInt(450_000));
  assert.equal(zero.monthlyContributionMinor, BigInt(37_500));
  assert.equal(target(reportedPositive, emptyTargetAllocation).coverage.shortfallMinor, BigInt(150_000));
});

test("daily and weekly amounts accumulate on their annual cadence before rounding", () => {
  const daily = smallExpense("daily");
  const weekly = smallExpense("weekly");
  const annual = { amountMinor: 120_000, frequency: "annual", id: "annual", monthsFrequency: 12, name: "Annual" } as const;
  assert.equal(monthlySmallExpenseAmount(daily), 15_208);
  assert.equal(monthlySmallExpenseAmount(weekly), 2_167);
  assert.equal(monthlySmallExpenseAmount(smallExpense("monthly")), 500);
  assert.equal(monthlySmallExpenseAmount(smallExpense("occasional")), 1_500);
  assert.equal(monthlyNonMonthlyAmount(annual), 10_000);
  const input = { ...budget, smallExpenses: [daily, weekly], nonMonthlyExpenses: [annual] };
  const result = calculateBudget(input);
  const allocation = classifyCurrentAllocation(currentInput(input, result), { kind: "unclassified" });
  const scenario = buildCurrentBudgetProjectionScenario({ allocation, currency: "EUR", result });
  const expected = [[1, BigInt(17_375)], [12, BigInt(208_500)], [60, BigInt(1_042_500)]] as const;
  for (const [horizon, recurring] of expected) {
    const projected = projectBudgetScenario(scenario, horizon);
    assert.equal(projected.undifferentiatedMinor, recurring);
    assert.equal(projected.totalAllocatedMinor, BigInt(160_000) * BigInt(horizon) + recurring);
  }
  const dailyOnly = { ...budget, smallExpenses: [daily] };
  const dailyResult = calculateBudget(dailyOnly);
  const dailyScenario = buildCurrentBudgetProjectionScenario({
    allocation: classifyCurrentAllocation(currentInput(dailyOnly), { kind: "unclassified" }),
    currency: "EUR",
    result: dailyResult,
  });
  assert.equal(projectBudgetScenario(dailyScenario, 12).undifferentiatedMinor, BigInt(182_500));
  assert.equal(projectBudgetScenario(dailyScenario, 60).undifferentiatedMinor, BigInt(912_500));
});

test("annual rounding can change the allocation status in either direction", () => {
  for (const [amountMinor, expected] of [[1, "over"], [2, "under"]] as const) {
    const expense = smallExpense("daily", amountMinor);
    const input = { ...budget, monthlyIncomeMinor: 150_000 + monthlySmallExpenseAmount(expense), smallExpenses: [expense] };
    const result = calculateBudget(input);
    const scenario = buildCurrentBudgetProjectionScenario({
      allocation: classifyCurrentAllocation(currentInput(input), { kind: "unclassified" }),
      currency: "EUR",
      result,
    });
    assert.equal(projectBudgetScenario(scenario, 1).allocationStatus, "exact");
    assert.equal(projectBudgetScenario(scenario, 12).allocationStatus, expected);
  }
});

test("locale, currency precision, and the supported high-value boundary are exact", () => {
  assert.deepEqual(parseLocalizedMoney("3.000,05", "es", "EUR"), parseLocalizedMoney("3,000.05", "en", "EUR"));
  assert.equal(parseLocalizedMoney("", "es", "EUR").minorUnits, null);
  assert.equal(parseLocalizedMoney("0", "en", "EUR").minorUnits, 0);
  assert.equal(parseLocalizedMoney("1.1", "en", "JPY").error, "precision");
  assert.deepEqual(rescaleMinorUnitsExact(300_000, 2, 0), { status: "exact", value: 3_000 });
  assert.equal(rescaleMinorUnitsExact(300_005, 2, 0).status, "notRepresentable");
  const max = Number.MAX_SAFE_INTEGER;
  assert.equal(calculateBudget({ ...budget, monthlyIncomeMinor: max }).monthlyIncomeMinor, max);
  assert.throws(() => calculateBudget({ ...budget, essentialsMinor: max }), RangeError);
  const high = target({ ...budget, monthlyIncomeMinor: max }, { ...emptyTargetAllocation, essentials: 60_000 });
  assert.equal(high.amounts.essentials, BigInt(max) * BigInt(6));
  assert.match(formatMoney(high.amounts.essentials, "en", "EUR"), /540,431,955,284,459\.46/);
});

test("changing the budget revalues percentages while educational 50/10 remains independent", () => {
  const percentages = { ...emptyTargetAllocation, essentials: 4_000, clf: 6_000 };
  const changed = target({ ...budget, essentialsMinor: 150_000, monthlyIncomeMinor: 400_000 }, percentages);
  assert.deepEqual(changed.allocation, percentages);
  assert.equal(changed.amounts.essentials, BigInt(160_000));
  assert.equal(changed.essentialsShortfall?.amountMinor, BigInt(10_000));
  const educational = buildEducational5010BudgetProjectionScenario(changed.incomeMinor, "EUR");
  assert.equal(projectBudgetScenario(educational, 60).categories[0].amountMinor, BigInt(12_000_000));
});
