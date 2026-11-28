import assert from "node:assert/strict";
import test from "node:test";
import { calculateDebtPlan, compareDebtScenarios } from "./calculate-debt-plan.ts";
import { MAX_ANNUAL_RATE, MAX_MONTHS, parseDebtMoney, parseDebtMonth, parseDebtRate } from "./debt-input.ts";
import type { DebtInput, DebtProfileInput, ExtraContributionInput, PayoffPlan } from "./types.ts";

const units = (value: number) => BigInt(value);
const zero = units(0);

function debt(values: Partial<DebtInput> = {}): DebtInput {
  return {
    id: "a", name: "A", type: "card", balance: 100_000, annualRate: 0, rateType: "nominal",
    minimumPayment: 0, minimumIncludesFees: false, monthlyFee: 0, ...values,
  };
}

function profile(values: Partial<DebtProfileInput> = {}): DebtProfileInput {
  return { availableDebtPayment: 10_000, emergencyFund: null, fixedMonthlyExpenses: null, liquidNetWorth: null, monthlyNetIncome: null, ...values };
}

function run(debts: DebtInput[], availableDebtPayment: number | null, extraContributions: ExtraContributionInput[] = []) {
  return calculateDebtPlan(profile({ availableDebtPayment }), debts, { extraContributions });
}

test("H01 includes fixed recurring fees in the cash budget and clips the final payment", () => {
  const p = run([debt({ monthlyFee: 1_000 })], 10_000).avalanche;
  assert.equal(p.months, 12);
  assert.equal(p.totals?.ordinaryPaid, units(112_000));
  assert.equal(p.totals?.fees, units(12_000));
  assert.equal(p.ledger.at(-1)?.totals.ordinaryPaid, units(2_000));
  assert.equal(p.ledger.at(-1)?.ordinaryUnused, units(8_000));
  const included = run([debt({ monthlyFee: 1_000, minimumPayment: 2_000, minimumIncludesFees: true })], 2_000).avalanche;
  const excluded = run([debt({ monthlyFee: 1_000, minimumPayment: 2_000, minimumIncludesFees: false })], 2_000).avalanche;
  assert.equal(included.ledger[0].totals.minimumDue, units(2_000));
  assert.equal(excluded.ledger[0].totals.minimumDue, units(3_000));
  assert.equal(excluded.ledger[0].totals.minimumShortfall, units(1_000));
  const belowFee = run([debt({ monthlyFee: 1_000 })], 500).avalanche;
  assert.equal(belowFee.ledger[0].totals.closingFees, units(500));
  assert.equal(belowFee.ledger[0].totals.principalPaid, zero);
});

test("H02 reaches a month-13 lump sum and keeps simulating despite a growing loan", () => {
  const flat = run([debt({ annualRate: 120_000, minimumPayment: 1_000 })], 1_000, [{ id: "e", monthNumber: 13, amount: 100_000 }]).avalanche;
  assert.equal(flat.months, 13);
  assert.equal(flat.contributions[0].applied, units(100_000));
  const mixed = run([
    debt({ balance: 880_000, annualRate: 260_000, minimumPayment: 7_500 }),
    debt({ id: "b", balance: 1_470_000, annualRate: 280_000, minimumPayment: 45_000 }),
  ], 52_500).avalanche;
  assert.equal(mixed.status, "paid");
  assert.equal(mixed.months, 245);
  assert.ok(mixed.negativeAmortizationMonths > 0);
});

test("H03 separates actual payments and outstanding balances from payoff totals", () => {
  const p = run([debt({ annualRate: 120_000 })], 500).avalanche;
  const month12 = p.ledger[11];
  assert.equal(p.status, "horizon");
  assert.equal(p.months, null);
  assert.equal(p.totalPayoffCost, null);
  assert.equal(p.totals?.principalPaid, zero);
  assert.equal(month12.totals.closing, units(106_341));
  assert.equal(p.ledger.slice(0, 12).reduce((a, x) => a + x.totals.interest, zero), units(12_341));
  assert.equal(p.ledger.slice(0, 12).reduce((a, x) => a + x.totals.ordinaryPaid, zero), units(6_000));
  assert.equal(p.negativeAmortizationMonths, MAX_MONTHS);
});

