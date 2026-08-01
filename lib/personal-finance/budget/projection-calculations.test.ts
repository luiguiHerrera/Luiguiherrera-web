import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCurrentBudgetProjectionScenario,
  buildEducational5010BudgetProjectionScenario,
  buildTargetBudgetProjectionScenario,
  compareBudgetProjectionScenarios,
  EDUCATIONAL_50_10_ALLOCATION,
  projectBudgetScenario,
  assertValidBudgetProjectionComparison,
} from "./projection-calculations.ts";
import {
  buildBudgetTargetSnapshot,
  classifyCurrentAllocation,
  reconcileAllocationAmountsBigInt,
} from "./target-calculations.ts";
import {
  allocationCategories,
  emptyTargetAllocation,
  type CurrentAllocationInput,
  type CurrentAllocationMap,
  type TargetAllocation,
} from "./target-types.ts";
import type { BudgetCurrency } from "./types.ts";
import type { BudgetProjectionComparison } from "./projection-types.ts";

const currentInput: CurrentAllocationInput = {
  debtPaymentsMinor: 500,
  educationMinor: 400,
  enjoymentMinor: 600,
  essentialsMinor: 1_500,
  incomeMinor: 10_000,
  monthlyNonMonthlyMinor: 300,
  personalDevelopmentMinor: 200,
  savingInvestmentMinor: 1_000,
  smallExpensesMinor: 100,
};

function buildSnapshot(
  allocation: TargetAllocation,
  input: CurrentAllocationInput = currentInput,
) {
  const result = buildBudgetTargetSnapshot({
    allocation,
    classification: { kind: "unclassified" },
    coverageBaseMinor: 2_000,
    currentInput: input,
    emergencyFundMinor: 4_000,
    emergencyPlan: {
      completionMonths: null,
      target: { kind: "unset" },
    },
    hasValidationErrors: false,
    reserve: { kind: "unset" },
    serGiving: { kind: "closed" },
  });
  assert.equal(result.status, "ok");
  if (result.status !== "ok") throw new Error("Expected a valid target snapshot");
  return result.value;
}

function sumCategories(
  categories: ReadonlyArray<{ amountMinor: bigint | null }>,
) {
  return categories.reduce(
    (total, category) => total + (category.amountMinor ?? BigInt(0)),
    BigInt(0),
  );
}

function knownCurrentAllocation(amounts: Record<
  (typeof allocationCategories)[number],
  number
>): CurrentAllocationMap {
  return Object.fromEntries(allocationCategories.map((category) => [
    category,
    {
      amountMinor: amounts[category],
      basisPoints: amounts[category],
      status: "known",
    },
  ])) as CurrentAllocationMap;
}

function buildKnownCurrentScenario(
  currency: BudgetCurrency = "EUR",
) {
  const allocation = knownCurrentAllocation({
    alp: 1_000,
    clf: 500,
    education: 500,
    enjoyment: 1_000,
    essentials: 4_000,
    serAndGiving: 1_000,
  });
  return buildCurrentBudgetProjectionScenario({
    allocation,
    currency,
    result: {
      monthlyIncomeMinor: 10_000,
      totalAssignedMinor: 8_000,
    },
  });
}

function buildPartialCurrentScenario() {
  return buildCurrentBudgetProjectionScenario({
    allocation: classifyCurrentAllocation(currentInput, {
      kind: "unclassified",
    }),
    currency: "EUR",
    result: {
      monthlyIncomeMinor: 10_000,
      totalAssignedMinor: 4_600,
    },
  });
}

test("educational 50/10 exposes the six canonical categories and exactly 10,000 bp", () => {
  assert.deepEqual(
    Object.keys(EDUCATIONAL_50_10_ALLOCATION).sort(),
    [...allocationCategories].sort(),
  );
  assert.equal(
    Object.values(EDUCATIONAL_50_10_ALLOCATION).reduce(
      (total, basisPoints) => total + basisPoints,
      0,
    ),
    10_000,
  );
  assert.deepEqual(EDUCATIONAL_50_10_ALLOCATION, {
    alp: 1_000,
    clf: 1_000,
    education: 1_000,
    enjoyment: 1_000,
    essentials: 5_000,
    serAndGiving: 1_000,
  });
});

