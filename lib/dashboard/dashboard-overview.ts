import { flowMagnitudeReferences, magnitudePercentileText } from './flow-magnitude';
import type { CapitalFlowAssetPreview } from './capital-flows-preview-types';
import { metricAt } from './capital-flow-comparison.mjs';
import { sessionDates } from '../research/mcclellan-core.mjs';
import { formatCapitalFlowDate } from './capital-flows-presentation.ts';
import type { DashboardLocale } from './dashboard-localization.ts';

export type DashboardOverviewSecondary = { label: string; value: string; detail?: string; date?: string; available?: boolean };
export type DashboardOverviewItem = { id: string; label: string; value: string; detail?: string; date?: string; tone?: 'positive' | 'negative' | 'neutral'; available?: boolean; reference?: { text: string; period: string }; secondary?: DashboardOverviewSecondary };
const assetNames = { es:{sp500:'S&P 500',gold:'Oro',btc:'Bitcoin',eth:'Ethereum',ewj:'Japón'}, en:{sp500:'S&P 500',gold:'Gold',btc:'Bitcoin',eth:'Ethereum',ewj:'Japan'} };
export function formatFlowAmount(value:number | null, locale:DashboardLocale = 'es') {
  if(value == null) return locale === 'en' ? 'No data' : 'Sin dato';
  if(locale === 'es') {
    const [whole,decimal] = (Math.abs(value)/1e6).toFixed(1).split('.');
    return `${value > 0 ? '+' : value < 0 ? '−' : ''}${whole.replace(/\B(?=(\d{3})+(?!\d))/g,'.')},${decimal} M USD`;
  }
  const absolute = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-ES',{minimumFractionDigits:1,maximumFractionDigits:1}).format(Math.abs(value)/1e6);
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}${absolute} M USD`;
}
function monthKey(asOf:Date) {
  const parts = new Intl.DateTimeFormat('en-US',{year:'numeric',month:'2-digit',timeZone:'Europe/Madrid'}).formatToParts(asOf);
  return `${parts.find(part=>part.type==='year')!.value}-${parts.find(part=>part.type==='month')!.value}`;
}
export function flowMonthCaption(locale:DashboardLocale = 'es', asOf = new Date()) {
  const label = new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-ES',{month:'long',year:'numeric',timeZone:'Europe/Madrid'}).format(asOf);
  return `${label[0].toUpperCase()}${label.slice(1)} · USD`;
}
export function flowOverviewItems(models:CapitalFlowAssetPreview[], locale:DashboardLocale = 'es', asOf = new Date()):DashboardOverviewItem[] {
  const month = monthKey(asOf);
  return models.map(model=>{
    const cutoff = model.cutoffDate;
    const inMonth = cutoff?.startsWith(month) ?? false;
    const expected = inMonth ? sessionDates(`${month}-01`,cutoff!) : [];
    const points = cutoff ? model.points.filter(point=>point.date<=cutoff) : [];
    const actual = points.filter(point=>point.date>=`${month}-01`);
    const complete = expected.length > 0 && actual.length === expected.length && actual.every((point,index)=>point.date===expected[index] && point.complete && point.flow != null);
    // Keep GLD's published endpoint-NAV convention; other assets sum daily flows.
    // A missing current-month session is insufficient data, never a zero or an older month.
    const observations = model.metricBasis === 'ending-nav' ? model.observations : undefined;
    const ref = flowMagnitudeReferences(model).monthly;
    const current = complete ? (model.metricBasis==='ending-nav' && !observations ? (ref.sessions===expected.length ? ref.current : null) : metricAt(points,expected.length,points.length-1,observations)) : null;
    const daily = model.metricBasis==='ending-nav' && !observations ? (inMonth ? flowMagnitudeReferences(model).daily.current : null) : inMonth && points.at(-1)?.date === cutoff ? metricAt(points,1,points.length-1,observations) : null;
    const percentileText = inMonth && current !== null ? magnitudePercentileText(ref,locale) : null;
    return {reference:percentileText ? {text:`${percentileText} · ${locale==='en'?'MTD':'mes en curso'}`,period:`${ref.start}–${ref.end} · n=${ref.observations} · ${ref.sessions} ${locale==='en'?'sessions/month':'sesiones/mes'}`} : undefined,id:model.id,label:assetNames[locale][model.id],value:current == null ? (locale === 'en' ? 'Not enough monthly data' : 'Datos mensuales insuficientes') : formatFlowAmount(current,locale),
      detail:`1D${model.metricBasis === 'ending-nav' ? (locale === 'en' ? ' implied' : ' implícito') : ''} · ${formatFlowAmount(daily,locale)}`,
      date:cutoff ? formatCapitalFlowDate(cutoff,locale) : locale === 'en' ? 'No close available' : 'Sin cierre disponible',
      tone:current == null || current === 0 ? 'neutral' : current > 0 ? 'positive' : 'negative'};
  });
}
export function flowCardTitle(model:CapitalFlowAssetPreview, locale:DashboardLocale = 'es') {
  if(model.vehicles.length>3) return locale === 'en' ? 'Spot ETF flows' : 'Flujos de ETF spot';
  const funds = new Intl.ListFormat(locale,{style:'long',type:'conjunction'}).format(model.vehicles);
  return locale === 'en' ? (funds ? `${funds} flows` : 'ETF flows') : (funds ? `Flujos de ${funds}` : 'Flujos de ETF');
}

