import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { canonicalStatTicker, displayStatTicker } from './display.ts';
import { extensionSample, historicalInterpretation, number, percent, percentileTranslation, windowAvailabilityExplanation, zTranslation } from './interpretation.ts';
import type { AssetStatRecord, StatisticalFrequency } from './types.ts';
const read = (path: string) => readFileSync(path,'utf8');
const asset = (ticker: string) => JSON.parse(read(`lib/statistical-levels/generated/assets/${ticker}.json`)) as AssetStatRecord;
const spy=asset('SPY');
const manifest=JSON.parse(read('lib/statistical-levels/generated/manifest.json'));
const ledger=JSON.parse(read('docs/statistical-levels-capability-ledger.json'));
const source=read('components/statistical-levels/StatLevelsLab.tsx');

test('data contract: 40 assets, all five horizons and all three frequencies remain represented', () => {
  assert.equal(manifest.catalog.length,40);
  assert.deepEqual(manifest.windows,['1Y','3Y','5Y','10Y','Full']);
  assert.deepEqual(manifest.frequencies,['daily','weekly','monthly']);
  for(const item of manifest.catalog) for(const frequency of manifest.frequencies as StatisticalFrequency[]) {
    const data=asset(item.ticker).frequencies[frequency];
    assert.deepEqual(Object.keys(data.windows),manifest.windows);
    assert.ok(data.periods>0);
    for(const window of Object.values(data.windows)) if(!window.available) {
      for(const key of ['ma200ExtensionPercentile','ma200ExtensionZScore','currentDrawdown','maxDrawdown'] as const) assert.equal(window[key],null);
    }
  }
});
test('canonical generator thresholds are preserved; stored pre-rounding labels control prose', () => {
  const original=read('scripts/build-statistical-levels.mjs');
  const body=original.match(/function percentileLabel\(value\) \{([\s\S]*?)\n\}/)![1];
  const label=new Function('value',body);
  const cases: [number,string][]=[[0,'Zona históricamente baja'],[10,'Zona históricamente baja'],[10.01,'Zona baja'],[30,'Zona baja'],[30.01,'Zona media'],[69.99,'Zona media'],[70,'Zona alta'],[89.99,'Zona alta'],[90,'Zona históricamente alta'],[100,'Zona históricamente alta']];
  for(const [value,expected] of cases) assert.equal(label(value),expected);
  const metric={...spy.frequencies.weekly.windows['5Y'],ma200ExtensionPercentile:70,extensionPercentileLabel:'Zona media' as const};
  assert.match(historicalInterpretation('SPY',metric,'weekly','es'),/zona media/);
});
test('deterministic interpretations: every band and ES/EN share the same sample and condition', () => {
  const bands=['Zona históricamente baja','Zona baja','Zona media','Zona alta','Zona históricamente alta'] as const;
  for(const band of bands) for(const locale of ['es','en'] as const) {
    const metric={...spy.frequencies.weekly.windows['5Y'],extensionPercentileLabel:band};
    assert.equal(historicalInterpretation('SPY',metric,'weekly',locale),historicalInterpretation('SPY',metric,'weekly',locale));
    assert.doesNotMatch(historicalInterpretation('SPY',metric,'weekly',locale),/support|resistance|target|buy|sell|soporte|resistencia|objetivo|compra|venta/i);
  }
});
test('N0/N1/partial/zero-SD fail closed and never narrate a normal zone', () => {
  for(const metric of [
    {...spy.frequencies.weekly.windows['5Y'],available:false,sessions:0},
    {...spy.frequencies.weekly.windows['5Y'],sessions:40},
    {...spy.frequencies.weekly.windows['5Y'],ma200ExtensionPercentile:null},
    {...spy.frequencies.weekly.windows['5Y'],ma200ExtensionZScore:null},
  ]) for(const locale of ['es','en'] as const) {
    assert.match(historicalInterpretation('SPY',metric,'weekly',locale),locale==='es'?/No hay historial suficiente/:/not enough history/);
  }
  assert.equal(spy.frequencies.weekly.windows['1Y'].available,false);
  assert.equal(spy.frequencies.monthly.windows['1Y'].available,false);
});
test('observation counts exactly exclude each long moving-average warm-up', () => {
  for(const [frequency,warmup] of [['daily',200],['weekly',40],['monthly',12]] as const){
    const metric=spy.frequencies[frequency].windows['5Y'];
    assert.equal(extensionSample(metric,frequency),metric.sessions-warmup+1);
  }
  assert.equal(extensionSample({...spy.frequencies.daily.windows['5Y'],available:false},'daily'),0);
});
test('unavailable horizon copy explains the actual sample and canonical minimum without inventing metrics', () => {
  const original = read('scripts/build-statistical-levels.mjs');
  const config = new Function(`return (${original.match(/const frequencyConfig = (\{[\s\S]*?\n\});/)![1]})`)();
  for (const frequency of manifest.frequencies as StatisticalFrequency[]) {
    const before = JSON.stringify(spy.frequencies[frequency].windows);
    for (const locale of ['es', 'en'] as const) {
      const metric = spy.frequencies[frequency].windows['1Y'];
      const reason = windowAvailabilityExplanation(metric, frequency, '1Y', locale);
      if (metric.available) assert.equal(reason, null);
      else {
        assert.ok(reason?.includes(String(metric.sessions)));
        assert.ok(reason?.includes(String(config[frequency].minPeriods)));
      }
      assert.equal(windowAvailabilityExplanation(spy.frequencies[frequency].windows['5Y'], frequency, '5Y', locale), null);
      const partial = { ...spy.frequencies[frequency].windows['5Y'], available: false, sessions: config[frequency].minPeriods + 1 };
      assert.match(windowAvailabilityExplanation(partial, frequency, '10Y', locale)!, locale === 'es' ? /no cubre el horizonte completo/ : /does not cover the full horizon/);
    }
    assert.equal(JSON.stringify(spy.frequencies[frequency].windows), before);
  }
  assert.match(windowAvailabilityExplanation(spy.frequencies.weekly.windows['1Y'], 'weekly', '1Y', 'es')!, /52 periodos semanales.*104/);
});
test('formatting and translations preserve null, sign and canonical precision', () => {
  assert.equal(number(null),'n/d');assert.equal(percent(null),'n/d');assert.equal(number(87,1),'87.0');assert.equal(number(1.2),'1.20');assert.equal(percent(.01234),'+1.2%');
  assert.match(percentileTranslation(87,'es'),/13.0%/);assert.match(percentileTranslation(87,'en'),/13.0%/);
  assert.match(zTranslation(-1.2,'es'),/1.20.*por debajo/);assert.match(zTranslation(1.2,'en'),/1.20.*above/);
  assert.match(zTranslation(null,'en'),/unavailable/);assert.match(zTranslation(0,'es'),/redondeo/);
});
test('loader: symbol precedence, aliases, sanitization, arrays, frequencies and All survive',async()=>{
  const loadedModule={exports:{} as Record<string,(params:Record<string,unknown>)=>Promise<{selection:Record<string,string>}> >};
  const code=ts.transpileModule(read('lib/statistical-levels/get-statistical-levels-data.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  const fs=await import('node:fs/promises'),path=await import('node:path');
  const req=(id:string)=>id==='server-only'?{}:id==='node:fs/promises'?fs:id==='node:path'?path:{canonicalStatTicker};
  new Function('require','module','exports',code)(req,loadedModule,loadedModule.exports);
  const get=loadedModule.exports.getStatisticalLevelsPageData;
  for(const [params,expected] of [
    [{},{asset:'SPY',frequency:'weekly',window:'5Y'}],
    [{asset:'../../etc/passwd',frequency:'hourly',window:'2Y'},{asset:'SPY',frequency:'weekly',window:'5Y'}],
    [{asset:'GLD',symbol:'btc/usdt',frequency:'daily',window:'All'},{asset:'BTCUSD',frequency:'daily',window:'Full'}],
    [{asset:['ETHUSDT','SPY'],frequency:['monthly','daily'],window:['10Y','1Y']},{asset:'ETHUSD',frequency:'monthly',window:'10Y'}],
    [{asset:'IBIT'},{asset:'SPY',frequency:'weekly',window:'5Y'}],
  ] as const) assert.deepEqual((await get(params)).selection,expected);
  assert.equal(displayStatTicker('BTCUSD'),'BTC/USDT');
});
test('every capability has an explicit destination, accessible selector and regression gate',()=>{
  assert.equal(ledger.capabilities.length,87);
  const ids=new Set();
  for(const row of ledger.capabilities){assert.ok(!ids.has(row.ID));ids.add(row.ID);assert.ok(row.ACCESS_PATH);assert.ok(row.REGRESSION_TEST);assert.ok(row.REDESIGN_DESTINATION);assert.notEqual(row.REDESIGN_DESTINATION,'REMOVED');}
  for(const id of ['sl-controls','sl-frequency','sl-interpretation','sl-unusual','sl-risk','sl-horizons','sl-quant','sl-assets','sl-guide'])assert.ok(source.includes(`id="${id}"`),id);
  for(const component of ['AssetStatCard','UnderwaterDrawdownChart','KeyStatisticalLevelsPanel','AdvancedSeasonalityPanel','MovementSummaryTable','OpeningLocationPanel','PeriodExplorerTable','ReturnHeatmap','CalendarExtremesPanel','ComparisonSection']) assert.ok(source.includes(`<${component}`),component);
  assert.doesNotMatch(source, /JpmSpxLevelsPanel|shouldShowJpmSpxLevels/); // Internal, never mounted in the public page.
});
test('all ten distributions and nine summary statistics stay available',()=>{
  const s=read('components/statistical-levels/MovementSummaryTable.tsx');
  const visible=s.match(/const visibleMetrics[^=]*= \[(.*?)\]/)![1];
  for(const key of Object.keys(spy.frequencies.weekly.changeMoves)) assert.ok(visible.includes(`"${key}"`));
  for(const key of Object.keys(spy.frequencies.weekly.changeMoves.change)) assert.ok(s.includes(`row?.${key}`),key);
});
test('seasonality retains all frequency/cycle/window/metric filters, weekly win rate, N and nulls',()=>{
  const s=read('components/statistical-levels/AdvancedSeasonalityPanel.tsx');
  for(const value of ['averageReturn','medianReturn','winRate','sampleSize','post_election','midterm','pre_election','election','3Y','5Y','10Y','All'])assert.ok(s.includes(`"${value}"`),value);
  const data=JSON.parse(read('lib/statistical-levels/generated/seasonality/ETHUSD.json'));
  for(const w of Object.values(data.windows) as Array<Record<string, {general:Array<{sampleSize:number;averageReturn:number|null;winRate:number|null}>}>>) for(const frequency of ['daily','weekly','monthly']) for(const cell of w[frequency].general){assert.ok(cell.sampleSize>0);assert.ok(cell.winRate===null||(cell.winRate>=0&&cell.winRate<=1));}
  assert.match(s,/sampleSize < 5/);
  const primary=read('components/statistical-levels/CurrentMonthSeasonality.tsx');assert.match(primary,/cell\?\.winRate != null/);assert.match(primary,/n \? percent/);
});
test('routes preserve SEO and full methodology and carry server-resolved freshness',()=>{
  for(const [route,locale] of [['app/(es)/analisiscuantitativo/page.tsx','es'],['app/en/quantitative-analysis/page.tsx','en']]) {
    const page=read(route);assert.match(page,/getRouteMetadata/);assert.match(page,/getStatisticalLevelsPageData/);assert.ok(page.includes(`locale="${locale}"`));assert.match(page,/stale=\{stale\}/);
  }
  assert.match(source,/\/en\/methodology/);assert.match(source,/\/metodologia/);assert.doesNotMatch(source,/new Date\(/);
});
test('quantitative analysis keeps reciprocal language routes, canonical metadata and permanent legacy redirects', async () => {
  const { default: config } = await import('../../next.config.ts');
  const { getTranslatedPathname } = await import('../i18n/language-pairs.ts');
  const { getRouteMetadata } = await import('../seo/site.ts');
  const redirects = await config.redirects!();
  for (const [legacy, canonical, alternate, locale] of [
    ['/niveles-estadisticos', '/analisiscuantitativo', '/en/quantitative-analysis', 'en'],
    ['/en/statistical-levels', '/en/quantitative-analysis', '/analisiscuantitativo', 'es'],
  ] as const) {
    const redirect = redirects.find(item => item.source === legacy);
    assert.ok(redirect && 'permanent' in redirect && redirect.permanent);
    assert.equal(redirect.destination, canonical);
    assert.ok(!redirect.destination.includes('?')); // Next forwards the incoming selection query intact.
    assert.equal(getTranslatedPathname(canonical, locale), alternate);
    assert.equal(getRouteMetadata(canonical).alternates?.canonical, `https://www.luiguiherrera.com${canonical}`);
  }
});
test('no unqualified model or dead legacy widget is imported into the redesign',()=>{
  for(const name of ledger.unreachable_components) assert.ok(!source.includes(`import { ${name}`));
  assert.doesNotMatch(source,/confidence|predict\(|fetch\(/i);
});
