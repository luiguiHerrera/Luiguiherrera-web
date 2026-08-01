import assert from "node:assert/strict";
import test from "node:test";
import { compareBudgetProjectionScenarios } from "./projection-calculations.ts";
import {
  buildBudgetProjectionHighlights,
  buildProjectedSerGivingBreakdown,
  buildProjectionAmountPresentation,
  selectPrimaryVisibleProjectionScenario,
  selectProjectionFocusContext,
  selectVisibleProjectionComparison,
} from "./projection-presentation.ts";
import type {
  BudgetProjectionHorizonMonths,
  BudgetProjectionResult,
  BudgetProjectionScenarioId,
} from "./projection-types.ts";
import {
  allocationCategories,
  type AllocationCategory,
  type CurrentAllocationStatus,
} from "./target-types.ts";

const HORIZON = 12;
const INCOME = BigInt(10_000);

function projection({
  amounts,
  horizon = HORIZON,
  id,
  statuses = {},
}: {
  amounts: Record<AllocationCategory, bigint>;
  horizon?: BudgetProjectionHorizonMonths;
  id: BudgetProjectionScenarioId;
  statuses?: Partial<Record<AllocationCategory, CurrentAllocationStatus>>;
}): BudgetProjectionResult {
  const monthlyTotal = allocationCategories.reduce(
    (total, category) => total + amounts[category],
    BigInt(0),
  );
  const accumulatedTotal = monthlyTotal * BigInt(horizon);
  const knowledgeStatus = allocationCategories.every((category) => (
    (statuses[category] ?? "known") === "known"
  )) ? "complete" as const : "partial" as const;
  const comparableTotal = allocationCategories.reduce((total, category) => (
    (statuses[category] ?? "known") === "known"
      ? total + amounts[category]
      : total
  ), BigInt(0)) * BigInt(horizon);
  return {
    allocatedBasisPoints: Number(monthlyTotal),
    accumulatedIncomeMinor: INCOME * BigInt(horizon),
    allocationStatus: monthlyTotal < INCOME
      ? "under"
      : monthlyTotal === INCOME ? "exact" : "over",
    categories: allocationCategories.map((category) => ({
      amountMinor: amounts[category] * BigInt(horizon),
      basisPoints: (statuses[category] ?? "known") === "known"
        ? Number(amounts[category])
        : null,
      category,
      knowledgeStatus: statuses[category] ?? "known",
    })),
    comparableTotalMinor: comparableTotal,
    comparisonKnowledge: null,
    currency: "EUR",
    excessMinor: monthlyTotal > INCOME
      ? (monthlyTotal - INCOME) * BigInt(horizon)
      : BigInt(0),
    horizonMonths: horizon,
    knowledgeStatus,
    monthlyIncomeMinor: INCOME,
    scenarioId: id,
    totalAllocatedMinor: accumulatedTotal,
    unallocatedMinor: monthlyTotal < INCOME
      ? (INCOME - monthlyTotal) * BigInt(horizon)
      : BigInt(0),
    undifferentiatedMinor: BigInt(0),
  };
}

const baseAmounts = {
  alp: BigInt(1_000),
  clf: BigInt(1_000),
  education: BigInt(1_000),
  enjoyment: BigInt(1_000),
  essentials: BigInt(5_000),
  serAndGiving: BigInt(1_000),
};

function highlights(
  base: BudgetProjectionResult,
  comparison: BudgetProjectionResult,
) {
  return buildBudgetProjectionHighlights({
    base,
    comparison,
    difference: compareBudgetProjectionScenarios(base, comparison),
  });
}

test("selects the largest exact increase", () => {
  const base = projection({ amounts: baseAmounts, id: "current" });
  const comparison = projection({
    amounts: { ...baseAmounts, education: BigInt(2_000), essentials: BigInt(4_000) },
    id: "educational5010",
  });
  assert.deepEqual(highlights(base, comparison)[0], {
    amountMinor: BigInt(12_000),
    category: "education",
    kind: "categoryIncrease",
  });
});

test("selects the largest exact reduction", () => {
  const base = projection({ amounts: baseAmounts, id: "current" });
  const comparison = projection({
    amounts: { ...baseAmounts, alp: BigInt(500), essentials: BigInt(5_500) },
    id: "educational5010",
  });
  assert.deepEqual(highlights(base, comparison)[1], {
    amountMinor: BigInt(6_000),
    category: "alp",
    kind: "categoryDecrease",
  });
});

