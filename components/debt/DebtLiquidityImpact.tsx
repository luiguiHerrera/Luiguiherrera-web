import { assessExtraLiquidity, type ContributionSource, type FundRelationship } from "@/lib/debt/extra-liquidity";
import type { DebtPlanResult, DebtProfileInput, PayoffMethod } from "@/lib/debt/types";
import type { BudgetLocale } from "@/lib/personal-finance/budget/types";
import { formatDebtNumber } from "./DebtPlanResults";
import { debtIntegral } from "./debt-integral-copy";
import styles from "./DebtEditorial.module.css";

const zero = BigInt(0);
const minor = (value: number | null) => value === null ? null : BigInt(value);

export function DebtLiquidityImpact({ profile, result, method, relationship, sources, locale, money }: {
  profile: DebtProfileInput;
  result: DebtPlanResult | null;
  method: PayoffMethod;
  relationship: FundRelationship;
  sources: Record<string, ContributionSource>;
  locale: BudgetLocale;
  money: (value: bigint | null) => string;
}) {
  const c = debtIntegral[locale];
  const plan = result?.[method];
  const expenses = minor(profile.fixedMonthlyExpenses);
  const minimums = result?.summary.monthlyMinimums ?? null;
  const view = plan?.ledger.length ? assessExtraLiquidity({
    assets: minor(profile.liquidNetWorth), fund: minor(profile.emergencyFund), relationship,
    monthlyObligations: expenses !== null && minimums !== null ? expenses + minimums : null,
    trace: plan.contributions, sources,
  }) : null;

  return (
    <section className="mt-5 border-y border-line py-3" aria-labelledby="debt-liquidity-title">
      <h3 id="debt-liquidity-title" className={styles.figureTitle}>{c.impact}</h3>
      {view === null ? <p className={styles.figureSub}>{c.impactWait}</p> : (
        <>
          <table className={styles.liquidityTable}>
            <thead><tr><td /><th scope="col">{c.before}</th><th scope="col">{c.after}</th></tr></thead>
            <tbody>
              <tr><th scope="row">{c.liquid}</th><td>{money(view.before.outside)}</td><td>{money(view.after.outside)}</td></tr>
              <tr><th scope="row">{c.reserve}</th><td>{money(view.before.fund)}</td><td>{money(view.after.fund)}</td></tr>
              <tr><th scope="row">{c.total}</th><td>{money(view.before.total)}</td><td>{money(view.after.total)}</td></tr>
              <tr><th scope="row">{c.coverage}</th><td>{formatDebtNumber(view.before.coverage, locale)}</td><td>{formatDebtNumber(view.after.coverage, locale)}</td></tr>
            </tbody>
          </table>
          <p className={styles.figureSub}>{c.coverageBasis}</p>
          {view.applied.future > zero && <p className={styles.figureSub}>{c.future} · <strong>{money(view.applied.future)}</strong>. {c.noFutureIncome}</p>}
          {relationship === "unknown" && view.before.total === null && <p className={styles.figureSub}>{c.relationRequired}</p>}
          <div aria-live="polite">
            {view.inconsistent && <p className={styles.warning}>{c.relationshipError}</p>}
            {view.applied.unknown > zero && <p className={styles.warning}>{c.sourceRequired} · <strong>{money(view.applied.unknown)}</strong></p>}
            {view.reserveAtRisk && <p className={styles.warning}>{c.reserveRisk}</p>}
            {view.fundingGap !== null && view.fundingGap > zero && (
              <p className={styles.warning}>{c.gap} · <strong>{money(view.fundingGap)}</strong>. {c.conditional}</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
