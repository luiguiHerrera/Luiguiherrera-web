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
    assert(text.includes('Régimen V1 no publicado'));
    assert(!text.includes('No publicada'));
  }
});

test('corrective release preserves all editorial content except approved presentation metadata and destinations', () => {
  const baseline = JSON.parse(fs.readFileSync(auditRoot+'editorial-baseline.json','utf8'));
  const repaired = structuredClone(report) as typeof baseline;
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
  assert.deepEqual(b[0].entries.map(e=>e.label.match(/^\[B(\d+)\]/)?.[1]).filter(Boolean),Array.from({length:20},(_,i)=>String(i+1)));
  assert.equal(b[0].entries.length,21); // Preserve the already published supplementary BOJ reference.
});

test('all frozen data, archived downloads and ICS remain byte-identical to production', () => {
  const hashes = JSON.parse(fs.readFileSync(auditRoot+'baseline-hashes.json','utf8'));
  const permitted = new Set(['public/reports/manifest.json',...['html','md','pdf'].map(ext=>`public/reports/${report.id}.${ext}`)]);
  for (const [file, hash] of Object.entries(hashes)) {
    if (!permitted.has(file)) assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,file);
  }
});
