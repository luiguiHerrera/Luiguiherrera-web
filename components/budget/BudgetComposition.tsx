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
  const total = segments.reduce((sum, segment) => sum + segment.amount, BigInt(0));
  const max = scale ?? (total > income ? total : income);
  const width = (amount: bigint) => max > BigInt(0) ? Number(amount) / Number(max) * 100 : 0;
  const remainder = income - total;
  const remainingLabel = remainder < BigInt(0)
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
        {segments.filter(({ amount }) => amount > BigInt(0)).map(({ label, amount, color }) => (
          <span key={label} style={{ width: `${width(amount)}%`, backgroundColor: color }} title={label} />
        ))}
        {remainder > BigInt(0) ? <span className={styles.unallocated} style={{ width: `${width(remainder)}%` }} /> : null}
        <i className={styles.incomeMarker} style={{ left: `${width(income)}%` }} />
      </div>
      <p className={styles.compositionFoot}>
        <span>{incomeLabel} · {formatTargetMoney(income, locale, currency)}</span>
        {remainder !== BigInt(0) ? (
          <span data-excess={remainder < BigInt(0)}>{remainingLabel} · {formatTargetMoney(remainder < BigInt(0) ? -remainder : remainder, locale, currency)}</span>
        ) : null}
      </p>
    </div>
  );
}
