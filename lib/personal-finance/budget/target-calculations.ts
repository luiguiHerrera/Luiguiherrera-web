import {
  allocationCategories,
  MAX_CATEGORY_ALLOCATION_BASIS_POINTS,
  type AllocationBasisPoints,
  type AllocationComparisonRow,
  type AllocationSumState,
  type ContingencyReserve,
  type CurrentAllocationInput,
  type CurrentAllocationMap,
  type CurrentAllocationStatus,
  type EmergencyFundPlan,
  type EmergencyFundProjection,
  type ExactCalculation,
  type ReconciledAllocationAmounts,
  type SavingsCurrentClassification,
  type TargetAllocation,
  type TargetAllocationLifecycle,
} from "./target-types.ts";

const BASIS_POINTS_TOTAL = BigInt(10_000);
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

export type MinorUnitRescaleResult =
  | { status: "exact"; value: number }
  | { status: "notRepresentable" }
  | { status: "rangeError" };

function isSafeNonNegativeInteger(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}

function safeNumber(value: bigint): ExactCalculation<number> {
  if (value < BigInt(0) || value > MAX_SAFE) {
    return { reason: "unsafe-integer", status: "rangeError" };
  }
  return { status: "ok", value: Number(value) };
}

function roundHalfUp(numerator: bigint, denominator: bigint) {
  if (denominator <= BigInt(0) || numerator < BigInt(0)) {
    throw new RangeError("roundHalfUp requires a non-negative numerator and positive denominator");
  }
  return (numerator + denominator / BigInt(2)) / denominator;
}

function safeSum(values: number[]): ExactCalculation<number> {
  if (!values.every(isSafeNonNegativeInteger)) {
    return { reason: "unsafe-integer", status: "rangeError" };
  }
  return safeNumber(values.reduce(
    (total, value) => total + BigInt(value),
    BigInt(0),
  ));
}

export function rescaleMinorUnitsExact(
  oldMinorUnits: number,
  oldFractionDigits: number,
  newFractionDigits: number,
): MinorUnitRescaleResult {
  if (
    !isSafeNonNegativeInteger(oldMinorUnits)
    || !Number.isSafeInteger(oldFractionDigits)
    || oldFractionDigits < 0
    || !Number.isSafeInteger(newFractionDigits)
    || newFractionDigits < 0
  ) {
    return { status: "rangeError" };
  }
  const oldFactor = BigInt(10) ** BigInt(oldFractionDigits);
  const newFactor = BigInt(10) ** BigInt(newFractionDigits);
  const scaledNumerator = BigInt(oldMinorUnits) * newFactor;
  if (scaledNumerator % oldFactor !== BigInt(0)) {
    return { status: "notRepresentable" };
  }
  const scaled = scaledNumerator / oldFactor;
  return scaled > MAX_SAFE
    ? { status: "rangeError" }
    : { status: "exact", value: Number(scaled) };
}

export function transitionTargetAllocationLifecycle(
  lifecycle: TargetAllocationLifecycle,
  event: "initialize-success" | "initialize-error" | "edit",
): TargetAllocationLifecycle {
  if (event === "edit") return "edited";
  if (event === "initialize-success" && lifecycle === "uninitialized") {
    return "initialized";
  }
  return lifecycle;
}

export function amountFromBasisPoints(
  incomeMinor: number,
  basisPoints: AllocationBasisPoints,
): ExactCalculation<number> {
  if (!isSafeNonNegativeInteger(incomeMinor)
    || !Number.isSafeInteger(basisPoints)
    || basisPoints < 0) {
    return { reason: "unsafe-integer", status: "rangeError" };
  }
  if (incomeMinor === 0) {
    return { reason: "zero-income", status: "notCalculable" };
  }
  return safeNumber(roundHalfUp(BigInt(incomeMinor) * BigInt(basisPoints), BASIS_POINTS_TOTAL));
}

export function basisPointsFromAmount(
  amountMinor: number,
  incomeMinor: number,
): ExactCalculation<number> {
  if (!isSafeNonNegativeInteger(amountMinor) || !isSafeNonNegativeInteger(incomeMinor)) {
    return { reason: "unsafe-integer", status: "rangeError" };
  }
  if (incomeMinor === 0) {
    return { reason: "zero-income", status: "notCalculable" };
  }
  return safeNumber(roundHalfUp(BigInt(amountMinor) * BASIS_POINTS_TOTAL, BigInt(incomeMinor)));
}

