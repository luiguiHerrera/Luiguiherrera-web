import { BudgetAllocationComparison } from "@/components/budget/BudgetAllocationComparison";
import { budgetTargetCopy } from "@/components/budget/budget-target-copy";
import {
  allocationCategories,
  type BudgetTargetSnapshot,
} from "@/lib/personal-finance/budget/target-types";
import type {
  BudgetCurrency,
  BudgetLocale,
} from "@/lib/personal-finance/budget/types";
import { formatBasisPoints } from "@/lib/personal-finance/budget/target-validation";
import { formatTargetMoney } from "@/lib/personal-finance/budget/target-formatting";

function formatCoverage(value: number, locale: BudgetLocale) {
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    maximumFractionDigits: 2,
  }).format(value / 10_000);
}

function presentationNumber(value: bigint) {
  if (value < BigInt(Number.MIN_SAFE_INTEGER)
    || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Minor-unit value is outside the presentation range");
  }
  return Number(value);
}

export function BudgetTargetReview({
  currency,
  locale,
  onAdjust,
  onReset,
  snapshot,
}: {
  currency: BudgetCurrency;
  locale: BudgetLocale;
  onAdjust: () => void;
  onReset: () => void;
  snapshot: BudgetTargetSnapshot;
}) {
  const labels = budgetTargetCopy[locale];
  const statusLabel = snapshot.status === "exact"
    ? labels.statusExact
    : snapshot.status === "under" ? labels.statusUnder : labels.statusOver;
  const conclusion = snapshot.status === "exact"
    ? labels.conclusionExact
    : snapshot.status === "under" ? labels.conclusionUnder : labels.conclusionOver;
  const differenceLabel = snapshot.status === "over"
    ? labels.summaryExcess
    : labels.summaryPending;
  const differenceMinor = snapshot.status === "over"
    ? snapshot.excessMinor
    : snapshot.remainingMinor;
  const currentCoverage = snapshot.coverage.currentCoverageBasisPoints === null
    ? labels.summaryNotDefined
    : `${formatCoverage(snapshot.coverage.currentCoverageBasisPoints, locale)} ${locale === "es" ? "meses" : "months"}`;
  const targetCoverage = snapshot.coverage.targetMonths === null
    ? labels.summaryNotDefined
    : `${snapshot.coverage.targetMonths} ${locale === "es" ? "meses" : "months"}`;
  const reserve = snapshot.reserve.status === "unset"
    ? labels.summaryNotDefined
    : formatTargetMoney(snapshot.reserve.amountMinor, locale, currency);
  const comparisonRows = snapshot.comparison.map((row) => ({
    ...row,
    currentAmountMinor: row.currentAmountMinor === null
      ? null
      : presentationNumber(row.currentAmountMinor),
    deltaAmountMinor: row.deltaAmountMinor === null
      ? null
      : presentationNumber(row.deltaAmountMinor),
    targetAmountMinor: presentationNumber(row.targetAmountMinor),
  }));

  return (
    <div className="min-w-0" aria-labelledby="budget-step-4-heading">
      <div className="border-l-2 border-brass bg-white/75 px-4 py-4">
        <p className="text-sm font-semibold leading-6 text-petrol">{statusLabel}</p>
      </div>

      <dl className="mt-5 grid min-w-0 gap-4 sm:grid-cols-3">
        <div className="min-w-0 border border-line bg-white/70 p-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{locale === "es" ? "Ingreso mensual" : "Monthly income"}</dt>
          <dd className="mt-2 break-words text-lg font-semibold text-ink">{formatTargetMoney(snapshot.incomeMinor, locale, currency)}</dd>
        </div>
        <div className="min-w-0 border border-line bg-white/70 p-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{locale === "es" ? "Total objetivo" : "Target total"}</dt>
          <dd className="mt-2 break-words text-lg font-semibold text-ink">{formatTargetMoney(snapshot.totalAllocatedMinor, locale, currency)}</dd>
          <dd className="mt-1 text-sm text-muted">{formatBasisPoints(snapshot.allocatedBasisPoints, locale)} %</dd>
        </div>
        <div className="min-w-0 border border-line bg-white/70 p-4">
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{differenceLabel}</dt>
          <dd className="mt-2 break-words text-lg font-semibold text-ink">
            {snapshot.status === "exact" ? "—" : formatTargetMoney(differenceMinor, locale, currency)}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="budget-review-protection-title" className="mt-6 min-w-0">
        <h3 className="text-xl font-semibold text-ink" id="budget-review-protection-title">{labels.protectionTitle}</h3>
        <dl className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
          <div className="border border-line bg-panelSoft p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{labels.summaryCurrentCoverage}</dt>
            <dd className="mt-2 font-semibold text-ink">{currentCoverage}</dd>
          </div>
          <div className="border border-line bg-panelSoft p-4">
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{labels.summaryTargetCoverage}</dt>
            <dd className="mt-2 font-semibold text-ink">{targetCoverage}</dd>
            {snapshot.coverage.shortfallMinor !== null ? (
              <dd className="mt-1 text-sm text-muted">
                {locale === "es" ? "Faltante: " : "Shortfall: "}
                {formatTargetMoney(snapshot.coverage.shortfallMinor, locale, currency)}
              </dd>
            ) : null}
          </div>
          <div className="border border-line bg-panelSoft p-4 sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{labels.summaryReserve}</dt>
            <dd className="mt-2 font-semibold text-ink">{reserve}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="budget-review-allocation-title" className="mt-6 min-w-0">
        <h3 className="text-xl font-semibold text-ink" id="budget-review-allocation-title">
          {locale === "es" ? "Distribución objetivo" : "Target allocation"}
        </h3>
        <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
          {allocationCategories.map((category) => (
            <div className="min-w-0 border border-line bg-white/70 p-4" key={category}>
              <p className="font-semibold leading-6 text-ink">{labels.categories[category].name}</p>
              <p className="mt-2 text-lg font-semibold text-petrol">{formatBasisPoints(snapshot.allocation[category], locale)} %</p>
              <p className="mt-1 break-words text-sm text-muted">{formatTargetMoney(snapshot.amounts[category], locale, currency)}</p>
            </div>
          ))}
        </div>
        {snapshot.serGivingAmounts ? (
          <dl className="mt-4 grid gap-3 border-l-2 border-brass bg-white/75 p-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">SER</dt>
              <dd className="mt-1 font-semibold text-ink">{formatTargetMoney(snapshot.serGivingAmounts.serMinor, locale, currency)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{locale === "es" ? "Donación" : "Giving"}</dt>
              <dd className="mt-1 font-semibold text-ink">{formatTargetMoney(snapshot.serGivingAmounts.givingMinor, locale, currency)}</dd>
            </div>
          </dl>
        ) : null}
      </section>

      <BudgetAllocationComparison
        currency={currency}
        locale={locale}
        rows={comparisonRows}
        smallExpensesMinor={presentationNumber(snapshot.unclassifiedSmallMinor)}
      />

      <section className="mt-6 border-l-2 border-brass bg-white/75 px-4 py-4" aria-labelledby="budget-review-conclusion-title">
        <h3 className="font-semibold text-ink" id="budget-review-conclusion-title">{labels.conclusionTitle}</h3>
        <p className="mt-2 text-sm leading-6 text-muted">{conclusion}</p>
        <p className="mt-2 text-xs leading-5 text-muted">{labels.reviewConclusion}</p>
      </section>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button className="rounded-[4px] border border-petrol bg-petrol px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol" onClick={onAdjust} type="button">
          {labels.keepAdjusting}
        </button>
        <button className="rounded-[4px] border border-line bg-white px-5 py-2.5 text-sm font-semibold text-petrol transition hover:border-petrol" onClick={onReset} type="button">
          {labels.resetToStartingPoint}
        </button>
      </div>
      <p className="mt-6 max-w-4xl text-xs leading-5 text-muted">{labels.privacy}</p>
    </div>
  );
}
