import type { BudgetCurrency, BudgetLocale } from "@/lib/personal-finance/budget/types";
import { formatTargetMoney } from "@/lib/personal-finance/budget/target-formatting";
import styles from "./BudgetEditorial.module.css";

export const budgetCompositionColors = ["#254c3e", "#a38a54", "#82916c", "#476d68", "#a47154", "#6a6277", "#727972"];

export type BudgetCompositionSegment = {
  label: string;
  amount: bigint;
  color: string;
};

export function BudgetComposition({ segments, income, scale, label, currency, locale }: {
  segments: BudgetCompositionSegment[];
  income: bigint;
  scale?: bigint;
  label: string;
  currency: BudgetCurrency;
  locale: BudgetLocale;
}) {
  const es = locale === "es";
  const total = segments.reduce((sum, segment) => sum + segment.amount, 0n);
  const max = scale ?? (total > income ? total : income);
  const width = (amount: bigint) => max > 0n ? Number(amount) / Number(max) * 100 : 0;
  const remainder = income - total;
  const remainingLabel = remainder < 0n
    ? es ? "Exceso sobre el ingreso" : "Over income"
    : es ? "Sin asignar" : "Unallocated";
  const incomeLabel = es ? "Ingreso de referencia" : "Income benchmark";

  return (
    <div className={styles.composition}>
      <div className={styles.compositionHeader}>
        <span>{label}</span>
        <strong>{formatTargetMoney(total, locale, currency)}</strong>
      </div>
      <div className={styles.bar} aria-hidden="true">
        {segments.filter(({ amount }) => amount > 0n).map(({ label, amount, color }) => (
          <span key={label} style={{ width: `${width(amount)}%`, backgroundColor: color }} title={label} />
        ))}
        {remainder > 0n ? <span className={styles.unallocated} style={{ width: `${width(remainder)}%` }} /> : null}
        <i className={styles.incomeMarker} style={{ left: `${width(income)}%` }} />
      </div>
      <p className={styles.compositionFoot}>
        <span>{incomeLabel} · {formatTargetMoney(income, locale, currency)}</span>
        {remainder !== 0n ? (
          <span data-excess={remainder < 0n}>{remainingLabel} · {formatTargetMoney(remainder < 0n ? -remainder : remainder, locale, currency)}</span>
        ) : null}
      </p>
    </div>
  );
}
