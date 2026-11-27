import { flowMagnitudeReferences } from './flow-magnitude.ts';
import {createHash} from 'node:crypto';
import {isClosed,isSession,sessionDates} from '../research/mcclellan-core.mjs';
import {ETH_FLOW_FUNDS} from './eth-etf-flows-preview.mjs';
import {compareFlowWindow} from './capital-flow-comparison.mjs';
import {interpretFlows} from './sp500-etf-flows.mjs';

export const ETH_MCP_URL='https://mcp.cryptoetf.today/mcp';
export const ETH_PUBLIC_SOURCE='https://cryptoetf.today/en/ethereum-etf-flows';
export const ETH_HISTORY_SOURCE='https://growyourethereum.com/data/ethereum-etf-flows';

export function expectedEthFlowSession(asOf=new Date().toISOString()) {
  const instant=new Date(asOf);
  if(!Number.isFinite(instant.getTime()))throw new Error('Invalid acquisition instant');
  if(instant.getUTCHours()<7)instant.setUTCDate(instant.getUTCDate()-1);
  // Prior exchange session becomes due at the provider's T+1 morning publication.
  const day=new Date(`${instant.toISOString().slice(0,10)}T12:00:00Z`);
  for(let i=0;i<14;i++,day.setUTCDate(day.getUTCDate()-1)){
    const date=day.toISOString().slice(0,10);
    if(isClosed(date,`${instant.toISOString().slice(0,10)}T12:00:00Z`))return date;
  }
  throw new Error('No supported ETH publication session');
}

async function readResponse(response) {
  if(!response.ok||!response.body)throw new Error(`ETH source HTTP ${response.status}`);
  const reader=response.body.getReader(),chunks=[];let size=0;
  try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>2_000_000)throw new Error('ETH response too large');chunks.push(value);}}finally{await reader.cancel();}
  if(!size)throw new Error('Empty ETH response');
  return Buffer.concat(chunks).toString('utf8');
}

export async function fetchEthFundFeed({fetcher=fetch}={}) {
  let session='';
  async function rpc(method,params,id) {
    const response=await fetcher(ETH_MCP_URL,{method:'POST',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000),
      headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream',...(session?{'Mcp-Session-Id':session,'MCP-Protocol-Version':'2025-03-26'}:{})},
      body:JSON.stringify({jsonrpc:'2.0',method,params,...(id?{id}:{})})});
    const sid=response.headers.get('mcp-session-id');if(sid)session=sid;
    if(response.status===202&&!id)return null;
    const text=await readResponse(response);
    const json=(response.headers.get('content-type')??'').includes('text/event-stream')
      ?text.split('\n').filter(line=>line.startsWith('data:')).map(line=>JSON.parse(line.slice(5))).find(value=>value.id===id):JSON.parse(text);
    if(json?.error||!json?.result)throw new Error('ETH protocol response invalid');
    return json.result;
  }
  await rpc('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'LuiguiHerreraDashboard',version:'1.0'}},1);
  await rpc('notifications/initialized',{});
  const result=await rpc('tools/call',{name:'get_fund_flows',arguments:{asset:'eth'}},2);
  if(result.isError)throw new Error('ETH source returned an error');
  const feed=result.structuredContent??JSON.parse(result.content?.find(item=>item.type==='text')?.text??'null');
  if(feed?.symbol!=='ETH'||feed.windowDays!==30||!Array.isArray(feed.days))throw new Error('ETH identity or free-window schema changed');
  return feed;
}

export function parseEthFundFeed(feed,asOf) {
  if(feed?.symbol!=='ETH'||feed.windowDays!==30||!Array.isArray(feed.days)||!Number.isFinite(Date.parse(asOf)))throw new Error('Invalid ETH feed');
  const points=[];let previous='';
  for(const row of feed.days){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(row.date??'')||row.date<=previous||new Date(`${row.date}T12:00:00Z`).toISOString().slice(0,10)!==row.date)throw new Error('ETH duplicate, invalid or unordered date');
    previous=row.date;
    if(!isSession(row.date)||!isClosed(row.date,asOf))continue;
    if(!Array.isArray(row.funds))throw new Error('ETH fund breakdown missing');
    const byTicker=new Map();
    for(const fund of row.funds){
      if(!ETH_FLOW_FUNDS.includes(fund.ticker)||byTicker.has(fund.ticker))throw new Error('ETH fund universe changed or duplicated');
      if(fund.netFlowUsdM!==null&&!Number.isFinite(fund.netFlowUsdM))throw new Error('ETH fund number invalid');
      byTicker.set(fund.ticker,fund.netFlowUsdM);
    }
    const funds=ETH_FLOW_FUNDS.map(ticker=>({ticker,flow:byTicker.get(ticker)==null?null:Math.round(byTicker.get(ticker)*1e6)}));
    const known=funds.filter(fund=>fund.flow!=null);
    if(known.length&&Number.isFinite(row.totalUsdM)&&Math.abs(known.reduce((sum,f)=>sum+f.flow,0)-row.totalUsdM*1e6)>(known.length+1)*50_000+1)throw new Error('ETH published total does not reconcile');
    const complete=known.length===ETH_FLOW_FUNDS.length&&Number.isFinite(row.totalUsdM)&&row.status!=='partial';
    points.push({date:row.date,flow:complete?Math.round(row.totalUsdM*1e6):null,complete,funds});
  }
  return points;
}

