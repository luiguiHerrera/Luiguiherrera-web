"use client";

import { useMemo, useRef, useState } from "react";
import { calculateDebtPlan } from "@/lib/debt/calculate-debt-plan";
import { contributionSources, type ContributionSource, type FundRelationship } from "@/lib/debt/extra-liquidity";
import { MAX_ROWS, parseDebtMoney, parseDebtMonth, parseDebtRate } from "@/lib/debt/debt-input";
import type { DebtInput, DebtKind, DebtProfileInput, ExtraContributionInput, PayoffMethod, RateType } from "@/lib/debt/types";
import { supportedCurrencies, type BudgetCurrency, type BudgetLocale as Locale } from "@/lib/personal-finance/budget/types";
import { formatMoney } from "@/lib/personal-finance/budget/validation";
import { DebtField, Metric, debtFieldError, fieldClass, fieldLabelClass } from "./DebtFields";
import { formatDebtNumber, MethodDifference, PlanCard, ScenarioDifference, ScenarioReading } from "./DebtPlanResults";
import { debtCopy } from "./debt-copy";
import { BalanceFigure, CostFigure, FlowFigure, ScenarioMetrics, TimelineFigure, type PlotSeries } from "./DebtFigures";
import { DebtLiquidityImpact } from "./DebtLiquidityImpact";
import { debtIntegral } from "./debt-integral-copy";
import { debtVisual } from "./debt-visual-copy";
import { plotRatio } from "./debt-visual-data";
import styles from "./DebtEditorial.module.css";

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
type ExtraDraft = Omit<ExtraContributionInput, "amount" | "monthNumber"> & { amount: string; monthNumber: string; source: ContributionSource };

type Scenario = "current" | "monthlyOnly" | "extrasOnly" | "combined";
const scenarioOrder: Scenario[] = ["current", "monthlyOnly", "extrasOnly", "combined"];

const initialProfile: ProfileDraft = {
  liquidNetWorth: "", monthlyNetIncome: "", fixedMonthlyExpenses: "", emergencyFund: "", availableDebtPayment: "",
};

const profileFields = [
  ["liquidNetWorth", "liquidity"], ["monthlyNetIncome", "income"], ["fixedMonthlyExpenses", "expenses", "expensesHelp"],
  ["emergencyFund", "fund"], ["availableDebtPayment", "budget", "budgetHelp"],
] as const;

const primary = "w-fit rounded-[4px] border border-petrol bg-petrol px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-panel hover:text-petrol disabled:opacity-50";
const secondary = "rounded-[4px] border border-line bg-panel px-3 py-2.5 text-xs font-semibold text-muted transition hover:border-petrol hover:text-petrol";

function emptyDebt(id: string): DebtDraft {
  return { id, name: "", type: "card", minimumIncludesFees: true, rateType: "nominal", balance: "", annualRate: "", minimumPayment: "", monthlyFee: "" };
}

