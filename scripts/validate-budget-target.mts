import assert from "node:assert/strict";
import {
  allocationSumState,
  amountFromBasisPoints,
  basisPointsFromAmount,
  buildAllocationComparison,
  calculateAlpBase,
  calculateEmergencyFundProjection,
  calculateShortfall,
  classifyCurrentAllocation,
  contingencyReserveAmount,
  reconcileAllocationAmounts,
  splitCurrentSaving,
} from "../lib/personal-finance/budget/target-calculations.ts";
import {
  emptyTargetAllocation,
  type CurrentAllocationInput,
  type TargetAllocation,
} from "../lib/personal-finance/budget/target-types.ts";
import {
  parseBoundedInteger,
  parseLocalizedPercentage,
  validateAllocation,
} from "../lib/personal-finance/budget/target-validation.ts";

let assertions = 0;
function equal<T>(actual: T, expected: T, message?: string) {
  assertions += 1;
  assert.equal(actual, expected, message);
}
function deepEqual<T>(actual: T, expected: T, message?: string) {
  assertions += 1;
  assert.deepEqual(actual, expected, message);
}

const validPercentageCases = [
  ["0", "es", 0],
  ["0,01", "es", 1],
  ["99,99", "es", 9_999],
  ["100", "es", 10_000],
  ["10,5", "es", 1_050],
  ["10,50", "es", 1_050],
  ["0", "en", 0],
  ["0.01", "en", 1],
  ["99.99", "en", 9_999],
  ["100.00", "en", 10_000],
] as const;
for (const [raw, locale, expected] of validPercentageCases) {
  deepEqual(parseLocalizedPercentage(raw, locale), {
    basisPoints: expected,
    error: null,
  });
}

for (const [raw, locale, error] of [
  ["-1", "es", "negative"],
  ["100,01", "es", "range"],
  ["10,123", "es", "precision"],
  ["10.5", "es", "invalid"],
  ["1e2", "en", "invalid"],
  ["Infinity", "en", "invalid"],
  ["NaN", "en", "invalid"],
  ["1,000", "en", "invalid"],
  ["10,5", "en", "invalid"],
  [" 10 0 ", "en", "invalid"],
] as const) {
  equal(parseLocalizedPercentage(raw, locale).error, error);
}

deepEqual(parseBoundedInteger("", 1, 120), { error: null, value: null });
deepEqual(parseBoundedInteger("1", 1, 120), { error: null, value: 1 });
deepEqual(parseBoundedInteger("120", 1, 120), { error: null, value: 120 });
equal(parseBoundedInteger("0", 1, 120).error, "range");
equal(parseBoundedInteger("121", 1, 120).error, "range");
equal(parseBoundedInteger("1.5", 1, 120).error, "invalid");
equal(parseBoundedInteger("0", 1, 600).error, "range");
equal(parseBoundedInteger("601", 1, 600).error, "range");

deepEqual(amountFromBasisPoints(10_000, 0), { status: "ok", value: 0 });
deepEqual(amountFromBasisPoints(10_000, 1), { status: "ok", value: 1 });
deepEqual(amountFromBasisPoints(10_000, 9_999), { status: "ok", value: 9_999 });
deepEqual(amountFromBasisPoints(10_000, 10_000), { status: "ok", value: 10_000 });
deepEqual(amountFromBasisPoints(1, 5_000), { status: "ok", value: 1 });
deepEqual(amountFromBasisPoints(0, 5_000), {
  reason: "zero-income",
  status: "notCalculable",
});
equal(amountFromBasisPoints(Number.MAX_SAFE_INTEGER, 60_000).status, "rangeError");
deepEqual(basisPointsFromAmount(1, 3), { status: "ok", value: 3_333 });
deepEqual(basisPointsFromAmount(10_000, 10_000), { status: "ok", value: 10_000 });
equal(basisPointsFromAmount(10_001, 10_000).value, 10_001);
equal(basisPointsFromAmount(1, 0).status, "notCalculable");
equal(basisPointsFromAmount(Number.MAX_SAFE_INTEGER, 1).status, "rangeError");

