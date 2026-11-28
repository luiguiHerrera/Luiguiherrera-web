"use client";

import { useState } from "react";
import { compareDebtScenarios } from "@/lib/debt/calculate-debt-plan";
import { compareMinimumCoverage } from "@/lib/debt/interpret-debt-plan";
import type { DebtCashFlowView, DebtCashMovement, DebtPlanAssessment, DebtPlanResult, DebtSummary, PayoffMethod, PayoffPlan } from "@/lib/debt/types";
import type { BudgetLocale } from "@/lib/personal-finance/budget/types";
import { Metric, fieldClass } from "./DebtFields";
import { debtCopy } from "./debt-copy";
import { debtVisual } from "./debt-visual-copy";
import styles from "./DebtEditorial.module.css";

type Money = (value: bigint | number | null) => string;
export type DebtNames = Record<string, string>;

export function formatDebtNumber(value: number | null, locale: BudgetLocale, style: "decimal" | "percent" = "decimal") {
  return value === null ? "—" : new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", { maximumFractionDigits: 2, style }).format(value);
}

function CashFlow({ flow, locale, money }: { flow: DebtCashFlowView; locale: BudgetLocale; money: Money }) {
  const c = debtCopy[locale];
  const lines = [
    [c.scenarioPayment, flow.ordinaryBudget],
    [c.ordinary, flow.ordinaryApplied],
    [c.ordinaryUnused, flow.ordinaryUnused],
    [c.reservedMargin, flow.marginReserved],
    [c.effectiveOrdinaryMargin, flow.marginAfterOrdinary],
    [c.extraPaid, flow.extraordinaryApplied],
  ] as const;
  return (
    <div className="mt-3 min-w-0 border-y border-line py-3">
      <h4 className="text-sm font-semibold text-ink">{c.cashFlowPeriod} {flow.month}</h4>
      <dl className="mt-2 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
        {lines.map(([label, amount]) => <div key={label} className="min-w-0">
          <dt className="text-muted">{label}</dt><dd className="break-words font-semibold text-ink">{money(amount)}</dd>
        </div>)}
      </dl>
      <p className="mt-2 text-xs leading-5 text-muted">{c.effectiveMarginNote}</p>
    </div>
  );
}

function HouseholdReading({ summary, locale, money }: { summary: DebtSummary; locale: BudgetLocale; money: Money }) {
  const c = debtCopy[locale];
  const marginUpperBound = summary.marginAfterMinimumsUpperBound ?? BigInt(0);
  const partialDeficit = summary.marginAfterMinimums === null && marginUpperBound < 0;
  const capacity = {
    sufficient: c.capacitySufficient, insufficient: c.capacityInsufficient, unknown: c.capacityUnknown,
  }[summary.economicCapacity];
  const budget = {
    compatible: c.budgetCompatible, deficit: c.budgetDeficit, unknown: c.budgetUnknown,
  }[summary.reservedMarginStatus];
  const reserve = {
    unknown: c.reserveUnknown, limited: c.reserveLimited, "at-reference": c.reserveAtReference,
  }[summary.emergencyReserveStatus];
  const protectionMargin = {
    comfortable: c.minimumMarginComfortable,
    tight: c.minimumMarginTight,
    deficit: c.minimumMarginDeficit,
    unknown: c.minimumMarginUnknown,
  }[summary.minimumMarginStatus];
  return (
    <dl className="grid gap-3 break-words text-sm leading-6 text-muted">
      <div>
        <dt className="font-semibold text-ink">{c.economicCapacity}</dt>
        <dd>{partialDeficit ? <strong>{c.minimumCapacityShortfall} {money(-marginUpperBound)}.</strong> : capacity}</dd>
        {partialDeficit && summary.monthlyCashAfterExpenses === null ? <dd className="text-xs">{c.unreportedExpensesNote}</dd> : null}
        <dd className="text-xs">{c.capacityBasis}</dd>
      </div>
      <div className={summary.reservedMarginStatus === "deficit" ? "border-l-2 border-brass/60 pl-3" : undefined}>
        <dt className="font-semibold text-ink">{c.reservedMargin}</dt>
        <dd>{budget} <strong>{money(summary.cashAfterDebtPlan)}</strong></dd>
      </div>
      <div>
        <dt className="font-semibold text-ink">{c.protection}</dt>
        <dd>{reserve} {summary.emergencyFundMonths === null ? null : (
          <span>{c.coverage} · <strong>{formatDebtNumber(summary.emergencyFundMonths, locale)}</strong>.</span>
        )}</dd>
        <dd>{partialDeficit ? c.maximumMinimumMargin : c.marginAfterMinimums} · <strong>{
          money(partialDeficit ? marginUpperBound : summary.marginAfterMinimums)
        }</strong>. {protectionMargin}</dd>
      </div>
      {summary.minimumBasis === "declared" ? <div><dt className="sr-only">{c.minimumsSection}</dt><dd>{c.minimumBasisDeclared}</dd></div> : null}
    </dl>
  );
}