test("reports a known zero becoming positive without duplicating a larger change", () => {
  const base = projection({
    amounts: { ...baseAmounts, education: BigInt(0), enjoyment: BigInt(2_000) },
    id: "current",
  });
  const comparison = projection({
    amounts: {
      ...baseAmounts,
      alp: BigInt(1_500),
      education: BigInt(300),
      enjoyment: BigInt(1_200),
    },
    id: "educational5010",
  });
  assert.equal(highlights(base, comparison)[2]?.kind, "zeroToPositive");
  const result = highlights(base, comparison)[2];
  assert.equal(result && "category" in result ? result.category : null, "education");
});

test("excludes partial categories from exact increases", () => {
  const base = projection({
    amounts: baseAmounts,
    id: "current",
    statuses: { education: "partial" },
  });
  const comparison = projection({
    amounts: { ...baseAmounts, education: BigInt(2_000) },
    id: "educational5010",
  });
  const result = highlights(base, comparison);
  assert.equal(result.some((item) => (
    item.kind === "categoryIncrease" && item.category === "education"
  )), false);
  assert.equal(result.some((item) => item.kind === "partial"), true);
});

test("reports unallocated income", () => {
  const base = projection({ amounts: baseAmounts, id: "current" });
  const comparison = projection({
    amounts: { ...baseAmounts, essentials: BigInt(4_000) },
    id: "educational5010",
  });
  assert.equal(highlights(base, comparison).some((item) => item.kind === "unallocated"), true);
});

test("reports excess separately", () => {
  const base = projection({ amounts: baseAmounts, id: "current" });
  const comparison = projection({
    amounts: { ...baseAmounts, essentials: BigInt(6_000) },
    id: "educational5010",
  });
  assert.equal(highlights(base, comparison).some((item) => item.kind === "excess"), true);
});

test("returns at most three observations", () => {
  const base = projection({
    amounts: { ...baseAmounts, education: BigInt(0), enjoyment: BigInt(2_000) },
    id: "current",
  });
  const comparison = projection({
    amounts: {
      ...baseAmounts,
      alp: BigInt(2_000),
      education: BigInt(500),
      enjoyment: BigInt(500),
      essentials: BigInt(6_000),
    },
    id: "educational5010",
  });
  assert.equal(highlights(base, comparison).length, 3);
});

test("is deterministic when magnitudes tie", () => {
  const base = projection({ amounts: baseAmounts, id: "current" });
  const comparison = projection({
    amounts: { ...baseAmounts, alp: BigInt(1_500), clf: BigInt(1_500), essentials: BigInt(4_000) },
    id: "educational5010",
  });
  assert.deepEqual(highlights(base, comparison), highlights(base, comparison));
  const result = highlights(base, comparison)[0];
  assert.equal(result && "category" in result ? result.category : null, "alp");
});

test("preserves bigint values beyond the safe integer range", () => {
  const large = BigInt(Number.MAX_SAFE_INTEGER) + BigInt(1_000);
  const base = projection({ amounts: baseAmounts, id: "current" });
  const comparison = {
    ...base,
    categories: base.categories.map((category) => category.category === "education"
      ? { ...category, amountMinor: category.amountMinor! + large }
      : category),
    scenarioId: "educational5010" as const,
    totalAllocatedMinor: base.totalAllocatedMinor + large,
  };
  const difference = {
    ...compareBudgetProjectionScenarios(base, {
      ...base,
      scenarioId: "educational5010",
    }),
    categories: base.categories.map((category) => ({
      amountMinor: category.category === "education" ? large : BigInt(0),
      baseKnowledgeStatus: "known" as const,
      category: category.category,
      comparability: "exact" as const,
      comparisonKnowledgeStatus: "known" as const,
    })),
    comparisonScenarioId: "educational5010" as const,
  };
  const result = buildBudgetProjectionHighlights({ base, comparison, difference });
  assert.equal(result[0] && "amountMinor" in result[0] ? result[0].amountMinor : null, large);
});

