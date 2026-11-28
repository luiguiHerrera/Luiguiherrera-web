"use client";

import { useState } from "react";
import { compareDebtScenarios } from "@/lib/debt/calculate-debt-plan";
import type { DebtCashMovement, DebtPlanResult, DebtSummary, PayoffPlan } from "@/lib/debt/types";
import type { BudgetLocale } from "@/lib/personal-finance/budget/types";
import { Metric, fieldClass } from "./DebtFields";
import { debtCopy } from "./debt-copy";

type Money = (value: bigint | number | null) => string;
export type DebtNames = Record<string, string>;

export function formatDebtNumber(value: number | null, locale: BudgetLocale, style: "decimal" | "percent" = "decimal") {
  return value === null ? "—" : new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", { maximumFractionDigits: 2, style }).format(value);
}

export function ScenarioFlags({ summary, locale }: { summary: DebtSummary; locale: BudgetLocale }) {
  const c = debtCopy[locale];
  return (
    <dl className="mt-3 grid gap-2 text-sm leading-6 text-muted">
      <div><dt className="inline font-semibold text-ink">{c.flow}. </dt><dd className="inline">{c[summary.sustainabilityStatus]}</dd></div>
      <div><dt className="inline font-semibold text-ink">{c.contracts}. </dt><dd className="inline">{summary.payoffStatus === "incomplete" ? c.unknown : c[summary.payoffStatus]}</dd></div>
    </dl>
  );
}

function ledgerAmounts(labels: typeof debtCopy[BudgetLocale], row: Omit<DebtCashMovement, "id" | "paidOff">) {
  return [
    [labels.opening, row.opening], [labels.interest, row.interest], [labels.fees, row.fees],
    [labels.due, row.minimumDue], [labels.shortfall, row.minimumShortfall], [labels.ordinary, row.ordinaryPaid],
    [labels.extraPaid, row.extraPaid], [labels.paidInterest, row.interestPaid], [labels.paidFees, row.feesPaid],
    [labels.principal, row.principalPaid], [labels.closingPrincipal, row.closingPrincipal],
    [labels.closingInterest, row.closingInterest], [labels.closingFees, row.closingFees], [labels.closing, row.closing],
  ] as const;
}

function Calendar({ plan, locale, names, money }: { plan: PayoffPlan; locale: BudgetLocale; names: DebtNames; money: Money }) {
  const [requested, setRequested] = useState(1);
  const c = debtCopy[locale];
  if (plan.ledger.length === 0) return null;
  const period = plan.ledger[Math.min(requested, plan.ledger.length) - 1];
  const rows = [
    { id: "summary", name: c.total, values: ledgerAmounts(c, period.totals), paid: false },
    ...period.debts.map(row => ({ id: row.id, name: names[row.id], values: ledgerAmounts(c, row), paid: row.paidOff })),
  ];
  return (
    <details className="mt-4 border border-line bg-panelSoft p-3">
      <summary className="cursor-pointer font-semibold text-petrol">{c.calendar}</summary>
      <label className="mt-3 grid max-w-36 gap-1 text-sm">
        {c.month}
        <select className={fieldClass} onChange={e => setRequested(Number(e.target.value))} value={period.month}>
          {plan.ledger.map(m => <option key={m.month} value={m.month}>{m.month}</option>)}
        </select>
      </label>
      <dl className="mt-3 grid gap-1 text-sm text-muted">
        <div><dt className="inline font-semibold">{c.ordinaryUnused} · </dt><dd className="inline">{money(period.ordinaryUnused)}</dd></div>
        <div><dt className="inline font-semibold">{c.extraUnused} · </dt><dd className="inline">{money(period.extraUnused)}</dd></div>
        <div><dt className="inline font-semibold">{c.priorityApplied} · </dt><dd className="inline">{period.priorityApplied.map(id => names[id]).join(" → ") || "—"}</dd></div>
      </dl>
      <div className="mt-3 grid gap-3">
        {rows.map((row, index) => (
          <details key={row.id} className="min-w-0 border border-line bg-white/70 p-2">
            <summary className="cursor-pointer break-words text-sm font-semibold text-ink">
              {row.name}{row.paid ? ` · ${c.paid}` : ""}
            </summary>
            <dl className="mt-2 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2" aria-label={index === 0 ? c.total : row.name}>
              {row.values.map(([name, value]) => <div key={name} className="min-w-0">
                <dt className="text-muted">{name}</dt><dd className="break-words font-semibold text-ink">{money(value)}</dd>
              </div>)}
            </dl>
          </details>
        ))}
      </div>
    </details>
  );
}

