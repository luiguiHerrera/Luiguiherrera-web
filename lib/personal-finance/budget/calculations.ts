import type { BudgetResult } from "./result-model.ts";
import type {
  BudgetInput,
  NonMonthlyExpense,
  SmallExpense,
} from "./types.ts";

function assertSafeMinor(value: number) {
  const rounded = Math.round(value);
  if (!Number.isFinite(rounded) || !Number.isSafeInteger(rounded)) {
    throw new RangeError("Budget calculation exceeds the supported monetary range.");
  }
  return rounded;
}

export function frequencyMonths(expense: NonMonthlyExpense) {
  if (expense.frequency === "custom") return Math.max(1, Math.round(expense.monthsFrequency));
  if (expense.frequency === "quarterly") return 3;
  if (expense.frequency === "semiannual") return 6;
  if (expense.frequency === "annual") return 12;
  return 1;
}

export function monthlyNonMonthlyAmount(expense: NonMonthlyExpense) {
  return assertSafeMinor(expense.amountMinor / frequencyMonths(expense));
}

export function monthlySmallExpenseAmount(expense: SmallExpense) {
  if (expense.frequency === "daily") return assertSafeMinor(expense.amountMinor * 30);
  if (expense.frequency === "weekly") return assertSafeMinor(expense.amountMinor * (52 / 12));
  if (expense.frequency === "monthly") return assertSafeMinor(expense.amountMinor);
  return assertSafeMinor(expense.amountMinor * Math.max(0, expense.timesPerMonth));
}

function safeSum(values: number[]) {
  return values.reduce((sum, value) => assertSafeMinor(sum + value), 0);
}

export function calculateBudget(input: BudgetInput): BudgetResult {
  const monthlyNonMonthlyMinor = safeSum(input.nonMonthlyExpenses.map(monthlyNonMonthlyAmount));
  const monthlySmallExpensesMinor = safeSum(input.smallExpenses.map(monthlySmallExpenseAmount));
  const essentialsAndDebtMinor = safeSum([input.essentialsMinor, input.debtPaymentsMinor]);
  const totalAssignedMinor = safeSum([
    essentialsAndDebtMinor,
    input.savingInvestmentMinor,
    input.enjoymentMinor,
    input.educationMinor,
    input.personalDevelopmentMinor,
    monthlyNonMonthlyMinor,
    monthlySmallExpensesMinor,
  ]);
  const marginMinor = assertSafeMinor(input.monthlyIncomeMinor - totalAssignedMinor);
  const coverageMonths = essentialsAndDebtMinor > 0
    ? input.emergencyFundMinor / essentialsAndDebtMinor
    : null;
  const highlightKind = marginMinor < 0
    ? "deficit"
    : marginMinor === 0
      ? "fully-allocated"
      : "unallocated";

  return {
    coverageMonths,
    emergencyFundMinor: input.emergencyFundMinor,
    essentialsAndDebtMinor,
    highlightAmountMinor: Math.abs(marginMinor),
    highlightKind,
    marginMinor,
    monthlyIncomeMinor: input.monthlyIncomeMinor,
    monthlyNonMonthlyMinor,
    monthlySmallExpensesMinor,
    totalAssignedMinor,
  };
}
