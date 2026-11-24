import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "@/lib/seo/structured-data";
import { trendCatalog, trendPath, trendsMethodologyPath, trendsPath, type TrendDefinition } from "@/lib/trends/catalog";
import { educationSourceIds } from "@/lib/trends/research/education";
import { getResearchTrend } from "@/lib/trends/research/data";
import { researchCopy } from "@/lib/trends/research/copy";
import { date } from "@/lib/trends/research/format";
import type { Locale } from "@/lib/trends/research/types";
import { ResearchChart, Sources } from "./ResearchVisuals";
import { ResearchSection } from "./ResearchSections";
import { TrendsAnalytics } from "./TrendsAnalytics";
import s from "./research.module.css";

export function TrendDetailPage({definition,locale}:{definition:TrendDefinition;locale:Locale}) {
  const t = getResearchTrend(definition,locale), c = researchCopy[locale], path = trendPath(definition,locale);
  const sourceIds= t.id===12 ? [...t.sources,...educationSourceIds] : t.sources;
  const current = trendCatalog.findIndex(d => d.id === definition.id), next = trendCatalog[(current+1)%trendCatalog.length];
  return <article data-trends-page className={`${s.page} ${s.detailPage}`}><TrendsAnalytics/><JsonLd data={[buildWebPageJsonLd({pathname:path,name:t.name,description:t.snapshot,language:locale}),buildBreadcrumbJsonLd(locale,[{name:c.eyebrow,pathname:trendsPath(locale)},{name:t.name,pathname:path}])]} />
    <nav className={s.breadcrumb} aria-label={locale === "es" ? "Ruta de navegación" : "Breadcrumb"}><Link href={trendsPath(locale)}>{c.all}</Link><span aria-hidden="true">/</span><span aria-current="page">{t.name}</span></nav>
    <header className={s.detailHeader}><div><p className={s.eyebrow}>{c.categories[definition.category]}</p><h1>{t.name}</h1></div><p className={s.meta}>{c.reviewed}<br/><time dateTime={definition.reviewedAt}>{date(definition.reviewedAt,locale)}</time></p></header>
    <section className={s.snapshot} aria-labelledby="snapshot-title"><p id="snapshot-title" className={s.eyebrow}>{c.snapshot}</p><p>{t.snapshot}</p></section>
    <div className={s.mainVisual}><ResearchChart chart={t.chart} locale={locale}/></div>
    <div className={s.readingLayout}><aside className={s.sectionNav}><p className={s.eyebrow}>{locale === "es" ? "En esta ficha" : "In this profile"}</p><nav aria-label={locale === "es" ? "Secciones de la ficha" : "Profile sections"}>{c.sections.map((label,i)=><a key={label} href={`#trend-body-${i}`}>{label}</a>)}</nav><Link href={trendsMethodologyPath(locale)} className={s.textLink}>{c.methodology}</Link></aside><div className={s.disclosures}>{c.sections.map((title,i)=><details key={title} id={`trend-section-${i}`} open={i === 0} className={s.disclosure} data-trend-section={i}><summary><span><h2>{title}</h2><span>{c.sectionNotes[i]}</span></span><span className={s.disclosureSign} aria-hidden="true"/></summary><div id={`trend-body-${i}`} className={s.disclosureBody}><ResearchSection index={i} trend={t} locale={locale}/></div></details>)}</div></div>
    <section className={s.valueClose}><p className={s.eyebrow}>{locale === "es" ? "Lectura" : "Reading"}</p><h2>{c.value}</h2><p>{t.value}</p><Sources ids={t.moat_sources} locale={locale}/></section>
    <details className={s.innerDisclosure}><summary>{c.sources} · {sourceIds.length}</summary><div className={s.sourceIndex}><Sources ids={sourceIds} locale={locale}/></div><p className={s.note}>{t.further_analysis}</p></details>
    <nav className={s.nextNav} aria-label={c.next}><Link href={trendsPath(locale)}>{c.all}</Link><Link href={trendPath(next,locale)}><span>{c.next}</span><strong>{next.name[locale]}</strong></Link></nav><p className={s.disclaimer}>{c.disclaimer}</p>
  </article>;
}
