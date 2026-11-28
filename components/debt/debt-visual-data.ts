import type { DebtCashFlowView, DebtPeriod, DebtPeriodView, PayoffPlan } from "../../lib/debt/types.ts";

const zero = BigInt(0);

export function plotRatio(value: bigint, scale: bigint) {
  return scale === zero ? 0 : Number(value * BigInt(1_000_000) / scale) / 1_000_000;
}

export function flowBreakdown(
  expenses: bigint | null,
  flow: DebtCashFlowView,
  period: DebtPeriod | undefined,
  observed: DebtPeriodView | undefined,
  noDebt: boolean,
) {
  const due = period?.totals.minimumDue ?? (noDebt ? zero : null);
  const ordinaryGap = observed?.ordinaryShortfall ?? (due === zero ? zero : null);
  const minimum = due === null || ordinaryGap === null ? null : due - ordinaryGap;
  const additional = flow.ordinaryApplied === null || minimum === null ? null : flow.ordinaryApplied - minimum;
  const margin = flow.marginAfterOrdinary;
  return {
    parts: [expenses, minimum, additional, margin === null ? null : margin > zero ? margin : zero],
    due,
    ordinaryGap,
    deficit: margin !== null && margin < zero ? -margin : null,
  };
}

export function balancePoints(plan: PayoffPlan) {
  if (plan.initialPrincipal === null || (plan.ledger.length === 0 && plan.status !== "no-debt")) return [];
  return [{ month: 0, value: plan.initialPrincipal }, ...plan.ledger.map(row => ({ month: row.month, value: row.totals.closing }))];
}

export function observedBalance(plan: PayoffPlan, month: number) {
  if (month === 0) return balancePointsAvailable(plan) ? plan.initialPrincipal : null;
  return plan.ledger[month - 1]?.totals.closing ?? (settled(plan) ? zero : null);
}

function balancePointsAvailable(plan: PayoffPlan) {
  return plan.ledger.length > 0 || plan.status === "no-debt";
}

export function settled(plan: PayoffPlan) {
  return plan.status === "paid" || plan.status === "no-debt";
}

export function horizon(plan: PayoffPlan) {
  return plan.ledger.at(-1)?.month ?? 0;
}

export function differingCostHorizons(plans: PayoffPlan[]) {
  const observed = plans.filter(plan => plan.costAccrued !== null);
  return observed.some(plan => !settled(plan)) && new Set(observed.map(horizon)).size > 1;
}
