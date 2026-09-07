import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "@/lib/seo/structured-data";
import { TrendsAnalytics } from "./TrendsAnalytics";
import Link from "next/link";
import { CapitalDisclosureSection, capitalQuarterLabel } from "./CapitalDisclosureSection";
import { getCapitalData } from "@/lib/trends/capital/get-capital-data";
import { getPublicCapital } from "@/lib/trends/capital/public-capital";
import { TrendRadar } from "./TrendRadar";
import { trendCatalog, trendPath, trendsMethodologyPath, trendsReviewedAt, trendsPath } from "@/lib/trends/catalog";
import { trendsCopy } from "@/lib/trends/copy";
import { getRadarTrends } from "@/lib/trends/details";
import styles from "./trends.module.css";

const heading = "text-2xl font-semibold leading-tight tracking-[-0.025em] text-ink md:text-3xl";
export async function TrendsExplorer({ locale }: { locale: "es" | "en" }) {
  const copy = trendsCopy[locale];
  const capital = getPublicCapital(await getCapitalData());
  const trends = getRadarTrends(locale);
  const date = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${trendsReviewedAt}T00:00:00Z`));
  return <div data-trends-page className={`${styles.page} mx-auto min-w-0 max-w-7xl px-4 pb-12 pt-8 md:px-5 md:pb-16 md:pt-10`}>
    <TrendsAnalytics />
    <JsonLd data={[buildWebPageJsonLd({ pathname: trendsPath(locale), name: copy.hero.eyebrow, description: copy.hero.text, language: locale }, "CollectionPage"), buildBreadcrumbJsonLd(locale, [{ name: locale === "es" ? "Inicio" : "Home", pathname: locale === "es" ? "/" : "/en" }, { name: copy.hero.eyebrow, pathname: trendsPath(locale) }])]} />
    <header className="border-b border-line pb-9 md:pb-11">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass">{copy.hero.eyebrow}</p>
      <h1 className="mt-4 max-w-[25ch] text-balance text-[clamp(2rem,5vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-ink">{copy.hero.title}</h1>
      <p className="mt-5 max-w-4xl text-lg font-medium leading-8 text-petrol">{copy.hero.subtitle}</p>
      <p className="mt-3 max-w-3xl text-base leading-7 text-muted">{copy.hero.text}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <a href="#radar" className="inline-flex min-h-11 items-center justify-center rounded-[4px] border border-petrol bg-petrol px-5 py-2.5 text-sm font-semibold text-white hover:bg-panel hover:text-petrol">{copy.hero.primary}</a>
        <a href="#capital" className="inline-flex min-h-11 items-center justify-center rounded-[4px] border border-petrol/25 bg-white/70 px-5 py-2.5 text-sm font-semibold text-petrol hover:border-petrol">{copy.hero.secondary}</a>
      </div>
      <p className="mt-5 text-xs leading-6 text-muted">{copy.hero.sequence}</p>
    </header>
    <section aria-labelledby="current-title" className="py-9 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 id="current-title" className={heading}>{copy.current.title}</h2><p className="mt-2 text-sm text-muted">{copy.current.subtitle}</p></div>
        <p className="text-xs text-muted">{copy.current.updated}: <time dateTime={trendsReviewedAt}>{date}</time></p>
      </div>
      <div className="mt-6 grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-4">
        {copy.current.readings.map((reading) => {
          const trend = trendCatalog.find((item) => item.id === reading.id)!;
          return <article key={reading.id} className="flex flex-col border-t border-line pt-4">
            <h3 className="text-base font-semibold text-ink">{trend.name[locale]}</h3>
            <p className="mt-3 text-sm leading-6 text-muted">{reading.text}</p>
            <Link href={trendPath(trend, locale)} aria-label={`${copy.current.analyze}: ${trend.name[locale]}`} className="mt-auto inline-flex min-h-11 w-fit items-center pt-3 text-sm font-semibold text-petrol hover:underline">{copy.current.analyze} <span aria-hidden="true" className="ml-2">→</span></Link>
          </article>;
        })}
        <article className="flex flex-col border-t border-petrol pt-4">
          <h3 className="text-base font-semibold text-ink">{copy.current.capital}</h3>
          <p className="mt-2 text-xs text-muted">{capitalQuarterLabel(capital.quarter_end)}</p>
          <p className="mt-3 text-sm leading-6 text-muted">{copy.current.capitalText}</p>
          <a href="#capital" className="mt-auto inline-flex min-h-11 w-fit items-center pt-3 text-sm font-semibold text-petrol hover:underline">{copy.current.data} <span aria-hidden="true" className="ml-2">→</span></a>
        </article>
      </div>
    </section>
    <section id="radar" aria-labelledby="radar-title" className="scroll-mt-24 border-t border-line py-9 md:py-12">
      <h2 id="radar-title" className={heading}>{copy.radar.title}</h2>
      <p className="mt-3 text-base leading-7 text-muted">{copy.radar.text}</p>
      <TrendRadar trends={trends} locale={locale} />
      <p className="mt-5 text-xs leading-6 text-muted">{copy.radar.note} <Link href={`${trendsMethodologyPath(locale)}#editorial`} className="font-semibold text-petrol underline underline-offset-4">{copy.capital.methodology} →</Link></p>
    </section>
    <CapitalDisclosureSection capital={capital} locale={locale} />
    <section aria-labelledby="deep-title" className="rounded-[6px] border border-line bg-panelSoft p-6 md:p-9">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-petrol">{copy.deep.eyebrow}</p>
      <h2 id="deep-title" className={`mt-3 ${heading}`}>{copy.deep.title}</h2>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted">{copy.deep.text}</p>
      <Link data-deep-dive href={trendPath(trendCatalog[0], locale)} className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-petrol underline decoration-petrol/30 underline-offset-4 hover:decoration-petrol">{copy.deep.cta} <span aria-hidden="true" className="ml-2">→</span></Link>
    </section>
  </div>;
}
