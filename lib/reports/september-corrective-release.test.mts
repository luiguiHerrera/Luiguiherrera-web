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
const currentProduction = {"schema":"statistical-levels.current-production-report-preservation.v1","production_commit":"d2f20862adb13946c0fc81567184a5c87e43a091","production_tree":"db17d597bc28b80a0508f9c9fd97993bf2d9f353","commits":[{"commit":"c60b17c6ddc5a08fcd402328f69e73f6e1e41b5f","raw_commit_sha256":"506d5bb8a19a88590c8ef75d5fd3bd8ccf156840f69af6eb44a07ca75f597f65","object_id_valid":true,"tree":"d5348c8ace77b433010ffc51ccab8674ccad81b9","parents":["4d7285851f524dd8faac5d47f159a163bdd3a56e"]},{"commit":"cccae985573110509483d6fa5a5dc12cd17f4003","raw_commit_sha256":"a6f5e8bd7492d450477fdc9a5b9a89b86b8329d9c6d0b8d9589cea468a5726d0","object_id_valid":true,"tree":"7b3b606d9fbd1581aeb2ec7c2bcb7c04801429a4","parents":["c60b17c6ddc5a08fcd402328f69e73f6e1e41b5f"]},{"commit":"94cfde442c974071886d8d8740207902ee68154a","raw_commit_sha256":"daef02c76a7df4b3b8733ffe710991a466b0a248dd5ea1231100d4266295566a","object_id_valid":true,"tree":"b9cae14402f369196ffd207c5d6a65d1d5301bfd","parents":["cccae985573110509483d6fa5a5dc12cd17f4003"]},{"commit":"d2f20862adb13946c0fc81567184a5c87e43a091","raw_commit_sha256":"0ea1496a743ab2fd1b7ef18d4736b750b8bfac92c0256aa8485af36309416f67","object_id_valid":true,"tree":"db17d597bc28b80a0508f9c9fd97993bf2d9f353","parents":["94cfde442c974071886d8d8740207902ee68154a"]}],"reports":{"components/reports/MarketReportContent.tsx":{"mode":"100644","oid":"50a782600aeec00808bbe7d8b56ce18d02dc4748","sha256":"fdcb3b0b59b59ba38a70d00ff3a48bbce49a5ae70ed073a8ba989d3585df6ff2"},"lib/reports/first-october-2026.test.mts":{"mode":"100644","oid":"c7ef66ede5d5c75ee6b6e10e83f4120350872247","sha256":"c550d0f1ce9e289972d0078c33830bc184ad420c9a19a9704db7a4018ac8d6a3"},"lib/reports/first-october-2026.ts":{"mode":"100644","oid":"cff57035d3f16e2096f1e05783deae95288b3831","sha256":"1ea880b3540b47a746073e02d76bcb210d3ee36843d77c0e11ef9837b4186211"},"lib/reports/first-september-2026.test.mts":{"mode":"100644","oid":"287134f5a6a664cf9a2bca748ad5b510cf852d79","sha256":"67328ac59bb0a8bb824e4cce25412a5c3a8d7b1a4e751e5bf2469c29b95c29c6"},"lib/reports/market-reports.ts":{"mode":"100644","oid":"67766c9061437d688992084fd5428db80bf0067f","sha256":"3abb4ecc0e4f548fb0b7c1c9d511acb914d618e0a77aa70729be407b157304cb"},"lib/reports/report-export-model.ts":{"mode":"100644","oid":"8af6f47a6e6090fbe5d685c94d8d5c51decb6294","sha256":"281c8fdfd040b85c26f76dcba771bc5d641d7b93ab4377011a42ce89e6ae271d"},"lib/reports/second-september-2026.test.mts":{"mode":"100644","oid":"f0e81404996014ad1fdafe4eb32f395a290bb92c","sha256":"998216f8467efeed1d6da22cef7ae4427c05c00b5e2f05886d2e04d0641a97a0"},"lib/reports/snapshots/primer-informe-octubre-2026/market-close.json":{"mode":"100644","oid":"b169002acb1b43548d9d4738d3d9eabc31cd2b60","sha256":"c2c895c88ff9667b4621429c15720a15e53405825056bca55ba62d94a0600d9c"},"lib/reports/snapshots/primer-informe-octubre-2026/statistical.json":{"mode":"100644","oid":"7bef2065ccb40e64c2f4ff6fbdefdb80f56431f0","sha256":"8f6533e9278304add989d0255b2cb590555e3a37cbf2126c12997b32b1288e92"},"lib/reports/snapshots/primer-informe-octubre-2026/weekly-returns.json":{"mode":"100644","oid":"afa1e8b4a814bb4b587e70bf6975cdf1d942a367","sha256":"8610234dce9afa79fa9aaf17dd0068478d4cf8b7e4c42846267dad50df80f300"},"public/llms.txt":{"mode":"100644","oid":"2ff4cd2eb0e5a6b02f37df5e77e48df66bf963a1","sha256":"f99a3763263f415b841d474dc948f930678f128b33eed0edb4ce03797a2821f8"},"public/reports/manifest.json":{"mode":"100644","oid":"3edf88956309ccbae7994112de74d7c0363af22e","sha256":"627e57fba5d11c24197fd940ca92e11c691b325498824cfeaceadb4fa7ede321"},"public/reports/primer-informe-octubre-2026-calendar.ics":{"mode":"100644","oid":"1334d030b5fad6b5e52a3a03f28d6a9a2db483a7","sha256":"22c4cefad777c15aa9dafa6bc6f1bc91fdfdc2b97afbe1838279f8ce74f0ca50"},"public/reports/primer-informe-octubre-2026.html":{"mode":"100644","oid":"f458a1a5e98c09c3fcbe0e67df15531eb6c063aa","sha256":"dee6f805eefa04dd3819006bdbb5241d01ccd6bc188d3c441d94993c9ff7d974"},"public/reports/primer-informe-octubre-2026.md":{"mode":"100644","oid":"099ce9552d83d560881feb20c367cdaedc7b2707","sha256":"7cc23fd7b4d81843a901790e62182cf27c69f25feeefee80262b178cb035e579"},"public/reports/primer-informe-octubre-2026.pdf":{"mode":"100644","oid":"d54fd767c6eb98925fe47c0bb6a26889809027f1","sha256":"6a7742587bdbd506c774514417c79430f03d59b40eaac5eec96c556571e94da8"},"scripts/render-report-pdf.py":{"mode":"100644","oid":"d7aac11501190cf717485c02591b10c6aa8b6558","sha256":"3ee8746cdedb69d66a321118ef27b588d8bdb80a6cc343a5703035d923243d70"},"scripts/report-validation.test.mts":{"mode":"100644","oid":"5b553c355fefed669ed6ef9266614b09ef261804","sha256":"3fedb9a3215c8d08b6002a25d4c1e79bfc7c39188d6466a35dac63b5bd53bd62"},"scripts/reports.mts":{"mode":"100644","oid":"98768c5be58583b9107f924f8fa3d119ceda339d","sha256":"0987482b824b8cb6cc3694133b26cad3adad1fafed2744c94fd36ae9a0d66cae"}}};
const currentProductionDigest = 'a36676c566e21bd879ff0d2c52e938bf6cad52f2bf48977ab636d1c29ae85ad0';
const readProduction = (commit: string, file: string) => {
  assert.equal(commit, currentProduction.production_commit);
  assert(Object.hasOwn(currentProduction.reports, file));
  return execFileSync('git',['show',`${commit}:${file}`],{maxBuffer:32*1024*1024});
};
function verifyCurrentProduction(read = readCurrent, productionRead = readProduction, generation = currentProduction) {
  assert.equal(digest(JSON.stringify(generation)), currentProductionDigest);
  for (const entry of generation.commits) {
    const raw=execFileSync('git',['cat-file','commit',entry.commit]);
    assert.equal(digest(raw),entry.raw_commit_sha256);
    assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`commit ${raw.length}\0`),raw])).digest('hex'),entry.commit);
    const headers=raw.toString().split('\n\n',1)[0].split('\n');
    assert.deepEqual(headers.filter(x=>x.startsWith('parent ')).map(x=>x.slice(7)),entry.parents);
    assert.deepEqual(headers.filter(x=>x.startsWith('tree ')).map(x=>x.slice(5)),[entry.tree]);
  }
  assert.equal(generation.production_commit,'d2f20862adb13946c0fc81567184a5c87e43a091');
  assert.equal(generation.production_tree,'db17d597bc28b80a0508f9c9fd97993bf2d9f353');
  const changed=execFileSync('git',['diff','--name-only','--no-renames','-z',generation.commits[0].commit,generation.production_commit,'--']).toString().split('\0').filter(Boolean).sort();
  assert.deepEqual(changed,Object.keys(generation.reports).sort());
  for (const [file, entry] of Object.entries(generation.reports)) {
    const bytes=productionRead(generation.production_commit,file);
    assert.equal(digest(bytes),entry.sha256,file);
    assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes])).digest('hex'),entry.oid,file);
    assert.equal(execFileSync('git',['ls-tree',generation.production_commit,'--',file]).toString().split('\t')[0],`${entry.mode} blob ${entry.oid}`,file);
    assert.equal(digest(read(file)),entry.sha256,file);
  }
}

