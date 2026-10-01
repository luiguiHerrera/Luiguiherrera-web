import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { secondSeptember2026Report as report } from './second-september-2026.ts';
import { getMonthGrid, getCalendarConfig } from './report-presentation.ts';
import { firstSeptember2026Report } from './first-september-2026.ts';
const auditRoot = 'docs/reports/segundo-informe-septiembre-2026/corrective-release/';

test('remaining calendar clips whole prior weeks, preserves Monday alignment, and validates leap dates', () => {
  assert.deepEqual(getMonthGrid(2026, 9, getCalendarConfig(report)), [21,22,23,24,25,26,27,28,29,30,null,null,null,null]);
  assert.deepEqual(getMonthGrid(2026, 9, {calendarView:'remaining',calendarStartDate:'2026-09-23'}), [null,null,23,24,25,26,27,28,29,30,null,null,null,null]);
  assert(getMonthGrid(2024,2,{calendarView:'remaining',calendarStartDate:'2024-02-29'}).includes(29));
  for (const start of [undefined,'2026-09-31','2026-08-21','2026-09-00','2026-9-21']) assert.throws(() => getMonthGrid(2026,9,{calendarView:'remaining',calendarStartDate:start}));
  assert.throws(() => getMonthGrid(2025,2,{calendarView:'remaining',calendarStartDate:'2025-02-29'}));
  assert.deepEqual(getMonthGrid(2026,9,getCalendarConfig(firstSeptember2026Report)), getMonthGrid(2026,9));
});

test('all 18 controls link to context, and every asset fragment has a unique semantic target', () => {
  assert.equal(report.watchlist.length,18);
  assert.equal(report.watchlist.filter(item => item.href.startsWith('https:')).length,9);
  const ids = report.assetReadings.map(asset => asset.id);
  assert.deepEqual(ids,['sp500','oro','china','japon','bitcoin','ethereum','ia-tecnologia','energia-petroleo','usd-cop']);
  assert.equal(new Set(ids).size,9);
  for (const item of report.watchlist) {
    assert(item.href && item.href !== '#' && item.linkLabel.startsWith('Ver '));
    if (item.href.startsWith('#')) assert([...ids,'fuentes-y-aviso'].includes(item.href.slice(1)));
  }
  for (const ext of ['html','md']) {
    const text=fs.readFileSync(`public/reports/${report.id}.${ext}`,'utf8');
    for (const item of report.watchlist) assert(text.includes(item.href) && text.includes(item.linkLabel),`${ext}: ${item.key}`);
    assert.equal(text.split('B. Fuentes oficiales y públicas').length-1,1);
    assert(!text.includes('· continuación'));
    assert(text.includes('Régimen V1 al 18/09'));
    assert(text.includes('70–77 / 100'));
    assert(text.includes('No se publica una cifra puntual'));
    assert(!text.includes('No publicada'));
  }
});

test('corrective release preserves all editorial content except approved presentation metadata and destinations', () => {
  const baseline = JSON.parse(fs.readFileSync(auditRoot+'editorial-baseline.json','utf8'));
  const repaired = structuredClone(report) as typeof baseline;
  delete repaired.presentation.linksOpenNewTab;
  delete repaired.presentation.sourceLinks;
  repaired.sourcesNote = baseline.sourcesNote;
  for (const group of repaired.sourceGroups) {
    group.entries = group.entries.filter((e: {label: string}) => !/^\[(?:B2[1-6]|C5)\]/.test(e.label));
    group.entries.forEach((e: {label: string;href?:string;note?:string}) => {
      if(e.label.startsWith("[C6]")) e.label=e.label.replace("[C6] ","");
      const original=baseline.sourceGroups.flatMap((g: {entries: unknown[]})=>g.entries).find((b: {label:string})=>b.label===e.label);
      if(/^\[(?:A[1-3]|C2)\]/.test(e.label)) {e.note=original.note;if(original.href) e.href=original.href;else delete e.href;}
    });
  }
  delete repaired.presentation.calendarView;
  delete repaired.presentation.calendarStartDate;
  delete repaired.presentation.marketReadingsLayout;
  repaired.assetReadings.forEach((asset: {id?: string}) => { delete asset.id; });
  repaired.watchlist.forEach((item: {href?: string;linkLabel?: string}) => {delete item.href;delete item.linkLabel;});
  const normalizeGroups = (value: typeof baseline) => {value.sourceGroups=value.sourceGroups.flatMap((g: {entries: unknown[]})=>g.entries);};
  normalizeGroups(baseline);normalizeGroups(repaired);
  assert.deepEqual(repaired,baseline);
  const b = report.sourceGroups.filter(g=>g.title.startsWith('B.'));
  assert.equal(b.length,1);
  assert.deepEqual(b[0].entries.map(e=>e.label.match(/^\[B(\d+)\]/)?.[1]).filter(Boolean).sort((a,b)=>Number(a)-Number(b)),Array.from({length:26},(_,i)=>String(i+1)));
  assert.equal(b[0].entries.length,27); // Preserve the already published supplementary BOJ reference.
});

