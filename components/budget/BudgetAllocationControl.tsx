"use client";

import { useEffect, useRef, useState } from "react";
import { moneyErrorText } from "@/components/budget/BudgetIncomeStep";
import { budgetTargetCopy } from "@/components/budget/budget-target-copy";
import { basisPointsFromAmount } from "@/lib/personal-finance/budget/target-calculations";
import type {
  AllocationBasisPoints,
  AllocationCategory,
} from "@/lib/personal-finance/budget/target-types";
import type {
  BudgetCurrency,
  BudgetLocale,
} from "@/lib/personal-finance/budget/types";
import {
  formatMoney,
  formatMoneyInput,
  parseLocalizedMoney,
  type MoneyParseError,
} from "@/lib/personal-finance/budget/validation";
import {
  formatBasisPoints,
  parseLocalizedPercentage,
} from "@/lib/personal-finance/budget/target-validation";

type AmountValidationError = MoneyParseError | "above-income" | "empty";

function validateAmountDraft(
  raw: string,
  locale: BudgetLocale,
  currency: BudgetCurrency,
  incomeMinor: number,
): {
  basisPoints: AllocationBasisPoints | null;
  error: AmountValidationError | null;
} {
  const parsed = parseLocalizedMoney(raw, locale, currency);
  if (parsed.error) return { basisPoints: null, error: parsed.error };
  if (parsed.minorUnits === null) return { basisPoints: null, error: "empty" };
  if (parsed.minorUnits > incomeMinor) {
    return { basisPoints: null, error: "above-income" };
  }
  const converted = basisPointsFromAmount(parsed.minorUnits, incomeMinor);
  if (converted.status !== "ok" || converted.value > 10_000) {
    return { basisPoints: null, error: "above-income" };
  }
  return { basisPoints: converted.value, error: null };
}

function amountValidationErrorText(
  error: AmountValidationError,
  locale: BudgetLocale,
  amountAboveIncome: string,
) {
  if (error === "above-income") return amountAboveIncome;
  return moneyErrorText(error === "empty" ? "invalid" : error, locale)
    ?? (locale === "es" ? "Introduce un importe válido." : "Enter a valid amount.");
}

