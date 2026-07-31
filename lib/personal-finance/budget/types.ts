export type BudgetLocale = "es" | "en";

export const supportedCurrencies = [
  "AUD",
  "CAD",
  "CHF",
  "CNY",
  "COP",
  "EUR",
  "GBP",
  "HKD",
  "JPY",
  "MXN",
  "SGD",
  "USD",
] as const;

export const MAX_DYNAMIC_EXPENSE_ROWS = 20;

export function appendBudgetExpenseRow<T>(rows: T[], row: T) {
  return rows.length >= MAX_DYNAMIC_EXPENSE_ROWS ? rows : [...rows, row];
}

export type BudgetCurrency = (typeof supportedCurrencies)[number];

export type BudgetPriority =
  | "understand"
  | "peace"
  | "family"
  | "debt"
  | "emergency"
  | "investing"
  | "education"
  | "independence"
  | "other";

export type NonMonthlyFrequency = "monthly" | "quarterly" | "semiannual" | "annual" | "custom";
export type SmallExpenseFrequency = "daily" | "weekly" | "monthly" | "occasional";

export type NonMonthlyExpense = {
  amountMinor: number;
  frequency: NonMonthlyFrequency;
  id: string;
  monthsFrequency: number;
  name: string;
};

export type SmallExpense = {
  amountMinor: number;
  frequency: SmallExpenseFrequency;
  id: string;
  name: string;
  timesPerMonth: number;
};

export type BudgetInput = {
  currency: BudgetCurrency;
  debtPaymentsMinor: number;
  educationMinor: number;
  emergencyFundMinor: number;
  enjoymentMinor: number;
  essentialsMinor: number;
  monthlyIncomeMinor: number;
  nonMonthlyExpenses: NonMonthlyExpense[];
  personalDevelopmentMinor: number;
  priority: BudgetPriority;
  savingInvestmentMinor: number;
  smallExpenses: SmallExpense[];
};
