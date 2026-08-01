"use client";

import { useState } from "react";
import { budgetTargetCopy } from "@/components/budget/budget-target-copy";
import type {
  BudgetTargetSnapshot,
  ContingencyReserve,
  EmergencyFundPlan,
} from "@/lib/personal-finance/budget/target-types";
import { formatTargetMoney } from "@/lib/personal-finance/budget/target-formatting";
import type {
  BudgetCurrency,
  BudgetLocale,
} from "@/lib/personal-finance/budget/types";
import {
  parseLocalizedMoney,
} from "@/lib/personal-finance/budget/validation";
import {
  formatBasisPoints,
  parseBoundedInteger,
  parseLocalizedPercentage,
} from "@/lib/personal-finance/budget/target-validation";

function initialTargetChoice(plan: EmergencyFundPlan) {
  if (plan.target.kind === "unset") return "unset";
  if (plan.target.kind === "custom") return "custom";
  return String(plan.target.months);
}

export function BudgetEmergencyFundTarget({
  currency,
  incomeMinor,
  locale,
  onPlanChange,
  onReserveChange,
  onReserveChoiceChange,
  onReserveDraftChange,
  onValidationChange,
  plan,
  reserveChoice,
  reserveDraft,
  snapshot,
}: {
  currency: BudgetCurrency;
  incomeMinor: number;
  locale: BudgetLocale;
  onPlanChange: (plan: EmergencyFundPlan) => void;
  onReserveChange: (reserve: ContingencyReserve) => void;
  onReserveChoiceChange: (choice: ContingencyReserve["kind"]) => void;
  onReserveDraftChange: (draft: string) => void;
  onValidationChange: (key: "emergency" | "reserve", invalid: boolean) => void;
  plan: EmergencyFundPlan;
  reserveChoice: ContingencyReserve["kind"];
  reserveDraft: string;
  snapshot: BudgetTargetSnapshot;
}) {
  const labels = budgetTargetCopy[locale];
  const [targetChoice, setTargetChoice] = useState(initialTargetChoice(plan));
  const [customMonths, setCustomMonths] = useState(
    plan.target.kind === "custom" ? String(plan.target.months) : "",
  );
  const [deadline, setDeadline] = useState(
    plan.completionMonths === null ? "" : String(plan.completionMonths),
  );
  const [targetError, setTargetError] = useState<string | null>(null);
  const [deadlineError, setDeadlineError] = useState<string | null>(null);
  const [reserveError, setReserveError] = useState<string | null>(() => {
    if (reserveDraft.trim() === "") return null;
    if (reserveChoice === "percentage") {
      const parsed = parseLocalizedPercentage(reserveDraft, locale);
      return parsed.error || parsed.basisPoints === null
        ? labels.percentageError
        : null;
    }
    if (reserveChoice === "amount") {
      const parsed = parseLocalizedMoney(reserveDraft, locale, currency);
      if (parsed.error || parsed.minorUnits === null) {
        return locale === "es"
          ? "Introduce un importe válido."
          : "Enter a valid amount.";
      }
      return parsed.minorUnits > incomeMinor ? labels.amountAboveIncome : null;
    }
    return null;
  });
  const projection = snapshot.coverage;
  const reserveSnapshot = snapshot.reserve;
  const reserveEquivalentVisible = (
    reserveSnapshot.status === "defined"
    && reserveSnapshot.source === reserveChoice
    && (reserveSnapshot.source === "amount" || reserveSnapshot.source === "percentage")
  );

  function setPreset(value: string) {
    setTargetChoice(value);
    setTargetError(null);
    if (value === "unset") {
      onPlanChange({ completionMonths: null, target: { kind: "unset" } });
      setDeadline("");
      onValidationChange("emergency", false);
      return;
    }
    if (value === "custom") {
      if (customMonths === "") {
        onPlanChange({ ...plan, target: { kind: "unset" } });
        return;
      }
      const parsed = parseBoundedInteger(customMonths, 1, 120);
      if (parsed.error === null && parsed.value !== null) {
        onPlanChange({ ...plan, target: { kind: "custom", months: parsed.value } });
      }
      return;
    }
    onPlanChange({
      ...plan,
      target: {
        kind: "preset",
        months: Number(value) as 3 | 6 | 9 | 12,
      },
    });
    onValidationChange("emergency", false);
  }

  function changeCustom(raw: string) {
    setCustomMonths(raw);
    const parsed = parseBoundedInteger(raw, 1, 120);
    if (parsed.error || parsed.value === null) {
      setTargetError(
        locale === "es"
          ? "Introduce un número entero de meses entre 1 y 120."
          : "Enter a whole number of months from 1 to 120.",
      );
      onValidationChange("emergency", true);
      return;
    }
    setTargetError(null);
    onValidationChange("emergency", Boolean(deadlineError));
    onPlanChange({ ...plan, target: { kind: "custom", months: parsed.value } });
  }

  function changeDeadline(raw: string) {
    setDeadline(raw);
    const parsed = parseBoundedInteger(raw, 1, 600);
    if (raw.trim() === "") {
      setDeadlineError(null);
      onValidationChange("emergency", Boolean(targetError));
      onPlanChange({ ...plan, completionMonths: null });
      return;
    }
    if (parsed.error || parsed.value === null) {
      setDeadlineError(
        locale === "es"
          ? "Introduce un plazo entero entre 1 y 600 meses."
          : "Enter a whole-number deadline from 1 to 600 months.",
      );
      onValidationChange("emergency", true);
      return;
    }
    setDeadlineError(null);
    onValidationChange("emergency", Boolean(targetError));
    onPlanChange({ ...plan, completionMonths: parsed.value });
  }

  function changeReserveChoice(value: string) {
    onReserveChoiceChange(value as ContingencyReserve["kind"]);
    onReserveDraftChange("");
    setReserveError(null);
    onValidationChange("reserve", false);
    if (value === "unset") onReserveChange({ kind: "unset" });
    if (value === "none") onReserveChange({ kind: "none" });
    if (value === "amount" || value === "percentage") {
      onReserveChange({ kind: "unset" });
    }
  }

  function changeReserveDraft(raw: string) {
    onReserveDraftChange(raw);
    if (reserveChoice === "percentage") {
      const parsed = parseLocalizedPercentage(raw, locale);
      if (parsed.error || parsed.basisPoints === null) {
        setReserveError(labels.percentageError);
        onValidationChange("reserve", true);
        return;
      }
      setReserveError(null);
      onValidationChange("reserve", false);
      onReserveChange({ basisPoints: parsed.basisPoints, kind: "percentage" });
      return;
    }
    const parsed = parseLocalizedMoney(raw, locale, currency);
    if (parsed.error || parsed.minorUnits === null || parsed.minorUnits > incomeMinor) {
      setReserveError(
        parsed.minorUnits !== null && parsed.minorUnits > incomeMinor
          ? labels.amountAboveIncome
          : locale === "es" ? "Introduce un importe válido." : "Enter a valid amount.",
      );
      onValidationChange("reserve", true);
      return;
    }
    setReserveError(null);
    onValidationChange("reserve", false);
    onReserveChange({ amountMinor: parsed.minorUnits, kind: "amount" });
  }

  const coverageNumber = projection.currentCoverageBasisPoints !== null
    ? new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
        maximumFractionDigits: 2,
      }).format(projection.currentCoverageBasisPoints / 10_000)
    : "";

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-2">
      <fieldset className="min-w-0 rounded-[6px] border border-line bg-white/70 p-4 md:p-5">
        <legend className="px-1 text-lg font-semibold text-ink">{labels.coverageTitle}</legend>
        <p className="mt-2 text-sm leading-6 text-muted" id="budget-emergency-target-help">{labels.coverageHelp}</p>
        <label className="mt-4 grid gap-2" htmlFor="budget-emergency-target">
          <span className="sr-only">{labels.coverageTitle}</span>
          <select
            aria-describedby="budget-emergency-target-help"
            className="rounded-[4px] border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-petrol"
            id="budget-emergency-target"
            onChange={(event) => setPreset(event.target.value)}
            value={targetChoice}
          >
            {["unset", "3", "6", "9", "12", "custom"].map((value, index) => (
              <option key={value} value={value}>{labels.coverageOptions[index]}</option>
            ))}
          </select>
        </label>

        {targetChoice === "custom" ? (
          <label className="mt-4 grid gap-2" htmlFor="budget-emergency-custom-months">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{labels.customMonths}</span>
            <input
              aria-describedby={targetError ? "budget-emergency-custom-error" : undefined}
              aria-invalid={Boolean(targetError)}
              className="rounded-[4px] border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-petrol aria-[invalid=true]:border-red-700"
              id="budget-emergency-custom-months"
              inputMode="numeric"
              onChange={(event) => changeCustom(event.target.value)}
              type="text"
              value={customMonths}
            />
            {targetError ? <span className="text-sm text-red-800" id="budget-emergency-custom-error">{targetError}</span> : null}
          </label>
        ) : null}

        {targetChoice !== "unset" ? (
          <label className="mt-4 grid gap-2" htmlFor="budget-emergency-deadline">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{labels.coverageDeadline}</span>
            <input
              aria-describedby={`budget-emergency-deadline-help${deadlineError ? " budget-emergency-deadline-error" : ""}`}
              aria-invalid={Boolean(deadlineError)}
              className="rounded-[4px] border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-petrol aria-[invalid=true]:border-red-700"
              id="budget-emergency-deadline"
              inputMode="numeric"
              onChange={(event) => changeDeadline(event.target.value)}
              type="text"
              value={deadline}
            />
            <span className="text-xs leading-5 text-muted" id="budget-emergency-deadline-help">{labels.coverageDeadlineHelp}</span>
            {deadlineError ? <span className="text-sm text-red-800" id="budget-emergency-deadline-error">{deadlineError}</span> : null}
          </label>
        ) : null}

        {projection.status === "zero-base" ? <p className="mt-4 text-sm leading-6 text-muted">{labels.zeroBase}</p> : null}
        {projection.status === "rangeError" ? <p className="mt-4 text-sm text-red-800">{locale === "es" ? "El objetivo supera el rango calculable." : "The target exceeds the calculable range."}</p> : null}
        {projection.status === "calculated" ? (
          <p className="mt-4 border-l border-petrol/30 pl-3 text-sm leading-6 text-muted">
            {projection.shortfallMinor === BigInt(0)
              ? labels.coverageCovered
              : projection.monthlyContributionMinor === null
                ? labels.coverageMessage(
                    coverageNumber,
                    projection.targetMonths!,
                    formatTargetMoney(projection.shortfallMinor!, locale, currency),
                  )
                : labels.coverageMessageWithDeadline(
                    coverageNumber,
                    projection.targetMonths!,
                    plan.completionMonths!,
                    formatTargetMoney(projection.monthlyContributionMinor, locale, currency),
                  )}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="min-w-0 rounded-[6px] border border-line bg-white/70 p-4 md:p-5">
        <legend className="px-1 text-lg font-semibold text-ink">{labels.contingencyTitle}</legend>
        <p className="mt-2 text-sm leading-6 text-muted" id="budget-contingency-help">{labels.contingencyCopy}</p>
        <p className="mt-2 text-xs leading-5 text-muted">{labels.contingencyExamples}</p>
        <label className="mt-4 grid gap-2" htmlFor="budget-contingency-kind">
          <span className="sr-only">{labels.contingencyTitle}</span>
          <select
            aria-describedby="budget-contingency-help"
            className="rounded-[4px] border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-petrol"
            id="budget-contingency-kind"
            onChange={(event) => changeReserveChoice(event.target.value)}
            value={reserveChoice}
          >
            <option value="unset">{labels.contingencyUnset}</option>
            <option value="none">{labels.contingencyNone}</option>
            <option value="percentage">{labels.contingencyPercentage}</option>
            <option value="amount">{labels.contingencyAmount}</option>
          </select>
        </label>
        {reserveChoice === "amount" || reserveChoice === "percentage" ? (
          <label className="mt-4 grid gap-2" htmlFor="budget-contingency-value">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              {reserveChoice === "amount" ? labels.amount : labels.percentage}
            </span>
            <span className="relative">
              <input
                aria-describedby={`budget-contingency-help${reserveEquivalentVisible ? " budget-contingency-equivalent" : ""}${reserveError ? " budget-contingency-error" : ""}`}
                aria-invalid={Boolean(reserveError)}
                aria-label={reserveChoice === "amount"
                  ? labels.contingencyAmount
                  : `${labels.contingencyPercentage} (${labels.percentage})`}
                className={`w-full rounded-[4px] border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink outline-none focus:border-petrol aria-[invalid=true]:border-red-700 ${reserveChoice === "percentage" ? "pr-9" : ""}`}
                id="budget-contingency-value"
                inputMode="decimal"
                onChange={(event) => changeReserveDraft(event.target.value)}
                type="text"
                value={reserveDraft}
              />
              {reserveChoice === "percentage" ? (
                <span aria-hidden="true" className="pointer-events-none absolute right-3 top-2.5 text-sm text-muted">%</span>
              ) : null}
            </span>
            {reserveError ? <span className="text-sm text-red-800" id="budget-contingency-error">{reserveError}</span> : null}
          </label>
        ) : null}
        {reserveEquivalentVisible ? (
          <p className="mt-4 text-sm font-semibold text-ink" id="budget-contingency-equivalent">
            {reserveSnapshot.status === "defined" && reserveSnapshot.source === "percentage"
              ? `${labels.equivalentAmount}: ${formatTargetMoney(reserveSnapshot.amountMinor, locale, currency)}`
              : reserveSnapshot.status === "defined" && reserveSnapshot.source === "amount"
                ? `${labels.equivalentPercentage}: ${formatBasisPoints(reserveSnapshot.basisPoints, locale)} %`
                : null}
          </p>
        ) : null}
      </fieldset>
    </div>
  );
}