test("educational 50/10 reconciles divisible income for EUR, USD, and JPY", () => {
  for (const currency of ["EUR", "USD", "JPY"] as const) {
    const scenario = buildEducational5010BudgetProjectionScenario(
      BigInt(10_000),
      currency,
    );
    assert.equal(scenario.scenarioId, "educational5010");
    assert.equal(scenario.currency, currency);
    assert.equal(scenario.categories.length, 6);
    assert.equal(scenario.categories[0]?.amountMinor, BigInt(5_000));
    assert.equal(sumCategories(scenario.categories), BigInt(10_000));
    assert.equal(scenario.totalAllocatedMinor, BigInt(10_000));
  }
});

test("educational 50/10 reconciles remainders deterministically to monthly income", () => {
  const first = buildEducational5010BudgetProjectionScenario(BigInt(10_001), "EUR");
  const second = buildEducational5010BudgetProjectionScenario(BigInt(10_001), "EUR");
  assert.deepEqual(first, second);
  assert.notStrictEqual(first.categories, second.categories);
  assert.equal(first.categories[0]?.category, "essentials");
  assert.equal(first.categories[0]?.amountMinor, BigInt(5_001));
  assert.equal(sumCategories(first.categories), BigInt(10_001));
  assert.equal(first.totalAllocatedMinor, first.monthlyIncomeMinor);
});

test("educational 50/10 handles zero and small incomes in canonical remainder order", () => {
  const cases = [
    { amounts: [BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)], income: BigInt(0) },
    { amounts: [BigInt(1), BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)], income: BigInt(1) },
    { amounts: [BigInt(1), BigInt(1), BigInt(0), BigInt(0), BigInt(0), BigInt(0)], income: BigInt(2) },
    { amounts: [BigInt(3), BigInt(1), BigInt(1), BigInt(0), BigInt(0), BigInt(0)], income: BigInt(5) },
    { amounts: [BigInt(3), BigInt(1), BigInt(1), BigInt(1), BigInt(0), BigInt(0)], income: BigInt(6) },
    { amounts: [BigInt(49), BigInt(10), BigInt(10), BigInt(10), BigInt(10), BigInt(10)], income: BigInt(99) },
    { amounts: [BigInt(50), BigInt(10), BigInt(10), BigInt(10), BigInt(10), BigInt(10)], income: BigInt(100) },
    { amounts: [BigInt(5_001), BigInt(1_000), BigInt(1_000), BigInt(1_000), BigInt(1_000), BigInt(1_000)], income: BigInt(10_001) },
  ] as const;

  for (const expected of cases) {
    const first = buildEducational5010BudgetProjectionScenario(expected.income, "EUR");
    const second = buildEducational5010BudgetProjectionScenario(expected.income, "EUR");
    assert.deepEqual(first, second);
    assert.equal(first.categories.length, allocationCategories.length);
    assert.deepEqual(
      first.categories.map((category) => category.category),
      [...allocationCategories],
    );
    assert.deepEqual(
      first.categories.map((category) => category.amountMinor),
      [...expected.amounts],
    );
    assert.deepEqual(
      first.categories.map((category) => category.basisPoints),
      allocationCategories.map((category) => EDUCATIONAL_50_10_ALLOCATION[category]),
    );
    assert.equal(sumCategories(first.categories), expected.income);
    assert.equal(first.totalAllocatedMinor, expected.income);
    assert.equal(first.monthlyIncomeMinor, expected.income);
    assert.equal(first.allocationStatus, "exact");
    assert.equal(first.unallocatedMinor, BigInt(0));
    assert.equal(first.excessMinor, BigInt(0));
    assert.equal(first.comparableTotalMinor, expected.income);
    assert.equal(first.undifferentiatedMinor, BigInt(0));
    assert.ok(first.categories.every((category) => category.amountMinor! >= BigInt(0)));

    if (expected.income > BigInt(0)) {
      const reconciled = reconcileAllocationAmountsBigInt(
        expected.income,
        { ...EDUCATIONAL_50_10_ALLOCATION },
      );
      assert.equal(reconciled.status, "ok");
      if (reconciled.status === "ok") {
        assert.deepEqual(
          first.categories.map((category) => category.amountMinor),
          allocationCategories.map((category) => reconciled.value[category]),
        );
      }
    }
  }
});

