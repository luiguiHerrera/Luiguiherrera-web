import type { BudgetResult } from "./result-model.ts";
import {
  allocationCategories,
  type AllocationCategory,
  type BudgetTargetAmounts,
  type BudgetTargetSnapshot,
  type CurrentAllocationMap,
  type TargetAllocation,
} from "./target-types.ts";
import { reconcileAllocationAmountsBigInt } from "./target-calculations.ts";
import {
  supportedCurrencies,
  type BudgetCurrency,
} from "./types.ts";
import type {
  BudgetProjectionCategoryDifference,
  BudgetProjectionComparison,
  BudgetProjectionComparisonKnowledge,
  BudgetProjectionHorizonMonths,
  BudgetProjectionResult,
  ExactBudgetProjectionDifference,
  MonthlyBudgetProjectionCategory,
  MonthlyBudgetProjectionScenario,
} from "./projection-types.ts";

const BASIS_POINTS_TOTAL = BigInt(10_000);
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const knowledgeStatuses = [
  "known",
  "partial",
  "notDifferentiated",
  "notAsked",
] as const;
const projectionScenarioIds = ["current", "target", "educational5010"] as const;
const projectionHorizons = [1, 12, 60] as const;

export const EDUCATIONAL_50_10_ALLOCATION: Readonly<TargetAllocation> = Object.freeze({
  alp: 1_000,
  clf: 1_000,
  education: 1_000,
  enjoyment: 1_000,
  essentials: 5_000,
  serAndGiving: 1_000,
});

export type CurrentBudgetProjectionSource = {
  allocation: CurrentAllocationMap;
  currency: BudgetCurrency;
  result: Pick<BudgetResult, "monthlyIncomeMinor" | "totalAssignedMinor">;
};

function assertNonNegativeBigInt(
  value: unknown,
  name: string,
): asserts value is bigint {
  if (typeof value !== "bigint") {
    throw new TypeError(`${name} must be a bigint`);
  }
  if (value < BigInt(0)) {
    throw new RangeError(`${name} must be a non-negative bigint`);
  }
}

function safeMinorToBigInt(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} is outside the supported monetary range`);
  }
  return BigInt(value);
}

function totalBasisPoints(amountMinor: bigint, incomeMinor: bigint) {
  if (incomeMinor === BigInt(0)) return null;
  const basisPoints = (
    amountMinor * BASIS_POINTS_TOTAL + incomeMinor / BigInt(2)
  ) / incomeMinor;
  if (basisPoints > MAX_SAFE) {
    throw new RangeError("Allocated basis points exceed the supported range");
  }
  return Number(basisPoints);
}

function allocationStatus(totalAllocatedMinor: bigint, incomeMinor: bigint) {
  return totalAllocatedMinor < incomeMinor
    ? "under" as const
    : totalAllocatedMinor === incomeMinor ? "exact" as const : "over" as const;
}

function projectionInvariantError(
  subject: "comparison" | "result" | "scenario",
  message: string,
) {
  return new Error(`Projection ${subject} invariant failed: ${message}`);
}

function assertValidBasisPoints(
  value: unknown,
  name: string,
  nullable: boolean,
) {
  if (nullable && value === null) return;
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${name} must be non-negative safe-integer basis points`);
  }
}

function assertValidScenarioId(value: unknown, subject: "result" | "scenario") {
  if (!projectionScenarioIds.includes(value as (typeof projectionScenarioIds)[number])) {
    throw new TypeError(`Projection ${subject} has an unknown scenario identifier`);
  }
}

function assertValidCurrency(value: unknown, subject: "result" | "scenario") {
  if (!supportedCurrencies.includes(value as BudgetCurrency)) {
    throw new TypeError(`Projection ${subject} has an unsupported currency`);
  }
}

function assertValidComparisonKnowledge(
  knowledge: BudgetProjectionComparisonKnowledge | null,
  subject: "result" | "scenario",
) {
  if (knowledge === null) return;
  if (typeof knowledge !== "object") {
    throw new TypeError(`Projection ${subject} comparison knowledge must be an object or null`);
  }
  const keys = Object.keys(knowledge);
  if (keys.length !== allocationCategories.length
    || !allocationCategories.every((category) => (
      Object.prototype.hasOwnProperty.call(knowledge, category)
      && knowledgeStatuses.includes(knowledge[category])
    ))) {
    throw projectionInvariantError(
      subject,
      "comparison knowledge must contain the six canonical categories",
    );
  }
}

