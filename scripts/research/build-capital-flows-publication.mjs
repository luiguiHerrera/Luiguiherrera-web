// Build an explicit, dated publication from validated local inputs. No provider scraping.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { compareFlowWindow } from '../../lib/dashboard/capital-flow-comparison.mjs';
import { interpretFlows } from '../../lib/dashboard/sp500-etf-flows.mjs';

const sp = JSON.parse(await fs.readFile(process.argv[2] ?? '/tmp/sp500-etf-flows-preview/data.json','utf8'));
const other = JSON.parse(await fs.readFile(process.argv[3] ?? '/tmp/flows-capital-preview/data.json','utf8'));
const models = [{
  id:'sp500',title:'Flujos ETFs de S&P500',eyebrow:'Renta variable estadounidense',
  description:'Creaciones y reembolsos netos estimados en ETF que replican el S&P 500.',
  points:sp.points,cutoffDate:sp.cutoffDate,metricBasis:'daily-sum',kind:'estimated',vehicles:sp.included,
  sources:sp.funds.map(fund=>({name:fund.issuer,url:fund.url})),
  notes:['Se agregan SPY e IVV únicamente en fechas compatibles y completas. VOO continúa excluido hasta validar su histórico conjunto y el efecto de conversiones entre clases.',
    'Los acumulados suman flujos diarios, cada uno valorado al NAV de su sesión. Las creaciones y reembolsos pueden realizarse en especie; no equivalen necesariamente a efectivo nuevo.'],
},...other];
const published = models.map(model=>{
  assert.ok(model.cutoffDate && model.points.at(-1)?.date===model.cutoffDate);
  assert.ok(model.points.length>=400);
  const comparisons=[1,5,20].map(sessions=>({sessions,...compareFlowWindow(model.points,sessions,model.metricBasis==='ending-nav'?model.observations:undefined)}));
  assert.ok(comparisons.every(metric=>metric.current!=null && metric.average!=null && metric.samples===252));
  const points=model.points.slice(-400).map(point=>({date:point.date,flow:point.flow,complete:point.complete,funds:[]}));
  for(const sessions of [5,20,60]) assert.deepEqual(interpretFlows(points,sessions),interpretFlows(model.points,sessions));
  const {observations,...safe}=model;
  return {...safe,points,comparisons,refreshMode:'snapshot',notes:model.notes.map(note=>note
    .replace('Este preview utiliza exclusivamente','Se utiliza exclusivamente')
    .replace(' No se han modificado los cálculos operativos existentes.',''))};
});
await fs.writeFile('lib/dashboard/capital-flows-published.json',JSON.stringify(published));
console.log(published.map(model=>({asset:model.id,cutoff:model.cutoffDate,points:model.points.length,comparisons:model.comparisons})));