function parsePlanner(
  rawProfile: ProfileDraft, debts: DebtDraft[], extras: ExtraDraft[], currency: BudgetCurrency, locale: Locale,
  paymentMode: "replacement" | "increase", paymentText: string, noDebts: boolean, relationship: FundRelationship,
) {
  const parse = (raw: string) => parseDebtMoney(raw, locale, currency);
  const parsedProfile = Object.fromEntries(profileFields.map(([key]) => [key, parse(rawProfile[key])]));
  const profile = Object.fromEntries(profileFields.map(([key]) => [key, parsedProfile[key].value])) as DebtProfileInput;
  const inconsistentFund = relationship === "included" && profile.emergencyFund !== null
    && profile.liquidNetWorth !== null && profile.emergencyFund > profile.liquidNetWorth;
  const validatedProfile = inconsistentFund ? { ...profile, emergencyFund: null } : profile;
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
  const knownDebts = parsedDebts.filter(item => item.active).map(({ d, balance, annualRate, fee, minimum }): DebtInput => ({
    ...d, balance: balance.value, annualRate: annualRate.value, monthlyFee: fee.value, minimumPayment: minimum.value,
  }));
  // An untouched ledger is unknown. Only explicit confirmation represents an empty portfolio.
  const modelDebts = knownDebts.length || noDebts ? knownDebts : [{
    ...emptyDebt("unreported"), balance: null, annualRate: null, monthlyFee: null, minimumPayment: null,
  }];
  const parsedExtras = extras.map(e => ({ e, amount: parse(e.amount), month: parseDebtMonth(e.monthNumber) }));
  const modelExtras = parsedExtras
    .filter(({ e }) => e.amount.trim() || e.monthNumber.trim() || e.label?.trim())
    .map(({ e, amount, month }): ExtraContributionInput => ({ id: e.id, label: e.label, amount: amount.value, monthNumber: month.value }));
  const parsedPayment = parse(paymentText);
  const baseBudget = profile.availableDebtPayment;
  const newBudget = parsedPayment.value === null ? null :
    paymentMode === "replacement" ? parsedPayment.value :
    baseBudget === null ? null : baseBudget + parsedPayment.value;
  const rangeError = newBudget !== null && !Number.isSafeInteger(newBudget);
  const alternate = { ...validatedProfile, availableDebtPayment: rangeError ? null : newBudget };
  const debtError = parsedDebts.some(({ balance, annualRate, fee, minimum, mismatch }) => balance.error || annualRate.error || fee.error || minimum.error || mismatch);
  const extraError = parsedExtras.some(({ amount, month }) => amount.error || month.error);
  const baseError = Boolean(parsedProfile.availableDebtPayment.error);
  const alternativeError = Boolean(parsedPayment.error) || rangeError || (paymentMode === "increase" && baseError);
  const invalidSummaryInputs = { debts: debtError, ordinaryExpenses: Boolean(parsedProfile.fixedMonthlyExpenses.error) };
  const scenarioResults = {
    current: calculateDebtPlan(validatedProfile, modelDebts, { invalidSummaryInputs, invalidProjectionInput: debtError || baseError }),
    monthlyOnly: paymentText.trim()
      ? calculateDebtPlan(alternate, modelDebts, { invalidSummaryInputs, invalidProjectionInput: debtError || alternativeError }) : null,
    extrasOnly: modelExtras.length
      ? calculateDebtPlan(validatedProfile, modelDebts, { extraContributions: modelExtras, invalidSummaryInputs, invalidProjectionInput: debtError || extraError || baseError }) : null,
    combined: paymentText.trim() && modelExtras.length
      ? calculateDebtPlan(alternate, modelDebts, { extraContributions: modelExtras, invalidSummaryInputs, invalidProjectionInput: debtError || extraError || alternativeError }) : null,
  };
  const hasInvalid = Object.values(parsedProfile).some(item => item.error) || debtError || extraError || alternativeError;
  return { parsedProfile, parsedDebts, parsedExtras, parsedPayment, rangeError, hasInvalid, profile, inconsistentFund, scenarioResults };
}

