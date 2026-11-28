"use client";

import { BudgetComposition, budgetCompositionColors } from "./BudgetComposition";
import { budgetCopy } from "./budget-copy";
import styles from "./BudgetEditorial.module.css";
import { useState } from "react";
import { budgetProjectionCopy } from "@/components/budget/budget-projection-copy";
import { budgetTargetCopy } from "@/components/budget/budget-target-copy";
import { projectBudgetScenario } from "@/lib/personal-finance/budget/projection-calculations";
import {
  buildBudgetProjectionHighlights,
  buildProjectedSerGivingBreakdown,
  buildProjectionAmountPresentation,
  selectProjectionFocusContext,
  selectVisibleProjectionComparison,
  type BudgetProjectionHighlight,
} from "@/lib/personal-finance/budget/projection-presentation";
import type {
  BudgetProjectionComparison,
  BudgetProjectionHorizonMonths,
  BudgetProjectionResult,
  BudgetProjectionScenarioId,
  MonthlyBudgetProjectionScenario,
} from "@/lib/personal-finance/budget/projection-types";
import { formatTargetMoney } from "@/lib/personal-finance/budget/target-formatting";
import {
  allocationCategories,
  type AllocationCategory,
  type SerGivingAmounts,
} from "@/lib/personal-finance/budget/target-types";
import { formatBasisPoints } from "@/lib/personal-finance/budget/target-validation";
import type {
  BudgetCurrency,
  BudgetLocale,
} from "@/lib/personal-finance/budget/types";

export type BudgetProjectionScenarios = Record<
  BudgetProjectionScenarioId,
  MonthlyBudgetProjectionScenario
>;

const scenarioOrder: BudgetProjectionScenarioId[] = [
  "current",
  "target",
  "educational5010",
];

const horizonOrder: BudgetProjectionHorizonMonths[] = [1, 12, 60];

function findCategory(
  result: BudgetProjectionResult | MonthlyBudgetProjectionScenario,
  category: AllocationCategory,
) {
  return result.categories.find((item) => item.category === category)!;
}

function signedMoney(
  amountMinor: bigint,
  locale: BudgetLocale,
  currency: BudgetCurrency,
) {
  const formatted = formatTargetMoney(amountMinor, locale, currency);
  return amountMinor > BigInt(0) ? `+${formatted}` : formatted;
}

function statusText(
  result: BudgetProjectionResult,
  locale: BudgetLocale,
) {
  const labels = budgetProjectionCopy[locale];
  if (result.allocationStatus === "over") return labels.statusOver;
  if (result.allocationStatus === "under") return labels.statusUnder;
  return labels.statusExact;
}

function ScenarioBar({ currency, locale, result, scale }: {
  currency: BudgetCurrency;
  locale: BudgetLocale;
  result: BudgetProjectionResult;
  scale: bigint;
}) {
  const labels = budgetProjectionCopy[locale];
  const targetLabels = budgetTargetCopy[locale];
  const segments = result.categories.map((category, index) => ({
    label: targetLabels.categories[category.category].name,
    amount: category.amountMinor ?? BigInt(0),
    color: budgetCompositionColors[index],
  }));
  segments.push({
    label: labels.undifferentiated,
    amount: result.undifferentiatedMinor,
    color: budgetCompositionColors[6],
  });
  return (
    <div className="min-w-0 border-b border-line pb-4">
      <BudgetComposition currency={currency} income={result.accumulatedIncomeMinor} label={labels.scenarioNames[result.scenarioId]} locale={locale} scale={scale} segments={segments} />
      <p className="mt-2 text-xs leading-5 text-muted">
        {statusText(result, locale)}
        {result.knowledgeStatus === "partial" ? ` · ${labels.partialInformation}. ${labels.partialExplanation}` : ""}
      </p>
    </div>
  );
}

function DifferenceValue({
  comparison,
  currency,
  locale,
}: {
  comparison: BudgetProjectionComparison["categories"][number];
  currency: BudgetCurrency;
  locale: BudgetLocale;
}) {
  const labels = budgetProjectionCopy[locale];
  if (comparison.comparability === "partial" || comparison.amountMinor === null) {
    return (
      <span className="block text-xs leading-5 text-muted">
        {labels.hiddenAmount} <span className="sr-only">{labels.differenceUnavailable}</span>
      </span>
    );
  }
  return (
    <span className="block text-xs font-semibold text-petrol">
      {signedMoney(comparison.amountMinor, locale, currency)}
    </span>
  );
}

