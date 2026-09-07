"use client";
import { trackEvent } from "@/lib/analytics/trackEvent";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { filterTrends, trendPath, type TrendCategory, type TrendDefinition } from "@/lib/trends/catalog";
import { trendsCopy } from "@/lib/trends/copy";
export type RadarTrend = TrendDefinition & { short: string };
export function TrendRadar({ trends, locale }: { trends: RadarTrend[]; locale: "es" | "en" }) {
  const [category, setCategory] = useState<TrendCategory | "all">("all");
  const copy = trendsCopy[locale].radar;
  const filtered = filterTrends(trends, category);
  const categories = (Object.keys(copy.filters) as (TrendCategory | "all")[]).filter((key) => key === "all" || trends.some((trend) => trend.category === key));
  return <>
    <div role="group" aria-label={copy.title} className="mt-6 flex max-w-full gap-2 overflow-x-auto p-1 pb-3">
      {categories.map((key) => <button key={key} type="button" aria-pressed={category === key} onClick={() => { setCategory(key); trackEvent("trend_filter_changed", { category: key }); }} className={`min-h-11 shrink-0 rounded-[4px] border px-4 py-2 text-sm ${category === key ? "border-petrol bg-petrol font-semibold text-white" : "border-line bg-white/70 text-petrol hover:border-petrol"}`}>{copy.filters[key]}</button>)}
    </div>
    <p role="status" className="mt-2 text-xs text-muted">{filtered.length} / {trends.length} {copy.count}</p>
    <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {filtered.map((trend) => <article key={trend.id} className="flex min-w-0 flex-col rounded-[6px] border border-line bg-white/75 p-5 md:p-6">
        <h3 className="text-xl font-semibold leading-tight text-ink">{trend.name[locale]}</h3>
        <p className="mt-3 text-sm leading-6 text-muted">{trend.short}</p>
        <dl className="mt-auto flex flex-wrap gap-x-6 gap-y-2 pt-5 text-xs leading-5">
          <div><dt className="text-muted">{copy.phase}</dt><dd className="font-semibold text-petrol">{copy.phases[trend.phase]}</dd></div>
          <div><dt className="text-muted">{copy.evidence}</dt><dd className="font-semibold text-petrol">{copy.evidenceLevels[trend.evidence]}</dd></div>
        </dl>
        <Link href={trendPath(trend, locale)} aria-label={`${copy.explore}: ${trend.name[locale]}`} className="mt-4 inline-flex min-h-11 w-fit items-center text-sm font-semibold text-petrol underline decoration-line underline-offset-4 hover:decoration-petrol">{copy.explore} <span aria-hidden="true" className="ml-2">→</span></Link>
      </article>)}
    </div>
    {!filtered.length && <EmptyState title={copy.empty} text={copy.emptyText} />}
  </>;
}