test("educational 50/10 rejects negative income", () => {
  assert.throws(
    () => buildEducational5010BudgetProjectionScenario(-BigInt(1), "EUR"),
    (error: unknown) => error instanceof RangeError && /non-negative bigint/.test(error.message),
  );
});

test("1, 12, and 60 month projections multiply reconciled monthly values", () => {
  const monthly = buildEducational5010BudgetProjectionScenario(BigInt(10_001), "USD");
  for (const horizon of [1, 12, 60] as const) {
    const projection = projectBudgetScenario(monthly, horizon);
    const multiplier = BigInt(horizon);
    for (const [index, category] of projection.categories.entries()) {
      assert.equal(
        category.amountMinor,
        monthly.categories[index]!.amountMinor! * multiplier,
      );
    }
    assert.equal(
      projection.totalAllocatedMinor,
      monthly.totalAllocatedMinor * multiplier,
    );
    assert.equal(projection.unallocatedMinor, monthly.unallocatedMinor * multiplier);
    assert.equal(projection.excessMinor, monthly.excessMinor * multiplier);
  }
  const annual = projectBudgetScenario(monthly, 12);
  assert.equal(annual.categories[0]?.amountMinor, BigInt(5_001) * BigInt(12));
  assert.notEqual(annual.categories[0]?.amountMinor, BigInt(60_006));
});

test("partial current projections multiply comparable and undifferentiated amounts", () => {
  const monthly = buildPartialCurrentScenario();
  assert.equal(monthly.comparableTotalMinor, BigInt(3_000));
  assert.equal(monthly.undifferentiatedMinor, BigInt(1_100));
  for (const horizon of [1, 12, 60] as const) {
    const projection = projectBudgetScenario(monthly, horizon);
    const multiplier = BigInt(horizon);
    for (const [index, category] of projection.categories.entries()) {
      const monthlyAmount = monthly.categories[index]!.amountMinor;
      assert.equal(
        category.amountMinor,
        monthlyAmount === null ? null : monthlyAmount * multiplier,
      );
      assert.equal(category.knowledgeStatus, monthly.categories[index]!.knowledgeStatus);
    }
    assert.equal(projection.totalAllocatedMinor, BigInt(4_600) * multiplier);
    assert.equal(projection.comparableTotalMinor, BigInt(3_000) * multiplier);
    assert.equal(projection.undifferentiatedMinor, BigInt(1_100) * multiplier);
    assert.equal(projection.unallocatedMinor, BigInt(5_400) * multiplier);
    assert.equal(projection.excessMinor, BigInt(0));
    assert.equal(projection.monthlyIncomeMinor, BigInt(10_000));
    assert.equal(projection.accumulatedIncomeMinor, BigInt(10_000) * multiplier);
    assert.equal(projection.allocationStatus, "under");
    assert.equal(projection.knowledgeStatus, "partial");
  }
});

test("target adapter preserves 0%, 99.99%, 100%, and over-100% snapshots", () => {
  const cases = [
    {
      allocation: { ...emptyTargetAllocation },
      excess: BigInt(0),
      remaining: BigInt(10_000),
      status: "under",
      total: BigInt(0),
    },
    {
      allocation: { ...emptyTargetAllocation, essentials: 9_999 },
      excess: BigInt(0),
      remaining: BigInt(1),
      status: "under",
      total: BigInt(9_999),
    },
    {
      allocation: { ...emptyTargetAllocation, essentials: 10_000 },
      excess: BigInt(0),
      remaining: BigInt(0),
      status: "exact",
      total: BigInt(10_000),
    },
    {
      allocation: { ...emptyTargetAllocation, essentials: 11_000 },
      excess: BigInt(1_000),
      remaining: BigInt(0),
      status: "over",
      total: BigInt(11_000),
    },
  ] as const;

  for (const expected of cases) {
    const snapshot = buildSnapshot(expected.allocation);
    const before = structuredClone(snapshot);
    const scenario = buildTargetBudgetProjectionScenario(snapshot, "EUR");
    assert.equal(scenario.allocationStatus, expected.status);
    assert.equal(scenario.totalAllocatedMinor, expected.total);
    assert.equal(scenario.unallocatedMinor, expected.remaining);
    assert.equal(scenario.excessMinor, expected.excess);
    assert.equal(scenario.comparableTotalMinor, snapshot.totalAllocatedMinor);
    assert.equal(scenario.undifferentiatedMinor, BigInt(0));
    assert.equal(scenario.knowledgeStatus, "complete");
    for (const category of scenario.categories) {
      assert.equal(category.amountMinor, snapshot.amounts[category.category]);
      assert.equal(category.basisPoints, snapshot.allocation[category.category]);
      assert.equal(category.knowledgeStatus, "known");
      assert.equal(typeof category.amountMinor, "bigint");
    }
    assert.deepEqual(snapshot, before);
  }
});

