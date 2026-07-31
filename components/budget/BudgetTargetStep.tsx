"use client";

import { useState } from "react";
import { BudgetAllocationComparison } from "@/components/budget/BudgetAllocationComparison";
import { BudgetAllocationControl } from "@/components/budget/BudgetAllocationControl";
import { BudgetEmergencyFundTarget } from "@/components/budget/BudgetEmergencyFundTarget";
import { budgetTargetCopy } from "@/components/budget/budget-target-copy";
import {
  allocationSumState,
  buildAllocationComparison,
  calculateAlpBase,
  calculateEmergencyFundProjection,
  calculateShortfall,
  classifyCurrentAllocation,
  contingencyReserveAmount,
  reconcileAllocationAmounts,
  splitCurrentSaving,
} from "@/lib/personal-finance/budget/target-calculations";
import {
  allocationCategories,
  type AllocationCategory,
  type ContingencyReserve,
  type CurrentAllocationInput,
  type EmergencyFundPlan,
  type SavingsCurrentClassification,
  type SerGivingBreakdown,
  type TargetAllocation,
} from "@/lib/personal-finance/budget/target-types";
import type {
  BudgetCurrency,
  BudgetLocale,
} from "@/lib/personal-finance/budget/types";
import { formatMoney } from "@/lib/personal-finance/budget/validation";
import {
  formatBasisPoints,
  parseLocalizedPercentage,
} from "@/lib/personal-finance/budget/target-validation";

