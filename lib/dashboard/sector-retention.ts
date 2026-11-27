import {createHash} from 'node:crypto';
import {buildUnavailableSectorResult,SECTOR_STALE_AFTER_MS} from './adapters/sector-data-core.ts';
import type {DashboardDataSource} from "./types.ts";
import type {SectorEtfsResult} from './adapters/sector-data-core.ts';

export const SECTOR_RETAINED_NOTE='Se conserva el último corte sectorial validado con su fecha original. Actualización pendiente: la fuente no ha devuelto un nuevo corte completo válido.';
const DAY=86_400_000,LEASE=300_000;
export type SectorPublication={schemaVersion:1;kind:'complete'|'published-risk';snapshot:SectorEtfsResult;cutoffDate:string;snapshotHash:string;capturedAt:string;lastAttemptAt:string;state:'refreshing'|'complete';lastRefreshError?:string};
export type SectorPublicationStore={read():Promise<{value:SectorPublication;etag:string}|null>;write(value:SectorPublication,etag?:string):Promise<string>;isConflict(error:unknown):boolean;isUnavailable(error:unknown):boolean};
type PublicationCache={get(key:string):Promise<unknown>;set(key:string,value:unknown,options:{ttl:number}):Promise<unknown>};
export const sectorSnapshotHash=(snapshot:SectorEtfsResult)=>createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
const dateOf=(snapshot:SectorEtfsResult)=>typeof snapshot?.quantRisk?.lastUpdated==='string'?snapshot.quantRisk.lastUpdated.match(/\d{4}-\d{2}-\d{2}/)?.[0]:undefined;

export function presentSectorPublication(record:SectorPublication,now=Date.now()):SectorEtfsResult {
  const retained=record.kind==='published-risk'||record.state==='refreshing'||!!record.lastRefreshError
    ||now-Date.parse(record.cutoffDate+'T23:59:59Z')>SECTOR_STALE_AFTER_MS;
  const annotate=<T extends DashboardDataSource>(source:T):T=>({...source,
    dataStatus:retained?'delayed':'automated',refreshStatus:retained?'retained':'current',
    lastRefreshError:record.lastRefreshError,retrievedAt:record.capturedAt,
    reliabilityNote:source.reliabilityNote+(retained?' '+SECTOR_RETAINED_NOTE:''),
  });
  return {module:record.snapshot.rotation?annotate(record.snapshot.module):record.snapshot.module,
    rotation:record.snapshot.rotation?{...record.snapshot.rotation,...annotate(record.snapshot.rotation)}:null,
    quantRisk:annotate(record.snapshot.quantRisk)};
}