test("selects a visible comparison base for every non-empty scenario combination", () => {
  const projected = {
    current: projection({ amounts: baseAmounts, id: "current" }),
    educational5010: projection({
      amounts: { ...baseAmounts, education: BigInt(2_000), essentials: BigInt(4_000) },
      id: "educational5010",
    }),
    target: projection({
      amounts: { ...baseAmounts, education: BigInt(1_500), essentials: BigInt(4_500) },
      id: "target",
    }),
  };
  const cases = [
    { active: ["current"], base: "current", visible: { current: true, educational5010: false, target: false } },
    { active: ["target"], base: "target", visible: { current: false, educational5010: false, target: true } },
    { active: ["educational5010"], base: "educational5010", visible: { current: false, educational5010: true, target: false } },
    { active: ["current", "target"], base: "current", visible: { current: true, educational5010: false, target: true } },
    { active: ["current", "educational5010"], base: "current", visible: { current: true, educational5010: true, target: false } },
    { active: ["target", "educational5010"], base: "target", visible: { current: false, educational5010: true, target: true } },
    { active: ["current", "target", "educational5010"], base: "current", visible: { current: true, educational5010: true, target: true } },
  ] as const;

  for (const expected of cases) {
    const selected = selectVisibleProjectionComparison(projected, expected.visible);
    assert.deepEqual(selected.activeScenarioIds, expected.active);
    assert.equal(selected.baseScenarioId, expected.base);
    assert.deepEqual(
      Object.keys(selected.comparisons),
      expected.active.filter((scenarioId) => scenarioId !== expected.base),
    );
    for (const comparison of Object.values(selected.comparisons)) {
      assert.ok(comparison);
      assert.equal(expected.visible[comparison.baseScenarioId], true);
      assert.equal(expected.visible[comparison.comparisonScenarioId], true);
      assert.equal(comparison.baseScenarioId, expected.base);
    }
  }
});

test("uses target as the visible base for educational observations when current is hidden", () => {
  const projected = {
    current: projection({ amounts: baseAmounts, id: "current" }),
    educational5010: projection({
      amounts: { ...baseAmounts, education: BigInt(2_000), essentials: BigInt(4_000) },
      id: "educational5010",
    }),
    target: projection({ amounts: baseAmounts, id: "target" }),
  };
  const selected = selectVisibleProjectionComparison(projected, {
    current: false,
    educational5010: true,
    target: true,
  });
  const difference = selected.comparisons.educational5010;
  assert.ok(difference);
  const result = buildBudgetProjectionHighlights({
    base: projected.target,
    comparison: projected.educational5010,
    difference,
  });
  assert.equal(difference.baseScenarioId, "target");
  assert.equal(difference.comparisonScenarioId, "educational5010");
  assert.equal(result[0]?.kind, "categoryIncrease");
});

test("builds current-to-target observations from the visible current baseline", () => {
  const projected = {
    current: projection({
      amounts: baseAmounts,
      id: "current",
      statuses: { alp: "partial" },
    }),
    educational5010: projection({
      amounts: { ...baseAmounts, education: BigInt(2_000), essentials: BigInt(4_000) },
      id: "educational5010",
    }),
    target: projection({
      amounts: {
        ...baseAmounts,
        education: BigInt(1_500),
        enjoyment: BigInt(700),
        essentials: BigInt(4_800),
      },
      id: "target",
    }),
  };
  const selected = selectVisibleProjectionComparison(projected, {
    current: true,
    educational5010: false,
    target: true,
  });
  const difference = selected.comparisons.target;
  assert.ok(difference);
  assert.equal(selected.baseScenarioId, "current");
  assert.deepEqual(selected.activeScenarioIds, ["current", "target"]);
  assert.deepEqual(Object.keys(selected.comparisons), ["target"]);
  assert.equal(selected.comparisons.educational5010, undefined);
  assert.equal(difference.baseScenarioId, "current");
  assert.equal(difference.comparisonScenarioId, "target");
  assert.deepEqual(
    difference.categories.find((category) => category.category === "education"),
    {
      amountMinor: BigInt(6_000),
      baseKnowledgeStatus: "known",
      category: "education",
      comparability: "exact",
      comparisonKnowledgeStatus: "known",
    },
  );
  assert.deepEqual(
    difference.categories.find((category) => category.category === "enjoyment"),
    {
      amountMinor: BigInt(-3_600),
      baseKnowledgeStatus: "known",
      category: "enjoyment",
      comparability: "exact",
      comparisonKnowledgeStatus: "known",
    },
  );
  assert.deepEqual(
    difference.categories.find((category) => category.category === "clf"),
    {
      amountMinor: BigInt(0),
      baseKnowledgeStatus: "known",
      category: "clf",
      comparability: "exact",
      comparisonKnowledgeStatus: "known",
    },
  );
  assert.deepEqual(
    difference.categories.find((category) => category.category === "alp"),
    {
      amountMinor: null,
      baseKnowledgeStatus: "partial",
      category: "alp",
      comparability: "partial",
      comparisonKnowledgeStatus: "known",
    },
  );

  const result = buildBudgetProjectionHighlights({
    base: projected.current,
    comparison: projected.target,
    difference,
  });
  assert.deepEqual(result, [
    {
      amountMinor: BigInt(6_000),
      category: "education",
      kind: "categoryIncrease",
    },
    {
      amountMinor: BigInt(3_600),
      category: "enjoyment",
      kind: "categoryDecrease",
    },
    { category: "alp", kind: "partial" },
  ]);
  assert.equal(result.length <= 3, true);
  assert.equal(result.some((item) => (
    "category" in item
    && item.category === "alp"
    && "amountMinor" in item
  )), false);
  assert.deepEqual(buildBudgetProjectionHighlights({
    base: projected.current,
    comparison: projected.target,
    difference,
  }), result);
});