test("H05, H06, H07 reject malformed inputs and preserve locale, precision and absence", () => {
  for (const [input, locale] of [["125,50", "es"], ["125.50", "en"]] as const) assert.deepEqual(parseDebtMoney(input, locale, "EUR"), { value: 12_550, error: null });
  assert.deepEqual(parseDebtMoney("1,234.56", "en", "USD"), parseDebtMoney("1.234,56", "es", "EUR"));
  for (const s of ["-500", "1e3", "abc", "1,234.56"]) assert.ok(parseDebtMoney(s, "es", "EUR").error, s);
  assert.equal(parseDebtMoney("3.01", "en", "JPY").error, "precision");
  assert.equal(parseDebtMoney("   ", "es", "EUR").value, null);
  assert.equal(parseDebtMoney("0", "es", "EUR").value, 0);
  assert.equal(parseDebtMoney("90071992547409.91", "en", "EUR").value, Number.MAX_SAFE_INTEGER);
  assert.equal(parseDebtMoney("90071992547409.92", "en", "EUR").error, "range");
  assert.equal(parseDebtRate("1.2.3", "en").error, "format");
  assert.equal(parseDebtRate("1250", "en").error, "range");
  assert.deepEqual(parseDebtRate("12,4567", "es"), parseDebtRate("12.4567", "en"));
  assert.equal(parseDebtRate("12,4567", "es").value, 124_567);
  assert.equal(parseDebtMonth("0").error, "range");
  assert.equal(parseDebtMonth("2.5").error, "format");
  assert.equal(parseDebtMonth("601").value, 601);
  assert.equal(run([debt({ annualRate: null })], 10_000).avalanche.status, "data-missing");
  assert.equal(run([debt({ rateType: "unknown" })], 10_000).avalanche.status, "data-missing");
  assert.equal(run([debt()], 10_000).summary.sustainabilityStatus, "incomplete");
  assert.equal(run([debt()], 10_000).avalanche.months, 10);
  assert.equal(run([debt({ monthlyFee: null })], 10_000).avalanche.status, "data-missing");
  assert.equal(run([debt({ balance: 0, monthlyFee: null })], 10_000).avalanche.status, "no-debt");
});