export function createSectorPublicationReader({store,cache,seed,load,readLegacy,validate,isSourceError,now=Date.now}:{
  store:SectorPublicationStore;cache:PublicationCache;seed:SectorEtfsResult|null;
  load:()=>Promise<SectorEtfsResult>;readLegacy?:()=>Promise<SectorEtfsResult>;
  validate:(snapshot:SectorEtfsResult,now:number,allowStale:boolean)=>SectorEtfsResult;
  isSourceError:(error:unknown)=>boolean;now?:()=>number;
}) {
  let pending:Promise<SectorEtfsResult>|undefined;
  const seedHash=seed?sectorSnapshotHash(seed):null;
  function valid(value:unknown):value is SectorPublication {
    const p=value as SectorPublication;
    if(p?.schemaVersion!==1||!['complete','published-risk'].includes(p.kind)||!['refreshing','complete'].includes(p.state)
      ||!/^\d{4}-\d{2}-\d{2}$/.test(p.cutoffDate??'')||dateOf(p.snapshot)!==p.cutoffDate
      ||!Number.isFinite(Date.parse(p.capturedAt))||!Number.isFinite(Date.parse(p.lastAttemptAt))
      ||sectorSnapshotHash(p.snapshot)!==p.snapshotHash)return false;
    if(p.kind==='published-risk')return p.snapshotHash===seedHash;
    try{validate(p.snapshot,now(),true);return true;}catch(error){if(isSourceError(error))return false;throw error;}
  }
  const cachedRead=async()=>{try{return await cache.get('publication');}catch(error){if(error instanceof Error&&'digest' in error)throw error;return null;}};
  const cachedWrite=async(record:SectorPublication)=>{try{await cache.set('publication',record,{ttl:3600});}catch(error){if(error instanceof Error&&'digest' in error)throw error;/* The file is authoritative. */}};
  async function read():Promise<SectorEtfsResult> {
    const instant=now(),asOf=new Date(instant).toISOString();
    const cached=await cachedRead();
    if(valid(cached)){
      const age=instant-Date.parse(cached.lastAttemptAt);
      if(age<(cached.state==='refreshing'?LEASE:DAY))return presentSectorPublication(cached,instant);
    }
    let stored:{value:SectorPublication;etag:string}|null;
    try{stored=await store.read();}catch(error){
      if(!store.isUnavailable(error))throw error;
      if(valid(cached))return presentSectorPublication({...cached,lastRefreshError:'Sector storage temporarily unavailable'},instant);
      if(seed)return presentSectorPublication({schemaVersion:1,kind:'published-risk',snapshot:seed,cutoffDate:dateOf(seed)!,snapshotHash:seedHash!,capturedAt:asOf,lastAttemptAt:asOf,state:'complete',lastRefreshError:'Sector storage temporarily unavailable'},instant);
      return buildUnavailableSectorResult('Sector storage unavailable and no validated backup');
    }
    if(stored&&!valid(stored.value)){
      // Never overwrite an unreadable or corrupt last-good file with a reconstruction.
      if(seed)return presentSectorPublication({schemaVersion:1,kind:'published-risk',snapshot:seed,cutoffDate:dateOf(seed)!,snapshotHash:seedHash!,capturedAt:asOf,lastAttemptAt:asOf,state:'complete',lastRefreshError:'Stored sector publication failed validation'},instant);
      return buildUnavailableSectorResult('No validated sector backup');
    }
    if(stored){
      const age=instant-Date.parse(stored.value.lastAttemptAt);
      if(age<(stored.value.state==='refreshing'?LEASE:DAY)){await cachedWrite(stored.value);return presentSectorPublication(stored.value,instant);}
    }
    let previous=stored?.value;
    if(!previous&&readLegacy){
      try{const snapshot=validate(await readLegacy(),instant,true);previous={schemaVersion:1,kind:'complete',snapshot,
        cutoffDate:dateOf(snapshot)!,snapshotHash:sectorSnapshotHash(snapshot),capturedAt:asOf,lastAttemptAt:asOf,state:'complete'};
      }catch(error){if(!isSourceError(error))throw error;}
    }
    if(!previous&&seed)previous={schemaVersion:1,kind:'published-risk',snapshot:seed,cutoffDate:dateOf(seed)!,
      snapshotHash:seedHash!,capturedAt:asOf,lastAttemptAt:asOf,state:'complete'};
    // Reserve the daily attempt before contacting the provider. The file CAS
    // coalesces independent instances, languages and deployments, not just one process.
    let leaseEtag:string|undefined;
    if(previous){
      const lease={...previous,lastAttemptAt:asOf,state:'refreshing' as const};
      try{leaseEtag=await store.write(lease,stored?.etag);await cachedWrite(lease);}
      catch(error){
        if(store.isConflict(error)){const latest=await store.read();if(latest&&valid(latest.value)){await cachedWrite(latest.value);return presentSectorPublication(latest.value,instant);}}
        if(!store.isUnavailable(error)&&!store.isConflict(error))throw error;
        return presentSectorPublication({...previous,lastRefreshError:'Sector storage temporarily unavailable'},instant);
      }
    }
    let candidate:SectorPublication;
    try{
      const snapshot=validate(await load(),instant,false),cutoffDate=dateOf(snapshot)!;
      if(previous&&cutoffDate<previous.cutoffDate)throw new SectorPublicationRegressionError();
      candidate={schemaVersion:1,kind:'complete',snapshot,cutoffDate,snapshotHash:sectorSnapshotHash(snapshot),
        capturedAt:new Date(now()).toISOString(),lastAttemptAt:asOf,state:'complete'};
    }catch(error){
      if(!isSourceError(error)&&!(error instanceof SectorPublicationRegressionError))throw error;
      if(!previous)return buildUnavailableSectorResult('Sector source unavailable and no validated backup');
      candidate={...previous,lastAttemptAt:asOf,state:'complete',lastRefreshError:error instanceof Error?error.message:'Sector refresh unavailable'};
    }
    try{await store.write(candidate,leaseEtag??stored?.etag);await cachedWrite(candidate);return presentSectorPublication(candidate,instant);}
    catch(error){
      if(store.isConflict(error)){const latest=await store.read();if(latest&&valid(latest.value))return presentSectorPublication(latest.value,instant);}
      if(!store.isUnavailable(error)&&!store.isConflict(error))throw error;
      return previous?presentSectorPublication({...previous,lastRefreshError:'Sector storage temporarily unavailable'},instant):buildUnavailableSectorResult('Sector publication could not be saved');
    }
  }
  return ()=>pending??=(read().finally(()=>{pending=undefined;}));
}
class SectorPublicationRegressionError extends Error {constructor(){super('Sector provider cutoff moved backwards');}}
