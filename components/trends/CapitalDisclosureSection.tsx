import Link from "next/link";
import { CapitalDisclosureTable } from "./CapitalDisclosureTable";
import { capitalCopy } from "@/lib/trends/capital/copy";
import { trendsCopy } from "@/lib/trends/copy";
import { trendsMethodologyPath } from "@/lib/trends/catalog";
import type { PublicCapital } from "@/lib/trends/capital/public-contract";

export function capitalQuarterLabel(quarterEnd: string) {
  const date = new Date(`${quarterEnd}T00:00:00Z`);
  return `13F · Q${Math.floor(date.getUTCMonth() / 3) + 1} ${date.getUTCFullYear()}`;
}
export function capitalPeriodLabel(quarterEnd: string, locale: "es" | "en") {
  const date = new Date(`${quarterEnd}T00:00:00Z`);
  return `${capitalQuarterLabel(quarterEnd)} · ${capitalCopy[locale].positionsAt} ${new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", { day: "numeric", month: "long", timeZone: "UTC" }).format(date)} · ${capitalCopy[locale].delayed}`;
}
export function CapitalDisclosureSection({ capital, locale }: { capital: PublicCapital; locale: "es" | "en" }) {
  const copy = capitalCopy[locale], methodology = trendsMethodologyPath(locale), coverage = capital.coverage;
  return <section id="capital" aria-labelledby="capital-title" className="scroll-mt-24 border-t border-line py-9 md:py-12">
    <h2 id="capital-title" className="text-2xl font-semibold leading-tight tracking-[-0.025em] text-ink md:text-3xl">{trendsCopy[locale].capital.title}</h2>
    <p className="mt-3 text-sm leading-6 text-muted">{capitalPeriodLabel(capital.quarter_end, locale)}</p>
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs leading-6 text-muted">
      {capital.quality !== "validated" && <p className="font-semibold text-petrol">{capital.quality === "partial" ? copy.partial : copy.unavailable}</p>}
      {capital.refresh_failed && <p className="font-semibold text-petrol">{copy.refreshFailed}</p>}
      {capital.freshness === "stale" && <p className="font-semibold text-petrol">{copy.stale}</p>}
      {capital.as_of && <p>{copy.checked}: <time dateTime={capital.as_of}>{new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(capital.as_of))}</time></p>}
    </div>
    <div className="mt-6 grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_14rem]">
      <CapitalDisclosureTable views={capital.views} locale={locale} available={capital.quality !== "unavailable"} />
      <aside aria-label={capital.universe_name} className="min-w-0 border-t border-line pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
        <h3 className="text-sm font-semibold leading-6 text-ink">{capital.universe_name}</h3>
        <dl className="mt-4"><dt className="text-xs leading-6 text-muted">{copy.coverage}</dt><dd className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 tabular-nums"><span className="text-xl font-semibold text-petrol">{coverage.disclosed_filers === null ? copy.unavailable : `${coverage.disclosed_filers} / ${capital.universe_size}`}</span><span className="text-sm text-muted">{coverage.percent === null ? "—" : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(coverage.percent)}%`}</span></dd></dl>
        <p className="mt-4 text-xs leading-6 text-muted">{copy.universeCopy}</p>
        <p className="mt-4 text-xs leading-6 text-muted">{copy.positionsText}</p>
        <Link href={`${methodology}#positions`} className="mt-3 inline-flex min-h-11 items-center text-xs font-semibold leading-6 text-petrol underline decoration-line underline-offset-4">{copy.criteria} →</Link>
      </aside>
    </div>
  </section>;
}