test("H08 validates the engine boundary and one minor unit is not already paid", () => {
  assert.equal(run([debt({ balance: 1, minimumPayment: 30 })], 1).avalanche.months, 1);
  assert.equal(run([debt({ balance: 1, minimumPayment: 30 })], 1).avalanche.ledger[0].totals.minimumDue, BigInt(1));
  for (const balance of [NaN, Infinity, -1, 1.1, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(run([debt({ balance })], 1).avalanche.status, "invalid-input");
  }
  assert.equal(run([debt(), debt()], 1).avalanche.status, "invalid-input");
  assert.equal(run([debt({ balance: Number.MAX_SAFE_INTEGER, annualRate: MAX_ANNUAL_RATE })], 0).avalanche.status, "range-error");
  assert.equal(run([debt({ annualRate: MAX_ANNUAL_RATE + 1 })], 0).avalanche.status, "invalid-input");
  assert.equal(run([debt({ minimumIncludesFees: true, monthlyFee: 10, minimumPayment: 9 })], 0).avalanche.status, "invalid-input");
  const max = run([debt({ balance: Number.MAX_SAFE_INTEGER })], Number.MAX_SAFE_INTEGER).avalanche;
  assert.equal(max.endingBalance, zero);
  assert.equal(max.totals?.principalPaid, units(Number.MAX_SAFE_INTEGER));
});

test("H09, H10 and H11 reconcile household obligations independently of payoff", () => {
  const a = calculateDebtPlan(profile({ monthlyNetIncome: 160_000, fixedMonthlyExpenses: 110_000, availableDebtPayment: 30_000 }),
    [debt({ minimumPayment: 30_000 })]);
  assert.equal(a.summary.cashAfterDebtPlan, units(20_000));
  const b = calculateDebtPlan(profile({ emergencyFund: 300_000, fixedMonthlyExpenses: 100_000 }),
    [debt({ minimumPayment: 45_000, monthlyFee: 5_000 })]);
  assert.equal(b.summary.emergencyFundMonths, 2);
  assert.equal(calculateDebtPlan(profile({ emergencyFund: 0, fixedMonthlyExpenses: 100_000 }), [debt({ minimumPayment: 50_000 })]).summary.emergencyFundMonths, 0);
  assert.equal(calculateDebtPlan(profile({ emergencyFund: 300_000, fixedMonthlyExpenses: 100_000 }), [debt({ minimumPayment: null })]).summary.emergencyFundMonths, null);
  const plan = [debt({ balance: 250_000, minimumPayment: 80_000 })];
  const aProfile = profile({ monthlyNetIncome: 200_000, fixedMonthlyExpenses: 100_000, availableDebtPayment: 80_000 });
  const base = calculateDebtPlan(aProfile, plan);
  const over = calculateDebtPlan({ ...aProfile, availableDebtPayment: 120_000 }, plan);
  assert.equal(base.summary.cashAfterDebtPlan, units(20_000));
  assert.equal(over.summary.cashAfterDebtPlan, units(-20_000));
  assert.equal(over.summary.sustainabilityStatus, "deficit");
  assert.equal(over.avalanche.status, "paid");
  assert.equal(calculateDebtPlan({ ...aProfile, availableDebtPayment: 50_000 }, plan).summary.payoffStatus, "below-minimums");
  assert.equal(over.summary.payoffStatus, "extra");
});

test("H13, H14 and H15 keep payment priority, signed deltas and individual timing distinct", () => {
  const e = [
    debt({ id: "a", balance: 15_000, annualRate: 220_000, minimumPayment: 500 }),
    debt({ id: "b", balance: 10_000, annualRate: 90_000, minimumPayment: 500, monthlyFee: 1_500 }),
  ];
  const ordered = run(e, 7_500);
  assert.equal(ordered.avalanche.ledger[0].priorityApplied[0], "a");
  assert.equal(ordered.snowball.ledger[0].priorityApplied[0], "b");
  const baseline = run([debt({ annualRate: 120_000 })], 15_000).avalanche;
  const slower = run([debt({ annualRate: 120_000 })], 10_000).avalanche;
  const difference = compareDebtScenarios(baseline, slower);
  assert.ok(difference.costDifference! > zero);
  assert.ok(difference.monthDifference! > 0);
  assert.equal(compareDebtScenarios(slower, baseline).costDifference, -difference.costDifference!);
  assert.equal(compareDebtScenarios(slower, baseline).monthDifference, -difference.monthDifference!);
  assert.equal(compareDebtScenarios(baseline, run([debt()], 0).avalanche).costDifference, null);

  const equal = run([debt({ id: "b", balance: 20_000, minimumPayment: 1_000 }), debt({ balance: 10_000, minimumPayment: 1_000 })], 10_000);
  assert.deepEqual(compareDebtScenarios(equal.avalanche, equal.snowball), { costDifference: zero, monthDifference: 0 });
  assert.notDeepEqual(equal.avalanche.liquidations, equal.snowball.liquidations);
  assert.ok(equal.snowball.liquidations[0].month < equal.avalanche.liquidations[0].month);
});

test("H16 traces same-month, excess, after-payoff and beyond-horizon lump sums", () => {
  const e = (id: string, monthNumber: number, amount: number) => ({ id, monthNumber, amount });
  const p = run([debt({ balance: 12_000, minimumPayment: 1_000 })], 2_000, [
    e("first", 1, 3_000), e("second", 1, 10_000), e("later", 13, 2_000), e("outside", 601, 2_000),
  ]).avalanche;
  assert.equal(p.months, 1);
  assert.deepEqual(p.contributions.map(item => [item.applied, item.unused, item.outsideHorizon]), [
    [units(3_000), zero, zero], [units(7_000), units(3_000), zero], [zero, units(2_000), zero], [zero, zero, units(2_000)],
  ]);
  assert.equal(p.ledger[0].totals.extraPaid, units(10_000));
  assert.equal(run([debt()], 0, [e("t", 600, 100_000)]).avalanche.months, 600);
  assert.equal(run([debt()], 10_000, [e("x", 3, -1)]).avalanche.status, "invalid-input");
});

test("H17 and H18 separate nominal and effective rates from reported annualized costs", () => {
  const nominal = run([debt({ annualRate: 120_000, rateType: "nominal" })], 10_000);
  const effective = run([debt({ annualRate: 120_000, rateType: "effective" })], 10_000);
  assert.equal(nominal.avalanche.ledger[0].totals.interest, units(1_000));
  assert.equal(effective.avalanche.ledger[0].totals.interest, units(949));
  const annualized = run([debt({ annualRate: 120_000, monthlyFee: 1_000 })], 10_000).references[0];
  assert.equal(annualized.annualizedInterestAndFees, 24);
  assert.equal(annualized.annualRatePercent, 12);
});

function reconcile(p: PayoffPlan) {
  let prior = p.initialPrincipal;
  let cash = zero;
  let accrued = zero;
  let principalPaid = zero;
  const released = new Set<string>();
  for (const period of p.ledger) {
    const t = period.totals;
    assert.equal(prior, t.opening);
    assert.equal(t.ordinaryPaid + period.ordinaryUnused, period.ordinaryAvailable);
    assert.equal(t.extraPaid + period.extraUnused, period.extraAvailable);
    let rowTotal = zero;
    for (const debt of period.debts) {
      assert.equal(released.has(debt.id), false);
      assert.equal(debt.opening + debt.interest + debt.fees, debt.ordinaryPaid + debt.extraPaid + debt.closing);
      assert.equal(debt.ordinaryPaid + debt.extraPaid, debt.principalPaid + debt.interestPaid + debt.feesPaid);
      assert.equal(debt.closing, debt.closingPrincipal + debt.closingInterest + debt.closingFees);
      assert.ok(debt.closing >= zero && debt.closingPrincipal >= zero && debt.closingInterest >= zero && debt.closingFees >= zero);
      assert.ok(debt.minimumDue >= debt.minimumShortfall && debt.minimumShortfall >= zero);
      assert.equal(debt.paidOff, debt.closing === zero);
      if (debt.paidOff) released.add(debt.id);
      rowTotal += debt.closing;
    }
    assert.equal(rowTotal, t.closing);
    cash += t.ordinaryPaid + t.extraPaid;
    accrued += t.interest + t.fees;
    principalPaid += t.principalPaid;
    prior = t.closing;
  }
  for (const event of p.contributions) assert.equal(event.planned, event.applied + event.unused + event.outsideHorizon + event.unsimulated);
  assert.equal(prior, p.endingBalance);
  assert.equal(p.costAccrued, accrued);
  assert.equal(p.totals?.principalPaid, principalPaid);
  assert.equal(p.totals!.ordinaryPaid + p.totals!.extraPaid, cash);
  assert.equal(p.initialPrincipal! + accrued - cash, p.endingBalance);
  assert.equal(p.months !== null, p.endingBalance === zero);
}

test("H04 across 2,800 reproducible configurations, both strategies conserve money and stop fees after payoff", () => {
  let seed = 0x5acc2026;
  const rng = (max: number) => {
    seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
    return seed % max;
  };
  let simulatedMonths = 0;
  let signedCostIncreases = 0;
  for (let i = 0; i < 2_800; i++) {
    const sample = Array.from({ length: 1 + rng(5) }, (_, j) => debt({
      id: `d-${j}`, balance: 5_000 + rng(950_001), minimumPayment: 500 + rng(8_000),
      annualRate: rng(300_001), rateType: rng(5) === 0 ? "effective" : "nominal",
      monthlyFee: i < 1_800 ? rng(2_001) : 0,
    }));
    const recurring = sample.reduce((s, d) => s + d.minimumPayment! + d.monthlyFee!, 0);
    const budget = i % 9 === 0 ? Math.floor(recurring / 2) : recurring + rng(150_000);
    const extras = Array.from({length: rng(4)}, (_, j) => ({ id: `e-${j}`, monthNumber: 1 + rng(650), amount: rng(100_000) }));
    const result = run(sample, budget, extras);
    for (const p of [result.avalanche, result.snowball]) {
      assert.ok(["paid", "horizon", "range-error"].includes(p.status));
      reconcile(p);
      simulatedMonths += p.ledger.length;
    }
    if ((compareDebtScenarios(result.avalanche, result.snowball).costDifference ?? zero) > zero) signedCostIncreases++;
    if (i < 40) assert.deepEqual(run(sample, budget, extras), result);
    if (i >= 1_800 && sample.length === 1) {
      const high = run(sample, budget + 10_000, extras).avalanche;
      assert.ok(result.avalanche.months === null || (high.months !== null && high.months <= result.avalanche.months));
    }
  }
  assert.ok(simulatedMonths > 10_000);
  assert.ok(signedCostIncreases > 0);
  console.log(`Generated seed 0x5acc2026: 2,800 configurations, 5,600 schedules, ${simulatedMonths} reconciled months.`);
});
