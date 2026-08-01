import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildBudgetTargetSnapshot,
  classifyCurrentAllocation,
  cloneBudgetTargetBaseline,
  reconcileAllocationAmounts,
} from "./target-calculations.ts";
import { formatTargetMoney } from "./target-formatting.ts";
import {
  emptyTargetAllocation,
  type BudgetTargetBaseline,
  type ContingencyReserve,
  type CurrentAllocationInput,
  type EmergencyFundPlan,
  type SavingsCurrentClassification,
  type SerGivingBreakdown,
  type TargetAllocation,
} from "./target-types.ts";

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

function buildSnapshot(allocation: TargetAllocation, options: {
  classification?: SavingsCurrentClassification;
  input?: CurrentAllocationInput;
  plan?: EmergencyFundPlan;
  reserve?: ContingencyReserve;
  serGiving?: SerGivingBreakdown;
} = {}) {
  return buildBudgetTargetSnapshot({
    allocation,
    classification: options.classification ?? { kind: "unclassified" },
    coverageBaseMinor: 2_000,
    currentInput: options.input ?? currentInput,
    emergencyFundMinor: 4_000,
    emergencyPlan: options.plan ?? {
      completionMonths: null,
      target: { kind: "unset" },
    },
    hasValidationErrors: false,
    reserve: options.reserve ?? { kind: "unset" },
    serGiving: options.serGiving ?? { kind: "closed" },
  });
}

function requireSnapshot(result: ReturnType<typeof buildSnapshot>) {
  assert.equal(result.status, "ok");
  if (result.status !== "ok") throw new Error("Expected a valid snapshot");
  return result.value;
}

test("snapshot keeps 0%, 99.99%, 100%, and more than 100% exact as bigint", () => {
  const zero = requireSnapshot(buildSnapshot({ ...emptyTargetAllocation }));
  assert.equal(zero.status, "under");
  assert.equal(zero.totalAllocatedMinor, BigInt(0));
  assert.equal(zero.remainingMinor, BigInt(10_000));
  assert.equal(typeof zero.incomeMinor, "bigint");
  assert.equal(typeof zero.amounts.essentials, "bigint");

  const under = requireSnapshot(buildSnapshot({
    ...emptyTargetAllocation,
    essentials: 9_999,
  }));
  assert.equal(under.status, "under");
  assert.equal(under.remainingBasisPoints, 1);
  assert.equal(under.remainingMinor, BigInt(1));

  const exact = requireSnapshot(buildSnapshot({
    ...emptyTargetAllocation,
    essentials: 10_000,
  }));
  assert.equal(exact.status, "exact");
  assert.equal(exact.totalAllocatedMinor, BigInt(10_000));
  assert.equal(exact.remainingMinor, BigInt(0));
  assert.equal(exact.excessMinor, BigInt(0));

  const over = requireSnapshot(buildSnapshot({
    ...emptyTargetAllocation,
    essentials: 11_000,
  }));
  assert.equal(over.status, "over");
  assert.equal(over.excessBasisPoints, 1_000);
  assert.equal(over.excessMinor, BigInt(1_000));
});

test("reconciliation by remainders preserves the rounded total", () => {
  const allocation: TargetAllocation = {
    alp: 1_667,
    clf: 1_667,
    education: 1_667,
    enjoyment: 1_667,
    essentials: 1_666,
    serAndGiving: 1_666,
  };
  const reconciled = reconcileAllocationAmounts(10_001, allocation);
  assert.equal(reconciled.status, "ok");
  if (reconciled.status !== "ok") return;
  assert.equal(
    Object.values(reconciled.value).reduce((total, value) => total + value, 0),
    10_001,
  );

  const snapshot = requireSnapshot(buildSnapshot(allocation, {
    input: { ...currentInput, incomeMinor: 10_001 },
  }));
  assert.equal(
    Object.values(snapshot.amounts).reduce(
      (total, value) => total + value,
      BigInt(0),
    ),
    BigInt(10_001),
  );
});