test("target adapter preserves current comparison knowledge without changing target certainty", () => {
  const snapshot = buildSnapshot({
    alp: 1_000,
    clf: 1_000,
    education: 1_000,
    enjoyment: 1_000,
    essentials: 5_000,
    serAndGiving: 1_000,
  });
  const scenario = buildTargetBudgetProjectionScenario(snapshot, "EUR");
  assert.equal(scenario.knowledgeStatus, "complete");
  assert.equal(scenario.comparisonKnowledge?.alp, "partial");
  assert.equal(scenario.comparisonKnowledge?.clf, "notDifferentiated");
  assert.equal(scenario.comparisonKnowledge?.serAndGiving, "partial");
});

test("current adapter represents a completely known allocation", () => {
  const scenario = buildKnownCurrentScenario();
  assert.equal(scenario.knowledgeStatus, "complete");
  assert.equal(scenario.totalAllocatedMinor, BigInt(8_000));
  assert.equal(scenario.comparableTotalMinor, BigInt(8_000));
  assert.equal(scenario.undifferentiatedMinor, BigInt(0));
  assert.equal(scenario.unallocatedMinor, BigInt(2_000));
  assert.equal(scenario.excessMinor, BigInt(0));
});

test("current adapter preserves partial, notDifferentiated, and notAsked values", () => {
  const partialInput = { ...currentInput, educationMinor: null };
  const allocation = classifyCurrentAllocation(partialInput, {
    kind: "unclassified",
  });
  const scenario = buildCurrentBudgetProjectionScenario({
    allocation,
    currency: "EUR",
    result: {
      monthlyIncomeMinor: 10_000,
      totalAssignedMinor: 4_200,
    },
  });
  const byCategory = Object.fromEntries(scenario.categories.map((category) => [
    category.category,
    category,
  ]));

  assert.equal(byCategory.alp.knowledgeStatus, "partial");
  assert.equal(byCategory.alp.amountMinor, BigInt(300));
  assert.equal(byCategory.clf.knowledgeStatus, "notDifferentiated");
  assert.equal(byCategory.clf.amountMinor, null);
  assert.equal(byCategory.serAndGiving.knowledgeStatus, "partial");
  assert.equal(byCategory.serAndGiving.amountMinor, BigInt(200));
  assert.equal(byCategory.education.knowledgeStatus, "notAsked");
  assert.equal(byCategory.education.amountMinor, null);
  assert.equal(scenario.totalAllocatedMinor, BigInt(4_200));
  assert.equal(scenario.comparableTotalMinor, BigInt(2_600));
  assert.equal(scenario.undifferentiatedMinor, BigInt(1_100));
  assert.equal(scenario.knowledgeStatus, "partial");
});

