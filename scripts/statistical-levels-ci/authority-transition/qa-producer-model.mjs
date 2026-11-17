// Local service adapters only; no browser result or Check is a hosted certification.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {runTransitionMode} from '../../statistical-levels-release/scripts/runtime-io.mjs';
import {P,canonical,sha,productGates} from '../../statistical-levels-release/scripts/release-core.mjs';
import {serviceCheck} from './service-check.mjs';
const chunks=[];for await(const c of process.stdin)chunks.push(c);
const input=JSON.parse(Buffer.concat(chunks));
let remoteAttempts=0;globalThis.fetch=()=>{remoteAttempts++;throw new Error('NETWORK_FORBIDDEN');};
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'sl-qa-link-model-'));
try {
 const calls=[],checks=[];let tick=0;
 const env={RUNNER_TEMP:temp,GITHUB_OUTPUT:path.join(temp,'outputs'),SL_TRANSITION_CONTEXT:JSON.stringify(input.proof)};
 const report=input.report??{result:'PASS',gates:Object.fromEntries(productGates.map(x=>[x,'PASS'])),snapshot_count:81,provenance_coverage:100,capability_ids:P.capabilities,routes:['/niveles-estadisticos','/en/statistical-levels'],viewports:[[1440,900],[390,844]],application_console_errors:0,required_application_request_failures:0,broken_assets:0,hydration_errors:0,overflow:0,raw_platform_events:[],raw_rsc_events:[],unclassified_failures:[],expected_values:'PASS'};
 await runTransitionMode('transition-qa',env,{
  assertWorkflow:async()=>({selection:input.selection,run:input.run,workflow_sha256:input.workflow_hash}),
  clock:()=>new Date(input.clock_ms+1000*tick++).toISOString(),
  github:async p=>{calls.push({kind:'GET',path:p});if(p.includes('/jobs?'))return input.jobs;if(p.startsWith('/compare/'))return input.comparison;throw new Error('UNEXPECTED_ENDPOINT');},
  runQA:async options=>{calls.push({kind:'QA',target:options.target,tokenSourcePresent:Object.hasOwn(options,'tokenSource')});return report;},
  githubWrite:async(endpoint,body)=>{calls.push({kind:'MODELED_CHECK_CREATE',endpoint});const c=serviceCheck(body,input.check_id);checks.push(c);return c;}
 });
 const outputs=Object.fromEntries((await fs.readFile(env.GITHUB_OUTPUT,'utf8')).trimEnd().split('\n').map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
 process.stdout.write(JSON.stringify({scope:'LOCAL_SERVICE_MODELS_ONLY',check:checks[0],envelope:JSON.parse(outputs.transition_envelope),seal_sha256:outputs.transition_seal_sha256,calls,remote_attempts:remoteAttempts}));
} finally {await fs.rm(temp,{recursive:true,force:true});}
