export type DebtKind = "card" | "personal" | "vehicle" | "mortgage" | "education" | "other";

export type DebtInput = {
  annualRate: number;
  balance: number;
  id: string;
  minimumPayment: number;
  monthlyFee: number;
  name: string;
  type: DebtKind;
};

export type DebtProfileInput = {
  availableDebtPayment: number;
  emergencyFund: number;
  fixedMonthlyExpenses: number;
  liquidNetWorth: number;
  monthlyNetIncome: number;
};

export type DebtReference = {
  adjustedAnnualCost: number;
  annualRate: number;
  balance: number;
  id: string;
  monthlyFee: number;
  name: string;
};

export type DebtSummary = {
  debtToLiquidNetWorth: number | null;
  emergencyFundMonths: number | null;
  estimatedMonthlyMargin: number;
  fixedAndMinimumsToIncome: number | null;
  minimumsToIncome: number | null;
  monthlyMinimums: number;
  totalDebt: number;
  weightedAnnualCost: number | null;
};

export type DebtReading = {
  emergencyFundLabel: string;
  fixedAndDebtLabel: string;
  monthlyPressureLabel: string;
};

export type PayoffMethod = "avalanche" | "snowball";

export type PayoffStep = {
  adjustedAnnualCost: number;
  annualRate: number;
  id: string;
  initialBalance: number;
  minimumPayment: number;
  name: string;
  payoffMonth: number | null;
  priorityReason: "highest-adjusted-cost" | "lowest-balance";
};

export type PayoffPlan = {
  estimatedFeeCost: number;
  estimatedInterestCost: number;
  estimatedTotalPayment: number;
  firstDebtName: string | null;
  initialPrincipal: number;
  method: PayoffMethod;
  months: number | null;
  order: string[];
  liquidationSequence: PayoffStep[];
  prioritySequence: PayoffStep[];
  sequence: PayoffStep[];
  totalInterestAndFees: number;
  warning: string | null;
};

export type DebtPlanResult = {
  avalanche: PayoffPlan;
  reading: DebtReading;
  references: DebtReference[];
  snowball: PayoffPlan;
  summary: DebtSummary;
};
