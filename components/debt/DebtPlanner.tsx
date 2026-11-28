"use client";

import { useMemo, useRef, useState } from "react";
import { calculateDebtPlan } from "@/lib/debt/calculate-debt-plan";
import { MAX_ROWS, parseDebtMoney, parseDebtMonth, parseDebtRate } from "@/lib/debt/debt-input";
import type { DebtInput, DebtKind, DebtProfileInput, ExtraContributionInput, PayoffMethod, RateType } from "@/lib/debt/types";
import { supportedCurrencies, type BudgetCurrency, type BudgetLocale as Locale } from "@/lib/personal-finance/budget/types";
import { formatMoney } from "@/lib/personal-finance/budget/validation";
import { DebtField, Metric, fieldClass, fieldLabelClass } from "./DebtFields";
import { formatDebtNumber, MethodDifference, PlanCard, ScenarioDifference, ScenarioReading, PlanOutcome } from "./DebtPlanResults";
import { debtCopy } from "./debt-copy";

const debtTypes: Array<{ label: Record<Locale, string>; value: DebtKind }> = [
  { value: "card", label: { es: "Tarjeta", en: "Card" } },
  { value: "personal", label: { es: "Personal", en: "Personal" } },
  { value: "vehicle", label: { es: "Vehículo", en: "Vehicle" } },
  { value: "mortgage", label: { es: "Hipoteca", en: "Mortgage" } },
  { value: "education", label: { es: "Educativo", en: "Education" } },
  { value: "other", label: { es: "Otro", en: "Other" } },
];

const debtNameSuggestions: Record<Locale, string[]> = {
  es: [
    "Tarjeta de crédito",
    "Crédito personal",
    "Crédito de vehículo",
    "Hipoteca",
    "Crédito educativo",
    "Crédito familiar",
    "Línea de crédito",
    "Compra a cuotas",
    "Otro",
  ],
  en: [
    "Credit card",
    "Personal loan",
    "Vehicle loan",
    "Mortgage",
    "Student loan",
    "Family loan",
    "Credit line",
    "Installment purchase",
    "Other",
  ],
};

type ProfileDraft = Record<keyof DebtProfileInput, string>;
type DebtDraft = Omit<DebtInput, "balance" | "annualRate" | "monthlyFee" | "minimumPayment"> & {
  balance: string; annualRate: string; monthlyFee: string; minimumPayment: string;
};
type ExtraDraft = Omit<ExtraContributionInput, "amount" | "monthNumber"> & { amount: string; monthNumber: string };

type Scenario = "current" | "monthlyOnly" | "extrasOnly" | "combined";
const scenarioOrder: Scenario[] = ["current", "monthlyOnly", "extrasOnly", "combined"];

const initialProfile: ProfileDraft = {
  liquidNetWorth: "", monthlyNetIncome: "", fixedMonthlyExpenses: "", emergencyFund: "", availableDebtPayment: "",
};

const profileFields = [
  ["liquidNetWorth", "liquidity"], ["monthlyNetIncome", "income"], ["fixedMonthlyExpenses", "expenses", "expensesHelp"],
  ["emergencyFund", "fund"], ["availableDebtPayment", "budget", "budgetHelp"],
] as const;

const layout = "rounded-[6px] border border-line bg-panel p-4 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6";
const primary = "w-fit rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol disabled:opacity-50";
const secondary = "rounded-[4px] border border-line bg-panel px-3 py-2.5 text-xs font-semibold text-muted transition hover:border-petrol hover:text-petrol";

function emptyDebt(id: string): DebtDraft {
  return { id, name: "", type: "card", minimumIncludesFees: true, rateType: "nominal", balance: "", annualRate: "", minimumPayment: "", monthlyFee: "" };
}

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-petrol">{number}</p>
      <h2 className="mt-2 text-2xl font-semibold leading-tight text-ink">{title}</h2>
    </div>
  );
}