function cloneComparisonKnowledge(
  knowledge: BudgetProjectionComparisonKnowledge | null,
) {
  return knowledge === null ? null : { ...knowledge };
}

function assertCanonicalCategories(
  categories: ReadonlyArray<{ category: AllocationCategory }>,
  subject: "comparison" | "result" | "scenario" = "scenario",
) {
  if (!Array.isArray(categories)) {
    throw new TypeError(`Projection ${subject} categories must be an array`);
  }
  if (categories.length !== allocationCategories.length
    || !allocationCategories.every((category, index) => (
      categories[index]?.category === category
    ))) {
    throw projectionInvariantError(
      subject,
      "categories must be unique and follow the canonical allocation order",
    );
  }
}

type ProjectionInvariantValues = Pick<
  MonthlyBudgetProjectionScenario,
  | "allocatedBasisPoints"
  | "allocationStatus"
  | "categories"
  | "comparableTotalMinor"
  | "comparisonKnowledge"
  | "currency"
  | "excessMinor"
  | "knowledgeStatus"
  | "scenarioId"
  | "totalAllocatedMinor"
  | "unallocatedMinor"
  | "undifferentiatedMinor"
>;

function assertValidProjectionValues(
  projection: ProjectionInvariantValues,
  incomeMinor: bigint,
  subject: "result" | "scenario",
) {
  assertValidScenarioId(projection.scenarioId, subject);
  assertValidCurrency(projection.currency, subject);
  assertValidBasisPoints(
    projection.allocatedBasisPoints,
    `Projection ${subject} allocated basis points`,
    true,
  );
  if (projection.allocationStatus !== "under"
    && projection.allocationStatus !== "exact"
    && projection.allocationStatus !== "over") {
    throw new TypeError(`Projection ${subject} has an unknown allocation status`);
  }
  if (projection.knowledgeStatus !== "complete"
    && projection.knowledgeStatus !== "partial") {
    throw new TypeError(`Projection ${subject} has an unknown knowledge status`);
  }
  assertValidComparisonKnowledge(projection.comparisonKnowledge, subject);
  assertCanonicalCategories(projection.categories, subject);
  assertNonNegativeBigInt(
    projection.totalAllocatedMinor,
    `Projection ${subject} total allocated`,
  );
  assertNonNegativeBigInt(
    projection.comparableTotalMinor,
    `Projection ${subject} comparable total`,
  );
  assertNonNegativeBigInt(
    projection.undifferentiatedMinor,
    `Projection ${subject} undifferentiated amount`,
  );
  assertNonNegativeBigInt(
    projection.unallocatedMinor,
    `Projection ${subject} unallocated amount`,
  );
  assertNonNegativeBigInt(
    projection.excessMinor,
    `Projection ${subject} excess amount`,
  );

  let representedTotalMinor = BigInt(0);
  let comparableTotalMinor = BigInt(0);
  let allCategoriesKnown = true;
  for (const category of projection.categories) {
    if (!knowledgeStatuses.includes(category.knowledgeStatus)) {
      throw new TypeError(`Projection ${subject} category has an unknown knowledge status`);
    }
    assertValidBasisPoints(
      category.basisPoints,
      `Projection ${subject} category basis points`,
      true,
    );
    if (category.amountMinor !== null) {
      assertNonNegativeBigInt(
        category.amountMinor,
        `Projection ${subject} category amount`,
      );
      representedTotalMinor += category.amountMinor;
    }
    if (category.knowledgeStatus === "known") {
      if (category.amountMinor === null) {
        throw projectionInvariantError(
          subject,
          "a known category must have an amount",
        );
      }
      comparableTotalMinor += category.amountMinor;
    } else {
      allCategoriesKnown = false;
      if (category.basisPoints !== null) {
        throw projectionInvariantError(
          subject,
          "a non-known category cannot have exact basis points",
        );
      }
      if ((category.knowledgeStatus === "notAsked"
          || category.knowledgeStatus === "notDifferentiated")
        && category.amountMinor !== null) {
        throw projectionInvariantError(
          subject,
          "an unknown category must use null rather than a known zero",
        );
      }
      if (category.knowledgeStatus === "partial" && category.amountMinor === null) {
        throw projectionInvariantError(
          subject,
          "a partial category must preserve its known subtotal",
        );
      }
    }
  }

  if (representedTotalMinor > projection.totalAllocatedMinor) {
    throw projectionInvariantError(
      subject,
      "represented category amounts cannot exceed total allocated",
    );
  }
  if (projection.comparableTotalMinor !== comparableTotalMinor
    || comparableTotalMinor > representedTotalMinor) {
    throw projectionInvariantError(
      subject,
      "comparable total must equal the sum of known categories",
    );
  }
  if (projection.undifferentiatedMinor
    !== projection.totalAllocatedMinor - representedTotalMinor) {
    throw projectionInvariantError(
      subject,
      "undifferentiated amount must equal total allocated minus represented categories",
    );
  }
  const expectedKnowledgeStatus = allCategoriesKnown
    && projection.undifferentiatedMinor === BigInt(0)
    ? "complete"
    : "partial";
  if (projection.knowledgeStatus !== expectedKnowledgeStatus) {
    throw projectionInvariantError(
      subject,
      "knowledge status contradicts category knowledge or residual amount",
    );
  }

  const expectedStatus = allocationStatus(projection.totalAllocatedMinor, incomeMinor);
  const expectedUnallocated = incomeMinor > projection.totalAllocatedMinor
    ? incomeMinor - projection.totalAllocatedMinor
    : BigInt(0);
  const expectedExcess = projection.totalAllocatedMinor > incomeMinor
    ? projection.totalAllocatedMinor - incomeMinor
    : BigInt(0);
  if (projection.allocationStatus !== expectedStatus) {
    throw projectionInvariantError(
      subject,
      `${expectedStatus} allocation status must match income and total allocated`,
    );
  }
  if (projection.unallocatedMinor !== expectedUnallocated) {
    throw projectionInvariantError(
      subject,
      "unallocated amount contradicts income and total allocated",
    );
  }
  if (projection.excessMinor !== expectedExcess) {
    throw projectionInvariantError(
      subject,
      "excess amount contradicts income and total allocated",
    );
  }
}