const correctedExports = new Set([
  'public/reports/manifest.json',
  'public/reports/segundo-informe-septiembre-2026.html',
  'public/reports/segundo-informe-septiembre-2026.md',
  'public/reports/segundo-informe-septiembre-2026.pdf',
]);

function verifyPreservation(value: Preservation, read = readCurrent, historicalRead = readHistorical, anchor = readCurrent(auditRoot+'baseline-hashes.json'), manifestBytes = preservationBytes, corrected = correctedExports, productionRead = readProduction, generation = currentProduction) {
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
    const expectedCurrent=entry.path==='public/reports/manifest.json' ? generation.reports['public/reports/manifest.json'].sha256 : entry.sha256;
    assert.equal(digest(read(entry.path)),expectedCurrent,entry.path);
  }
  assert.deepEqual(value.historical_files.filter(e=>Object.hasOwn(generation.reports,e.path)).map(e=>e.path),['public/reports/manifest.json']);
  verifyCurrentProduction(read,productionRead,generation);
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

const currentProductionNegatives = ['WRONG_COMMIT','WRONG_TREE','MISSING_PATH','EXTRA_PATH','WRONG_LEDGER_HASH','WRONG_SOURCE_BLOB','WRONG_CURRENT_BLOB'] as const;
for (const name of currentProductionNegatives) test(`current production authority rejects ${name}`,()=>{
  const generation=structuredClone(currentProduction);let current=readCurrent,production=readProduction;
  const corrupt=(b:Buffer)=>Buffer.concat([b,Buffer.from('corruption')]);
  switch(name){
    case 'WRONG_COMMIT':generation.production_commit='0'.repeat(40);break;
    case 'WRONG_TREE':generation.production_tree='0'.repeat(40);break;
    case 'MISSING_PATH':delete (generation.reports as Record<string,unknown>)['public/reports/manifest.json'];break;
    case 'EXTRA_PATH':(generation.reports as Record<string,unknown>)['unexpected.json']=generation.reports['public/reports/manifest.json'];break;
    case 'WRONG_LEDGER_HASH':generation.reports['public/reports/manifest.json'].sha256='0'.repeat(64);break;
    case 'WRONG_SOURCE_BLOB':production=(c,p)=>p==='public/reports/manifest.json'?corrupt(readProduction(c,p)):readProduction(c,p);break;
    case 'WRONG_CURRENT_BLOB':current=p=>p==='public/reports/manifest.json'?corrupt(readCurrent(p)):readCurrent(p);break;
  }
  assert.throws(()=>verifyPreservation(preservation,current,readHistorical,readCurrent(auditRoot+'baseline-hashes.json'),preservationBytes,correctedExports,production,generation));
});
