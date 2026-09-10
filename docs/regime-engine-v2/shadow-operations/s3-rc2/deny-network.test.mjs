import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const guard = fileURLToPath(new URL('./deny-network.cjs', import.meta.url));
const repository = fileURLToPath(new URL('../../../../', import.meta.url));
const requireOption = '--require=' + JSON.stringify(guard);
const env = extra => ({ ...process.env, NODE_OPTIONS: requireOption, REGIME_NETWORK_GUARD_LOG: '', ...extra });
function run(code, extra = {}, preload = true) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd: repository, env: { ...env(extra), ...(preload ? {} : { NODE_OPTIONS: '' }) }, encoding: 'utf8', timeout: 15000 });
  assert.equal(result.error, undefined); assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}
const denied = `error => error?.code === 'REGIME_RC2_NETWORK_DENIED'`;

test('outbound fetch, HTTP(S) and TCP/TLS wrappers reject before any underlying connector is invoked', () => {
  // Stub underlying connectors before loading the guard. A guard miss is a
  // deterministic test failure, never an external connection.
  run(`import assert from 'node:assert/strict';import {createRequire} from 'node:module';
    const require=createRequire(import.meta.url);let called=0;
    const original=()=>{called++;throw Error('UNDERLYING_CONNECTOR_REACHED');};
    globalThis.fetch=original;
    for(const [name,methods] of [['http',['request','get']],['https',['request','get']],['net',['connect','createConnection']],['tls',['connect']]])for(const method of methods)require('node:'+name)[method]=original;
    require('node:net').Socket.prototype.connect=original;
    require(${JSON.stringify(guard)});
    await assert.rejects(fetch('https://example.invalid/private?secret=not-recorded'),${denied});
    await assert.rejects(fetch(new Request('http://example.invalid/')),${denied});
    for(const protocol of ['http','https'])for(const method of ['request','get'])assert.throws(()=>require('node:'+protocol)[method]({hostname:'example.invalid',port:443,path:'/'}),${denied});
    assert.throws(()=>require('node:http').request(new URL('http://localhost/'),{hostname:'example.invalid'}),${denied});
    assert.throws(()=>require('node:https').get({host:'example.invalid:443'}),${denied});
    assert.throws(()=>require('node:net').connect(443,'example.invalid'),${denied});
    assert.throws(()=>require('node:net').createConnection({host:'example.invalid',port:443}),${denied});
    assert.throws(()=>new (require('node:net').Socket)().connect({host:'example.invalid',port:443}),${denied});
    assert.throws(()=>require('node:tls').connect(443,{host:'example.invalid'}),${denied});
    assert.equal(called,0);assert.equal(globalThis[Symbol.for('regime-v2.rc2.network-guard')].denied.length,12);`, {}, false);
});

test('global fetch remains mockable for the V1 oracle and returns only its explicit test control', () => {
  const result = run(`import assert from 'node:assert/strict';
    const marker=globalThis[Symbol.for('regime-v2.rc2.network-guard')];assert.ok(marker);
    globalThis.fetch=async()=>new Response('',{status:404});
    assert.equal((await fetch('https://example.invalid/control')).status,404);
    assert.deepEqual(marker.denied,[]);console.log('V1_MOCK_CONTROL_PASS');`);
  assert.match(result.stdout, /V1_MOCK_CONTROL_PASS/);
});

test('loopback HTTP and non-network data URLs remain usable for Next IPC and local QA', () => {
  run(`import assert from 'node:assert/strict';import http from 'node:http';
    const server=http.createServer((req,res)=>res.end('LOCAL_CONTROL'));
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    try {const response=await fetch('http://127.0.0.1:'+server.address().port+'/');assert.equal(await response.text(),'LOCAL_CONTROL');
      const body=await new Promise((resolve,reject)=>http.get('http://127.0.0.1:'+server.address().port+'/',res=>{let text='';res.on('data',c=>text+=c);res.on('end',()=>resolve(text));}).on('error',reject));assert.equal(body,'LOCAL_CONTROL');
      assert.equal(await(await fetch('data:text/plain,LOCAL_DATA_CONTROL')).text(),'LOCAL_DATA_CONTROL');
    }finally{await new Promise(resolve=>server.close(resolve));}`);
});

test('single NODE_OPTIONS require survives the actual Next option normalizer and child spawn', () => {
  const result = run(`import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {spawnSync} from 'node:child_process';
    const require=createRequire(import.meta.url), utils=require('next/dist/server/lib/utils.js');
    const normalized=utils.getFormattedNodeOptionsWithoutInspect();
    assert.ok(normalized.includes('deny-network.cjs'));
    const script="const assert=require('node:assert/strict');assert.ok(globalThis[Symbol.for('regime-v2.rc2.network-guard')]);assert.throws(()=>require('node:https').get('https://example.invalid/'),e=>e.code==='REGIME_RC2_NETWORK_DENIED');console.log('CHILD_GUARD_PASS')";
    const child=spawnSync(process.execPath,['-e',script],{env:{...process.env,NODE_OPTIONS:normalized},encoding:'utf8'});
    assert.equal(child.status,0,child.stderr);process.stdout.write(child.stdout);`);
  assert.match(result.stdout, /CHILD_GUARD_PASS/);
});

test('Worker inherits the require guard before executing its body', () => {
  const result = run(`import assert from 'node:assert/strict';import {Worker} from 'node:worker_threads';
    const source="import {parentPort} from 'node:worker_threads';import assert from 'node:assert/strict';import http from 'node:http';assert.ok(globalThis[Symbol.for('regime-v2.rc2.network-guard')]);assert.throws(()=>http.get('http://example.invalid/'),e=>e.code==='REGIME_RC2_NETWORK_DENIED');parentPort.postMessage('WORKER_GUARD_PASS')";
    const worker=new Worker(source,{eval:true});
    const value=await new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject)});assert.equal(value,'WORKER_GUARD_PASS');await worker.terminate();console.log(value);`);
  assert.match(result.stdout, /WORKER_GUARD_PASS/);
});

test('optional audit events contain no URL, query, header, payload or credential text', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'regime-network-guard-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const logfile = path.join(directory, 'events.jsonl');
  run(`import assert from 'node:assert/strict';await assert.rejects(fetch('https://user:PRIVATE_TOKEN@example.invalid/PRIVATE_PATH?PRIVATE_QUERY=1',{headers:{Authorization:'PRIVATE_HEADER'}}),${denied});`, { REGIME_NETWORK_GUARD_LOG: logfile });
  const bytes = await readFile(logfile, 'utf8'), rows = bytes.trim().split('\n').map(JSON.parse);
  assert.equal(rows.length, 2); assert.deepEqual(rows.map(row => row.event), ['NETWORK_GUARD_LOADED', 'OUTBOUND_NETWORK_DENIED']);
  assert.doesNotMatch(bytes, /PRIVATE_|example|https|Authorization|user/);
  assert.ok(rows.every(row => Object.keys(row).sort().join(',') === 'event,layer,pid,threadId'));
});
