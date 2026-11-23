import 'server-only';
import { readFile } from 'node:fs/promises';
import { buildEthFlowPreview, ETH_FLOW_SOURCE, ETH_FLOW_FUNDS } from './eth-etf-flows-preview.mjs';
import { ETH_PREVIEW_FILE, refreshEthPreview } from '@/scripts/research/eth-etf-flows-preview.mjs';
import type { CapitalFlowAssetPreview } from './capital-flows-preview-types';

let nextAttempt = 0;
export async function getEthFlowsPreview(): Promise<CapitalFlowAssetPreview> {
  if (process.env.NODE_ENV !== 'development') throw new Error('ETH research is development-only');
  let model: CapitalFlowAssetPreview | null = null;
  try { model = buildEthFlowPreview(JSON.parse(await readFile(ETH_PREVIEW_FILE, 'utf8'))); } catch { /* Render unavailable; never synthesize market figures. */ }
  const now = Date.now();
  if ((!model?.retrievedAt || now - Date.parse(model.retrievedAt) > 3600_000) && now > nextAttempt) {
    nextAttempt = now + 3600_000;
    try { model = await refreshEthPreview(); }
    catch { if (model) model.lastRefreshError = 'La consulta automática local no devolvió un corte válido. Se conserva el corte importado con su fecha original.'; }
  }
  return model ?? { id:'eth', title:'Ethereum · Flujos de ETF', eyebrow:'ETHEREUM · ETF SPOT ESTADOUNIDENSES', description:'Datos no disponibles: falta un corte real validado de la fuente.', cutoffDate:null, points:[], metricBasis:'daily-sum', kind:'published', refreshMode:'snapshot', vehicles:ETH_FLOW_FUNDS, sources:[{name:'Farside Investors',url:ETH_FLOW_SOURCE}], notes:['No se muestran cifras de mercado hasta disponer de un corte verificado.'] };
}
