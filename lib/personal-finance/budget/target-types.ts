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

export type BudgetTargetMode = "edit" | "review";

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

export type BudgetTargetComparisonRow = Omit<
  AllocationComparisonRow,
  "currentAmountMinor" | "deltaAmountMinor" | "targetAmountMinor"
> & {
  currentAmountMinor: bigint | null;
  deltaAmountMinor: bigint | null;
  targetAmountMinor: bigint;
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

export type TargetShortfall = {
  amountMinor: bigint | null;
  basisPoints: number | null;
  status: "ok" | "notCalculable" | "rangeError";
};

export type SerGivingAmounts = {
  givingMinor: bigint;
  serMinor: bigint;
};

export type BudgetTargetAmounts = Record<AllocationCategory, bigint>;

export type BudgetTargetCoverageSnapshot = {
  completionMonths: number | null;
  coverageBaseMinor: bigint;
  currentCoverageBasisPoints: number | null;
  monthlyContributionMinor: bigint | null;
  shortfallMinor: bigint | null;
  status: EmergencyFundProjection["status"];
  target: EmergencyFundTarget;
  targetAmountMinor: bigint | null;
  targetMonths: number | null;
};

export type ContingencyReserveSnapshot =
  | { status: "unset" }
  | {
      amountMinor: bigint;
      basisPoints: number;
      source: Exclude<ContingencyReserve["kind"], "unset">;
      status: "defined";
    };

export type BudgetTargetSnapshot = {
  allocatedBasisPoints: number;
  allocation: TargetAllocation;
  alpBaseMinor: bigint | null;
  alpShortfall: TargetShortfall | null;
  amounts: BudgetTargetAmounts;
  comparison: BudgetTargetComparisonRow[];
  coverage: BudgetTargetCoverageSnapshot;
  excessBasisPoints: number;
  excessMinor: bigint;
  incomeMinor: bigint;
  isFinalViable: boolean;
  partialStatuses: Pick<
    Record<AllocationCategory, CurrentAllocationStatus>,
    "alp" | "clf" | "serAndGiving"
  >;
  remainingBasisPoints: number;
  remainingMinor: bigint;
  reserve: ContingencyReserveSnapshot;
  serGivingAmounts: SerGivingAmounts | null;
  status: "under" | "exact" | "over";
  totalAllocatedMinor: bigint;
  essentialsShortfall: TargetShortfall | null;
  unclassifiedSmallMinor: bigint;
};

export type BudgetTargetBaseline = {
  allocation: TargetAllocation;
  emergencyPlan: EmergencyFundPlan;
  reserve: ContingencyReserve;
  reserveChoice: ContingencyReserve["kind"];
  reserveDraft: string;
  serGiving: SerGivingBreakdown;
};
