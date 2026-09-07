import { TrendsAnalytics } from "./TrendsAnalytics";
import Link from "next/link";
import { getTrendDetail } from "@/lib/trends/details";
import { trendPath, trendsMethodologyPath, trendsPath, trendsReviewedAt, type TrendDefinition } from "@/lib/trends/catalog";
import { trendsCopy } from "@/lib/trends/copy";
import { trendDetailCopy } from "@/lib/trends/detail-copy";
import { getCapitalData } from "@/lib/trends/capital/get-capital-data";
import { getPublicCapital } from "@/lib/trends/capital/public-capital";
import { capitalCopy } from "@/lib/trends/capital/copy";
import { capitalPeriodLabel } from "./CapitalDisclosureSection";
import { formatEditorialDate } from "@/lib/editorial/dates";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "@/lib/seo/structured-data";
import styles from "./trends.module.css";

const heading = "text-2xl font-semibold leading-tight tracking-[-0.025em] text-ink";
const section = "scroll-mt-24 border-t border-line py-8 md:py-10";
export async function TrendDetailPage({ definition, locale }: { definition: TrendDefinition; locale: "es" | "en" }) {
  const trend = getTrendDetail(definition, locale), copy = trendDetailCopy[locale], radar = trendsCopy[locale].radar;
  const capital = getPublicCapital(await getCapitalData(), definition.id);
  const companies = capital.views[0].rows;
  const base = trendsPath(locale), pathname = trendPath(definition, locale), levels = locale === "es" ? "/niveles-estadisticos" : "/en/statistical-levels";
  return <article data-trends-page className={`${styles.page} mx-auto max-w-7xl px-4 py-8 md:px-5 md:py-12`}>
    <TrendsAnalytics />
    <JsonLd data={[buildWebPageJsonLd({ pathname, name: trend.name, description: trend.short, language: locale }), buildBreadcrumbJsonLd(locale, [{ name: copy.home, pathname: locale === "es" ? "/" : "/en" }, { name: copy.back, pathname: base }, { name: trend.name, pathname }])]} />
    <nav aria-label={locale === "es" ? "Ruta de navegación" : "Breadcrumb"} className="flex flex-wrap items-center gap-x-3 text-xs text-muted">
      <Link className="inline-flex min-h-11 items-center hover:underline" href={base}>{copy.back}</Link><span aria-hidden="true">/</span><span aria-current="page">{trend.name}</span>
    </nav>
    <header className="pb-9 pt-4 md:pb-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">{copy.back}</p>
      <h1 className="mt-4 max-w-[22ch] text-balance text-[clamp(2rem,5vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-ink">{trend.name}</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">{trend.short}</p>
      <p className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs leading-6 text-petrol"><span>{radar.phase}: {radar.phases[definition.phase]}</span><span>{radar.evidence}: {radar.evidenceLevels[definition.evidence]}</span><span className="text-muted">{copy.reviewed}: <time dateTime={trendsReviewedAt}>{formatEditorialDate(trendsReviewedAt, locale)}</time></span></p>
    </header>
    <div className="grid gap-x-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0">
        <section className={section}><h2 className={heading}>{copy.changing}</h2><p className="mt-4 text-base leading-8 text-muted">{trend.changing}</p></section>
        <section className={section}><h2 className={heading}>{copy.evidence}</h2><p className="mt-4 text-base leading-8 text-muted">{trend.evidenceNote.observation[locale]}</p><a href={trend.evidenceNote.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-petrol underline decoration-line underline-offset-4">{trend.evidenceNote.label} →</a><p className="mt-3 text-sm leading-7 text-muted"><strong className="font-semibold text-ink">{copy.evidenceLimit}: </strong>{trend.evidenceNote.limit[locale]}</p></section>
        <section className={section}><h2 className={heading}>{copy.valueChain}</h2><p className="mt-4 text-base leading-8 text-muted">{trend.valueChain}</p><h3 className="mt-6 text-lg font-semibold text-petrol">{copy.capture}</h3><p className="mt-3 text-base leading-8 text-muted">{trend.capture}</p></section>
        <section className={section}><h2 className={heading}>{copy.capital}</h2><p className="mt-3 text-xs leading-6 text-muted">{capitalPeriodLabel(capital.quarter_end, locale)}</p><p className="mt-4 text-sm leading-7 text-muted">{capital.quality === "unavailable" ? copy.capitalPending : companies.length ? copy.companiesNote : copy.capitalEmpty}</p>
          {companies.length > 0 && <><h3 className="mt-5 text-base font-semibold text-ink">{copy.companies}</h3><ul className="mt-3 divide-y divide-line">{companies.map((company) => <li className="flex flex-wrap items-center justify-between gap-3 py-3" key={company.security_id}><span className="text-sm text-ink">{company.issuer} · {company.ticker_verified ?? company.security_class}</span><a href={company.filing_source} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-xs font-semibold text-petrol underline underline-offset-4">{company.manager_count} / {company.eligible_disclosed_managers} {capitalCopy[locale].disclosedManagers} · SEC →</a></li>)}</ul></>}
          <Link href={`${base}#capital`} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-petrol underline decoration-line underline-offset-4">{copy.capitalLink} →</Link>
        </section>
        <section className={section}><h2 className={heading}>{copy.vehicles}</h2><p className="mt-3 text-sm leading-7 text-muted">{copy.vehiclesNote}</p>
          {trend.observableVehicles.length ? <ul className="mt-5 divide-y divide-line">{trend.observableVehicles.map((vehicle) => <li className="py-4" key={`${vehicle.ticker}-${vehicle.kind}`}><h3 className="text-base font-semibold text-ink">{vehicle.ticker} · {vehicle.name}</h3><p className="mt-1 text-xs text-petrol">{copy.vehicleLabels[vehicle.kind]}</p><p className="mt-3 text-sm leading-7 text-muted">{vehicle.note}</p>{vehicle.statisticalLevelsSymbol && <Link className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-petrol underline decoration-line underline-offset-4" href={`${levels}?symbol=${encodeURIComponent(vehicle.statisticalLevelsSymbol)}`}>{copy.levels} →</Link>}</li>)}</ul> : <p className="mt-5 text-sm leading-7 text-muted">{copy.noVehicles}</p>}
        </section>
        <section className={section}><div className="grid gap-7 md:grid-cols-2"><div><h2 className={heading}>{copy.bull}</h2><p className="mt-4 text-base leading-8 text-muted">{trend.bullCase}</p></div><div><h2 className={heading}>{copy.bear}</h2><p className="mt-4 text-base leading-8 text-muted">{trend.bearCase}</p></div></div></section>
        <section className={section}><h2 className={heading}>{copy.invalidation}</h2><p className="mt-4 text-base leading-8 text-muted">{trend.failure}</p><h3 className="mt-6 text-lg font-semibold text-ink">{copy.risks}</h3><ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">{trend.risks.map((risk) => <li key={risk}>{copy.riskLabels[risk]}</li>)}</ul></section>
      </div>
      <aside className="min-w-0 border-t border-line py-8"><div className="rounded-[6px] border border-line bg-panelSoft p-5 lg:sticky lg:top-24"><h2 className="text-lg font-semibold text-ink">{copy.next}</h2><p className="mt-4 text-sm leading-7 text-muted">{trend.nextStep}</p><Link href={locale === "es" ? "/dashboard" : "/en/dashboard"} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-petrol underline decoration-line underline-offset-4">{copy.market} →</Link><Link href={trendsMethodologyPath(locale)} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-petrol underline decoration-line underline-offset-4">{copy.methodology} →</Link></div></aside>
    </div>
  </article>;
}
