"use client";

import { budgetCopy } from "@/components/budget/budget-copy";
import type { BudgetResult } from "@/lib/personal-finance/budget/result-model";
import type {
  BudgetCurrency,
  BudgetLocale,
} from "@/lib/personal-finance/budget/types";
import { formatMoney } from "@/lib/personal-finance/budget/validation";

function Metric({
  helper,
  label,
  value,
}: {
  helper?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="border border-line bg-panelSoft px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold leading-7 text-ink">{value}</p>
      {helper ? <p className="mt-2 text-xs leading-5 text-muted">{helper}</p> : null}
    </div>
  );
}

export function budgetHighlight(
  result: BudgetResult,
  locale: BudgetLocale,
  currency: BudgetCurrency,
) {
  if (result.highlightKind === "deficit") {
    return locale === "es"
      ? `Tus asignaciones superan el ingreso mensual por ${formatMoney(result.highlightAmountMinor, locale, currency)}.`
      : `Your allocations exceed monthly income by ${formatMoney(result.highlightAmountMinor, locale, currency)}.`;
  }
  if (result.highlightKind === "fully-allocated") {
    return locale === "es"
      ? "Has asignado todo el ingreso mensual."
      : "You have allocated all monthly income.";
  }
  return locale === "es"
    ? `Queda ${formatMoney(result.highlightAmountMinor, locale, currency)} sin asignar dentro de este presupuesto.`
    : `${formatMoney(result.highlightAmountMinor, locale, currency)} remains unallocated in this budget.`;
}

export function BudgetResults({
  currency,
  locale,
  result,
}: {
  currency: BudgetCurrency;
  locale: BudgetLocale;
  result: BudgetResult;
}) {
  const labels = budgetCopy[locale];
  const coverage = result.coverageMonths === null
    ? labels.coverageUnavailable
    : new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
      maximumFractionDigits: 1,
    }).format(result.coverageMonths) + (locale === "es" ? " meses" : " months");

  return (
    <div className="mt-6">
      <h3 className="text-xl font-semibold text-ink">{labels.resultTitle}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label={labels.resultIncome} value={formatMoney(result.monthlyIncomeMinor, locale, currency)} />
        <Metric label={labels.totalAssigned} value={formatMoney(result.totalAssignedMinor, locale, currency)} />
        <Metric label={labels.margin} value={formatMoney(result.marginMinor, locale, currency)} />
        <Metric helper={labels.coverageHelp} label={labels.coverage} value={coverage} />
      </div>
      <div className="mt-5 border-l-2 border-brass bg-white/75 px-4 py-4">
        <p className="text-sm font-semibold leading-6 text-ink">{budgetHighlight(result, locale, currency)}</p>
      </div>
    </div>
  );
}
