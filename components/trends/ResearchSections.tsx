import { getResearch, vehicleAnnex } from "@/lib/trends/research/data";
import { educationChain, educationFundingCopy } from "@/lib/trends/research/education";
import { EducationRelationships, EducationAccessFunding, EducationPosition, CapitalEventCard } from "./EducationResearch";
import { policyStatusLabel } from "@/lib/trends/research/editorial";
import { researchCopy } from "@/lib/trends/research/copy";
import { changeDisplay, date, number, signed } from "@/lib/trends/research/format";
import type { GoldRow, Locale, Position, ResearchTrend, Vehicle } from "@/lib/trends/research/types";
import { DataTable, MeasureTable, ResearchChart, Sources, ValueChain } from "./ResearchVisuals";
import s from "./research.module.css";

function PositionTable({ positions, locale }: { positions: Position[]; locale: Locale }) {
  const c = researchCopy[locale];
  if (!positions.length) return null;
  return <DataTable caption={c.positions} headers={[c.actors, c.from, c.to, c.change]} rows={positions.map(p => {
    const change = changeDisplay(p, locale);
    return [<><strong>{p.actor}</strong><span>{p.asset} · {p.ticker}</span><small>CUSIP {p.cusip}</small><Sources ids={p.sources} locale={locale} /><details className={s.rowDetail}><summary>{c.limit}</summary><p>{p.limitation}</p><p>{p.corporate_action_check}</p><small>{c.declaration}: {date(p.reported_at, locale)} · {p.evidence_type}</small></details></>, <>{number(p.quantity_from, locale, 0)}<small>{p.unit} · {date(p.period_from, locale)}</small></>, <>{number(p.quantity_to, locale, 0)}<small>{p.unit} · {date(p.period_to, locale)}</small></>, <div key="change" data-tone={change.tone}><strong>{change.label}</strong>{change.delta != null && <span className={s.numeric}>{signed(change.delta, locale, 0)} {p.unit}</span>}{change.percent != null && <small>{signed(change.percent, locale)}%</small>}</div>];
  })} />;
}
export function GoldDirect({ locale }: { locale: Locale }) {
  const c = researchCopy[locale], rows = getResearch(locale).gold_direct_evidence;
  return <div className={s.goldPanels}>{rows.map((p, i) => <section className={s.panel} key={i}><h3>{p.actor}</h3><p className={s.meta}>{date(p.period_from, locale)} — {date(p.period_to, locale)}</p><dl className={s.goldValues}><div><dt>{c.from}</dt><dd>{number(p.quantity_from, locale, 4)}</dd></div><div><dt>{c.to}</dt><dd>{number(p.quantity_to, locale, 4)}</dd></div><div><dt>{c.changeShort}</dt><dd>{p.delta == null ? "—" : signed(p.delta, locale, 4)}</dd></div></dl><p className={s.meta}>{p.unit}{p.derived_tonnes != null && <> · {signed(p.derived_tonnes, locale, 4)} {locale === "es" ? "toneladas derivadas" : "derived tonnes"}</>}</p><p>{p.note}</p><Sources ids={p.sources} locale={locale} /></section>)}</div>;
}
function GoldTable({ rows, locale }: { rows: GoldRow[]; locale: Locale }) {
  const c = researchCopy[locale];
  return <DataTable caption={c.physical} headers={[c.actors, c.period, c.change, c.evidence]} rows={rows.map(p => [p.actor, `${date(p.period_from, locale)} — ${date(p.period_to, locale)}`, <>{signed(p.delta, locale, 0)} {p.unit}<small>{p.direction}</small></>, <><Sources ids={p.sources} locale={locale} /><small>{p.limitation}</small></>])} />;
}
export function CapitalResearch({ trend, locale }: { trend: ResearchTrend; locale: Locale }) {
  const c = researchCopy[locale], data = getResearch(locale);
  const selected = data.capital_positions.filter(p => trend.capital.position_ids.includes(p.id));
  const more = data.capital_positions.filter(p => trend.capital.all_position_ids.includes(p.id) && !trend.capital.position_ids.includes(p.id));
  const events = data.capital_events.filter(e => trend.capital.event_ids.includes(e.id));
  const excluded = data.capital_excluded_comparisons.filter(p => trend.id === 5 && p.ticker === "CRWD");
  return <div className={s.sectionFlow}><p className={s.prose}>{trend.capital.intro}</p><PositionTable positions={selected} locale={locale} />
    {!!more.length && <details className={s.innerDisclosure}><summary>{c.capitalMore} · {more.length}</summary><PositionTable positions={more} locale={locale} /></details>}
    {trend.capital.country_data_ref && <><GoldTable rows={data.gold_capital_rows} locale={locale} /><h3>{c.direct}</h3><GoldDirect locale={locale} /></>}
    {trend.id===12&&<EducationAccessFunding locale={locale}/>}
    {!!events.length && <><h3>{trend.id===12?educationFundingCopy[locale].casesTitle:c.corporate}</h3><div className={s.eventGrid}>{trend.id===12&&data.capital_positions.filter(p=>p.ticker==="DUOL"&&trend.capital.position_ids.includes(p.id)).map(p=><EducationPosition key={p.id} position={p} locale={locale}/>)}{events.map(e=><CapitalEventCard key={e.id} event={e} locale={locale}/>)}</div></>}
    {excluded.map(p => <aside key={p.ticker} className={s.warning}><h3>{p.actor} · {p.ticker} · {c.warning}</h3><p>{number(p.quantity_from_raw, locale, 0)} ({date(p.period_from, locale)}) / {number(p.quantity_to_raw, locale, 0)} ({date(p.period_to, locale)})</p><p>{p.reason}</p><p>{p.ui_behavior}</p><Sources ids={p.sources} locale={locale} /></aside>)}
    <p className={s.note}>{trend.capital.coverage_note}</p><details className={s.innerDisclosure}><summary>{c.caveats}</summary><div className={s.sectionFlow}>{Object.values(data.capital_methodology).map((p,i) => <p key={i}>{p}</p>)}<Sources ids={["S20", "CAP_SNB_MANDATE"]} locale={locale} /></div></details>
  </div>;
}
function VehicleTable({ vehicles, locale, caption }: { vehicles: Vehicle[]; locale: Locale; caption: string }) {
  const c = researchCopy[locale];
  return <DataTable caption={caption} headers={[c.actors, c.instrument, c.exposure, c.limit]} rows={vehicles.map(v => [<><strong>{v.name}</strong><span className={s.ticker}>{v.ticker}</span><Sources ids={v.sources} locale={locale} /></>, <>{v.exchange}<small>{v.type}</small>{v.verified_at && <small>{date(v.verified_at, locale)}</small>}{v.alternative_listings?.map((listing,i) => <small key={i}>{listing.ticker} · {listing.exchange} · {listing.instrument}</small>)}</>, v.exposure, <>{v.limitation}{v.recent_changes?.map((change,i) => <small key={i}>{date(change.date, locale)} · {change.fact}<Sources ids={[change.source]} locale={locale} /></small>)}</>])} />;
}
export function ResearchSection({ index, trend, locale }: { index: number; trend: ResearchTrend; locale: Locale }) {
  const c = researchCopy[locale];
  if (index === 0) return <div className={s.sectionFlow}><p className={s.prose}>{trend.change}</p>{trend.scope && <div className={s.scopeGrid}>{trend.scope.map((scope,i) => <section className={s.panel} key={i}><h3>{scope.layer}</h3><ul>{scope.items.map(item => <li key={item}>{item}</li>)}</ul><p>{scope.economic_question}</p></section>)}</div>}{trend.native_assets_note && <p className={s.note}>{trend.native_assets_note}</p>}</div>;
  if (index === 1) return <div className={s.sectionFlow}><p className={s.prose}>{trend.evidence_text}</p><MeasureTable rows={trend.metrics} locale={locale} caption={c.sections[1]} /><div className={s.regionGrid}>{trend.geography.map(g => <section className={s.panel} key={g.region}><h3>{g.region}</h3><p>{g.text}</p><Sources ids={g.sources} locale={locale} /></section>)}</div>{trend.additional_charts.filter(chart => !["chain_diagram", "branching_diagram", "two_panel", "milestone_timeline"].includes(chart.type)).map(chart => <ResearchChart key={chart.title} chart={chart} locale={locale} />)}{trend.additional_charts.some(chart => chart.type === "milestone_timeline") && <ResearchChart chart={{type:"timeline",title:trend.additional_charts.find(chart => chart.type === "milestone_timeline")!.title,rows:trend.metrics.map(m => ({...m,period:`${m.period} · ${m.label}`})),note:trend.additional_charts.find(chart => chart.type === "milestone_timeline")!.note}} locale={locale} />}{trend.fraud_context && <aside className={s.warning}><p>{String(trend.fraud_context.publishable_first_person)}</p><p>{String(trend.fraud_context.india_first_person)}</p><Sources ids={trend.fraud_context.source_ids as string[]} locale={locale} /></aside>}</div>;
  if (index === 2) return <div className={s.sectionFlow}><ValueChain chain={trend.id===12?educationChain(trend.chain,locale):trend.chain} locale={locale} id={`chain-${trend.id}`} />{trend.id===12&&<EducationRelationships locale={locale}/>}<p className={s.prose}>{trend.moat_reading}</p><Sources ids={trend.moat_sources} locale={locale} />{!!trend.moats?.length && <><h3>{c.moat}</h3><DataTable caption={c.moat} headers={[c.actors,c.advantage,c.test,c.erosion]} rows={trend.moats.map(m => [<>{m.actor ?? m.segment} {m.ticker && `(${m.ticker})`}<small>{m.node ?? m.examples?.join(" · ")}</small><Sources ids={m.sources} locale={locale}/></>,<>{m.advantage ?? m.barrier}<small>{m.qualification ?? m.proof_status}</small></>,m.value_test ?? m.proof_status,m.erosion ?? m.risk])} /></>}{trend.glossary && <dl className={s.glossary}>{trend.glossary.map(item => <div key={item.term}><dt>{item.term}</dt><dd>{item.definition}<Sources ids={item.sources ?? []} locale={locale}/></dd></div>)}</dl>}{trend.glossary_note && <p className={s.note}>{trend.glossary_note}</p>}</div>;
  if (index === 3) return <CapitalResearch trend={trend} locale={locale} />;
  if (index === 4) return <div className={s.sectionFlow}>{trend.policy.map((p,i) => <section className={s.policyPanel} key={i}><div><h3>{p.jurisdiction}</h3>{policyStatusLabel(p.status) && <span className={s.status}>{p.status}</span>}</div><p>{p.text}</p><Sources ids={p.sources} locale={locale} /></section>)}</div>;
  if (index === 5) return <div className={s.sectionFlow}><p className={s.note}>{c.disclaimer}</p><VehicleTable vehicles={trend.vehicles} locale={locale} caption={c.selection} />{!!vehicleAnnex(trend.id,locale).length && <details className={s.innerDisclosure}><summary>{c.annex} · {vehicleAnnex(trend.id,locale).length}</summary><VehicleTable vehicles={vehicleAnnex(trend.id,locale)} locale={locale} caption={c.annex} />{getResearch(locale).additional_vehicles.notes.map((p,i)=><p className={s.note} key={i}>{p}</p>)}</details>}</div>;
  if (index === 6) return <div className={s.argumentGrid}>{trend.arguments.map((p,i) => <section className={s.argument} data-side={i} key={i}><h3>{i === 0 ? c.positive : c.negative}</h3><p>{p}</p></section>)}</div>;
  if (index === 7) return <div className={s.invalidation}><p className={s.eyebrow}>{c.thesis}</p><p>{trend.invalidation}</p></div>;
  return <div className={s.riskList}>{trend.risks.map((risk,i) => <details className={s.risk} key={i}><summary><span><strong>{risk.title}</strong><span>{risk.mechanism}</span></span><span aria-hidden="true">+</span></summary><div className={s.riskBody}><p className={s.eyebrow}>{c.evidence}</p><p>{risk.evidence}</p><Sources ids={risk.sources} locale={locale} /><p className={s.eyebrow}>{c.watch}</p><p>{risk.watch}</p><p className={s.note}>{risk.interpretation}</p></div></details>)}</div>;
}
