import assert from "node:assert/strict";
import test from "node:test";
import { calculateDebtPlan } from "../../lib/debt/calculate-debt-plan.ts";
import type { DebtInput, DebtProfileInput } from "../../lib/debt/types.ts";
import { balancePoints, differingCostHorizons, flowBreakdown, observedBalance, plotRatio } from "./debt-visual-data.ts";

const profile: DebtProfileInput = {
  monthlyNetIncome: 150_000, fixedMonthlyExpenses: 100_000, availableDebtPayment: 50_000, liquidNetWorth: null, emergencyFund: null,
};
const debt: DebtInput = {
  id: "a", name: "A", type: "personal", balance: 200_000, annualRate: 0, rateType: "nominal",
  monthlyFee: 0, minimumIncludesFees: true, minimumPayment: 70_000,
};
const zero = BigInt(0);

test("visual flow uses actual ordinary payments, unpaid minimums and cash deficit", () => {
  const result = calculateDebtPlan({ ...profile, availableDebtPayment: 60_000 }, [debt], {
    extraContributions: [{ id: "x", monthNumber: 1, amount: 30_000 }],
  });
  const period = result.avalanche.ledger[0];
  const view = result.assessments.avalanche.periods[0];
  assert.deepEqual(flowBreakdown(BigInt(100_000), view, period, view, false), {
    parts: [BigInt(100_000), BigInt(60_000), zero, zero],
    due: BigInt(70_000), ordinaryGap: BigInt(10_000), deficit: BigInt(10_000),
  });
  assert.equal(view.closingShortfall, zero);
});

test("visual flow preserves missing amounts and distinguishes a known empty portfolio", () => {
  const partial = calculateDebtPlan(profile, [{ ...debt, minimumPayment: null }]);
  const flow = partial.assessments.avalanche.initialCashFlow;
  assert.deepEqual(flowBreakdown(BigInt(100_000), flow, undefined, undefined, false).parts, [BigInt(100_000), null, null, null]);
  const empty = calculateDebtPlan(profile, []);
  const emptyFlow = empty.assessments.avalanche.initialCashFlow;
  assert.deepEqual(flowBreakdown(BigInt(100_000), emptyFlow, undefined, undefined, true).parts, [BigInt(100_000), zero, zero, BigInt(50_000)]);
});

test("balance series use each ledger entry and extend only confirmed settled plans", () => {
  const paid = calculateDebtPlan(profile, [debt]).avalanche;
  assert.deepEqual(balancePoints(paid), [
    { month: 0, value: BigInt(200_000) },
    ...paid.ledger.map(period => ({ month: period.month, value: period.totals.closing })),
  ]);
  assert.equal(observedBalance(paid, 600), zero);
  const incomplete = calculateDebtPlan({ ...profile, availableDebtPayment: 5 }, [{ ...debt, annualRate: 120_000 }]).avalanche;
  assert.equal(incomplete.status, "horizon");
  assert.equal(observedBalance(incomplete, 600), incomplete.endingBalance);
  assert.ok(observedBalance(incomplete, 600)! > BigInt(debt.balance!));
  assert.equal(observedBalance(incomplete, 601), null);
  assert.equal(differingCostHorizons([paid, incomplete]), true);
  assert.equal(differingCostHorizons([paid, paid]), false);
  const unavailable = calculateDebtPlan(profile, [{ ...debt, minimumPayment: null }]).avalanche;
  assert.deepEqual(balancePoints(unavailable), []);
  assert.equal(observedBalance(unavailable, 0), null);
});

test("plot coordinates use a bounded ratio at amounts above Number.MAX_SAFE_INTEGER", () => {
  const large = BigInt("100000000000000001");
  assert.equal(plotRatio(large, large * BigInt(4)), .25);
  assert.equal(plotRatio(-large, large * BigInt(2)), -.5);
  assert.equal(plotRatio(large, zero), 0);
});