function assertValidMonthlyBudgetProjectionScenario(
  scenario: MonthlyBudgetProjectionScenario,
) {
  assertNonNegativeBigInt(
    scenario.monthlyIncomeMinor,
    "Projection scenario monthly income",
  );
  assertValidProjectionValues(scenario, scenario.monthlyIncomeMinor, "scenario");
}

function assertAccumulatedMultiple(
  value: bigint | null,
  multiplier: bigint,
  name: string,
) {
  if (value !== null && value % multiplier !== BigInt(0)) {
    throw projectionInvariantError(
      "result",
      `${name} must be a monthly value multiplied by the horizon`,
    );
  }
}

function assertValidBudgetProjectionResult(result: BudgetProjectionResult) {
  if (!projectionHorizons.includes(result.horizonMonths)) {
    throw new RangeError("Projection result horizon must be 1, 12, or 60 months");
  }
  assertNonNegativeBigInt(
    result.monthlyIncomeMinor,
    "Projection result monthly income",
  );
  assertNonNegativeBigInt(
    result.accumulatedIncomeMinor,
    "Projection result accumulated income",
  );
  const multiplier = BigInt(result.horizonMonths);
  if (result.accumulatedIncomeMinor !== result.monthlyIncomeMinor * multiplier) {
    throw projectionInvariantError(
      "result",
      "accumulated income must equal monthly income multiplied by the horizon",
    );
  }
  assertValidProjectionValues(result, result.accumulatedIncomeMinor, "result");
  for (const category of result.categories) {
    assertAccumulatedMultiple(category.amountMinor, multiplier, "category amount");
  }
  assertAccumulatedMultiple(result.totalAllocatedMinor, multiplier, "total allocated");
  assertAccumulatedMultiple(result.comparableTotalMinor, multiplier, "comparable total");
  assertAccumulatedMultiple(
    result.undifferentiatedMinor,
    multiplier,
    "undifferentiated amount",
  );
  assertAccumulatedMultiple(result.unallocatedMinor, multiplier, "unallocated amount");
  assertAccumulatedMultiple(result.excessMinor, multiplier, "excess amount");
}

function targetComparisonKnowledge(
  snapshot: BudgetTargetSnapshot,
): BudgetProjectionComparisonKnowledge {
  assertCanonicalCategories(snapshot.comparison);
  return Object.fromEntries(snapshot.comparison.map((row) => [
    row.category,
    row.currentStatus,
  ])) as BudgetProjectionComparisonKnowledge;
}