export function PlanCard({ plan, locale, names, money }: { plan: PayoffPlan; locale: BudgetLocale; names: DebtNames; money: Money }) {
  const c = debtCopy[locale];
  const t = plan.totals;
  return (
    <article className="min-w-0 border border-line bg-white/75 p-4">
      <h3 className="text-xl font-semibold leading-tight text-ink">{c[plan.method]}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{plan.method === "avalanche" ? c.avalancheBody : c.snowballBody}</p>
      <p className="mt-3 border-l-2 border-brass/60 pl-3 text-sm font-semibold text-ink">{c[plan.status]}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Metric label={c.payoffTime} value={plan.status === "paid" ? String(plan.months) : "—"} />
        <Metric label={c.initial} value={money(plan.initialPrincipal)} />
        <Metric label={c.payments} value={money(t ? t.ordinaryPaid + t.extraPaid : null)} />
        <Metric label={c.principal} value={money(t?.principalPaid ?? null)} />
        <Metric label={c.remaining} value={money(plan.endingBalance)} />
        <Metric label={c.reduction} value={money(plan.netBalanceReduction)} />
        <Metric label={c.interest} value={money(t?.interest ?? null)} />
        <Metric label={c.paidInterest} value={money(t?.interestPaid ?? null)} />
        <Metric label={c.fees} value={money(t?.fees ?? null)} />
        <Metric label={c.paidFees} value={money(t?.feesPaid ?? null)} />
        <Metric label={c.costAccrued} value={money(plan.costAccrued)} />
        <Metric label={c.totalCost} value={money(plan.totalPayoffCost)} />
      </div>
      {plan.ledger.length > 0 ? (
        <div className="mt-4 grid gap-2 border-l border-line pl-3 text-sm text-muted">
          <p>{c.belowMonths} · {plan.monthsBelowMinimum}</p>
          <p>{c.negativeMonths} · {plan.negativeAmortizationMonths}</p>
          <p>{c.initialOrder} · {plan.initialPriority.map(id => names[id]).join(" → ")}</p>
          <p className="font-semibold text-ink">{c.individual}</p>
          {plan.liquidations.length === 0 ? <p>{c.none}</p> : (
            <ul className="grid gap-1">
              {plan.liquidations.map(item => <li key={item.id}>{names[item.id]} · {c.month} {item.month}</li>)}
            </ul>
          )}
        </div>
      ) : null}
      <Calendar plan={plan} locale={locale} names={names} money={money} />
    </article>
  );
}

const signed = (value: bigint | number | null, format: (n: bigint | number | null) => string) => value !== null && value > 0 ? `+${format(value)}` : format(value);

export function ScenarioDifference({ reference, alternative, locale, money }: {
  reference: PayoffPlan;
  alternative: PayoffPlan;
  locale: BudgetLocale;
  money: Money;
}) {
  const c = debtCopy[locale];
  const difference = compareDebtScenarios(reference, alternative);
  const months = signed(difference.monthDifference, n => formatDebtNumber(n === null ? null : Number(n), locale));
  const cost = signed(difference.costDifference, money);
  return (
    <dl className="mt-3 grid gap-1 text-sm leading-6 text-muted">
      <div><dt className="inline">{c.costChange} · </dt><dd className="inline font-semibold text-ink">{cost} · {
        difference.costDifference === null ? c.notComparable :
          difference.costDifference > 0 ? c.costIncrease : difference.costDifference < 0 ? c.costSaving : c.noDifference
      }</dd></div>
      <div><dt className="inline">{c.monthChange} · </dt><dd className="inline font-semibold text-ink">{months} · {
        difference.monthDifference === null ? c.notComparable :
          difference.monthDifference > 0 ? c.timeIncrease : difference.monthDifference < 0 ? c.timeSaving : c.noDifference
      }</dd></div>
    </dl>
  );
}

export function MethodDifference({ result, locale, money }: { result: DebtPlanResult; locale: BudgetLocale; money: Money }) {
  const c = debtCopy[locale];
  const diff = compareDebtScenarios(result.avalanche, result.snowball);
  return (
    <div className="mt-4 border border-line bg-panelSoft p-4">
      <p className="text-sm font-semibold text-ink">{c.compareMethods}</p>
      <ScenarioDifference reference={result.avalanche} alternative={result.snowball} locale={locale} money={money} />
      {diff.costDifference === BigInt(0) && diff.monthDifference === 0 ? <p className="mt-3 text-sm text-muted">{c.sameTotals}</p> : null}
    </div>
  );
}