export function reconcileAllocationAmounts(
  incomeMinor: number,
  allocation: TargetAllocation,
): ExactCalculation<ReconciledAllocationAmounts> {
  if (!isSafeNonNegativeInteger(incomeMinor)
    || !allocationCategories.every((category) => (
      Number.isSafeInteger(allocation[category])
      && allocation[category] >= 0
      && allocation[category] <= MAX_CATEGORY_ALLOCATION_BASIS_POINTS
    ))) {
    return { reason: "unsafe-integer", status: "rangeError" };
  }
  if (incomeMinor === 0) {
    return { reason: "zero-income", status: "notCalculable" };
  }

  const income = BigInt(incomeMinor);
  const entries = allocationCategories.map((category, order) => {
    const product = income * BigInt(allocation[category]);
    return {
      category,
      order,
      quotient: product / BASIS_POINTS_TOTAL,
      remainder: product % BASIS_POINTS_TOTAL,
    };
  });
  const totalBasisPoints = allocationCategories.reduce(
    (total, category) => total + BigInt(allocation[category]),
    BigInt(0),
  );
  const targetTotal = roundHalfUp(income * totalBasisPoints, BASIS_POINTS_TOTAL);
  const floorTotal = entries.reduce(
    (total, entry) => total + entry.quotient,
    BigInt(0),
  );
  const corrections = Number(targetTotal - floorTotal);
  if (corrections < 0 || corrections > allocationCategories.length) {
    return { reason: "unsafe-integer", status: "rangeError" };
  }

  const corrected = new Set(
    [...entries]
      .sort((left, right) => (
        left.remainder === right.remainder
          ? left.order - right.order
          : left.remainder > right.remainder ? -1 : 1
      ))
      .slice(0, corrections)
      .map((entry) => entry.category),
  );

  const amounts = {} as ReconciledAllocationAmounts;
  for (const entry of entries) {
    const converted = safeNumber(
      entry.quotient + (corrected.has(entry.category) ? BigInt(1) : BigInt(0)),
    );
    if (converted.status !== "ok") return converted;
    amounts[entry.category] = converted.value;
  }
  return { status: "ok", value: amounts };
}

export function allocationSumState(
  allocation: TargetAllocation,
  options: {
    hasAlpShortfall: boolean;
    hasEssentialsShortfall: boolean;
    hasValidationErrors: boolean;
  },
): AllocationSumState {
  if (!allocationCategories.every((category) => (
    Number.isSafeInteger(allocation[category])
    && allocation[category] >= 0
    && allocation[category] <= MAX_CATEGORY_ALLOCATION_BASIS_POINTS
  ))) {
    throw new RangeError("allocation category is outside the supported range");
  }
  const allocatedBasisPoints = allocationCategories.reduce(
    (total, category) => total + allocation[category],
    0,
  );
  const status = allocatedBasisPoints < 10_000
    ? "under"
    : allocatedBasisPoints === 10_000 ? "exact" : "over";
  return {
    allocatedBasisPoints,
    excessBasisPoints: Math.max(0, allocatedBasisPoints - 10_000),
    isFinalViable: status === "exact"
      && !options.hasAlpShortfall
      && !options.hasEssentialsShortfall
      && !options.hasValidationErrors,
    remainingBasisPoints: Math.max(0, 10_000 - allocatedBasisPoints),
    status,
  };
}

export function calculateShortfall(
  requiredMinor: number,
  allocatedMinor: number,
  incomeMinor: number,
) {
  const difference = safeSum([requiredMinor]);
  if (difference.status !== "ok"
    || !isSafeNonNegativeInteger(allocatedMinor)
    || !isSafeNonNegativeInteger(incomeMinor)) {
    return { amountMinor: null, basisPoints: null, status: "rangeError" as const };
  }
  const amountMinor = Math.max(0, requiredMinor - allocatedMinor);
  if (amountMinor === 0) {
    return { amountMinor: 0, basisPoints: 0, status: "ok" as const };
  }
  const basisPoints = basisPointsFromAmount(amountMinor, incomeMinor);
  return basisPoints.status === "ok"
    ? { amountMinor, basisPoints: basisPoints.value, status: "ok" as const }
    : {
        amountMinor,
        basisPoints: null,
        status: basisPoints.status === "rangeError" ? "rangeError" as const : "notCalculable" as const,
      };
}