type PreservationEntry = { path: string; source_commit: string; sha256: string; historical_sha256?: string };
type Preservation = {
  schema: string; production_commit: string; approved_execution_commit: string; merge_base_commit: string;
  historical_manifest_sha256: string; statistical_files: PreservationEntry[]; historical_files: PreservationEntry[];
};
const preservationBytes = fs.readFileSync('docs/statistical-levels-execution-requalification-manifest.json');
const preservation: Preservation = JSON.parse(preservationBytes.toString());
const digest = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const readHistorical = (commit: string, file: string) => {
  assert(['0c8fce262fce44650729883862ec948778ebea45','c60b17c6ddc5a08fcd402328f69e73f6e1e41b5f'].includes(commit));
  assert(/^[a-zA-Z0-9_./()-]+$/.test(file) && !file.startsWith('/') && file.split('/').every(p=>p && p!=='.' && p!=='..'));
  return execFileSync('git',['show',`${commit}:${file}`],{maxBuffer:32*1024*1024});
};
const readCurrent = (file: string) => fs.readFileSync(file);
const correctedExports = new Set([
  'public/reports/manifest.json',
  'public/reports/segundo-informe-septiembre-2026.html',
  'public/reports/segundo-informe-septiembre-2026.md',
  'public/reports/segundo-informe-septiembre-2026.pdf',
]);

function verifyPreservation(value: Preservation, read = readCurrent, historicalRead = readHistorical, anchor = readCurrent(auditRoot+'baseline-hashes.json'), manifestBytes = preservationBytes, corrected = correctedExports) {
  assert.equal(digest(manifestBytes),'5e74899a8b473be8fe9bd0973301f8cc3441fbf183172fb9d093b171599c62a5');
  assert.equal(value.schema, 'statistical-levels.execution-requalification-preservation.v1');
  assert.equal(value.production_commit, 'c60b17c6ddc5a08fcd402328f69e73f6e1e41b5f');
  assert.equal(value.approved_execution_commit, '0c8fce262fce44650729883862ec948778ebea45');
  assert.equal(value.merge_base_commit, '4ee6adb006f360fea13837db5f7d45815f297b55');
  const historicalBytes = anchor;
  assert.equal(digest(historicalBytes), value.historical_manifest_sha256);
  const historical: Record<string,string> = JSON.parse(historicalBytes.toString());
  assert.equal(value.statistical_files.length,82);
  assert.equal(value.historical_files.length,57);
  const entries = [...value.statistical_files,...value.historical_files];
  assert.equal(new Set(entries.map(entry=>entry.path)).size,139);
  assert.deepEqual(entries.map(entry=>entry.path).sort(),Object.keys(historical).sort());
  assert.deepEqual([...corrected].sort(),[
    'public/reports/manifest.json','public/reports/segundo-informe-septiembre-2026.html',
    'public/reports/segundo-informe-septiembre-2026.md','public/reports/segundo-informe-septiembre-2026.pdf',
  ]);
  assert.equal(value.historical_files.filter(e=>corrected.has(e.path)).length,4);
  for (const entry of value.statistical_files) {
    assert.equal(entry.source_commit,value.approved_execution_commit);
    assert(entry.path.startsWith('lib/statistical-levels/generated/') || entry.path==='lib/statistical-levels/generated-provenance.json');
  }
  for (const entry of value.historical_files) {
    assert.equal(entry.source_commit,value.production_commit);
    assert.equal(entry.historical_sha256,historical[entry.path]);
    if (corrected.has(entry.path)) assert.notEqual(entry.sha256,entry.historical_sha256);
    else assert.equal(entry.sha256,entry.historical_sha256);
  }
  // Independently pinned from immutable P/C Git blobs, never from the constructed output.
  assert.equal(digest(JSON.stringify(value)),'03420db6796f9102d66fec33efe62559ef801b0fc1051d9dea88a4c47b08cd7b');
  for (const entry of value.statistical_files) assert.equal(digest(historicalRead(entry.source_commit,entry.path)),entry.sha256,entry.path);
  for (const entry of value.historical_files) {
    // c60 contains the approved post-correction bytes; the independently pinned
    // baseline retains the earlier identity for exactly the four corrected exports.
    assert.equal(digest(historicalRead(entry.source_commit,entry.path)),entry.sha256,entry.path);
    assert.equal(digest(read(entry.path)),entry.sha256,entry.path);
  }
}