function highlightText(
  highlight: BudgetProjectionHighlight,
  locale: BudgetLocale,
  currency: BudgetCurrency,
  horizon: BudgetProjectionHorizonMonths,
  comparisonScenarioId: BudgetProjectionScenarioId,
  baseScenarioId: BudgetProjectionScenarioId,
) {
  const labels = budgetProjectionCopy[locale];
  const targetLabels = budgetTargetCopy[locale];
  const comparisonScenario = labels.scenarioNames[comparisonScenarioId];
  const baseScenario = labels.scenarioNames[baseScenarioId];
  if (!("category" in highlight)) {
    const amount = formatTargetMoney(highlight.amountMinor, locale, currency);
    return highlight.kind === "unallocated"
      ? labels.unallocatedDifference(amount, comparisonScenario)
      : labels.excessDifference(amount, comparisonScenario);
  }
  const category = targetLabels.categories[highlight.category].name;
  if (highlight.kind === "partial") {
    return labels.partialDifference(category, comparisonScenario, baseScenario);
  }
  const amount = formatTargetMoney(highlight.amountMinor, locale, currency);
  if (highlight.kind === "categoryIncrease") {
    return labels.increaseDifference(
      category,
      amount,
      labels.horizons[horizon],
      comparisonScenario,
      baseScenario,
    );
  }
  if (highlight.kind === "categoryDecrease") {
    return labels.reduceDifference(
      category,
      amount,
      labels.horizons[horizon],
      comparisonScenario,
      baseScenario,
    );
  }
  return labels.zeroToPositiveDifference(
    category,
    amount,
    labels.horizons[horizon],
    comparisonScenario,
    baseScenario,
  );
}

function ProjectionAmountValue({
  currency,
  locale,
  value,
}: {
  currency: BudgetCurrency;
  locale: BudgetLocale;
  value: {
    amountMinor: bigint | null;
    knowledgeStatus: MonthlyBudgetProjectionScenario["categories"][number]["knowledgeStatus"];
  };
}) {
  const labels = budgetProjectionCopy[locale];
  const targetLabels = budgetTargetCopy[locale];
  const presentation = buildProjectionAmountPresentation(value);
  const status = targetLabels.statusLabels[presentation.knowledgeStatus];

  if (presentation.kind === "unavailable") {
    return (
      <span aria-label={`${status}. ${labels.hiddenAmount}`} className="block text-sm font-semibold text-muted">
        {status}<span aria-hidden="true"> · {labels.hiddenAmount}</span>
      </span>
    );
  }
  if (presentation.kind === "knownSubtotal") {
    return (
      <span
        aria-label={`${status}. ${labels.knownSubtotal}: ${formatTargetMoney(presentation.amountMinor, locale, currency)}. ${labels.partialExplanation}`}
        className="block text-sm text-muted"
      >
        <span className="block font-semibold">{status}</span>
        <span className="mt-1 block break-words">
          {labels.knownSubtotal}: {formatTargetMoney(presentation.amountMinor, locale, currency)}
        </span>
      </span>
    );
  }
  return (
    <span className="block break-words font-semibold text-ink">
      {formatTargetMoney(presentation.amountMinor, locale, currency)}
    </span>
  );
}

function FocusCategoryCard({
  accumulated,
  comparison,
  currency,
  description,
  horizonLabel,
  locale,
  monthly,
  scenarioLabel,
  title,
}: {
  accumulated: BudgetProjectionResult["categories"][number];
  comparison?: BudgetProjectionComparison["categories"][number];
  currency: BudgetCurrency;
  description: string;
  horizonLabel: string;
  locale: BudgetLocale;
  monthly: MonthlyBudgetProjectionScenario["categories"][number];
  scenarioLabel: string;
  title: string;
}) {
  const labels = budgetProjectionCopy[locale];
  const differenceIsPartial = comparison?.comparability === "partial"
    || comparison?.amountMinor === null;
  return (
    <article
      aria-label={`${title}. ${scenarioLabel}. ${horizonLabel}.`}
      className="min-w-0 border border-line bg-white/75 p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-petrol">
        {scenarioLabel} · {horizonLabel}
      </p>
      <h3 className="mt-2 text-xl font-semibold leading-tight text-ink">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="min-w-0 border border-line bg-panelSoft p-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{labels.monthlyAmount}</dt>
          <dd className="mt-2">
            <ProjectionAmountValue currency={currency} locale={locale} value={monthly} />
          </dd>
        </div>
        <div className="min-w-0 border border-line bg-panelSoft p-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{labels.accumulatedValue}</dt>
          <dd className="mt-2">
            <ProjectionAmountValue currency={currency} locale={locale} value={accumulated} />
          </dd>
        </div>
      </dl>
      <div className="mt-3 text-xs leading-5 text-muted">
        {!comparison ? (
          <p>{labels.noComparisonAvailable}</p>
        ) : differenceIsPartial ? (
          <>
            <p className="font-semibold text-ink">{labels.partialInformation}</p>
            <p>{labels.differenceUnavailable}</p>
          </>
        ) : (
          <p>
            <span className="font-semibold text-ink">{labels.knownDifference}: </span>
            <DifferenceValue comparison={comparison} currency={currency} locale={locale} />
          </p>
        )}
      </div>
    </article>
  );
}

