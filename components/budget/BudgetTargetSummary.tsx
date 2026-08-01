import { budgetTargetCopy } from "@/components/budget/budget-target-copy";
import type { BudgetTargetSnapshot } from "@/lib/personal-finance/budget/target-types";
import type { BudgetTargetMode } from "@/lib/personal-finance/budget/target-types";
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

export function BudgetTargetSummary({
  currency,
  locale,
  mode,
  onReview,
  reviewDisabled,
  showReviewAction,
  snapshot,
}: {
  currency: BudgetCurrency;
  locale: BudgetLocale;
  mode: BudgetTargetMode;
  onReview: () => void;
  reviewDisabled: boolean;
  showReviewAction: boolean;
  snapshot: BudgetTargetSnapshot;
}) {
  const labels = budgetTargetCopy[locale];
  const statusLabel = snapshot.status === "exact"
    ? labels.statusExact
    : snapshot.status === "under" ? labels.statusUnder : labels.statusOver;
  const differenceLabel = snapshot.status === "over"
    ? labels.summaryExcess
    : labels.summaryPending;
  const differenceMinor = snapshot.status === "over"
    ? snapshot.excessMinor
    : snapshot.remainingMinor;
  const coverage = snapshot.coverage.currentCoverageBasisPoints === null
    ? labels.summaryNotDefined
    : `${formatCoverage(snapshot.coverage.currentCoverageBasisPoints, locale)} ${locale === "es" ? "meses" : "months"}`;
  const reserve = snapshot.reserve.status === "unset"
    ? labels.summaryNotDefined
    : formatTargetMoney(snapshot.reserve.amountMinor, locale, currency);
  const responsivePosition = mode === "review"
    ? "hidden lg:block"
    : "block";

  return (
    <aside
      aria-labelledby="budget-target-summary-title"
      className={`${responsivePosition} z-10 min-w-0 self-start rounded-[6px] border border-line bg-panel p-3 shadow-[0_10px_28px_rgba(11,52,54,0.09)] lg:sticky lg:top-[calc(6rem+env(safe-area-inset-top))] lg:col-start-2 lg:row-start-1 lg:p-5`}
    >
      <h3 className="text-base font-semibold text-ink" id="budget-target-summary-title">
        {labels.summaryTitle}
      </h3>
      <p className="mt-2 text-sm font-semibold leading-5 text-petrol">{statusLabel}</p>
      <dl className="mt-3 grid min-w-0 grid-cols-2 gap-x-4 gap-y-3 text-sm lg:grid-cols-1">
        <div className="min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{labels.summaryTotal}</dt>
          <dd className="mt-1 font-semibold text-ink">{formatBasisPoints(snapshot.allocatedBasisPoints, locale)} %</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{labels.distributedAmount}</dt>
          <dd className="mt-1 break-words font-semibold text-ink">{formatTargetMoney(snapshot.totalAllocatedMinor, locale, currency)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{differenceLabel}</dt>
          <dd className="mt-1 break-words font-semibold text-ink">
            {snapshot.status === "exact" ? "—" : formatTargetMoney(differenceMinor, locale, currency)}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{labels.summaryCoverage}</dt>
          <dd className="mt-1 font-semibold text-ink">{coverage}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{labels.summaryReserve}</dt>
          <dd className="mt-1 break-words font-semibold text-ink">{reserve}</dd>
        </div>
      </dl>
      {showReviewAction ? (
        <button
          className="mt-4 w-full rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol disabled:cursor-not-allowed disabled:border-line disabled:bg-panelSoft disabled:text-muted"
          disabled={reviewDisabled}
          onClick={onReview}
          type="button"
        >
          {labels.viewSummary}
        </button>
      ) : null}
    </aside>
  );
}