export function PlanOutcome({ plan, assessment, locale, money }: {
  plan: PayoffPlan; assessment: DebtPlanAssessment; locale: BudgetLocale; money: Money;
}) {
  const c = debtCopy[locale];
  const coverageLabel = {
    covered: c.coverageCovered, shortfalls: c.coverageShortfalls, unknown: c.coverageUnknown, none: c.coverageNone,
  }[assessment.coverage];
  return (
    <div className={`mt-3 grid gap-2 break-words border-l-2 pl-3 text-sm leading-6 text-muted ${assessment.closingShortfallMonths ? "border-brass/70" : "border-line"}`}>
      <p className="font-semibold text-ink">{assessment.hypotheticalPayoff ? c.hypotheticalPayoff : `${c.mathPayoff} · ${c[plan.status]}`}{
        plan.status === "paid" ? ` ${c.payoffTime} ${plan.months}.` : ""
      }</p>
      <p><span className="font-semibold text-ink">{c.minimumsSection}. </span>{coverageLabel} {assessment.coverageIsPartial ? c.coveragePartial : null}</p>
      {assessment.ordinaryShortfallMonths ? (
        <p>{c.ordinaryShortfallMonths} · <strong>{assessment.ordinaryShortfallMonths}</strong></p>
      ) : null}
      {assessment.closingShortfallMonths ? (
        <div>
          <p>{c.belowMonths} · <strong>{assessment.closingShortfallMonths}</strong>. {c.unfilledMinimumTotal} · <strong>{money(assessment.closingShortfallTotal)}</strong>.</p>
          <p className="text-xs">{c.unfilledMinimumNote}</p>
        </div>
      ) : null}
      {assessment.extraAppliedToMinimums > 0 ? (
        <p>{c.extraMinimumTotal} · <strong>{money(assessment.extraAppliedToMinimums)}</strong>. {c.monthsMadeUpByExtra} · <strong>{assessment.monthsFullyMadeUpByExtra}</strong>.</p>
      ) : null}
      {assessment.extraAppliedTotal > 0 ? <p>{c.extraConditional}</p> : null}
      {assessment.closingShortfallMonths ? <p>{c.contractLimit}</p> : null}
    </div>
  );
}