test('composed execution preserves production reports and the approved execution data without rewriting historical evidence', () => {
  verifyPreservation(preservation);
});

const correctedNegatives = [
  'CORRECTED_EXPORT_SET_MISSING_ENTRY','CORRECTED_EXPORT_SET_EXTRA_ENTRY',
  'CORRECTED_EXPORT_HISTORICAL_SHA_EQUALS_CORRECTED_SHA','CORRECTED_EXPORT_BASELINE_HASH_MISMATCH',
  'CORRECTED_EXPORT_SOURCE_BLOB_MISMATCH','CORRECTED_EXPORT_CURRENT_BLOB_MISMATCH','CORRECTED_EXPORT_WRONG_SOURCE_COMMIT',
  'UNCORRECTED_FILE_DIFFERENT_SHA_ALLOWED','UNCORRECTED_FILE_WRONG_HISTORICAL_SHA',
  'STATISTICAL_FILE_CURRENT_BYTES_USED_AS_HISTORICAL_AUTHORITY','HISTORICAL_MANIFEST_MUTATION','BASELINE_HASH_MANIFEST_MUTATION',
] as const;
for (const name of correctedNegatives) test(`corrected export role rejects ${name}`,()=>{
  const value=structuredClone(preservation),corrected=new Set(correctedExports);
  const entry=value.historical_files.find(e=>corrected.has(e.path))!;
  const unchanged=value.historical_files.find(e=>!corrected.has(e.path))!;
  let current=readCurrent,historical=readHistorical,anchor=readCurrent(auditRoot+'baseline-hashes.json'),manifest=preservationBytes;
  const corrupt=(b:Buffer)=>Buffer.concat([b,Buffer.from('corruption')]);
  switch(name){
    case 'CORRECTED_EXPORT_SET_MISSING_ENTRY':corrected.delete(entry.path);break;
    case 'CORRECTED_EXPORT_SET_EXTRA_ENTRY':corrected.add(unchanged.path);break;
    case 'CORRECTED_EXPORT_HISTORICAL_SHA_EQUALS_CORRECTED_SHA':entry.historical_sha256=entry.sha256;break;
    case 'CORRECTED_EXPORT_BASELINE_HASH_MISMATCH':{const a=JSON.parse(anchor.toString());a[entry.path]='0'.repeat(64);anchor=Buffer.from(JSON.stringify(a));break;}
    case 'CORRECTED_EXPORT_SOURCE_BLOB_MISMATCH':historical=(c,p)=>p===entry.path?corrupt(readHistorical(c,p)):readHistorical(c,p);break;
    case 'CORRECTED_EXPORT_CURRENT_BLOB_MISMATCH':current=p=>p===entry.path?corrupt(readCurrent(p)):readCurrent(p);break;
    case 'CORRECTED_EXPORT_WRONG_SOURCE_COMMIT':entry.source_commit=value.approved_execution_commit;break;
    case 'UNCORRECTED_FILE_DIFFERENT_SHA_ALLOWED':unchanged.sha256='0'.repeat(64);break;
    case 'UNCORRECTED_FILE_WRONG_HISTORICAL_SHA':unchanged.historical_sha256='0'.repeat(64);break;
    case 'STATISTICAL_FILE_CURRENT_BYTES_USED_AS_HISTORICAL_AUTHORITY':historical=(c,p)=>c===value.approved_execution_commit?readCurrent(p):readHistorical(c,p);break;
    case 'HISTORICAL_MANIFEST_MUTATION':manifest=corrupt(manifest);break;
    case 'BASELINE_HASH_MANIFEST_MUTATION':anchor=corrupt(anchor);break;
  }
  assert.throws(()=>verifyPreservation(value,current,historical,anchor,manifest,corrected));
});

