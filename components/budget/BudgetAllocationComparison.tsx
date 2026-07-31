import { budgetTargetCopy } from "@/components/budget/budget-target-copy";
import type { AllocationComparisonRow } from "@/lib/personal-finance/budget/target-types";
import type {
  BudgetCurrency,
  BudgetLocale,
} from "@/lib/personal-finance/budget/types";
import { formatMoney } from "@/lib/personal-finance/budget/validation";
import { formatBasisPoints } from "@/lib/personal-finance/budget/target-validation";

function SignedValue({
  basisPoints,
  currency,
  locale,
  minorUnits,
}: {
  basisPoints: number;
  currency: BudgetCurrency;
  locale: BudgetLocale;
  minorUnits: number;
}) {
  const percentageSign = basisPoints > 0 ? "+" : basisPoints < 0 ? "−" : "";
  const amountSign = minorUnits > 0 ? "+" : "";
  return (
    <>
      <span className="block text-base font-semibold text-ink">
        {percentageSign}{formatBasisPoints(Math.abs(basisPoints), locale)}
        {locale === "es" ? " puntos porcentuales" : " percentage points"}
      </span>
      <span className="mt-1 block text-xs text-muted">
        {amountSign}{formatMoney(minorUnits, locale, currency)}
      </span>
    </>
  );
}

export function BudgetAllocationComparison({
  currency,
  locale,
  rows,
  smallExpensesMinor,
}: {
  currency: BudgetCurrency;
  locale: BudgetLocale;
  rows: AllocationComparisonRow[];
  smallExpensesMinor: number;
}) {
  const labels = budgetTargetCopy[locale];

  return (
    <section aria-labelledby="budget-allocation-comparison-title" className="mt-8 min-w-0">
      <h3 className="text-xl font-semibold text-ink" id="budget-allocation-comparison-title">
        {labels.comparisonTitle}
      </h3>
      <div className="mt-4 border border-line" role="table">
        <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr] gap-4 border-b border-line bg-panelSoft px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted md:grid" role="row">
          <span role="columnheader">{locale === "es" ? "Categoría" : "Category"}</span>
          <span role="columnheader">{labels.comparisonCurrent}</span>
          <span role="columnheader">{labels.comparisonTarget}</span>
          <span role="columnheader">{labels.comparisonChange}</span>
        </div>
        <div className="divide-y divide-line" role="rowgroup">
          {rows.map((row) => (
            <div className="grid min-w-0 gap-4 px-4 py-4 md:grid-cols-[1.4fr_1fr_1fr_1fr]" key={row.category} role="row">
              <div className="min-w-0" role="rowheader">
                <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">
                  {locale === "es" ? "Categoría" : "Category"}
                </span>
                <span className="mt-1 block font-semibold leading-6 text-ink md:mt-0">{labels.categories[row.category].name}</span>
              </div>
              <div className="min-w-0" role="cell">
                <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">{labels.comparisonCurrent}</span>
                {row.currentStatus === "known" && row.currentBasisPoints !== null && row.currentAmountMinor !== null ? (
                  <>
                    <span className="mt-1 block text-base font-semibold text-ink md:mt-0">{formatBasisPoints(row.currentBasisPoints, locale)} %</span>
                    <span className="mt-1 block text-xs text-muted">{formatMoney(row.currentAmountMinor, locale, currency)}</span>
                  </>
                ) : (
                  <>
                    <span className="mt-1 block text-sm font-semibold leading-5 text-muted md:mt-0">{labels.statusLabels[row.currentStatus]}</span>
                    {row.currentAmountMinor !== null ? <span className="mt-1 block text-xs text-muted">{formatMoney(row.currentAmountMinor, locale, currency)}</span> : null}
                  </>
                )}
              </div>
              <div className="min-w-0" role="cell">
                <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">{labels.comparisonTarget}</span>
                <span className="mt-1 block text-base font-semibold text-ink md:mt-0">{formatBasisPoints(row.targetBasisPoints, locale)} %</span>
                <span className="mt-1 block text-xs text-muted">{formatMoney(row.targetAmountMinor, locale, currency)}</span>
              </div>
              <div className="min-w-0" role="cell">
                <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted md:hidden">{labels.comparisonChange}</span>
                {row.deltaBasisPoints !== null && row.deltaAmountMinor !== null ? (
                  <span className="mt-1 block md:mt-0">
                    <SignedValue
                      basisPoints={row.deltaBasisPoints}
                      currency={currency}
                      locale={locale}
                      minorUnits={row.deltaAmountMinor}
                    />
                  </span>
                ) : <span className="mt-1 block text-sm text-muted md:mt-0">—</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 border-l border-petrol/30 pl-3 text-sm leading-6 text-muted">
        <span className="font-semibold text-ink">{labels.unclassifiedSmall}: </span>
        {formatMoney(smallExpensesMinor, locale, currency)}
      </p>
    </section>
  );
}
