"use client";

import { useState } from "react";
import { BudgetAllocationControl } from "@/components/budget/BudgetAllocationControl";
import { BudgetEmergencyFundTarget } from "@/components/budget/BudgetEmergencyFundTarget";
import { budgetTargetCopy } from "@/components/budget/budget-target-copy";
import {
  splitCurrentSaving,
} from "@/lib/personal-finance/budget/target-calculations";
import {
  allocationCategories,
  type AllocationCategory,
  type BudgetTargetSnapshot,
  type ContingencyReserve,
  type CurrentAllocationInput,
  type EmergencyFundPlan,
  type SerGivingBreakdown,
  type TargetAllocation,
} from "@/lib/personal-finance/budget/target-types";
import type {
  BudgetCurrency,
  BudgetLocale,
} from "@/lib/personal-finance/budget/types";
import { formatTargetMoney } from "@/lib/personal-finance/budget/target-formatting";
import {
  formatBasisPoints,
  parseLocalizedPercentage,
} from "@/lib/personal-finance/budget/target-validation";

function controlNumber(value: bigint) {
  if (value < BigInt(0) || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Minor-unit value is outside the control range");
  }
  return Number(value);
}

export function BudgetTargetStep({
  allocation,
  currency,
  currentInput,
  emergencyPlan,
  locale,
  onAllocationChange,
  onEmergencyPlanChange,
  onReserveChange,
  onReserveChoiceChange,
  onReserveDraftChange,
  onSerGivingChange,
  onValidationChange,
  reserveChoice,
  reserveDraft,
  serGiving,
  snapshot,
}: {
  allocation: TargetAllocation;
  currency: BudgetCurrency;
  currentInput: CurrentAllocationInput;
  emergencyPlan: EmergencyFundPlan;
  locale: BudgetLocale;
  onAllocationChange: (allocation: TargetAllocation) => void;
  onEmergencyPlanChange: (plan: EmergencyFundPlan) => void;
  onReserveChange: (reserve: ContingencyReserve) => void;
  onReserveChoiceChange: (choice: ContingencyReserve["kind"]) => void;
  onReserveDraftChange: (draft: string) => void;
  onSerGivingChange: (breakdown: SerGivingBreakdown) => void;
  onValidationChange: (key: string, invalid: boolean) => void;
  reserveChoice: ContingencyReserve["kind"];
  reserveDraft: string;
  serGiving: SerGivingBreakdown;
  snapshot: BudgetTargetSnapshot;
}) {
  const labels = budgetTargetCopy[locale];
  const [serDraft, setSerDraft] = useState(() => (
    serGiving.kind === "split"
      ? formatBasisPoints(serGiving.serShareBasisPoints, locale)
      : ""
  ));
  const [serError, setSerError] = useState<string | null>(null);
  const amounts = snapshot.amounts;
  const sumCopy = snapshot.status === "exact"
    ? labels.sumExact
    : snapshot.status === "under"
      ? labels.sumUnder(
          formatBasisPoints(snapshot.allocatedBasisPoints, locale),
          formatBasisPoints(snapshot.remainingBasisPoints, locale),
        )
      : labels.sumOver(
          formatBasisPoints(snapshot.allocatedBasisPoints, locale),
          formatBasisPoints(snapshot.excessBasisPoints, locale),
        );
  const parsedSer = parseLocalizedPercentage(serDraft, locale);
  const provisionalSer = parsedSer.error === null && parsedSer.basisPoints !== null
    ? splitCurrentSaving(controlNumber(amounts.serAndGiving), parsedSer.basisPoints)
    : null;
  const appliedSer = snapshot.serGivingAmounts
    ? {
        givingMinor: snapshot.serGivingAmounts.givingMinor,
        serMinor: snapshot.serGivingAmounts.serMinor,
      }
    : null;
  const serGivingHasTotal = amounts.serAndGiving > BigInt(0);
  const visibleSer = serGivingHasTotal
    ? provisionalSer?.status === "ok"
      ? {
          givingMinor: BigInt(provisionalSer.value.clfMinor),
          serMinor: BigInt(provisionalSer.value.alpMinor),
        }
      : appliedSer
    : null;

  function setValidation(key: string, invalid: boolean) {
    onValidationChange(key, invalid);
  }

  function applySerBreakdown() {
    if (parsedSer.error || parsedSer.basisPoints === null) {
      setSerError(labels.percentageError);
      setValidation("serBreakdown", true);
      return;
    }
    if (!serGivingHasTotal) return;
    setSerError(null);
    setValidation("serBreakdown", false);
    onSerGivingChange({
      kind: "split",
      serShareBasisPoints: parsedSer.basisPoints,
    });
  }

  return (
    <div className="mt-6 min-w-0">
      <p className="max-w-4xl text-sm leading-6 text-muted">{labels.allocationIntro}</p>
      <p className="mt-3 max-w-4xl border-l-2 border-brass bg-white/75 px-4 py-3 text-sm leading-6 text-ink">{labels.allocationStartingPoint}</p>
      <details className="mt-3 max-w-4xl border-l border-petrol/30 pl-3">
        <summary className="cursor-pointer text-sm font-semibold text-petrol">{labels.categoryDetails}</summary>
        <p className="mt-2 text-sm leading-6 text-muted">{labels.allocationHelp}</p>
      </details>

      <div className="mt-6">
        <BudgetEmergencyFundTarget
          currency={currency}
          incomeMinor={currentInput.incomeMinor}
          locale={locale}
          onPlanChange={onEmergencyPlanChange}
          onReserveChange={onReserveChange}
          onReserveChoiceChange={onReserveChoiceChange}
          onReserveDraftChange={onReserveDraftChange}
          onValidationChange={setValidation}
          plan={emergencyPlan}
          reserveChoice={reserveChoice}
          reserveDraft={reserveDraft}
          snapshot={snapshot}
        />
      </div>

      <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-2">
        {allocationCategories.map((category: AllocationCategory) => (
          <BudgetAllocationControl
            amountMinor={controlNumber(amounts[category])}
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
            onCommit={() => undefined}
            onValidationChange={(invalid) => setValidation(category, invalid)}
          />
        ))}
      </div>

      <details className="mt-5 rounded-[6px] border border-line bg-white/70 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-petrol">{labels.serGivingSummary}</summary>
        <p className="mt-3 text-sm leading-6 text-muted" id="budget-target-ser-help">{labels.serGivingHelp}</p>
        {!serGivingHasTotal ? (
          <p className="mt-3 text-sm font-semibold leading-6 text-muted" id="budget-target-ser-zero">{labels.serGivingZero}</p>
        ) : null}
        <label className="mt-4 grid max-w-md gap-2" htmlFor="budget-target-ser-share">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">SER</span>
          <span className="relative">
            <input
              aria-describedby={`budget-target-ser-help${!serGivingHasTotal ? " budget-target-ser-zero" : ""}${serError ? " budget-target-ser-error" : ""}`}
              aria-invalid={Boolean(serError)}
              aria-label={locale === "es" ? "Porcentaje de SER" : "SER percentage"}
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
            <p className="border border-line bg-panelSoft p-3 text-sm"><span className="font-semibold text-ink">SER: </span>{formatTargetMoney(visibleSer.serMinor, locale, currency)}</p>
            <p className="border border-line bg-panelSoft p-3 text-sm"><span className="font-semibold text-ink">{locale === "es" ? "Donación" : "Giving"}: </span>{formatTargetMoney(visibleSer.givingMinor, locale, currency)}</p>
          </div>
        ) : null}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            className="rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol disabled:cursor-not-allowed disabled:border-line disabled:bg-panelSoft disabled:text-muted"
            disabled={!serGivingHasTotal}
            onClick={applySerBreakdown}
            type="button"
          >
            {labels.applySerGiving}
          </button>
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

      <section className="mt-6 border-l-2 border-brass bg-white/75 px-4 py-4">
        <p className="text-sm font-semibold leading-6 text-ink">{sumCopy[0]}</p>
        <p className="mt-1 text-sm leading-6 text-muted">{sumCopy[1]}</p>
      </section>

      {snapshot.essentialsShortfall?.status === "ok" && snapshot.essentialsShortfall.amountMinor! > BigInt(0) ? (
        <p className="mt-4 border-l-2 border-red-700 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900">
          {labels.essentialsShortfall(
            formatTargetMoney(snapshot.essentialsShortfall.amountMinor!, locale, currency),
            snapshot.essentialsShortfall.basisPoints === null
              ? "—"
              : `${formatBasisPoints(snapshot.essentialsShortfall.basisPoints, locale)} %`,
          )}
        </p>
      ) : null}

      {snapshot.alpBaseMinor !== null ? (
        <div className="mt-4 border border-line bg-panelSoft p-4">
          <p className="text-sm font-semibold text-ink">{labels.alpBaseLabel}: {formatTargetMoney(snapshot.alpBaseMinor, locale, currency)}</p>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-semibold text-petrol">{labels.categoryDetails}</summary>
            <p className="mt-2 text-xs leading-5 text-muted">{labels.alpBaseHelp}</p>
          </details>
          {snapshot.alpShortfall?.status === "ok" && snapshot.alpShortfall.amountMinor! > BigInt(0) ? (
            <p className="mt-3 text-sm leading-6 text-red-900">{labels.alpShortfall(formatTargetMoney(snapshot.alpShortfall.amountMinor!, locale, currency))}</p>
          ) : null}
        </div>
      ) : null}

      <p className="mt-6 max-w-4xl text-xs leading-5 text-muted">{labels.privacy}</p>
    </div>
  );
}