test("comparison reports positive, negative, and zero exact category differences", () => {
  const current = projectBudgetScenario(buildKnownCurrentScenario(), 1);
  const target = projectBudgetScenario(buildTargetBudgetProjectionScenario(
    buildSnapshot({
      alp: 500,
      clf: 1_000,
      education: 500,
      enjoyment: 1_000,
      essentials: 5_000,
      serAndGiving: 2_000,
    }),
    "EUR",
  ), 1);
  const comparison = compareBudgetProjectionScenarios(current, target);
  const byCategory = Object.fromEntries(comparison.categories.map((category) => [
    category.category,
    category,
  ]));

  assert.equal(byCategory.essentials.amountMinor, BigInt(1_000));
  assert.equal(byCategory.alp.amountMinor, BigInt(-500));
  assert.equal(byCategory.enjoyment.amountMinor, BigInt(0));
  assert.equal(comparison.totalDifference.amountMinor, BigInt(2_000));
  assert.equal(comparison.comparability, "exact");

  const inverse = compareBudgetProjectionScenarios(target, current);
  for (const [index, difference] of comparison.categories.entries()) {
    assert.equal(difference.comparability, "exact");
    assert.equal(inverse.categories[index]!.comparability, "exact");
    assert.equal(
      inverse.categories[index]!.amountMinor,
      -difference.amountMinor!,
    );
  }
  assert.equal(
    inverse.totalDifference.amountMinor,
    -comparison.totalDifference.amountMinor,
  );
  assert.equal(
    inverse.unallocatedDifference.amountMinor,
    -comparison.unallocatedDifference.amountMinor,
  );
  assert.equal(
    inverse.excessDifference.amountMinor,
    -comparison.excessDifference.amountMinor,
  );
});

test("all three scenario pairings can be compared", () => {
  const current = projectBudgetScenario(buildKnownCurrentScenario(), 12);
  const target = projectBudgetScenario(buildTargetBudgetProjectionScenario(
    buildSnapshot({ ...EDUCATIONAL_50_10_ALLOCATION }),
    "EUR",
  ), 12);
  const educational = projectBudgetScenario(
    buildEducational5010BudgetProjectionScenario(BigInt(10_000), "EUR"),
    12,
  );

  assert.equal(
    compareBudgetProjectionScenarios(current, target).comparisonScenarioId,
    "target",
  );
  assert.equal(
    compareBudgetProjectionScenarios(target, educational).comparisonScenarioId,
    "educational5010",
  );
  assert.equal(
    compareBudgetProjectionScenarios(current, educational).baseScenarioId,
    "current",
  );
});

test("comparison rejects mismatched horizons and currencies", () => {
  const monthly = buildKnownCurrentScenario();
  const oneMonth = projectBudgetScenario(monthly, 1);
  const annual = projectBudgetScenario(monthly, 12);
  const dollars = projectBudgetScenario(buildKnownCurrentScenario("USD"), 1);
  assert.throws(
    () => compareBudgetProjectionScenarios(oneMonth, annual),
    /horizons must match/,
  );
  assert.throws(
    () => compareBudgetProjectionScenarios(oneMonth, dollars),
    /currencies must match/,
  );
  for (const currency of ["EUR", "USD", "JPY"] as const) {
    const left = projectBudgetScenario(
      buildEducational5010BudgetProjectionScenario(BigInt(10_000), currency),
      1,
    );
    const right = projectBudgetScenario(buildTargetBudgetProjectionScenario(
      buildSnapshot({ ...EDUCATIONAL_50_10_ALLOCATION }),
      currency,
    ), 1);
    assert.doesNotThrow(() => compareBudgetProjectionScenarios(left, right));
  }
});

test("partial current categories never produce misleading exact differences", () => {
  const allocation = classifyCurrentAllocation(currentInput, {
    kind: "unclassified",
  });
  const current = projectBudgetScenario(buildCurrentBudgetProjectionScenario({
    allocation,
    currency: "EUR",
    result: {
      monthlyIncomeMinor: 10_000,
      totalAssignedMinor: 4_300,
    },
  }), 60);
  const educational = projectBudgetScenario(
    buildEducational5010BudgetProjectionScenario(BigInt(10_000), "EUR"),
    60,
  );
  const comparison = compareBudgetProjectionScenarios(current, educational);
  const alp = comparison.categories.find((category) => category.category === "alp");
  const essentials = comparison.categories.find(
    (category) => category.category === "essentials",
  );

  assert.equal(comparison.comparability, "partial");
  assert.equal(alp?.comparability, "partial");
  assert.equal(alp?.amountMinor, null);
  assert.equal(essentials?.comparability, "exact");
  assert.equal(typeof comparison.totalDifference.amountMinor, "bigint");
});