function parsePlanner(
  rawProfile: ProfileDraft, debts: DebtDraft[], extras: ExtraDraft[], currency: BudgetCurrency, locale: Locale,
  paymentMode: "replacement" | "increase", paymentText: string,
) {
  const parse = (raw: string) => parseDebtMoney(raw, locale, currency);
  const parsedProfile = Object.fromEntries(profileFields.map(([key]) => [key, parse(rawProfile[key])]));
  const profile = Object.fromEntries(profileFields.map(([key]) => [key, parsedProfile[key].value])) as DebtProfileInput;
  const parsedDebts = debts.map(d => {
    const balance = parse(d.balance);
    const annualRate = parseDebtRate(d.rateType === "unknown" ? "" : d.annualRate, locale);
    const fee = parse(d.monthlyFee);
    const minimum = parse(d.minimumPayment);
    const active = Boolean(d.name.trim() || d.balance.trim() || d.annualRate.trim() || d.monthlyFee.trim() || d.minimumPayment.trim());
    const mismatch = (balance.value ?? 0) > 0 && d.minimumIncludesFees
      && minimum.value !== null && fee.value !== null && minimum.value < fee.value;
    return { d, balance, annualRate, fee, minimum, active, mismatch };
  });
  const modelDebts = parsedDebts.filter(item => item.active).map(({ d, balance, annualRate, fee, minimum }): DebtInput => ({
    ...d, balance: balance.value, annualRate: annualRate.value, monthlyFee: fee.value, minimumPayment: minimum.value,
  }));
  const parsedExtras = extras.map(e => ({ e, amount: parse(e.amount), month: parseDebtMonth(e.monthNumber) }));
  const modelExtras = parsedExtras
    .filter(({ e }) => e.amount.trim() || e.monthNumber.trim() || e.label?.trim())
    .map(({ e, amount, month }): ExtraContributionInput => ({ ...e, amount: amount.value, monthNumber: month.value }));
  const parsedPayment = parse(paymentText);
  const baseBudget = profile.availableDebtPayment;
  const newBudget = parsedPayment.value === null ? null :
    paymentMode === "replacement" ? parsedPayment.value :
    baseBudget === null ? null : baseBudget + parsedPayment.value;
  const rangeError = newBudget !== null && !Number.isSafeInteger(newBudget);
  const alternate = { ...profile, availableDebtPayment: rangeError ? null : newBudget };
  const debtError = parsedDebts.some(({ balance, annualRate, fee, minimum, mismatch }) => balance.error || annualRate.error || fee.error || minimum.error || mismatch);
  const extraError = parsedExtras.some(({ amount, month }) => amount.error || month.error);
  const baseError = Boolean(parsedProfile.availableDebtPayment.error);
  const alternativeError = Boolean(parsedPayment.error) || rangeError || (paymentMode === "increase" && baseError);
  const invalidSummaryInputs = { debts: debtError, ordinaryExpenses: Boolean(parsedProfile.fixedMonthlyExpenses.error) };
  const scenarioResults = {
    current: calculateDebtPlan(profile, modelDebts, { invalidSummaryInputs, invalidProjectionInput: debtError || baseError }),
    monthlyOnly: paymentText.trim()
      ? calculateDebtPlan(alternate, modelDebts, { invalidSummaryInputs, invalidProjectionInput: debtError || alternativeError }) : null,
    extrasOnly: modelExtras.length
      ? calculateDebtPlan(profile, modelDebts, { extraContributions: modelExtras, invalidSummaryInputs, invalidProjectionInput: debtError || extraError || baseError }) : null,
    combined: paymentText.trim() && modelExtras.length
      ? calculateDebtPlan(alternate, modelDebts, { extraContributions: modelExtras, invalidSummaryInputs, invalidProjectionInput: debtError || extraError || alternativeError }) : null,
  };
  const hasInvalid = Object.values(parsedProfile).some(item => item.error) || debtError || extraError || alternativeError;
  return { parsedProfile, parsedDebts, parsedExtras, parsedPayment, rangeError, hasInvalid, profile, alternate, scenarioResults };
}

