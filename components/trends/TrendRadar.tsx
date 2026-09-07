"use client";
import { trackEvent } from "@/lib/analytics/trackEvent";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { filterTrends, trendPath, type TrendCategory, type TrendDefinition } from "@/lib/trends/catalog";
import { trendsCopy } from "@/lib/trends/copy";
import { TrendImage } from "./TrendImage";
import styles from "./trends.module.css";
export type RadarTrend = TrendDefinition & { short: string };
export function TrendRadar({ trends, locale }: { trends: RadarTrend[]; locale: "es" | "en" }) {
  const [category, setCategory] = useState<TrendCategory | "all">("all");
  const copy = trendsCopy[locale].radar;
  const filtered = filterTrends(trends, category);
  const categories = (Object.keys(copy.filters) as (TrendCategory | "all")[]).filter((key) => key === "all" || trends.some((trend) => trend.category === key));
  return <>
    <div role="group" aria-label={copy.title} className={styles.filters}>
      {categories.map((key) => <button key={key} type="button" aria-pressed={category === key} onClick={() => { setCategory(key); trackEvent("trend_filter_changed", { category: key }); }} className={styles.filter}>{copy.filters[key]}</button>)}
    </div>
    <p role="status" className={styles.filterCount}>{filtered.length} / {trends.length} {copy.count}</p>
    <div className={styles.radarGrid}>
      {filtered.map((trend) => <article key={trend.id} className={styles.radarCard}>
        <TrendImage id={trend.id} className={styles.radarImage} />
        <h3 className={styles.radarName}>{trend.name[locale]}</h3>
        <p className={styles.radarDescription}>{trend.short}</p>
        <dl className={styles.radarMeta}>
          <div><dt className="text-muted">{copy.phase}</dt><dd className={styles.phaseBadge} data-phase={trend.phase}>{copy.phases[trend.phase]}</dd></div>
          <div><dt className="text-muted">{copy.evidence}</dt><dd className={styles.evidenceBadge} data-evidence={trend.evidence}>{copy.evidenceLevels[trend.evidence]}</dd></div>
        </dl>
        <Link href={trendPath(trend, locale)} aria-label={`${copy.explore}: ${trend.name[locale]}`} className={styles.radarLink}>{copy.explore} <span aria-hidden="true" className="ml-2">→</span></Link>
      </article>)}
    </div>
    {!filtered.length && <EmptyState title={copy.empty} text={copy.emptyText} />}
  </>;
}
