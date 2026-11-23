// Local development only. No production data, jobs, credentials, cookies or challenge bypass.
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { buildEthFlowPreview, ETH_FLOW_SOURCE } from '../../lib/dashboard/eth-etf-flows-preview.mjs';

export const ETH_PREVIEW_FILE = '/tmp/eth-etf-flows-preview/source.json';
export function extractEthRows(html) {
  if (!/Ethereum ETF Flow[\s\S]{0,100}US\$m/i.test(html)) throw new Error('Unexpected ETH document or units');
  const decode = text => text.replace(/<[^>]+>/g, '').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').trim();
  const tables = [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(table => [...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row => [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell => decode(cell[1]))));
  const rows = tables.find(rows => rows.some(row => row.includes('ETHA') && row.at(-1) === 'Total'));
  if (!rows) throw new Error('ETH table absent; no bypass attempted');
  return rows;
}
export async function refreshEthPreview() {
  const response = await fetch(ETH_FLOW_SOURCE, { cache:'no-store', redirect:'error', signal:AbortSignal.timeout(8000), headers:{ 'User-Agent':'LuiguiHerrera-LocalResearch/1.0', Accept:'text/html' } });
  if (!response.ok) throw new Error(`Source HTTP ${response.status}; no bypass attempted`);
  if (!(response.headers.get('content-type') ?? '').includes('text/html')) throw new Error('Unexpected ETH response type');
  const chunks = []; let size = 0;
  if (!response.body) throw new Error('Empty ETH response');
  for await (const chunk of response.body) { size += chunk.length; if (size > 2_000_000) { await response.body.cancel().catch(() => {}); throw new Error('ETH response too large'); } chunks.push(chunk); }
  const snapshot = { source:ETH_FLOW_SOURCE, units:'USD millions', retrievedAt:new Date().toISOString(), rows:extractEthRows(Buffer.concat(chunks).toString('utf8')) };
  const model = buildEthFlowPreview(snapshot);
  if (!model.cutoffDate) throw new Error('No fully covered ETH close');
  let previous = null;
  try { previous = buildEthFlowPreview(JSON.parse(await readFile(ETH_PREVIEW_FILE, 'utf8'))); } catch { /* No prior validated cut. */ }
  if (previous?.cutoffDate && model.cutoffDate < previous.cutoffDate) throw new Error('ETH source regressed; keeping local cut');
  await mkdir('/tmp/eth-etf-flows-preview', { recursive:true });
  await writeFile(`${ETH_PREVIEW_FILE}.next`, JSON.stringify(snapshot));
  await rename(`${ETH_PREVIEW_FILE}.next`, ETH_PREVIEW_FILE);
  return model;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { const model = await refreshEthPreview(); console.log(JSON.stringify({ cutoff:model.cutoffDate, sessions:model.points.length, funds:model.vehicles })); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