test("recomputes comparisons deterministically without retaining hidden scenarios", () => {
  const current = projection({ amounts: baseAmounts, id: "current" });
  const projected = {
    current,
    educational5010: { ...current, scenarioId: "educational5010" as const },
    target: { ...current, scenarioId: "target" as const },
  };
  const allVisible = selectVisibleProjectionComparison(projected, {
    current: true,
    educational5010: true,
    target: true,
  });
  const currentAndTarget = selectVisibleProjectionComparison(projected, {
    current: true,
    educational5010: false,
    target: true,
  });
  const targetAndEducational = selectVisibleProjectionComparison(projected, {
    current: false,
    educational5010: true,
    target: true,
  });
  assert.deepEqual(Object.keys(allVisible.comparisons), ["target", "educational5010"]);
  assert.deepEqual(Object.keys(currentAndTarget.comparisons), ["target"]);
  assert.deepEqual(Object.keys(targetAndEducational.comparisons), ["educational5010"]);
  assert.equal(targetAndEducational.baseScenarioId, "target");
  assert.deepEqual(
    selectVisibleProjectionComparison(projected, {
      current: false,
      educational5010: true,
      target: true,
    }),
    targetAndEducational,
  );
});

test("does not construct comparisons when only one scenario is visible", () => {
  const current = projection({ amounts: baseAmounts, id: "current" });
  const selected = selectVisibleProjectionComparison({
    current,
    educational5010: { ...current, scenarioId: "educational5010" },
    target: { ...current, scenarioId: "target" },
  }, {
    current: false,
    educational5010: true,
    target: false,
  });
  assert.deepEqual(selected.comparisons, {});
});

test("returns no observations when visible scenarios have no differences", () => {
  const base = projection({ amounts: baseAmounts, id: "target" });
  const comparison = projection({ amounts: baseAmounts, id: "educational5010" });
  assert.deepEqual(highlights(base, comparison), []);
});

test("rejects an empty visible scenario selection", () => {
  const current = projection({ amounts: baseAmounts, id: "current" });
  assert.throws(
    () => selectVisibleProjectionComparison({
      current,
      educational5010: { ...current, scenarioId: "educational5010" },
      target: { ...current, scenarioId: "target" },
    }, {
      current: false,
      educational5010: false,
      target: false,
    }),
    RangeError,
  );
});

test("selects target, then current, then educational as the primary visible scenario", () => {
  assert.equal(selectPrimaryVisibleProjectionScenario({
    current: true,
    educational5010: true,
    target: true,
  }), "target");
  assert.equal(selectPrimaryVisibleProjectionScenario({
    current: true,
    educational5010: true,
    target: false,
  }), "current");
  assert.equal(selectPrimaryVisibleProjectionScenario({
    current: false,
    educational5010: true,
    target: false,
  }), "educational5010");
  assert.throws(() => selectPrimaryVisibleProjectionScenario({
    current: false,
    educational5010: false,
    target: false,
  }), RangeError);
});

test("keeps the primary scenario and 1, 12, and 60 month horizons explicit", () => {
  const cases = [
    { scenarioId: "target" as const, visible: { current: true, educational5010: true, target: true } },
    { scenarioId: "current" as const, visible: { current: true, educational5010: true, target: false } },
    { scenarioId: "educational5010" as const, visible: { current: false, educational5010: true, target: false } },
  ];
  for (const expected of cases) {
    for (const horizonMonths of [1, 12, 60] as const) {
      const context = selectProjectionFocusContext({
        horizonMonths,
        visible: expected.visible,
      });
      const result = projection({
        amounts: baseAmounts,
        horizon: horizonMonths,
        id: context.scenarioId,
      });
      assert.deepEqual(context, {
        horizonMonths,
        scenarioId: expected.scenarioId,
      });
      assert.equal(result.horizonMonths, horizonMonths);
      assert.equal(
        result.categories.find((category) => category.category === "education")?.amountMinor,
        baseAmounts.education * BigInt(horizonMonths),
      );
    }
  }
});

