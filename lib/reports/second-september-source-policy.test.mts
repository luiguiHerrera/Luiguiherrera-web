import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { sourceSegments, sourcePolicyHtml, sourcePolicyMarkdown } from './report-source-links.ts';
import { secondSeptember2026Report as report, secondSeptember2026AutomaticReadings as snapshot } from './second-september-2026.ts';
import { replayBoundedV1 } from '../../scripts/second-september-bounded-replay.mjs';
const sources=report.presentation.sourceLinks;

test('bounded replay covers the deployed score branches and publishes no point estimate', async()=>{
 const replay=await replayBoundedV1();
 assert.equal(replay.enumeratedCases,6049);
 assert.equal(replay.classificationInvariant,true);
 assert.deepEqual(replay.labels,['Risk-on selectivo']);
 assert.deepEqual(replay.scoreRange,[70,77]);
 assert.equal(replay.exactHistoricalCacheProven,false);
 assert.equal(snapshot.regime.score,null);assert.equal(snapshot.regime.confidence,null);
 assert.deepEqual(snapshot.regime.reconstruction?.scoreRange,replay.scoreRange);
 assert.deepEqual(replay,JSON.parse(fs.readFileSync('public/methodology/segundo-informe-septiembre-2026-replay.json','utf8')));
 const frozen=JSON.parse(fs.readFileSync('lib/reports/snapshots/segundo-informe-septiembre-2026/automatic.json','utf8'));
 const view=structuredClone(snapshot);view.regime=frozen.regime;view.sourceNote=frozen.sourceNote;view.dispersionUnit=frozen.dispersionUnit;
 assert.deepEqual(view,frozen,'All numeric data outside the authorized regime view stay frozen');
});
test('citations disambiguate publishers; private material remains unlinked; matching preserves text',()=>{
 for(const [text,id] of [['Goldman Sachs Research [B18]','B18'],['Goldman [B13]','B13'],['Ryan Detrick / Carson [B20]','B20'],['FRED/BIS [B5]','B5']]) {
  const result=sourceSegments(text,sources);assert.equal(result[0].sourceId,id);assert.equal(result.map(s=>s.text).join(''),text);
 }
 for(const text of ['BofA FMS [A1]','Alianza Research / Alianza Valores y Felipe Campos [A3]','J.P. Morgan [A2]']) assert(sourceSegments(text,sources).every(s=>!s.href));
 assert.equal(sourceSegments('FedEx no es la Fed.',sources).filter(s=>s.href).length,1);
 const entries=report.sourceGroups.flatMap(g=>g.entries);
 for(const source of sources) {
  const entry=entries.find(e=>e.label.startsWith(`[${source.id}]`));assert(entry,source.id);assert.equal(source.href,entry.href);
 }
 assert.equal(report.sourceGroups.filter(g=>g.title.startsWith('B.')).length,1);
});
test('export links keep safe targets, valid display text, escaped attributes and source parity',()=>{
 const canonical='https://www.luiguiherrera.com/informes/'+report.id;
 const html=sourcePolicyHtml('<html><head><title>Fed</title></head><body><p>Fed &amp; AAII [B3].</p><a href="#oro" target="_self">Fed</a><a href="/dashboard">Dashboard</a></body></html>',sources,canonical);
 assert(html.includes('<title>Fed</title>'));assert(html.includes(`href="${canonical}#oro" target="_blank" rel="noopener noreferrer"`));
 assert(!html.includes('target="_self"'));assert(!/<a[^>]*>[^<]*<a/.test(html));assert(html.includes('&amp;'));
 const paragraphs=sourcePolicyMarkdown('Goldman sobre beneficios [B13].\n\nGoldman sobre yields [B18].',sources,canonical);
 assert(paragraphs.includes('[Goldman](https://www.goldmansachs.com/insights/articles/can-the-s-and-p-500-rally-as-treasury-yields-rise) sobre yields'));
 const md=sourcePolicyMarkdown('Goldman [B18]. [Ya enlazado](https://example.com/Goldman) · ![Fed](https://example.com/Fed.png)',sources,canonical);
 assert(md.includes('[Goldman](https://www.goldmansachs.com/insights/articles/can-the-s-and-p-500-rally-as-treasury-yields-rise)'));
 assert(md.includes('[Ya enlazado](https://example.com/Goldman)'));assert(md.includes('![Fed](https://example.com/Fed.png)'));
 for(const ext of ['html','md']) {const text=fs.readFileSync(`public/reports/${report.id}.${ext}`,'utf8');for(const s of sources.filter(s=>s.href)) assert(text.includes(s.href!),`${ext}:${s.id}`);}
});
