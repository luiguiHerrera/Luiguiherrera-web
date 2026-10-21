import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { secondOctober2026Report as report } from './second-october-2026.ts';
import { firstOctober2026Report } from './first-october-2026.ts';
import { activeMarketReport, getMarketReportBySlug, getAdjacentReports, marketReports } from './market-reports.ts';
import { buildReportExportModel } from './report-export-model.ts';
import { getHistoricalAutomaticReadings } from './historical-automatic-readings.ts';
const sourcePath='docs/reports/segundo-informe-octubre-2026/approved.md';
const source=fs.readFileSync(sourcePath,'utf8');
const clean=(value:string)=>value.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,'$1').replace(/\*\*/g,'').replace(/\*/g,'').replace(/Esta edición no incorpora/g,'Este borrador no incorpora').replace(/\s+/g,' ').trim();
test('approved author source and all body paragraphs are preserved',()=>{
 assert.equal(createHash('sha256').update(source).digest('hex'),'378efba156f633aa54bef5f4a8fafebab0635072d446e2cbc6db0ba21b0d4ab4');
 const values=report.editorialSections!.flatMap(s=>[s.title,...s.blocks.flatMap(b=>b.kind==='table'?[...b.headers,...b.rows.flat()]:[b.text])]).map(clean);
 for(const paragraph of source.split(/\n\s*\n/).slice(2)){
  if(!paragraph.trim() || paragraph.startsWith('**Por '))continue;
  if(paragraph.startsWith('|')){
   for(const row of paragraph.split('\n').filter(l=>l.startsWith('|')&&!/^\|[- :|]+\|$/.test(l)))for(const cell of row.slice(1,-1).split('|'))assert(values.some(v=>v===clean(cell)),`Missing table cell: ${cell}`);
  } else if(paragraph.startsWith('- [M')){
   for(const line of paragraph.split('\n'))assert(values.includes(clean(line.replace(/^- /,''))),`Missing source: ${line.slice(0,80)}`);
  } else assert(values.includes(clean(paragraph.replace(/^#{2,3} /,''))),`Missing paragraph: ${paragraph.slice(0,80)}`);
 }
 assert.match(source,/La pregunta que me ocupa/);
});
test('one current report; first October historical content stays unchanged',()=>{
 assert.equal(activeMarketReport.id,report.id);
 assert.equal(marketReports.filter(r=>r.status==='actual').length,1);
 assert.deepEqual(getMarketReportBySlug(firstOctober2026Report.id),{...firstOctober2026Report,status:'archivado'});
 assert.equal(getAdjacentReports(report.id).previousReport?.id,firstOctober2026Report.id);
 assert.equal(getAdjacentReports(report.id).nextReport,null);
});
test('native report has seven supported sections, four tables and no fabricated SL state',()=>{
 assert.equal(report.editorialSections!.length,7);
 assert.equal(report.editorialSections!.flatMap(s=>s.blocks).filter(b=>b.kind==='table').length,4);
 assert.equal(getHistoricalAutomaticReadings(report.id),null);
 assert(report.assetReadings.every(asset=>!asset.quantitativePanels?.length));
 assert.equal(report.marketClose,undefined);
 assert(report.editorialSections!.flatMap(s=>s.blocks).some(b=>'text' in b && b.text.includes('no incorpora')));
 const component=fs.readFileSync('components/reports/ReportEditorialSections.tsx','utf8');
 for(const token of ['ReportSection','ReportQuantitativePanels','ReportParagraph'])assert(component.includes(token));
 assert(!/<iframe|<object|<embed|dangerouslySetInnerHTML/.test(component));
 const shared=fs.readFileSync('components/reports/MarketReportContent.tsx','utf8');
 assert(shared.includes('<ReportEditorialSections sections={report.editorialSections} />'));
 assert(!shared.includes('approved.html'));
});
test('publication date is distinct from unchanged editorial and market cutoffs',()=>{
 assert.equal(report.publishedAt,'2026-10-21');
 assert.equal(report.editorialCutoffAt,'2026-10-19');
 assert.equal(report.automaticDataCutoffAt,'2026-10-16');
 const model=buildReportExportModel(report);
 assert.equal(model.canonicalUrl,'https://www.luiguiherrera.com/informes/segundo-informe-octubre-2026');
 assert.equal(model.sections.length,7);
 assert.equal(model.events.length,5);
 assert(model.sections.every(s=>s.kind==='editorial'));
 assert.equal(model.approvedPdf?.sha256,'0ca850a7d7986fb7e501e970376d63eb86dcfb7271ac343f57aa5e8fb4171052');
});
