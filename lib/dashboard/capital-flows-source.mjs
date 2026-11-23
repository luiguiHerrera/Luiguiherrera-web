import { createHash } from 'node:crypto';
import { parseStateStreetNav } from '../../scripts/research/sp500-etf-flows-preview.mjs';
import { aggregateFundFlows, buildFundFlows } from './sp500-etf-flows.mjs';
import { compareFlowWindow, parsePublishedBtcRows } from './capital-flow-comparison.mjs';
import { isClosed } from '../research/mcclellan-core.mjs';

export const CAPITAL_FLOW_IDS = ['sp500', 'gold', 'btc'];
export const CAPITAL_FLOW_SOURCES = {
  sp500: { ticker: 'SPY', url: 'https://www.ssga.com/library-content/products/fund-data/etfs/us/navhist-us-en-spy.xlsx' },
  gold: { ticker: 'GLD', url: 'https://www.ssga.com/library-content/products/fund-data/etfs/us/navhist-us-en-gld.xlsx' },
  btc: { url: 'https://farside.co.uk/bitcoin-etf-flow-all-data/' },
};
export class CapitalFlowSourceError extends Error {}

export function latestClosedFlowSession(asOf = new Date().toISOString()) {
  if (!Number.isFinite(Date.parse(asOf))) throw new CapitalFlowSourceError('Invalid acquisition instant');
  const nyDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(asOf));
  for (let day = new Date(`${nyDate}T12:00Z`), i = 0; i < 14; i++, day.setUTCDate(day.getUTCDate() - 1)) {
    const date = day.toISOString().slice(0, 10);
    if (isClosed(date, asOf)) return date;
  }
  throw new CapitalFlowSourceError('No supported closed session');
}

