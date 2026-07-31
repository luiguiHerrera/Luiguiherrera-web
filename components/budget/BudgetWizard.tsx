"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  BudgetExpensesStep,
  type MainExpenseDrafts,
  type MainExpenseKey,
  type NonMonthlyDraft,
  type SmallExpenseDraft,
} from "@/components/budget/BudgetExpensesStep";
import {
  BudgetIncomeStep,
  moneyErrorText,
  type MoneyDraft,
} from "@/components/budget/BudgetIncomeStep";
import { BudgetCurrentClassification } from "@/components/budget/BudgetCurrentClassification";
import { BudgetResults, budgetHighlight } from "@/components/budget/BudgetResults";
import { BudgetTargetStep } from "@/components/budget/BudgetTargetStep";
import { budgetTargetCopy } from "@/components/budget/budget-target-copy";
import { budgetCopy } from "@/components/budget/budget-copy";
import { calculateBudget } from "@/lib/personal-finance/budget/calculations";
import type { BudgetResult } from "@/lib/personal-finance/budget/result-model";
import {
  calculateEmergencyFundProjection,
  deriveStartingTargetAllocation,
  rescaleMinorUnitsExact,
  transitionTargetAllocationLifecycle,
} from "@/lib/personal-finance/budget/target-calculations";
import {
  emptyTargetAllocation,
  type ContingencyReserve,
  type CurrentAllocationInput,
  type EmergencyFundPlan,
  type SavingsCurrentClassification,
  type SerGivingBreakdown,
  type TargetAllocation,
  type TargetAllocationLifecycle,
} from "@/lib/personal-finance/budget/target-types";
import {
  appendBudgetExpenseRow,
  type BudgetCurrency,
  type BudgetInput,
  type BudgetLocale,
  type BudgetPriority,
} from "@/lib/personal-finance/budget/types";
import {
  currencyFractionDigits,
  formatMoneyInput,
  parseLocalizedMoney,
} from "@/lib/personal-finance/budget/validation";

type Step = 1 | 2 | 3 | 4;

const emptyMoneyDraft = (): MoneyDraft => ({
  error: null,
  minorUnits: null,
  text: "",
});

const emptyMainDrafts = (): MainExpenseDrafts => ({
  debtPayments: emptyMoneyDraft(),
  education: emptyMoneyDraft(),
  emergencyFund: emptyMoneyDraft(),
  enjoyment: emptyMoneyDraft(),
  essentials: emptyMoneyDraft(),
  personalDevelopment: emptyMoneyDraft(),
  savingInvestment: emptyMoneyDraft(),
});

function parseDraft(
  text: string,
  locale: BudgetLocale,
  currency: BudgetCurrency,
): MoneyDraft {
  const parsed = parseLocalizedMoney(text, locale, currency);
  return {
    error: parsed.error,
    minorUnits: parsed.minorUnits,
    text,
  };
}

function formatDraft(
  draft: MoneyDraft,
  locale: BudgetLocale,
  currency: BudgetCurrency,
) {
  if (draft.error || draft.minorUnits === null) return draft;
  return {
    ...draft,
    text: formatMoneyInput(draft.minorUnits, locale, currency),
  };
}

function rebaseDraft(
  draft: MoneyDraft,
  locale: BudgetLocale,
  currentCurrency: BudgetCurrency,
  nextCurrency: BudgetCurrency,
) {
  if (draft.error || draft.minorUnits === null) {
    return parseDraft(draft.text, locale, nextCurrency);
  }
  const rebased = rescaleMinorUnitsExact(
    draft.minorUnits,
    currencyFractionDigits(locale, currentCurrency),
    currencyFractionDigits(locale, nextCurrency),
  );
  if (rebased.status === "exact") {
    return {
      error: null,
      minorUnits: rebased.value,
      text: formatMoneyInput(rebased.value, locale, nextCurrency),
    };
  }
  return {
    error: rebased.status === "notRepresentable" ? "precision" as const : "range" as const,
    minorUnits: null,
    text: formatMoneyInput(draft.minorUnits, locale, currentCurrency),
  };
}

function focusElement(id: string) {
  requestAnimationFrame(() => {
    document.getElementById(id)?.focus();
  });
}

