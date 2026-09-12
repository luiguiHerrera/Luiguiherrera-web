import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inspectProbeSSR, probeSSRFailure } from '../scripts/probe-dom.mjs';
import { createProbeHttpSession, validateProbeHttpEvidence } from '../scripts/probe-http.mjs';
import { fixtureHTML } from './probe-fixture-html.mjs';
const es='/niveles-estadisticos',en='/en/statistical-levels';
const target={operation:'PROBE_IDENTITY',phase:'preview',candidate_git_sha:'4ee6adb006f360fea13837db5f7d45815f297b55',deployment_id:'dpl_8iA33DzPN63dNoD9Hk6puJjc5XwH',origin:'https://luiguiherrera-ddqf0dzk8-luigui-herrera-s-projects.vercel.app',authority_run_id:'20260908T125656658Z-a4743804-e5f1-495a-b34e-5948d5db4d2d',sealed_manifest_sha256:'129f45149f6a280f1681ce3903a304e18a07dbaa6894bcc8e9b94587dbdf26cb'};
for(const [locale,path,sha]of[['es',es,'473d1969388694855dec3f6757ed83c7d88a00e3958167296a4af34d6120eb70'],['en',en,'82addcb3051356d21178314442504b2093c3d6e56b29357cf049b4d4ef64754c']])test('exact frozen route-component SSR '+locale+' binds genuine initial DOM without authority',async()=>{
 const html=await fs.readFile(new URL('./fixtures/ssr/'+locale+'.html',import.meta.url),'utf8');assert.equal(createHash('sha256').update(html).digest('hex'),sha);
 const dom=inspectProbeSSR(html,path);assert.equal(dom.sl_controls_dom_present,true);assert.equal(dom.second_ssr_marker_match,true);assert.equal(dom.sl_authority_dom_present,false);assert.equal(probeSSRFailure(dom),null);
});
for(const [name,html]of[
 ['comment','<!--'+fixtureHTML()+'-->'],['script string','<script>'+JSON.stringify(fixtureHTML())+'</script>'],['JSON string','<script type="application/json">'+JSON.stringify({html:fixtureHTML()})+'</script>'],['encoded text',fixtureHTML().replaceAll('<','&lt;').replaceAll('>','&gt;')],
 ...['template','noscript','textarea','pre','code','svg','math','iframe','xmp'].map(tag=>[tag,'<'+tag+'>'+fixtureHTML()+'</'+tag+'>']),
 ['wrong attribute','<p title="sl-controls"></p>'],['duplicate ID',fixtureHTML()+'<div id="sl-controls"></div>'],['wrong element',fixtureHTML().replace('<div id="sl-controls"','<span id="sl-controls"')],['wrong parent',fixtureHTML().replace('<div id="sl-controls" class="sl-controls"></div>', '<section><div id="sl-controls" class="sl-controls"></div></section>')],['missing class',fixtureHTML().replace('class="sl-controls"','')]
])test('marker impersonation rejected: '+name,()=>{assert.equal(inspectProbeSSR(html,es).sl_controls_dom_present,false);assert.ok(probeSSRFailure(inspectProbeSSR(html,es)));});
for(const [name,html,error]of[
 ['generic200','<html><h1>Hello</h1></html>','PROBE_HTTP_SL_CONTROLS_MISSING'],
 ['Vercel login','<html><title>Log in to Vercel</title></html>','PROBE_HTTP_PLATFORM_OR_ERROR_HTML'],
 ['protection','<h1>Authentication Required</h1>','PROBE_HTTP_PLATFORM_OR_ERROR_HTML'],
 ['genericerror','<html id="__next_error__"><h1>Error</h1></html>','PROBE_HTTP_PLATFORM_OR_ERROR_HTML'],
 ['wrong route',fixtureHTML(en),'PROBE_HTTP_SSR_MARKER_MISMATCH'],
 ['markers plus platform',fixtureHTML()+'<form action="https://vercel.com/login"></form>','PROBE_HTTP_PLATFORM_OR_ERROR_HTML']
])test('reject '+name+' and preserve independently proven Vercel acceptance',async()=>{
 let calls=0;const session=createProbeHttpSession({target,tokenSource:{get:async()=> 'synthetic-local-oidc'},onEvidence:async()=>{},transport:async()=>++calls===1?new Response('',{status:302,headers:{location:'https://vercel.com/login'}}):new Response(html,{status:200,headers:{'content-type':'text/html'}})});
 await assert.rejects(session.get(target.origin+es),{message:error});const proof=session.evidence();assert.equal(proof.http_application_fixture_binding,'FAIL');assert.equal(proof.vercel_protection_oidc_accepted,true);assert.equal(proof.trusted_sources_access,'PASS');assert.equal(proof.trusted_sources_live_certified,true);assert.equal(proof.cross_origin_oidc_forward,false);
});
test('valid markers with changed external fixture binding fail validation',async()=>{
 let calls=0;const session=createProbeHttpSession({target,tokenSource:{get:async()=> 'synthetic-local-oidc'},onEvidence:async()=>{},transport:async()=>++calls===1?new Response('',{status:302,headers:{location:'https://vercel.com/login'}}):new Response(fixtureHTML(),{headers:{'content-type':'text/html'}})});
 await session.get(target.origin+es);for(const [key,value]of[['candidate_git_sha','a'.repeat(40)],['deployment_id','dpl_WrongFixture123'],['origin','https://other.vercel.app']])assert.throws(()=>validateProbeHttpEvidence(session.evidence(),{...target,[key]:value}));
});
test('same origin redirect to unrelated route fails even with valid markers',()=>{assert.equal(probeSSRFailure(inspectProbeSSR(fixtureHTML(),es,'/other')),'PROBE_HTTP_ROUTE_BINDING');});
test('second marker is parsed decoded H1 equality, never comments or scripts',()=>{
 assert.equal(inspectProbeSSR(fixtureHTML().replace('¿','&#191;'),es).second_ssr_marker_match,true);
 for(const wrapping of [x=>'<!--'+x+'-->',x=>'<script>'+JSON.stringify(x)+'</script>'])assert.equal(inspectProbeSSR(fixtureHTML().replace(/<h1>.*?<\/h1>/,wrapping('<h1>¿Dónde está este activo frente a su propia historia?</h1>')),es).second_ssr_marker_match,false);
});

for(const inert of ['script','style','template'])test('H1 '+inert+' content cannot supply semantic heading',()=>{const html=fixtureHTML().replace(/(<h1>)(.*?)(<\/h1>)/,'$1<'+inert+'>$2</'+inert+'>$3');assert.equal(inspectProbeSSR(html,es).second_ssr_marker_match,false);});
test('pinned parser has exact upstream body, license and only documented narrow lint header',async()=>{
 const base=new URL('../vendor/node-html-parser/',import.meta.url),meta=JSON.parse(await fs.readFile(new URL('provenance.json',base),'utf8'));
 const body=await fs.readFile(new URL('index.cjs',base)),license=await fs.readFile(new URL('LICENSE',base));const sha=value=>createHash('sha256').update(value).digest('hex');
 assert.equal(sha(body),meta.vendored_file_sha256);assert.equal(sha(license),meta.license_sha256);assert.equal(body.subarray(0,Buffer.byteLength(meta.lint_header)).toString(),meta.lint_header);
 assert.equal(sha(body.subarray(Buffer.byteLength(meta.lint_header))),'8c6facd042a250d26ae32a2739b6c86a8e383cca92311320804cd87e2a65ae39');
});
