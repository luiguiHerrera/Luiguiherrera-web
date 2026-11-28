import assert from "node:assert/strict";
import test from "node:test";
import { calculateDebtPlan, compareDebtScenarios } from "./calculate-debt-plan.ts";
import { compareMinimumCoverage } from "./interpret-debt-plan.ts";
import type { DebtInput, DebtProfileInput } from "./types.ts";

const profile: DebtProfileInput = {
  monthlyNetIncome: 400_000, fixedMonthlyExpenses: 100_000, emergencyFund: 1_200_000,
  availableDebtPayment: 5_000, liquidNetWorth: null,
};
const loan: DebtInput = {
  id: "a", name: "A", type: "card", balance: 100_000, annualRate: 0, rateType: "nominal",
  minimumPayment: 30_000, minimumIncludesFees: false, monthlyFee: 0,
};
const methods = ["avalanche", "snowball"] as const;

test("H19 distinguishes household capacity, minimum coverage and mathematical payoff", () => {
  const result = calculateDebtPlan(profile, [loan]);
  assert.equal(result.summary.economicCapacity, "sufficient");
  assert.equal(result.summary.marginAfterMinimums, BigInt(270_000));
  assert.equal(result.summary.minimumPaymentGap, BigInt(-25_000));
  assert.equal(result.summary.emergencyReserveStatus, "at-reference");
  for (const method of methods) {
    const assessment = result.assessments[method];
    assert.equal(result[method].months, 20);
    assert.equal(assessment.initialCashFlow.marginReserved, BigInt(295_000));
    assert.equal(assessment.coverage, "shortfalls");
    assert.equal(assessment.closingShortfallMonths, 19);
    assert.equal(assessment.closingShortfallTotal, BigInt(425_000));
    assert.equal(assessment.hypotheticalPayoff, true);
    assert.equal(assessment.periods[19].closingShortfall, BigInt(0));
  }
});

test("H20 reserves the whole budget and measures cash from what was actually paid", () => {
  const input = { ...profile, monthlyNetIncome: 200_000, availableDebtPayment: 150_000 };
  for (const method of methods) {
    const model = calculateDebtPlan(input, [{ ...loan, balance: 1_000 }]);
    const first = model.assessments[method].initialCashFlow;
    assert.equal(first.ordinaryBudget, BigInt(150_000));
    assert.equal(first.ordinaryApplied, BigInt(1_000));
    assert.equal(first.ordinaryUnused, BigInt(149_000));
    assert.equal(first.marginReserved, BigInt(-50_000));
    assert.equal(first.marginAfterOrdinary, BigInt(99_000));
    assert.equal(first.extraordinaryApplied, BigInt(0));
    const empty = calculateDebtPlan(input, []).assessments[method];
    assert.equal(empty.coverage, "none");
    assert.equal(empty.initialCashFlow.ordinaryApplied, BigInt(0));
    assert.equal(empty.initialCashFlow.ordinaryUnused, BigInt(150_000));
    assert.equal(empty.initialCashFlow.marginAfterOrdinary, BigInt(100_000));
  }
});

test("H20 measures the selected period when a debt ends and when the last quota is partial", () => {
  const result = calculateDebtPlan({ ...profile, availableDebtPayment: 10_000 }, [
    { ...loan, balance: 1_000, minimumPayment: 0 },
    { ...loan, id: "b", balance: 25_000, minimumPayment: 0 },
  ]);
  assert.equal(result.snowball.ledger[0].debts.find(debt => debt.id === loan.id)?.paidOff, true);
  const [first, second, last] = result.assessments.snowball.periods;
  assert.equal(first.ordinaryApplied, BigInt(10_000));
  assert.equal(second.marginAfterOrdinary, BigInt(290_000));
  assert.equal(last.month, 3);
  assert.equal(last.ordinaryApplied, BigInt(6_000));
  assert.equal(last.ordinaryUnused, BigInt(4_000));
  assert.equal(last.marginReserved, BigInt(290_000));
  assert.equal(last.marginAfterOrdinary, BigInt(294_000));
});

test("H20 separates oversized extra cash from the effective ordinary margin", () => {
  const result = calculateDebtPlan({ ...profile, availableDebtPayment: 500 }, [{ ...loan, balance: 1_000 }], {
    extraContributions: [{ id: "x", monthNumber: 1, amount: 30_000 }],
  });
  const first = result.assessments.avalanche.initialCashFlow;
  assert.equal(first.ordinaryApplied, BigInt(500));
  assert.equal(first.extraordinaryApplied, BigInt(500));
  assert.equal(first.marginAfterOrdinary, BigInt(299_500));
  assert.equal(result.avalanche.contributions[0].unused, BigInt(29_500));
});

