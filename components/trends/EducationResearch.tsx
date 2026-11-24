import { educationFundingCopy, educationPrograms } from "@/lib/trends/research/education";
import { researchCopy } from "@/lib/trends/research/copy";
import { date, displayMeasure, changeDisplay, number, signed } from "@/lib/trends/research/format";
import type { CapitalEvent, Locale, Position } from "@/lib/trends/research/types";
import { DataTable, Nature, Sources } from "./ResearchVisuals";
import s from "./research.module.css";

export function EducationRelationships({locale}:{locale:Locale}) {
  const c=educationFundingCopy[locale];
  return <section className={s.sectionFlow}><h3>{c.chainTitle}</h3><p>{c.intro}</p><DataTable caption={c.chainTitle} headers={[...c.headers]} rows={c.roles.map(row=>[...row])}/><p className={s.prose}>{c.contracts}</p><Sources ids={["EDU_SANTANDER_COURSERA","EDU_SANTANDER_ACCESS","EDU_COURSERA_PARTNERS"]} locale={locale}/></section>;
}
export function EducationAccessFunding({locale}:{locale:Locale}) {
  const c=educationFundingCopy[locale],programs=educationPrograms(locale);
  return <section className={s.sectionFlow}><h3>{c.fundingTitle}</h3><p className={s.note}>{c.fundingIntro}</p><div className={s.eventGrid}>{programs.map(p=>{
    const m=displayMeasure(p.measure,locale);
    return <section className={s.panel} key={p.actor}><p className={s.eyebrow}>{p.actor}</p><h4>{p.program}</h4><p className={s.eventValue}>{m.value}</p><p className={s.meta}>{m.unit} · {p.measure.period}</p><Nature kind={p.measure.kind} locale={locale}/><p>{p.description}</p><p className={s.limit}>{p.limitation}</p><Sources ids={p.sources} locale={locale}/></section>;
  })}</div><details className={s.dataDisclosure}><summary>{researchCopy[locale].data}</summary><DataTable caption={c.table} headers={[c.program,c.scale,c.period,c.limit,c.sources]} rows={programs.map(p=>{
    const m=displayMeasure(p.measure,locale);
    return [<strong key="program">{p.actor} · {p.program}</strong>,<span key="scale">{m.value} {m.unit}<small>{p.measure.kind}</small></span>,p.measure.period,<span key="scope">{p.description}<small>{p.limitation}</small></span>,<Sources key="source" ids={p.sources} locale={locale}/>];
  })}/></details></section>;
}
export function EducationPosition({position:p,locale}:{position:Position;locale:Locale}) {
  const c=educationFundingCopy[locale],change=changeDisplay(p,locale);
  return <section className={s.panel} data-position-id={p.id}><p className={s.eyebrow}>{c.position}</p><h4>{p.asset} · {p.ticker}</h4><p>{p.actor}</p><p className={s.eventValue}>{number(p.quantity_to,locale,0)} <span>{p.unit}</span></p><p className={s.meta}>{date(p.period_to,locale)}{change.delta!=null&&<> · {change.label}: {signed(change.delta,locale,0)} {p.unit}</>}</p><p className={s.meta}>{researchCopy[locale].from}: {number(p.quantity_from,locale,0)} · {date(p.period_from,locale)}</p><p className={s.limit}>{c.passive}</p><Sources ids={p.sources} locale={locale}/></section>;
}
export function CapitalEventCard({event:e,locale}:{event:CapitalEvent;locale:Locale}) {
  const c=educationFundingCopy[locale],ratio=e.amount==null&&e.exchange_ratio!=null;
  const amount=e.amount??(ratio?e.exchange_ratio:null);
  return <section className={s.panel} data-event-id={e.id}><p className={s.eyebrow}>{e.action}</p><h4>{e.actor}{e.ticker&&` · ${e.ticker}`}</h4><p>{e.asset}</p>{amount!=null?<><p className={s.eventValue}>{number(amount,locale,3)}</p><p className={s.meta}>{ratio?`${c.exchange} · `:""}{e.unit??""}</p></>:<p className={s.meta}>{c.missing}</p>}<p className={s.meta}>{date(e.period,locale)}{e.shares!=null&&<> · {number(e.shares,locale,0)} {locale==="es"?"acciones":"shares"}</>}</p>{e.evidence&&<p>{e.evidence}</p>}{e.seller&&<p className={s.meta}>{locale==="es"?"Contraparte":"Counterparty"}: {e.seller}</p>}{e.note&&e.note!==e.limitation&&<p>{e.note}</p>}<p className={s.limit}>{e.limitation}</p><Sources ids={[...e.sources,...(e.id==="CAP_COUR_UDEMY_2026"?["EDU_COURSERA_EXCHANGE"]:[])]} locale={locale}/></section>;
}