export function DebtPlanner({ locale }: { locale: Locale }) {
  const c = debtCopy[locale];
  const v = debtVisual[locale];
  const q = debtIntegral[locale];
  const defaultCurrency = locale === "es" ? "EUR" : "USD";
  const [currency, setCurrency] = useState<BudgetCurrency>(defaultCurrency);
  const [rawProfile, setProfile] = useState<ProfileDraft>(initialProfile);
  const [debts, setDebts] = useState<DebtDraft[]>([emptyDebt("debt-1")]);
  const [extras, setExtras] = useState<ExtraDraft[]>([]);
  const [method, setMethod] = useState<PayoffMethod>("avalanche");
  const [scenario, setScenario] = useState<Scenario>("current");
  const [openDebts, setOpenDebts] = useState(() => new Set(["debt-1"]));
  const [cashPeriod, setCashPeriod] = useState(1);
  const [paymentMode, setPaymentMode] = useState<"replacement" | "increase">("replacement");
  const [paymentText, setPaymentText] = useState("");
  const [noDebts, setNoDebts] = useState(false);
  const [relationship, setRelationship] = useState<FundRelationship>("unknown");
  const [revision, setRevision] = useState(0);
  const id = useRef(1);
  const model = useMemo(() => parsePlanner(rawProfile, debts, extras, currency, locale, paymentMode, paymentText, noDebts, relationship),
    [rawProfile, debts, extras, currency, locale, paymentMode, paymentText, noDebts, relationship]);
  const result = model.scenarioResults.current;
  const alternatives = scenarioOrder.filter(key => key !== "current" && model.scenarioResults[key] !== null);
  const effectiveScenario = scenario !== "current" && model.scenarioResults[scenario] ? scenario : alternatives[0] ?? "current";
  const viewedResult = model.scenarioResults[effectiveScenario] ?? result;
  const names = Object.fromEntries(debts.map((d, i) => [d.id, d.name.trim() || `${c.debt} ${i + 1}`]));
  const format = (value: bigint | number | null) => value === null ? "—" : formatMoney(value, locale, currency);
  const pct = (value: number | null) => formatDebtNumber(value, locale, "percent");
  const annual = (value: number | null) => pct(value === null ? null : value / 100);
  const traceResult = effectiveScenario === "combined" || effectiveScenario === "extrasOnly" ? viewedResult : null;
  const sources = Object.fromEntries(extras.map(entry => [entry.id, entry.source]));
  const trace = traceResult?.[method].contributions ?? [];
  const lastPeriod = result[method].ledger.length;
  const hasDebtFields = model.parsedDebts.some(entry => entry.active);
  const hasEntries = noDebts || hasDebtFields || Object.values(rawProfile).some(s => s.trim())
    || paymentText.trim().length > 0 || extras.some(entry => entry.amount.trim() || entry.monthNumber.trim() || entry.label?.trim());
  const hasDraft = hasEntries || currency !== defaultCurrency || relationship !== "unknown"
    || debts.length !== 1 || extras.length > 0 || paymentMode !== "replacement" || method !== "avalanche"
    || debts.some(entry => entry.type !== "card" || entry.rateType !== "nominal" || !entry.minimumIncludesFees);
  const state = !hasEntries ? "empty" : noDebts ? "none" : result[method].status === "no-debt" ? "settled"
    : lastPeriod ? "valid" : "incomplete";
  const showAnalysis = state !== "empty";
  const validScenario = viewedResult[method].ledger.length > 0;
  const observeMethod = (value: string) => setMethod(value as PayoffMethod);
  const cashIndex = Math.min(cashPeriod, lastPeriod || 1) - 1;
  const cash = result.assessments[method].periods[cashIndex] ?? result.assessments[method].initialCashFlow;
  const { summary } = result;
  const minimumsArePartial = summary.monthlyMinimums === null && (summary.minimumsLowerBound ?? 0) > 0;
  const gapIsPartial = summary.minimumPaymentGap === null && (summary.minimumPaymentGapUpperBound ?? 0) < 0;
  const references = new Map(result.references.map(row => [row.id, row]));
  const methods = (["avalanche", "snowball"] as const).map(key => ({ plan: result[key], label: c[key] }));
  const scenarios: PlotSeries[] = [{ plan: result[method], label: c.current }];
  if (effectiveScenario !== "current") scenarios.push({ plan: viewedResult[method], label: c[effectiveScenario] });
  const areas = [
    ["estructura", v.structure], ["obligaciones", v.obligations], ["capacidad", v.capacity],
    ["estrategias", v.strategies], ["escenarios", v.laboratory],
  ];

  function updateDebt(key: string, patch: Partial<DebtDraft>) {
    setDebts(all => all.map(d => d.id === key ? { ...d, ...patch } : d));
  }
  function updateExtra(key: string, patch: Partial<ExtraDraft>) {
    setExtras(all => all.map(e => e.id === key ? { ...e, ...patch } : e));
  }
  function addDebt() {
    const key = `debt-${++id.current}`;
    setDebts(all => all.length < MAX_ROWS ? [...all, emptyDebt(key)] : all);
    setDebtOpen(key, true);
  }
  function setDebtOpen(key: string, open: boolean) {
    setOpenDebts(previous => {
      if (previous.has(key) === open) return previous;
      const next = new Set(previous);
      if (open) next.add(key);
      else next.delete(key);
      return next;
    });
  }
  function addExtra() {
    const key = `extra-${++id.current}`;
    setExtras(all => all.length < MAX_ROWS ? [...all, { id: key, label: "", monthNumber: "", amount: "", source: "unknown" }] : all);
  }

  function replaceDraft(example: boolean) {
    if (hasDraft && !window.confirm(example ? q.confirmExample : q.confirmReset)) return;
    setNoDebts(false);
    setCurrency(defaultCurrency);
    setMethod("avalanche");
    setCashPeriod(1);
    setPaymentMode("replacement");
    setRevision(value => value + 1);
    if (example) {
      id.current = 4;
      setOpenDebts(new Set());
      setRelationship("included");
      setProfile({ liquidNetWorth: "12000", monthlyNetIncome: "3200", fixedMonthlyExpenses: "1500", emergencyFund: "5500", availableDebtPayment: "450" });
      setDebts([
        { ...emptyDebt("debt-1"), name: q.exampleCard, balance: "4500", annualRate: "22", minimumPayment: "140", monthlyFee: "5", minimumIncludesFees: false },
        { ...emptyDebt("debt-2"), name: q.exampleLoan, type: "personal", balance: "950", annualRate: "12", rateType: "effective", minimumPayment: "85", monthlyFee: "45" },
      ]);
      setExtras([
        { id: "extra-3", label: q.exampleReserve, monthNumber: "2", amount: "1200", source: "reserve" },
        { id: "extra-4", label: q.exampleFuture, monthNumber: "3", amount: "300", source: "future" },
      ]);
      setPaymentText("650");
      setScenario("combined");
    } else {
      id.current = 1;
      setOpenDebts(new Set(["debt-1"]));
      setRelationship("unknown");
      setProfile(initialProfile);
      setDebts([emptyDebt("debt-1")]);
      setExtras([]);
      setPaymentText("");
      setScenario("current");
    }
  }

  return (
    <div key={revision} className={styles.workbench}>
      <nav className={styles.navigation} aria-label={v.areas}>
        {areas.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
      </nav>

      <section id="estructura" className={styles.section} aria-labelledby="estructura-titulo">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 id="estructura-titulo" className={styles.sectionHeading}>{v.structure}</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={secondary} onClick={() => replaceDraft(true)}>{q.example}</button>
            <button type="button" className={secondary} onClick={() => replaceDraft(false)}>{q.reset}</button>
          </div>
        </div>
        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.7fr_1fr]">
          <fieldset className="min-w-0">
            <legend className={styles.subhead}>{v.flows}</legend>
            <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {profileFields.filter(([key]) => key !== "liquidNetWorth" && key !== "emergencyFund").map(([key, label, hint]) => (
                <DebtField key={key} label={c[label]} hint={hint ? c[hint] : undefined} locale={locale}
                  parsed={model.parsedProfile[key]} text={rawProfile[key]} onChange={text => setProfile(old => ({ ...old, [key]: text }))} />
              ))}
            </div>
          </fieldset>
          <fieldset className="min-w-0">
            <legend className={styles.subhead}>{v.balances}</legend>
            <div className="grid items-start gap-3 sm:grid-cols-2">
              {profileFields.filter(([key]) => key === "liquidNetWorth" || key === "emergencyFund").map(([key, label]) => (
                <DebtField key={key} label={key === "liquidNetWorth" ? q.liquidAssets : c[label]} locale={locale}
                  parsed={model.parsedProfile[key]} text={rawProfile[key]} onChange={text => setProfile(old => ({ ...old, [key]: text }))} />
              ))}
            </div>
            <p className={styles.figureSub}>{q.assetHelp}</p>
            <label className="mt-3 grid gap-1 text-sm">
              {q.relationship}
              <select className={fieldClass} value={relationship} onChange={e => setRelationship(e.target.value as FundRelationship)}>
                {(["unknown", "included", "separate"] as const).map(value => <option key={value} value={value}>{q[value]}</option>)}
              </select>
            </label>
            {model.inconsistentFund && <p role="status" className={styles.warning}>{q.relationshipError}</p>}
          </fieldset>
        </div>
        <div className="mt-4 grid items-center gap-2 sm:grid-cols-[7.5rem_1fr]">
          <label className="grid gap-1">
            <span className={fieldLabelClass}>{c.currency}</span>
            <select className={fieldClass} onChange={e => setCurrency(e.target.value as BudgetCurrency)} value={currency}>
              {supportedCurrencies.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <p className="text-sm leading-6 text-muted">{c.currencyHelp}</p>
        </div>
      </section>

      <section id="obligaciones" className={styles.section} aria-labelledby="obligaciones-titulo">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="obligaciones-titulo" className={styles.sectionHeading}>{v.obligations}</h2>
          <button type="button" className={primary} disabled={noDebts || debts.length >= MAX_ROWS} onClick={addDebt}>{c.addDebt}</button>
        </div>
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input className="mt-1" type="checkbox" checked={noDebts} disabled={hasDebtFields} onChange={e => setNoDebts(e.target.checked)} />
          {q.noDebts}
        </label>
        {hasDebtFields && <p className={styles.figureSub}>{q.noDebtsHelp}</p>}
        {state === "empty" ? <p className={styles.chartEmpty}>{q.empty}</p> : <div className={styles.metrics}>
          <Metric label={c.totalDebt} value={format(summary.totalDebt)} />
          <Metric label={minimumsArePartial ? c.knownMinimums : c.totalMinimum}
            value={minimumsArePartial ? `${c.atLeast} ${format(summary.minimumsLowerBound)}` : format(summary.monthlyMinimums)} />
        </div>}
        <datalist id={`debt-name-suggestions-${locale}`}>
          {debtNameSuggestions[locale].map(name => <option key={name} value={name} />)}
        </datalist>
        <div className="grid gap-3">
          {!noDebts && model.parsedDebts.map(({ d, balance, annualRate, fee, minimum, mismatch, active }) => {
            const type = debtTypes.find(type => type.value === d.type)?.label[locale];
            const warningMessages = [
              [c.balance, debtFieldError(balance, locale)], [c.rate, debtFieldError(annualRate, locale)],
              [c.minimum, mismatch ? c.feeError : debtFieldError(minimum, locale)], [c.fee, debtFieldError(fee, locale)],
            ].filter(([, message]) => message);
            return (
              <article className={styles.debtRow} key={d.id}>
                <details open={openDebts.has(d.id)} onToggle={event => setDebtOpen(d.id, event.currentTarget.open)}>
                  <summary>
                    <span><strong>{names[d.id]}</strong><small>{type}</small></span>
                  </summary>
                  <div className={styles.debtEditor}>
                    <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="grid min-w-0 gap-2">
                        <span className={fieldLabelClass}>{c.name}</span>
                        <input className={fieldClass} autoComplete="off" list={`debt-name-suggestions-${locale}`} onChange={e => updateDebt(d.id, { name: e.target.value })} value={d.name} />
                      </label>
                      <DebtField label={c.balance} locale={locale} text={d.balance} parsed={balance} onChange={text => updateDebt(d.id, { balance: text })} />
                      {d.rateType !== "unknown" ? <DebtField label={c.rate} locale={locale} text={d.annualRate} parsed={annualRate} onChange={text => updateDebt(d.id, { annualRate: text })} /> : null}
                      <label className="grid min-w-0 gap-2">
                        <span className={fieldLabelClass}>{c.rateType}</span>
                        <select className={fieldClass} onChange={e => updateDebt(d.id, { rateType: e.target.value as RateType })} value={d.rateType}>
                          <option value="nominal">{c.nominal}</option><option value="effective">{c.effective}</option><option value="unknown">{c.unknownRate}</option>
                        </select>
                      </label>
                      <DebtField label={c.minimum} locale={locale} text={d.minimumPayment} parsed={minimum} error={mismatch ? c.feeError : undefined} onChange={text => updateDebt(d.id, { minimumPayment: text })} />
                      <DebtField label={c.fee} locale={locale} text={d.monthlyFee} parsed={fee} onChange={text => updateDebt(d.id, { monthlyFee: text })} />
                      <label className="grid min-w-0 gap-2">
                        <span className={fieldLabelClass}>{c.feeBasis}</span>
                        <select className={fieldClass} onChange={e => updateDebt(d.id, { minimumIncludesFees: e.target.value === "included" })} value={d.minimumIncludesFees ? "included" : "excluded"}>
                          <option value="included">{c.including}</option><option value="excluded">{c.excluding}</option>
                        </select>
                      </label>
                      <label className="grid min-w-0 gap-2">
                        <span className={fieldLabelClass}>{c.kind}</span>
                        <select className={fieldClass} onChange={e => updateDebt(d.id, { type: e.target.value as DebtKind })} value={d.type}>
                          {debtTypes.map(type => <option key={type.value} value={type.value}>{type.label[locale]}</option>)}
                        </select>
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs leading-5 text-muted">{c.rateHelp}</p>
                      <button type="button" className={secondary} onClick={() => {
                        setDebts(all => all.filter(row => row.id !== d.id));
                        setDebtOpen(d.id, false);
                      }}>{c.remove}</button>
                    </div>
                  </div>
                </details>
                {active && !openDebts.has(d.id) ? (
                  <dl className={styles.debtOverview}>
                    <div><dt>{c.balance}</dt><dd>{format(balance.value)}</dd></div>
                    <div><dt>{c.rate}</dt><dd>{annual(annualRate.value === null ? null : annualRate.value / 10_000)} · {d.rateType === "unknown" ? c.unknownRate : c[d.rateType]}</dd></div>
                    <div><dt>{c.minimum}</dt><dd>{format(minimum.value)}</dd></div>
                    <div><dt>{c.fee}</dt><dd>{format(fee.value)} · {d.minimumIncludesFees ? c.including : c.excluding}</dd></div>
                    <div><dt>{c.references}</dt><dd>{annual(references.get(d.id)?.annualizedInterestAndFees ?? null)}</dd></div>
                  </dl>
                ) : null}
                {warningMessages.length && !openDebts.has(d.id) ? <ul className={`${styles.warning} mx-4 mb-3`} aria-live="polite">
                  {warningMessages.map(([field, message]) => <li key={field}>{field} · {message}</li>)}
                </ul> : null}
              </article>
            );
          })}
        </div>
        {model.hasInvalid ? <p role="status" className={styles.warning}>{c.invalid}</p> : null}
        {summary.totalDebt !== null && summary.totalDebt > 0 && result.references.length > 1 ? (
          <figure className={`${styles.figure} mt-4`}>
            <figcaption className={styles.figureTitle}>{v.types}</figcaption>
            <ul className={styles.composition}>
              {result.references.map(reference => <li key={reference.id}>
                <span>{names[reference.id]}</span>
                <span className={styles.miniTrack} aria-hidden="true"><span style={{ width: `${plotRatio(reference.balance, summary.totalDebt!) * 100}%`, background: "#567565" }} /></span>
                <b>{format(reference.balance)}</b>
              </li>)}
            </ul>
          </figure>
        ) : hasDebtFields && summary.totalDebt === null ? <p className={styles.figureSub}>{v.partialComposition}</p> : null}
        <details className={styles.fold}>
          <summary>{c.references}</summary>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{c.referenceBody}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{c.referenceLimit}</p>
          {result.references.length ? (
            <dl className="mt-3 divide-y divide-line">
              {result.references.map(reference => <div key={reference.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <dt className="font-semibold">{names[reference.id]}</dt>
                <dd>{format(reference.balance)} · {annual(reference.annualRatePercent)} · {reference.rateType === "unknown" ? c.unknownRate : c[reference.rateType]}</dd>
                <dd className="font-semibold">{annual(reference.annualizedInterestAndFees)}</dd>
              </div>)}
              <div className="flex gap-3 py-2"><dt>{c.weighted}</dt><dd className="font-semibold">{annual(summary.weightedAnnualCost)}</dd></div>
            </dl>
          ) : null}
        </details>
      </section>

      <section id="capacidad" className={styles.section} aria-labelledby="capacidad-titulo">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 id="capacidad-titulo" className={styles.sectionHeading}>{v.capacity}</h2>
          <div className="flex flex-wrap gap-3">
            <label className="grid gap-1 text-sm">{q.strategy}
              <select className={fieldClass} value={method} onChange={e => observeMethod(e.target.value)}>
                {methods.map(({ plan, label }) => <option key={plan.method} value={plan.method}>{label}</option>)}
              </select>
            </label>
          {lastPeriod > 0 && <label className="grid gap-1 text-sm">
            {v.periodPicker}
            <select className={fieldClass} value={cashIndex + 1} onChange={e => setCashPeriod(Number(e.target.value))}>
              {result[method].ledger.map(period => <option key={period.month} value={period.month}>{c.month} {period.month}</option>)}
            </select>
          </label>}
          </div>
        </div>
        <p role="status" className={state === "empty" ? styles.chartEmpty : styles.figureSub}>{q[state]}{state === "valid" ? ` · ${q.observed} ${c[method]}` : ""}</p>
        {showAnalysis && <>
        <div className={styles.metrics}>
          <Metric label={c.totalDebt} value={format(summary.totalDebt)} />
          <Metric label={minimumsArePartial ? c.knownMinimums : c.totalMinimum}
            value={minimumsArePartial ? `${c.atLeast} ${format(summary.minimumsLowerBound)}` : format(summary.monthlyMinimums)} />
          <Metric label={c.reservedMargin} value={format(cash.marginReserved)} />
          <Metric label={c.effectiveOrdinaryMargin} value={format(cash.marginAfterOrdinary)} helper={`${c.month} ${cash.month} · ${c[method]}`} />
          <Metric label={c.coverage} value={formatDebtNumber(summary.emergencyFundMonths, locale)} helper={c.coverageHelp} />
        </div>
        <div className={styles.split}>
          <FlowFigure result={result} profile={model.profile} method={method} locale={locale} money={format} periodIndex={cashIndex} />
          <div className="min-w-0">
            <ScenarioReading result={result} method={method} locale={locale} money={format} period={cash} />
          </div>
        </div>
        <details className={styles.fold}>
          <summary>{v.otherRatios}</summary>
          <div className={styles.metrics}>
            <Metric label={c.cashBefore} value={format(summary.monthlyCashAfterExpenses)} />
            <Metric label={gapIsPartial ? c.maximumMinimumGap : c.minimumGap} value={format(gapIsPartial ? summary.minimumPaymentGapUpperBound : summary.minimumPaymentGap)} />
            <Metric label={c.debtToIncome} value={pct(summary.minimumsToIncome)} />
            <Metric label={c.plannedToIncome} value={pct(summary.plannedDebtToIncomeRatio)} />
            <Metric label={c.expensesToIncome} value={pct(summary.fixedAndMinimumsToIncome)} />
            <Metric label={c.debtToLiquidity} value={pct(summary.debtToLiquidNetWorth)} helper={q.ratioHelp} />
          </div>
          <p className="text-sm text-muted">{summary.debtLoadStatus === "incomplete" ? c.unknown : c[summary.debtLoadStatus]}. {c.ratioNote}</p>
        </details>
        </>}
      </section>

      <section id="estrategias" className={styles.section} aria-labelledby="estrategias-titulo">
        <h2 id="estrategias-titulo" className={styles.sectionHeading}>{v.strategies}</h2>
        {lastPeriod ? <div className="mt-4 grid gap-3">
          <BalanceFigure series={methods} locale={locale} money={format} currency={currency} title={v.balanceChart} />
          <div className={styles.split}>
            <CostFigure series={methods} locale={locale} money={format} />
            <TimelineFigure series={methods} names={names} locale={locale} />
          </div>
          <MethodDifference result={result} locale={locale} money={format} />
          <div className={styles.split}>
            {methods.map(({ plan }) => <PlanCard key={plan.method} plan={plan} assessment={result.assessments[plan.method]} locale={locale} names={names} money={format} />)}
          </div>
        </div> : <p className={styles.chartEmpty}>{q[state]}</p>}
      </section>

      <section id="escenarios" className={styles.section} aria-labelledby="escenarios-titulo">
        <h2 id="escenarios-titulo" className={styles.sectionHeading}>{v.laboratory}</h2>
        <div className="mt-4 grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label={c.currentPayment} value={format(model.profile.availableDebtPayment)} />
          <label className="grid min-w-0 gap-2">
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
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
          <h3 className={styles.subhead}>{c.additional}</h3>
          <button type="button" className={secondary} disabled={extras.length >= MAX_ROWS} onClick={addExtra}>{c.addExtra}</button>
        </div>
        <p className="text-sm leading-6 text-muted">{c.extraHelp}</p>
        {model.parsedExtras.length === 0 ? <p className="mt-2 text-sm text-muted">{c.noExtras}</p> : null}
        <div className="mt-3 grid gap-3">
          {model.parsedExtras.map(({ e, amount, month }) => (
            <div key={e.id} className="grid items-start gap-3 border border-line bg-panelSoft p-3 lg:grid-cols-[.7fr_.85fr_1.4fr_1.4fr_auto]">
              <DebtField label={c.month} text={e.monthNumber} parsed={month} locale={locale} mode="numeric" onChange={text => updateExtra(e.id, { monthNumber: text })} />
              <DebtField label={c.amount} text={e.amount} parsed={amount} locale={locale} onChange={text => updateExtra(e.id, { amount: text })} />
              <label className="grid min-w-0 gap-2">
                <span className={fieldLabelClass}>{c.concept}</span>
                <input className={fieldClass} value={e.label} onChange={event => updateExtra(e.id, { label: event.target.value })} />
              </label>
              <label className="grid min-w-0 gap-2">
                <span className={fieldLabelClass}>{q.source}</span>
                <select className={fieldClass} value={e.source} onChange={event => updateExtra(e.id, { source: event.target.value as ContributionSource })}>
                  {contributionSources.map(value => <option key={value} value={value}>{q[value]}</option>)}
                </select>
              </label>
              <button type="button" className={`${secondary} w-fit lg:mt-6`} onClick={() => setExtras(all => all.filter(row => row.id !== e.id))}>{c.remove}</button>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
          <label className="grid min-w-0 gap-2">
            <span className={fieldLabelClass}>{v.chooseMethod}</span>
            <select className={fieldClass} value={method} onChange={event => observeMethod(event.target.value)}>
              {methods.map(({ plan, label }) => <option key={plan.method} value={plan.method}>{label}</option>)}
            </select>
          </label>
          <label className="grid min-w-0 gap-2">
            <span className={fieldLabelClass}>{v.selectAlternative}</span>
            <select className={fieldClass} value={effectiveScenario} disabled={alternatives.length === 0}
              onChange={event => setScenario(event.target.value as Scenario)}>
              {alternatives.length === 0 ? <option value="current">{c.current}</option> : alternatives.map(key => <option key={key} value={key}>{c[key]}</option>)}
            </select>
          </label>
        </div>
        {alternatives.length === 0 && <p className={styles.figureSub}>{v.scenarioPrompt}</p>}
        {lastPeriod || validScenario ? <div className="mt-4 grid gap-3">
          <BalanceFigure series={scenarios} locale={locale} money={format} currency={currency} title={v.scenarioChart} />
          <div className={styles.split}>
            <CostFigure series={scenarios} locale={locale} money={format} />
            <div>
              <ScenarioMetrics series={scenarios.map(({ plan, label }, index) => ({
                plan, label, flow: (index ? viewedResult : result).assessments[method].initialCashFlow,
              }))} locale={locale} money={format} />
              {effectiveScenario !== "current" && lastPeriod > 0 && validScenario ? (
                <ScenarioDifference reference={result[method]} alternative={viewedResult[method]}
                  referenceAssessment={result.assessments[method]} alternativeAssessment={viewedResult.assessments[method]}
                  locale={locale} money={format} />
              ) : null}
            </div>
          </div>
          {effectiveScenario !== "current" ? (
            <div className={styles.split}>
              <div className={styles.figure}>
                <h3 className={styles.figureTitle}>{c[effectiveScenario]}</h3>
                <ScenarioReading result={viewedResult} method={method} locale={locale} money={format} />
              </div>
              <PlanCard plan={viewedResult[method]} assessment={viewedResult.assessments[method]} locale={locale} names={names} money={format} />
            </div>
          ) : null}
        </div> : <p className={styles.chartEmpty}>{q[state]}</p>}
        <DebtLiquidityImpact profile={model.profile} result={traceResult} method={method}
          relationship={relationship} sources={sources} locale={locale} money={format} />
        {trace.length ? (
          <details className={styles.fold}>
            <summary>{c.additional} · {c[effectiveScenario]}</summary>
            <ul className="mt-2 grid gap-3 text-sm text-muted">
              {trace.map(e => (
                <li key={e.id} className="min-w-0 break-words border-t border-line pt-2">
                  <p className="font-semibold text-ink">{c.month} {e.month}{e.label ? ` · ${e.label}` : ""} · {q[sources[e.id] ?? "unknown"]}</p>
                  <p>{c.planned} {format(e.planned)} · {c.applied} {format(e.applied)} · {c.unused} {format(e.unused)}</p>
                  <p>{c.outside} {format(e.outsideHorizon)} · {c.unsimulated} {format(e.unsimulated)}</p>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        <details className={styles.fold}>
          <summary>{c.methodology}</summary>
          <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm leading-6 text-muted">
            {c.methodologyText.map(text => <li key={text}>{text}</li>)}
          </ul>
        </details>
        <p className={styles.privacy}>{c.disclaimer}</p>
      </section>
    </div>
  );
}