export function buildCurrentBudgetProjectionScenario({
  allocation,
  currency,
  result,
}: CurrentBudgetProjectionSource): MonthlyBudgetProjectionScenario {
  const incomeMinor = safeMinorToBigInt(
    result.monthlyIncomeMinor,
    "Current monthly income",
  );
  const totalAllocatedMinor = safeMinorToBigInt(
    result.totalAssignedMinor,
    "Current total assigned",
  );

  let comparableTotalMinor = BigInt(0);
  let representedTotalMinor = BigInt(0);
  const categories: MonthlyBudgetProjectionCategory[] = allocationCategories.map((category) => {
    const current = allocation[category];
    if (current.amountMinor !== null) {
      safeMinorToBigInt(current.amountMinor, `Current ${category} amount`);
    }
    if (current.basisPoints !== null
      && (!Number.isSafeInteger(current.basisPoints) || current.basisPoints < 0)) {
      throw new RangeError(`Current ${category} basis points are outside the supported range`);
    }
    if (current.status === "known" && current.amountMinor === null) {
      throw new RangeError(`Known current ${category} amount cannot be null`);
    }

    const amountMinor = current.amountMinor === null
      ? null
      : BigInt(current.amountMinor);
    representedTotalMinor += amountMinor ?? BigInt(0);
    if (current.status === "known") {
      comparableTotalMinor += amountMinor!;
    }
    return {
      amountMinor,
      basisPoints: current.basisPoints,
      category,
      knowledgeStatus: current.status,
    };
  });

  if (representedTotalMinor > totalAllocatedMinor) {
    throw new RangeError("Current categorized amounts exceed the known assigned total");
  }
  const undifferentiatedMinor = totalAllocatedMinor - representedTotalMinor;
  const knowledgeStatus = categories.every((category) => (
    category.knowledgeStatus === "known"
  )) && undifferentiatedMinor === BigInt(0)
    ? "complete" as const
    : "partial" as const;

  const scenario: MonthlyBudgetProjectionScenario = {
    allocatedBasisPoints: totalBasisPoints(totalAllocatedMinor, incomeMinor),
    allocationStatus: allocationStatus(totalAllocatedMinor, incomeMinor),
    categories,
    comparableTotalMinor,
    comparisonKnowledge: null,
    currency,
    excessMinor: totalAllocatedMinor > incomeMinor
      ? totalAllocatedMinor - incomeMinor
      : BigInt(0),
    knowledgeStatus,
    monthlyIncomeMinor: incomeMinor,
    scenarioId: "current",
    totalAllocatedMinor,
    unallocatedMinor: incomeMinor > totalAllocatedMinor
      ? incomeMinor - totalAllocatedMinor
      : BigInt(0),
    undifferentiatedMinor,
  };
  assertValidMonthlyBudgetProjectionScenario(scenario);
  return scenario;
}

export function buildTargetBudgetProjectionScenario(
  snapshot: BudgetTargetSnapshot,
  currency: BudgetCurrency,
): MonthlyBudgetProjectionScenario {
  assertNonNegativeBigInt(snapshot.incomeMinor, "Target monthly income");
  assertNonNegativeBigInt(snapshot.totalAllocatedMinor, "Target total allocated");
  assertNonNegativeBigInt(snapshot.remainingMinor, "Target unallocated amount");
  assertNonNegativeBigInt(snapshot.excessMinor, "Target excess amount");

  const categories = allocationCategories.map((category) => {
    const amountMinor = snapshot.amounts[category];
    assertNonNegativeBigInt(amountMinor, `Target ${category} amount`);
    return {
      amountMinor,
      basisPoints: snapshot.allocation[category],
      category,
      knowledgeStatus: "known" as const,
    };
  });

  const scenario: MonthlyBudgetProjectionScenario = {
    allocatedBasisPoints: snapshot.allocatedBasisPoints,
    allocationStatus: snapshot.status,
    categories,
    comparableTotalMinor: snapshot.totalAllocatedMinor,
    comparisonKnowledge: targetComparisonKnowledge(snapshot),
    currency,
    excessMinor: snapshot.excessMinor,
    knowledgeStatus: "complete",
    monthlyIncomeMinor: snapshot.incomeMinor,
    scenarioId: "target",
    totalAllocatedMinor: snapshot.totalAllocatedMinor,
    unallocatedMinor: snapshot.remainingMinor,
    undifferentiatedMinor: BigInt(0),
  };
  assertValidMonthlyBudgetProjectionScenario(scenario);
  return scenario;
}

