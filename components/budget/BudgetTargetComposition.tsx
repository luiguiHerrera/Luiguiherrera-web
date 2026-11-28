import { BudgetComposition, budgetCompositionColors } from "./BudgetComposition";
import { budgetTargetCopy } from "./budget-target-copy";
import { formatTargetMoney } from "@/lib/personal-finance/budget/target-formatting";
import type { BudgetTargetSnapshot } from "@/lib/personal-finance/budget/target-types";
import type { BudgetCurrency, BudgetLocale } from "@/lib/personal-finance/budget/types";
import styles from "./BudgetEditorial.module.css";

export function BudgetTargetComposition({ currentTotal, currency, locale, snapshot }: {
  currentTotal: number;
  currency: BudgetCurrency;
  locale: BudgetLocale;
  snapshot: BudgetTargetSnapshot;
}) {
  const es = locale === "es";
  const actualTotal = BigInt(currentTotal);
  const commonScale = [snapshot.incomeMinor, snapshot.totalAllocatedMinor, actualTotal]
    .reduce((max, value) => value > max ? value : max);
  const target = snapshot.comparison.map((row, index) => ({
    label: budgetTargetCopy[locale].categories[row.category].name,
    color: budgetCompositionColors[index],
    amount: row.targetAmountMinor,
  }));
  const current = snapshot.comparison.map((row, index) => ({
    ...target[index],
    amount: row.currentAmountMinor ?? BigInt(0),
  }));
  current.push({
    label: es ? "Sin clasificar" : "Unclassified",
    color: budgetCompositionColors[6],
    amount: actualTotal - current.reduce((total, item) => total + item.amount, BigInt(0)),
  });

  return (
    <figure className={styles.figure}>
      <figcaption>{es ? "El ingreso mensual, de un vistazo" : "Monthly income at a glance"}</figcaption>
      <BudgetComposition segments={current} income={snapshot.incomeMinor} scale={commonScale} label={es ? "Situación actual · datos informados" : "Current · reported data"} currency={currency} locale={locale} />
      <BudgetComposition segments={target} income={snapshot.incomeMinor} scale={commonScale} label={es ? "Distribución objetivo" : "Target allocation"} currency={currency} locale={locale} />
      <p className={styles.figureCaption}>{es ? "Importes del objetivo" : "Target amounts"}</p>
      <ul className={styles.legend}>
        {target.map(({ label, amount, color }) => (
          <li key={label}><i style={{ backgroundColor: color }} /><span>{label}</span><strong>{formatTargetMoney(amount, locale, currency)}</strong></li>
        ))}
      </ul>
      {current[6].amount > BigInt(0) ? (
        <p className={styles.figureCaption}>{current[6].label} · {es ? "situación actual" : "current"} · {formatTargetMoney(current[6].amount, locale, currency)}</p>
      ) : null}
    </figure>
  );
}
