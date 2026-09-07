// Explicit one-off research capture. Never imported by the app or export generator.
// Refuses to overwrite an existing capture. Outputs outside live Statistical Levels.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { buildReportAssetSnapshot, createReportStatisticalEngine } from './report-statistical-snapshot.mjs';
const output = process.argv[2];
if (!output) throw new Error('Provide a new output directory for review.');
fs.mkdirSync(output, {recursive:false});
const asOf='2026-09-04';
const { universe, parseYahooChart, buildAssetRecord } = createReportStatisticalEngine(asOf);
const tickers=['SPY','GLD','FXI','EWJ','BTCUSD','ETHUSD','RSP','IWM','QQQ',...universe.filter(a=>a.ticker.startsWith('XL')).map(a=>a.ticker),'NVDA','FUTU'];
const evidence={}, assets={}, readings={}, earnings={};
for(const ticker of tickers){
  const asset=universe.find(a=>a.ticker===ticker) ?? {ticker,name:ticker,yahooSymbol:ticker,category:'Acciones'};
  const url=`https://query1.finance.yahoo.com/v8/finance/chart/${asset.yahooSymbol}?period1=0&period2=1788566400&interval=1d&events=history`;
  const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
  if(!response.ok) throw new Error(`${ticker}: HTTP ${response.status}`);
  const body=await response.text();
  const rows=parseYahooChart(body).rows.filter(r=>r.date<=asOf);
  if(rows.at(-1)?.date!==asOf) throw new Error(`${ticker}: missing ${asOf}; received ${rows.at(-1)?.date}`);
  evidence[ticker]={url,sha256:createHash('sha256').update(body).digest('hex'),rows};
  if(['SPY','GLD','FXI','EWJ','BTCUSD','ETHUSD'].includes(ticker)){
    assets[ticker]=buildReportAssetSnapshot(asset,rows,asOf,'Yahoo Finance historical chart');
    readings[ticker]=assets[ticker].reading;
    console.log(ticker,assets[ticker].levels.lastClose,assets[ticker].seasonality.years);
  }else if(['NVDA','FUTU'].includes(ticker)){
    const dates=ticker==='NVDA'?['2026-08-26','2026-08-27']:['2026-08-19','2026-08-20'];
    const pair=dates.map(date=>rows.find(r=>r.date===date));
    if(pair.some(r=>!r)) throw new Error(`${ticker}: reaction close missing`);
    earnings[ticker]={beforeDate:dates[0],afterDate:dates[1],before:pair[0].close,after:pair[1].close,actualMovePct:(pair[1].close/pair[0].close-1)*100};
    console.log(ticker,earnings[ticker]);
  }else{
    const record=buildAssetRecord(asset,rows,'Yahoo Finance historical chart');
    readings[ticker]={lastDate:record.lastDate,lastClose:record.lastClose,returns:record.returns,distanceLongAverage:record.distanceToMovingAverages.ma200};
  }
}
fs.writeFileSync(path.join(output,'prices-evidence.json.gz'),gzipSync(JSON.stringify(evidence)),{flag:'wx'});
fs.writeFileSync(path.join(output,'statistical.json'),JSON.stringify({asOf,assets,readings,earnings},null,2),{flag:'wx'});