test("known zero compared with a positive amount is an exact difference", () => {
  const zeroAlp = buildCurrentBudgetProjectionScenario({
    allocation: knownCurrentAllocation({
      alp: 0,
      clf: 500,
      education: 500,
      enjoyment: 1_000,
      essentials: 4_000,
      serAndGiving: 1_000,
    }),
    currency: "EUR",
    result: {
      monthlyIncomeMinor: 10_000,
      totalAssignedMinor: 7_000,
    },
  });
  const educational = buildEducational5010BudgetProjectionScenario(BigInt(10_000), "EUR");
  const comparison = compareBudgetProjectionScenarios(
    projectBudgetScenario(zeroAlp, 1),
    projectBudgetScenario(educational, 1),
  );
  const alp = comparison.categories.find((category) => category.category === "alp");
  assert.equal(alp?.comparability, "exact");
  assert.equal(alp?.amountMinor, BigInt(1_000));
});

test("unknown amount compared with known zero remains partial", () => {
  const partial = projectBudgetScenario(buildPartialCurrentScenario(), 1);
  const zero = projectBudgetScenario(buildTargetBudgetProjectionScenario(
    buildSnapshot({ ...emptyTargetAllocation }),
    "EUR",
  ), 1);
  const comparison = compareBudgetProjectionScenarios(partial, zero);
  const clf = comparison.categories.find((category) => category.category === "clf");
  assert.equal(clf?.baseKnowledgeStatus, "notDifferentiated");
  assert.equal(clf?.comparisonKnowledgeStatus, "known");
  assert.equal(clf?.comparability, "partial");
  assert.equal(clf?.amountMinor, null);
});

test("comparison includes exact unallocated and excess differences", () => {
  const current = projectBudgetScenario(buildKnownCurrentScenario(), 12);
  const over = projectBudgetScenario(buildTargetBudgetProjectionScenario(
    buildSnapshot({ ...emptyTargetAllocation, essentials: 11_000 }),
    "EUR",
  ), 12);
  const comparison = compareBudgetProjectionScenarios(current, over);

  assert.equal(comparison.unallocatedDifference.amountMinor, BigInt(-24_000));
  assert.equal(comparison.excessDifference.amountMinor, BigInt(12_000));
  const inverse = compareBudgetProjectionScenarios(over, current);
  assert.equal(inverse.unallocatedDifference.amountMinor, BigInt(24_000));
  assert.equal(inverse.excessDifference.amountMinor, BigInt(-12_000));
});

test("scenario construction and projection are pure and reference-independent", () => {
  const snapshot = buildSnapshot({ ...EDUCATIONAL_50_10_ALLOCATION });
  const snapshotBefore = structuredClone(snapshot);
  const monthly = buildTargetBudgetProjectionScenario(snapshot, "EUR");
  const monthlyBefore = structuredClone(monthly);
  const first = projectBudgetScenario(monthly, 12);
  const originalFirstCategory = monthly.categories[0]!.amountMinor;
  first.categories[0]!.amountMinor = BigInt(999);
  if (first.comparisonKnowledge !== null) {
    first.comparisonKnowledge.alp = "known";
  }
  const second = projectBudgetScenario(monthly, 12);
  const educational = buildEducational5010BudgetProjectionScenario(
    BigInt(10_000),
    "EUR",
  );

  assert.deepEqual(snapshot, snapshotBefore);
  assert.deepEqual(monthly, monthlyBefore);
  assert.equal(monthly.categories[0]!.amountMinor, originalFirstCategory);
  assert.equal(monthly.comparisonKnowledge?.alp, "partial");
  assert.equal(second.categories[0]!.amountMinor, originalFirstCategory! * BigInt(12));
  assert.notEqual(first.categories[0]!.amountMinor, second.categories[0]!.amountMinor);
  assert.notStrictEqual(first, second);
  assert.notStrictEqual(first.categories, second.categories);
  assert.notStrictEqual(first.categories[0], second.categories[0]);
  assert.notStrictEqual(first.comparisonKnowledge, monthly.comparisonKnowledge);
  assert.notStrictEqual(monthly.categories, educational.categories);
});

