export type DebtKind = "card" | "personal" | "vehicle" | "mortgage" | "education" | "other";
export type RateType = "nominal" | "effective" | "unknown";
export type PayoffMethod = "avalanche" | "snowball";

// Monetary inputs are integer minor units. Rates are annual percentages × 10,000.
export type DebtInput = {
  id: string;
  name: string;
  type: DebtKind;
  balance: number | null;
  annualRate: number | null;
  rateType: RateType;
  minimumPayment: number | null;
  minimumIncludesFees: boolean;
  monthlyFee: number | null;
};

export type DebtProfileInput = {
  availableDebtPayment: number | null;
  emergencyFund: number | null;
  fixedMonthlyExpenses: number | null;
  liquidNetWorth: number | null;
  monthlyNetIncome: number | null;
};

export type ExtraContributionInput = {
  amount: number | null;
  id: string;
  label?: string;
  monthNumber: number | null;
};

export type DebtSummary = {
  totalDebt: bigint | null;
  monthlyMinimums: bigint | null;
  monthlyCashAfterExpenses: bigint | null;
  cashAfterDebtPlan: bigint | null;
  minimumPaymentGap: bigint | null;
  emergencyFundMonths: number | null;
  debtToLiquidNetWorth: number | null;
  minimumsToIncome: number | null;
  fixedAndMinimumsToIncome: number | null;
  plannedDebtToIncomeRatio: number | null;
  debtLoadStatus: "manageable" | "attention" | "high-pressure" | "high-fragility" | "strong-alert" | "incomplete";
  payoffStatus: "extra" | "minimums-only" | "below-minimums" | "incomplete";
  sustainabilityStatus: "sustainable" | "tight" | "deficit" | "incomplete";
  weightedAnnualCost: number | null;
};

export type DebtReference = {
  id: string;
  name: string;
  balance: bigint;
  annualRatePercent: number | null;
  rateType: RateType;
  annualizedInterestAndFees: number | null;
};

export type DebtCashMovement = {
  id: string;
  opening: bigint;
  interest: bigint;
  fees: bigint;
  minimumDue: bigint;
  minimumShortfall: bigint;
  ordinaryPaid: bigint;
  extraPaid: bigint;
  interestPaid: bigint;
  feesPaid: bigint;
  principalPaid: bigint;
  closing: bigint;
  closingPrincipal: bigint;
  closingInterest: bigint;
  closingFees: bigint;
  paidOff: boolean;
};

export type ContributionTrace = {
  id: string;
  label?: string;
  month: number;
  planned: bigint;
  applied: bigint;
  unused: bigint;
  outsideHorizon: bigint;
  unsimulated: bigint;
};

export type DebtPeriod = {
  month: number;
  debts: DebtCashMovement[];
  totals: Omit<DebtCashMovement, "id" | "paidOff">;
  ordinaryAvailable: bigint;
  ordinaryUnused: bigint;
  extraAvailable: bigint;
  extraUnused: bigint;
  priorityApplied: string[];
  contributions: ContributionTrace[];
};

export type PayoffStatus = "paid" | "no-debt" | "horizon" | "data-missing" | "invalid-input" | "range-error";

export type PayoffPlan = {
  method: PayoffMethod;
  status: PayoffStatus;
  months: number | null;
  ledger: DebtPeriod[];
  initialPrincipal: bigint | null;
  endingBalance: bigint | null;
  netBalanceReduction: bigint | null;
  totals: Pick<DebtCashMovement, "ordinaryPaid" | "extraPaid" | "interest" | "fees" | "interestPaid" | "feesPaid" | "principalPaid"> | null;
  costAccrued: bigint | null;
  totalPayoffCost: bigint | null;
  monthsBelowMinimum: number;
  negativeAmortizationMonths: number;
  initialPriority: string[];
  liquidations: Array<{ id: string; month: number }>;
  contributions: ContributionTrace[];
};

export type DebtPlanResult = {
  summary: DebtSummary;
  references: DebtReference[];
  avalanche: PayoffPlan;
  snowball: PayoffPlan;
};
