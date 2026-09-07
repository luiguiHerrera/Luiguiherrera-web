import type { PublicCapitalPosition } from "@/lib/trends/capital/public-contract";
import { capitalCopy } from "@/lib/trends/capital/copy";
import styles from "./trends.module.css";

export function CapitalOverlapChart({ rows, locale }: { rows: PublicCapitalPosition[]; locale: "es" | "en" }) {
  if (!rows.length) return null;
  return <figure className={styles.overlapChart} aria-labelledby="overlap-chart-caption">
    <figcaption id="overlap-chart-caption"><span>{capitalCopy[locale].tabs.shared}</span><span>{capitalCopy[locale].disclosedManagers}</span></figcaption>
    <ol>{rows.map(row => <li key={row.security_id} data-capital-bar={row.ticker_verified}>
      <span className={styles.barTicker}>{row.ticker_verified ?? row.issuer}</span>
      <span className={styles.barTrack} aria-hidden="true"><span style={{ width: `${row.percent_disclosed}%` }} /></span>
      <span className={styles.barCount}>{row.manager_count}<span> / {row.eligible_disclosed_managers}</span></span>
    </li>)}</ol>
  </figure>;
}
