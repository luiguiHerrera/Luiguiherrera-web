import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { calculateDebtPlan } from "./calculate-debt-plan.ts";
import type { DebtInput, ExtraContributionInput, PayoffMethod } from "./types.ts";

function debt(values: Partial<DebtInput> = {}): DebtInput {
  return { id: "a", name: "A", type: "other", annualRate: 0, rateType: "nominal", balance: 100_000,
    minimumPayment: 0, minimumIncludesFees: false, monthlyFee: 0, ...values };
}

const extra = (id: string, monthNumber: number, amount: number) => ({ id, monthNumber, amount });
const fixtures: { name: string; debts: DebtInput[]; budget: number; extras: ExtraContributionInput[] }[] = [
  { name: "zero-interest rounded final", debts: [debt({ balance: 100_003 })], budget: 15_000, extras: [] },
  { name: "nominal constant payment", debts: [debt({ annualRate: 120_000, minimumPayment: 4_000 })], budget: 9_000, extras: [] },
  { name: "effective constant payment", debts: [debt({ annualRate: 120_000, rateType: "effective" })], budget: 9_000, extras: [] },
  { name: "effective exactly 1% monthly once rounded", debts: [debt({ annualRate: 126_825, rateType: "effective" })], budget: 9_000, extras: [] },
  { name: "recurring fee included in minimum", debts: [debt({ minimumPayment: 10_000, minimumIncludesFees: true, monthlyFee: 1_000 })], budget: 10_000, extras: [] },
  { name: "recurring fee outside minimum", debts: [debt({ minimumPayment: 9_000, monthlyFee: 1_000 })], budget: 10_000, extras: [] },
  { name: "negative amortization up to horizon", debts: [debt({ annualRate: 120_000 })], budget: 500, extras: [] },
  { name: "unpaid fees without interest on fees", debts: [debt({ annualRate: 120_000, monthlyFee: 100 })], budget: 50, extras: [] },
  { name: "flat then future payment", debts: [debt({ annualRate: 120_000, minimumPayment: 1_000 })], budget: 1_000, extras: [extra("later", 13, 100_000)] },
  { name: "multiple debts and temporarily increasing balance", debts: [
    debt({ balance: 880_000, annualRate: 260_000, minimumPayment: 7_500 }),
    debt({ id: "b", balance: 1_470_000, annualRate: 280_000, minimumPayment: 45_000 }),
  ], budget: 52_500, extras: [] },
  { name: "proportional minimums, same-month extras and fees", debts: [
    debt({ balance: 100_000, annualRate: 180_000, minimumPayment: 11_102, monthlyFee: 307 }),
    debt({ id: "b", balance: 65_000, annualRate: 240_000, minimumPayment: 7_007, rateType: "effective" }),
    debt({ id: "c", balance: 20_000, annualRate: 50_000, minimumPayment: 2_003, monthlyFee: 210 }),
  ], budget: 15_002, extras: [extra("one", 2, 7_401), extra("two", 2, 4_501), extra("last", 30, 200_000)] },
  { name: "single minor unit", debts: [debt({ balance: 1, minimumPayment: 10 })], budget: 3, extras: [] },
];

test("Independent Decimal reference agrees for 24 method-case pairs and every simulated month", () => {
  const methods: PayoffMethod[] = ["avalanche", "snowball"];
  const cases = fixtures.flatMap(f => methods.map(method => ({ ...f, method })));
  const script = fileURLToPath(new URL("../../scripts/debt-reference.py", import.meta.url));
  const reference = spawnSync("python3", [script], { input: JSON.stringify(cases), encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  assert.equal(reference.status, 0, reference.stderr || reference.error?.message);
  const expected = JSON.parse(reference.stdout);
  assert.equal(expected.length, cases.length);
  for (const [index, c] of cases.entries()) {
    const result = calculateDebtPlan({
      availableDebtPayment: c.budget, emergencyFund: null, fixedMonthlyExpenses: null, liquidNetWorth: null, monthlyNetIncome: null,
    }, c.debts, { extraContributions: c.extras })[c.method];
    const t = result.totals!;
    const actual = {
      totals: { ordinary: Number(t.ordinaryPaid), extra: Number(t.extraPaid), interest: Number(t.interest), fees: Number(t.fees),
        paid_interest: Number(t.interestPaid), paid_fees: Number(t.feesPaid), paid_principal: Number(t.principalPaid) },
      ending: Number(result.endingBalance), months: result.months,
      timeline: result.ledger.map(({ totals: m }) => [m.opening, m.interest, m.fees, m.ordinaryPaid, m.extraPaid, m.closing, m.minimumShortfall].map(Number)),
      liquidations: result.liquidations.map(x => [x.id, x.month]),
    };
    assert.deepEqual(actual, expected[index], `${c.name} · ${c.method}`);
  }
});

test("Closed-form sanity checks for no-interest, constant payments and effective monthly conversion", () => {
  assert.equal(Math.ceil(1_000.03 / 150), 7);
  const nominalMonth = 0.12 / 12;
  const unroundedAfterYear = 1_000 * (1 + nominalMonth) ** 12 - 5 * ((1 + nominalMonth) ** 12 - 1) / nominalMonth;
  assert.ok(Math.abs(unroundedAfterYear - 1_063.41) < 0.005);
  const standardMonths = -Math.log(1 - 1_000 * nominalMonth / 90) / Math.log(1 + nominalMonth);
  const ordinary = calculateDebtPlan({
    availableDebtPayment: 9_000, emergencyFund: null, fixedMonthlyExpenses: null, liquidNetWorth: null, monthlyNetIncome: null,
  }, [debt({ annualRate: 120_000 })]).avalanche;
  assert.equal(Math.ceil(standardMonths), ordinary.months);
  assert.ok(Math.abs((1.12 ** (1 / 12) - 1) * 1000 - 9.49) < 0.005);
});
