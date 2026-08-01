import type { BudgetCurrency } from "./types.ts";
import type {
  AllocationCategory,
  CurrentAllocationStatus,
} from "./target-types.ts";

export type BudgetProjectionScenarioId =
  | "current"
  | "target"
  | "educational5010";

export type BudgetProjectionHorizonMonths = 1 | 12 | 60;

export type BudgetProjectionAllocationStatus = "under" | "exact" | "over";

export type BudgetProjectionKnowledgeStatus = "complete" | "partial";

export type MonthlyBudgetProjectionCategory = {
  amountMinor: bigint | null;
  basisPoints: number | null;
  category: AllocationCategory;
  knowledgeStatus: CurrentAllocationStatus;
};

export type BudgetProjectionComparisonKnowledge = Record<
  AllocationCategory,
  CurrentAllocationStatus
>;

export type MonthlyBudgetProjectionScenario = {
  allocatedBasisPoints: number | null;
  allocationStatus: BudgetProjectionAllocationStatus;
  categories: MonthlyBudgetProjectionCategory[];
  comparableTotalMinor: bigint;
  comparisonKnowledge: BudgetProjectionComparisonKnowledge | null;
  currency: BudgetCurrency;
  excessMinor: bigint;
  knowledgeStatus: BudgetProjectionKnowledgeStatus;
  monthlyIncomeMinor: bigint;
  scenarioId: BudgetProjectionScenarioId;
  totalAllocatedMinor: bigint;
  unallocatedMinor: bigint;
  undifferentiatedMinor: bigint;
};

export type AccumulatedBudgetProjectionCategory = {
  amountMinor: bigint | null;
  basisPoints: number | null;
  category: AllocationCategory;
  knowledgeStatus: CurrentAllocationStatus;
};

export type BudgetProjectionResult = {
  allocatedBasisPoints: number | null;
  accumulatedIncomeMinor: bigint;
  allocationStatus: BudgetProjectionAllocationStatus;
  categories: AccumulatedBudgetProjectionCategory[];
  comparableTotalMinor: bigint;
  comparisonKnowledge: BudgetProjectionComparisonKnowledge | null;
  currency: BudgetCurrency;
  excessMinor: bigint;
  horizonMonths: BudgetProjectionHorizonMonths;
  knowledgeStatus: BudgetProjectionKnowledgeStatus;
  monthlyIncomeMinor: bigint;
  scenarioId: BudgetProjectionScenarioId;
  totalAllocatedMinor: bigint;
  unallocatedMinor: bigint;
  undifferentiatedMinor: bigint;
};

export type ExactBudgetProjectionDifference = {
  amountMinor: bigint;
  comparability: "exact";
};

export type PartialBudgetProjectionDifference = {
  amountMinor: null;
  comparability: "partial";
};

export type BudgetProjectionDifference =
  | ExactBudgetProjectionDifference
  | PartialBudgetProjectionDifference;

export type BudgetProjectionCategoryDifference = BudgetProjectionDifference & {
  baseKnowledgeStatus: CurrentAllocationStatus;
  category: AllocationCategory;
  comparisonKnowledgeStatus: CurrentAllocationStatus;
};

export type BudgetProjectionComparison = {
  baseScenarioId: BudgetProjectionScenarioId;
  categories: BudgetProjectionCategoryDifference[];
  comparability: "exact" | "partial";
  comparisonScenarioId: BudgetProjectionScenarioId;
  currency: BudgetCurrency;
  excessDifference: ExactBudgetProjectionDifference;
  horizonMonths: BudgetProjectionHorizonMonths;
  totalDifference: ExactBudgetProjectionDifference;
  unallocatedDifference: ExactBudgetProjectionDifference;
};
