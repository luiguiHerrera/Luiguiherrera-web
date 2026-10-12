import { fixtureHTML } from './probe-fixture-html.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { runProtectedProbeQA, requireProbeCertificationHTTP } from '../scripts/probe-gate.mjs';
import { P } from '../scripts/release-core.mjs';
const target = { operation:'PROBE_IDENTITY', phase:'preview', candidate_git_sha:'a'.repeat(40), deployment_id:'dpl_PhaseBudgetFixture123',
  origin:'https://luiguiherrera-phasefixture-luigui-herrera-s-projects.vercel.app', authority_run_id:P.baseline.authority_run_id, sealed_manifest_sha256:P.baseline.sealed_manifest_sha256 };
const app=(path='/niveles-estadisticos')=>new Response(fixtureHTML(path),{status:200,headers:{'content-type':'text/html'}});
const methodology=()=>new Response('<h1>Methodology</h1>',{status:200,headers:{'content-type':'text/html'}});
const login=()=>new Response('',{status:302,headers:{location:'https://vercel.com/login'}});
const redirect=url=>new Response('',{status:307,headers:{location:url}});
async function scenario(options={}) {
  let now=1800000000000, http=null, budget=null, receipt=null, failure=null;
  const original=Date.now;Date.now=()=>now;
  const calls={certification:0,qa_refresh:0,trusted_http:0,anonymous_http:0,qa:0,aws:0,controller:0};
  const events=[],sentTokens=[];let n=0;
  const replies=options.replies??[login,app,app,methodology,methodology];
  try {
    await runProtectedProbeQA({target,
      requestOIDCToken:async()=>{
        assert.equal(http.anonymous_protection_baseline,'PROTECTED');
        assert.equal(http.anonymous_baseline_complete,true);
        if(receipt && budget?.trusted_sources_certified){calls.qa_refresh++;events.push('QA_REFRESH');}
        else{calls.certification++;events.push('CERT_TOKEN');}
        if(options.factoryError)throw new Error('LOCAL_TEST_FACTORY_FAILURE');
        const ttl=calls.certification+calls.qa_refresh===1?(options.ttl??600):(options.refreshedTTL??600);
        return ['unit',Buffer.from(JSON.stringify({exp:Math.floor(now/1000)+ttl})).toString('base64url'),'unit'].join('.');
      },
      onEvidence:async value=>{http=value;if(value.anonymous_baseline_complete)events.push('BASELINE_'+value.anonymous_protection_baseline);},
      onTokenEvidence:async value=>{budget=value;if(value.certification_recorded)events.push('CERTIFICATION_RECORDED');},
      onCertificationEvidence:async value=>{
        requireProbeCertificationHTTP(value,target);events.push('CERT_RECEIPT');
        if(options.receiptError)throw new Error('LOCAL_RECEIPT_WRITE_FAILED');receipt=value;
      },
      transport:async(url,init)=>{
        assert.equal(new URL(url).origin,target.origin);assert.equal(init.redirect,'manual');
        const token=init.headers['x-vercel-trusted-oidc-idp-token'];
        if(token){calls.trusted_http++;sentTokens.push(token);events.push('TRUSTED_HTTP');}
        else{calls.anonymous_http++;assert.equal(calls.certification+calls.qa_refresh,0);}
        const response=replies[n++];assert.ok(response,'No unexpected HTTP');
        if(options.advanceAtHttp===n)now+=(options.advanceSeconds??575)*1000;
        return response(new URL(url).pathname.replace(/\/$/,''));
      },
      runQA:async({tokenSource,protectedGet})=>{
        calls.qa++;events.push('QA');assert.ok(receipt);assert.equal(budget.trusted_sources_certified,true);
        for(const route of ['/niveles-estadisticos','/en/statistical-levels'])assert.equal(await(await protectedGet(target.origin+route)).text(),fixtureHTML(route));
        await options.qa?.({tokenSource,advance:s=>{now+=s*1000;},calls,events,budget:()=>budget});
        return {mock_qa:'PASS'};
      }
    });
    calls.aws++;events.push('AWS_SEPARATE_BOUNDARY');
  }catch(e){failure=e.message;}finally{Date.now=original;}
  return {calls,events,budget,http,receipt,failure,sentTokens};
}
for(const [kind,replies] of [['PUBLIC',[app]],['AMBIGUOUS',[()=>new Response('',{status:503})]]])test(kind+' keeps both phase counters zero and never reaches QA/AWS',async()=>{
  const x=await scenario({replies});assert.equal(x.http.anonymous_protection_baseline,kind);
  for(const key of ['certification','qa_refresh','trusted_http','qa','aws','controller'])assert.equal(x.calls[key],0,key);
});
test('one certification token and valid QA reuse; AWS audience does not increment Vercel counters',async()=>{
  const x=await scenario({qa:async({tokenSource})=>{await tokenSource.get();}});assert.equal(x.failure,null);
  assert.deepEqual(x.calls,{certification:1,qa_refresh:0,trusted_http:4,anonymous_http:1,qa:1,aws:1,controller:0});
  assert.ok(x.events.indexOf('BASELINE_PROTECTED')<x.events.indexOf('CERT_TOKEN'));
});
for(const ttl of [0,29,30])test('fresh certification token remaining'+ttl+' fails closed without second acquisition',async()=>{
  const x=await scenario({ttl});assert.equal(x.failure,'BLOCKED_FRESH_OIDC_TOKEN_TTL_INSUFFICIENT');
  assert.equal(x.calls.certification,1);assert.equal(x.calls.qa_refresh,0);assert.equal(x.calls.trusted_http,0);assert.equal(x.calls.qa,0);
});
for(const hops of [1,2])test('same certification token reused for '+hops+' safe same-origin redirect hops',async()=>{
  const x=await scenario({ttl:45,replies:[login,()=>redirect(hops===2?'/safe-one':'/niveles-estadisticos/'),...(hops===2?[()=>redirect('/niveles-estadisticos/')]:[]),app,app,methodology,methodology]});
  assert.equal(x.failure,null);assert.equal(x.calls.certification,1);assert.equal(x.calls.qa_refresh,0);
  assert.equal(x.calls.trusted_http,hops+4);assert.equal(new Set(x.sentTokens).size,1);
  assert.equal(x.receipt.routes[0].hops.length,hops+1);
});
test('cross-origin redirect is not followed and cannot trigger QA refresh',async()=>{
  const x=await scenario({replies:[login,()=>redirect('https://unrelated.example/path')]});
  assert.equal(x.failure,'PROBE_HTTP_CROSS_ORIGIN_REDIRECT');assert.equal(x.calls.trusted_http,1);assert.equal(x.calls.certification,1);assert.equal(x.calls.qa_refresh,0);assert.equal(x.calls.qa,0);
});
test('Trusted Sources denial consumes only certification token',async()=>{
  const x=await scenario({replies:[login,login]});assert.equal(x.failure,'BLOCKED_TRUSTED_SOURCES_LIVE_CONFIRMED');
  assert.equal(x.calls.certification,1);assert.equal(x.calls.qa_refresh,0);assert.equal(x.calls.qa,0);assert.equal(x.receipt,null);
});
test('post-certification QA permits one refresh only after persisted receipt and checkpoint',async()=>{
  const x=await scenario({qa:async({tokenSource,advance})=>{advance(575);await tokenSource.get();}});
  assert.equal(x.failure,null);assert.equal(x.calls.certification,1);assert.equal(x.calls.qa_refresh,1);assert.equal(x.calls.aws,1);
  assert.ok(x.events.indexOf('CERT_RECEIPT')<x.events.indexOf('CERTIFICATION_RECORDED'));assert.ok(x.events.indexOf('CERTIFICATION_RECORDED')<x.events.indexOf('QA_REFRESH'));
});
test('second QA renewal requirement stops with total two requests',async()=>{
  const x=await scenario({qa:async({tokenSource,advance})=>{advance(575);await tokenSource.get();advance(575);await tokenSource.get();}});
  assert.equal(x.failure,'BLOCKED_QA_OIDC_REFRESH_BUDGET_EXCEEDED');assert.equal(x.calls.certification,1);assert.equal(x.calls.qa_refresh,1);assert.equal(x.calls.aws,0);
  assert.equal(x.budget.trusted_sources_certified,true);assert.ok(x.receipt);
});
test('45 seconds remains usable in QA; old proactive60 trigger is not used',async()=>{
  const x=await scenario({qa:async({tokenSource,advance})=>{advance(555);await tokenSource.get();}});assert.equal(x.failure,null);assert.equal(x.calls.qa_refresh,0);
});
test('certification redirect reuses the acquired token despite elapsed time; renewal waits for recorded certification',async()=>{
  const x=await scenario({ttl:45,replies:[login,()=>redirect('/niveles-estadisticos/'),app,app,methodology,methodology],advanceAtHttp:2,advanceSeconds:20});
  assert.equal(x.failure,null);assert.equal(x.calls.certification,1);assert.equal(x.calls.qa_refresh,1);assert.equal(x.sentTokens[0],x.sentTokens[1]);
  assert.ok(x.events.indexOf('CERT_RECEIPT')<x.events.indexOf('QA_REFRESH'));assert.equal(x.receipt.routes[0].hops.length,2);
});
test('receipt write failure prevents post-certification phase and optional renewal',async()=>{
  const x=await scenario({receiptError:true});assert.equal(x.failure,'LOCAL_RECEIPT_WRITE_FAILED');assert.equal(x.calls.certification,1);assert.equal(x.calls.qa_refresh,0);assert.equal(x.calls.trusted_http,1);assert.equal(x.calls.qa,0);
});
test('concurrent expired QA lease reads coalesce into the only allowed renewal',async()=>{
  const x=await scenario({qa:async({tokenSource,advance})=>{advance(575);const tokens=await Promise.all(Array.from({length:25},()=>tokenSource.get()));assert.equal(new Set(tokens).size,1);}});
  assert.equal(x.failure,null);assert.equal(x.calls.qa_refresh,1);assert.equal(x.calls.certification,1);
});
test('too-short refreshed token cannot loop until long enough',async()=>{
  const x=await scenario({refreshedTTL:30,qa:async({tokenSource,advance})=>{advance(575);await tokenSource.get();}});
  assert.ok(x.failure);assert.equal(x.calls.certification,1);assert.equal(x.calls.qa_refresh,1);assert.equal(x.calls.aws,0);assert.ok(x.receipt);
});
test('certification factory error cannot retry or reach trusted HTTP',async()=>{
  const x=await scenario({factoryError:true});assert.ok(x.failure);assert.equal(x.calls.certification,1);assert.equal(x.calls.qa_refresh,0);assert.equal(x.calls.trusted_http,0);
});
test('EN preflight is post-certification QA and can use at most its separate renewal',async()=>{
  const x=await scenario({ttl:45,advanceAtHttp:2,advanceSeconds:20});assert.equal(x.failure,null);assert.equal(x.calls.certification,1);assert.equal(x.calls.qa_refresh,1);
  assert.ok(x.events.indexOf('CERT_RECEIPT')<x.events.indexOf('QA_REFRESH'));assert.equal(x.receipt.routes.length,1);
});
