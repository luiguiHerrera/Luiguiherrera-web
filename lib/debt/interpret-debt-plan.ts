import type { DebtPeriod, DebtPeriodView, DebtPlanAssessment, DebtSummary, PayoffPlan } from "./types.ts";

const zero = BigInt(0);

function readPeriod(period: DebtPeriod, summary: DebtSummary): DebtPeriodView {
  let ordinaryShortfall = zero;
  const closingShortfalls: DebtPeriodView["closingShortfalls"] = [];
  for (const row of period.debts) {
    if (row.ordinaryPaid < row.minimumDue) ordinaryShortfall += row.minimumDue - row.ordinaryPaid;
    if (row.minimumShortfall > zero) closingShortfalls.push({ id: row.id, amount: row.minimumShortfall });
  }
  const closingShortfall = period.totals.minimumShortfall;
  const cashBeforeDebt = summary.monthlyCashAfterExpenses;
  return {
    month: period.month,
    ordinaryBudget: period.ordinaryAvailable,
    ordinaryApplied: period.totals.ordinaryPaid,
    ordinaryUnused: period.ordinaryUnused,
    extraordinaryApplied: period.totals.extraPaid,
    marginReserved: cashBeforeDebt === null ? null : cashBeforeDebt - period.ordinaryAvailable,
    marginAfterOrdinary: cashBeforeDebt === null ? null : cashBeforeDebt - period.totals.ordinaryPaid,
    ordinaryShortfall, closingShortfall, closingShortfalls,
    coveredByExtra: ordinaryShortfall - closingShortfall,
  };
}

export function assessDebtPlan(plan: PayoffPlan, summary: DebtSummary): DebtPlanAssessment {
  const periods = plan.ledger.map(period => readPeriod(period, summary));
  let ordinaryShortfallMonths = 0;
  let monthsFullyMadeUpByExtra = 0;
  let closingShortfallTotal = zero;
  let extraAppliedToMinimums = zero;
  for (const period of periods) {
    if (period.ordinaryShortfall > zero) {
      ordinaryShortfallMonths += 1;
      if (period.closingShortfall === zero) monthsFullyMadeUpByExtra += 1;
    }
    closingShortfallTotal += period.closingShortfall;
    extraAppliedToMinimums += period.coveredByExtra;
  }

  const noDebt = summary.totalDebt === zero;
  return {
    initialCashFlow: periods[0] ?? {
      month: 1,
      ordinaryBudget: summary.ordinaryBudget,
      ordinaryApplied: noDebt ? zero : null,
      ordinaryUnused: noDebt ? summary.ordinaryBudget : null,
      extraordinaryApplied: noDebt ? zero : null,
      marginReserved: summary.cashAfterDebtPlan,
      marginAfterOrdinary: noDebt ? summary.monthlyCashAfterExpenses : null,
    },
    periods,
    coverage: periods.length ? closingShortfallTotal > zero ? "shortfalls" : "covered" : noDebt ? "none" : "unknown",
    coverageIsPartial: plan.status === "range-error" && periods.length > 0,
    ordinaryShortfallMonths, monthsFullyMadeUpByExtra,
    closingShortfallMonths: plan.monthsBelowMinimum,
    closingShortfallTotal, extraAppliedToMinimums,
    extraAppliedTotal: plan.totals?.extraPaid ?? zero,
    hypotheticalPayoff: plan.status === "paid" && plan.monthsBelowMinimum > 0,
  };
}

export function compareMinimumCoverage(reference: DebtPlanAssessment, alternative: DebtPlanAssessment) {
  if (reference.coverage === "unknown" || alternative.coverage === "unknown"
    || reference.coverageIsPartial || alternative.coverageIsPartial) return "unknown";
  const closingGapsByDebt = (assessment: DebtPlanAssessment) => assessment.periods
    .filter(period => period.closingShortfall > zero)
    .map(period => [period.month, period.closingShortfalls.map(({ id, amount }) => [id, amount.toString()])]);
  if (JSON.stringify(closingGapsByDebt(reference)) !== JSON.stringify(closingGapsByDebt(alternative))) return "different";
  if (reference.closingShortfallMonths || alternative.closingShortfallMonths) return "matched-with-shortfalls";
  return "matched";
}
