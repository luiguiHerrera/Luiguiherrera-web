import 'server-only';
import {get,put,BlobPreconditionFailedError,BlobError} from '@vercel/blob';
import type {DurableFlowArchive,DurableFlowStore} from './durable-flow-publication.mjs';

export function privateFlowStore(id:'eth'|'ewj'):DurableFlowStore {
  // Preview builds can exercise persistence without mutating the production file.
  const environment=process.env.VERCEL_ENV==='preview'?'preview':'production';
  const pathname=`dashboard-flows/${environment}/${id}-history-v1.json`;
  return {
    async read() {
      const response=await get(pathname,{access:'private',useCache:false,abortSignal:AbortSignal.timeout(8000)});
      if(!response)return null;
      if(response.statusCode!==200||!response.stream)throw new Error('Private flow history could not be read');
      if((response.blob.size??0)>8_000_000)throw new Error('Private flow history too large');
      const value=await new Response(response.stream).json() as DurableFlowArchive;
      return {value,etag:response.blob.etag};
    },
    async write(value,etag) {
      await put(pathname,JSON.stringify(value),{access:'private',addRandomSuffix:false,
        allowOverwrite:Boolean(etag),...(etag?{ifMatch:etag}:{}),contentType:'application/json',
        cacheControlMaxAge:60,abortSignal:AbortSignal.timeout(8000)});
    },
    isConflict:error=>error instanceof BlobPreconditionFailedError
      ||error instanceof BlobError&&/already exists/i.test(error.message),
  };
}
