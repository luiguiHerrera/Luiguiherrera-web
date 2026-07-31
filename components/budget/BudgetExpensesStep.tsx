"use client";

import type { ChangeEvent, FocusEvent } from "react";
import {
  BudgetMoneyField,
  type MoneyDraft,
} from "@/components/budget/BudgetIncomeStep";
import {
  budgetCopy,
  nonMonthlyFrequencyOptions,
  smallExpenseFrequencyOptions,
} from "@/components/budget/budget-copy";
import {
  monthlyNonMonthlyAmount,
  monthlySmallExpenseAmount,
} from "@/lib/personal-finance/budget/calculations";
import {
  MAX_DYNAMIC_EXPENSE_ROWS,
  type BudgetCurrency,
  type BudgetLocale,
  type NonMonthlyFrequency,
  type SmallExpenseFrequency,
} from "@/lib/personal-finance/budget/types";
import { formatMoney } from "@/lib/personal-finance/budget/validation";

export type MainExpenseKey =
  | "debtPayments"
  | "education"
  | "emergencyFund"
  | "enjoyment"
  | "essentials"
  | "personalDevelopment"
  | "savingInvestment";

export type MainExpenseDrafts = Record<MainExpenseKey, MoneyDraft>;

export type NonMonthlyDraft = {
  amount: MoneyDraft;
  frequency: NonMonthlyFrequency;
  id: string;
  monthsFrequency: number;
  name: string;
};

export type SmallExpenseDraft = {
  amount: MoneyDraft;
  frequency: SmallExpenseFrequency;
  id: string;
  name: string;
  timesPerMonth: number;
};