export function calculateEmergencyFundProjection(
  plan: EmergencyFundPlan,
  coverageBaseMinor: number,
  emergencyFundMinor: number,
): EmergencyFundProjection {
  if (plan.target.kind === "unset") return { status: "unset" };
  if (!isSafeNonNegativeInteger(coverageBaseMinor)
    || !isSafeNonNegativeInteger(emergencyFundMinor)) {
    return { status: "rangeError" };
  }
  if (coverageBaseMinor === 0) return { status: "zero-base" };
  const targetMonths = plan.target.months;
  if (!Number.isSafeInteger(targetMonths) || targetMonths < 1 || targetMonths > 120) {
    return { status: "rangeError" };
  }
  if (plan.completionMonths !== null
    && (!Number.isSafeInteger(plan.completionMonths)
      || plan.completionMonths < 1
      || plan.completionMonths > 600)) {
    return { status: "rangeError" };
  }
  const target = safeNumber(BigInt(coverageBaseMinor) * BigInt(targetMonths));
  if (target.status !== "ok") return { status: "rangeError" };
  const shortfallMinor = Math.max(0, target.value - emergencyFundMinor);
  const contribution = plan.completionMonths === null || shortfallMinor === 0
    ? null
    : safeNumber(
        (BigInt(shortfallMinor) + BigInt(plan.completionMonths) - BigInt(1))
        / BigInt(plan.completionMonths),
      );
  if (contribution?.status === "rangeError") return { status: "rangeError" };
  const coverage = basisPointsFromAmount(emergencyFundMinor, coverageBaseMinor);
  if (coverage.status !== "ok") return { status: "rangeError" };
  return {
    currentCoverageBasisPoints: coverage.value,
    monthlyContributionMinor: contribution?.status === "ok" ? contribution.value : null,
    shortfallMinor,
    status: "calculated",
    targetAmountMinor: target.value,
    targetMonths,
  };
}

export function contingencyReserveAmount(
  reserve: ContingencyReserve,
  incomeMinor: number,
): ExactCalculation<number> {
  if (reserve.kind === "unset" || reserve.kind === "none") {
    return { status: "ok", value: 0 };
  }
  if (reserve.kind === "amount") {
    return isSafeNonNegativeInteger(reserve.amountMinor)
      ? { status: "ok", value: reserve.amountMinor }
      : { reason: "unsafe-integer", status: "rangeError" };
  }
  return amountFromBasisPoints(incomeMinor, reserve.basisPoints);
}

export function calculateAlpBase(
  monthlyNonMonthlyMinor: number,
  reserveMinor: number,
  projection: EmergencyFundProjection,
): ExactCalculation<number> {
  const contribution = projection.status === "calculated"
    ? projection.monthlyContributionMinor ?? 0
    : 0;
  return safeSum([monthlyNonMonthlyMinor, reserveMinor, contribution]);
}

export function deriveStartingTargetAllocation(
  input: CurrentAllocationInput,
  classification: SavingsCurrentClassification,
  reserve: ContingencyReserve,
  projection: EmergencyFundProjection,
): ExactCalculation<TargetAllocation> {
  const reserveResult = contingencyReserveAmount(reserve, input.incomeMinor);
  if (reserveResult.status !== "ok") return reserveResult;

  let classifiedAlpMinor = 0;
  let classifiedClfMinor = 0;
  if (
    classification.kind === "split"
    && input.savingInvestmentMinor !== null
  ) {
    const split = splitCurrentSaving(
      input.savingInvestmentMinor,
      classification.alpShareBasisPoints,
    );
    if (split.status !== "ok") return split;
    classifiedAlpMinor = split.value.alpMinor;
    classifiedClfMinor = split.value.clfMinor;
  }

  const alpBase = calculateAlpBase(
    input.monthlyNonMonthlyMinor,
    reserveResult.value,
    projection,
  );
  if (alpBase.status !== "ok") return alpBase;

  const amounts = {
    alp: safeSum([alpBase.value, classifiedAlpMinor]),
    clf: safeSum([classifiedClfMinor]),
    education: safeSum([input.educationMinor ?? 0]),
    enjoyment: safeSum([input.enjoymentMinor ?? 0]),
    essentials: safeSum([
      input.essentialsMinor ?? 0,
      input.debtPaymentsMinor ?? 0,
    ]),
    serAndGiving: safeSum([input.personalDevelopmentMinor ?? 0]),
  };
  if (Object.values(amounts).some((amount) => amount.status !== "ok")) {
    return { reason: "unsafe-integer", status: "rangeError" };
  }

  const allocation = {} as TargetAllocation;
  for (const category of allocationCategories) {
    const amount = amounts[category];
    if (amount.status !== "ok") {
      return { reason: "unsafe-integer", status: "rangeError" };
    }
    const converted = basisPointsFromAmount(amount.value, input.incomeMinor);
    if (
      converted.status !== "ok"
      || converted.value > MAX_CATEGORY_ALLOCATION_BASIS_POINTS
    ) {
      return converted.status === "rangeError"
        ? converted
        : { reason: "unsafe-integer", status: "rangeError" };
    }
    allocation[category] = converted.value;
  }

  return { status: "ok", value: allocation };
}