test("distinguishes exact zero, partial zero, partial positive, and unknown amounts", () => {
  assert.deepEqual(buildProjectionAmountPresentation({
    amountMinor: BigInt(0),
    knowledgeStatus: "known",
  }), {
    amountMinor: BigInt(0),
    kind: "exact",
    knowledgeStatus: "known",
  });
  assert.deepEqual(buildProjectionAmountPresentation({
    amountMinor: BigInt(0),
    knowledgeStatus: "partial",
  }), {
    amountMinor: BigInt(0),
    kind: "knownSubtotal",
    knowledgeStatus: "partial",
  });
  assert.deepEqual(buildProjectionAmountPresentation({
    amountMinor: BigInt(725),
    knowledgeStatus: "partial",
  }), {
    amountMinor: BigInt(725),
    kind: "knownSubtotal",
    knowledgeStatus: "partial",
  });
  assert.deepEqual(buildProjectionAmountPresentation({
    amountMinor: null,
    knowledgeStatus: "notDifferentiated",
  }), {
    amountMinor: null,
    kind: "unavailable",
    knowledgeStatus: "notDifferentiated",
  });
  assert.deepEqual(buildProjectionAmountPresentation({
    amountMinor: null,
    knowledgeStatus: "notAsked",
  }), {
    amountMinor: null,
    kind: "unavailable",
    knowledgeStatus: "notAsked",
  });
});

test("builds coherent SER and Giving breakdowns for 1, 12, and 60 months", () => {
  const monthlyBreakdown = { givingMinor: BigInt(40), serMinor: BigInt(60) };
  for (const horizon of [1, 12, 60] as const) {
    const target = projection({
      amounts: { ...baseAmounts, serAndGiving: BigInt(100) },
      horizon,
      id: "target",
    });
    const before = structuredClone(monthlyBreakdown);
    const result = buildProjectedSerGivingBreakdown({
      horizonMonths: horizon,
      monthlyBreakdown,
      primaryScenarioId: "target",
      result: target,
    });
    assert.equal(result.status, "available");
    if (result.status === "available") {
      assert.equal(result.accumulatedSerMinor, BigInt(60) * BigInt(horizon));
      assert.equal(result.accumulatedGivingMinor, BigInt(40) * BigInt(horizon));
      assert.equal(
        result.accumulatedSerMinor + result.accumulatedGivingMinor,
        result.accumulatedTotalMinor,
      );
      assert.equal(result.accumulatedTotalMinor, BigInt(100) * BigInt(horizon));
    }
    assert.deepEqual(monthlyBreakdown, before);
  }
});

test("preserves bigint precision in the SER and Giving presentation breakdown", () => {
  const large = BigInt(Number.MAX_SAFE_INTEGER) + BigInt(101);
  const target = projection({
    amounts: { ...baseAmounts, serAndGiving: large + BigInt(1) },
    horizon: 60,
    id: "target",
  });
  const result = buildProjectedSerGivingBreakdown({
    horizonMonths: 60,
    monthlyBreakdown: { givingMinor: BigInt(1), serMinor: large },
    primaryScenarioId: "target",
    result: target,
  });
  assert.equal(result.status, "available");
  if (result.status === "available") {
    assert.equal(result.accumulatedSerMinor, large * BigInt(60));
    assert.equal(result.accumulatedTotalMinor, (large + BigInt(1)) * BigInt(60));
  }
});

test("withholds the SER and Giving breakdown outside a coherent target context", () => {
  const target = projection({
    amounts: { ...baseAmounts, serAndGiving: BigInt(100) },
    id: "target",
  });
  const split = { givingMinor: BigInt(40), serMinor: BigInt(60) };
  const inputs = [
    { monthlyBreakdown: split, primaryScenarioId: "current" as const, result: { ...target, scenarioId: "current" as const } },
    { monthlyBreakdown: split, primaryScenarioId: "educational5010" as const, result: { ...target, scenarioId: "educational5010" as const } },
    { monthlyBreakdown: null, primaryScenarioId: "target" as const, result: target },
    { monthlyBreakdown: { givingMinor: BigInt(30), serMinor: BigInt(60) }, primaryScenarioId: "target" as const, result: target },
  ];
  for (const input of inputs) {
    assert.deepEqual(buildProjectedSerGivingBreakdown({
      horizonMonths: 12,
      ...input,
    }), { status: "unavailable" });
  }
});
