import { budgetTargetCopy } from "./budget-target-copy";
import { formatTargetMoney } from "@/lib/personal-finance/budget/target-formatting";
import { formatBasisPoints } from "@/lib/personal-finance/budget/target-validation";
import type { BudgetTargetSnapshot } from "@/lib/personal-finance/budget/target-types";
import type { BudgetCurrency, BudgetLocale } from "@/lib/personal-finance/budget/types";
import styles from "./BudgetEditorial.module.css";

export function BudgetCoverageNotice({ snapshot, currency, locale, partial }: {
  snapshot: BudgetTargetSnapshot;
  currency: BudgetCurrency;
  locale: BudgetLocale;
  partial: boolean;
}) {
  const labels = budgetTargetCopy[locale];
  const es = locale === "es";
  const basics = snapshot.essentialsShortfall;
  const alp = snapshot.alpShortfall;
  const basicsAmount = basics?.status === "ok" ? basics.amountMinor ?? 0n : 0n;
  const alpAmount = alp?.status === "ok" ? alp.amountMinor ?? 0n : 0n;
  const basicsGap = basicsAmount > 0n;
  const alpGap = alpAmount > 0n;
  if (!basicsGap && !alpGap && !partial) return null;

  return (
    <div className={styles.coverageNotice}>
      <p className="font-semibold">{es ? "Cobertura de compromisos" : "Coverage of commitments"}</p>
      {snapshot.status === "exact" && (basicsGap || alpGap) ? (
        <p>{es ? "La asignación suma el 100 %, pero hay compromisos sin cubrir." : "The allocation adds up to 100%, but some commitments are underfunded."}</p>
      ) : null}
      {basicsGap ? (
        <p>{labels.essentialsShortfall(
          formatTargetMoney(basicsAmount, locale, currency),
          basics?.basisPoints == null ? "—" : `${formatBasisPoints(basics.basisPoints, locale)} %`,
        )}</p>
      ) : null}
      {alpGap ? <p>{labels.alpShortfall(formatTargetMoney(alpAmount, locale, currency))}</p> : null}
      {partial ? (
        <p>{es
          ? "Información parcial. Los cálculos usan los importes informados. Solo para sumar flujos, los campos vacíos aportan 0. El saldo del fondo omitido sigue siendo desconocido."
          : "Partial information. Calculations use the amounts provided. Blank fields count as zero only when adding cash flows. An omitted fund balance remains unknown."}</p>
      ) : null}
    </div>
  );
}