export function buildEducational5010BudgetProjectionScenario(
  incomeMinor: bigint,
  currency: BudgetCurrency,
): MonthlyBudgetProjectionScenario {
  assertNonNegativeBigInt(incomeMinor, "Educational 50/10 monthly income");
  const allocation = { ...EDUCATIONAL_50_10_ALLOCATION };
  let amounts: BudgetTargetAmounts;
  if (incomeMinor === BigInt(0)) {
    amounts = Object.fromEntries(allocationCategories.map((category) => [
      category,
      BigInt(0),
    ])) as BudgetTargetAmounts;
  } else {
    const reconciled = reconcileAllocationAmountsBigInt(incomeMinor, allocation);
    if (reconciled.status !== "ok") {
      throw new RangeError("Educational 50/10 income is outside the supported range");
    }
    amounts = reconciled.value;
  }
  const categories = allocationCategories.map((category) => ({
    amountMinor: amounts[category],
    basisPoints: allocation[category],
    category,
    knowledgeStatus: "known" as const,
  }));
  const totalAllocatedMinor = categories.reduce(
    (total, category) => total + category.amountMinor,
    BigInt(0),
  );

  const scenario: MonthlyBudgetProjectionScenario = {
    allocatedBasisPoints: 10_000,
    allocationStatus: "exact",
    categories,
    comparableTotalMinor: totalAllocatedMinor,
    comparisonKnowledge: null,
    currency,
    excessMinor: BigInt(0),
    knowledgeStatus: "complete",
    monthlyIncomeMinor: incomeMinor,
    scenarioId: "educational5010",
    totalAllocatedMinor,
    unallocatedMinor: BigInt(0),
    undifferentiatedMinor: BigInt(0),
  };
  assertValidMonthlyBudgetProjectionScenario(scenario);
  return scenario;
}

export function projectBudgetScenario(
  scenario: MonthlyBudgetProjectionScenario,
  horizonMonths: BudgetProjectionHorizonMonths,
): BudgetProjectionResult {
  if (horizonMonths !== 1 && horizonMonths !== 12 && horizonMonths !== 60) {
    throw new RangeError("Projection horizon must be 1, 12, or 60 months");
  }
  assertValidMonthlyBudgetProjectionScenario(scenario);
  const multiplier = BigInt(horizonMonths);
  const result: BudgetProjectionResult = {
    allocatedBasisPoints: scenario.allocatedBasisPoints,
    accumulatedIncomeMinor: scenario.monthlyIncomeMinor * multiplier,
    allocationStatus: scenario.allocationStatus,
    categories: scenario.categories.map((category) => ({
      ...category,
      amountMinor: category.amountMinor === null
        ? null
        : category.amountMinor * multiplier,
    })),
    comparableTotalMinor: scenario.comparableTotalMinor * multiplier,
    comparisonKnowledge: cloneComparisonKnowledge(scenario.comparisonKnowledge),
    currency: scenario.currency,
    excessMinor: scenario.excessMinor * multiplier,
    horizonMonths,
    knowledgeStatus: scenario.knowledgeStatus,
    monthlyIncomeMinor: scenario.monthlyIncomeMinor,
    scenarioId: scenario.scenarioId,
    totalAllocatedMinor: scenario.totalAllocatedMinor * multiplier,
    unallocatedMinor: scenario.unallocatedMinor * multiplier,
    undifferentiatedMinor: scenario.undifferentiatedMinor * multiplier,
  };
  assertValidBudgetProjectionResult(result);
  return result;
}

function compareCategory(
  base: BudgetProjectionResult["categories"][number],
  comparison: BudgetProjectionResult["categories"][number],
): BudgetProjectionCategoryDifference {
  if (base.knowledgeStatus !== "known"
    || comparison.knowledgeStatus !== "known"
    || base.amountMinor === null
    || comparison.amountMinor === null) {
    return {
      amountMinor: null,
      baseKnowledgeStatus: base.knowledgeStatus,
      category: base.category,
      comparability: "partial",
      comparisonKnowledgeStatus: comparison.knowledgeStatus,
    };
  }
  return {
    amountMinor: comparison.amountMinor - base.amountMinor,
    baseKnowledgeStatus: base.knowledgeStatus,
    category: base.category,
    comparability: "exact",
    comparisonKnowledgeStatus: comparison.knowledgeStatus,
  };
}

