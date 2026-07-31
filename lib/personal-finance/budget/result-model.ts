export type BudgetHighlightKind = "deficit" | "fully-allocated" | "unallocated";

export type BudgetResult = {
  coverageMonths: number | null;
  emergencyFundMinor: number;
  essentialsAndDebtMinor: number;
  highlightAmountMinor: number;
  highlightKind: BudgetHighlightKind;
  marginMinor: number;
  monthlyIncomeMinor: number;
  monthlyNonMonthlyMinor: number;
  monthlySmallExpensesMinor: number;
  totalAssignedMinor: number;
};
