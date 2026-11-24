import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "@/lib/seo/structured-data";
import { trendCatalog, trendPath, trendsMethodologyPath, trendsPath } from "@/lib/trends/catalog";
import { getResearchTrend } from "@/lib/trends/research/data";
import { researchCopy } from "@/lib/trends/research/copy";
import type { Locale } from "@/lib/trends/research/types";
import { ResearchCatalog } from "./ResearchCatalog";
import { TrendsAnalytics } from "./TrendsAnalytics";
import s from "./research.module.css";

const pictures: Record<string,string> = {ai:"ai",automation:"automation",energy:"energy",longevity:"longevity",cybersecurity:"cybersecurity",defense:"defense",fintech:"fintech","premium-consumption":"consumption","water-food":"food",space:"space","critical-materials":"materials","digital-education":"education",infrastructure:"cities",robotics:"robotics",crypto:"crypto",quantum:"quantum","precious-metals":"precious-metals"};
export function TrendsExplorer({ locale }: { locale: Locale }) {
  const c = researchCopy[locale];
  const cards = trendCatalog.map(d => { const t = getResearchTrend(d,locale); return {id:d.id,href:trendPath(d,locale),name:t.name,short:t.snapshot.split(/(?<=[.!?])\s/).slice(0,2).join(" "),category:d.category,image:`/images/trends/${pictures[d.id]}.${["quantum","precious-metals"].includes(d.id) ? "webp" : "jpg"}`}; });
  return <div data-trends-page className={s.page}><TrendsAnalytics /><JsonLd data={[buildWebPageJsonLd({pathname:trendsPath(locale),name:c.eyebrow,description:c.intro,language:locale},"CollectionPage"),buildBreadcrumbJsonLd(locale,[{name:locale === "es" ? "Inicio" : "Home",pathname:locale === "es" ? "/" : "/en"},{name:c.eyebrow,pathname:trendsPath(locale)}])]} />
    <header className={s.catalogHero}><div className={s.heroArt} aria-hidden="true"/><div className={s.heroCopy}><p className={s.eyebrow}>{locale === "es" ? "Investigación estructural" : "Structural research"}</p><h1>{c.eyebrow}</h1><p className={s.heroSubtitle}>{c.intro}</p><a href="#temas" className={s.primaryButton}>{c.explore}</a></div></header>
    <div className={s.principles}><div><strong>{locale === "es" ? "ENFOQUE ESTRUCTURAL" : "STRUCTURAL APPROACH"}</strong></div>{c.principles.map(label => <p key={label}>{label}</p>)}</div>
    <section id="temas" className={s.catalogSection}><div className={s.sectionHeading}><div><h2>{c.catalogue}</h2><p>{c.catalogueNote}</p></div><Link href={trendsMethodologyPath(locale)}>{c.methodology}</Link></div><ResearchCatalog cards={cards} locale={locale}/></section>
    <aside className={s.editorialClose}><p className={s.eyebrow}>{c.chartRead}</p><h2>{c.title.split("\n")[0]}<br/>{c.title.split("\n")[1]}</h2><p>{c.methodIntro}</p><Link href={trendsMethodologyPath(locale)} className={s.textLink}>{c.methodology}</Link></aside><p className={s.disclaimer}>{c.disclaimer}</p>
  </div>;
}
