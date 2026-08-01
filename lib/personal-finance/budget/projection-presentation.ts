import { compareBudgetProjectionScenarios } from "./projection-calculations.ts";
import {
  allocationCategories,
  type AllocationCategory,
  type CurrentAllocationStatus,
  type SerGivingAmounts,
} from "./target-types.ts";
import type {
  BudgetProjectionComparison,
  BudgetProjectionHorizonMonths,
  BudgetProjectionResult,
  BudgetProjectionScenarioId,
} from "./projection-types.ts";

const scenarioOrder: BudgetProjectionScenarioId[] = [
  "current",
  "target",
  "educational5010",
];

export type VisibleProjectionScenarios = Record<
  BudgetProjectionScenarioId,
  boolean
>;

export type VisibleProjectionComparisonSelection = {
  activeScenarioIds: BudgetProjectionScenarioId[];
  baseScenarioId: BudgetProjectionScenarioId;
  comparisons: Partial<Record<BudgetProjectionScenarioId, BudgetProjectionComparison>>;
};

export type ProjectionAmountPresentation =
  | {
      amountMinor: bigint;
      kind: "exact" | "knownSubtotal";
      knowledgeStatus: CurrentAllocationStatus;
    }
  | {
      amountMinor: null;
      kind: "unavailable";
      knowledgeStatus: CurrentAllocationStatus;
    };

export type ProjectedSerGivingBreakdown =
  | { status: "unavailable" }
  | {
      accumulatedGivingMinor: bigint;
      accumulatedSerMinor: bigint;
      accumulatedTotalMinor: bigint;
      monthlyGivingMinor: bigint;
      monthlySerMinor: bigint;
      monthlyTotalMinor: bigint;
      status: "available";
    };

export type BudgetProjectionHighlight =
  | {
      amountMinor: bigint;
      category: AllocationCategory;
      kind: "categoryIncrease" | "categoryDecrease" | "zeroToPositive";
    }
  | {
      amountMinor: bigint;
      kind: "unallocated" | "excess";
    }
  | {
      category: AllocationCategory;
      kind: "partial";
    };

function absolute(value: bigint) {
  return value < BigInt(0) ? -value : value;
}

function categoryIndex(category: AllocationCategory) {
  return allocationCategories.indexOf(category);
}

function compareMagnitudeDescending(
  left: { amountMinor: bigint; category: AllocationCategory },
  right: { amountMinor: bigint; category: AllocationCategory },
) {
  const magnitude = absolute(right.amountMinor) - absolute(left.amountMinor);
  if (magnitude !== BigInt(0)) return magnitude > BigInt(0) ? 1 : -1;
  return categoryIndex(left.category) - categoryIndex(right.category);
}

export function selectVisibleProjectionComparison(
  projected: Record<BudgetProjectionScenarioId, BudgetProjectionResult>,
  visible: VisibleProjectionScenarios,
): VisibleProjectionComparisonSelection {
  const activeScenarioIds = scenarioOrder.filter((scenarioId) => visible[scenarioId]);
  if (activeScenarioIds.length === 0) {
    throw new RangeError("At least one projection scenario must be visible");
  }

  const baseScenarioId = visible.current
    ? "current"
    : visible.target ? "target" : "educational5010";
  const base = projected[baseScenarioId];
  const comparisons = Object.fromEntries(activeScenarioIds
    .filter((scenarioId) => scenarioId !== baseScenarioId)
    .map((scenarioId) => [
      scenarioId,
      compareBudgetProjectionScenarios(base, projected[scenarioId]),
    ])) as Partial<Record<BudgetProjectionScenarioId, BudgetProjectionComparison>>;

  return { activeScenarioIds, baseScenarioId, comparisons };
}

export function selectPrimaryVisibleProjectionScenario(
  visible: VisibleProjectionScenarios,
): BudgetProjectionScenarioId {
  if (visible.target) return "target";
  if (visible.current) return "current";
  if (visible.educational5010) return "educational5010";
  throw new RangeError("At least one projection scenario must be visible");
}

export function selectProjectionFocusContext({
  horizonMonths,
  visible,
}: {
  horizonMonths: BudgetProjectionHorizonMonths;
  visible: VisibleProjectionScenarios;
}) {
  return {
    horizonMonths,
    scenarioId: selectPrimaryVisibleProjectionScenario(visible),
  };
}

export function buildProjectionAmountPresentation({
  amountMinor,
  knowledgeStatus,
}: {
  amountMinor: bigint | null;
  knowledgeStatus: CurrentAllocationStatus;
}): ProjectionAmountPresentation {
  if (amountMinor === null) {
    return { amountMinor, kind: "unavailable", knowledgeStatus };
  }
  return {
    amountMinor,
    kind: knowledgeStatus === "known" ? "exact" : "knownSubtotal",
    knowledgeStatus,
  };
}