function exactDifference(
  base: bigint,
  comparison: bigint,
): ExactBudgetProjectionDifference {
  return {
    amountMinor: comparison - base,
    comparability: "exact",
  };
}

function assertValidDifference(
  difference: { amountMinor: bigint | null; comparability: "exact" | "partial" },
  name: string,
) {
  if (difference.comparability === "exact") {
    if (typeof difference.amountMinor !== "bigint") {
      throw projectionInvariantError(
        "comparison",
        `${name} exact difference must contain a bigint amount`,
      );
    }
    return;
  }
  if (difference.comparability === "partial") {
    if (difference.amountMinor !== null) {
      throw projectionInvariantError(
        "comparison",
        `${name} partial difference must contain a null amount`,
      );
    }
    return;
  }
  throw new TypeError(`Projection comparison ${name} has unknown comparability`);
}

export function assertValidBudgetProjectionComparison(
  comparison: BudgetProjectionComparison,
) {
  assertValidScenarioId(comparison.baseScenarioId, "result");
  assertValidScenarioId(comparison.comparisonScenarioId, "result");
  assertValidCurrency(comparison.currency, "result");
  if (!projectionHorizons.includes(comparison.horizonMonths)) {
    throw new RangeError("Projection comparison horizon must be 1, 12, or 60 months");
  }
  assertCanonicalCategories(comparison.categories, "comparison");
  for (const category of comparison.categories) {
    if (!knowledgeStatuses.includes(category.baseKnowledgeStatus)
      || !knowledgeStatuses.includes(category.comparisonKnowledgeStatus)) {
      throw new TypeError("Projection comparison category has unknown knowledge status");
    }
    assertValidDifference(category, "category");
    const expectedCategoryComparability = category.baseKnowledgeStatus === "known"
      && category.comparisonKnowledgeStatus === "known"
      ? "exact"
      : "partial";
    if (category.comparability !== expectedCategoryComparability) {
      throw projectionInvariantError(
        "comparison",
        "category comparability must match both knowledge statuses",
      );
    }
  }
  const expectedComparability = comparison.categories.every((category) => (
    category.comparability === "exact"
  )) ? "exact" : "partial";
  if (comparison.comparability !== expectedComparability) {
    throw projectionInvariantError(
      "comparison",
      "overall comparability must match category comparability",
    );
  }
  assertValidDifference(comparison.totalDifference, "total");
  assertValidDifference(comparison.unallocatedDifference, "unallocated");
  assertValidDifference(comparison.excessDifference, "excess");
  if (comparison.totalDifference.comparability !== "exact"
    || comparison.unallocatedDifference.comparability !== "exact"
    || comparison.excessDifference.comparability !== "exact") {
    throw projectionInvariantError(
      "comparison",
      "total, unallocated, and excess differences must be exact",
    );
  }
}

export function compareBudgetProjectionScenarios(
  base: BudgetProjectionResult,
  comparison: BudgetProjectionResult,
): BudgetProjectionComparison {
  assertValidBudgetProjectionResult(base);
  assertValidBudgetProjectionResult(comparison);
  if (base.horizonMonths !== comparison.horizonMonths) {
    throw new RangeError("Projection horizons must match before comparison");
  }
  if (base.currency !== comparison.currency) {
    throw new RangeError("Projection currencies must match before comparison");
  }
  const categories = base.categories.map((baseCategory, index) => compareCategory(
    baseCategory,
    comparison.categories[index]!,
  ));
  const result: BudgetProjectionComparison = {
    baseScenarioId: base.scenarioId,
    categories,
    comparability: categories.every((category) => category.comparability === "exact")
      ? "exact"
      : "partial",
    comparisonScenarioId: comparison.scenarioId,
    currency: base.currency,
    excessDifference: exactDifference(
      base.excessMinor,
      comparison.excessMinor,
    ),
    horizonMonths: base.horizonMonths,
    totalDifference: exactDifference(
      base.totalAllocatedMinor,
      comparison.totalAllocatedMinor,
    ),
    unallocatedDifference: exactDifference(
      base.unallocatedMinor,
      comparison.unallocatedMinor,
    ),
  };
  assertValidBudgetProjectionComparison(result);
  return result;
}
