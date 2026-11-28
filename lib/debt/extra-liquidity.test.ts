import test from "node:test";
import assert from "node:assert/strict";
import { assessExtraLiquidity } from "./extra-liquidity.ts";
import { calculateDebtPlan } from "./calculate-debt-plan.ts";
import type { DebtInput, DebtProfileInput } from "./types.ts";

const b = BigInt;
const amounts = { assets: b(1200000), fund: b(550000), monthlyObligations: b(173000) };
const trace = [{ id: "a", applied: b(120000) }, { id: "b", applied: b(30000) }];
const sources = { a: "reserve", b: "future" } as const;

test("included and separately reported reserves give the same reconciled liquidity", () => {
  const included = assessExtraLiquidity({ ...amounts, relationship: "included", trace, sources });
  const separate = assessExtraLiquidity({ ...amounts, assets: b(650000), relationship: "separate", trace, sources });
  assert.deepEqual(included, separate);
  assert.deepEqual(included.before, { outside: b(650000), fund: b(550000), total: b(1200000), coverage: 550 / 173 });
  assert.deepEqual(included.after, { outside: b(650000), fund: b(430000), total: b(1080000), coverage: 430 / 173 });
  assert.equal(included.reserveAtRisk, true);
  assert.equal(included.fundingGap, b(0));
});

test("future income does not create liquid assets or draw the emergency fund", () => {
  const view = assessExtraLiquidity({ ...amounts, relationship: "included", trace, sources: { a: "future", b: "future" } });
  assert.deepEqual(view.before, view.after);
  assert.equal(view.applied.future, b(150000));
});

test("an unspecified amount is never silently assigned to a reserve or future income", () => {
  const view = assessExtraLiquidity({ ...amounts, relationship: "included", trace, sources: { a: "reserve" } });
  assert.equal(view.applied.unknown, b(30000));
  assert.deepEqual(view.after, { outside: null, fund: null, total: null, coverage: null });
});

test("unknown overlap leaves total and outside assets indeterminate, while reserve movement remains calculable", () => {
  const view = assessExtraLiquidity({ ...amounts, relationship: "unknown", trace, sources });
  assert.equal(view.before.total, null);
  assert.equal(view.after.total, null);
  assert.equal(view.after.outside, null);
  assert.equal(view.after.fund, b(430000));
});

test("an impossible included reserve is flagged and cannot generate fictitious balances", () => {
  const view = assessExtraLiquidity({ ...amounts, assets: b(500000), relationship: "included", trace, sources });
  assert.equal(view.inconsistent, true);
  assert.equal(view.before.total, null);
  assert.equal(view.after.total, null);
});

test("explicit draw sources keep each reserve separate and expose a funding gap", () => {
  const view = assessExtraLiquidity({
    assets: b(1000), fund: b(600), monthlyObligations: b(100), relationship: "included",
    trace: [{ id: "a", applied: b(700) }, { id: "b", applied: b(800) }], sources: { a: "reserve", b: "liquid" },
  });
  assert.equal(view.fundingGap, b(500));
  assert.equal(view.after.outside, b(0));
  assert.equal(view.after.fund, b(0));
  assert.equal(view.reserveAtRisk, true);
  assert.equal(view.after.total! + view.applied.liquid + view.applied.reserve - view.fundingGap!, view.before.total);
});

test("only amounts posted by the debt engine change liquidity, including an overfunded payoff and post-payoff events", () => {
  const profile: DebtProfileInput = {
    availableDebtPayment: 0, emergencyFund: 550000, fixedMonthlyExpenses: 150000, monthlyNetIncome: 320000, liquidNetWorth: 1200000,
  };
  const debt: DebtInput = {
    id: "loan", name: "Loan", type: "personal", balance: 50000, annualRate: 0, rateType: "nominal",
    minimumIncludesFees: true, minimumPayment: 0, monthlyFee: 0,
  };
  const result = calculateDebtPlan(profile, [debt], {
    extraContributions: [{ id: "a", amount: 120000, monthNumber: 1 }, { id: "b", amount: 30000, monthNumber: 2 }],
  });
  const appliedTrace = result.avalanche.contributions;
  assert.equal(result.avalanche.months, 1);
  assert.equal(appliedTrace[0].unused, b(70000));
  assert.equal(appliedTrace[1].unused, b(30000));
  const view = assessExtraLiquidity({ ...amounts, relationship: "included", trace: appliedTrace, sources: { a: "liquid" } });
  assert.equal(view.applied.unknown, b(0));
  assert.equal(view.after.outside, b(600000));
  assert.equal(view.after.fund, b(550000));
  assert.equal(view.after.total, b(1150000));
});