export function BudgetProjection({
  currency,
  locale,
  onAdjust,
  onBackToReview,
  scenarios,
  serGivingAmounts,
}: {
  currency: BudgetCurrency;
  locale: BudgetLocale;
  onAdjust: () => void;
  onBackToReview: () => void;
  scenarios: BudgetProjectionScenarios;
  serGivingAmounts: SerGivingAmounts | null;
}) {
  const labels = budgetProjectionCopy[locale];
  const targetLabels = budgetTargetCopy[locale];
  const [horizon, setHorizon] = useState<BudgetProjectionHorizonMonths>(12);
  const [visible, setVisible] = useState<Record<BudgetProjectionScenarioId, boolean>>({
    current: true,
    educational5010: false,
    target: true,
  });

  const projected = Object.fromEntries(scenarioOrder.map((scenarioId) => [
    scenarioId,
    projectBudgetScenario(scenarios[scenarioId], horizon),
  ])) as Record<BudgetProjectionScenarioId, BudgetProjectionResult>;
  const comparisonSelection = selectVisibleProjectionComparison(projected, visible);
  const activeScenarios = comparisonSelection.activeScenarioIds;
  const commonScale = activeScenarios.reduce((max, scenarioId) => {
    const result = projected[scenarioId];
    const extent = result.totalAllocatedMinor > result.accumulatedIncomeMinor
      ? result.totalAllocatedMinor : result.accumulatedIncomeMinor;
    return extent > max ? extent : max;
  }, BigInt(0));
  const focusContext = selectProjectionFocusContext({ horizonMonths: horizon, visible });
  const primaryScenarioId = focusContext.scenarioId;
  const primaryResult = projected[primaryScenarioId];
  const primaryMonthly = scenarios[primaryScenarioId];
  const primaryComparison = comparisonSelection.comparisons[primaryScenarioId];
  const observationScenarioId = primaryComparison
    ? primaryScenarioId
    : activeScenarios.find((scenarioId) => (
        comparisonSelection.comparisons[scenarioId] !== undefined
      ));
  const observationComparison = observationScenarioId
    ? comparisonSelection.comparisons[observationScenarioId]
    : undefined;
  const highlights = observationScenarioId && observationComparison
    ? buildBudgetProjectionHighlights({
        base: projected[comparisonSelection.baseScenarioId],
        comparison: projected[observationScenarioId],
        difference: observationComparison,
      })
    : [];
  const educationAccumulated = findCategory(primaryResult, "education");
  const educationMonthly = findCategory(primaryMonthly, "education");
  const educationDifference = primaryComparison?.categories.find((item) => (
    item.category === "education"
  ));
  const serAccumulated = findCategory(primaryResult, "serAndGiving");
  const serMonthly = findCategory(primaryMonthly, "serAndGiving");
  const serDifference = primaryComparison?.categories.find((item) => (
    item.category === "serAndGiving"
  ));
  const serGivingBreakdown = buildProjectedSerGivingBreakdown({
    horizonMonths: horizon,
    monthlyBreakdown: serGivingAmounts,
    primaryScenarioId,
    result: primaryResult,
  });

  function toggleScenario(scenarioId: BudgetProjectionScenarioId) {
    setVisible((current) => {
      const visibleCount = scenarioOrder.filter((item) => current[item]).length;
      if (current[scenarioId] && visibleCount === 1) return current;
      return { ...current, [scenarioId]: !current[scenarioId] };
    });
  }

  return (
    <div className="min-w-0" aria-labelledby="budget-step-5-heading">
      <p className="max-w-4xl text-base leading-7 text-muted">{labels.introduction}</p>
      <p className="mt-4 max-w-5xl border-l-2 border-brass bg-white/75 px-4 py-4 text-sm leading-6 text-ink">
        {labels.disclaimer}
      </p>

      <details className={styles.ledgerDisclosure}>
        <summary className="cursor-pointer text-sm font-semibold text-petrol">{labels.assumptionsTitle}</summary>
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted md:grid-cols-2">
          {labels.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
          <li>{budgetCopy[locale].expenseCadence}</li>
        </ul>
      </details>

      <div className="mt-7 grid min-w-0 gap-6 lg:grid-cols-2">
        <fieldset className="min-w-0">
          <legend className="text-base font-semibold text-ink">{labels.selectHorizon}</legend>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={labels.selectHorizon}>
            {horizonOrder.map((value) => (
              <button
                aria-pressed={horizon === value}
                className={`rounded-[4px] border px-4 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol ${horizon === value ? "border-petrol bg-petrol text-white" : "border-line bg-white text-petrol hover:border-petrol"}`}
                key={value}
                onClick={() => setHorizon(value)}
                type="button"
              >
                {labels.horizons[value]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="min-w-0">
          <legend className="text-base font-semibold text-ink">{labels.selectScenarios}</legend>
          <p className="mt-1 text-xs leading-5 text-muted">{labels.scenarioDescription}</p>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={labels.selectScenarios}>
            {scenarioOrder.map((scenarioId) => {
              const onlyVisible = visible[scenarioId] && activeScenarios.length === 1;
              return (
                <button
                  aria-pressed={visible[scenarioId]}
                  className={`rounded-[4px] border px-3 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol disabled:cursor-not-allowed ${visible[scenarioId] ? "border-petrol bg-panelSoft text-petrol" : "border-line bg-white text-muted"}`}
                  disabled={onlyVisible}
                  key={scenarioId}
                  onClick={() => toggleScenario(scenarioId)}
                  type="button"
                >
                  {labels.scenarioNames[scenarioId]}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">{labels.educationalCopy}</p>
        </fieldset>
      </div>

      <figure className={styles.figure}>
        <figcaption>{labels.visualTitle} · {labels.horizons[horizon]}</figcaption>
        <p className={styles.figureCaption}>{labels.visualDescription}</p>
        {activeScenarios.map((scenarioId) => (
          <ScenarioBar currency={currency} key={scenarioId} locale={locale} result={projected[scenarioId]} scale={commonScale} />
        ))}
        <ul className={styles.legend} aria-label={labels.legend}>
          {allocationCategories.map((category, index) => (
            <li key={category}><i style={{ backgroundColor: budgetCompositionColors[index] }} /><span>{targetLabels.categories[category].name}</span></li>
          ))}
          {activeScenarios.some((scenarioId) => projected[scenarioId].undifferentiatedMinor > BigInt(0)) ? (
            <li><i style={{ backgroundColor: budgetCompositionColors[6] }} /><span>{labels.undifferentiated}</span></li>
          ) : null}
        </ul>
      </figure>

      <details className={styles.ledgerDisclosure}>
        <summary className="cursor-pointer text-sm font-semibold text-petrol">{labels.detailTitle}</summary>
        <p className="mt-2 text-sm leading-6 text-muted">{labels.detailDescription}</p>
        <div className="mt-4 border border-line" role="table" aria-label={labels.detailTitle}>
          <div
            className="hidden gap-3 border-b border-line bg-panelSoft px-4 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted lg:grid"
            role="row"
            style={{ gridTemplateColumns: `minmax(0,1.35fr) repeat(${activeScenarios.length},minmax(0,1fr))` }}
          >
            <span role="columnheader">{labels.category}</span>
            {activeScenarios.map((scenarioId) => <span key={scenarioId} role="columnheader">{labels.scenarioNames[scenarioId]}</span>)}
          </div>
          <div className="divide-y divide-line" role="rowgroup">
            {allocationCategories.map((category) => (
              <div
                className="block min-w-0 px-4 py-5 lg:grid lg:gap-3"
                key={category}
                role="row"
                style={{ gridTemplateColumns: `minmax(0,1.35fr) repeat(${activeScenarios.length},minmax(0,1fr))` }}
              >
                <div className="min-w-0" role="rowheader">
                  <span className="font-semibold leading-6 text-ink">{targetLabels.categories[category].name}</span>
                </div>
                <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 lg:contents">
                  {activeScenarios.map((scenarioId) => {
                    const value = findCategory(projected[scenarioId], category);
                    const comparison = comparisonSelection.comparisons[scenarioId];
                    const difference = comparison?.categories.find((item) => (
                      item.category === category
                    ));
                    const amountPresentation = buildProjectionAmountPresentation(value);
                    return (
                      <div className={`min-w-0 border p-3 ${scenarioId === "target" ? "border-brass bg-white" : "border-line bg-panelSoft"}`} key={scenarioId} role="cell">
                        <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-muted">{labels.scenarioNames[scenarioId]}</span>
                        {amountPresentation.kind === "exact" ? (
                          <>
                            <span className="mt-2 block break-words font-semibold text-ink">{formatTargetMoney(amountPresentation.amountMinor, locale, currency)}</span>
                            <span className="mt-1 block text-xs text-muted">{labels.monthlyShare}: {formatBasisPoints(value.basisPoints ?? 0, locale)} %</span>
                          </>
                        ) : (
                          <span className="mt-2 block">
                            <ProjectionAmountValue currency={currency} locale={locale} value={value} />
                          </span>
                        )}
                        {activeScenarios.length > 1 ? (
                          scenarioId === comparisonSelection.baseScenarioId ? (
                            <span className="mt-2 block text-[11px] text-muted">{labels.comparisonBase}</span>
                          ) : difference ? (
                            <>
                              <span className="mt-2 block text-[11px] text-muted">
                                {labels.changeFromScenario(labels.scenarioNames[comparisonSelection.baseScenarioId])}
                              </span>
                              <DifferenceValue comparison={difference} currency={currency} locale={locale} />
                            </>
                          ) : null
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </details>

      <section aria-labelledby="budget-projection-highlights-title" className="mt-9 border-l-2 border-brass bg-white/75 p-5">
        <h3 className="text-xl font-semibold text-ink" id="budget-projection-highlights-title">{labels.projectionHighlights}</h3>
        {observationScenarioId && observationComparison ? (
          <>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
              {labels.scenarioNames[observationScenarioId]} · {labels.comparedWith(labels.scenarioNames[comparisonSelection.baseScenarioId])}
            </p>
            {highlights.length > 0 ? (
              <ol className="mt-4 grid gap-3 text-sm leading-6 text-ink">
                {highlights.map((highlight, index) => (
                  <li className="border border-line bg-panelSoft p-3" key={`${highlight.kind}-${"category" in highlight ? highlight.category : index}`}>
                    {highlightText(
                      highlight,
                      locale,
                      currency,
                      horizon,
                      observationScenarioId,
                      comparisonSelection.baseScenarioId,
                    )}
                  </li>
                ))}
              </ol>
            ) : <p className="mt-3 text-sm leading-6 text-muted">{labels.noDifferences}</p>}
          </>
        ) : <p className="mt-3 text-sm leading-6 text-muted">{labels.noComparisonAvailable}</p>}
      </section>

      <div className="mt-9 grid min-w-0 gap-5 lg:grid-cols-2">
        <FocusCategoryCard
          accumulated={educationAccumulated}
          comparison={educationDifference}
          currency={currency}
          description={labels.educationText}
          horizonLabel={labels.horizons[horizon]}
          locale={locale}
          monthly={educationMonthly}
          scenarioLabel={labels.scenarioNames[primaryScenarioId]}
          title={labels.educationTitle}
        />
        <div className="min-w-0">
          <FocusCategoryCard
            accumulated={serAccumulated}
            comparison={serDifference}
            currency={currency}
            description={labels.serGivingText}
            horizonLabel={labels.horizons[horizon]}
            locale={locale}
            monthly={serMonthly}
            scenarioLabel={labels.scenarioNames[primaryScenarioId]}
            title={labels.serGivingTitle}
          />
          {serGivingBreakdown.status === "available" ? (
            <dl className="grid gap-3 border-x border-b border-line bg-panelSoft p-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{labels.serLabel}</dt>
                <dd className="mt-1 break-words font-semibold text-ink">{formatTargetMoney(serGivingBreakdown.accumulatedSerMinor, locale, currency)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">{labels.givingLabel}</dt>
                <dd className="mt-1 break-words font-semibold text-ink">{formatTargetMoney(serGivingBreakdown.accumulatedGivingMinor, locale, currency)}</dd>
              </div>
            </dl>
          ) : null}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button className="rounded-[4px] border border-petrol bg-petrol px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol" onClick={onBackToReview} type="button">
          {labels.backToReview}
        </button>
        <button className="rounded-[4px] border border-line bg-white px-5 py-2.5 text-sm font-semibold text-petrol transition hover:border-petrol focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol" onClick={onAdjust} type="button">
          {targetLabels.keepAdjusting}
        </button>
      </div>
      <p className="mt-6 max-w-4xl text-xs leading-5 text-muted">{labels.privacy}</p>
    </div>
  );
}