export function BudgetTargetStep({
  allocation,
  classification,
  coverageBaseMinor,
  currency,
  currentInput,
  emergencyFundMinor,
  emergencyPlan,
  locale,
  onAllocationChange,
  onEmergencyPlanChange,
  onReserveChange,
  onSerGivingChange,
  reserve,
  serGiving,
}: {
  allocation: TargetAllocation;
  classification: SavingsCurrentClassification;
  coverageBaseMinor: number;
  currency: BudgetCurrency;
  currentInput: CurrentAllocationInput;
  emergencyFundMinor: number;
  emergencyPlan: EmergencyFundPlan;
  locale: BudgetLocale;
  onAllocationChange: (allocation: TargetAllocation) => void;
  onEmergencyPlanChange: (plan: EmergencyFundPlan) => void;
  onReserveChange: (reserve: ContingencyReserve) => void;
  onSerGivingChange: (breakdown: SerGivingBreakdown) => void;
  reserve: ContingencyReserve;
  serGiving: SerGivingBreakdown;
}) {
  const labels = budgetTargetCopy[locale];
  const [invalidControls, setInvalidControls] = useState<Record<string, boolean>>({});
  const [liveMessage, setLiveMessage] = useState("");
  const [serDraft, setSerDraft] = useState(() => (
    serGiving.kind === "split"
      ? formatBasisPoints(serGiving.serShareBasisPoints, locale)
      : ""
  ));
  const [serError, setSerError] = useState<string | null>(null);
  const amountsResult = reconcileAllocationAmounts(currentInput.incomeMinor, allocation);
  const amounts = amountsResult.status === "ok" ? amountsResult.value : null;
  const projection = calculateEmergencyFundProjection(
    emergencyPlan,
    coverageBaseMinor,
    emergencyFundMinor,
  );
  const reserveResult = contingencyReserveAmount(reserve, currentInput.incomeMinor);
  const alpBaseResult = reserveResult.status === "ok"
    ? calculateAlpBase(currentInput.monthlyNonMonthlyMinor, reserveResult.value, projection)
    : reserveResult;
  const essentialsShortfall = amounts
    ? calculateShortfall(
        coverageBaseMinor,
        amounts.essentials,
        currentInput.incomeMinor,
      )
    : null;
  const alpShortfall = amounts && alpBaseResult.status === "ok"
    ? calculateShortfall(
        alpBaseResult.value,
        amounts.alp,
        currentInput.incomeMinor,
      )
    : null;
  const sumState = allocationSumState(allocation, {
    hasAlpShortfall: Boolean(alpShortfall?.amountMinor),
    hasEssentialsShortfall: Boolean(essentialsShortfall?.amountMinor),
    hasValidationErrors: Object.values(invalidControls).some(Boolean),
  });
  const current = classifyCurrentAllocation(currentInput, classification);
  const comparison = amounts
    ? buildAllocationComparison(current, allocation, amounts)
    : [];
  const sumCopy = sumState.status === "exact"
    ? labels.sumExact
    : sumState.status === "under"
      ? labels.sumUnder(
          formatBasisPoints(sumState.allocatedBasisPoints, locale),
          formatBasisPoints(sumState.remainingBasisPoints, locale),
        )
      : labels.sumOver(
          formatBasisPoints(sumState.allocatedBasisPoints, locale),
          formatBasisPoints(sumState.excessBasisPoints, locale),
        );
  const parsedSer = parseLocalizedPercentage(serDraft, locale);
  const provisionalSer = parsedSer.error === null && parsedSer.basisPoints !== null
    && amounts
    ? splitCurrentSaving(amounts.serAndGiving, parsedSer.basisPoints)
    : null;
  const appliedSer = serGiving.kind === "split" && amounts
    ? splitCurrentSaving(amounts.serAndGiving, serGiving.serShareBasisPoints)
    : null;
  const visibleSer = provisionalSer?.status === "ok"
    ? provisionalSer.value
    : appliedSer?.status === "ok" ? appliedSer.value : null;

  function setValidation(key: string, invalid: boolean) {
    setInvalidControls((currentErrors) => ({
      ...currentErrors,
      [key]: invalid,
    }));
  }

  function announceTotal() {
    setLiveMessage(`${sumCopy[0]} ${sumCopy[1]}`);
  }

  function applySerBreakdown() {
    if (parsedSer.error || parsedSer.basisPoints === null) {
      setSerError(labels.percentageError);
      setValidation("serBreakdown", true);
      return;
    }
    setSerError(null);
    setValidation("serBreakdown", false);
    onSerGivingChange({
      kind: "split",
      serShareBasisPoints: parsedSer.basisPoints,
    });
  }

  if (!amounts) {
    return (
      <p className="mt-6 text-sm text-red-800">
        {locale === "es"
          ? "No se puede calcular la distribución dentro del rango seguro."
          : "The allocation cannot be calculated within the safe range."}
      </p>
    );
  }

  return (
    <div className="mt-6 min-w-0">
      <p className="max-w-4xl text-sm leading-6 text-muted">{labels.allocationIntro}</p>
      <p className="mt-3 max-w-4xl border-l border-petrol/30 pl-3 text-sm leading-6 text-muted">{labels.allocationHelp}</p>

      <div className="mt-6">
        <BudgetEmergencyFundTarget
          coverageBaseMinor={coverageBaseMinor}
          currency={currency}
          emergencyFundMinor={emergencyFundMinor}
          incomeMinor={currentInput.incomeMinor}
          locale={locale}
          onPlanChange={onEmergencyPlanChange}
          onReserveChange={onReserveChange}
          onValidationChange={setValidation}
          plan={emergencyPlan}
          reserve={reserve}
        />
      </div>

      <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-2">
        {allocationCategories.map((category: AllocationCategory) => (
          <BudgetAllocationControl
            amountMinor={amounts[category]}
            basisPoints={allocation[category]}
            category={category}
            currency={currency}
            incomeMinor={currentInput.incomeMinor}
            key={category}
            locale={locale}
            onBasisPointsChange={(basisPoints) => onAllocationChange({
              ...allocation,
              [category]: basisPoints,
            })}
            onCommit={announceTotal}
            onValidationChange={(invalid) => setValidation(category, invalid)}
          />
        ))}
      </div>

      <details className="mt-5 rounded-[6px] border border-line bg-white/70 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-petrol">{labels.serGivingSummary}</summary>
        <p className="mt-3 text-sm leading-6 text-muted">{labels.serGivingHelp}</p>
        <label className="mt-4 grid max-w-md gap-2" htmlFor="budget-target-ser-share">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">SER</span>
          <span className="relative">
            <input
              aria-describedby={serError ? "budget-target-ser-error" : undefined}
              aria-invalid={Boolean(serError)}
              className="w-full rounded-[4px] border border-line bg-white px-3 py-2.5 pr-9 text-sm font-semibold text-ink outline-none focus:border-petrol aria-[invalid=true]:border-red-700"
              id="budget-target-ser-share"
              inputMode="decimal"
              onChange={(event) => {
                setSerDraft(event.target.value);
                setSerError(null);
                setValidation("serBreakdown", false);
              }}
              type="text"
              value={serDraft}
            />
            <span aria-hidden="true" className="pointer-events-none absolute right-3 top-2.5 text-sm text-muted">%</span>
          </span>
          {serError ? <span className="text-sm text-red-800" id="budget-target-ser-error">{serError}</span> : null}
        </label>
        {visibleSer ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <p className="border border-line bg-panelSoft p-3 text-sm"><span className="font-semibold text-ink">SER: </span>{formatMoney(visibleSer.alpMinor, locale, currency)}</p>
            <p className="border border-line bg-panelSoft p-3 text-sm"><span className="font-semibold text-ink">{locale === "es" ? "Donación" : "Giving"}: </span>{formatMoney(visibleSer.clfMinor, locale, currency)}</p>
          </div>
        ) : null}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button className="rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol" onClick={applySerBreakdown} type="button">{labels.applySerGiving}</button>
          <button
            className="rounded-[4px] border border-line bg-white px-4 py-2.5 text-sm font-semibold text-petrol transition hover:border-petrol"
            onClick={() => {
              setSerDraft("");
              setSerError(null);
              setValidation("serBreakdown", false);
              onSerGivingChange({ kind: "closed" });
            }}
            type="button"
          >
            {serGiving.kind === "split" ? labels.removeBreakdown : labels.keepCombined}
          </button>
        </div>
      </details>

      <section aria-live="polite" className="mt-6 border-l-2 border-brass bg-white/75 px-4 py-4">
        <p className="text-sm font-semibold leading-6 text-ink">{sumCopy[0]}</p>
        <p className="mt-1 text-sm leading-6 text-muted">{sumCopy[1]}</p>
      </section>
      <div aria-atomic="true" aria-live="polite" className="sr-only" role="status">{liveMessage}</div>

      {essentialsShortfall?.status === "ok" && essentialsShortfall.amountMinor > 0 ? (
        <p className="mt-4 border-l-2 border-red-700 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900">
          {labels.essentialsShortfall(
            formatMoney(essentialsShortfall.amountMinor, locale, currency),
            essentialsShortfall.basisPoints === null
              ? "—"
              : `${formatBasisPoints(essentialsShortfall.basisPoints, locale)} %`,
          )}
        </p>
      ) : null}

      {alpBaseResult.status === "ok" ? (
        <div className="mt-4 border border-line bg-panelSoft p-4">
          <p className="text-sm font-semibold text-ink">{labels.alpBaseLabel}: {formatMoney(alpBaseResult.value, locale, currency)}</p>
          <p className="mt-2 text-xs leading-5 text-muted">{labels.alpBaseHelp}</p>
          {alpShortfall?.status === "ok" && alpShortfall.amountMinor > 0 ? (
            <p className="mt-3 text-sm leading-6 text-red-900">{labels.alpShortfall(formatMoney(alpShortfall.amountMinor, locale, currency))}</p>
          ) : null}
        </div>
      ) : null}

      <BudgetAllocationComparison
        currency={currency}
        locale={locale}
        rows={comparison}
        smallExpensesMinor={currentInput.smallExpensesMinor}
      />
      <p className="mt-6 max-w-4xl text-xs leading-5 text-muted">{labels.privacy}</p>
    </div>
  );
}
