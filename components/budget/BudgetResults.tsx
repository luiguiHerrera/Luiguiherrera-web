"use client";

import styles from "./BudgetEditorial.module.css";
import { BudgetComposition, budgetCompositionColors } from "./BudgetComposition";
import { budgetCopy } from "@/components/budget/budget-copy";
import type { BudgetResult } from "@/lib/personal-finance/budget/result-model";
import type {
  BudgetCurrency,
  BudgetLocale,
  BudgetInput,
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
    <div className={styles.metric}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className={styles.metricValue}>{value}</p>
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
  input,
  locale,
  partial,
  result,
}: {
  currency: BudgetCurrency;
  input: BudgetInput;
  locale: BudgetLocale;
  partial: boolean;
  result: BudgetResult;
}) {
  const labels = budgetCopy[locale];
  const es = locale === "es";
  const emptyBalance = result.emergencyFundMinor === null;
  const segments = [
    [es ? "Básicos y compromisos" : "Essentials and commitments", result.essentialsAndDebtMinor],
    [labels.savingInvestment, input.savingInvestmentMinor],
    [labels.enjoyment, input.enjoymentMinor],
    [labels.education, input.educationMinor],
    [labels.personalDevelopment, input.personalDevelopmentMinor],
    [labels.nonMonthlyExpenses, result.monthlyNonMonthlyMinor],
    [labels.smallExpenses, result.monthlySmallExpensesMinor],
  ].map(([label, amount], index) => ({
    label: String(label),
    amount: BigInt(amount),
    color: budgetCompositionColors[index],
  })).filter(({ amount }) => amount > 0n);
  const fundBalance = emptyBalance
    ? es ? "Saldo sin informar" : "Balance not provided"
    : `${labels.emergencyFund} · ${formatMoney(result.emergencyFundMinor!, locale, currency)}${result.emergencyFundMinor === 0 ? es ? " (cero declarado)" : " (declared zero)" : ""}`;
  const coverage = emptyBalance
    ? es ? "No calculable" : "Not calculable"
    : result.coverageMonths === null
    ? labels.coverageUnavailable
    : new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
      maximumFractionDigits: 1,
    }).format(result.coverageMonths) + (locale === "es" ? " meses" : " months");

  return (
    <div className="mt-6">
      <h3 className="text-xl font-semibold text-ink">{labels.resultTitle}</h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{labels.resultExplanation}</p>
      <div className={styles.metrics}>
        <Metric label={labels.resultIncome} value={formatMoney(result.monthlyIncomeMinor, locale, currency)} />
        <Metric label={labels.totalAssigned} value={formatMoney(result.totalAssignedMinor, locale, currency)} />
        <Metric label={labels.margin} value={formatMoney(result.marginMinor, locale, currency)} />
        <Metric helper={fundBalance} label={labels.coverage} value={coverage} />
      </div>
      <figure className={styles.figure}>
        <figcaption>{es ? "Composición de tu presupuesto" : "Your budget composition"}</figcaption>
        <BudgetComposition currency={currency} income={BigInt(result.monthlyIncomeMinor)} label={labels.totalAssigned} locale={locale} segments={segments} />
        <ul className={styles.legend}>
          {segments.map(({ label, color, amount }) => (
            <li key={label}><i style={{ backgroundColor: color }} /><span>{label}</span><strong>{formatMoney(Number(amount), locale, currency)}</strong></li>
          ))}
        </ul>
      </figure>
      <p className="mt-3 text-xs leading-5 text-muted">{labels.coverageHelp}</p>
      {partial ? (
        <p className={styles.coverageNotice}>{es
          ? "Información parcial. Los totales reflejan los importes informados. Para sumar los flujos mensuales, los campos vacíos aportan 0. El saldo del fondo se trata por separado."
          : "Partial information. Totals reflect the amounts provided. Blank fields count as zero when adding monthly cash flows. The fund balance is treated separately."}</p>
      ) : null}
    </div>
  );
}