const thirds: TargetAllocation = {
  alp: 1_667,
  clf: 1_667,
  education: 1_666,
  enjoyment: 1_667,
  essentials: 1_667,
  serAndGiving: 1_666,
};
const reconciled = reconcileAllocationAmounts(1, thirds);
equal(reconciled.status, "ok");
if (reconciled.status === "ok") {
  equal(Object.values(reconciled.value).reduce((sum, value) => sum + value, 0), 1);
  equal(reconciled.value.essentials, 1);
  equal(reconciled.value.alp, 0);
  equal(Math.max(...Object.values(reconciled.value)), 1);
}
const reconciledEur = reconcileAllocationAmounts(123_456, thirds);
equal(reconciledEur.status, "ok");
if (reconciledEur.status === "ok") {
  equal(
    Object.values(reconciledEur.value).reduce((sum, value) => sum + value, 0),
    123_456,
  );
}
const sixHundred: TargetAllocation = {
  alp: 10_000,
  clf: 10_000,
  education: 10_000,
  enjoyment: 10_000,
  essentials: 10_000,
  serAndGiving: 10_000,
};
equal(validateAllocation(sixHundred), true);
equal(reconcileAllocationAmounts(100, sixHundred).status, "ok");
equal(validateAllocation({ ...sixHundred, alp: 10_001 }), false);
equal(reconcileAllocationAmounts(0, thirds).status, "notCalculable");

deepEqual(calculateShortfall(5_000, 4_000, 10_000), {
  amountMinor: 1_000,
  basisPoints: 1_000,
  status: "ok",
});
deepEqual(calculateShortfall(5_000, 5_000, 10_000), {
  amountMinor: 0,
  basisPoints: 0,
  status: "ok",
});
deepEqual(calculateShortfall(5_000, 6_000, 10_000), {
  amountMinor: 0,
  basisPoints: 0,
  status: "ok",
});
equal(calculateShortfall(5_000, 4_000, 0).status, "notCalculable");

deepEqual(calculateEmergencyFundProjection(
  { completionMonths: null, target: { kind: "unset" } },
  1_000,
  0,
), { status: "unset" });
for (const months of [3, 6, 9, 12] as const) {
  const projection = calculateEmergencyFundProjection(
    { completionMonths: null, target: { kind: "preset", months } },
    1_000,
    0,
  );
  equal(projection.status, "calculated");
  if (projection.status === "calculated") equal(projection.targetAmountMinor, months * 1_000);
}
const customProjection = calculateEmergencyFundProjection(
  { completionMonths: 7, target: { kind: "custom", months: 5 } },
  1_000,
  2_000,
);
equal(customProjection.status, "calculated");
if (customProjection.status === "calculated") {
  equal(customProjection.shortfallMinor, 3_000);
  equal(customProjection.monthlyContributionMinor, 429);
}
equal(calculateEmergencyFundProjection(
  { completionMonths: 12, target: { kind: "preset", months: 3 } },
  0,
  0,
).status, "zero-base");
const coveredProjection = calculateEmergencyFundProjection(
  { completionMonths: 12, target: { kind: "preset", months: 3 } },
  1_000,
  3_000,
);
if (coveredProjection.status === "calculated") {
  equal(coveredProjection.shortfallMinor, 0);
  equal(coveredProjection.monthlyContributionMinor, null);
}
equal(calculateEmergencyFundProjection(
  { completionMonths: 0, target: { kind: "preset", months: 3 } },
  1_000,
  0,
).status, "rangeError");
equal(calculateEmergencyFundProjection(
  { completionMonths: 601, target: { kind: "preset", months: 3 } },
  1_000,
  0,
).status, "rangeError");
equal(calculateEmergencyFundProjection(
  { completionMonths: null, target: { kind: "custom", months: 121 } },
  1_000,
  0,
).status, "rangeError");
equal(calculateEmergencyFundProjection(
  { completionMonths: null, target: { kind: "custom", months: 0 } },
  1_000,
  0,
).status, "rangeError");
equal(calculateEmergencyFundProjection(
  { completionMonths: null, target: { kind: "custom", months: 120 } },
  Number.MAX_SAFE_INTEGER,
  0,
).status, "rangeError");

deepEqual(contingencyReserveAmount({ kind: "unset" }, 10_000), { status: "ok", value: 0 });
deepEqual(contingencyReserveAmount({ kind: "none" }, 10_000), { status: "ok", value: 0 });
deepEqual(contingencyReserveAmount({ amountMinor: 250, kind: "amount" }, 10_000), { status: "ok", value: 250 });
deepEqual(contingencyReserveAmount({ basisPoints: 250, kind: "percentage" }, 10_000), { status: "ok", value: 250 });
deepEqual(calculateAlpBase(1_000, 250, { status: "unset" }), { status: "ok", value: 1_250 });
deepEqual(calculateAlpBase(1_000, 0, { status: "zero-base" }), { status: "ok", value: 1_000 });
deepEqual(calculateAlpBase(1_000, 250, customProjection), { status: "ok", value: 1_679 });
deepEqual(calculateAlpBase(1_000, 250, coveredProjection), { status: "ok", value: 1_250 });

