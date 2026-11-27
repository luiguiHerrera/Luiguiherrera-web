export type IndicatorPoint = { date: string; value: number };
export type IndicatorReference = {
  cutoff: string; current: number; delta20: number | null; comparisonDate: string | null;
  percentile: number | null; observations: number; start: string | null; end: string | null;
};

/** Empirical CDF: prior observations <= current. Ties are included, current is excluded. */
export function indicatorReference(points: IndicatorPoint[], cutoff: string, sessions: readonly string[], minimum = 252): IndicatorReference | null {
  if (points.some((p,i)=>!Number.isFinite(p.value) || (i > 0 && points[i-1].date >= p.date))) return null;
  const current = points.find(p=>p.date === cutoff);
  if (!current) return null;
  const anniversary = new Date(cutoff + 'T12:00:00Z'); anniversary.setUTCFullYear(anniversary.getUTCFullYear()-5);
  const start = anniversary.toISOString().slice(0,10);
  const previous = points.filter(p=>p.date >= start && p.date < cutoff);
  const index = sessions.indexOf(cutoff);
  const comparisonDate = index >= 20 ? sessions[index-20] : null;
  const base = points.find(p=>p.date === comparisonDate);
  return {cutoff, current:current.value, delta20:base ? current.value-base.value : null, comparisonDate:base ? comparisonDate : null,
    percentile:previous.length >= minimum ? previous.filter(p=>p.value<=current.value).length/previous.length*100 : null,
    observations:previous.length, start:previous[0]?.date ?? null, end:previous.at(-1)?.date ?? null};
}

export function riskReferenceText(ref: IndicatorReference | null | undefined, locale: 'es'|'en', scale = 100, unit = 'pp') {
  if (!ref || (ref.percentile === null && ref.delta20 === null)) return null;
  const n = (v:number) => new Intl.NumberFormat(locale==='en'?'en-US':'es-ES',{maximumFractionDigits:1,minimumFractionDigits:1}).format(v).replace(/-/g,'−');
  return [ref.delta20 === null ? null : `${ref.delta20>0?'+':''}${n(ref.delta20*scale)} ${unit} ${locale==='en'?'over 20 sessions':'en 20 sesiones'}`,
    ref.percentile === null ? null : `${locale==='en'?'Historical percentile':'Percentil histórico'} ${Math.round(ref.percentile)}`].filter(Boolean).join(' · ');
}
