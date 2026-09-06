import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as fixes from '../lib/statistical-levels/defect-repairs.mjs';
const out=process.argv[2]??'/private/tmp/statistical-levels-defect-repair-evidence';
const reference='/private/tmp/statistical-levels-approved-redesign';
const require=createRequire(import.meta.url);
const read=file=>fs.readFileSync(file,'utf8');
function engine(file){const s=read(file),c=vm.createContext({path,process,console,URLSearchParams,setTimeout,...fixes});vm.runInContext(s.slice(s.indexOf('const outputPath'),s.indexOf('\nconst assets = [];'))+'\nglobalThis.e={normalizeRow,buildDailySeasonalityData,drawdownSeries,correlation:typeof correlation === "function"?correlation:null};',c);return c.e;}
const old=engine(reference+'/scripts/build-statistical-levels.mjs'),now=engine('scripts/build-statistical-levels.mjs');
const test='lib/statistical-levels/defect-repairs.test.ts';
const fixtures=[];
const dd=closes=>Array.from(now.drawdownSeries(closes)).map(v=>Number(v.toFixed(6)));
fixtures.push({DEFECT_ID:'SL-DEF-001',INPUT:{closes:[100,80,90],selectedLastPeriods:2},OLD_RESULT:{chart:dd([100,80,90]),headlineMaximum:0,chartN:3,headlineN:2},WHY_WRONG:'The chart includes an earlier peak outside the selected window and displays a 20% decline beside a selected-window maximum of 0%.',NEW_RESULT:{chart:dd([80,90]),headlineMaximum:0,chartN:2,headlineN:2},WHY_CORRECT:'The peak resets at the selected window start. Both the chart and metrics use the same two closes.',TEST:test+' / SL-DEF-001'});
const price=[{close:100,ma200:50},{close:200,ma200:100}];
const oldFn=read(reference+'/components/statistical-levels/StatBandsChart.tsx');const declaration=ts.createSourceFile('chart.tsx',oldFn,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX).statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text==='pathFromSeries');const fnCode=ts.transpileModule(declaration.getText(),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;const oldPath=new Function(fnCode+'; return pathFromSeries;')();
fixtures.push({DEFECT_ID:'SL-DEF-002',INPUT:price,OLD_RESULT:{price:oldPath(price,'close'),ma:oldPath(price,'ma200')},WHY_WRONG:'Independent scales make a moving average at half the price coincide with the price line.',NEW_RESULT:fixes.commonPricePaths(price),WHY_CORRECT:'One minimum and spread transform both series. Equal levels have equal y coordinates and different levels remain different.',TEST:test+' / SL-DEF-002'});
fixtures.push({DEFECT_ID:'SL-DEF-003',INPUT:'Frozen adjusted-close daily return aliases',OLD_RESULT:fixes.dailyReturnAliases.map(a=>a.oldAlias),WHY_WRONG:'Week/month/year labels do not identify 4, 12, 52, 126 or 252 observed daily sessions, especially for 24/7 assets.',NEW_RESULT:fixes.dailyReturnAliases.map(a=>({OLD_ALIAS:a.oldAlias,ACTUAL_SEMANTICS:`C[t] / C[t-${a.periods}] - 1; observed daily adjusted closes`,NEW_ALIAS:a.alias,ES:a.es,EN:a.en})),WHY_CORRECT:'Labels identify exact session counts; stored legacy keys and all return values remain unchanged for compatibility.',TEST:test+' / SL-DEF-003'});
const input=[null,undefined,0,.5,.1,.9];
fixtures.push({DEFECT_ID:'SL-DEF-004',INPUT:['null','undefined',0,.5,.1,.9],OLD_RESULT:{buckets:input.map(v=>{v=v??.5;return v<=.33?'low':v>=.67?'high':'middle';}),middleN:3,validN:6},WHY_WRONG:'Missing values become synthetic middle locations and enter the denominator and rankings.',NEW_RESULT:{buckets:input.map(fixes.closeLocationBucket),middleN:1,validN:4,unavailableN:2,allNull:{validN:0,category:null,rankings:null}},WHY_CORRECT:'Unavailable locations are excluded and counted separately. Numerical zero remains a valid low location.',TEST:test+' / SL-DEF-004; null-fixture-es.html; null-fixture-en.html'});
const r=['2024-12-31','2025-01-31','2025-12-31','2026-01-15'].map((date,i)=>now.normalizeRow({date,periodStart:date,periodEnd:date,open:100+i*10,high:200,low:1,close:i===3?1:100+i*10,adjustedClose:i===3?1:100+i*10,volume:1}));
const january=e=>e.windows.All.monthly.general.find(c=>c.month===1);
fixtures.push({DEFECT_ID:'SL-DEF-005',INPUT:{rows:r.map(r=>({date:r.date,adjustedClose:r.adjustedClose})),asOf:'2026-01-16'},OLD_RESULT:january(old.buildDailySeasonalityData('TEST',r)),WHY_WRONG:'An unfinished January outlier contaminates the completed January sample, mean, median, win rate and N.',NEW_RESULT:january(now.buildDailySeasonalityData('TEST',r,'2026-01-16')),WHY_CORRECT:'Only the completed January 2025 return remains. N=1, mean=median=10%, win rate=100%. The current month contributes nothing.',TEST:test+' / SL-DEF-005'});
const dates=(start)=>Array.from({length:20},(_,i)=>({date:new Date(Date.UTC(2025,0,start+i)).toISOString().slice(0,10),value:i+1}));
const a=dates(1),b=dates(10);
fixtures.push({DEFECT_ID:'SL-DEF-006',INPUT:{A:a,B:b},OLD_RESULT:{value:old.correlation(a.map(p=>p.value),b.map(p=>p.value)),assumedN:20},WHY_WRONG:'Equal-length shifted date ranges are paired by position and falsely pass the minimum-N requirement.',NEW_RESULT:fixes.datedCorrelation(a,b),WHY_CORRECT:'The inner join finds only 11 valid matching dates; the existing minimum is 20, so correlation is unavailable and N=11 is disclosed.',TEST:test+' / SL-DEF-006'});
assert.equal(fixtures[1].OLD_RESULT.price,fixtures[1].OLD_RESULT.ma);
assert.notEqual(fixtures[1].NEW_RESULT.close,fixtures[1].NEW_RESULT.ma200);
assert.equal(fixtures[4].NEW_RESULT.sampleSize,1);assert.equal(fixtures[5].NEW_RESULT.n,11);
fs.writeFileSync(path.join(out,'defect-fixtures.json'),JSON.stringify(fixtures,null,2));
// Real presentation component rendered with a controlled React initial state, outside the app.
// No fixture route or fake market data is shipped in the application.
function load(file,closeMode=false){
  const mod={exports:{}};
  const code=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
  const req=id=>id==='react'&&closeMode?{...React,useState:initial=>[initial==='opening'?'close':initial,()=>{}]}:id.includes('defect-repairs')?fixes:require(id);
  new Function('require','module','exports',code)(req,mod,mod.exports);return mod.exports;
}
const Opening=load('components/statistical-levels/OpeningLocationPanel.tsx',true).OpeningLocationPanel;
const spy=JSON.parse(read('lib/statistical-levels/generated/assets/SPY.json'));
spy.frequencies.weekly.recentPeriods=spy.frequencies.weekly.recentPeriods.slice(0,2).map(row=>({...row,closeLocation:null}));
for(const locale of ['es','en']) {
  const markup=renderToStaticMarkup(React.createElement(Opening,{asset:spy,frequency:'weekly',locale}));
  assert.ok(markup.includes('N 0'));assert.ok(!markup.includes('Close in the middle zone'));assert.ok(!markup.includes('Cierre en zona media'));
  fs.writeFileSync(path.join(out,`null-fixture-${locale}.html`),markup);
}
console.log('PASS six before/after fixtures; rendered all-null ES/EN without category or ranking inference');

const lab=ts.createSourceFile('lab.tsx',read('components/statistical-levels/StatLevelsLab.tsx'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const functions=['CorrelationHeatmap','RowCells','formatCorrelation','correlationColor'];
const selected=lab.statements.filter(n=>ts.isFunctionDeclaration(n)&&functions.includes(n.name.text)).map(n=>n.getText()).join('\n');
const matrixModule={exports:{}};
const code=ts.transpileModule('const displayStatTicker = t => t;\n'+selected,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('require','exports',code)(require,matrixModule.exports);
for(const locale of ['es','en']) {
 const matrix={alignment:'canonical_calendar_date',tickers:['A','B'],minObservations:20,values:{A:{A:1,B:null},B:{A:null,B:1}},matchedObservations:{A:{A:20,B:11},B:{A:11,B:20}}};
 const html=renderToStaticMarkup(React.createElement(matrixModule.exports.CorrelationHeatmap,{matrix,selectedTickers:['A','B'],emptyLabel:locale==='en'?'Correlation unavailable':'Correlación no disponible'}));
 assert.ok(html.includes('n/d'));assert.ok(html.includes('N 11'));
 fs.writeFileSync(path.join(out,`correlation-fixture-${locale}.html`),html);
}