deepEqual(splitCurrentSaving(10_001, 0), {
  status: "ok",
  value: { alpMinor: 0, clfMinor: 10_001 },
});
deepEqual(splitCurrentSaving(10_001, 10_000), {
  status: "ok",
  value: { alpMinor: 10_001, clfMinor: 0 },
});
const middleSplit = splitCurrentSaving(10_001, 3_333);
equal(middleSplit.status, "ok");
if (middleSplit.status === "ok") {
  equal(middleSplit.value.alpMinor + middleSplit.value.clfMinor, 10_001);
}
deepEqual(splitCurrentSaving(0, 5_000), {
  status: "ok",
  value: { alpMinor: 0, clfMinor: 0 },
});

const currentBase: CurrentAllocationInput = {
  debtPaymentsMinor: 1_000,
  educationMinor: null,
  enjoymentMinor: 0,
  essentialsMinor: 4_000,
  incomeMinor: 10_000,
  monthlyNonMonthlyMinor: 500,
  personalDevelopmentMinor: 200,
  savingInvestmentMinor: 2_000,
  smallExpensesMinor: 300,
};
const currentUnclassified = classifyCurrentAllocation(currentBase, { kind: "unclassified" });
equal(currentUnclassified.essentials.status, "known");
equal(currentUnclassified.essentials.amountMinor, 5_000);
equal(currentUnclassified.enjoyment.amountMinor, 0);
equal(currentUnclassified.education.amountMinor, null);
equal(currentUnclassified.alp.status, "partial");
equal(currentUnclassified.alp.amountMinor, 500);
equal(currentUnclassified.clf.status, "notDifferentiated");
equal(currentUnclassified.serAndGiving.status, "partial");
const currentSplit = classifyCurrentAllocation(currentBase, {
  alpShareBasisPoints: 2_500,
  kind: "split",
});
equal(currentSplit.alp.status, "known");
equal(currentSplit.alp.amountMinor, 1_000);
equal(currentSplit.clf.amountMinor, 1_500);
equal(currentSplit.alp.basisPoints, 1_000);
const currentZero = classifyCurrentAllocation({
  ...currentBase,
  monthlyNonMonthlyMinor: 0,
  savingInvestmentMinor: 0,
}, { kind: "unclassified" });
equal(currentZero.alp.amountMinor, 0);
equal(currentZero.alp.status, "known");
equal(currentZero.clf.amountMinor, 0);
const currentMissing = classifyCurrentAllocation({
  ...currentBase,
  debtPaymentsMinor: null,
  essentialsMinor: null,
  monthlyNonMonthlyMinor: 0,
  personalDevelopmentMinor: null,
  savingInvestmentMinor: null,
}, { kind: "unclassified" });
equal(currentMissing.essentials.status, "notAsked");
equal(currentMissing.alp.status, "notAsked");
equal(currentMissing.clf.status, "notAsked");
equal(currentMissing.serAndGiving.status, "notAsked");

const exactState = allocationSumState(thirds, {
  hasAlpShortfall: false,
  hasEssentialsShortfall: false,
  hasValidationErrors: false,
});
equal(exactState.status, "exact");
equal(exactState.isFinalViable, true);
equal(allocationSumState(emptyTargetAllocation, {
  hasAlpShortfall: false,
  hasEssentialsShortfall: false,
  hasValidationErrors: false,
}).status, "under");
equal(allocationSumState(sixHundred, {
  hasAlpShortfall: false,
  hasEssentialsShortfall: false,
  hasValidationErrors: false,
}).status, "over");
equal(allocationSumState(thirds, {
  hasAlpShortfall: true,
  hasEssentialsShortfall: false,
  hasValidationErrors: false,
}).isFinalViable, false);
equal(allocationSumState(thirds, {
  hasAlpShortfall: false,
  hasEssentialsShortfall: true,
  hasValidationErrors: false,
}).isFinalViable, false);
equal(allocationSumState(thirds, {
  hasAlpShortfall: false,
  hasEssentialsShortfall: false,
  hasValidationErrors: true,
}).isFinalViable, false);

if (reconciledEur.status === "ok") {
  const comparison = buildAllocationComparison(
    currentUnclassified,
    thirds,
    reconciledEur.value,
  );
  equal(comparison.length, 6);
  equal(comparison.find((row) => row.category === "essentials")?.deltaAmountMinor !== null, true);
  equal(comparison.find((row) => row.category === "alp")?.deltaAmountMinor, null);
  equal(comparison.find((row) => row.category === "clf")?.deltaBasisPoints, null);
}

console.log(`Budget target validation passed: ${assertions} assertions.`);