export function BudgetAllocationControl({
  amountMinor,
  basisPoints,
  category,
  currency,
  incomeMinor,
  locale,
  onBasisPointsChange,
  onCommit,
  onValidationChange,
}: {
  amountMinor: number;
  basisPoints: AllocationBasisPoints;
  category: AllocationCategory;
  currency: BudgetCurrency;
  incomeMinor: number;
  locale: BudgetLocale;
  onBasisPointsChange: (basisPoints: AllocationBasisPoints) => void;
  onCommit: () => void;
  onValidationChange: (invalid: boolean) => void;
}) {
  const labels = budgetTargetCopy[locale];
  const categoryCopy = labels.categories[category];
  const [percentageDraft, setPercentageDraft] = useState(
    formatBasisPoints(basisPoints, locale),
  );
  const [percentageError, setPercentageError] = useState<string | null>(null);
  const [amountDraft, setAmountDraft] = useState("");
  const [amountEditing, setAmountEditing] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);
  const amountContext = useRef({ currency, incomeMinor, locale });
  const percentageId = `budget-target-${category}-percentage`;
  const amountId = `budget-target-${category}-amount`;
  const helpId = `budget-target-${category}-help`;

  function updateBasisPoints(next: number) {
    onBasisPointsChange(next);
    setPercentageDraft(formatBasisPoints(next, locale));
    setPercentageError(null);
    setAmountDraft("");
    setAmountEditing(false);
    setAmountError(null);
    onValidationChange(false);
  }

  function handlePercentage(raw: string) {
    setPercentageDraft(raw);
    const parsed = parseLocalizedPercentage(raw, locale);
    if (parsed.error || parsed.basisPoints === null) {
      setPercentageError(labels.percentageError);
      onValidationChange(true);
      return;
    }
    setPercentageError(null);
    setAmountDraft("");
    setAmountEditing(false);
    onValidationChange(false);
    onBasisPointsChange(parsed.basisPoints);
  }

  function commitAmount() {
    const validation = validateAmountDraft(
      amountDraft,
      locale,
      currency,
      incomeMinor,
    );
    if (validation.error || validation.basisPoints === null) {
      setAmountError(amountValidationErrorText(
        validation.error ?? "empty",
        locale,
        labels.amountAboveIncome,
      ));
      onValidationChange(true);
      return;
    }
    updateBasisPoints(validation.basisPoints);
    onCommit();
  }

  useEffect(() => {
    const contextChanged = amountContext.current.currency !== currency
      || amountContext.current.incomeMinor !== incomeMinor
      || amountContext.current.locale !== locale;
    amountContext.current = { currency, incomeMinor, locale };
    if (!amountEditing || !contextChanged) return;

    const validation = validateAmountDraft(
      amountDraft,
      locale,
      currency,
      incomeMinor,
    );
    const nextError = validation.error
      ? amountValidationErrorText(
          validation.error,
          locale,
          labels.amountAboveIncome,
        )
      : null;
    setAmountError(nextError);
    onValidationChange(Boolean(nextError));
  }, [
    amountDraft,
    amountEditing,
    currency,
    incomeMinor,
    labels.amountAboveIncome,
    locale,
    onValidationChange,
  ]);

  return (
    <fieldset className="min-w-0 rounded-[6px] border border-line bg-white/70 p-4 md:p-5">
      <legend className="px-1 text-lg font-semibold text-ink">{categoryCopy.name}</legend>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-petrol">{categoryCopy.subtitle}</p>
      <p className="mt-3 text-sm leading-6 text-muted" id={helpId}>{categoryCopy.description}</p>
      {categoryCopy.limit ? <p className="mt-3 border-l border-petrol/30 pl-3 text-xs leading-5 text-muted">{categoryCopy.limit}</p> : null}

      <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
        <label className="grid min-w-0 gap-2" htmlFor={percentageId}>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{labels.percentage}</span>
          <span className="relative">
            <input
              aria-describedby={`${helpId}${percentageError ? ` ${percentageId}-error` : ""}`}
              aria-invalid={Boolean(percentageError)}
              className="w-full rounded-[4px] border border-line bg-white px-3 py-2.5 pr-9 text-sm font-semibold text-ink outline-none transition focus:border-petrol aria-[invalid=true]:border-red-700"
              id={percentageId}
              inputMode="decimal"
              onBlur={() => {
                if (!percentageError) {
                  setPercentageDraft(formatBasisPoints(basisPoints, locale));
                  onCommit();
                }
              }}
              onChange={(event) => handlePercentage(event.target.value)}
              type="text"
              value={percentageDraft}
            />
            <span aria-hidden="true" className="pointer-events-none absolute right-3 top-2.5 text-sm text-muted">%</span>
          </span>
          {percentageError ? <span className="text-sm text-red-800" id={`${percentageId}-error`}>{percentageError}</span> : null}
        </label>

        <label className="grid min-w-0 gap-2" htmlFor={amountId}>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{labels.amount}</span>
          <input
            aria-describedby={amountError ? `${amountId}-error` : helpId}
            aria-invalid={Boolean(amountError)}
            className="min-w-0 rounded-[4px] border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-petrol aria-[invalid=true]:border-red-700"
            id={amountId}
            inputMode="decimal"
            onBlur={commitAmount}
            onChange={(event) => {
              setAmountDraft(event.target.value);
              setAmountError(null);
              onValidationChange(false);
            }}
            onFocus={() => {
              if (!amountEditing) {
                setAmountEditing(true);
                setAmountDraft(formatMoneyInput(amountMinor, locale, currency));
              }
            }}
            type="text"
            value={amountEditing
              ? amountDraft
              : formatMoneyInput(amountMinor, locale, currency)}
          />
          {amountError ? <span className="text-sm text-red-800" id={`${amountId}-error`}>{amountError}</span> : null}
        </label>
      </div>

      <label className="mt-5 grid gap-2" htmlFor={`budget-target-${category}-slider`}>
        <span className="sr-only">{categoryCopy.name}: {labels.percentage}</span>
        <input
          aria-describedby={helpId}
          aria-valuetext={`${formatBasisPoints(basisPoints, locale)} % — ${formatMoney(amountMinor, locale, currency)}`}
          className="w-full accent-petrol"
          id={`budget-target-${category}-slider`}
          max="100"
          min="0"
          onBlur={onCommit}
          onChange={(event) => {
            const parsed = parseLocalizedPercentage(event.target.value, "en");
            if (parsed.error === null && parsed.basisPoints !== null) {
              updateBasisPoints(parsed.basisPoints);
            }
          }}
          onPointerUp={onCommit}
          step="0.01"
          type="range"
          value={formatBasisPoints(basisPoints, "en")}
        />
      </label>
    </fieldset>
  );
}
