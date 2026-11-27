import type { PriceParticipationInput } from './price-participation';
import type { PriceParticipationMonthSummary } from './price-participation-month';

export const PARTICIPATION_READINGS = {
  broadAdvance: ['El índice avanza con una participación sectorial amplia.', 'The index is rising with broad sector participation.'],
  concentratedAdvance: ['El índice avanza, pero el liderazgo permanece concentrado.', 'The index is rising, but leadership remains concentrated.'],
  divergentAdvance: ['El índice avanza, pero RAMO y RASI se deterioran durante el mes.', 'The index is rising, but RAMO and RASI are deteriorating over the month.'],
  improvingDecline: ['La participación interna mejora, aunque el índice todavía retrocede.', 'Internal participation is improving, although the index is still declining.'],
  broadDecline: ['El índice retrocede con debilidad sectorial amplia.', 'The index is declining with broad sector weakness.'],
  deterioratingDecline: ['El índice retrocede y la amplitud interna se deteriora.', 'The index is declining and internal breadth is deteriorating.'],
  mixed: ['Las señales de precio y participación son mixtas.', 'Price and participation signals are mixed.'],
  insufficient: ['Falta evidencia comparable para una interpretación conjunta.', 'Comparable evidence is insufficient for a joint interpretation.'],
} as const;
export type ParticipationReadingId = keyof typeof PARTICIPATION_READINGS;
export const PARTICIPATION_RULES = {
  es: [
    'Participación amplia: SPY > 0; al menos 8 de 11 sectores positivos; RSP − SPY ≥ 0; RAMO y RASI no disminuyen, y al menos uno aumenta.',
    'Liderazgo concentrado: SPY > 0; como máximo 5 sectores positivos; RSP − SPY < 0; RAMO y RASI no aumentan.',
    'Avance divergente: SPY > 0 y tanto RAMO como RASI disminuyen; se evalúa después del liderazgo concentrado.',
    'Mejora interna con caída: SPY < 0; RSP − SPY > 0; RAMO y RASI aumentan. No implica participación sectorial amplia.',
    'Debilidad amplia: SPY < 0; al menos 8 sectores negativos; RSP − SPY ≤ 0; RAMO y RASI no aumentan, y al menos uno disminuye.',
    'Deterioro con caída: SPY < 0 y tanto RAMO como RASI disminuyen; se evalúa después de la debilidad amplia.',
    'Señales mixtas: datos completos que no cumplen las reglas anteriores, incluido SPY sin cambio.',
    'Evidencia insuficiente: falta SPY, RSP, algún sector o RAMO/RASI en cualquiera de los dos extremos del mes. No se sustituye una fecha por otra.',
  ],
  en: [
    'Broad participation: SPY > 0; at least 8 of 11 sectors positive; RSP − SPY ≥ 0; neither RAMO nor RASI declines and at least one rises.',
    'Concentrated leadership: SPY > 0; at most 5 sectors positive; RSP − SPY < 0; neither RAMO nor RASI rises.',
    'Divergent advance: SPY > 0 and both RAMO and RASI decline; evaluated after concentrated leadership.',
    'Internal improvement during a decline: SPY < 0; RSP − SPY > 0; both RAMO and RASI rise. This does not imply broad sector participation.',
    'Broad weakness: SPY < 0; at least 8 sectors negative; RSP − SPY ≤ 0; neither RAMO nor RASI rises and at least one declines.',
    'Deterioration during a decline: SPY < 0 and both RAMO and RASI decline; evaluated after broad weakness.',
    'Mixed signals: complete data that meet none of the previous rules, including unchanged SPY.',
    'Insufficient evidence: missing SPY, RSP, any sector or RAMO/RASI at either monthly endpoint. Dates are never substituted.',
  ],
};

/** All comparisons share the MTD summary endpoints, never the detail selector. */
export function participationReading(month: PriceParticipationMonthSummary | null, input: PriceParticipationInput | null) {
  const base = input?.breadth?.points.find(p => p.date === month?.comparisonDate);
  const last = input?.breadth?.points.find(p => p.date === month?.cutoffDate);
  const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  const ramoChange = finite(base?.oscillator) && finite(last?.oscillator) ? last.oscillator - base.oscillator : null;
  const rasiChange = finite(base?.summation) && finite(last?.summation) ? last.summation - base.summation : null;
  let id: ParticipationReadingId = 'insufficient';
  if (month?.status === 'available' && month.participation.covered === 11 && finite(month.spyReturnPct) && finite(month.relativePp) && ramoChange !== null && rasiChange !== null) {
    const {spyReturnPct: spy, relativePp: relative, participation: p} = month;
    const improving = ramoChange > 0 && rasiChange > 0;
    const weakening = ramoChange < 0 && rasiChange < 0;
    if (spy > 0 && p.positive >= 8 && relative >= 0 && ramoChange >= 0 && rasiChange >= 0 && (ramoChange > 0 || rasiChange > 0)) id = 'broadAdvance';
    else if (spy > 0 && p.positive <= 5 && relative < 0 && ramoChange <= 0 && rasiChange <= 0) id = 'concentratedAdvance';
    else if (spy > 0 && weakening) id = 'divergentAdvance';
    else if (spy < 0 && relative > 0 && improving) id = 'improvingDecline';
    else if (spy < 0 && p.negative >= 8 && relative <= 0 && ramoChange <= 0 && rasiChange <= 0 && (ramoChange < 0 || rasiChange < 0)) id = 'broadDecline';
    else if (spy < 0 && weakening) id = 'deterioratingDecline';
    else id = 'mixed';
  }
  return {id, ramoChange, rasiChange, start: month?.comparisonDate ?? null, end: month?.cutoffDate ?? null};
}