test("projection rejects missing, duplicate, unknown, and out-of-order categories", () => {
  const valid = buildEducational5010BudgetProjectionScenario(BigInt(100), "EUR");
  const missing = structuredClone(valid);
  missing.categories.pop();
  const duplicate = structuredClone(valid);
  duplicate.categories[1]!.category = "essentials";
  const unknown = structuredClone(valid);
  unknown.categories[0]!.category = "unknown" as typeof unknown.categories[number]["category"];
  const outOfOrder = structuredClone(valid);
  [outOfOrder.categories[0], outOfOrder.categories[1]] = [
    outOfOrder.categories[1]!,
    outOfOrder.categories[0]!,
  ];

  for (const scenario of [missing, duplicate, unknown, outOfOrder]) {
    assert.throws(
      () => projectBudgetScenario(scenario, 1),
      (error: unknown) => error instanceof Error && /canonical allocation order/.test(error.message),
    );
  }
});

test("projection rejects invalid money and partial-representation invariants", () => {
  const complete = buildEducational5010BudgetProjectionScenario(BigInt(100), "EUR");
  const partial = buildPartialCurrentScenario();

  const negativeIncome = structuredClone(complete);
  negativeIncome.monthlyIncomeMinor = -BigInt(1);
  assert.throws(
    () => projectBudgetScenario(negativeIncome, 1),
    (error: unknown) => error instanceof RangeError && /monthly income.*non-negative/.test(error.message),
  );

  const negativeCategory = structuredClone(complete);
  negativeCategory.categories[0]!.amountMinor = -BigInt(1);
  assert.throws(
    () => projectBudgetScenario(negativeCategory, 1),
    (error: unknown) => error instanceof RangeError && /category amount.*non-negative/.test(error.message),
  );

  const negativeTotal = structuredClone(complete);
  negativeTotal.totalAllocatedMinor = -BigInt(1);
  assert.throws(
    () => projectBudgetScenario(negativeTotal, 1),
    (error: unknown) => error instanceof RangeError && /total allocated.*non-negative/.test(error.message),
  );

  const comparableMismatch = structuredClone(partial);
  comparableMismatch.comparableTotalMinor = BigInt(3_501);
  assert.throws(
    () => projectBudgetScenario(comparableMismatch, 1),
    /comparable total must equal/,
  );

  const representedOverTotal = structuredClone(partial);
  representedOverTotal.categories[0]!.amountMinor = BigInt(5_000);
  assert.throws(
    () => projectBudgetScenario(representedOverTotal, 1),
    /represented category amounts cannot exceed/,
  );

  const residualMismatch = structuredClone(partial);
  residualMismatch.undifferentiatedMinor += BigInt(1);
  assert.throws(
    () => projectBudgetScenario(residualMismatch, 1),
    /undifferentiated amount must equal/,
  );

  const knownWithoutAmount = structuredClone(complete);
  knownWithoutAmount.categories[0]!.amountMinor = null;
  assert.throws(
    () => projectBudgetScenario(knownWithoutAmount, 1),
    /known category must have an amount/,
  );

  const partialWithoutSubtotal = structuredClone(partial);
  const alp = partialWithoutSubtotal.categories.find((category) => category.category === "alp")!;
  alp.amountMinor = null;
  partialWithoutSubtotal.undifferentiatedMinor += BigInt(300);
  assert.throws(
    () => projectBudgetScenario(partialWithoutSubtotal, 1),
    /partial category must preserve its known subtotal/,
  );

  const unknownAsZero = structuredClone(partial);
  const clf = unknownAsZero.categories.find((category) => category.category === "clf")!;
  clf.amountMinor = BigInt(0);
  assert.throws(
    () => projectBudgetScenario(unknownAsZero, 1),
    /unknown category must use null/,
  );
});