test("unset reserve stays unset and explicit zero stays defined", () => {
  const unset = requireSnapshot(buildSnapshot({ ...emptyTargetAllocation }, {
    reserve: { kind: "unset" },
  }));
  assert.deepEqual(unset.reserve, { status: "unset" });

  const none = requireSnapshot(buildSnapshot({ ...emptyTargetAllocation }, {
    reserve: { kind: "none" },
  }));
  assert.deepEqual(none.reserve, {
    amountMinor: BigInt(0),
    basisPoints: 0,
    source: "none",
    status: "defined",
  });

  const explicitAmount = requireSnapshot(buildSnapshot(
    { ...emptyTargetAllocation },
    { reserve: { amountMinor: 0, kind: "amount" } },
  ));
  assert.deepEqual(explicitAmount.reserve, {
    amountMinor: BigInt(0),
    basisPoints: 0,
    source: "amount",
    status: "defined",
  });
});

test("snapshot centralizes complete coverage and percentage reserve derivatives", () => {
  const snapshot = requireSnapshot(buildSnapshot({
    alp: 2_000,
    clf: 1_000,
    education: 1_000,
    enjoyment: 1_000,
    essentials: 4_000,
    serAndGiving: 1_000,
  }, {
    plan: { completionMonths: 8, target: { kind: "preset", months: 6 } },
    reserve: { basisPoints: 1_000, kind: "percentage" },
    serGiving: { kind: "split", serShareBasisPoints: 6_000 },
  }));

  assert.deepEqual(snapshot.coverage, {
    completionMonths: 8,
    coverageBaseMinor: BigInt(2_000),
    currentCoverageBasisPoints: 20_000,
    monthlyContributionMinor: BigInt(1_000),
    shortfallMinor: BigInt(8_000),
    status: "calculated",
    target: { kind: "preset", months: 6 },
    targetAmountMinor: BigInt(12_000),
    targetMonths: 6,
  });
  assert.deepEqual(snapshot.reserve, {
    amountMinor: BigInt(1_000),
    basisPoints: 1_000,
    source: "percentage",
    status: "defined",
  });
  assert.deepEqual(snapshot.serGivingAmounts, {
    givingMinor: BigInt(400),
    serMinor: BigInt(600),
  });
});

test("current allocation preserves known, partial, notDifferentiated, and notAsked", () => {
  const unclassified = classifyCurrentAllocation(currentInput, {
    kind: "unclassified",
  });
  assert.equal(unclassified.alp.status, "partial");
  assert.equal(unclassified.clf.status, "notDifferentiated");
  assert.equal(unclassified.serAndGiving.status, "partial");
  assert.equal(unclassified.education.status, "known");

  const classified = classifyCurrentAllocation(currentInput, {
    alpShareBasisPoints: 4_000,
    kind: "split",
  });
  assert.equal(classified.alp.status, "known");
  assert.equal(classified.clf.status, "known");

  const missing = classifyCurrentAllocation({
    ...currentInput,
    debtPaymentsMinor: null,
    educationMinor: null,
    personalDevelopmentMinor: null,
  }, { kind: "unclassified" });
  assert.equal(missing.essentials.status, "partial");
  assert.equal(missing.education.status, "notAsked");
  assert.equal(missing.serAndGiving.status, "notAsked");
});

