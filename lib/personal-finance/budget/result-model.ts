export type BudgetHighlightKind = "deficit" | "fully-allocated" | "unallocated";

export type BudgetResult = {
  coverageMonths: number | null;
  emergencyFundMinor: number | null;
  essentialsAndDebtMinor: number;
  highlightAmountMinor: number;
  highlightKind: BudgetHighlightKind;
  marginMinor: number;
  monthlyIncomeMinor: number;
  monthlyNonMonthlyMinor: number;
  monthlySmallExpensesMinor: number;
  smallExpensesAnnualMinor: bigint;
  totalAssignedMinor: number;
};
