import type { KeyStatisticalLevelSet, CalendarWeekSeasonalityCell } from '../statistical-levels/types';

export type ReportQuantitativePanel = {
  title: string;
  intro: string;
  headers: string[];
  rows: string[][];
  notes: string[];
  range?: { low: number; high: number; current: number; marks: Array<{ label: string; value: number }> };
};
export type ReportAssetStatistics = {
  ticker: string; symbol: string; asOf: string; provider: string; periodStart: string; closeConvention: string;
  levels: KeyStatisticalLevelSet;
  seasonality: {
    month: number; cycle: string; window: string; years: number[]; sampleSize: number;
    weeks: CalendarWeekSeasonalityCell[]; averageReturn: number | null; winRate: number | null;
    averageWeeklyWinRate: number | null; averageWeeklySampleSize: number;
    strongestWeek: number | null; weakestWeek: number | null; methodology: string;
  };
};
export const LEVELS_DISCLAIMER = 'Extensiones históricas desde la apertura del periodo. No implican soporte, resistencia ni dirección futura.';
export const SEASONALITY_DISCLAIMER = 'La estacionalidad aporta contexto histórico. No implica que el patrón vaya a repetirse.';
const number = (value: number | null, digits = 2) => value === null ? 'No disponible' : new Intl.NumberFormat('es-ES', {minimumFractionDigits: digits, maximumFractionDigits: digits}).format(value);
const percent = (value: number | null) => value === null ? 'No disponible' : `${value > 0 ? '+' : ''}${number(value * 100)} %`;
const win = (value: number | null) => value === null ? 'No disponible' : `${number(value * 100, 1)} %`;

export function statisticalPanels(data: ReportAssetStatistics): ReportQuantitativePanel[] {
  const levels = data.levels, season = data.seasonality;
  const keys = ['WSLE', 'WALE', 'WAHE', 'WSHE'];
  const marks = keys.map(label => ({label, value:levels.levels[label]!}));
  const current = levels.lastClose!;
  return [{
    title:'Niveles estadísticos',
    intro:`${data.ticker} · Semanal · Apertura ${data.periodStart} · Precio al cierre del ${data.asOf}: ${number(current)} USD. ${levels.periods} periodos históricos completados.`,
    headers:['Referencia','Precio (USD)','Distancia del precio al nivel'],
    rows:[['Apertura del periodo',number(levels.currentOpen),'—'],['Precio actual al snapshot',number(current),'—'],...keys.map(key=>[key,number(levels.levels[key]),percent(levels.distances[key])])],
    notes:[LEVELS_DISCLAIMER,`${data.provider}. ${data.closeConvention} Distancia = precio / nivel − 1. La semana al corte queda fuera de la muestra de estimación.`],
    range:{low:Math.min(current,...marks.map(m=>m.value)),high:Math.max(current,...marks.map(m=>m.value)),current,marks},
  },{
    title:'Estacionalidad de septiembre',
    intro:`Septiembre · Midterm · All · N = ${season.sampleSize}. Años: ${season.years.join(', ')}.`,
    headers:['Semana','Retorno promedio','Win rate','N real'],
    rows:season.weeks.map(week=>[`Semana ${week.weekOfMonth}`,percent(week.averageReturn),win(week.winRate),String(week.sampleSize)]),
    notes:[`Retorno mensual promedio: ${percent(season.averageReturn)}. Win rate mensual: ${win(season.winRate)}. Win rate semanal medio: ${win(season.averageWeeklyWinRate)}. Semana más fuerte: ${season.strongestWeek}; más débil: ${season.weakestWeek}. N semanal medio: ${number(season.averageWeeklySampleSize,1)}.`,season.methodology,SEASONALITY_DISCLAIMER],
  }];
}
