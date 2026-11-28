import assert from "node:assert/strict";
import test from "node:test";
import { calculateDebtPlan } from "./calculate-debt-plan.ts";
import type { DebtInput, DebtProfileInput } from "./types.ts";

const zero = BigInt(0);
const profile: DebtProfileInput = {
  monthlyNetIncome: 200_000, fixedMonthlyExpenses: 100_000, availableDebtPayment: 50_000,
  emergencyFund: null, liquidNetWorth: null,
};
const debtA: DebtInput = {
  id: "a", name: "A", type: "card", balance: 500_000, annualRate: 0, rateType: "nominal",
  minimumPayment: 150_000, minimumIncludesFees: true, monthlyFee: 0,
};
const debtB: DebtInput = { ...debtA, id: "b", name: "B", balance: 100_000, minimumPayment: null };

test("H21-B case A proves both shortfalls without stating an exact total or schedule coverage", () => {
  const { summary, assessments } = calculateDebtPlan(profile, [debtA, debtB]);
  assert.equal(summary.monthlyMinimums, null);
  assert.equal(summary.minimumsLowerBound, BigInt(150_000));
  assert.equal(summary.marginAfterMinimumsUpperBound, BigInt(-50_000));
  assert.equal(summary.marginAfterMinimums, null);
  assert.equal(summary.economicCapacity, "insufficient");
  assert.equal(summary.minimumPaymentGapUpperBound, BigInt(-100_000));
  assert.equal(summary.minimumPaymentGap, null);
  assert.equal(summary.payoffStatus, "below-minimums");
  assert.equal(assessments.avalanche.coverage, "unknown");
  assert.equal(assessments.snowball.coverage, "unknown");
});

test("H21-B case B proves a shortfall from income alone with ordinary expenses unreported", () => {
  const { summary } = calculateDebtPlan({ ...profile, fixedMonthlyExpenses: null }, [{ ...debtA, minimumPayment: 250_000 }]);
  assert.equal(summary.monthlyMinimums, BigInt(250_000));
  assert.equal(summary.monthlyCashAfterExpenses, null);
  assert.equal(summary.marginAfterMinimums, null);
  assert.equal(summary.marginAfterMinimumsUpperBound, BigInt(-50_000));
  assert.equal(summary.economicCapacity, "insufficient");
  assert.equal(summary.reservedMarginStatus, "unknown");
  assert.equal(summary.emergencyReserveStatus, "unknown");
});

test("H21-B partial headroom establishes neither capacity nor minimum coverage", () => {
  const profileWithRoom = { ...profile, monthlyNetIncome: 400_000, availableDebtPayment: 200_000 };
  const { summary, assessments } = calculateDebtPlan(profileWithRoom, [debtA, debtB]);
  assert.equal(summary.minimumPaymentGapUpperBound, BigInt(50_000));
  assert.equal(summary.economicCapacity, "unknown");
  assert.equal(summary.payoffStatus, "incomplete");
  assert.equal(assessments.avalanche.coverage, "unknown");
  const allMissing = calculateDebtPlan(profileWithRoom, [{ ...debtB, monthlyFee: null, annualRate: null }]).summary;
  assert.equal(allMissing.monthlyMinimums, null);
  assert.equal(allMissing.minimumsLowerBound, zero);
  assert.equal(allMissing.economicCapacity, "unknown");
});

test("H21-B complete, zero-debt and unknown-balance cases keep exact values separate from bounds", () => {
  const empty = calculateDebtPlan(profile, []).summary;
  assert.equal(empty.monthlyMinimums, zero);
  assert.equal(empty.minimumsLowerBound, zero);
  assert.equal(empty.economicCapacity, "sufficient");
  const exact = calculateDebtPlan(profile, [debtA]).summary;
  assert.equal(exact.monthlyMinimums, BigInt(150_000));
  assert.equal(exact.minimumsLowerBound, exact.monthlyMinimums);
  assert.equal(exact.marginAfterMinimumsUpperBound, exact.marginAfterMinimums);
  assert.equal(exact.minimumPaymentGapUpperBound, exact.minimumPaymentGap);
  assert.equal(exact.minimumBasis, "calendar");
  const omittedBalance = calculateDebtPlan(profile, [debtA, { ...debtB, balance: null, minimumPayment: 50_000, monthlyFee: 10_000 }]).summary;
  assert.equal(omittedBalance.monthlyMinimums, null);
  assert.equal(omittedBalance.minimumsLowerBound, BigInt(150_000));
});

test("H21-B unknown fees and rates use only the charge and payoff floor supported by the data", () => {
  const read = (debt: Partial<DebtInput>) => calculateDebtPlan(profile, [{ ...debtA, ...debt }]).summary;
  assert.equal(read({ monthlyFee: null }).monthlyMinimums, BigInt(150_000));
  const additionalFee = read({ monthlyFee: null, minimumIncludesFees: false });
  assert.equal(additionalFee.minimumsLowerBound, BigInt(150_000));
  assert.equal(additionalFee.monthlyMinimums, null);
  const smallBalance = { balance: 1_000, minimumPayment: 150_000 };
  const unknownRate = read({ ...smallBalance, annualRate: null, monthlyFee: 500 });
  assert.equal(unknownRate.minimumsLowerBound, BigInt(1_500));
  assert.equal(unknownRate.monthlyMinimums, null);
  const unknownFee = read({ ...smallBalance, monthlyFee: null });
  assert.equal(unknownFee.minimumsLowerBound, BigInt(1_000));
  assert.equal(unknownFee.monthlyMinimums, null);
  assert.equal(unknownFee.payoffStatus, "incomplete");
  assert.equal(read(smallBalance).monthlyMinimums, BigInt(1_000));
  const knownFee = read({ minimumPayment: null, monthlyFee: 500 });
  assert.equal(knownFee.minimumsLowerBound, BigInt(500));
  assert.equal(knownFee.monthlyMinimums, null);
  const retainedInterest = read({ ...smallBalance, monthlyFee: null, annualRate: 120_000 });
  assert.equal(retainedInterest.minimumsLowerBound, BigInt(1_010));
});

