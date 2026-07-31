"use client";

import type { ChangeEvent, FocusEvent } from "react";
import { budgetCopy, priorityOptions } from "@/components/budget/budget-copy";
import {
  supportedCurrencies,
  type BudgetCurrency,
  type BudgetLocale,
  type BudgetPriority,
} from "@/lib/personal-finance/budget/types";
import type { MoneyParseError } from "@/lib/personal-finance/budget/validation";

export type MoneyDraft = {
  error: MoneyParseError | null;
  minorUnits: number | null;
  text: string;
};

export function moneyErrorText(
  error: MoneyParseError | "required" | null,
  locale: BudgetLocale,
) {
  const labels = budgetCopy[locale];
  if (error === "required") return labels.incomeRequired;
  if (error === "negative") return labels.negativeMoney;
  if (error === "precision") return labels.precisionMoney;
  if (error === "range") return labels.rangeMoney;
  if (error === "invalid") return labels.invalidMoney;
  return null;
}

export function BudgetMoneyField({
  describedBy,
  draft,
  error,
  id,
  label,
  onBlur,
  onChange,
}: {
  describedBy?: string;
  draft: MoneyDraft;
  error: string | null;
  id: string;
  label: string;
  onBlur: (event: FocusEvent<HTMLInputElement>) => void;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const errorId = `${id}-error`;
  const descriptionIds = [describedBy, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <label className="grid min-w-0 gap-2" htmlFor={id}>
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
      <input
        aria-describedby={descriptionIds}
        aria-invalid={Boolean(error)}
        className="min-w-0 rounded-[4px] border border-line bg-white/80 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol focus:bg-white aria-[invalid=true]:border-red-700"
        id={id}
        inputMode="decimal"
        onBlur={onBlur}
        onChange={onChange}
        type="text"
        value={draft.text}
      />
      {error ? <span className="text-sm leading-5 text-red-800" id={errorId}>{error}</span> : null}
    </label>
  );
}

const currencyNames: Record<BudgetCurrency, Record<BudgetLocale, string>> = {
  AUD: { es: "Dólar australiano", en: "Australian dollar" },
  CAD: { es: "Dólar canadiense", en: "Canadian dollar" },
  CHF: { es: "Franco suizo", en: "Swiss franc" },
  CNY: { es: "Yuan chino", en: "Chinese yuan" },
  COP: { es: "Peso colombiano", en: "Colombian peso" },
  EUR: { es: "Euro", en: "Euro" },
  GBP: { es: "Libra esterlina", en: "Pound sterling" },
  HKD: { es: "Dólar de Hong Kong", en: "Hong Kong dollar" },
  JPY: { es: "Yen japonés", en: "Japanese yen" },
  MXN: { es: "Peso mexicano", en: "Mexican peso" },
  SGD: { es: "Dólar de Singapur", en: "Singapore dollar" },
  USD: { es: "Dólar estadounidense", en: "US dollar" },
};

export function BudgetIncomeStep({
  currency,
  income,
  incomeError,
  locale,
  onCurrencyChange,
  onIncomeBlur,
  onIncomeChange,
  onPriorityChange,
  priority,
}: {
  currency: BudgetCurrency;
  income: MoneyDraft;
  incomeError: string | null;
  locale: BudgetLocale;
  onCurrencyChange: (currency: BudgetCurrency) => void;
  onIncomeBlur: (event: FocusEvent<HTMLInputElement>) => void;
  onIncomeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPriorityChange: (priority: BudgetPriority) => void;
  priority: BudgetPriority;
}) {
  const labels = budgetCopy[locale];

  return (
    <div className="mt-6 grid gap-5 md:grid-cols-2">
      <label className="grid gap-2" htmlFor="budget-currency">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{labels.currency}</span>
        <select
          aria-describedby="budget-currency-help"
          className="rounded-[4px] border border-line bg-white/80 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol focus:bg-white"
          id="budget-currency"
          onChange={(event) => onCurrencyChange(event.target.value as BudgetCurrency)}
          value={currency}
        >
          {supportedCurrencies.map((option) => (
            <option key={option} value={option}>{option} — {currencyNames[option][locale]}</option>
          ))}
        </select>
        <span className="text-sm leading-5 text-muted" id="budget-currency-help">{labels.currencyHelp}</span>
      </label>

      <BudgetMoneyField
        describedBy="budget-income-help"
        draft={income}
        error={incomeError}
        id="budget-income"
        label={labels.income}
        onBlur={onIncomeBlur}
        onChange={onIncomeChange}
      />
      <p className="sr-only" id="budget-income-help">{labels.monthlyIncomeHelp}</p>

      <label className="grid gap-2 md:col-span-2" htmlFor="budget-priority">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{labels.focusQuestion} · {labels.fieldOptional}</span>
        <select
          className="rounded-[4px] border border-line bg-white/80 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol focus:bg-white md:max-w-xl"
          id="budget-priority"
          onChange={(event) => onPriorityChange(event.target.value as BudgetPriority)}
          value={priority}
        >
          {priorityOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label[locale]}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