test("H21 preserves deficits already established, even when minima and reserve are unknown", () => {
  const input = { ...profile, monthlyNetIncome: 200_000, availableDebtPayment: 150_000, emergencyFund: null };
  const result = calculateDebtPlan(input, [{ ...loan, minimumPayment: null }]);
  assert.equal(result.summary.reservedMarginStatus, "deficit");
  assert.equal(result.summary.cashAfterDebtPlan, BigInt(-50_000));
  assert.equal(result.summary.economicCapacity, "unknown");
  assert.equal(result.summary.emergencyReserveStatus, "unknown");
  assert.equal(result.assessments.avalanche.coverage, "unknown");
  assert.equal(result.assessments.avalanche.initialCashFlow.ordinaryApplied, null);
  const negative = calculateDebtPlan({ ...input, fixedMonthlyExpenses: 210_000 }, [{ ...loan, minimumPayment: null }]);
  assert.equal(negative.summary.economicCapacity, "insufficient");
  assert.equal(negative.summary.minimumMarginStatus, "deficit");
});

test("H21 distinguishes omitted reserve, declared zero and declared minima with a missing rate", () => {
  const result = calculateDebtPlan({ ...profile, emergencyFund: null }, [loan]);
  assert.equal(result.summary.reservedMarginStatus, "compatible");
  assert.equal(result.summary.emergencyReserveStatus, "unknown");
  assert.equal(result.summary.emergencyFundMonths, null);
  const zeroFund = calculateDebtPlan({ ...profile, emergencyFund: 0 }, [loan]);
  assert.equal(zeroFund.summary.emergencyReserveStatus, "limited");
  assert.equal(zeroFund.summary.emergencyFundMonths, 0);
  const estimated = calculateDebtPlan(profile, [{ ...loan, annualRate: null }]);
  assert.equal(estimated.summary.minimumBasis, "declared");
  assert.equal(estimated.summary.minimumPaymentGap, BigInt(-25_000));
  assert.equal(estimated.assessments.avalanche.coverage, "unknown");
});

test("H22 records full and partial same-month coverage from extraordinary payments", () => {
  const run = (amount: number) => calculateDebtPlan(profile, [loan], {
    extraContributions: [{ id: "x", monthNumber: 1, amount }],
  });
  for (const method of methods) {
    const covered = run(95_000).assessments[method];
    assert.equal(covered.periods[0].ordinaryShortfall, BigInt(25_000));
    assert.equal(covered.periods[0].coveredByExtra, BigInt(25_000));
    assert.equal(covered.periods[0].closingShortfall, BigInt(0));
    assert.equal(covered.monthsFullyMadeUpByExtra, 1);
    assert.equal(covered.extraAppliedToMinimums, BigInt(25_000));
    assert.equal(covered.extraAppliedTotal, BigInt(95_000));
    assert.equal(covered.hypotheticalPayoff, false);
    const partial = run(10_000).assessments[method];
    assert.equal(partial.periods[0].closingShortfall, BigInt(15_000));
    assert.equal(partial.periods[0].coveredByExtra, BigInt(10_000));
    assert.equal(partial.monthsFullyMadeUpByExtra, 0);
    assert.equal(partial.hypotheticalPayoff, true);
  }
});

test("H22 limits comparison when closing gaps differ and preserves the calculated deltas", () => {
  const reference = calculateDebtPlan(profile, [loan]);
  const monthly = calculateDebtPlan({ ...profile, availableDebtPayment: 30_000 }, [loan]);
  const unknown = calculateDebtPlan(profile, [{ ...loan, minimumPayment: null }]);
  assert.equal(compareMinimumCoverage(reference.assessments.avalanche, monthly.assessments.avalanche), "different");
  assert.equal(compareMinimumCoverage(reference.assessments.avalanche, reference.assessments.snowball), "matched-with-shortfalls");
  assert.equal(compareMinimumCoverage(monthly.assessments.avalanche, monthly.assessments.snowball), "matched");
  assert.equal(compareMinimumCoverage(reference.assessments.avalanche, unknown.assessments.avalanche), "unknown");
  assert.deepEqual(compareDebtScenarios(reference.avalanche, monthly.avalanche), { costDifference: BigInt(0), monthDifference: -16 });
});
