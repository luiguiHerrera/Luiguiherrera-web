// Dual-baseline runtime orchestrator. Requires an independently sealed remote-base checkout.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
export const root = path.resolve(process.env.REGIME_INTEGRATION_ROOT ?? fileURLToPath(new URL('../../', import.meta.url)));
const remoteBaseCommit = '7dae726917ded8f5828a8525d596b1ce02830196';
let evidence;
export function publicProof() {
  if (evidence) return evidence;
  const remoteRoot = process.env.REGIME_INTEGRATION_REMOTE_ROOT;
  if (!remoteRoot) throw new Error('REGIME_INTEGRATION_REMOTE_ROOT must name the independent fresh-remote checkout');
  assert.equal(execFileSync('git', ['rev-parse','HEAD'], { cwd: remoteRoot, encoding: 'utf8' }).trim(), remoteBaseCommit);
  const parent = process.env.REGIME_INTEGRATION_AUDIT_OUTPUT_DIR ?? os.tmpdir(); mkdirSync(parent, { recursive: true });
  const directory = mkdtempSync(path.join(parent, 'v1-public-'));
  const helper = fileURLToPath(new URL('./v1-public-runtime.mjs', import.meta.url));
  for (const [name, source] of [['baseline',remoteRoot],['integrated',root]]) {
    const output = path.join(directory,name+'.json');
    const args = ['--experimental-test-module-mocks','--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',helper,'--root',source,'--output',output,...(name==='integrated'?['--baseline',path.join(directory,'baseline.json')]:[])];
    const result = spawnSync(process.execPath,args,{cwd:source,encoding:'utf8',timeout:30000,maxBuffer:16*1024*1024});
    writeFileSync(path.join(directory,name+'.log'),(result.stdout??'')+(result.stderr??''));
    assert.equal(result.status,0,`${name} public runtime failed; inspect ${directory}`);
  }
  const baseline = JSON.parse(readFileSync(path.join(directory,'baseline.json'),'utf8')),integrated = JSON.parse(readFileSync(path.join(directory,'integrated.json'),'utf8'));
  evidence={baseline,integrated,directory,remoteBaseCommit}; return evidence;
}