export function ScenarioReading({ result, method, locale, money, period }: {
  result: DebtPlanResult; method: PayoffMethod; locale: BudgetLocale; money: Money; period?: DebtCashFlowView;
}) {
  const c = debtCopy[locale];
  const assessment = result.assessments[method];
  const { summary } = result;
  const minStatus = summary.payoffStatus;
  const budgetGapUpperBound = summary.minimumPaymentGapUpperBound ?? BigInt(0);
  const partialBudgetDeficit = summary.minimumPaymentGap === null && budgetGapUpperBound < 0;
  const partialCapacityDeficit = summary.marginAfterMinimums === null && (summary.marginAfterMinimumsUpperBound ?? 0) < 0;
  return (
    <>
      <HouseholdReading summary={summary} locale={locale} money={money} />
      <p className="mt-2 break-words text-sm leading-6 text-muted">
        {c.ordinaryMinimumsInitial} · {partialBudgetDeficit
          ? <strong>{c.minimumBudgetShortfall} {money(-budgetGapUpperBound)}.</strong>
          : <>{minStatus === "incomplete" ? c.unknown : c[minStatus]} · {money(summary.minimumPaymentGap)}</>}
      </p>
      {partialBudgetDeficit || partialCapacityDeficit ? (
        <p className="mt-1 text-xs leading-5 text-muted">{c.partialShortfallNote}</p>
      ) : null}
      <CashFlow flow={period ?? assessment.initialCashFlow} locale={locale} money={money} />
      <PlanOutcome plan={result[method]} assessment={assessment} locale={locale} money={money} />
    </>
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

function Calendar({ plan, assessment, locale, names, money }: {
  plan: PayoffPlan; assessment: DebtPlanAssessment; locale: BudgetLocale; names: DebtNames; money: Money;
}) {
  const [requested, setRequested] = useState(1);
  const c = debtCopy[locale];
  if (plan.ledger.length === 0) return null;
  const index = Math.min(requested, plan.ledger.length) - 1;
  const period = plan.ledger[index];
  const observed = assessment.periods[index];
  const rows = [
    { id: "summary", name: c.total, values: ledgerAmounts(c, period.totals), paid: false },
    ...period.debts.map(row => ({ id: row.id, name: names[row.id], values: ledgerAmounts(c, row), paid: row.paidOff })),
  ];
  return (
    <details className={styles.fold}>
      <summary>{c.calendar}</summary>
      <label className="mt-3 grid max-w-36 gap-1 text-sm">
        {c.month}
        <select className={fieldClass} onChange={e => setRequested(Number(e.target.value))} value={period.month}>
          {plan.ledger.map(m => <option key={m.month} value={m.month}>{m.month}</option>)}
        </select>
      </label>
      <CashFlow flow={observed} locale={locale} money={money} />
      <dl className="mt-3 grid gap-1 break-words text-sm text-muted">
        <div><dt className="inline font-semibold">{c.ordinaryShortfall} · </dt><dd className="inline">{money(observed.ordinaryShortfall)}</dd></div>
        <div><dt className="inline font-semibold">{c.extraCoveredMinimum} · </dt><dd className="inline">{money(observed.coveredByExtra)}</dd></div>
        <div><dt className="inline font-semibold">{c.closingShortfall} · </dt><dd className="inline">{money(observed.closingShortfall)}</dd></div>
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

export function PlanCard({ plan, assessment, locale, names, money }: {
  plan: PayoffPlan; assessment: DebtPlanAssessment; locale: BudgetLocale; names: DebtNames; money: Money;
}) {
  const c = debtCopy[locale];
  const v = debtVisual[locale];
  const t = plan.totals;
  const firstMonth = plan.liquidations[0]?.month;
  const firstDebts = plan.liquidations.filter(item => item.month === firstMonth).map(item => names[item.id]).join(", ");
  const metrics = [
    [c.initial, plan.initialPrincipal],
    [c.principal, t?.principalPaid ?? null],
    [c.remaining, plan.endingBalance],
    [c.reduction, plan.netBalanceReduction],
    [c.interest, t?.interest ?? null],
    [c.paidInterest, t?.interestPaid ?? null],
    [c.fees, t?.fees ?? null],
    [c.paidFees, t?.feesPaid ?? null],
    [c.costAccrued, plan.costAccrued],
    [c.totalCost, plan.totalPayoffCost],
  ] as const;
  return (
    <article className={styles.figure}>
      <h3 className={styles.figureTitle}>{c[plan.method]}</h3>
      <p className={styles.figureSub}>{plan.method === "avalanche" ? c.avalancheBody : c.snowballBody}</p>
      <div className={styles.metrics}>
        <Metric label={c.payoffTime} value={plan.status === "paid" ? String(plan.months) : "—"} />
        <Metric label={plan.totalPayoffCost === null ? c.costAccrued : c.totalCost} value={money(plan.totalPayoffCost ?? plan.costAccrued)} />
        <Metric label={c.payments} value={money(t ? t.ordinaryPaid + t.extraPaid : null)} />
        <Metric label={v.firstDebt} value={firstDebts || "—"} helper={firstMonth ? `${c.month} ${firstMonth}` : undefined} />
      </div>
      <PlanOutcome plan={plan} assessment={assessment} locale={locale} money={money} />
      {plan.ledger.length ? (
        <p className={plan.negativeAmortizationMonths ? styles.warning : styles.figureSub}>
          {c.negativeMonths} · {plan.negativeAmortizationMonths}
        </p>
      ) : null}
      <details className={styles.fold}>
        <summary>{v.detail}</summary>
        <dl className="mt-2 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
          {metrics.map(([label, value]) => <div key={label} className="border-b border-line py-2">
            <dt className="text-muted">{label}</dt><dd className="font-semibold">{money(value)}</dd>
          </div>)}
        </dl>
        {plan.ledger.length > 0 ? (
          <div className="mt-3 grid gap-2 text-sm text-muted">
            <p>{c.initialOrder} · {plan.initialPriority.map(id => names[id]).join(" → ")}</p>
            <p className="font-semibold text-ink">{c.individual}</p>
            {plan.liquidations.length === 0 ? <p>{c.none}</p> : (
              <ul className="grid gap-1">
                {plan.liquidations.map(item => <li key={item.id}>{names[item.id]} · {c.month} {item.month}</li>)}
              </ul>
            )}
          </div>
        ) : null}
      </details>
      <Calendar plan={plan} assessment={assessment} locale={locale} names={names} money={money} />
    </article>
  );
}

const signed = (value: bigint | number | null, format: (n: bigint | number | null) => string) => value !== null && value > 0 ? `+${format(value)}` : format(value);

export function ScenarioDifference({ reference, alternative, referenceAssessment, alternativeAssessment, locale, money }: {
  reference: PayoffPlan;
  alternative: PayoffPlan;
  referenceAssessment: DebtPlanAssessment;
  alternativeAssessment: DebtPlanAssessment;
  locale: BudgetLocale;
  money: Money;
}) {
  const c = debtCopy[locale];
  const difference = compareDebtScenarios(reference, alternative);
  const months = signed(difference.monthDifference, n => formatDebtNumber(n === null ? null : Number(n), locale));
  const cost = signed(difference.costDifference, money);
  const coverage = compareMinimumCoverage(referenceAssessment, alternativeAssessment);
  const note = coverage === "different" ? c.comparisonDifferent
    : coverage === "matched-with-shortfalls" ? c.comparisonMatchedShort
    : coverage === "unknown" ? c.comparisonUnknown : null;
  return (
    <>
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
    {note ? <p className="mt-2 border-l-2 border-brass/60 pl-3 text-sm leading-6 text-muted">{note}</p> : null}
    </>
  );
}

export function MethodDifference({ result, locale, money }: { result: DebtPlanResult; locale: BudgetLocale; money: Money }) {
  const c = debtCopy[locale];
  const diff = compareDebtScenarios(result.avalanche, result.snowball);
  return (
    <div className="mt-4 border border-line bg-panelSoft p-4">
      <p className="text-sm font-semibold text-ink">{c.compareMethods}</p>
      <ScenarioDifference reference={result.avalanche} alternative={result.snowball}
        referenceAssessment={result.assessments.avalanche} alternativeAssessment={result.assessments.snowball}
        locale={locale} money={money} />
      {diff.costDifference === BigInt(0) && diff.monthDifference === 0 ? <p className="mt-3 text-sm text-muted">{c.sameTotals}</p> : null}
    </div>
  );
}
