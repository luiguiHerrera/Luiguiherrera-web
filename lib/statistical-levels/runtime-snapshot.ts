import type { AssetStatRecord, DailySeasonalityData, StatisticalLevelsManifest, StatisticalFrequency, StatisticalWindow } from './types';
import { canonicalStatTicker } from './display';

export const RUNTIME_SCHEMA = 'statistical-levels.runtime-asset.v1';
export const SNAPSHOT_SCHEMA = 'statistical-levels.runtime-snapshot.v1';
export type RuntimeSelection = {asset:string;frequency:StatisticalFrequency;window:StatisticalWindow};
export type RuntimeSnapshot = {schema:typeof SNAPSHOT_SCHEMA;id:string;manifest_sha256:string;records:Record<string,{asset:string;seasonality:string}>};
export type RuntimeAsset = {schema:typeof RUNTIME_SCHEMA;ticker:string;snapshot:string;asset:AssetStatRecord;seasonality:DailySeasonalityData};
export type LoadedRuntimeAsset = RuntimeAsset & {intent_identity:string;payload_identity:string};
const hashPattern=/^[a-f0-9]{64}$/;
function requireValue(v:unknown,code:string):asserts v {if(!v)throw new Error(code);}

// Shared server/client serialization. No filesystem, private provenance or Node imports.
export function runtimeCanonical(value:unknown):string {
  if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
  if(typeof value==='number'){if(!Number.isFinite(value))throw new Error('RUNTIME_NONFINITE');return JSON.stringify(value);}
  if(Array.isArray(value))return '['+value.map(runtimeCanonical).join(',')+']';
  if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype)return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+runtimeCanonical((value as Record<string,unknown>)[k])).join(',')+'}';
  throw new Error('RUNTIME_VALUE_INVALID');
}
export async function runtimeDigest(value:unknown):Promise<string>{
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(runtimeCanonical(value)));
  return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
}
let snapshotCache:{key:string;value:Promise<RuntimeSnapshot>}|undefined;
export async function createRuntimeSnapshot(manifest:StatisticalLevelsManifest,readAsset:(ticker:string)=>Promise<AssetStatRecord>,readSeasonality:(ticker:string)=>Promise<DailySeasonalityData>):Promise<RuntimeSnapshot>{
  // Server callers supply the existing canonical loaders. Only commitments cross SSR.
  const manifest_sha256=await runtimeDigest(manifest);
  if(snapshotCache?.key===manifest_sha256)return snapshotCache.value;
  const value=(async()=>{
    const records:RuntimeSnapshot['records']={};
    for(const {ticker} of manifest.catalog){
      requireValue(/^[A-Z0-9.-]{1,12}$/.test(ticker)&&!Object.hasOwn(records,ticker),'RUNTIME_CATALOG');
      const [asset,seasonality]=await Promise.all([readAsset(ticker),readSeasonality(ticker)]);
      requireValue(asset.ticker===ticker&&seasonality.asset===ticker,'RUNTIME_TICKER');
      records[ticker]={asset:await runtimeDigest(asset),seasonality:await runtimeDigest(seasonality)};
    }
    const descriptor:Omit<RuntimeSnapshot,'id'>={schema:SNAPSHOT_SCHEMA,manifest_sha256,records};
    return {...descriptor,id:await runtimeDigest(descriptor)};
  })();
  snapshotCache={key:manifest_sha256,value};
  try{return await value;}catch(e){if(snapshotCache?.value===value)snapshotCache=undefined;throw e;}
}
export async function validateRuntimeAsset(value:unknown,ticker:string,snapshot:RuntimeSnapshot):Promise<RuntimeAsset>{
  requireValue(value&&typeof value==='object'&&!Array.isArray(value),'RUNTIME_SCHEMA');
  const v=value as RuntimeAsset;
  requireValue(Object.keys(v).sort().join(',')==='asset,schema,seasonality,snapshot,ticker'&&v.schema===RUNTIME_SCHEMA,'RUNTIME_SCHEMA');
  requireValue(hashPattern.test(snapshot.id)&&v.snapshot===snapshot.id,'RUNTIME_SNAPSHOT_MISMATCH');
  const expected=snapshot.records[ticker];
  requireValue(expected&&v.ticker===ticker&&v.asset?.ticker===ticker&&v.seasonality?.asset===ticker,'RUNTIME_TICKER');
  requireValue(await runtimeDigest(v.asset)===expected.asset&&await runtimeDigest(v.seasonality)===expected.seasonality,'RUNTIME_PAYLOAD_DIGEST');
  return v;
}
export function parseRuntimeAssetQuery(url:URL,manifest:StatisticalLevelsManifest):{ticker:string;snapshot:string}{
  const q=url.searchParams;
  requireValue(q.size===2&&q.getAll('asset').length===1&&q.getAll('snapshot').length===1&&[...q.keys()].every(k=>k==='asset'||k==='snapshot'),'RUNTIME_QUERY');
  const ticker=q.get('asset')!,snapshot=q.get('snapshot')!;
  requireValue(/^[A-Z0-9.-]{1,12}$/.test(ticker)&&manifest.catalog.some(x=>x.ticker===ticker),'RUNTIME_TICKER');
  requireValue(hashPattern.test(snapshot),'RUNTIME_SNAPSHOT');
  return {ticker,snapshot};
}
export async function loadStatisticalLevelsRuntimeAsset(ticker:string,snapshot:RuntimeSnapshot):Promise<LoadedRuntimeAsset>{
  requireValue(/^[A-Z0-9.-]{1,12}$/.test(ticker)&&Object.hasOwn(snapshot.records,ticker)&&hashPattern.test(snapshot.id),'RUNTIME_INTENT');
  const intent_identity=crypto.randomUUID();
  const url=new URL('/api/statistical-levels/asset',window.location.origin);
  url.searchParams.set('asset',ticker);url.searchParams.set('snapshot',snapshot.id);
  // The only application transport callsite. No retry, redirect, signal or abort.
  const response=await fetch(url,{method:'GET',redirect:'error',credentials:'same-origin'});
  requireValue(response.ok&&!response.redirected&&response.headers.get('content-type')?.split(';')[0]==='application/json','RUNTIME_HTTP');
  const payload=await response.json();
  const validated=await validateRuntimeAsset(payload,ticker,snapshot);
  const payload_identity=await runtimeDigest(validated);
  return {...validated,intent_identity,payload_identity};
}
export function selectionFromRuntimeUrl(url:URL,manifest:StatisticalLevelsManifest):RuntimeSelection{
  const requested=canonicalStatTicker((url.searchParams.get('symbol')??url.searchParams.get('asset')??'').trim());
  const asset=manifest.catalog.some(x=>x.ticker===requested)?requested:manifest.defaultAsset;
  const rawFrequency=url.searchParams.get('frequency');
  const frequency=manifest.frequencies.includes(rawFrequency as StatisticalFrequency)?rawFrequency!:manifest.defaultFrequency;
  const rawWindow=url.searchParams.get('window');
  const normalizedWindow=rawWindow==='All'?'Full':rawWindow;
  const window=manifest.windows.includes(normalizedWindow as StatisticalWindow)?normalizedWindow!:manifest.defaultWindow;
  return {asset,frequency:frequency as StatisticalFrequency,window:window as StatisticalWindow};
}