export function mergeEthFlowHistory(previous,feed,asOf,through='9999-12-31') {
  const fresh=parseEthFundFeed(feed,asOf).filter(point=>point.date<=through);
  const byDate=new Map(previous.points.filter(point=>point.date<=through).map(point=>[point.date,point]));
  for(const point of fresh){
    // An incomplete revision never overwrites a complete retained close.
    if(point.complete||!byDate.get(point.date)?.complete)byDate.set(point.date,point);
  }
  const dates=[...byDate.keys()].sort();
  if(!dates.length)throw new Error('No ETH history');
  const points=sessionDates(dates[0],dates.at(-1)).map(date=>byDate.get(date)??{date,flow:null,complete:false,funds:[]});
  return {...previous,points};
}

export function buildEthAutomaticModel(history,feed,asOf) {
  const merged=mergeEthFlowHistory(history,feed,asOf);
  const last=merged.points.findLast(point=>point.complete);
  if(!last)throw new Error('No complete ETH close');
  const points=merged.points.filter(point=>point.date<=last.date);
  if(points.length<20)throw new Error('Insufficient ETH history');
  const latestReported=merged.points.at(-1);
  const missing=latestReported&&!latestReported.complete&&latestReported.date>last.date?latestReported:null;
  const funds=last.funds?.length?last.funds:history.lastCompleteDate===last.date&&Array.isArray(history.latestFunds)?history.latestFunds:[];
  const magnitudeReferences=flowMagnitudeReferences({id:'eth',cutoffDate:last.date,points,vehicles:[...ETH_FLOW_FUNDS],metricBasis:'daily-sum'});
  return {magnitudeReferences,id:'eth',title:'Ethereum · Flujos de ETF',eyebrow:'ETHEREUM · ETF SPOT ESTADOUNIDENSES',
    description:'Entradas y salidas netas publicadas para los ETF estadounidenses de Ethereum.',kind:'published',metricBasis:'daily-sum',
    cutoffDate:last.date,points:points.slice(-60).map(({date,flow,complete})=>({date,flow,complete,funds:[]})),
    interpretations:Object.fromEntries([5,20,60].map(window=>[window,interpretFlows(points,window)])),
    comparisons:[1,5,20].map(sessions=>({sessions,...compareFlowWindow(points,sessions)})),vehicles:[...ETH_FLOW_FUNDS],
    sources:[{name:'CryptoETF.today',url:ETH_PUBLIC_SOURCE},{name:'Histórico · GrowYourEthereum',url:ETH_HISTORY_SOURCE},{name:'Histórico · licencia CC BY 4.0',url:'https://creativecommons.org/licenses/by/4.0/'}],
    refreshMode:'automatic',retrievedAt:asOf,sourceHash:createHash('sha256').update(JSON.stringify(feed)).digest('hex'),
    coverage:{reported:funds.filter(f=>f.flow!=null).length,expected:ETH_FLOW_FUNDS.length,firstDate:points[0].date,sourceFirstDate:history.sourceFirstDate??points[0].date,
      funds,latestPartial:missing?{date:missing.date,reported:missing.funds.filter(f=>f.flow!=null).length,missing:missing.funds.filter(f=>f.flow==null).map(f=>f.ticker)}:null,
      updateNote:'Actualización diaria alojada a las 07:00 UTC y comprobaciones con caché horaria. Los informes llegan normalmente al día siguiente del cierre. Se conserva el historial validado en un archivo privado persistente; un fallo no convierte los datos ausentes en ceros.'},
    notes:[
      'Universo fijo de 11 fondos estadounidenses de Ethereum, incluidos algunos con staking. No representa todos los vehículos ni flujos on-chain o hacia exchanges.',
      'Se utilizan los flujos netos publicados por CryptoETF.today, en millones de USD. No se sustituyen por variaciones del patrimonio o de las tenencias de ETH. Se contrastan los totales con sus 11 contribuciones dentro de su precisión de redondeo.',
      'El histórico inicial procede de GrowYourEthereum, bajo CC BY 4.0, con Farside Investors como fuente original. Solo se utilizan cierres con cifras explícitas para el mismo universo. El 23 de octubre de 2026 queda sin dato completo en ese archivo; no se completa con cero.',
      'Desde el 26 de octubre de 2026 se incorporan los informes diarios de CryptoETF.today. Las revisiones y diferencias de redondeo del proveedor pueden variar décimas respecto al anterior preview de Farside. La procedencia cambia en esa fecha y se mantiene la misma unidad y el mismo universo.',
      'El acceso gratuito devuelve los últimos 30 días naturales. El sitio conserva los cierres validados en un archivo privado independiente de la caché. Las revisiones completas del proveedor quedan documentadas; las observaciones ausentes nunca se convierten en cero.',
      'Se muestra un gráfico resumido con atribución conforme a las condiciones del proveedor; no se ofrece su dataset completo ni un servicio de redistribución. El cálculo original por fondo no se reconstruye aquí a partir de participaciones y NAV oficiales.',
    ]};
}

