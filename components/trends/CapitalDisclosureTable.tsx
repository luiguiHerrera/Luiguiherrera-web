"use client";
import { trackEvent } from "@/lib/analytics/trackEvent";
import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { trendCatalog, trendPath } from "@/lib/trends/catalog";
import { capitalCopy } from "@/lib/trends/capital/copy";
import type { PublicCapitalPosition, PublicCapitalView } from "@/lib/trends/capital/public-contract";
import type { CapitalTab } from "@/lib/trends/capital/types";

export function CapitalDisclosureTable({ views, locale, available }: { views: PublicCapitalView[]; locale: "es" | "en"; available: boolean }) {
  const [active, setActive] = useState<CapitalTab>("shared");
  const refs = useRef<Partial<Record<CapitalTab, HTMLButtonElement | null>>>({});
  const copy = capitalCopy[locale];
  // Only published views reach this client. A single view is a heading, not a dead tab.
  const tabs = views.map((view) => view.id), multiple = tabs.length > 1;
  const selected = tabs.includes(active) ? active : "shared";
  function activate(tab: CapitalTab) { setActive(tab); trackEvent("capital_tab_changed", { tab }); }
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, key: CapitalTab) {
    const index = tabs.indexOf(key);
    const next = event.key === "ArrowRight" ? tabs[(index + 1) % tabs.length] : event.key === "ArrowLeft" ? tabs[(index - 1 + tabs.length) % tabs.length] : event.key === "Home" ? tabs[0] : event.key === "End" ? tabs[tabs.length - 1] : undefined;
    if (next) { event.preventDefault(); activate(next); refs.current[next]?.focus(); }
  }
  const related = (row: PublicCapitalPosition) => row.theme_links.length ? <span className="flex flex-wrap gap-x-3 gap-y-1">{row.theme_links.map((id) => {
    const trend = trendCatalog.find((item) => item.id === id);
    return trend ? <Link className="inline-flex min-h-11 items-center underline decoration-line underline-offset-4 hover:decoration-petrol" href={trendPath(trend, locale)} key={id}>{trend.name[locale]}</Link> : null;
  })}</span> : <span className="text-muted">{copy.noMapping}</span>;
  const source = (row: PublicCapitalPosition) => <a className="inline-flex min-h-11 items-center font-semibold text-petrol underline decoration-line underline-offset-4 hover:decoration-petrol" data-capital-company={row.security_id} href={row.filing_source} target="_blank" rel="noreferrer" aria-label={`${copy.source}: ${row.issuer} ${row.security_class}`}>{copy.source} <span className="ml-1" aria-hidden="true">→</span></a>;
  const percent = (row: PublicCapitalPosition) => `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(row.percent_disclosed)}%`;
  return <div className="min-w-0" data-capital-views>
    {multiple ? <div role="tablist" aria-label={copy.tabsLabel} className="flex min-w-0 max-w-full gap-5 overflow-x-auto border-b border-line p-1">
      {tabs.map((key) => <button type="button" role="tab" key={key} id={`capital-tab-${key}`} aria-selected={selected === key} aria-controls={`capital-panel-${key}`} tabIndex={selected === key ? 0 : -1} ref={(node) => { refs.current[key] = node; }} onKeyDown={(event) => onKeyDown(event, key)} onClick={() => activate(key)} className={`min-h-11 shrink-0 border-b-2 py-3 text-sm ${selected === key ? "border-petrol font-semibold text-petrol" : "border-transparent text-muted hover:text-petrol"}`}>{copy.tabs[key]}</button>)}
    </div> : <h3 id="capital-shared-title" className="border-b border-line pb-4 text-base font-semibold text-petrol">{copy.tabs.shared}</h3>}
    {views.map((view) => <div key={view.id} role={multiple ? "tabpanel" : "region"} id={`capital-panel-${view.id}`} aria-labelledby={multiple ? `capital-tab-${view.id}` : "capital-shared-title"} tabIndex={multiple ? 0 : undefined} hidden={view.id !== selected} className="mt-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-petrol">
      {view.id === selected && (!available ? <EmptyState title={copy.unavailable} text={copy.unavailableText} /> : !view.rows.length ? <EmptyState title={copy.empty} text={copy.emptyText} /> : <>
        <div className="hidden lg:block">
          <table className="w-full table-fixed border-collapse text-left text-xs">
            <caption className="sr-only">{copy.tabs[view.id]} · {copy.disclosedManagers} · {copy.subset}</caption>
            <thead><tr className="border-b border-line text-muted">
              <th scope="col" className="w-[28%] py-3 pr-3 font-medium">{copy.company}</th>
              <th scope="col" className="w-[11%] py-3 font-medium">{copy.ticker}</th>
              <th scope="col" className="w-[14%] py-3 font-medium capitalize">{copy.managers}</th>
              <th scope="col" className="w-[14%] py-3 font-medium">{copy.universePercent}</th>
              {view.id !== "shared" && <th scope="col" className="py-3 font-medium">{copy.tabs[view.id]}</th>}
              <th scope="col" className="py-3 pl-2 font-medium">{copy.related}</th>
            </tr></thead>
            <tbody>{view.rows.map((row) => <tr key={row.security_id} className="border-b border-line/80 align-top">
              <th scope="row" className="py-4 pr-3 text-left font-normal"><span className="block text-sm font-semibold leading-5 text-ink">{row.issuer}</span><span className="mt-1 block text-xs text-muted">{row.security_class}</span>{source(row)}</th>
              <td className="py-4 pr-2 font-semibold text-petrol">{row.ticker_verified ?? "—"}</td>
              <td className="py-4 tabular-nums">{row.manager_count} / {row.eligible_disclosed_managers}</td>
              <td className="py-4 tabular-nums">{percent(row)}</td>
              {view.id !== "shared" && "movement_count" in row && <td className="py-4 tabular-nums">{row.movement_count}</td>}
              <td className="py-2 pl-2 text-petrol">{related(row)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <ul className="divide-y divide-line border-b border-line lg:hidden">
          {view.rows.map((row) => <li key={row.security_id} className="py-5">
            <h4 className="text-base font-semibold leading-6 text-ink">{row.issuer}</h4>
            <p className="mt-1 text-xs leading-5 text-muted">{row.ticker_verified ?? copy.unresolved} · {row.security_class}</p>
            <p className="mt-3 text-sm tabular-nums text-petrol">{row.manager_count} / {row.eligible_disclosed_managers} {copy.disclosedManagers} · {percent(row)}</p>
            {view.id !== "shared" && "movement_count" in row && <p className="mt-2 text-sm leading-6 text-muted">{copy.tabs[view.id]}: {row.movement_count}</p>}
            <div className="mt-2 text-xs leading-6 text-petrol">{related(row)}</div>
            <div className="mt-1 text-sm">{source(row)}</div>
          </li>)}
        </ul>
        <p className="mt-4 text-xs leading-6 text-muted">{view.id === "shared" && `${copy.sharedOrder} `}{copy.subset}</p>
      </>)}
    </div>)}
  </div>;
}