test("projection rejects contradictory under, exact, over, remainder, and excess states", () => {
  const under = buildPartialCurrentScenario();
  const exact = buildEducational5010BudgetProjectionScenario(BigInt(100), "EUR");
  const over = buildTargetBudgetProjectionScenario(
    buildSnapshot({ ...emptyTargetAllocation, essentials: 11_000 }),
    "EUR",
  );

  const underWithExcess = structuredClone(under);
  underWithExcess.excessMinor = BigInt(1);
  assert.throws(
    () => projectBudgetScenario(underWithExcess, 1),
    /excess amount contradicts/,
  );

  const overWithRemainder = structuredClone(over);
  overWithRemainder.unallocatedMinor = BigInt(1);
  assert.throws(
    () => projectBudgetScenario(overWithRemainder, 1),
    /unallocated amount contradicts/,
  );

  const exactWithDifferentIncome = structuredClone(exact);
  exactWithDifferentIncome.monthlyIncomeMinor = BigInt(101);
  assert.throws(
    () => projectBudgetScenario(exactWithDifferentIncome, 1),
    /under allocation status must match/,
  );

  const bothPositive = structuredClone(exact);
  bothPositive.unallocatedMinor = BigInt(1);
  bothPositive.excessMinor = BigInt(1);
  assert.throws(
    () => projectBudgetScenario(bothPositive, 1),
    /unallocated amount contradicts/,
  );

  const wrongStatus = structuredClone(exact);
  wrongStatus.allocationStatus = "under";
  assert.throws(
    () => projectBudgetScenario(wrongStatus, 1),
    /exact allocation status must match/,
  );
});

test("comparison rejects accumulated results that are not monthly times horizon", () => {
  const valid = projectBudgetScenario(
    buildEducational5010BudgetProjectionScenario(BigInt(100), "EUR"),
    12,
  );
  const invalidIncome = structuredClone(valid);
  invalidIncome.accumulatedIncomeMinor += BigInt(1);
  assert.throws(
    () => compareBudgetProjectionScenarios(invalidIncome, valid),
    /accumulated income must equal/,
  );

  const invalidCategories = structuredClone(valid);
  invalidCategories.categories[0]!.amountMinor! += BigInt(1);
  invalidCategories.categories[1]!.amountMinor! -= BigInt(1);
  assert.throws(
    () => compareBudgetProjectionScenarios(invalidCategories, valid),
    /category amount must be a monthly value multiplied by the horizon/,
  );
});

test("comparison difference invariants reject contradictory nullability", () => {
  const exact = compareBudgetProjectionScenarios(
    projectBudgetScenario(buildKnownCurrentScenario(), 1),
    projectBudgetScenario(
      buildEducational5010BudgetProjectionScenario(BigInt(10_000), "EUR"),
      1,
    ),
  );
  const exactWithNull = structuredClone(exact) as BudgetProjectionComparison;
  exactWithNull.categories[0]!.amountMinor = null;
  assert.throws(
    () => assertValidBudgetProjectionComparison(exactWithNull),
    /exact difference must contain a bigint amount/,
  );

  const partial = compareBudgetProjectionScenarios(
    projectBudgetScenario(buildPartialCurrentScenario(), 1),
    projectBudgetScenario(buildTargetBudgetProjectionScenario(
      buildSnapshot({ ...emptyTargetAllocation }),
      "EUR",
    ), 1),
  );
  const partialWithAmount = structuredClone(partial) as BudgetProjectionComparison;
  const partialCategory = partialWithAmount.categories.find((category) => (
    category.comparability === "partial"
  ))!;
  (partialCategory as { amountMinor: bigint | null }).amountMinor = BigInt(0);
  assert.throws(
    () => assertValidBudgetProjectionComparison(partialWithAmount),
    /partial difference must contain a null amount/,
  );
});

test("bigint projection remains exact for high supported values", () => {
  const highIncome = BigInt("900719925474099312345678901");
  const monthly = buildEducational5010BudgetProjectionScenario(highIncome, "JPY");
  const projected = projectBudgetScenario(monthly, 60);
  assert.equal(sumCategories(monthly.categories), highIncome);
  assert.equal(projected.totalAllocatedMinor, highIncome * BigInt(60));
  assert.equal(projected.monthlyIncomeMinor, highIncome);
  assert.equal(projected.accumulatedIncomeMinor, highIncome * BigInt(60));
  assert.equal(typeof projected.totalAllocatedMinor, "bigint");
});
