import type { DashboardOverviewItem } from '@/lib/dashboard/dashboard-overview';
import styles from './dashboard-section-overview.module.css';

export function DashboardSectionOverview({ id, title, caption, items }: { id: string; title: string; caption?: string; items: DashboardOverviewItem[] }) {
  return <div className={styles.overview} data-dashboard-overview={id}>
    <div className={styles.heading}><h2 id={id}>{title}</h2>{caption ? <p>{caption}</p> : null}</div>
    <dl className={styles.grid} data-columns={items.length}>
      {items.map(item => <div key={item.id} className={styles.item} data-overview-item={item.id}>
        <dt>{item.label}</dt><dd className={styles.value} data-overview-tone={item.tone ?? 'neutral'}>{item.value}</dd>
        {item.detail ? <dd className={styles.detail}>{item.detail}</dd> : null}{item.date ? <dd className={styles.date}>{item.date}</dd> : null}
      </div>)}
    </dl>
  </div>;
}
