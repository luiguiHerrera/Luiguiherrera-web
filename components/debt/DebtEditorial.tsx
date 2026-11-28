import type { BudgetLocale } from "@/lib/personal-finance/budget/types";
import { DebtPlanner } from "./DebtPlanner";
import { debtVisual } from "./debt-visual-copy";
import styles from "./DebtEditorial.module.css";

export function DebtEditorial({ locale, title, subtitle, description, eyebrow, note, chips, items }: {
  locale: BudgetLocale;
  title: string;
  subtitle: string;
  description: string;
  eyebrow: string;
  note: string;
  chips: string[];
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.panorama} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>{eyebrow}</p>
          <h1>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
          <p className={styles.intro}>{description}</p>
          <ul className={styles.chips}>{chips.map(chip => <li key={chip}>{chip}</li>)}</ul>
        </div>
      </header>
      <details className={styles.about}>
        <summary>{debtVisual[locale].about}</summary>
        <dl>{items.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
      </details>
      <p className={styles.privacy}>{note}</p>
      <DebtPlanner locale={locale} />
    </div>
  );
}
