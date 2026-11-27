import type { CapitalFlowAssetPreview } from './capital-flows-preview-types';
import { metricAt } from './capital-flow-comparison.mjs';
import { sessionDates } from '../research/mcclellan-core.mjs';

export type FlowMagnitudeReference = {
  current: number | null; mean: number | null; medianAbsolute: number | null; percentile: number | null;
  observations: number; start: string | null; end: string | null;
  mode: 'same-month'|'prior-three-months'|'equivalent-months'; sessions: number; minimum: number;
};
function monthShift(month: string, shift: number) {
  const [y,m] = month.split('-').map(Number);
  return new Date(Date.UTC(y,m-1+shift,1)).toISOString().slice(0,7);
}
function summarize(current:number|null, samples:{value:number;start:string;end:string}[], mode:FlowMagnitudeReference['mode'], sessions:number, minimum:number):FlowMagnitudeReference {
  const values=samples.map(s=>s.value), sorted=values.map(Math.abs).sort((a,b)=>a-b), n=values.length;
  const ready=current!==null && n>=minimum;
  return {current, mode, sessions, minimum, observations:n,
    mean:ready ? values.reduce((sum,v)=>sum+v,0)/n : null,
    medianAbsolute:ready ? (sorted[Math.floor((n-1)/2)]+sorted[Math.floor(n/2)])/2 : null,
    percentile:ready ? values.filter(v=>Math.abs(v)<=Math.abs(current)).length/n*100 : null,
    start:samples.map(s=>s.start).sort()[0]??null,end:samples.map(s=>s.end).sort().at(-1)??null};
}

/** References stay within one declared vehicle universe and one calculation basis. */
export function flowMagnitudeReferences(model:CapitalFlowAssetPreview) {
  const cutoff=model.cutoffDate, points=model.points.filter(p=>!cutoff || p.date<=cutoff);
  const month=cutoff?.slice(0,7)??'2024-01';
  if(model.magnitudeReferences?.cutoff===model.cutoffDate)return model.magnitudeReferences;
  const universe=[...(model.comparisonUniverse ?? model.vehicles)].sort().join(',');
  const unique=new Set(points.map(p=>p.date)).size===points.length && points.every((p,i)=>i===0 || p.date>points[i-1].date);
  const compatible=(start:number,end:number)=>unique && points.slice(start,end+1).every(p=>model.id==='btc' ? (model.referenceUniverses?.[p.date]?.slice().sort().join(',')===universe) : (!p.funds.length || p.funds.map(f=>f.ticker).sort().join(',')===universe));
  const value=(sessions:number,end:number)=>{
    if (!cutoff || !universe || !compatible(Math.max(0,end-sessions+1),end) || (model.metricBasis==='ending-nav' && !model.observations?.length)) return null;
    const v=metricAt(points,sessions,end,model.metricBasis==='ending-nav'?model.observations:undefined);
    return v!==null && Number.isFinite(v) ? v : null;
  };
  const currentDaily=points.at(-1)?.date===cutoff ? value(1,points.length-1) : null;
  const dailySamples=(start:string,end:string)=>points.flatMap((p,i)=>{
    if(p.date<start || p.date>=end)return [];
    const v=value(1,i);return v===null ? [] : [{value:v,start:p.date,end:p.date}];
  });
  let daily=dailySamples(month+'-01',cutoff??month+'-01'), mode:FlowMagnitudeReference['mode']='same-month';
  if(daily.length<20) {daily=dailySamples(monthShift(month,-3)+'-01',month+'-01');mode='prior-three-months';}
  const expected=cutoff ? sessionDates(month+'-01',cutoff) : [];
  const currentRows=points.filter(p=>p.date>=month+'-01');
  const complete=expected.length>0 && currentRows.length===expected.length && currentRows.every((p,i)=>p.date===expected[i]);
  const k=expected.length;
  const currentMonth=complete ? value(k,points.length-1) : null;
  const monthly:{value:number;start:string;end:string}[]=[];
  if(k>0) for(let offset=24;offset>=1;offset--) {
    const prior=monthShift(month,-offset);
    if(prior<'2024-01')continue;
    const next=monthShift(prior,1)+'-01';
    const endMonth=new Date(Date.parse(next+'T12:00:00Z')-86400000).toISOString().slice(0,10);
    const dates=sessionDates(prior+'-01',endMonth).slice(0,k);
    if(dates.length!==k)continue;
    const end=points.findIndex(p=>p.date===dates.at(-1));
    if(end<k-1 || points.slice(end-k+1,end+1).some((p,i)=>p.date!==dates[i]))continue;
    const v=value(k,end); if(v!==null)monthly.push({value:v,start:dates[0],end:dates.at(-1)!});
  }
  return {cutoff:model.cutoffDate,daily:summarize(currentDaily,daily,mode,1,20),monthly:summarize(currentMonth,monthly,'equivalent-months',k,12)};
}

export function magnitudePercentileText(ref:FlowMagnitudeReference, locale:'es'|'en') {
  return ref.percentile===null ? null : `${locale==='en'?'Percentile':'Percentil'} ${Math.round(ref.percentile)}`;
}
