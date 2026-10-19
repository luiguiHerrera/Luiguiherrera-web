import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';

const origin='https://luiguiherrera-toolbarfixture-luigui-herrera-s-projects.vercel.app';
const moduleURL=new URL('../scripts/browser-harness-base.mjs',import.meta.url);
const original=await fs.readFile(moduleURL,'utf8');
const source=original.replace(/(['"])(\.\/[^'"]+\.mjs)\1/g,(_,q,v)=>JSON.stringify(new URL(v,moduleURL).href))
 .replace("await import('../qa-dependencies/node_modules/playwright/index.mjs')",'{chromium:globalThis.__TOOLBAR_CHROMIUM}');
const {createReadOnlyHarness}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const base=process.env.SL_TOOLBAR_TEST_EVIDENCE||os.tmpdir();await fs.mkdir(base,{recursive:true});
function mock(){
 const cdp=new EventEmitter(),calls=[];cdp.send=async(method,args)=>{calls.push({method,args});return {result:{value:true}};};
 const context={newPage:async()=>({url:()=>origin+'/niveles-estadisticos'}),newCDPSession:async()=>cdp,close:async()=>cdp.emit('close')};
 globalThis.__TOOLBAR_CHROMIUM={launch:async()=>({newContext:async()=>context,close:async()=>{}})};
 return {cdp,calls};
}
test('installed Preview integration scopes toolbar without changing credentials, application headers or failure capture',async t=>{
 const {cdp,calls}=mock(),out=await fs.mkdtemp(path.join(base,'preview-toolbar-'));
 let tokens=0,cleared=0;const canary='SYNTHETIC_TOOLBAR_TOKEN_CANARY';
 const h=await createReadOnlyHarness({origin},{get:async()=>{tokens++;return canary;},clear:()=>cleared++},out,false,true);
 const p=await h.createPage();assert.ok(h.observability);
 for(const method of ['Fetch.enable','Network.enable','Debugger.enable','Runtime.enable','Log.enable'])assert.ok(calls.some(x=>x.method===method),method);
 let serial=0;
 async function pause(input){const event={requestId:'request-'+(++serial),resourceType:'Document',request:{url:origin+'/niveles-estadisticos',method:'GET',headers:{Accept:'text/html','X-Vercel-Skip-Toolbar':'hostile','x-vercel-skip-toolbar':'hostile2','x-application-fixture':'preserve'}},...input};cdp.emit('Fetch.requestPaused',event);await new Promise(resolve=>setImmediate(resolve));return {event,call:calls.at(-1)};}
 const cases=[
  ['ES initial',{},true],
  ['EN initial',{request:{url:origin+'/en/statistical-levels?asset=SPY',method:'GET',headers:{Accept:'text/html','x-application-fixture':'preserve'}}},true],
  ...['Fetch','XHR','Script','Stylesheet','Image','Other','Prefetch','WebSocket'].map(resourceType=>['non-Document '+resourceType,{resourceType},false]),
  ['unknown resourceType',{resourceType:undefined},false],
  ['POST Document',{request:{url:origin+'/niveles-estadisticos',method:'POST',headers:{Accept:'text/html','x-application-fixture':'preserve'}}},false],
  ['API Document',{request:{url:origin+'/api/statistical-levels',method:'GET',headers:{Accept:'text/html','x-application-fixture':'preserve'}}},false],
  ['unrelated Document',{request:{url:origin+'/en',method:'GET',headers:{Accept:'text/html','x-application-fixture':'preserve'}}},false],
  ['same-origin redirect',{redirectedRequestId:'request-1'},false],
  ['unknown redirect parent',{redirectedRequestId:'absent'},false],
  ['Document with RSC query',{request:{url:origin+'/niveles-estadisticos?_rsc=fixture',method:'GET',headers:{Accept:'text/html','x-application-fixture':'preserve'}}},false],
  ...['RSC','Next-Router-Prefetch'].map(name=>['Document with '+name,{request:{url:origin+'/niveles-estadisticos',method:'GET',headers:{Accept:'text/html','x-application-fixture':'preserve',[name]:'1'}}},false]),
  ...['Purpose','Sec-Purpose'].map(name=>['Document with '+name,{request:{url:origin+'/niveles-estadisticos',method:'GET',headers:{Accept:'text/html','x-application-fixture':'preserve',[name]:'prefetch'}}},false])
 ];
 for(const [name,input,expected] of cases)await t.test(name,async()=>{
  const {call}=await pause(input);assert.equal(call.method,'Fetch.continueRequest');const headers=Object.fromEntries(call.args.headers.map(x=>[x.name,x.value]));
  assert.equal(headers['x-vercel-skip-toolbar'],expected?'1':undefined);assert.equal(headers['X-Vercel-Skip-Toolbar'],undefined);
  assert.equal(headers['x-vercel-trusted-oidc-idp-token'],canary);assert.equal(headers.Accept,'text/html');assert.equal(headers['x-application-fixture'],'preserve');
 });
 await t.test('RSC headers remain exact and toolbar absent',async()=>{const {call}=await pause({resourceType:'Fetch',request:{url:origin+'/niveles-estadisticos?_rsc=fixture',method:'GET',headers:{RSC:'1','Next-Router-State-Tree':'fixture','x-vercel-skip-toolbar':'hostile'}}});const headers=Object.fromEntries(call.args.headers.map(x=>[x.name,x.value]));assert.equal(headers.RSC,'1');assert.equal(headers['Next-Router-State-Tree'],'fixture');assert.equal(headers['x-vercel-skip-toolbar'],undefined);});
 await t.test('foreign origin strips toolbar and credentials without acquiring token',async()=>{const before=tokens;const {call}=await pause({request:{url:'https://outside.invalid/niveles-estadisticos',method:'GET',headers:{Authorization:canary,'x-vercel-trusted-oidc-idp-token':canary,'x-vercel-protection-bypass':canary,'X-Vercel-Skip-Toolbar':'1',Accept:'text/html'}}});assert.equal(call.method,'Fetch.continueRequest');assert.deepEqual(call.args.headers,[{name:'Accept',value:'text/html'}]);assert.equal(tokens,before);});
 await t.test('cross-origin redirect fails closed',async()=>{const {call}=await pause({redirectedRequestId:'request-1',request:{url:'https://outside.invalid/niveles-estadisticos',method:'GET',headers:{}}});assert.equal(call.method,'Fetch.failRequest');});
 cdp.emit('Log.entryAdded',{entry:{level:'error',source:'javascript',url:origin+'/_next/static/chunks/application.js',text:'synthetic application error'}});
 await p.close();await assert.rejects(h.finish(true),/ADOPT_REQUEST_EVIDENCE_INVALID|CREDENTIAL_SCOPE_FAILURE/);
 const accounting=JSON.parse(await fs.readFile(out+'/network-accounting.json','utf8'));
 assert.equal(accounting.application_console_errors,1);assert.equal(accounting.authFailures.length,1);assert.ok(cleared>0);
 for(const name of ['network-accounting.json','adopt-request-evidence.json','native-ingress.jsonl'])assert.ok(!(await fs.readFile(out+'/'+name,'utf8')).includes(canary));
});
test('Production has no toolbar interception and mandatory native observer remains enabled',async()=>{
 const {cdp,calls}=mock(),out=await fs.mkdtemp(path.join(base,'production-toolbar-'));
 const h=await createReadOnlyHarness({origin},undefined,out,true,false);assert.ok(h.observability);const p=await h.createPage();
 assert.equal(cdp.listenerCount('Fetch.requestPaused'),0);assert.ok(!calls.some(x=>x.method==='Fetch.enable'));
 assert.ok(calls.some(x=>x.method==='Debugger.enable'));await p.close();await assert.rejects(h.finish(true));
});
