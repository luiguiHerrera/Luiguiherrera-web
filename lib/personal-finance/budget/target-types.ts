export type AllocationBasisPoints = number;

export const MAX_CATEGORY_ALLOCATION_BASIS_POINTS = 60_000;

export const allocationCategories = [
  "essentials",
  "alp",
  "enjoyment",
  "clf",
  "education",
  "serAndGiving",
] as const;

export type AllocationCategory = (typeof allocationCategories)[number];

export type TargetAllocation = Record<AllocationCategory, AllocationBasisPoints>;

export type TargetAllocationLifecycle =
  | "uninitialized"
  | "initialized"
  | "edited";

export const emptyTargetAllocation: TargetAllocation = {
  alp: 0,
  clf: 0,
  education: 0,
  enjoyment: 0,
  essentials: 0,
  serAndGiving: 0,
};

export type CurrentAllocationStatus =
  | "known"
  | "partial"
  | "notDifferentiated"
  | "notAsked";

export type SavingsCurrentClassification =
  | { kind: "unclassified" }
  | {
      kind: "split";
      alpShareBasisPoints: AllocationBasisPoints;
    };

export type EmergencyFundTarget =
  | { kind: "unset" }
  | { kind: "preset"; months: 3 | 6 | 9 | 12 }
  | { kind: "custom"; months: number };

export type EmergencyFundPlan = {
  completionMonths: number | null;
  target: EmergencyFundTarget;
};

export type ContingencyReserve =
  | { kind: "unset" }
  | { kind: "none" }
  | { kind: "amount"; amountMinor: number }
  | { kind: "percentage"; basisPoints: AllocationBasisPoints };

export type SerGivingBreakdown =
  | { kind: "closed" }
  | {
      kind: "split";
      serShareBasisPoints: AllocationBasisPoints;
    };

export type AllocationSumState = {
  allocatedBasisPoints: number;
  remainingBasisPoints: number;
  excessBasisPoints: number;
  status: "under" | "exact" | "over";
  isFinalViable: boolean;
};

export type AllocationComparisonRow = {
  category: AllocationCategory;
  currentStatus: CurrentAllocationStatus;
  currentAmountMinor: number | null;
  currentBasisPoints: number | null;
  targetAmountMinor: number;
  targetBasisPoints: number;
  deltaAmountMinor: number | null;
  deltaBasisPoints: number | null;
};

export type ExactCalculation<T> =
  | { status: "ok"; value: T }
  | { status: "notCalculable"; reason: "zero-income" | "zero-base" }
  | { status: "rangeError"; reason: "unsafe-integer" };

export type ReconciledAllocationAmounts = Record<AllocationCategory, number>;

export type EmergencyFundProjection =
  | { status: "unset" }
  | { status: "zero-base" }
  | { status: "rangeError" }
  | {
      status: "calculated";
      currentCoverageBasisPoints: number;
      monthlyContributionMinor: number | null;
      shortfallMinor: number;
      targetAmountMinor: number;
      targetMonths: number;
    };

export type CurrentAllocationInput = {
  debtPaymentsMinor: number | null;
  educationMinor: number | null;
  enjoymentMinor: number | null;
  essentialsMinor: number | null;
  incomeMinor: number;
  monthlyNonMonthlyMinor: number;
  personalDevelopmentMinor: number | null;
  savingInvestmentMinor: number | null;
  smallExpensesMinor: number;
};

export type CurrentAllocationValue = {
  amountMinor: number | null;
  basisPoints: number | null;
  status: CurrentAllocationStatus;
};

export type CurrentAllocationMap = Record<AllocationCategory, CurrentAllocationValue>;
