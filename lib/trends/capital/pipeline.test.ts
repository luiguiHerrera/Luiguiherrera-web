import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { digest } from './audit.ts';

test('failed refresh leaves the last validated snapshot, evidence and manifest byte-identical', () => {
  const root=mkdtempSync(path.join(tmpdir(),'trends-outage-test-'));
  try {
    mkdirSync(path.join(root,'scripts'),{recursive:true});
    cpSync(new URL('./',import.meta.url),path.join(root,'lib/trends/capital'),{recursive:true});
    cpSync(new URL('../../../scripts/build-capital-disclosures.mts',import.meta.url),path.join(root,'scripts/build-capital-disclosures.mts'));
    // Fault injection exists only in this disposable copy, never in production.
    writeFileSync(path.join(root,'scripts/fetch-capital-disclosures.py'),'raise RuntimeError("Test-only SEC outage")\n');
    const paths=['snapshot.json.gz','manifest.json','sec-evidence.json.gz'].map(file=>path.join(root,'lib/trends/capital/generated',file));
    const before=paths.map(file=>digest(readFileSync(file)));
    const result=spawnSync(process.execPath,['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON','--experimental-strip-types','scripts/build-capital-disclosures.mts','--fetch'],{cwd:root,encoding:'utf8'});
    assert.notEqual(result.status,0);assert.match(result.stderr,/Test-only SEC outage/);
    assert.deepEqual(paths.map(file=>digest(readFileSync(file))),before);
    assert.equal(JSON.parse(readFileSync(path.join(root,'lib/trends/capital/generated/refresh-status.json'),'utf8')).status,'FAILED');
  } finally { rmSync(root,{recursive:true,force:true}); }
});
