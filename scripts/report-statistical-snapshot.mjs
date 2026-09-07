import { readFileSync } from 'node:fs';
import { createEngine } from './statistical-levels-offline.mjs';

// Use production's isolated formula boundary without importing its executable CLI.
// Each verification gets its own clock and aggregation scope; no live files are read
// as price inputs and no generator, provider request or output-writing loop runs.
export function createReportStatisticalEngine(asOf) {
  const source = readFileSync(new URL('./build-statistical-levels.mjs', import.meta.url), 'utf8');
  const loaded = createEngine(source, `${asOf}T23:59:59.999Z`);
  // The report must retain its exact current mark/opening. buildKeyLevels itself
  // excludes that current week from estimation. Production's completed-history
  // adapter remains unchanged and is used normally by its own generation flow.
  loaded.context.aggregateRows = loaded.aggregateAll;
  return loaded.engine;
}

// Same Statistical Levels calculations; filter BEFORE any aggregation or estimation.
export function buildReportAssetSnapshot(asset, sourceRows, asOf, provider) {
  const { aggregateRows, buildAssetRecord, seasonalityObservations, buildWeeklySeasonalityCells, buildMonthlySeasonalityCells } = createReportStatisticalEngine(asOf);
  const rows = sourceRows.filter(row => row.date <= asOf);
  if (rows.at(-1)?.date !== asOf) throw new Error(`${asset.ticker}: missing exact close for ${asOf}`);
  const record = buildAssetRecord(asset, rows, provider);
  const historical = rows.filter(row => row.date < `${asOf.slice(0, 4)}-01-01`);
  const monthly = seasonalityObservations(historical, 'monthly', asOf).filter(o => o.month === 9 && o.phase === 'midterm');
  // Cap comparable YEARS after filtering the cycle, never ten calendar years.
  const years = [...new Set(monthly.map(o => o.year))].sort((a,b) => b-a).slice(0, 10);
  const weekly = seasonalityObservations(historical, 'weekly', asOf).filter(o => o.month === 9 && years.includes(o.year));
  const weeks = buildWeeklySeasonalityCells(weekly);
  const summary = buildMonthlySeasonalityCells(monthly.filter(o => years.includes(o.year)))[0];
  const ranked = [...weeks].sort((a,b) => b.averageReturn-a.averageReturn);
  return structuredClone({
    ticker: asset.ticker, symbol: asset.yahooSymbol, asOf, provider,
    periodStart: aggregateRows(rows, 'weekly').at(-1).periodStart,
    closeConvention: asset.category === 'Cripto' ? 'Cierre diario UTC del 4 de septiembre; semana de lunes a domingo, aún incompleta al corte.' : 'Cierre regular; serie ajustada del proveedor congelada en la captura.',
    levels: record.keyStatisticalLevels.weekly,
    seasonality: {
      month: 9, cycle: 'midterm', window: 'All', years, sampleSize: years.length,
      weeks, averageReturn: summary?.averageReturn ?? null, winRate: summary?.winRate ?? null,
      averageWeeklyWinRate: weeks.length ? weeks.reduce((s,w)=>s+w.winRate,0)/weeks.length : null,
      averageWeeklySampleSize: weeks.length ? weeks.reduce((s,w)=>s+w.sampleSize,0)/weeks.length : 0,
      strongestWeek: ranked[0]?.weekOfMonth ?? null, weakestWeek: ranked.at(-1)?.weekOfMonth ?? null,
      methodology: 'Retorno entre cierres semanales ajustados. La semana se asigna por su fecha de cierre: Semana 1 = días 1–7; Semana 5 = días 29–31. Solo septiembres de años Midterm completos anteriores a 2026; hasta 10 ciclos. N puede variar por semana. La primera semana puede incluir días de agosto.',
      observations: weekly.map(({date,year,weekOfMonth,returnValue})=>({date,year,weekOfMonth,returnValue})),
    },
    reading: {lastClose:record.lastClose,lastDate:record.lastDate,returns:record.returns,distanceLongAverage:record.distanceToMovingAverages.ma200,percentile:record.windows['5Y'].ma200ExtensionPercentile,zScore:record.windows['5Y'].ma200ExtensionZScore,currentDrawdown:record.windows.Full.currentDrawdown},
  });
}