test('preservation rejects missing, extra, duplicate, cross-owned and individually corrupted expected hashes', () => {
  for (const mutate of [
    (x: Preservation) => { x.statistical_files.pop(); },
    (x: Preservation) => { x.statistical_files.push({...x.statistical_files[0],path:'unexpected.json'}); },
    (x: Preservation) => { x.statistical_files[1]={...x.statistical_files[0]}; },
    (x: Preservation) => { x.statistical_files[0].source_commit=x.production_commit; },
    (x: Preservation) => { x.merge_base_commit=x.production_commit; },
    ...preservation.statistical_files.map((_,index)=>(x: Preservation)=>{x.statistical_files[index].sha256='0'.repeat(64);}),
  ]) {
    const corrupted=structuredClone(preservation);mutate(corrupted);
    assert.throws(()=>verifyPreservation(corrupted));
  }
});

test('preservation rejects changed current report bytes', () => {
  for (const file of ['public/reports/segundo-informe-septiembre-2026.html']) {
    assert.throws(()=>verifyPreservation(preservation,path=>Buffer.concat([fs.readFileSync(path),path===file ? Buffer.from('corruption') : Buffer.alloc(0)])));
  }
});

const preservationNegatives = [
  'HISTORICAL_MANIFEST_BYTE_MUTATION','HISTORICAL_BASELINE_ANCHOR_MUTATION',
  'STATISTICAL_ENTRY_WRONG_SOURCE_COMMIT','STATISTICAL_HISTORICAL_BLOB_CORRUPTION','STATISTICAL_ENTRY_HASH_CORRUPTION',
  'HISTORICAL_ENTRY_WRONG_SOURCE_COMMIT','HISTORICAL_BLOB_CORRUPTION','HISTORICAL_CURRENT_WORKTREE_CORRUPTION',
  'HISTORICAL_SHA_CORRUPTION','DUPLICATE_PRESERVATION_PATH','MISSING_PRESERVATION_PATH','EXTRA_PRESERVATION_PATH',
  'CURRENT_STATISTICAL_BYTES_SUBSTITUTED_AS_HISTORICAL_BLOB',
] as const;
for (const name of preservationNegatives) test(`historical authority rejects ${name}`,()=>{
  const value=structuredClone(preservation);let current=readCurrent,historical=readHistorical;
  let anchor=readCurrent(auditRoot+'baseline-hashes.json'),manifest=preservationBytes;
  const corrupt=(b:Buffer)=>Buffer.concat([b,Buffer.from('corruption')]);
  switch(name) {
    case 'HISTORICAL_MANIFEST_BYTE_MUTATION': manifest=corrupt(manifest);break;
    case 'HISTORICAL_BASELINE_ANCHOR_MUTATION': anchor=corrupt(anchor);break;
    case 'STATISTICAL_ENTRY_WRONG_SOURCE_COMMIT': value.statistical_files[0].source_commit=value.production_commit;break;
    case 'STATISTICAL_HISTORICAL_BLOB_CORRUPTION': historical=(c,p)=>c===value.approved_execution_commit?corrupt(readHistorical(c,p)):readHistorical(c,p);break;
    case 'STATISTICAL_ENTRY_HASH_CORRUPTION': value.statistical_files[0].sha256='0'.repeat(64);break;
    case 'HISTORICAL_ENTRY_WRONG_SOURCE_COMMIT': value.historical_files[0].source_commit=value.approved_execution_commit;break;
    case 'HISTORICAL_BLOB_CORRUPTION': historical=(c,p)=>c===value.production_commit?corrupt(readHistorical(c,p)):readHistorical(c,p);break;
    case 'HISTORICAL_CURRENT_WORKTREE_CORRUPTION': current=p=>p===value.historical_files[0].path?corrupt(readCurrent(p)):readCurrent(p);break;
    case 'HISTORICAL_SHA_CORRUPTION': value.historical_files[0].historical_sha256='0'.repeat(64);break;
    case 'DUPLICATE_PRESERVATION_PATH': value.statistical_files[1]={...value.statistical_files[0]};break;
    case 'MISSING_PRESERVATION_PATH': value.statistical_files.pop();break;
    case 'EXTRA_PRESERVATION_PATH': value.statistical_files.push({...value.statistical_files[0],path:'unexpected.json'});break;
    case 'CURRENT_STATISTICAL_BYTES_SUBSTITUTED_AS_HISTORICAL_BLOB': historical=(c,p)=>c===value.approved_execution_commit?readCurrent(p):readHistorical(c,p);break;
  }
  assert.throws(()=>verifyPreservation(value,current,historical,anchor,manifest));
});

