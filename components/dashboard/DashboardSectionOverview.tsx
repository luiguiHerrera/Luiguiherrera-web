import type { DashboardOverviewItem } from '@/lib/dashboard/dashboard-overview';
import styles from './dashboard-section-overview.module.css';

export function DashboardSectionOverview({ id, title, caption, items }: { id: string; title: string; caption?: string; items: DashboardOverviewItem[] }) {
  return <div className={styles.overview} data-dashboard-overview={id}>
    <div className={styles.heading}><h2 id={id}>{title}</h2>{caption ? <p>{caption}</p> : null}</div>
    <dl className={styles.grid} data-columns={items.length}>
      {items.map(item => <div key={item.id} className={styles.item} data-overview-item={item.id} data-overview-paired={item.secondary ? 'true' : undefined}>
        <dt>{item.label}</dt><dd className={styles.value} data-overview-tone={item.tone ?? 'neutral'} data-overview-available={item.available === undefined ? undefined : String(item.available)}>{item.value}</dd>
        {item.detail ? <dd className={styles.detail}>{item.detail}</dd> : null}
        {item.reference ? <dd className={styles.detail} data-historical-reference>{item.reference.text}<span className="mt-1 block">{item.reference.period}</span></dd> : null}
        {item.date ? <dd className={styles.date}>{item.date}</dd> : null}
        {item.secondary ? <>
          <dt className={styles.secondaryLabel} data-overview-secondary>{item.secondary.label}</dt>
          <dd className={styles.secondaryValue} data-overview-available={item.secondary.available === undefined ? undefined : String(item.secondary.available)}>{item.secondary.value}</dd>
          {item.secondary.detail ? <dd className={styles.secondaryDetail}>{item.secondary.detail}</dd> : null}
          {item.secondary.date ? <dd className={styles.secondaryDate}>{item.secondary.date}</dd> : null}
        </> : null}
      </div>)}
    </dl>
  </div>;
}