export function BudgetWizard({ locale }: { locale: BudgetLocale }) {
  const labels = budgetCopy[locale];
  const targetLabels = budgetTargetCopy[locale];
  const initialCurrency: BudgetCurrency = locale === "es" ? "EUR" : "USD";
  const [currency, setCurrency] = useState<BudgetCurrency>(initialCurrency);
  const [priority, setPriority] = useState<BudgetPriority>("understand");
  const [income, setIncome] = useState<MoneyDraft>(emptyMoneyDraft);
  const [mainDrafts, setMainDrafts] = useState<MainExpenseDrafts>(emptyMainDrafts);
  const [nonMonthlyDrafts, setNonMonthlyDrafts] = useState<NonMonthlyDraft[]>([]);
  const [smallDrafts, setSmallDrafts] = useState<SmallExpenseDraft[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<BudgetResult | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [liveMessage, setLiveMessage] = useState("");
  const [targetAllocation, setTargetAllocation] = useState<TargetAllocation>({
    ...emptyTargetAllocation,
  });
  const [targetAllocationLifecycle, setTargetAllocationLifecycle] =
    useState<TargetAllocationLifecycle>("uninitialized");
  const [targetInitializationError, setTargetInitializationError] =
    useState<string | null>(null);
  const [currentClassification, setCurrentClassification] = useState<SavingsCurrentClassification>({ kind: "unclassified" });
  const [emergencyPlan, setEmergencyPlan] = useState<EmergencyFundPlan>({
    completionMonths: null,
    target: { kind: "unset" },
  });
  const [contingencyReserve, setContingencyReserve] = useState<ContingencyReserve>({ kind: "unset" });
  const [contingencyReserveChoice, setContingencyReserveChoice] = useState<ContingencyReserve["kind"]>("unset");
  const [contingencyReserveDraft, setContingencyReserveDraft] = useState("");
  const [serGiving, setSerGiving] = useState<SerGivingBreakdown>({ kind: "closed" });
  const rowCounter = useRef(0);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    focusElement(`budget-step-${step}-heading`);
    const stepLabel = step === 1
      ? labels.step1Label
      : step === 2
        ? labels.step2Label
        : step === 3 ? labels.step3Label : labels.step4Label;
    setLiveMessage(`${labels.step} ${step}: ${stepLabel}`);
  }, [labels, step]);

  function setFieldError(id: string, draft: MoneyDraft) {
    setErrors((current) => {
      const next = { ...current };
      if (draft.error) {
        next[id] = moneyErrorText(draft.error, locale) ?? labels.invalidMoney;
      } else {
        delete next[id];
      }
      delete next["budget-calculation"];
      return next;
    });
    setResult(null);
  }

  function handleIncomeChange(event: ChangeEvent<HTMLInputElement>) {
    const next = parseDraft(event.target.value, locale, currency);
    setIncome(next);
    if (contingencyReserveChoice === "amount") {
      const parsedReserve = parseLocalizedMoney(
        contingencyReserveDraft,
        locale,
        currency,
      );
      setContingencyReserve(
        parsedReserve.error === null
        && parsedReserve.minorUnits !== null
        && next.minorUnits !== null
        && parsedReserve.minorUnits <= next.minorUnits
          ? { amountMinor: parsedReserve.minorUnits, kind: "amount" }
          : { kind: "unset" },
      );
    }
    setFieldError("budget-income", next);
  }

  function handleIncomeBlur() {
    setIncome((current) => formatDraft(current, locale, currency));
  }

  function handleCurrencyChange(nextCurrency: BudgetCurrency) {
    const nextIncome = rebaseDraft(income, locale, currency, nextCurrency);
    const nextMainDrafts = Object.fromEntries(
      Object.entries(mainDrafts).map(([key, draft]) => [
        key,
        rebaseDraft(draft, locale, currency, nextCurrency),
      ]),
    ) as MainExpenseDrafts;
    const nextNonMonthlyDrafts = nonMonthlyDrafts.map((expense) => ({
      ...expense,
      amount: rebaseDraft(expense.amount, locale, currency, nextCurrency),
    }));
    const nextSmallDrafts = smallDrafts.map((expense) => ({
      ...expense,
      amount: rebaseDraft(expense.amount, locale, currency, nextCurrency),
    }));
    const nextReserveDraft = contingencyReserveChoice === "amount"
      ? rebaseDraft(
          parseDraft(contingencyReserveDraft, locale, currency),
          locale,
          currency,
          nextCurrency,
        )
      : null;
    const nextErrors: Record<string, string> = {};
    const addMoneyError = (id: string, draft: MoneyDraft) => {
      if (draft.error) {
        nextErrors[id] = moneyErrorText(draft.error, locale) ?? labels.invalidMoney;
      }
    };

    addMoneyError("budget-income", nextIncome);
    (Object.entries(nextMainDrafts) as Array<[MainExpenseKey, MoneyDraft]>).forEach(([key, draft]) => {
      addMoneyError(`budget-${key}`, draft);
    });
    nextNonMonthlyDrafts.forEach((expense) => {
      addMoneyError(`budget-non-monthly-${expense.id}-amount`, expense.amount);
    });
    nextSmallDrafts.forEach((expense) => {
      addMoneyError(`budget-small-${expense.id}-amount`, expense.amount);
    });

    setIncome(nextIncome);
    setMainDrafts(nextMainDrafts);
    setNonMonthlyDrafts(nextNonMonthlyDrafts);
    setSmallDrafts(nextSmallDrafts);
    if (nextReserveDraft) {
      setContingencyReserveDraft(nextReserveDraft.text);
      setContingencyReserve(
        nextReserveDraft.error === null
        && nextReserveDraft.minorUnits !== null
        && nextIncome.minorUnits !== null
        && nextReserveDraft.minorUnits <= nextIncome.minorUnits
          ? { amountMinor: nextReserveDraft.minorUnits, kind: "amount" }
          : { kind: "unset" },
      );
    }
    setCurrency(nextCurrency);
    setErrors(nextErrors);
    setResult(null);
  }

  function mainFieldHandlers(key: MainExpenseKey) {
    const id = `budget-${key}`;
    return {
      onBlur: () => {
        setMainDrafts((current) => ({
          ...current,
          [key]: formatDraft(current[key], locale, currency),
        }));
      },
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        const next = parseDraft(event.target.value, locale, currency);
        setMainDrafts((current) => ({ ...current, [key]: next }));
        if (key === "savingInvestment" && (next.minorUnits === null || next.minorUnits <= 0)) {
          setCurrentClassification({ kind: "unclassified" });
        }
        setFieldError(id, next);
      },
    };
  }

  function nonMonthlyAmountHandlers(id: string) {
    const fieldId = `budget-non-monthly-${id}-amount`;
    return {
      onBlur: () => {
        setNonMonthlyDrafts((current) => current.map((expense) => (
          expense.id === id
            ? { ...expense, amount: formatDraft(expense.amount, locale, currency) }
            : expense
        )));
      },
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        const next = parseDraft(event.target.value, locale, currency);
        setNonMonthlyDrafts((current) => current.map((expense) => (
          expense.id === id ? { ...expense, amount: next } : expense
        )));
        setFieldError(fieldId, next);
      },
    };
  }

  function smallAmountHandlers(id: string) {
    const fieldId = `budget-small-${id}-amount`;
    return {
      onBlur: () => {
        setSmallDrafts((current) => current.map((expense) => (
          expense.id === id
            ? { ...expense, amount: formatDraft(expense.amount, locale, currency) }
            : expense
        )));
      },
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        const next = parseDraft(event.target.value, locale, currency);
        setSmallDrafts((current) => current.map((expense) => (
          expense.id === id ? { ...expense, amount: next } : expense
        )));
        setFieldError(fieldId, next);
      },
    };
  }

  function showValidationErrors(nextErrors: Record<string, string>) {
    setErrors(nextErrors);
    const firstId = Object.keys(nextErrors)[0];
    if (firstId === "budget-calculation") {
      focusElement("budget-error-summary");
    } else if (firstId) {
      focusElement(firstId);
    }
  }

  function submitIncome(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (income.error) {
      nextErrors["budget-income"] = moneyErrorText(income.error, locale) ?? labels.invalidMoney;
    } else if (income.minorUnits === null || income.minorUnits <= 0) {
      nextErrors["budget-income"] = labels.incomeRequired;
    }
    if (Object.keys(nextErrors).length > 0) {
      showValidationErrors(nextErrors);
      return;
    }
    setErrors((current) => Object.fromEntries(
      Object.entries(current).filter(([id]) => id !== "budget-income"),
    ));
    setStep(2);
  }

  function buildInput(): BudgetInput {
    return {
      currency,
      debtPaymentsMinor: mainDrafts.debtPayments.minorUnits ?? 0,
      educationMinor: mainDrafts.education.minorUnits ?? 0,
      emergencyFundMinor: mainDrafts.emergencyFund.minorUnits ?? 0,
      enjoymentMinor: mainDrafts.enjoyment.minorUnits ?? 0,
      essentialsMinor: mainDrafts.essentials.minorUnits ?? 0,
      monthlyIncomeMinor: income.minorUnits ?? 0,
      nonMonthlyExpenses: nonMonthlyDrafts.map((expense) => ({
        amountMinor: expense.amount.minorUnits ?? 0,
        frequency: expense.frequency,
        id: expense.id,
        monthsFrequency: expense.monthsFrequency,
        name: expense.name,
      })),
      personalDevelopmentMinor: mainDrafts.personalDevelopment.minorUnits ?? 0,
      priority,
      savingInvestmentMinor: mainDrafts.savingInvestment.minorUnits ?? 0,
      smallExpenses: smallDrafts.map((expense) => ({
        amountMinor: expense.amount.minorUnits ?? 0,
        frequency: expense.frequency,
        id: expense.id,
        name: expense.name,
        timesPerMonth: expense.timesPerMonth,
      })),
    };
  }

  function submitExpenses(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    (Object.entries(mainDrafts) as Array<[MainExpenseKey, MoneyDraft]>).forEach(([key, draft]) => {
      if (draft.error) {
        nextErrors[`budget-${key}`] = moneyErrorText(draft.error, locale) ?? labels.invalidMoney;
      }
    });
    nonMonthlyDrafts.forEach((expense) => {
      if (expense.amount.error) {
        nextErrors[`budget-non-monthly-${expense.id}-amount`] = moneyErrorText(expense.amount.error, locale) ?? labels.invalidMoney;
      }
      if (
        expense.frequency === "custom"
        && (!Number.isSafeInteger(expense.monthsFrequency) || expense.monthsFrequency < 1)
      ) {
        nextErrors[`budget-non-monthly-${expense.id}-months`] = labels.invalidMonths;
      }
    });
    smallDrafts.forEach((expense) => {
      if (expense.amount.error) {
        nextErrors[`budget-small-${expense.id}-amount`] = moneyErrorText(expense.amount.error, locale) ?? labels.invalidMoney;
      }
      if (
        expense.frequency === "occasional"
        && (!Number.isSafeInteger(expense.timesPerMonth) || expense.timesPerMonth < 0)
      ) {
        nextErrors[`budget-small-${expense.id}-times`] = labels.invalidTimes;
      }
    });

    if (Object.keys(nextErrors).length > 0) {
      showValidationErrors(nextErrors);
      return;
    }

    try {
      const nextResult = calculateBudget(buildInput());
      setResult(nextResult);
      setErrors({});
      setStep(3);
      setLiveMessage(budgetHighlight(nextResult, locale, currency));
    } catch {
      showValidationErrors({ "budget-calculation": labels.calculationRange });
    }
  }

  function addNonMonthly() {
    rowCounter.current += 1;
    const id = `non-${rowCounter.current}`;
    setNonMonthlyDrafts((current) => appendBudgetExpenseRow(current, {
        amount: emptyMoneyDraft(),
        frequency: "annual",
        id,
        monthsFrequency: 12,
        name: "",
      }));
    focusElement(`budget-non-monthly-${id}-name`);
  }

  function removeNonMonthly(id: string) {
    const index = nonMonthlyDrafts.findIndex((expense) => expense.id === id);
    const nextFocus = nonMonthlyDrafts[index - 1] ?? nonMonthlyDrafts[index + 1];
    setNonMonthlyDrafts((current) => current.filter((expense) => expense.id !== id));
    setErrors((current) => Object.fromEntries(
      Object.entries(current).filter(([key]) => !key.startsWith(`budget-non-monthly-${id}-`)),
    ));
    focusElement(nextFocus ? `budget-non-monthly-${nextFocus.id}-name` : "budget-add-non-monthly");
  }

  function addSmall() {
    rowCounter.current += 1;
    const id = `small-${rowCounter.current}`;
    setSmallDrafts((current) => appendBudgetExpenseRow(current, {
        amount: emptyMoneyDraft(),
        frequency: "daily",
        id,
        name: "",
        timesPerMonth: 1,
      }));
    focusElement(`budget-small-${id}-name`);
  }

  function removeSmall(id: string) {
    const index = smallDrafts.findIndex((expense) => expense.id === id);
    const nextFocus = smallDrafts[index - 1] ?? smallDrafts[index + 1];
    setSmallDrafts((current) => current.filter((expense) => expense.id !== id));
    setErrors((current) => Object.fromEntries(
      Object.entries(current).filter(([key]) => !key.startsWith(`budget-small-${id}-`)),
    ));
    focusElement(nextFocus ? `budget-small-${nextFocus.id}-name` : "budget-add-small");
  }

  const stepLabels = [
    labels.step1Label,
    labels.step2Label,
    labels.step3Label,
    labels.step4Label,
  ];
  const currentInput: CurrentAllocationInput | null = result ? {
    debtPaymentsMinor: mainDrafts.debtPayments.minorUnits,
    educationMinor: mainDrafts.education.minorUnits,
    enjoymentMinor: mainDrafts.enjoyment.minorUnits,
    essentialsMinor: mainDrafts.essentials.minorUnits,
    incomeMinor: result.monthlyIncomeMinor,
    monthlyNonMonthlyMinor: result.monthlyNonMonthlyMinor,
    personalDevelopmentMinor: mainDrafts.personalDevelopment.minorUnits,
    savingInvestmentMinor: mainDrafts.savingInvestment.minorUnits,
    smallExpensesMinor: result.monthlySmallExpensesMinor,
  } : null;

  function openTargetAllocation() {
    if (
      targetAllocationLifecycle === "uninitialized"
      && result
      && currentInput
    ) {
      const projection = calculateEmergencyFundProjection(
        emergencyPlan,
        result.essentialsAndDebtMinor,
        result.emergencyFundMinor,
      );
      const startingAllocation = deriveStartingTargetAllocation(
        currentInput,
        currentClassification,
        contingencyReserve,
        projection,
      );
      if (startingAllocation.status === "ok") {
        setTargetAllocation(startingAllocation.value);
        setTargetAllocationLifecycle((current) => (
          transitionTargetAllocationLifecycle(current, "initialize-success")
        ));
        setTargetInitializationError(null);
      } else {
        setTargetAllocationLifecycle((current) => (
          transitionTargetAllocationLifecycle(current, "initialize-error")
        ));
        setTargetInitializationError(
          locale === "es"
            ? "No se pudo aplicar el punto de partida dentro del rango técnico permitido. Revisa los importes e inténtalo de nuevo."
            : "The starting point could not be applied within the supported technical range. Review the amounts and try again.",
        );
      }
    }
    setStep(4);
  }

  return (
    <section className="mt-8 rounded-[6px] border border-line bg-panel p-5 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6" aria-labelledby={`budget-step-${step}-heading`}>
      <p className="text-sm font-semibold text-petrol">{labels.noDataSaved}</p>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-muted">{labels.privacyLong}</p>

      <ol aria-label={locale === "es" ? "Progreso del presupuesto" : "Budget progress"} className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {stepLabels.map((label, index) => {
          const number = (index + 1) as Step;
          return (
            <li
              aria-current={step === number ? "step" : undefined}
              className={`border px-3 py-3 text-sm ${step === number ? "border-petrol bg-petrol text-white" : "border-line bg-white/70 text-muted"}`}
              key={label}
            >
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em]">{labels.step} {number}</span>
              <span className="mt-1 block font-semibold">{label}</span>
            </li>
          );
        })}
      </ol>

      <div aria-atomic="true" aria-live="polite" className="sr-only" role="status">{liveMessage}</div>

      {Object.keys(errors).length > 0 ? (
        <div
          className="mt-6 border border-red-700/40 bg-red-50 p-4"
          id="budget-error-summary"
          role="alert"
          tabIndex={-1}
        >
          <p className="font-semibold text-red-900">{labels.errorSummary}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-800">
            {[...new Set(Object.values(errors))].map((error) => <li key={error}>{error}</li>)}
          </ul>
        </div>
      ) : null}

      {step === 1 ? (
        <form className="mt-6" noValidate onSubmit={submitIncome}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">01</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink" id="budget-step-1-heading" tabIndex={-1}>{labels.step1Title}</h2>
          <BudgetIncomeStep
            currency={currency}
            income={income}
            incomeError={errors["budget-income"] ?? null}
            locale={locale}
            onCurrencyChange={handleCurrencyChange}
            onIncomeBlur={handleIncomeBlur}
            onIncomeChange={handleIncomeChange}
            onPriorityChange={setPriority}
            priority={priority}
          />
          <div className="mt-6 flex justify-end">
            <button className="rounded-[4px] border border-petrol bg-petrol px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol" type="submit">
              {labels.continue}
            </button>
          </div>
        </form>
      ) : null}

      {step === 2 ? (
        <form className="mt-6" noValidate onSubmit={submitExpenses}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">02</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink" id="budget-step-2-heading" tabIndex={-1}>{labels.step2Title}</h2>
          <BudgetExpensesStep
            currency={currency}
            errors={errors}
            locale={locale}
            mainDrafts={mainDrafts}
            nonMonthlyDrafts={nonMonthlyDrafts}
            onAddNonMonthly={addNonMonthly}
            onAddSmall={addSmall}
            onMainField={mainFieldHandlers}
            onNonMonthlyAmount={nonMonthlyAmountHandlers}
            onNonMonthlyChange={(id, patch) => setNonMonthlyDrafts((current) => current.map((expense) => expense.id === id ? { ...expense, ...patch } : expense))}
            onRemoveNonMonthly={removeNonMonthly}
            onRemoveSmall={removeSmall}
            onSmallAmount={smallAmountHandlers}
            onSmallChange={(id, patch) => setSmallDrafts((current) => current.map((expense) => expense.id === id ? { ...expense, ...patch } : expense))}
            smallDrafts={smallDrafts}
          />
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button className="rounded-[4px] border border-line bg-white px-5 py-2.5 text-sm font-semibold text-petrol transition hover:border-petrol" onClick={() => { setErrors({}); setStep(1); }} type="button">
              {labels.back}
            </button>
            <button className="rounded-[4px] border border-petrol bg-petrol px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol" type="submit">
              {labels.nextResult}
            </button>
          </div>
        </form>
      ) : null}

      {step === 3 && result ? (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">03</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink" id="budget-step-3-heading" tabIndex={-1}>{labels.step3Title}</h2>
          <BudgetResults currency={currency} locale={locale} result={result} />
          {mainDrafts.savingInvestment.minorUnits !== null && mainDrafts.savingInvestment.minorUnits > 0 ? (
            <BudgetCurrentClassification
              classification={currentClassification}
              currency={currency}
              locale={locale}
              onChange={setCurrentClassification}
              savingInvestmentMinor={mainDrafts.savingInvestment.minorUnits}
            />
          ) : null}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button className="rounded-[4px] border border-line bg-white px-5 py-2.5 text-sm font-semibold text-petrol transition hover:border-petrol" onClick={() => { setErrors({}); setStep(2); }} type="button">
              {labels.back}
            </button>
            <button className="rounded-[4px] border border-petrol bg-petrol px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol" onClick={openTargetAllocation} type="button">
              {locale === "es" ? "Construir distribución objetivo" : "Build target allocation"}
            </button>
          </div>
        </div>
      ) : null}

      {step === 4 && result && currentInput ? (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">04</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink" id="budget-step-4-heading" tabIndex={-1}>{targetLabels.allocationTitle}</h2>
          {targetInitializationError ? (
            <p className="mt-6 border border-red-700/40 bg-red-50 p-4 text-sm leading-6 text-red-900" role="alert">
              {targetInitializationError}
            </p>
          ) : (
            <BudgetTargetStep
              allocation={targetAllocation}
              classification={currentClassification}
              coverageBaseMinor={result.essentialsAndDebtMinor}
              currency={currency}
              currentInput={currentInput}
              emergencyFundMinor={result.emergencyFundMinor}
              emergencyPlan={emergencyPlan}
              locale={locale}
              onAllocationChange={(allocation) => {
                setTargetAllocation(allocation);
                setTargetAllocationLifecycle((current) => (
                  transitionTargetAllocationLifecycle(current, "edit")
                ));
              }}
              onEmergencyPlanChange={setEmergencyPlan}
              onReserveChange={setContingencyReserve}
              onReserveChoiceChange={setContingencyReserveChoice}
              onReserveDraftChange={setContingencyReserveDraft}
              onSerGivingChange={setSerGiving}
              reserve={contingencyReserve}
              reserveChoice={contingencyReserveChoice}
              reserveDraft={contingencyReserveDraft}
              serGiving={serGiving}
            />
          )}
          <div className="mt-6">
            <button className="rounded-[4px] border border-line bg-white px-5 py-2.5 text-sm font-semibold text-petrol transition hover:border-petrol" onClick={() => setStep(3)} type="button">
              {targetLabels.backToStartingPoint}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
