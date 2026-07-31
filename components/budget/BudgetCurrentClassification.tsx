"use client";

import { useState, type SyntheticEvent } from "react";
import { budgetTargetCopy } from "@/components/budget/budget-target-copy";
import { splitCurrentSaving } from "@/lib/personal-finance/budget/target-calculations";
import type { SavingsCurrentClassification } from "@/lib/personal-finance/budget/target-types";
import type {
  BudgetCurrency,
  BudgetLocale,
} from "@/lib/personal-finance/budget/types";
import { formatMoney } from "@/lib/personal-finance/budget/validation";
import {
  formatBasisPoints,
  parseLocalizedPercentage,
} from "@/lib/personal-finance/budget/target-validation";

export function BudgetCurrentClassification({
  classification,
  currency,
  locale,
  onChange,
  savingInvestmentMinor,
}: {
  classification: SavingsCurrentClassification;
  currency: BudgetCurrency;
  locale: BudgetLocale;
  onChange: (classification: SavingsCurrentClassification) => void;
  savingInvestmentMinor: number;
}) {
  const labels = budgetTargetCopy[locale];
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const parsed = parseLocalizedPercentage(draft, locale);
  const provisionalSplit = parsed.error === null && parsed.basisPoints !== null
    ? splitCurrentSaving(savingInvestmentMinor, parsed.basisPoints)
    : null;
  const appliedSplit = classification.kind === "split"
    ? splitCurrentSaving(savingInvestmentMinor, classification.alpShareBasisPoints)
    : null;

  function handleToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    if (
      event.currentTarget.open
      && draft === ""
      && classification.kind === "split"
    ) {
      setDraft(formatBasisPoints(classification.alpShareBasisPoints, locale));
    }
  }

  function apply() {
    if (parsed.error || parsed.basisPoints === null) {
      setError(labels.percentageError);
      return;
    }
    setError(null);
    onChange({ alpShareBasisPoints: parsed.basisPoints, kind: "split" });
  }

  function clear(event: React.MouseEvent<HTMLButtonElement>) {
    setDraft("");
    setError(null);
    onChange({ kind: "unclassified" });
    event.currentTarget.closest("details")?.removeAttribute("open");
  }

  const visibleSplit = provisionalSplit?.status === "ok"
    ? provisionalSplit.value
    : appliedSplit?.status === "ok" ? appliedSplit.value : null;

  return (
    <section aria-labelledby="budget-current-classification-title" className="mt-6 border border-line bg-white/60 p-4 md:p-5">
      <h3 className="text-lg font-semibold text-ink" id="budget-current-classification-title">
        {labels.classificationTitle}
      </h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{labels.classificationDescription}</p>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <p>
          <span className="font-semibold text-ink">{labels.classificationTotal}: </span>
          <span className="text-muted">{formatMoney(savingInvestmentMinor, locale, currency)}</span>
        </p>
        <p className="text-muted">
          {classification.kind === "unclassified"
            ? labels.classificationUnclassified
            : `${formatBasisPoints(classification.alpShareBasisPoints, locale)} % ALP`}
        </p>
      </div>

      <details className="mt-4 border-t border-line pt-4" onToggle={handleToggle}>
        <summary className="cursor-pointer text-sm font-semibold text-petrol">{labels.classificationOpen}</summary>
        <div className="mt-4 max-w-xl">
          <label className="grid gap-2" htmlFor="budget-current-alp-share">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              {labels.classificationQuestion}
            </span>
            <span className="relative">
              <input
                aria-describedby={`budget-current-alp-help${error ? " budget-current-alp-error" : ""}`}
                aria-invalid={Boolean(error)}
                className="w-full rounded-[4px] border border-line bg-white px-3 py-2.5 pr-9 text-sm font-semibold text-ink outline-none transition focus:border-petrol aria-[invalid=true]:border-red-700"
                id="budget-current-alp-share"
                inputMode="decimal"
                onChange={(event) => {
                  setDraft(event.target.value);
                  setError(null);
                }}
                type="text"
                value={draft}
              />
              <span aria-hidden="true" className="pointer-events-none absolute right-3 top-2.5 text-sm text-muted">%</span>
            </span>
          </label>
          <p className="mt-2 text-sm leading-6 text-muted" id="budget-current-alp-help">{labels.classificationHelp}</p>
          {error ? <p className="mt-2 text-sm text-red-800" id="budget-current-alp-error">{error}</p> : null}

          {visibleSplit ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <p className="border border-line bg-panelSoft p-3 text-sm">
                <span className="block font-semibold text-ink">
                  {locale === "es" ? "ALP — Previsión y estabilidad" : "ALP — Planning and stability"}
                </span>
                <span className="mt-1 block text-muted">{formatMoney(visibleSplit.alpMinor, locale, currency)}</span>
              </p>
              <p className="border border-line bg-panelSoft p-3 text-sm">
                <span className="block font-semibold text-ink">{labels.clfLabel}</span>
                <span className="mt-1 block text-muted">{formatMoney(visibleSplit.clfMinor, locale, currency)}</span>
              </p>
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button className="rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol" onClick={apply} type="button">
              {labels.applyClassification}
            </button>
            <button className="rounded-[4px] border border-line bg-white px-4 py-2.5 text-sm font-semibold text-petrol transition hover:border-petrol" onClick={clear} type="button">
              {labels.keepUndifferentiated}
            </button>
          </div>
          <p className="mt-4 text-xs leading-5 text-muted">{labels.classificationPrivacy}</p>
        </div>
      </details>
    </section>
  );
}