export function buildProjectedSerGivingBreakdown({
  horizonMonths,
  monthlyBreakdown,
  primaryScenarioId,
  result,
}: {
  horizonMonths: BudgetProjectionHorizonMonths;
  monthlyBreakdown: SerGivingAmounts | null;
  primaryScenarioId: BudgetProjectionScenarioId;
  result: BudgetProjectionResult;
}): ProjectedSerGivingBreakdown {
  if (primaryScenarioId !== "target"
    || result.scenarioId !== "target"
    || result.horizonMonths !== horizonMonths
    || monthlyBreakdown === null
    || monthlyBreakdown.serMinor < BigInt(0)
    || monthlyBreakdown.givingMinor < BigInt(0)) {
    return { status: "unavailable" };
  }

  const projectedCategory = result.categories.find((category) => (
    category.category === "serAndGiving"
  ));
  if (!projectedCategory
    || projectedCategory.knowledgeStatus !== "known"
    || projectedCategory.amountMinor === null) {
    return { status: "unavailable" };
  }

  const multiplier = BigInt(horizonMonths);
  const monthlySerMinor = monthlyBreakdown.serMinor;
  const monthlyGivingMinor = monthlyBreakdown.givingMinor;
  const monthlyTotalMinor = monthlySerMinor + monthlyGivingMinor;
  const accumulatedSerMinor = monthlySerMinor * multiplier;
  const accumulatedGivingMinor = monthlyGivingMinor * multiplier;
  const accumulatedTotalMinor = accumulatedSerMinor + accumulatedGivingMinor;
  if (accumulatedTotalMinor !== projectedCategory.amountMinor) {
    return { status: "unavailable" };
  }

  return {
    accumulatedGivingMinor,
    accumulatedSerMinor,
    accumulatedTotalMinor,
    monthlyGivingMinor,
    monthlySerMinor,
    monthlyTotalMinor,
    status: "available",
  };
}

export function buildBudgetProjectionHighlights({
  base,
  comparison,
  difference,
}: {
  base: BudgetProjectionResult;
  comparison: BudgetProjectionResult;
  difference: BudgetProjectionComparison;
}): BudgetProjectionHighlight[] {
  if (base.horizonMonths !== comparison.horizonMonths
    || base.horizonMonths !== difference.horizonMonths
    || base.currency !== comparison.currency
    || base.currency !== difference.currency
    || base.scenarioId !== difference.baseScenarioId
    || comparison.scenarioId !== difference.comparisonScenarioId) {
    throw new RangeError("Projection highlight inputs must describe the same comparison");
  }

  const exact = difference.categories.filter((category): category is typeof category & {
    amountMinor: bigint;
    comparability: "exact";
  } => category.comparability === "exact" && category.amountMinor !== null);
  const highlights: BudgetProjectionHighlight[] = [];
  const selectedCategories = new Set<AllocationCategory>();

  const largestIncrease = exact
    .filter((category) => category.amountMinor > BigInt(0))
    .sort(compareMagnitudeDescending)[0];
  if (largestIncrease) {
    highlights.push({
      amountMinor: largestIncrease.amountMinor,
      category: largestIncrease.category,
      kind: "categoryIncrease",
    });
    selectedCategories.add(largestIncrease.category);
  }

  const largestDecrease = exact
    .filter((category) => category.amountMinor < BigInt(0))
    .sort(compareMagnitudeDescending)[0];
  if (largestDecrease) {
    highlights.push({
      amountMinor: absolute(largestDecrease.amountMinor),
      category: largestDecrease.category,
      kind: "categoryDecrease",
    });
    selectedCategories.add(largestDecrease.category);
  }

  const zeroToPositive = exact.find((category) => {
    if (selectedCategories.has(category.category)) return false;
    const baseCategory = base.categories.find((item) => item.category === category.category);
    const comparisonCategory = comparison.categories.find((item) => (
      item.category === category.category
    ));
    if (!baseCategory || !comparisonCategory) return false;
    return baseCategory.amountMinor === BigInt(0)
      && comparisonCategory.amountMinor !== null
      && comparisonCategory.amountMinor > BigInt(0);
  });
  if (zeroToPositive) {
    highlights.push({
      amountMinor: zeroToPositive.amountMinor,
      category: zeroToPositive.category,
      kind: "zeroToPositive",
    });
    selectedCategories.add(zeroToPositive.category);
  }

  if (highlights.length < 3 && comparison.unallocatedMinor > BigInt(0)) {
    highlights.push({
      amountMinor: comparison.unallocatedMinor,
      kind: "unallocated",
    });
  }
  if (highlights.length < 3 && comparison.excessMinor > BigInt(0)) {
    highlights.push({
      amountMinor: comparison.excessMinor,
      kind: "excess",
    });
  }

  const partial = difference.categories.find((category) => (
    category.comparability === "partial"
    && !selectedCategories.has(category.category)
  ));
  if (highlights.length < 3 && partial) {
    highlights.push({ category: partial.category, kind: "partial" });
  }

  return highlights.slice(0, 3);
}