test('historical and independently bound current statistical snapshots coexist',()=>{
  verifyPreservation(preservation);
  const statistical=new Set(preservation.statistical_files.map(e=>e.path));
  // Historical verification must never read active statistical payloads.
  verifyPreservation(preservation,p=>{assert(!statistical.has(p));return readCurrent(p);});
  assert(preservation.statistical_files.some(e=>digest(readCurrent(e.path))!==e.sha256));
  const p=JSON.parse(readCurrent('lib/statistical-levels/generated-provenance.json').toString());
  assert.equal(p.SCHEMA_VERSION,'statistical-levels.provenance.v1');
  assert.equal(p.SOURCE_STATE,'COMMITTED');
  assert.equal(p.CONFIG.BASELINE_ID,p.BASELINE_ID);
  assert.equal(digest(JSON.stringify(p.CONFIG)),p.CONFIG_SHA256);
  assert.equal(digest(JSON.stringify(p.SOURCE_BUNDLE)),p.GENERATOR_SHA256);
  for(const source of p.SOURCE_BUNDLE) assert.equal(digest(readCurrent(source.file)),source.SHA256);
  assert.equal(p.snapshots.length,81);
  assert.equal(new Set(p.snapshots.map((e:{FILE:string})=>e.FILE)).size,81);
  assert.deepEqual(p.snapshots.map((e:{FILE:string})=>'lib/statistical-levels/generated/'+e.FILE).sort(),preservation.statistical_files.map(e=>e.path).filter(p=>p.includes('/generated/')).sort());
  for(const e of p.snapshots){
    assert.equal(digest(readCurrent('lib/statistical-levels/generated/'+e.FILE)),e.SNAPSHOT_SHA256);
    for(const key of ['GENERATOR_COMMIT','GENERATOR_SHA256','CONFIG_SHA256','GENERATED_AT'])assert.equal(e[key],p[key]);
    assert(e.INPUTS.length>0);
    for(const input of e.INPUTS){assert(input.RAW_SOURCE_ID.startsWith(p.BASELINE_ID+'/raw/'));assert.match(input.RAW_SHA256,/^[a-f0-9]{64}$/);assert.equal(input.SNAPSHOT_CUTOFF,p.CONFIG.SNAPSHOT_CUTOFF);}
  }
  const manifest=JSON.parse(readCurrent('lib/statistical-levels/generated/manifest.json').toString());
  assert.equal(manifest.baseline.id,p.BASELINE_ID);
  assert.equal(manifest.baseline.rawManifestSha256,p.CONFIG.RAW_MANIFEST_SHA256);
});
