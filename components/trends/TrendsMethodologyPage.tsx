import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "@/lib/seo/structured-data";
import { researchCopy } from "@/lib/trends/research/copy";
import { getResearch } from "@/lib/trends/research/data";
import { trendsMethodologyPath, trendsPath } from "@/lib/trends/catalog";
import type { Locale } from "@/lib/trends/research/types";
import { Sources } from "./ResearchVisuals";
import s from "./research.module.css";
export function TrendsMethodologyPage({locale}:{locale:Locale}) {
  const c=researchCopy[locale],d=getResearch(locale);
  const path=trendsMethodologyPath(locale);
  return <article data-trends-page className={`${s.page} ${s.detailPage}`}><JsonLd data={[buildWebPageJsonLd({pathname:path,name:c.methodology,description:c.methodIntro,language:locale}),buildBreadcrumbJsonLd(locale,[{name:c.eyebrow,pathname:trendsPath(locale)},{name:c.methodology,pathname:path}])]} /><nav className={s.breadcrumb}><Link href={trendsPath(locale)}>{c.all}</Link></nav><header className={s.detailHeader}><div><p className={s.eyebrow}>{c.eyebrow}</p><h1>{c.methodology}</h1></div></header><p className={s.prose}>{c.methodIntro}</p><div className={s.methodBody}><section id="editorial"><h2>{c.evidence}</h2><p>{c.unitRule}</p><p>{c.statusRule}</p></section><section id="positions"><h2>{c.sections[3]}</h2><p>{c.corporateRule}</p><div className={s.sectionFlow}>{Object.values(d.capital_methodology).map((p,i)=><p key={i}>{p}</p>)}<Sources ids={["S20","CAP_SNB_MANDATE","CAP_CRWD_SPLIT"]} locale={locale}/></div></section><section><h2>{c.policy}</h2><p>{c.policyRule}</p><p>{d.political_disclosures.text}</p><p>{d.political_disclosures.publication_note}</p><Sources ids={d.political_disclosures.sources} locale={locale}/></section><section><h2>{c.sections[5]}</h2>{d.additional_vehicles.notes.map((p,i)=><p key={i}>{p}</p>)}</section><details className={s.innerDisclosure}><summary>{c.sources} · {Object.keys(d.sources).length}</summary><div className={s.sourceIndex}><Sources ids={Object.keys(d.sources)} locale={locale}/></div></details></div><p className={s.disclaimer}>{c.disclaimer}</p></article>;
}
