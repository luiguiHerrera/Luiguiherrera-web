import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readRegisteredProbeInputManifest,requireRegisteredProbeInputManifest,REGISTERED_PROBE_INPUT_SHA256} from '../scripts/probe-fixture-registry.mjs';
import {verifyProbeInputs} from '../scripts/probe-qa.mjs';
import {verifyInputs} from '../scripts/preview-qa.mjs';
import {P,PROMOTE} from '../scripts/release-core.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),closure=new URL('../',import.meta.url);
const digest=v=>createHash('sha256').update(v).digest('hex');
const pin='d7a8470700b59ed501502e96cc10cba3de8f79824847ed72706f9942c8473621';
const git='c8454dc06bae4bfc2d6fbc90cf9ffa4f94bb63c1';
const fixture={git_sha:git,deployment_id:'dpl_6wA7tYMv6yNhoMQJDXN3S9JXWw9J',origin:'https://luiguiherrera-7vs8qeq5j-luigui-herrera-s-projects.vercel.app',project:'luiguiherrera-web',environment:'Preview'};
const target={operation:'PROBE_IDENTITY',phase:'preview',candidate_git_sha:git,deployment_id:fixture.deployment_id,origin:fixture.origin};
const release={operation:PROMOTE,phase:'preview',candidate_git_sha:'a'.repeat(40),deployment_id:'dpl_FutureCandidate123456',expected_previous_production_sha:P.baseline.production_git_sha};
const historicalBytes=await fs.readFile(new URL('probe-source-inputs.json',closure)),historical=JSON.parse(historicalBytes),candidate=JSON.parse(await fs.readFile(new URL('source-inputs.json',closure)));
const historicalBlob=p=>execFileSync('git',['show',git+':'+p],{cwd:root,maxBuffer:20*1024*1024});
async function registry(t,change=async()=>{}){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sl-manifest-role-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));await fs.mkdir(path.join(dir,'scripts'));
 for(const p of ['scripts/probe-fixture-registry.mjs','scripts/release-core.mjs','probe-source-inputs.json','probe-fixture.json','source-manifest.json','policy.json','source-inputs.json'])await fs.copyFile(new URL(p,closure),path.join(dir,p));
 await change(dir);return import(pathToFileURL(path.join(dir,'scripts/probe-fixture-registry.mjs')).href);
}
async function historicalRoot(t){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sl-historical-inputs-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 for(const p of new Set([...Object.keys(historical),...P.allowlist,'docs/statistical-levels-capability-ledger.json'])){await fs.mkdir(path.dirname(path.join(dir,p)),{recursive:true});await fs.writeFile(path.join(dir,p),historicalBlob(p));}return dir;
}
const priorCurrentMaterialPaths=Object.keys(JSON.parse(execFileSync('git',['show','e2f57918a495051c803fb60cd90bcd1c82e6d473:scripts/statistical-levels-release/source-inputs.json'],{cwd:root})));
const currentMaterialBytes=await fs.readFile(new URL('source-inputs.json',closure),'utf8');
const currentMaterialEntries=[...currentMaterialBytes.matchAll(/^  "([^"]+)": "([a-f0-9]{64})",?$/gm)].map(m=>[m[1],m[2]]);
assert.equal(currentMaterialEntries.length,Object.keys(candidate).length,'duplicate or malformed material entry');
test('historical Probe bytes are independently pinned exact 41 entries',async()=>{assert.equal(REGISTERED_PROBE_INPUT_SHA256,pin);assert.equal(digest(historicalBytes),pin);assert.equal(Object.keys(historical).length,41);assert.deepEqual(historicalBytes,historicalBlob('scripts/statistical-levels-release/source-inputs.json'));for(const [p,h]of Object.entries(historical)){assert.match(h,/^[a-f0-9]{64}$/);assert.equal(digest(historicalBlob(p)),h);}});
test('current 78 material inputs retain all historical paths and hash actual candidate',async()=>{assertCurrentMaterialInputs(currentMaterialEntries);assert(Object.keys(historical).every(p=>Object.hasOwn(candidate,p)));for(const [p,h]of Object.entries(candidate))assert.equal(digest(await fs.readFile(path.join(root,p))),h,p);assert.notEqual(candidate['components/statistical-levels/StatLevelsLab.tsx'],historical['components/statistical-levels/StatLevelsLab.tsx']);});
const cases={
 PROBE_MANIFEST_CHANGED:b=>Buffer.concat([b,Buffer.from(' ')]),
 PROBE_MANIFEST_PATH_ADDED:b=>Buffer.from(JSON.stringify({...JSON.parse(b),'added.ts':'a'.repeat(64)})),
 PROBE_MANIFEST_PATH_REMOVED:b=>{const v=JSON.parse(b);delete v[Object.keys(v)[0]];return Buffer.from(JSON.stringify(v));},
 PROBE_MANIFEST_HASH_CHANGED:b=>{const v=JSON.parse(b);v[Object.keys(v)[0]]='a'.repeat(64);return Buffer.from(JSON.stringify(v));},
 PROBE_MANIFEST_WRONG_HISTORICAL_COMPONENT_HASH:b=>Buffer.from(JSON.stringify({...JSON.parse(b),'components/statistical-levels/StatLevelsLab.tsx':'f'.repeat(64)})),
 PROBE_MANIFEST_CURRENT_CANDIDATE_SUBSTITUTION:()=>Buffer.from(JSON.stringify(candidate)),
 PROBE_MANIFEST_PATH_ESCAPE:b=>Buffer.from(JSON.stringify({...JSON.parse(b),'../outside':'a'.repeat(64)})),
 PROBE_MANIFEST_MALFORMED_HASH:b=>{const v=JSON.parse(b);v[Object.keys(v)[0]]='NOT_SHA256';return Buffer.from(JSON.stringify(v));},
 PROBE_MANIFEST_DUPLICATE_ROLE:b=>Buffer.from(b.toString().replace('{','{"components/statistical-levels/StatLevelsLab.tsx":"'+'a'.repeat(64)+'",')),
};
for(const [name,mutate]of Object.entries(cases))test(name,async t=>{const m=await registry(t,dir=>fs.writeFile(path.join(dir,'probe-source-inputs.json'),mutate(historicalBytes)));await assert.rejects(m.readRegisteredProbeInputManifest(target));});
test('PROBE_MANIFEST_SYMLINK',async t=>{const m=await registry(t,async dir=>{const p=path.join(dir,'probe-source-inputs.json');await fs.rename(p,p+'.actual');await fs.symlink(p+'.actual',p);});await assert.rejects(m.readRegisteredProbeInputManifest(target));});
for(const [name,key,value]of [['PROBE_FIXTURE_GIT_SHA_CHANGED','git_sha','b'.repeat(40)],['PROBE_FIXTURE_DEPLOYMENT_CHANGED','deployment_id','dpl_DifferentProbe123456'],['PROBE_FIXTURE_ORIGIN_CHANGED','origin','https://different.vercel.app'],['PROBE_FIXTURE_PROJECT_CHANGED','project','different'],['PROBE_FIXTURE_ENVIRONMENT_CHANGED','environment','Production']])test(name,async t=>{
 const m=await registry(t,async dir=>{const changed=Buffer.from(JSON.stringify({...fixture,[key]:value}));await fs.writeFile(path.join(dir,'probe-fixture.json'),changed);const p=path.join(dir,'source-manifest.json'),v=JSON.parse(await fs.readFile(p));v['probe-fixture.json']=digest(changed);await fs.writeFile(p,JSON.stringify(v));});await assert.rejects(m.readRegisteredProbeInputManifest(target));
});
test('independent historical input SHA pin mutation rejects the historical bytes',async t=>{const m=await registry(t,async dir=>{const p=path.join(dir,'scripts/probe-fixture-registry.mjs');await fs.writeFile(p,(await fs.readFile(p,'utf8')).replace(pin,'a'.repeat(64)));});await assert.rejects(m.readRegisteredProbeInputManifest(target));});
test('changing current manifest has no effect on registered Probe authority',async t=>{const m=await registry(t,dir=>fs.writeFile(path.join(dir,'source-inputs.json'),'invalid future manifest'));const h=await m.readRegisteredProbeInputManifest(target);assert.deepEqual(m.requireRegisteredProbeInputManifest(h,target),historical);});
test('CURRENT_MANIFEST_USED_FOR_PROBE',async()=>{await assert.rejects(verifyProbeInputs('/must-not-read',candidate,target),{message:'PROBE_INPUT_ROLE'});});
test('plain historical dictionary cannot self-authorize Probe',async()=>{await assert.rejects(verifyProbeInputs('/must-not-read',historical,target),{message:'PROBE_INPUT_ROLE'});});
test('forged role handle cannot authorize Probe',async()=>{assert.throws(()=>requireRegisteredProbeInputManifest({role:'PROBE_IDENTITY',manifest_sha256:pin},target));});
test('serialized genuine role handle cannot authorize Probe',async()=>{const h=await readRegisteredProbeInputManifest(target);assert.throws(()=>requireRegisteredProbeInputManifest(JSON.parse(JSON.stringify(h)),target));});
for(const operation of ['ADOPT','PROMOTE','UNKNOWN'])test('Probe manifest handle rejects operation '+operation,async()=>{const h=await readRegisteredProbeInputManifest(target);assert.throws(()=>requireRegisteredProbeInputManifest(h,{...target,operation}));});
test('historical registered candidate passes real Probe verifier; future model cannot borrow historical pins',async t=>{const h=await readRegisteredProbeInputManifest(target),dir=await historicalRoot(t);await verifyProbeInputs(dir,h,target);await fs.writeFile(path.join(dir,'components/statistical-levels/StatLevelsLab.tsx'),await fs.readFile(path.join(root,'components/statistical-levels/StatLevelsLab.tsx')));await assert.rejects(verifyProbeInputs(dir,h,target),{message:'QA_INPUT_HASH'});});
test('current candidate passes real PROMOTE input verifier',async()=>{await verifyInputs(root,candidate,release);});
test('historical candidate cannot qualify with future manifest',async t=>{const dir=await historicalRoot(t);await assert.rejects(verifyInputs(dir,candidate,release));});
test('PROBE_MANIFEST_USED_FOR_PROMOTE',async()=>{const h=await readRegisteredProbeInputManifest(target);await assert.rejects(verifyInputs(root,h,release));await assert.rejects(verifyInputs(root,historical,release),{message:'QA_INPUT_HASH'});});
test('release fixed current manifest path remains independent of historical Probe routing',async()=>{const cli=await fs.readFile(new URL('scripts/cli.mjs',closure),'utf8'),probe=await fs.readFile(new URL('scripts/probe-cli.mjs',closure),'utf8');assert.match(cli,/source-inputs\.json/);assert.doesNotMatch(cli,/probe-source-inputs|readRegisteredProbeInputManifest/);assert.match(probe,/readRegisteredProbeInputManifest\(target\)/);assert.doesNotMatch(probe,/readJSON\('source-inputs\.json'\)/);});
for(const [key,value]of [['candidate_git_sha','a'.repeat(40)],['deployment_id','dpl_Wrong1234567890'],['origin','https://wrong.vercel.app'],['phase','production']])test('issued Probe input handle rejects changed '+key,async()=>{const h=await readRegisteredProbeInputManifest(target);assert.throws(()=>requireRegisteredProbeInputManifest(h,{...target,[key]:value}));});
for(const [name,change]of [
 ['missing dedicated manifest',async dir=>fs.unlink(path.join(dir,'probe-source-inputs.json'))],
 ['directory substituted for manifest',async dir=>{const p=path.join(dir,'probe-source-inputs.json');await fs.unlink(p);await fs.mkdir(p);}],
 ['invalid JSON cannot be authority',dir=>fs.writeFile(path.join(dir,'probe-source-inputs.json'),'{')],
 ['uppercase SHA representation',dir=>fs.writeFile(path.join(dir,'probe-source-inputs.json'),historicalBytes.toString().replace(/[a-f0-9]{64}/,x=>x.toUpperCase()))],
 ['semantic path alias',dir=>fs.writeFile(path.join(dir,'probe-source-inputs.json'),historicalBytes.toString().replace('components/','components/./'))],
 ['absolute semantic path',dir=>fs.writeFile(path.join(dir,'probe-source-inputs.json'),historicalBytes.toString().replace('components/','/components/'))],
 ['backslash semantic path',dir=>fs.writeFile(path.join(dir,'probe-source-inputs.json'),historicalBytes.toString().replace('components/','components\\\\'))],
 ['derived manifest cannot bless changed historical input',async dir=>{const bytes=Buffer.concat([historicalBytes,Buffer.from(' ')]);await fs.writeFile(path.join(dir,'probe-source-inputs.json'),bytes);const p=path.join(dir,'source-manifest.json'),m=JSON.parse(await fs.readFile(p));m['probe-source-inputs.json']=digest(bytes);await fs.writeFile(p,JSON.stringify(m));}],
])test('Probe input rejects '+name,async t=>{const m=await registry(t,change);await assert.rejects(m.readRegisteredProbeInputManifest(target));});
test('handle issued by another registry instance cannot cross the trust boundary',async t=>{const m=await registry(t);const h=await m.readRegisteredProbeInputManifest(target);assert.throws(()=>requireRegisteredProbeInputManifest(h,target));});
test('spread genuine handle loses issuance identity',async()=>{const h=await readRegisteredProbeInputManifest(target);assert.throws(()=>requireRegisteredProbeInputManifest({...h},target));});
test('changing a returned handle cannot change its manifest role',async()=>{const h=await readRegisteredProbeInputManifest(target);assert(Object.isFrozen(h));assert.throws(()=>h.role='PROMOTE');assert.deepEqual(requireRegisteredProbeInputManifest(h,target),historical);});
test('historical component symlink cannot satisfy the real Probe verifier',async t=>{const dir=await historicalRoot(t),h=await readRegisteredProbeInputManifest(target),p=path.join(dir,'components/statistical-levels/StatLevelsLab.tsx');await fs.rename(p,p+'.real');await fs.symlink(p+'.real',p);await assert.rejects(verifyProbeInputs(dir,h,target),{message:'QA_INPUT_SYMLINK'});});
test('historical component parent symlink cannot satisfy the real Probe verifier',async t=>{const dir=await historicalRoot(t),h=await readRegisteredProbeInputManifest(target),p=path.join(dir,'components');await fs.rename(p,p+'.real');await fs.symlink(p+'.real',p);await assert.rejects(verifyProbeInputs(dir,h,target),{message:'QA_INPUT_SYMLINK'});});

function assertCurrentMaterialInputs(entries){
 assert.equal(entries.length,78);const names=entries.map(e=>e[0]);assert.equal(new Set(names).size,78);
 assert.equal(priorCurrentMaterialPaths.length,77);assert.deepEqual([...names].sort(),[...priorCurrentMaterialPaths,'vendor/braces-3.0.3-sl-backport.tgz'].sort());
 assert.equal(entries.find(e=>e[0]==='vendor/braces-3.0.3-sl-backport.tgz')[1],'4e9550f8c4b0e4cfff73bd0c55cabbae0277acff892eb499313776f5a3e44428');
}
