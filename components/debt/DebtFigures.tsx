"use client";

import { useId, useState } from "react";
import type { DebtCashFlowView, DebtPlanResult, DebtProfileInput, PayoffMethod, PayoffPlan } from "@/lib/debt/types";
import type { BudgetLocale } from "@/lib/personal-finance/budget/types";
import { debtCopy } from "./debt-copy";
import { debtVisual } from "./debt-visual-copy";
import { balancePoints, differingCostHorizons, flowBreakdown, horizon, observedBalance, plotRatio, settled } from "./debt-visual-data";
import { formatDebtNumber } from "./DebtPlanResults";
import styles from "./DebtEditorial.module.css";

type Money = (value: bigint | number | null) => string;
export type PlotSeries = { plan: PayoffPlan; label: string };
const colors = ["#176254", "#9b641d", "#425c75", "#665882"];
const dashes = ["", "10 6", "2 5", "12 4 2 4"];
const swatches = ["#38594d", "#77927d", "#ae7637", "#c5cfb5"];
const zero = BigInt(0);
const max = (a: bigint, b: bigint) => a > b ? a : b;

export function FlowFigure({ result, profile, method, locale, money, periodIndex }: {
  result: DebtPlanResult; profile: DebtProfileInput; method: PayoffMethod; locale: BudgetLocale; money: Money; periodIndex: number;
}) {
  const d = debtVisual[locale];
  const c = debtCopy[locale];
  const assessment = result.assessments[method];
  const observed = assessment.periods[periodIndex];
  const period = result[method].ledger[periodIndex];
  const income = profile.monthlyNetIncome === null ? null : BigInt(profile.monthlyNetIncome);
  const expenses = profile.fixedMonthlyExpenses === null ? null : BigInt(profile.fixedMonthlyExpenses);
  const view = flowBreakdown(expenses, observed ?? assessment.initialCashFlow, period, observed, result[method].status === "no-debt");
  const used = view.parts.reduce<bigint>((sum, amount) => sum + (amount ?? zero), zero);
  const scale = max(income ?? zero, used);
  const position = plotRatio(income ?? zero, scale) * 100;
  const labels = [d.fixed, d.minimumPaid, d.overMinimum, d.available];
  const hasPartial = view.parts.some(p => p === null);
  return (
    <figure className={styles.figure}>
      <figcaption className={styles.figureTitle}>{d.cashChart}</figcaption>
      <p className={styles.figureSub}>{c.month} {observed?.month ?? assessment.initialCashFlow.month} · {d.incomeMarker} <strong>{money(income)}</strong></p>
      {income !== null && scale > zero ? (
        <div className={styles.flowTrack} aria-hidden="true">
          {view.parts.map((amount, index) => amount !== null && amount > zero ? (
            <span key={labels[index]} style={{ width: `${plotRatio(amount, scale) * 100}%`, backgroundColor: swatches[index] }} />
          ) : null)}
          {position < 100 && <span className={styles.overflow} style={{ left: `${position}%` }} />}
          <span className={styles.incomeMarker} style={{ left: `${position}%` }} />
        </div>
      ) : null}
      {view.deficit !== null ? <p className={styles.warning}>{d.exceeded} · <strong>{money(view.deficit)}</strong></p> : null}
      {income === null ? <p className={styles.figureSub}>{d.missingIncome}</p> : null}
      {hasPartial ? <p className={styles.figureSub}>{d.partialFlow}</p> : null}
      <ul className={styles.flowLegend}>
        {view.parts.map((amount, index) => (
          <li key={labels[index]}>
            <span><i aria-hidden="true" style={{ background: swatches[index] }} />{labels[index]}</span>
            <strong>{money(amount)}</strong>
            <small>{formatDebtNumber(income && amount !== null ? plotRatio(amount, income) : null, locale, "percent")}</small>
          </li>
        ))}
      </ul>
      {view.due !== null && <p className={styles.figureSub}>{c.due} · <strong>{money(view.due)}</strong></p>}
      {view.ordinaryGap !== null && view.ordinaryGap > zero && <p className={styles.warning}>{c.ordinaryShortfall} · <strong>{money(view.ordinaryGap)}</strong></p>}
    </figure>
  );
}

