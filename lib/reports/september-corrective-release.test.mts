import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
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
const preservation: Preservation = JSON.parse(fs.readFileSync('docs/statistical-levels-execution-requalification-manifest.json','utf8'));
const digest = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');

function verifyPreservation(value: Preservation, read = (file: string) => fs.readFileSync(file)) {
  assert.equal(value.schema, 'statistical-levels.execution-requalification-preservation.v1');
  assert.equal(value.production_commit, 'c60b17c6ddc5a08fcd402328f69e73f6e1e41b5f');
  assert.equal(value.approved_execution_commit, '0c8fce262fce44650729883862ec948778ebea45');
  assert.equal(value.merge_base_commit, '4ee6adb006f360fea13837db5f7d45815f297b55');
  const historicalBytes = fs.readFileSync(auditRoot+'baseline-hashes.json');
  assert.equal(digest(historicalBytes), value.historical_manifest_sha256);
  const historical: Record<string,string> = JSON.parse(historicalBytes.toString());
  assert.equal(value.statistical_files.length,82);
  assert.equal(value.historical_files.length,57);
  const entries = [...value.statistical_files,...value.historical_files];
  assert.equal(new Set(entries.map(entry=>entry.path)).size,139);
  assert.deepEqual(entries.map(entry=>entry.path).sort(),Object.keys(historical).sort());
  const correctedExports = new Set(['public/reports/manifest.json',...['html','md','pdf'].map(ext=>`public/reports/${report.id}.${ext}`)]);
  for (const entry of value.statistical_files) {
    assert.equal(entry.source_commit,value.approved_execution_commit);
    assert(entry.path.startsWith('lib/statistical-levels/generated/') || entry.path==='lib/statistical-levels/generated-provenance.json');
  }
  for (const entry of value.historical_files) {
    assert.equal(entry.source_commit,value.production_commit);
    assert.equal(entry.historical_sha256,historical[entry.path]);
    if (!correctedExports.has(entry.path)) assert.equal(entry.sha256,entry.historical_sha256);
  }
  // Independently pinned from immutable P/C Git blobs, never from the constructed output.
  assert.equal(digest(JSON.stringify(value)),'03420db6796f9102d66fec33efe62559ef801b0fc1051d9dea88a4c47b08cd7b');
  for (const entry of entries) assert.equal(digest(read(entry.path)),entry.sha256,entry.path);
}

test('composed execution preserves production reports and the approved execution data without rewriting historical evidence', () => {
  verifyPreservation(preservation);
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

test('preservation rejects changed report and active Statistical Levels bytes', () => {
  for (const file of ['public/reports/segundo-informe-septiembre-2026.html',preservation.statistical_files[0].path]) {
    assert.throws(()=>verifyPreservation(preservation,path=>Buffer.concat([fs.readFileSync(path),path===file ? Buffer.from('corruption') : Buffer.alloc(0)])));
  }
});
