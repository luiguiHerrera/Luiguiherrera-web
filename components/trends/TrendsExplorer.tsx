import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "@/lib/seo/structured-data";
import { TrendsAnalytics } from "./TrendsAnalytics";
import Link from "next/link";
import { CapitalDisclosureSection, capitalQuarterLabel } from "./CapitalDisclosureSection";
import { getCapitalData } from "@/lib/trends/capital/get-capital-data";
import { getPublicCapital } from "@/lib/trends/capital/public-capital";
import { TrendRadar } from "./TrendRadar";
import { TrendImage } from "./TrendImage";
import { trendCatalog, trendPath, trendsMethodologyPath, trendsReviewedAt, trendsPath } from "@/lib/trends/catalog";
import { trendsCopy } from "@/lib/trends/copy";
import { getRadarTrends } from "@/lib/trends/details";
import styles from "./trends.module.css";

export async function TrendsExplorer({ locale }: { locale: "es" | "en" }) {
  const copy = trendsCopy[locale];
  const dataset = await getCapitalData();
  const capital = getPublicCapital(dataset);
  const sharedRows = capital.views.find(view => view.id === "shared")?.rows ?? [];
  const alphabetId = sharedRows.find(row => row.ticker_verified === "GOOGL")?.issuer_id;
  const alphabetUnion = capital.quality !== "unavailable" && alphabetId ? dataset.issuers.find(issuer => issuer.issuer_id === alphabetId)?.managers : undefined;
  const trends = getRadarTrends(locale);
  const date = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${trendsReviewedAt}T00:00:00Z`));
  return <div data-trends-page className={`${styles.page} ${styles.visualPage}`}>
    <TrendsAnalytics />
    <JsonLd data={[buildWebPageJsonLd({ pathname: trendsPath(locale), name: copy.hero.eyebrow, description: copy.hero.text, language: locale }, "CollectionPage"), buildBreadcrumbJsonLd(locale, [{ name: locale === "es" ? "Inicio" : "Home", pathname: locale === "es" ? "/" : "/en" }, { name: copy.hero.eyebrow, pathname: trendsPath(locale) }])]} />
    <header className={styles.hero}>
      <div className={styles.heroTop}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{copy.hero.eyebrow}</p>
          <h1>{copy.hero.title}</h1>
          <p className={styles.heroSubtitle}>{copy.hero.subtitle}</p>
          <p className={styles.heroText}>{copy.hero.text}</p>
          <div className={styles.heroActions}>
            <a href="#radar" className={styles.primaryCta}>{copy.hero.primary} <span aria-hidden="true">→</span></a>
            <a href="#capital" className={styles.secondaryCta}>{copy.hero.secondary}</a>
          </div>
        </div>
        <div className={styles.heroVisual} aria-hidden="true" />
      </div>
      <div className={styles.heroPrinciples}>
        {copy.hero.sequence.split(" · ").slice(0, 4).map((label, index) => <div key={label}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            {index === 0 ? <><path d="M5 3h11l3 3v15H5zM15 3v4h4M8 11h8M8 15h5" /></> : index === 1 ? <><path d="M4 20V10h4v10M10 20V4h4v16M16 20v-7h4v7M3 20h18" /></> : index === 2 ? <><path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5" /></> : <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM12 8v5M12 16h.01" /></>}
          </svg><span>{label}</span>
        </div>)}
      </div>
    </header>
    <section aria-labelledby="current-title" className={styles.current}>
      <div className={styles.sectionHeading}>
        <div><h2 id="current-title">{copy.current.title}</h2><p>{copy.current.subtitle}</p></div>
        <p className={styles.updated}>{copy.current.updated}: <time dateTime={trendsReviewedAt}>{date}</time></p>
      </div>
      <div className={styles.currentGrid}>
        {copy.current.readings.map((reading, index) => {
          const trend = trendCatalog.find((item) => item.id === reading.id)!;
          return <article key={reading.id} className={`${styles.currentStory} ${index === 0 ? styles.leadStory : ""}`}>
            <TrendImage id={reading.id} className={styles.currentImage} />
            <div className={styles.storyCopy}>
              <h3>{trend.name[locale]}</h3>
              <p>{reading.text}</p>
              <Link href={trendPath(trend, locale)} aria-label={`${copy.current.analyze}: ${trend.name[locale]}`} className={styles.textLink}>{copy.current.analyze} <span aria-hidden="true">→</span></Link>
            </div>
          </article>;
        })}
        <article className={styles.capitalStory}>
          <p className={styles.eyebrow}>{capitalQuarterLabel(capital.quarter_end)}</p>
          <h3>{copy.current.capital}</h3>
          <div aria-hidden="true" className={styles.miniBars}>{sharedRows.slice(0, 5).map(row => <span key={row.security_id} style={{ width: `${row.percent_disclosed}%` }} />)}</div>
          <p>{copy.current.capitalText}</p>
          <a href="#capital" className={styles.textLink}>{copy.current.data} <span aria-hidden="true">→</span></a>
        </article>
      </div>
    </section>
    <section id="radar" aria-labelledby="radar-title" className={styles.radarSection}>
      <h2 id="radar-title">{copy.radar.title}</h2>
      <p className={styles.sectionText}>{copy.radar.text}</p>
      <TrendRadar trends={trends} locale={locale} />
      <p className={styles.radarNote}>{copy.radar.note} <Link href={`${trendsMethodologyPath(locale)}#editorial`} className="font-semibold text-petrol underline underline-offset-4">{copy.capital.methodology} →</Link></p>
    </section>
    <CapitalDisclosureSection capital={capital} locale={locale} alphabetUnion={alphabetUnion} />
    <section aria-labelledby="deep-title" className={styles.deepDive}>
      <p className={styles.eyebrow}>{copy.deep.eyebrow}</p>
      <h2 id="deep-title">{copy.deep.title}</h2>
      <p className={styles.deepText}>{copy.deep.text}</p>
      <Link data-deep-dive href={trendPath(trendCatalog[0], locale)} className={styles.deepCta}>{copy.deep.cta} <span aria-hidden="true" className="ml-2">→</span></Link>
    </section>
  </div>;
}