export function parseFarsideHistory(html) {
  const plain = value => value.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&minus;|&#8722;|&ndash;|&mdash;/g, '-').replace(/\s+/g, ' ').trim();
  const tables = [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(table =>
    [...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row =>
      [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell => plain(cell[1]))));
  const matching = tables.filter(rows => rows.some(row => row[0] === 'Date' && row.at(-1) === 'Total' && row.includes('IBIT') && row.includes('GBTC')));
  if (matching.length !== 1) throw new CapitalFlowSourceError('BTC archive schema changed');
  return matching[0];
}

export async function buildCapitalFlowModel(id, bytes, asOf = new Date().toISOString()) {
  if (!CAPITAL_FLOW_IDS.includes(id)) throw new CapitalFlowSourceError('Unknown asset');
  let model;
  if (id === 'btc') {
    const parsed = parsePublishedBtcRows(parseFarsideHistory(bytes.toString('utf8')), asOf);
    model = { id, title: 'Flujos ETFs de BTC', eyebrow: 'Bitcoin', kind: 'published', metricBasis: 'daily-sum',
      description: 'Flujos netos publicados de ETF spot de Bitcoin de Estados Unidos.',
      points: parsed.points, cutoffDate: parsed.points.at(-1)?.date ?? null, vehicles: parsed.vehicles,
      sources: [{ name: 'Farside Investors · histórico completo', url: CAPITAL_FLOW_SOURCES.btc.url }],
      notes: ['Se utiliza exclusivamente el archivo completo de Farside; no se mezclan cifras de distintas fuentes.',
        'Los importes son totales diarios publicados en millones de USD, convertidos a USD. Los guiones no se convierten en cero y se comprueba el redondeo del total.',
        'El conjunto de ETF cambia con sus fechas de lanzamiento. Las cifras pueden revisarse.'],
    };
  } else {
    const ticker = CAPITAL_FLOW_SOURCES[id].ticker;
    const fund = buildFundFlows(ticker, await parseStateStreetNav(bytes, ticker), { asOf });
    const aggregate = aggregateFundFlows([fund], [ticker]);
    model = { id, title: id === 'gold' ? 'Flujos ETFs de Oro' : 'Flujos ETFs de S&P500',
      eyebrow: id === 'gold' ? 'Oro' : 'Renta variable estadounidense', kind: 'estimated',
      metricBasis: id === 'gold' ? 'ending-nav' : 'daily-sum',
      description: id === 'gold' ? 'Estimación de creaciones y reembolsos netos en ETF de oro.' : 'Creaciones y reembolsos netos estimados en ETF que replican el S&P 500.',
      points: aggregate.points, cutoffDate: aggregate.cutoffDate, vehicles: [ticker],
      observations: id === 'gold' ? fund.points : undefined,
      sources: [{ name: id === 'gold' ? 'State Street · SPDR Gold Shares' : 'State Street · SPDR S&P 500 ETF Trust', url: CAPITAL_FLOW_SOURCES[id].url }],
      notes: id === 'gold' ? [
        'El universo de este proxy es GLD. No representa todos los vehículos de inversión en oro.',
        'Los valores principales conservan la convención del proxy existente: cambio de participaciones de cada periodo valorado al NAV de su última sesión. El promedio utiliza la misma convención.',
        'El gráfico muestra flujos diarios, cada uno a su NAV; su suma puede diferir del importe implícito de 5D o 20D.',
      ] : [
        'Universo fijo SPY en toda la serie. IVV se excluye del proceso automático por las restricciones de acceso de BlackRock; VOO permanece excluido hasta validar su histórico y las conversiones entre clases. No se empalma esta serie con el anterior agregado SPY + IVV.',
        'Los acumulados suman flujos diarios, cada uno valorado al NAV de su sesión. Las creaciones y reembolsos pueden realizarse en especie; no equivalen necesariamente a efectivo nuevo.',
      ],
    };
  }
  const comparisons = [1, 5, 20].map(sessions => ({ sessions, ...compareFlowWindow(model.points, sessions, model.observations) }));
  const points = model.points.slice(-400).map(({ date, flow, complete }) => ({ date, flow, complete, funds: [] }));
  if (points.length < 400 || points.some(point => !point.complete || !Number.isFinite(point.flow)) ||
      comparisons.some(metric => metric.current == null || metric.average == null || metric.samples !== 252)) {
    throw new CapitalFlowSourceError('Incomplete flow history or calibration');
  }
  const { observations, ...safe } = model;
  return { ...safe, points, comparisons, refreshMode: 'automatic', retrievedAt: asOf,
    sourceHash: createHash('sha256').update(bytes).digest('hex') };
}

async function boundedBytes(response) {
  if (!response.ok || !response.body) throw new CapitalFlowSourceError(`Source HTTP ${response.status}`);
  const max = 12_000_000;
  if (Number(response.headers.get('content-length')) > max) throw new CapitalFlowSourceError('Source too large');
  const reader = response.body.getReader(), chunks = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > max) throw new CapitalFlowSourceError('Source too large');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  if (!length) throw new CapitalFlowSourceError('Empty source');
  return Buffer.concat(chunks);
}

export async function fetchCapitalFlowSource(id, { fetcher = fetch, asOf = new Date().toISOString() } = {}) {
  try {
    const source = CAPITAL_FLOW_SOURCES[id];
    if (!source) throw new CapitalFlowSourceError('Unknown asset');
    const response = await fetcher(source.url, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(18000),
      headers: { 'User-Agent': 'LuiguiHerreraDashboard/1.0 (+https://www.luiguiherrera.com)', Accept: id === 'btc' ? 'text/html' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } });
    const model = await buildCapitalFlowModel(id, await boundedBytes(response), asOf);
    // An old, truncated or partial candidate cannot replace a successful cache entry.
    if (model.cutoffDate < latestClosedFlowSession(asOf)) throw new CapitalFlowSourceError('Latest closed session not published');
    return model;
  } catch (error) {
    if (error instanceof CapitalFlowSourceError || error instanceof Error && 'digest' in error) throw error;
    throw new CapitalFlowSourceError(`Invalid or unavailable flow source: ${error instanceof Error ? error.message : 'unknown error'}`, { cause: error });
  }
}