type FieldHandlers = {
  onBlur: (event: FocusEvent<HTMLInputElement>) => void;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

function displayedMonthlyEquivalent(expense: SmallExpenseDraft) {
  if (expense.amount.minorUnits === null || expense.amount.error) return null;
  try {
    return monthlySmallExpenseAmount({
      amountMinor: expense.amount.minorUnits,
      frequency: expense.frequency,
      id: expense.id,
      name: expense.name,
      timesPerMonth: expense.timesPerMonth,
    });
  } catch {
    return null;
  }
}

function displayedNonMonthlyEquivalent(expense: NonMonthlyDraft) {
  if (expense.amount.minorUnits === null || expense.amount.error) return null;
  try {
    return monthlyNonMonthlyAmount({
      amountMinor: expense.amount.minorUnits,
      frequency: expense.frequency,
      id: expense.id,
      monthsFrequency: expense.monthsFrequency,
      name: expense.name,
    });
  } catch {
    return null;
  }
}

export function BudgetExpensesStep({
  currency,
  errors,
  locale,
  mainDrafts,
  nonMonthlyDrafts,
  onAddNonMonthly,
  onAddSmall,
  onMainField,
  onNonMonthlyAmount,
  onNonMonthlyChange,
  onRemoveNonMonthly,
  onRemoveSmall,
  onSmallAmount,
  onSmallChange,
  smallDrafts,
}: {
  currency: BudgetCurrency;
  errors: Record<string, string>;
  locale: BudgetLocale;
  mainDrafts: MainExpenseDrafts;
  nonMonthlyDrafts: NonMonthlyDraft[];
  onAddNonMonthly: () => void;
  onAddSmall: () => void;
  onMainField: (key: MainExpenseKey) => FieldHandlers;
  onNonMonthlyAmount: (id: string) => FieldHandlers;
  onNonMonthlyChange: (id: string, patch: Partial<Omit<NonMonthlyDraft, "amount" | "id">>) => void;
  onRemoveNonMonthly: (id: string) => void;
  onRemoveSmall: (id: string) => void;
  onSmallAmount: (id: string) => FieldHandlers;
  onSmallChange: (id: string, patch: Partial<Omit<SmallExpenseDraft, "amount" | "id">>) => void;
  smallDrafts: SmallExpenseDraft[];
}) {
  const labels = budgetCopy[locale];
  const nonMonthlyAtLimit = nonMonthlyDrafts.length >= MAX_DYNAMIC_EXPENSE_ROWS;
  const smallAtLimit = smallDrafts.length >= MAX_DYNAMIC_EXPENSE_ROWS;
  const mainFields: Array<{
    help?: string;
    key: MainExpenseKey;
    label: string;
  }> = [
    { help: labels.basicExpensesHelp, key: "essentials", label: labels.basicExpenses },
    { key: "debtPayments", label: labels.debt },
    { key: "savingInvestment", label: labels.savingInvestment },
    { key: "emergencyFund", label: labels.emergencyFund },
  ];
  const optionalFields: Array<{ key: MainExpenseKey; label: string }> = [
    { key: "enjoyment", label: labels.enjoyment },
    { key: "education", label: labels.education },
    { key: "personalDevelopment", label: labels.personalDevelopment },
  ];

  return (
    <div className="mt-6 grid min-w-0 gap-6">
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        {mainFields.map((field) => {
          const handlers = onMainField(field.key);
          const fieldId = `budget-${field.key}`;
          const helpId = field.help ? `${fieldId}-help` : undefined;
          return (
            <div className="min-w-0" key={field.key}>
              <BudgetMoneyField
                describedBy={helpId}
                draft={mainDrafts[field.key]}
                error={errors[fieldId] ?? null}
                id={fieldId}
                label={field.label}
                onBlur={handlers.onBlur}
                onChange={handlers.onChange}
              />
              {field.help ? <p className="mt-2 text-sm leading-5 text-muted" id={helpId}>{field.help}</p> : null}
            </div>
          );
        })}
      </div>

      <details
        className="min-w-0 rounded-[6px] border border-line bg-white/60 p-4"
        open={optionalFields.some((field) => Boolean(errors[`budget-${field.key}`])) || undefined}
      >
        <summary className="cursor-pointer text-sm font-semibold text-petrol">{labels.optionalDetails}</summary>
        <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {optionalFields.map((field) => {
            const handlers = onMainField(field.key);
            const fieldId = `budget-${field.key}`;
            return (
              <BudgetMoneyField
                key={field.key}
                draft={mainDrafts[field.key]}
                error={errors[fieldId] ?? null}
                id={fieldId}
                label={field.label}
                onBlur={handlers.onBlur}
                onChange={handlers.onChange}
              />
            );
          })}
        </div>
      </details>

      <details
        className="min-w-0 rounded-[6px] border border-line bg-white/60 p-4"
        open={nonMonthlyDrafts.some((expense) => Object.keys(errors).some((key) => key.startsWith(`budget-non-monthly-${expense.id}-`))) || undefined}
      >
        <summary className="cursor-pointer text-sm font-semibold text-petrol">{labels.nonMonthlyExpenses}</summary>
        <p className="mt-3 text-sm leading-6 text-muted">{labels.nonMonthlyCopy}</p>
        <button
          aria-describedby={nonMonthlyAtLimit ? "budget-non-monthly-limit" : undefined}
          className="mt-4 rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol disabled:cursor-not-allowed disabled:border-line disabled:bg-panelSoft disabled:text-muted"
          disabled={nonMonthlyAtLimit}
          id="budget-add-non-monthly"
          onClick={onAddNonMonthly}
          type="button"
        >
          {labels.addNonMonthly}
        </button>
        {nonMonthlyAtLimit ? (
          <p className="mt-2 text-sm leading-5 text-muted" id="budget-non-monthly-limit" role="status">{labels.maxRows}</p>
        ) : null}
        <div className="mt-4 grid gap-4">
          {nonMonthlyDrafts.map((expense, index) => {
            const row = index + 1;
            const amountId = `budget-non-monthly-${expense.id}-amount`;
            const monthsId = `budget-non-monthly-${expense.id}-months`;
            const amountHandlers = onNonMonthlyAmount(expense.id);
            const monthsError = errors[monthsId];
            const monthlyEquivalent = displayedNonMonthlyEquivalent(expense);
            return (
            <fieldset className="grid min-w-0 gap-4 rounded-[6px] border border-line bg-white/80 p-4 lg:grid-cols-[1.2fr_1fr_1fr_0.8fr_auto] lg:items-end" key={expense.id}>
                <legend className="sr-only">{locale === "es" ? `Gasto no mensual ${row}` : `Non-monthly expense ${row}`}</legend>
                <label className="grid min-w-0 gap-2" htmlFor={`budget-non-monthly-${expense.id}-name`}>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    {locale === "es" ? `Concepto del gasto no mensual ${row}` : `Non-monthly expense ${row} name`}
                  </span>
                  <input
                    className="min-w-0 rounded-[4px] border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol"
                    id={`budget-non-monthly-${expense.id}-name`}
                    onChange={(event) => onNonMonthlyChange(expense.id, { name: event.target.value })}
                    placeholder={locale === "es" ? "Seguro, impuestos..." : "Insurance, taxes..."}
                    type="text"
                    value={expense.name}
                  />
                </label>
                <BudgetMoneyField
                  draft={expense.amount}
                  error={errors[amountId] ?? null}
                  id={amountId}
                  label={locale === "es" ? `Importe del gasto no mensual ${row}` : `Non-monthly expense ${row} amount`}
                  onBlur={amountHandlers.onBlur}
                  onChange={amountHandlers.onChange}
                />
                <label className="grid min-w-0 gap-2" htmlFor={`budget-non-monthly-${expense.id}-frequency`}>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{labels.frequency}</span>
                  <select
                    className="min-w-0 rounded-[4px] border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol"
                    id={`budget-non-monthly-${expense.id}-frequency`}
                    onChange={(event) => onNonMonthlyChange(expense.id, { frequency: event.target.value as NonMonthlyFrequency })}
                    value={expense.frequency}
                  >
                    {nonMonthlyFrequencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label[locale]}</option>
                    ))}
                  </select>
                </label>
                <div className="grid min-w-0 gap-3">
                  {expense.frequency === "custom" ? (
                    <label className="grid min-w-0 gap-2" htmlFor={monthsId}>
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                        {labels.repeatsEveryMonths}
                      </span>
                      <input
                        aria-describedby={`${monthsId}-equivalent${monthsError ? ` ${monthsId}-error` : ""}`}
                        aria-invalid={Boolean(monthsError)}
                        className="min-w-0 rounded-[4px] border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol aria-[invalid=true]:border-red-700"
                        id={monthsId}
                        inputMode="numeric"
                        min={1}
                        onChange={(event) => onNonMonthlyChange(expense.id, { monthsFrequency: Number(event.target.value) })}
                        step={1}
                        type="number"
                        value={expense.monthsFrequency}
                      />
                      {monthsError ? <span className="text-sm leading-5 text-red-800" id={`${monthsId}-error`}>{monthsError}</span> : null}
                    </label>
                  ) : null}
                  <p className="grid min-w-0 gap-2" id={`${monthsId}-equivalent`}>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{labels.monthlyEquivalent}:</span>
                    <span className="min-w-0 rounded-[4px] border border-line bg-panelSoft px-3 py-2.5 text-sm font-semibold text-ink">
                      {monthlyEquivalent === null ? "—" : formatMoney(monthlyEquivalent, locale, currency)}
                    </span>
                  </p>
                </div>
                <button
                  aria-label={locale === "es" ? `Eliminar gasto no mensual ${row}` : `Remove non-monthly expense ${row}`}
                  className="rounded-[4px] border border-line bg-panel px-3 py-2.5 text-xs font-semibold text-muted transition hover:border-petrol hover:text-petrol"
                  onClick={() => onRemoveNonMonthly(expense.id)}
                  type="button"
                >
                  {labels.remove}
                </button>
              </fieldset>
            );
          })}
        </div>
      </details>

      <details
        className="min-w-0 rounded-[6px] border border-line bg-white/60 p-4"
        open={smallDrafts.some((expense) => Object.keys(errors).some((key) => key.startsWith(`budget-small-${expense.id}-`))) || undefined}
      >
        <summary className="cursor-pointer text-sm font-semibold text-petrol">{labels.smallExpenses}</summary>
        <p className="mt-3 text-sm leading-6 text-muted">{labels.smallCopy}</p>
        <button
          aria-describedby={smallAtLimit ? "budget-small-limit" : undefined}
          className="mt-4 rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol disabled:cursor-not-allowed disabled:border-line disabled:bg-panelSoft disabled:text-muted"
          disabled={smallAtLimit}
          id="budget-add-small"
          onClick={onAddSmall}
          type="button"
        >
          {labels.addSmall}
        </button>
        {smallAtLimit ? (
          <p className="mt-2 text-sm leading-5 text-muted" id="budget-small-limit" role="status">{labels.maxRows}</p>
        ) : null}
        <div className="mt-4 grid gap-4">
          {smallDrafts.map((expense, index) => {
            const row = index + 1;
            const amountId = `budget-small-${expense.id}-amount`;
            const timesId = `budget-small-${expense.id}-times`;
            const amountHandlers = onSmallAmount(expense.id);
            const timesError = errors[timesId];
            const monthlyEquivalent = displayedMonthlyEquivalent(expense);
            return (
            <fieldset className="grid min-w-0 gap-4 rounded-[6px] border border-line bg-white/80 p-4 lg:grid-cols-[1.2fr_1fr_1fr_0.8fr_auto] lg:items-end" key={expense.id}>
                <legend className="sr-only">{locale === "es" ? `Gasto pequeño ${row}` : `Small expense ${row}`}</legend>
                <label className="grid min-w-0 gap-2" htmlFor={`budget-small-${expense.id}-name`}>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    {locale === "es" ? `Concepto del gasto pequeño ${row}` : `Small expense ${row} name`}
                  </span>
                  <input
                    className="min-w-0 rounded-[4px] border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol"
                    id={`budget-small-${expense.id}-name`}
                    onChange={(event) => onSmallChange(expense.id, { name: event.target.value })}
                    placeholder={locale === "es" ? "Café, domicilios..." : "Coffee, delivery..."}
                    type="text"
                    value={expense.name}
                  />
                </label>
                <BudgetMoneyField
                  draft={expense.amount}
                  error={errors[amountId] ?? null}
                  id={amountId}
                  label={locale === "es" ? `Importe del gasto pequeño ${row}` : `Small expense ${row} amount`}
                  onBlur={amountHandlers.onBlur}
                  onChange={amountHandlers.onChange}
                />
                <label className="grid min-w-0 gap-2" htmlFor={`budget-small-${expense.id}-frequency`}>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{labels.frequency}</span>
                  <select
                    className="min-w-0 rounded-[4px] border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol"
                    id={`budget-small-${expense.id}-frequency`}
                    onChange={(event) => onSmallChange(expense.id, { frequency: event.target.value as SmallExpenseFrequency })}
                    value={expense.frequency}
                  >
                    {smallExpenseFrequencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label[locale]}</option>
                    ))}
                  </select>
                </label>
                {expense.frequency === "occasional" ? (
                  <label className="grid min-w-0 gap-2" htmlFor={timesId}>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                      {labels.timesPerMonth} · {locale === "es" ? `gasto ${row}` : `expense ${row}`}
                    </span>
                    <input
                      aria-describedby={timesError ? `${timesId}-error` : undefined}
                      aria-invalid={Boolean(timesError)}
                      className="min-w-0 rounded-[4px] border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol aria-[invalid=true]:border-red-700"
                      id={timesId}
                      inputMode="numeric"
                      min={0}
                      onChange={(event) => onSmallChange(expense.id, { timesPerMonth: Number(event.target.value) })}
                      step={1}
                      type="number"
                      value={expense.timesPerMonth}
                    />
                    {timesError ? <span className="text-sm leading-5 text-red-800" id={`${timesId}-error`}>{timesError}</span> : null}
                  </label>
                ) : (
                  <p className="grid min-w-0 gap-2 self-end">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{labels.monthlyEquivalent}:</span>
                    <span className="min-w-0 rounded-[4px] border border-line bg-panelSoft px-3 py-2.5 text-sm font-semibold text-ink">
                      {monthlyEquivalent === null ? "—" : formatMoney(monthlyEquivalent, locale, currency)}
                    </span>
                  </p>
                )}
                <button
                  aria-label={locale === "es" ? `Eliminar gasto pequeño ${row}` : `Remove small expense ${row}`}
                  className="rounded-[4px] border border-line bg-panel px-3 py-2.5 text-xs font-semibold text-muted transition hover:border-petrol hover:text-petrol"
                  onClick={() => onRemoveSmall(expense.id)}
                  type="button"
                >
                  {labels.remove}
                </button>
              </fieldset>
            );
          })}
        </div>
      </details>
    </div>
  );
}