export function DebtPlanner({ locale }: { locale: Locale }) {
  const c = debtCopy[locale];
  const [currency, setCurrency] = useState<BudgetCurrency>(locale === "es" ? "EUR" : "USD");
  const [rawProfile, setProfile] = useState<ProfileDraft>(initialProfile);
  const [debts, setDebts] = useState<DebtDraft[]>([emptyDebt("debt-1")]);
  const [extras, setExtras] = useState<ExtraDraft[]>([]);
  const [method, setMethod] = useState<PayoffMethod>("avalanche");
  const [scenario, setScenario] = useState<Scenario>("current");
  const [paymentMode, setPaymentMode] = useState<"replacement" | "increase">("replacement");
  const [paymentText, setPaymentText] = useState("");
  const id = useRef(1);
  const model = useMemo(() => parsePlanner(rawProfile, debts, extras, currency, locale, paymentMode, paymentText),
    [rawProfile, debts, extras, currency, locale, paymentMode, paymentText]);
  const result = model.scenarioResults.current;
  const effectiveScenario = model.scenarioResults[scenario] ? scenario : "current";
  const viewedResult = model.scenarioResults[effectiveScenario] ?? result;
  const names = Object.fromEntries(debts.map((d, i) => [d.id, d.name.trim() || `${c.debt} ${i + 1}`]));
  const format = (value: bigint | number | null) => value === null ? "—" : formatMoney(value, locale, currency);
  const pct = (value: number | null) => formatDebtNumber(value, locale, "percent");
  const annual = (value: number | null) => pct(value === null ? null : value / 100);
  const traceScenario = effectiveScenario === "combined" ? "combined" : "extrasOnly";
  const traceResult = model.scenarioResults[traceScenario];
  const trace = traceResult?.[method].contributions ?? [];

  function updateDebt(key: string, patch: Partial<DebtDraft>) {
    setDebts(all => all.map(d => d.id === key ? { ...d, ...patch } : d));
  }
  function updateExtra(key: string, patch: Partial<ExtraDraft>) {
    setExtras(all => all.map(e => e.id === key ? { ...e, ...patch } : e));
  }
  function addDebt() {
    const key = `debt-${++id.current}`;
    setDebts(all => all.length < MAX_ROWS ? [...all, emptyDebt(key)] : all);
  }
  function addExtra() {
    const key = `extra-${++id.current}`;
    setExtras(all => all.length < MAX_ROWS ? [...all, { id: key, label: "", monthNumber: "", amount: "" }] : all);
  }

  return (
    <div className="mt-8 grid min-w-0 gap-6">
      <section className="technical-surface rounded-[6px] border border-petrol/20 p-4 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-5">
        <SectionHeading number="01" title={c.baseline} />
        <div className="mt-4 grid gap-3 md:grid-cols-[10rem_1fr] md:items-end">
          <label className="grid gap-2">
            <span className={fieldLabelClass}>{c.currency}</span>
            <select className={fieldClass} onChange={e => setCurrency(e.target.value as BudgetCurrency)} value={currency}>
              {supportedCurrencies.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <p className="text-sm leading-6 text-muted">{c.currencyHelp}</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {profileFields.map(([key, label, hint]) => (
            <DebtField key={key} label={c[label]} hint={hint ? c[hint] : undefined} locale={locale}
              parsed={model.parsedProfile[key]} text={rawProfile[key]} onChange={text => setProfile(old => ({ ...old, [key]: text }))} />
          ))}
        </div>
      </section>

      <section className={layout}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <SectionHeading number="02" title={c.debts} />
          <button type="button" className={primary} disabled={debts.length >= MAX_ROWS} onClick={addDebt}>{c.addDebt}</button>
        </div>
        <datalist id={`debt-name-suggestions-${locale}`}>
          {debtNameSuggestions[locale].map(name => <option key={name} value={name} />)}
        </datalist>
        <div className="mt-5 grid gap-4">
          {model.parsedDebts.map(({ d, balance, annualRate, fee, minimum, mismatch }, index) => (
            <div key={d.id} className="min-w-0 rounded-[6px] border border-line bg-white/70 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-ink">{c.debt} {index + 1}</p>
                <button type="button" className={secondary} onClick={() => setDebts(all => all.filter(row => row.id !== d.id))}>{c.remove}</button>
              </div>
              <div className="mt-4 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="grid gap-2">
                  <span className={fieldLabelClass}>{c.name}</span>
                  <input className={fieldClass} autoComplete="off" list={`debt-name-suggestions-${locale}`} onChange={e => updateDebt(d.id, { name: e.target.value })} value={d.name} />
                </label>
                <DebtField label={c.balance} locale={locale} text={d.balance} parsed={balance} onChange={text => updateDebt(d.id, { balance: text })} />
                {d.rateType !== "unknown" ? <DebtField label={c.rate} locale={locale} text={d.annualRate} parsed={annualRate} onChange={text => updateDebt(d.id, { annualRate: text })} /> : null}
                <label className="grid gap-2">
                  <span className={fieldLabelClass}>{c.rateType}</span>
                  <select className={fieldClass} onChange={e => updateDebt(d.id, { rateType: e.target.value as RateType })} value={d.rateType}>
                    <option value="nominal">{c.nominal}</option><option value="effective">{c.effective}</option><option value="unknown">{c.unknownRate}</option>
                  </select>
                </label>
                <DebtField label={c.minimum} locale={locale} text={d.minimumPayment} parsed={minimum} error={mismatch ? c.feeError : undefined} onChange={text => updateDebt(d.id, { minimumPayment: text })} />
                <DebtField label={c.fee} locale={locale} text={d.monthlyFee} parsed={fee} onChange={text => updateDebt(d.id, { monthlyFee: text })} />
                <label className="grid gap-2">
                  <span className={fieldLabelClass}>{c.feeBasis}</span>
                  <select className={fieldClass} onChange={e => updateDebt(d.id, { minimumIncludesFees: e.target.value === "included" })} value={d.minimumIncludesFees ? "included" : "excluded"}>
                    <option value="included">{c.including}</option><option value="excluded">{c.excluding}</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className={fieldLabelClass}>{c.kind}</span>
                  <select className={fieldClass} onChange={e => updateDebt(d.id, { type: e.target.value as DebtKind })} value={d.type}>
                    {debtTypes.map(type => <option key={type.value} value={type.value}>{type.label[locale]}</option>)}
                  </select>
                </label>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted">{c.rateHelp}</p>
            </div>
          ))}
        </div>
        {model.hasInvalid ? <p role="status" className="mt-3 border-l border-brass/50 pl-3 text-sm text-muted">{c.invalid}</p> : null}
      </section>

      <section className={layout}>
        <SectionHeading number="03" title={c.summary} />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label={c.totalDebt} value={format(result.summary.totalDebt)} />
          {result.summary.monthlyMinimums === null && (result.summary.minimumsLowerBound ?? 0) > 0 ? (
            <Metric label={c.knownMinimums} value={`${c.atLeast} ${format(result.summary.minimumsLowerBound)}`} />
          ) : <Metric label={c.totalMinimum} value={format(result.summary.monthlyMinimums)} />}
          <Metric label={c.cashBefore} value={format(result.summary.monthlyCashAfterExpenses)} />
          {result.summary.minimumPaymentGap === null && (result.summary.minimumPaymentGapUpperBound ?? 0) < 0 ? (
            <Metric label={c.maximumMinimumGap} value={format(result.summary.minimumPaymentGapUpperBound)} />
          ) : <Metric label={c.minimumGap} value={format(result.summary.minimumPaymentGap)} />}
          <Metric label={c.debtToIncome} value={pct(result.summary.minimumsToIncome)} />
          <Metric label={c.plannedToIncome} value={pct(result.summary.plannedDebtToIncomeRatio)} />
          <Metric label={c.expensesToIncome} value={pct(result.summary.fixedAndMinimumsToIncome)} />
          <Metric label={c.debtToLiquidity} value={pct(result.summary.debtToLiquidNetWorth)} />
          <Metric label={c.coverage} value={formatDebtNumber(result.summary.emergencyFundMonths, locale)} helper={c.coverageHelp} />
        </div>
        <ScenarioReading result={result} method={method} locale={locale} money={format} />
        <p className="mt-3 text-sm text-muted">{result.summary.debtLoadStatus === "incomplete" ? c.unknown : c[result.summary.debtLoadStatus]}. {c.ratioNote}</p>
      </section>

      <section className={layout}>
        <SectionHeading number="04" title={c.references} />
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{c.referenceBody}</p>
        <p className="mt-3 max-w-3xl border-l border-brass/50 pl-3 text-sm leading-6 text-muted">{c.referenceLimit}</p>
        {result.references.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {result.references.map(reference => (
              <article key={reference.id} className="min-w-0 border border-line bg-white/75 p-4">
                <p className="break-words text-lg font-semibold text-ink">{names[reference.id]}</p>
                <p className="mt-2 break-words text-sm text-muted">{c.balance} · {format(reference.balance)}</p>
                <p className="mt-2 text-sm text-muted">{c.rate} · {annual(reference.annualRatePercent)} · {reference.rateType === "unknown" ? c.unknownRate : c[reference.rateType]}</p>
                <p className="mt-2 break-words text-sm font-semibold text-ink">{annual(reference.annualizedInterestAndFees)}</p>
              </article>
            ))}
            <Metric label={c.weighted} value={annual(result.summary.weightedAnnualCost)} />
          </div>
        ) : null}
      </section>

      <div className="rounded-[6px] border border-petrol/20 bg-white/75 p-4 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-5">
        <p className={fieldLabelClass}>{c.method}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["avalanche", "snowball"] as const).map(option => (
            <button key={option} type="button" aria-pressed={method === option}
              className={method === option ? primary : secondary} onClick={() => setMethod(option)}>{c[option]}</button>
          ))}
        </div>
      </div>

      <section className={layout}>
        <SectionHeading number="05" title={c.changes} />
        <div className="mt-5 grid items-start gap-4 md:grid-cols-3">
          <Metric label={c.currentPayment} value={format(model.profile.availableDebtPayment)} />
          <label className="grid gap-2">
            <span className={fieldLabelClass}>{c.scenarioMode}</span>
            <select value={paymentMode} className={fieldClass} onChange={e => {
              setPaymentMode(e.target.value as "replacement" | "increase");
              setPaymentText("");
            }}>
              <option value="replacement">{c.replacement}</option><option value="increase">{c.increase}</option>
            </select>
          </label>
          <DebtField label={c[paymentMode]} locale={locale} text={paymentText} parsed={model.rangeError ? { value: null, error: "range" } : model.parsedPayment} onChange={setPaymentText} />
        </div>
        {model.scenarioResults.monthlyOnly ? (
          <ScenarioReading result={model.scenarioResults.monthlyOnly} method={method} locale={locale} money={format} />
        ) : null}
      </section>

      <section className={layout}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <SectionHeading number="06" title={c.additional} />
          <button type="button" className={primary} disabled={extras.length >= MAX_ROWS} onClick={addExtra}>{c.addExtra}</button>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted">{c.extraHelp}</p>
        <div className="mt-5 grid gap-4">
          {model.parsedExtras.length === 0 ? <p className="border border-line bg-panelSoft px-3 py-2 text-sm text-muted">{c.noExtras}</p> : null}
          {model.parsedExtras.map(({ e, amount, month }) => (
            <div key={e.id} className="grid items-start gap-4 rounded-[6px] border border-line bg-white/70 p-4 sm:grid-cols-[1fr_1fr_1.3fr_auto]">
              <DebtField label={c.month} text={e.monthNumber} parsed={month} locale={locale} mode="numeric" onChange={text => updateExtra(e.id, { monthNumber: text })} />
              <DebtField label={c.amount} text={e.amount} parsed={amount} locale={locale} onChange={text => updateExtra(e.id, { amount: text })} />
              <label className="grid gap-2">
                <span className={fieldLabelClass}>{c.concept}</span>
                <input className={fieldClass} value={e.label} onChange={event => updateExtra(e.id, { label: event.target.value })} />
              </label>
              <button type="button" className={`${secondary} w-fit sm:mt-6`} onClick={() => setExtras(all => all.filter(row => row.id !== e.id))}>{c.remove}</button>
            </div>
          ))}
        </div>
        {traceResult ? <PlanOutcome plan={traceResult[method]} assessment={traceResult.assessments[method]} locale={locale} money={format} /> : null}
        {trace.length ? (
          <details className="mt-4 border border-line bg-panelSoft p-3">
            <summary className="cursor-pointer font-semibold text-petrol">{c.additional} · {c[traceScenario]}</summary>
            <ul className="mt-2 grid gap-3 text-sm text-muted">
              {trace.map(e => (
                <li key={e.id} className="min-w-0 break-words border-t border-line pt-2">
                  <p className="font-semibold text-ink">{c.month} {e.month}{e.label ? ` · ${e.label}` : ""}</p>
                  <p>{c.planned} {format(e.planned)} · {c.applied} {format(e.applied)} · {c.unused} {format(e.unused)}</p>
                  <p>{c.outside} {format(e.outsideHorizon)} · {c.unsimulated} {format(e.unsimulated)}</p>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      <section className={layout}>
        <SectionHeading number="07" title={c.plans} />
        <p className="mt-3 text-sm text-muted">{c.comparedWith}. {c.method} · {c[method]}.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {scenarioOrder.map(key => {
            const simulation = model.scenarioResults[key];
            if (!simulation) return null;
            return (
              <article key={key} className="min-w-0 border border-line bg-panelSoft p-3">
                <button type="button" aria-pressed={effectiveScenario === key} className={effectiveScenario === key ? primary : secondary}
                  onClick={() => setScenario(key)}>{c[key]}</button>
                <ScenarioReading result={simulation} method={method} locale={locale} money={format} />
                {key !== "current" ? <ScenarioDifference reference={result[method]} alternative={simulation[method]}
                  referenceAssessment={result.assessments[method]} alternativeAssessment={simulation.assessments[method]}
                  locale={locale} money={format} /> : null}
              </article>
            );
          })}
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <PlanCard plan={viewedResult.avalanche} assessment={viewedResult.assessments.avalanche} locale={locale} names={names} money={format} />
          <PlanCard plan={viewedResult.snowball} assessment={viewedResult.assessments.snowball} locale={locale} names={names} money={format} />
        </div>
        <MethodDifference result={viewedResult} locale={locale} money={format} />
      </section>

      <section className="rounded-[6px] border border-petrol/20 bg-[#f3efe6] p-4 shadow-[0_12px_32px_rgba(11,52,54,0.035)] md:p-6">
        <SectionHeading number="08" title={c.reading} />
        <details className="mt-4 border-y border-line py-3">
          <summary className="cursor-pointer font-semibold text-petrol">{c.methodology}</summary>
          <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm leading-6 text-muted">
            {c.methodologyText.map(text => <li key={text}>{text}</li>)}
          </ul>
        </details>
        <p className="mt-4 max-w-3xl border-l border-petrol/40 pl-3 text-xs leading-5 text-muted">{c.disclaimer}</p>
      </section>
    </div>
  );
}