export function BalanceFigure({ series, locale, money, currency, title }: {
  series: PlotSeries[]; locale: BudgetLocale; money: Money; currency: string; title: string;
}) {
  const d = debtVisual[locale];
  const c = debtCopy[locale];
  const id = useId();
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const datasets = series.map(({ plan }) => balancePoints(plan));
  const end = Math.max(...series.map(s => horizon(s.plan)), 0);
  const peak = datasets.flat().reduce((a, p) => max(a, p.value), zero);
  const month = Math.min(end, hovered ?? selected ?? end);
  const x = (value: number) => end ? 12 + 976 * value / end : 12;
  const y = (value: bigint) => 247 - 232 * plotRatio(value, peak);
  const divisions = peak >= BigInt(4) ? 4 : Number(peak);
  const ticks = divisions === 0 ? [zero] : Array.from({ length: divisions + 1 }, (_, i) => peak * BigInt(divisions - i) / BigInt(divisions));
  const months = Array.from(new Set([0, Math.round(end / 4), Math.round(end / 2), Math.round(end * .75), end]));
  return (
    <figure className={styles.figure} aria-labelledby={id}>
      <figcaption id={id} className={styles.figureTitle}>{title}</figcaption>
      <p className={styles.figureSub}>{d.currencyAxis} {currency}</p>
      {!datasets.some(points => points.length) ? <p className={styles.chartEmpty}>{d.noSeries}</p> : (
        <>
          <div className={styles.chartBody}>
            <div className={styles.yAxis} aria-hidden="true">
              {ticks.map(tick => <span key={tick.toString()} style={{ top: `${y(tick) / 260 * 100}%` }}>{money(tick)}</span>)}
            </div>
            <svg className={styles.plot} viewBox="0 0 1000 260" preserveAspectRatio="none" aria-hidden="true"
              onPointerMove={event => {
                if (event.pointerType !== "mouse") return;
                const rect = event.currentTarget.getBoundingClientRect();
                setHovered(Math.min(end, Math.max(0, Math.round((event.clientX - rect.left - rect.width * .012) / (rect.width * .976) * end))));
              }}
              onPointerLeave={() => setHovered(null)}
            >
              {ticks.map((tick, i) => <line key={i} x1="0" x2="1000" y1={y(tick)} y2={y(tick)} stroke="#dbd8ce" vectorEffect="non-scaling-stroke" />)}
              <line x1={x(month)} x2={x(month)} y1="12" y2="248" stroke="#827668" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
              {datasets.map((points, index) => {
                const { plan } = series[index];
                const line = points.map(p => `${x(p.month)},${y(p.value)}`).join(" ");
                const lastPoint = points.at(-1);
                const active = observedBalance(plan, month);
                if (!lastPoint) return null;
                return (
                  <g key={index}>
                    <polyline points={line} fill="none" stroke={colors[index]} strokeDasharray={dashes[index]} strokeWidth={index === 0 ? 3 : 2.5} vectorEffect="non-scaling-stroke" />
                    {settled(plan) && lastPoint.month < end ? (
                      <line x1={x(lastPoint.month)} x2={x(end)} y1={y(zero)} y2={y(zero)} stroke={colors[index]} opacity=".55" strokeDasharray="3 5" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                    ) : null}
                    {plan.status === "paid" ? (
                      <line x1={x(lastPoint.month)} x2={x(lastPoint.month)} y1={y(zero) - 10} y2={y(zero) + 5} stroke={colors[index]} strokeWidth="3" vectorEffect="non-scaling-stroke" />
                    ) : null}
                    {active !== null && <line x1={x(month) - 5} x2={x(month) + 5} y1={y(active)} y2={y(active)} stroke={colors[index]} strokeWidth="6" strokeLinecap={index === 0 ? "round" : "square"} vectorEffect="non-scaling-stroke" />}
                  </g>
                );
              })}
            </svg>
            {hovered !== null ? (
              <div className={styles.hoverCard} aria-hidden="true" style={{ insetInlineStart: hovered > end / 2 ? "12%" : "auto", insetInlineEnd: hovered <= end / 2 ? "3%" : "auto" }}>
                <b>{c.month} {month}</b>
                {series.map(({ plan, label }) => <span key={label}>{label} · {money(observedBalance(plan, month))}</span>)}
              </div>
            ) : null}
            <div className={styles.xAxis} aria-hidden="true">{months.map(n => <span key={n} style={{ left: `${x(n) / 10}%` }}>{n}</span>)}</div>
          </div>
          <div className={styles.chartControls}>
            <p>{d.monthAxis}</p>
            {end > 0 && <label>{d.exactMonth}
              <select value={month} onChange={e => { setHovered(null); setSelected(Number(e.target.value)); }}>
                {Array.from({ length: end + 1 }, (_, index) => <option value={index} key={index}>{c.month} {index}</option>)}
              </select>
            </label>}
          </div>
        </>
      )}
      <div className={styles.balanceReadout}>
        {series.map(({ plan, label }, index) => {
          const amount = observedBalance(plan, month);
          return (
            <div key={label}>
              <span><i className={styles.lineKey} aria-hidden="true" style={{ borderColor: colors[index], borderTopStyle: index === 0 ? "solid" : "dashed" }} />{label}</span>
              <strong>{money(amount)}</strong>
              <small>{c.month} {month}{amount === null ? ` · ${d.unavailable}` : settled(plan) && month >= (plan.months ?? 0) ? ` · ${d.settled}` : ""}</small>
              <small>{plan.status === "paid" ? `${d.totalPayoff} · ${c.month} ${plan.months}`
                : plan.ledger.length ? `${d.lastObserved} · ${horizon(plan)}` : c[plan.status]}</small>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

export function CostFigure({ series, locale, money }: { series: PlotSeries[]; locale: BudgetLocale; money: Money }) {
  const d = debtVisual[locale];
  const c = debtCopy[locale];
  const scale = series.reduce((a, { plan }) => max(a, plan.costAccrued ?? zero), zero);
  const rows = series.map(({ plan, label }) => ({
    plan, label, values: [plan.totals?.interest ?? null, plan.totals?.fees ?? null, plan.costAccrued],
  }));
  const visibility = rows.some(row => row.plan.costAccrued !== null);
  return (
    <figure className={styles.figure}>
      <figcaption className={styles.figureTitle}>{d.costChart}</figcaption>
      {!visibility ? <p className={styles.chartEmpty}>{d.noCosts}</p> : (
        <>
          {differingCostHorizons(series.map(s => s.plan)) && <p className={styles.figureSub}>{d.unequalHorizon}</p>}
          <div className={styles.costGroups}>
            {rows.map(({ plan, label, values }, index) => (
              <div key={label}>
                <h4>{label}</h4>
                <p>{plan.status === "paid" ? d.toPayoff : plan.status === "no-debt" || plan.costAccrued === null
                  ? c[plan.status] : `${d.atHorizon} ${horizon(plan)}`}</p>
                <dl>
                  {[d.interest, d.fees, settled(plan) ? d.totalFinancialCost : d.allCosts].map((label, j) => (
                    <div key={label}>
                      <dt>{label}</dt><dd>{money(values[j])}</dd>
                      <div className={styles.miniTrack} aria-hidden="true">
                        <span style={{ width: `${values[j] === null ? 0 : plotRatio(values[j], scale) * 100}%`, background: colors[index] }} />
                      </div>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </>
      )}
    </figure>
  );
}

export function TimelineFigure({ series, names, locale }: { series: PlotSeries[]; names: Record<string, string>; locale: BudgetLocale }) {
  const d = debtVisual[locale];
  const c = debtCopy[locale];
  const end = Math.max(...series.map(s => horizon(s.plan)), 1);
  return (
    <figure className={styles.figure}>
      <figcaption className={styles.figureTitle}>{d.timeline}</figcaption>
      <div className={styles.timelineGrid}>
        {series.map(({ plan, label }, index) => {
          const paidIds = new Set(plan.liquidations.map(event => event.id));
          const stillOpen = (plan.ledger[0]?.debts ?? []).filter(debt => !paidIds.has(debt.id));
          return <section key={label}>
            <h4>{label}</h4>
            {plan.liquidations.length ? (
              <ol>
                {plan.liquidations.map(event => (
                  <li key={event.id}>
                    <span>{names[event.id]}{event.month === plan.liquidations[0].month ? <small>{d.firstDebt}</small> : null}</span>
                    <strong>{c.month} {event.month}</strong>
                    <div className={styles.timelineTrack} aria-hidden="true">
                      <span style={{ left: `${event.month / end * 100}%`, background: colors[index] }} />
                    </div>
                  </li>
                ))}
              </ol>
            ) : <p className={styles.figureSub}>{horizon(plan) ? d.noLiquidations : c[plan.status]}</p>}
            {plan.status === "paid" && <p className={styles.timelineTotal}>{d.totalPayoff} · {c.month} {plan.months}</p>}
            {!settled(plan) && horizon(plan) > 0 && <p className={styles.figureSub}>{d.lastObserved} · {horizon(plan)}</p>}
            {stillOpen.length > 0 && <p className={styles.figureSub}>{c.remaining} · {stillOpen.map(debt => names[debt.id]).join(", ")}</p>}
          </section>;
        })}
      </div>
    </figure>
  );
}

export function ScenarioMetrics({ series, locale, money }: {
  series: Array<PlotSeries & { flow: DebtCashFlowView }>; locale: BudgetLocale; money: Money;
}) {
  const d = debtVisual[locale];
  const c = debtCopy[locale];
  const end = Math.max(1, ...series.map(({ plan }) => horizon(plan)));
  const extent = series.flatMap(({ flow }) => [flow.marginReserved, flow.marginAfterOrdinary])
    .reduce<bigint>((a, value) => max(a, value === null ? zero : value < zero ? -value : value), zero);
  return (
    <figure className={styles.figure}>
      <figcaption className={styles.figureTitle}>{d.graphMetrics}</figcaption>
      <div className={styles.costGroups}>
        {series.map(({ plan, label, flow }, index) => {
          const margins = [
            [c.reservedMargin, flow.marginReserved],
            [`${c.effectiveOrdinaryMargin} · ${c.month} ${flow.month}`, flow.marginAfterOrdinary],
          ] as const;
          const elapsed = horizon(plan);
          return (
            <div key={label}>
              <h4>{label}</h4>
              <dl>
                <div>
                  <dt>{settled(plan) ? c.payoffTime : d.lastObserved}</dt>
                  <dd>{plan.status === "no-debt" ? c["no-debt"] : elapsed ? `${elapsed} ${d.horizonUnit}` : "—"}</dd>
                  {elapsed > 0 && <div className={styles.miniTrack} aria-hidden="true">
                    <span className={plan.status === "paid" ? undefined : styles.incompleteBar}
                      style={{ width: `${elapsed / end * 100}%`, backgroundColor: colors[index] }} />
                  </div>}
                  {!settled(plan) && <p className="col-span-2">{elapsed ? d.noPayoff : c[plan.status]}</p>}
                </div>
                {margins.map(([name, value]) => {
                  const width = value === null ? 0 : Math.abs(plotRatio(value, extent)) * 50;
                  const negative = value !== null && value < zero;
                  return (
                    <div key={name}>
                      <dt>{name}</dt><dd>{money(value)}</dd>
                      {value !== null && <div className={styles.marginTrack} aria-hidden="true">
                        <span style={{ left: `${negative ? 50 - width : 50}%`, width: `${width}%`, backgroundColor: negative ? "#9a513b" : colors[index] }} />
                      </div>}
                    </div>
                  );
                })}
              </dl>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
