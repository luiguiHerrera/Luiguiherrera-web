import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createDurableFlowPublisher} from './durable-flow-publication.mjs';

const require=createRequire(import.meta.url), ts=require('typescript');
const code=ts.transpileModule(readFileSync(new URL('./private-flow-store.ts',import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText;

function harness(environment='preview') {
  class BlobError extends Error{}
  class BlobPreconditionFailedError extends BlobError{}
  const previous={date:'2026-11-24',flow:1,complete:true,funds:[]};
  let value={schemaVersion:1,id:'eth',checkedAt:'2026-11-25T12:00:00Z',history:{points:[previous]},model:{id:'eth',cutoffDate:previous.date,points:[previous]}};
  let version=1; const reads=[],writes=[];
  const sdk={BlobError,BlobPreconditionFailedError,
    async get(path,options){
      reads.push({path,options});
      // Reproduce the hosted compressed-response behavior observed in production code:
      // W/"version" reads successfully, but cannot satisfy a strong conditional write.
      const etag=options.headers?.['Accept-Encoding']==='identity'?`"${version}"`:`W/"${version}"`;
      return {statusCode:200,stream:new Response(JSON.stringify(value)).body,blob:{size:JSON.stringify(value).length,etag}};
    },
    async put(path,body,options){
      writes.push({path,options});
      if(!options.allowOverwrite || options.ifMatch!==`"${version}"`)throw new BlobPreconditionFailedError();
      value=JSON.parse(body);version++;
    },
  };
  const compiled={exports:{}};
  new Function('require','module','exports','process',code)(name=>name==='server-only'?{}:name==='@vercel/blob'?sdk:assert.fail(name),compiled,compiled.exports,{env:{VERCEL_ENV:environment}});
  return {store:compiled.exports.privateFlowStore('eth'),reads,writes,value:()=>structuredClone(value),sdk};
}

test('private flow identity read supplies a strong ETag that can update the authoritative archive',async()=>{
  const h=harness();
  const compressed=await h.sdk.get('archive',{});
  await assert.rejects(h.sdk.put('archive','{}',{allowOverwrite:true,ifMatch:compressed.blob.etag}),h.sdk.BlobPreconditionFailedError);
  h.reads.length=0;h.writes.length=0;
  const get=createDurableFlowPublisher({id:'eth',store:h.store,seed:{points:[]},retainAll:true,now:()=>Date.parse('2026-11-27T12:00:00Z'),
    fetchSource:async()=>({}),build:history=>{const points=[...history.points,{date:'2026-11-25',flow:2,complete:true,funds:[]}];return {history:{points},model:{id:'eth',cutoffDate:'2026-11-25',points}};}});
  const model=await get();
  assert.equal(model.cutoffDate,'2026-11-25');assert.equal(model.lastRefreshError,undefined);
  assert.equal(h.reads.length,1);assert.equal(h.writes.length,1);
  assert.equal(h.reads[0].options.useCache,false);
  assert.equal(h.writes[0].options.ifMatch,'"1"');
  assert.equal(h.writes[0].path,'dashboard-flows/preview/eth-history-v1.json');
  assert.equal(h.value().history.points.length,2);
  const stored=await h.store.read();assert.equal(stored.etag,'"2"');
  assert.equal(stored.value.checkedAt,'2026-11-27T12:00:00.000Z');
});

test('private flow writes still reject a stale version and keep production and preview paths separate',async()=>{
  const h=harness('production');const first=await h.store.read();
  await h.store.write(first.value,first.etag);
  await assert.rejects(h.store.write(first.value,first.etag),error=>h.store.isConflict(error));
  assert.equal(h.writes[0].path,'dashboard-flows/production/eth-history-v1.json');
  assert.equal(h.writes[0].options.allowOverwrite,true);
});