test("H21-B income and invalid entries constrain only the conclusions they can support", () => {
  const noIncome = calculateDebtPlan({ ...profile, monthlyNetIncome: null }, [debtA, debtB]).summary;
  assert.equal(noIncome.economicCapacity, "unknown");
  assert.equal(noIncome.marginAfterMinimumsUpperBound, null);
  assert.equal(noIncome.minimumPaymentGapUpperBound, BigInt(-100_000));
  const expensesOnly = calculateDebtPlan({ ...profile, fixedMonthlyExpenses: 220_000 }, [debtB]).summary;
  assert.equal(expensesOnly.economicCapacity, "insufficient");
  assert.equal(expensesOnly.marginAfterMinimumsUpperBound, BigInt(-20_000));
  const invalid = calculateDebtPlan(profile, [debtA, { ...debtB, monthlyFee: -1 }]).summary;
  assert.equal(invalid.minimumsLowerBound, null);
  assert.equal(invalid.economicCapacity, "unknown");
  assert.equal(invalid.payoffStatus, "incomplete");
  const invalidDebtField = calculateDebtPlan(profile, [debtA, debtB], { invalidSummaryInputs: { debts: true } }).summary;
  assert.equal(invalidDebtField.minimumsLowerBound, null);
  assert.equal(invalidDebtField.economicCapacity, "unknown");
  assert.equal(invalidDebtField.payoffStatus, "incomplete");
  const invalidExpenseField = calculateDebtPlan(
    { ...profile, fixedMonthlyExpenses: null },
    [{ ...debtA, minimumPayment: 250_000 }],
    { invalidSummaryInputs: { ordinaryExpenses: true } },
  ).summary;
  assert.equal(invalidExpenseField.marginAfterMinimumsUpperBound, null);
  assert.equal(invalidExpenseField.economicCapacity, "unknown");
  assert.equal(invalidExpenseField.minimumPaymentGap, BigInt(-200_000));
});

test("H21-B 2,400 generated incomplete profiles contain their recovered minimums and margins", () => {
  let seed = 0x21b2026;
  const next = (max: number) => {
    seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
    return (seed >>> 8) % max;
  };
  let provedCapacity = 0;
  let provedBudget = 0;
  for (let scenario = 0; scenario < 400; scenario++) {
    const completeDebts: DebtInput[] = Array.from({ length: 1 + next(5) }, (_, index) => {
      const fee = next(40_000);
      const minimumIncludesFees = next(2) === 0;
      return {
        ...debtA, id: String(index), balance: next(500_000), monthlyFee: fee,
        annualRate: next(350_000), rateType: next(2) === 0 ? "nominal" : "effective",
        minimumPayment: next(200_000) + (minimumIncludesFees ? fee : 0), minimumIncludesFees,
      };
    });
    const completeProfile = {
      ...profile, monthlyNetIncome: next(550_000), fixedMonthlyExpenses: next(320_000), availableDebtPayment: next(400_000),
    };
    const exact = calculateDebtPlan(completeProfile, completeDebts);
    const ledgerMinimum = exact.avalanche.ledger[0]?.totals.minimumDue ?? zero;
    assert.equal(exact.summary.monthlyMinimums, ledgerMinimum);
    const exactMargin = exact.summary.marginAfterMinimums!;
    const exactGap = exact.summary.minimumPaymentGap!;

    for (let round = 0; round < 6; round++) {
      const incompleteDebts = completeDebts.map(debt => ({
        ...debt,
        balance: next(5) ? debt.balance : null,
        annualRate: next(3) ? debt.annualRate : null,
        rateType: next(5) ? debt.rateType : "unknown" as const,
        minimumPayment: next(3) ? debt.minimumPayment : null,
        monthlyFee: next(3) ? debt.monthlyFee : null,
      }));
      const partial = calculateDebtPlan({
        ...completeProfile,
        monthlyNetIncome: next(4) ? completeProfile.monthlyNetIncome : null,
        fixedMonthlyExpenses: next(2) ? completeProfile.fixedMonthlyExpenses : null,
        availableDebtPayment: next(4) ? completeProfile.availableDebtPayment : null,
      }, incompleteDebts).summary;
      assert.ok(partial.minimumsLowerBound !== null && partial.minimumsLowerBound <= ledgerMinimum);
      if (partial.monthlyMinimums !== null) assert.equal(partial.monthlyMinimums, ledgerMinimum);
      if (partial.marginAfterMinimumsUpperBound !== null) assert.ok(partial.marginAfterMinimumsUpperBound >= exactMargin);
      if (partial.minimumPaymentGapUpperBound !== null) assert.ok(partial.minimumPaymentGapUpperBound >= exactGap);
      if (partial.economicCapacity === "insufficient") {
        provedCapacity++;
        assert.ok(exactMargin < zero);
      }
      if (partial.payoffStatus === "below-minimums") {
        provedBudget++;
        assert.ok(exactGap < zero);
      }
      if (partial.economicCapacity === "sufficient") assert.ok(exactMargin >= zero && partial.marginAfterMinimums !== null);
    }
  }
  assert.ok(provedCapacity > 100);
  assert.ok(provedBudget > 100);
  console.log(`H21-B: 2,400 partial profiles; ${provedCapacity} capacity restrictions and ${provedBudget} budget restrictions verified against recovered inputs.`);
});
