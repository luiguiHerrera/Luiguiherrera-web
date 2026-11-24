import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {renderToStaticMarkup} from 'react-dom/server';
import original from './research-v2.es.json';
import {getResearch,getResearchTrend,getSource,vehicleAnnex} from './data';
import {displayMeasure,changeDisplay} from './format';
import {researchCopy} from './copy';
import {trendCatalog,trendPath} from '../catalog';
import {TrendsExplorer} from '../../../components/trends/TrendsExplorer';
import {TrendDetailPage} from '../../../components/trends/TrendDetailPage';
import {TrendsMethodologyPage} from '../../../components/trends/TrendsMethodologyPage';
import {getRouteMetadata} from '../../seo/site';
import {translatePathname} from '../../i18n/routes';
import type {Position} from './types';
import {educationChain,educationPrograms,educationSourceIds} from './education';
import {CapitalEventCard,EducationPosition} from '../../../components/trends/EducationResearch';

function numericLeaves(o:unknown,path=''):unknown[] {
 if(Array.isArray(o))return o.flatMap((v,i)=>numericLeaves(v,`${path}[${i}]`));
 if(o&&typeof o==='object')return Object.entries(o).flatMap(([k,v])=>numericLeaves(v,`${path}.${k}`));
 return typeof o==='number'||typeof o==='boolean'||o===null ? [[path,o]] : [];
}
test('authoritative Spanish JSON is byte-identical to the supplied package',()=>{
 const actual=createHash('sha256').update(readFileSync(new URL('./research-v2.es.json',import.meta.url),'utf8')).digest('hex');
 assert.equal(actual,'a684c892c31c708a83bead21b4c20731f4d620bb3fccc2cc2be13ae8dd6cc4e6');
 assert.equal(trendCatalog.length,17);
});
test('display overrides are not scaled a second time, raw values and units remain intact',()=>{
 const health=original.trends[3].chart;
 const row=health.rows![1];
 assert.deepEqual(displayMeasure(row,'es',health),{value:'1.400',unit:'millones de personas'});
 assert.equal(row.value,1.4);assert.equal(health.unit,'miles de millones de personas');
 assert.equal(displayMeasure({value:1.4,unit:'billions',display_scale:1000,display_unit:'millions'},'en').value,'1,400');
 assert.equal(displayMeasure({value:null,unit:'USD'},'en').value,'Not available');
 assert.equal(displayMeasure(original.trends[13].chart.rows![0],'es').value,'casi 250.000');
 assert.equal(displayMeasure(original.trends[8].chart.rows![2],'es').value,'al menos 50');
});
test('noncomparable and newly reported positions never produce zero-based changes',()=>{
 const p=getResearch('es').capital_positions[0];
 assert.deepEqual(changeDisplay({...p,newly_reported:true,quantity_from:null,delta:100,delta_pct:100},'es'),{label:'Nueva declaración',delta:null,percent:null,tone:'neutral'});
 assert.deepEqual(changeDisplay({...p,comparison_eligible:false,delta:100,delta_pct:100} as Position,'en'),{label:'Not comparable',delta:null,percent:null,tone:'neutral'});
 const crwd=getResearch('es').capital_excluded_comparisons[0];assert.equal(crwd.ticker,'CRWD');
 assert.ok(getResearch('en').capital_methodology.snb.includes('passiv'));
});
for(const locale of ['es','en'] as const){
 test(`${locale}: complete catalogue and local navigation`,()=>{
  const html=renderToStaticMarkup(<TrendsExplorer locale={locale}/>);
  assert.equal((html.match(/<article\b/g)??[]).length,17);
  assert.ok(html.includes('CollectionPage')&&html.includes('BreadcrumbList'));
  for(const definition of trendCatalog)assert.ok(html.includes(trendPath(definition,locale)));
  const method=renderToStaticMarkup(<TrendsMethodologyPage locale={locale}/>);
  assert.ok(method.includes('CRWD')&&method.includes('13F'));
  assert.ok(method.includes('BreadcrumbList')&&method.includes('"@type":"WebPage"'));
 });
 for(const definition of trendCatalog){
  test(`${locale}/${definition.id}: all nine sections, content, figures and reciprocal language route`,()=>{
   const t=getResearchTrend(definition,locale), c=researchCopy[locale];
   const html=renderToStaticMarkup(<TrendDetailPage definition={definition} locale={locale}/>);
   assert.equal((html.match(/data-trend-section=/g)??[]).length,9);
   assert.equal((html.match(/<h1\b/g)??[]).length,1);
   assert.match(html,/<details[^>]*open=""[^>]*data-trend-section="0"/);
   for(const risk of t.risks){assert.ok(risk.mechanism&&risk.evidence&&risk.watch&&risk.sources.length);assert.ok(html.includes(risk.title.replaceAll('&','&amp;')));}
   for(const p of t.policy)assert.ok(p.status&&p.sources.length);
   assert.ok(html.includes(c.snapshot)&&html.includes(c.value));
   assert.ok(t.metrics.length&&t.chain.edges.length&&t.vehicles.length);
   const raw=original.trends[t.id-1];assert.deepEqual(numericLeaves(t),numericLeaves(raw));
   const ids=[...t.sources,...t.moat_sources,...t.metrics.map(m=>m.source),...t.risks.flatMap(r=>r.sources),...t.policy.flatMap(p=>p.sources),...t.vehicles.flatMap(v=>v.sources),...vehicleAnnex(t.id,locale).flatMap(v=>v.sources)].filter(Boolean) as string[];
   for(const id of ids){const source=getSource(id,locale);assert.ok(source,`Missing ${id}`);assert.match(source.url,/^https:\/\//);}
   const path=trendPath(definition,locale), other=locale==='es'?'en':'es';
   assert.equal(translatePathname(path,other),trendPath(definition,other));
   assert.ok(getRouteMetadata(path).alternates?.canonical?.toString().endsWith(path));
  });
 }
}
test('shared capital English values and flags match the supplied contract',()=>{
 for(const key of ['capital_positions','capital_events','gold_capital_rows','gold_direct_evidence','capital_excluded_comparisons'] as const)assert.deepEqual(numericLeaves(getResearch('en')[key]),numericLeaves(getResearch('es')[key]));
});
test('all original source URLs and value-chain relations are retained in English',()=>{
 for(const [id,s] of Object.entries(original.sources))assert.equal(getSource(id,'en')?.url,s.url);
 for(const definition of trendCatalog){const a=getResearchTrend(definition,'es'),b=getResearchTrend(definition,'en');assert.deepEqual(a.chain.edges,b.chain.edges);assert.deepEqual(a.chain.nodes.map(n=>n.id),b.chain.nodes.map(n=>n.id));assert.deepEqual(a.vehicles.map(v=>v.ticker),b.vehicles.map(v=>v.ticker));}
});

for(const locale of ['es','en'] as const){
 test(`${locale}: review date belongs to each trend and the catalogue has no shared cutoff`,()=>{
  const catalogue=renderToStaticMarkup(<TrendsExplorer locale={locale}/>);
  assert.ok(!catalogue.includes('<time'));
  const changed={...trendCatalog[0],reviewedAt:'2026-12-01'};
  const html=renderToStaticMarkup(<TrendDetailPage definition={changed} locale={locale}/>);
  assert.ok(html.includes('dateTime="2026-12-01"')||html.includes('datetime="2026-12-01"'));
  assert.equal(trendCatalog[1].reviewedAt,'2026-11-24');
 });
 test(`${locale}: education distinguishes the stock exchange ratio, institutional holding and funded access`,()=>{
  const data=getResearch(locale),event=data.capital_events.find(e=>e.id==='CAP_COUR_UDEMY_2026')!;
  const html=renderToStaticMarkup(<CapitalEventCard event={event} locale={locale}/>);
  assert.ok(!html.includes(researchCopy[locale].unavailable));
  assert.ok(html.includes(locale==='es'?'0,8':'0.8'));
  assert.ok(html.includes(event.unit!));
  assert.ok(html.includes(getSource('EDU_COURSERA_EXCHANGE',locale)!.url));
  assert.equal(event.amount,undefined);
  const position=data.capital_positions.find(p=>p.id==='C035')!;
  const positionHTML=renderToStaticMarkup(<EducationPosition position={position} locale={locale}/>);
  assert.ok(positionHTML.includes('Duolingo')&&positionHTML.includes('Swiss National Bank'));
  assert.ok(positionHTML.includes(locale==='es'?'79.260':'79,260'));
  assert.ok(positionHTML.includes('data-position-id="C035"')&&!positionHTML.includes('data-event-id'));
  assert.deepEqual(educationPrograms(locale).map(p=>p.measure.value),[100000,75]);
  for(const p of educationPrograms(locale))for(const source of p.sources)assert.ok(getSource(source,locale));
  for(const source of educationSourceIds)assert.ok(getSource(source,locale));
 });
 test(`${locale}: education funding reaches distribution without changing the service chain or adding a cycle`,()=>{
  const originalChain=getResearchTrend(trendCatalog[11],locale).chain;
  const chain=educationChain(originalChain,locale),ids=new Set(chain.nodes.map(n=>n.id));
  assert.equal(ids.size,chain.nodes.length);
  for(const edge of originalChain.edges)assert.ok(chain.edges.some(e=>e.source===edge.source&&e.target===edge.target));
  assert.ok(chain.edges.some(e=>e.source==='access-funding'&&e.target==='n3'&&e.kind==='funding'));
  const visit=(id:string,ancestors=new Set<string>())=>{assert.ok(!ancestors.has(id),'Cycle in value chain');for(const edge of chain.edges.filter(e=>e.source===id)){assert.ok(ids.has(edge.target));visit(edge.target,new Set([...ancestors,id]));}};
  for(const id of ids)visit(id);
 });
}

for (const locale of ['es', 'en'] as const) {
 test(`${locale}: published profiles contain final analysis instead of drafting instructions`, () => {
  const pages = new Map(trendCatalog.map(definition => [definition.id, renderToStaticMarkup(<TrendDetailPage definition={definition} locale={locale}/>)]));
  const published = [...pages.values()].join('\n');
  assert.doesNotMatch(published, /escribiría|inventaría ticker|(?:mostraría|mantendría) esta fila|añadiría FedNow|I would (?:not )?write|I would describe Bitcoin|I would not invent tickers|I would (?:show|keep) this row|I would add FedNow|I would show economic and operational relationships|I would retain the range rather than invent/iu);
  assert.doesNotMatch(published, /investigación para Codex|research for Codex/iu);
  const blockchain = pages.get('crypto')!;
  assert.match(blockchain, /Bitcoin \(BTC\)/u);
  assert.match(blockchain, /ether \(ETH\)/u);
  assert.match(blockchain, locale === 'es' ? /evalúo su exposición económica real/u : /I assess its actual economic exposure/u);
  const cyber = pages.get('cybersecurity')!;
  assert.match(cyber, locale === 'es' ? /Me ocupa la distancia/u : /I focus on the distance/u);
  assert.match(cyber, locale === 'es' ? /recuperar el dinero/u : /recovering money/u);
  const fintech = pages.get('fintech')!;
  assert.match(fintech, locale === 'es' ? /8\.413\.402 pagos/u : /8,413,402 payments/u);
  assert.match(fintech, locale === 'es' ? /no mide clientes ni ingresos/u : /does not measure customer counts or revenue/u);
 });
}