export function splitCurrentSaving(
  savingInvestmentMinor: number,
  alpShareBasisPoints: number,
) {
  if (savingInvestmentMinor === 0
    && Number.isSafeInteger(alpShareBasisPoints)
    && alpShareBasisPoints >= 0
    && alpShareBasisPoints <= 10_000) {
    return {
      status: "ok" as const,
      value: { alpMinor: 0, clfMinor: 0 },
    };
  }
  const alp = amountFromBasisPoints(savingInvestmentMinor, alpShareBasisPoints);
  if (alp.status !== "ok") return alp;
  return {
    status: "ok" as const,
    value: {
      alpMinor: alp.value,
      clfMinor: savingInvestmentMinor - alp.value,
    },
  };
}

function currentValue(
  amountMinor: number | null,
  status: CurrentAllocationStatus,
  incomeMinor: number,
) {
  if (amountMinor === null || status !== "known") {
    return { amountMinor, basisPoints: null, status };
  }
  const percentage = basisPointsFromAmount(amountMinor, incomeMinor);
  return {
    amountMinor,
    basisPoints: percentage.status === "ok" ? percentage.value : null,
    status,
  };
}

export function classifyCurrentAllocation(
  input: CurrentAllocationInput,
  classification: SavingsCurrentClassification,
): CurrentAllocationMap {
  const essentialsValues = [input.essentialsMinor, input.debtPaymentsMinor];
  const essentialsPresent = essentialsValues.filter((value) => value !== null);
  const essentialsStatus: CurrentAllocationStatus = essentialsPresent.length === 2
    ? "known"
    : essentialsPresent.length === 1 ? "partial" : "notAsked";
  const essentialsAmount = essentialsPresent.length === 0
    ? null
    : essentialsPresent.reduce<number>((total, value) => total + (value ?? 0), 0);

  let alpAmount: number | null = input.monthlyNonMonthlyMinor > 0
    ? input.monthlyNonMonthlyMinor
    : null;
  let alpStatus: CurrentAllocationStatus = alpAmount === null ? "notAsked" : "partial";
  let clfAmount: number | null = null;
  let clfStatus: CurrentAllocationStatus = "notAsked";

  if (input.savingInvestmentMinor !== null) {
    if (input.savingInvestmentMinor === 0) {
      clfAmount = 0;
      clfStatus = "known";
      alpAmount = input.monthlyNonMonthlyMinor;
      alpStatus = "known";
    } else if (classification.kind === "split") {
      const split = splitCurrentSaving(
        input.savingInvestmentMinor,
        classification.alpShareBasisPoints,
      );
      if (split.status === "ok") {
        alpAmount = split.value.alpMinor + input.monthlyNonMonthlyMinor;
        alpStatus = "known";
        clfAmount = split.value.clfMinor;
        clfStatus = "known";
      }
    } else {
      alpAmount = input.monthlyNonMonthlyMinor;
      alpStatus = "partial";
      clfStatus = "notDifferentiated";
    }
  }

  return {
    alp: currentValue(alpAmount, alpStatus, input.incomeMinor),
    clf: currentValue(clfAmount, clfStatus, input.incomeMinor),
    education: currentValue(
      input.educationMinor,
      input.educationMinor === null ? "notAsked" : "known",
      input.incomeMinor,
    ),
    enjoyment: currentValue(
      input.enjoymentMinor,
      input.enjoymentMinor === null ? "notAsked" : "known",
      input.incomeMinor,
    ),
    essentials: currentValue(essentialsAmount, essentialsStatus, input.incomeMinor),
    serAndGiving: currentValue(
      input.personalDevelopmentMinor,
      input.personalDevelopmentMinor === null ? "notAsked" : "partial",
      input.incomeMinor,
    ),
  };
}

export function buildAllocationComparison(
  current: CurrentAllocationMap,
  target: TargetAllocation,
  targetAmounts: ReconciledAllocationAmounts,
): AllocationComparisonRow[] {
  return allocationCategories.map((category) => {
    const currentValueForCategory = current[category];
    const canCompare = currentValueForCategory.status === "known"
      && currentValueForCategory.amountMinor !== null
      && currentValueForCategory.basisPoints !== null;
    return {
      category,
      currentAmountMinor: currentValueForCategory.amountMinor,
      currentBasisPoints: currentValueForCategory.basisPoints,
      currentStatus: currentValueForCategory.status,
      deltaAmountMinor: canCompare
        ? targetAmounts[category] - currentValueForCategory.amountMinor!
        : null,
      deltaBasisPoints: canCompare
        ? target[category] - currentValueForCategory.basisPoints!
        : null,
      targetAmountMinor: targetAmounts[category],
      targetBasisPoints: target[category],
    };
  });
}
