import {get,put,BlobError,BlobPreconditionFailedError} from '@vercel/blob';
import {getCache} from '@vercel/functions';
import {createSectorPublicationReader} from './sector-retention.ts';
import type {SectorPublication, SectorPublicationStore} from './sector-retention.ts';

class SectorStorageError extends Error {}
const transportFailure=(error:unknown)=>error instanceof Error&&!("digest" in error)
  &&(error.name==='AbortError'||error.name==='TimeoutError'||error instanceof TypeError&&error.message==='fetch failed');
export function createPrivateSectorPublication(options:Omit<Parameters<typeof createSectorPublicationReader>[0],'store'|'cache'>){
  const environment=process.env.VERCEL_ENV==='preview'?'preview':'production';
  const path=`dashboard-sectors/${environment}/last-valid-v1.json`;
  const store:SectorPublicationStore={
    async read(){
      try{
        const response=await get(path,{access:'private',useCache:false,abortSignal:AbortSignal.timeout(8000)});
        if(!response)return null;
        if(response.statusCode!==200||!response.stream||(response.blob.size??0)>4_000_000)throw new SectorStorageError('Sector archive unreadable');
        return {value:await new Response(response.stream).json() as SectorPublication,etag:response.blob.etag};
      }catch(error){if(error instanceof BlobError||error instanceof SyntaxError||transportFailure(error))throw new SectorStorageError('Sector archive temporarily unavailable');throw error;}
    },
    async write(value,etag){
      try{return (await put(path,JSON.stringify(value),{access:'private',addRandomSuffix:false,allowOverwrite:!!etag,
        ...(etag?{ifMatch:etag}:{}),contentType:'application/json',cacheControlMaxAge:60,abortSignal:AbortSignal.timeout(8000)})).etag;}
      catch(error){if(error instanceof BlobPreconditionFailedError||error instanceof BlobError&&/already exists/i.test(error.message))throw error;
        if(error instanceof BlobError||transportFailure(error))throw new SectorStorageError('Sector archive temporarily unavailable');throw error;}
    },
    isConflict:error=>error instanceof BlobPreconditionFailedError||error instanceof BlobError&&/already exists/i.test(error.message),
    isUnavailable:error=>error instanceof SectorStorageError,
  };
  return createSectorPublicationReader({...options,store,cache:getCache({namespace:`dashboard-sectors-${environment}-v1`})});
}