test("deep baseline clones isolate every nested editable reference", () => {
  const baseline: BudgetTargetBaseline = {
    allocation: { ...emptyTargetAllocation, essentials: 4_667 },
    emergencyPlan: {
      completionMonths: 12,
      target: { kind: "preset", months: 6 },
    },
    reserve: { basisPoints: 500, kind: "percentage" },
    reserveChoice: "percentage",
    reserveDraft: "5",
    serGiving: { kind: "split", serShareBasisPoints: 6_000 },
  };
  const active = cloneBudgetTargetBaseline(baseline);

  active.allocation.essentials = 10_000;
  active.emergencyPlan.completionMonths = null;
  if (active.emergencyPlan.target.kind === "preset") {
    active.emergencyPlan.target.months = 3;
  }
  if (active.reserve.kind === "percentage") active.reserve.basisPoints = 900;
  if (active.serGiving.kind === "split") {
    active.serGiving.serShareBasisPoints = 2_000;
  }

  assert.equal(baseline.allocation.essentials, 4_667);
  assert.equal(baseline.emergencyPlan.completionMonths, 12);
  assert.deepEqual(baseline.emergencyPlan.target, { kind: "preset", months: 6 });
  assert.deepEqual(baseline.reserve, { basisPoints: 500, kind: "percentage" });
  assert.deepEqual(baseline.serGiving, {
    kind: "split",
    serShareBasisPoints: 6_000,
  });
});

test("a second reset produces the same baseline after another edit", () => {
  const baseline: BudgetTargetBaseline = {
    allocation: { ...emptyTargetAllocation, alp: 3_000, essentials: 5_000 },
    emergencyPlan: {
      completionMonths: null,
      target: { kind: "unset" },
    },
    reserve: { kind: "unset" },
    reserveChoice: "unset",
    reserveDraft: "",
    serGiving: { kind: "closed" },
  };
  const firstReset = cloneBudgetTargetBaseline(baseline);
  firstReset.allocation.alp = 9_000;
  firstReset.emergencyPlan.target = { kind: "custom", months: 18 };
  firstReset.reserve = { amountMinor: 250, kind: "amount" };
  firstReset.serGiving = { kind: "split", serShareBasisPoints: 7_500 };

  const secondReset = cloneBudgetTargetBaseline(baseline);
  assert.deepEqual(secondReset, baseline);
  assert.notStrictEqual(secondReset.allocation, baseline.allocation);
  assert.notStrictEqual(secondReset.emergencyPlan, baseline.emergencyPlan);
  assert.notStrictEqual(secondReset.emergencyPlan.target, baseline.emergencyPlan.target);
  assert.notStrictEqual(secondReset.reserve, baseline.reserve);
  assert.notStrictEqual(secondReset.serGiving, baseline.serGiving);
});

test("snapshot construction does not mutate its inputs", () => {
  const allocation = { ...emptyTargetAllocation, essentials: 10_000 };
  const plan: EmergencyFundPlan = {
    completionMonths: 10,
    target: { kind: "custom", months: 7 },
  };
  const reserve: ContingencyReserve = {
    amountMinor: 300,
    kind: "amount",
  };
  const before = structuredClone({ allocation, plan, reserve });
  requireSnapshot(buildSnapshot(allocation, { plan, reserve }));
  assert.deepEqual({ allocation, plan, reserve }, before);
});

test("editor consumes snapshot derivatives instead of importing calculation functions", () => {
  const editorSource = readFileSync(new URL(
    "../../../components/budget/BudgetEmergencyFundTarget.tsx",
    import.meta.url,
  ), "utf8");
  assert.doesNotMatch(editorSource, /calculateEmergencyFundProjection/);
  assert.doesNotMatch(editorSource, /contingencyReserveAmount/);
  assert.doesNotMatch(editorSource, /basisPointsFromAmount/);
  assert.match(editorSource, /snapshot\.coverage/);
  assert.match(editorSource, /snapshot\.reserve/);
});

test("EUR, USD, and JPY format exact bigint minor units", () => {
  assert.match(formatTargetMoney(BigInt(123_456), "es", "EUR"), /1[.,]234,56|1234,56/);
  assert.match(formatTargetMoney(BigInt(123_456), "en", "USD"), /1,234\.56|1234\.56/);
  assert.doesNotMatch(formatTargetMoney(BigInt(123_456), "en", "JPY"), /\.\d{2}/);
});
