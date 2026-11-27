import { flowMagnitudeReferences } from './flow-magnitude.ts';
import { createHash } from 'node:crypto';
import { parseStateStreetNav } from '../../scripts/research/sp500-etf-flows-preview.mjs';
import { aggregateFundFlows, buildFundFlows } from './sp500-etf-flows.mjs';
import { compareFlowWindow } from './capital-flow-comparison.mjs';
import { isClosed, isSession, sessionDates } from '../research/mcclellan-core.mjs';

export const CAPITAL_FLOW_IDS = ['sp500', 'gold', 'btc'];
export const CAPITAL_FLOW_SOURCES = {
  sp500: { ticker: 'SPY', url: 'https://www.ssga.com/library-content/products/fund-data/etfs/us/navhist-us-en-spy.xlsx' },
  gold: { ticker: 'GLD', url: 'https://www.ssga.com/library-content/products/fund-data/etfs/us/navhist-us-en-gld.xlsx' },
  btc: { url: 'https://www.tftc.io/bitcoin-etf-flows', download: 'https://www.tftc.io/bitcoin-etf-flows/data.json' },
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

export function parsePublishedBtcDataset(data, asOf) {
  if (data?.name !== 'US Spot Bitcoin ETF Daily Flows' || data.url !== CAPITAL_FLOW_SOURCES.btc.url ||
      data.license !== 'https://creativecommons.org/licenses/by/4.0/' || data.units !== 'USD' || !Array.isArray(data.days)) {
    throw new CapitalFlowSourceError('BTC dataset identity, units or license changed');
  }
  const rows = new Map(), vehicles = new Set(), referenceUniverses = {};
  let previous = '';
  for (const row of data.days) {
    if (typeof row.date !== 'string' || row.date <= previous) throw new CapitalFlowSourceError('Unordered or duplicate BTC date');
    previous = row.date;
    if (!isSession(row.date) || !isClosed(row.date, asOf)) continue;
    const parts = row.perEtfUsd;
    const members = parts && typeof parts === 'object' && !Array.isArray(parts) ? Object.entries(parts) : [];
    if (!Number.isFinite(row.netFlowUsd)) continue;
    if (members.length) {
      if (members.some(([ticker, value]) => !/^[A-Z0-9]{2,8}$/.test(ticker) || !Number.isFinite(value))) {
        throw new CapitalFlowSourceError('Incomplete BTC fund reports');
      }
      if (Math.abs(members.reduce((sum, [, value]) => sum + value, 0) - row.netFlowUsd) > 0.01) {
        throw new CapitalFlowSourceError('BTC total does not reconcile with published fund sum');
      }
      for (const [ticker] of members) vehicles.add(ticker);
    } else {
      // No breakdown + zero is an unreported/holiday placeholder, not an observed zero.
      if (row.netFlowUsd === 0) continue;
      if (!Number.isFinite(row.vendorNetFlowUsd) || Math.abs(row.vendorNetFlowUsd - row.netFlowUsd) > 0.01) {
        throw new CapitalFlowSourceError('Unverified BTC aggregate without fund breakdown');
      }
    }
    if(members.length) referenceUniverses[row.date]=members.map(([ticker])=>ticker).sort();
    rows.set(row.date, { date: row.date, flow: row.netFlowUsd, complete: true, funds: [] });
  }
  const dates = [...rows.keys()];
  const cutoffDate = dates.at(-1) ?? null;
  if (!cutoffDate || data.updatedThrough !== cutoffDate) throw new CapitalFlowSourceError('BTC effective date does not match validated history');
  const points = sessionDates(dates[0], cutoffDate).map(date => rows.get(date) ?? { date, flow: null, complete: false, funds: [] });
  return { points, cutoffDate, vehicles: [...vehicles].sort(), referenceUniverses, comparisonUniverse: referenceUniverses[cutoffDate] ?? [] };
}

export async function buildCapitalFlowModel(id, bytes, asOf = new Date().toISOString()) {
  if (!CAPITAL_FLOW_IDS.includes(id)) throw new CapitalFlowSourceError('Unknown asset');
  let model;
  if (id === 'btc') {
    const parsed = parsePublishedBtcDataset(JSON.parse(bytes.toString('utf8')), asOf);
    model = { id, title: 'Flujos ETFs de BTC', eyebrow: 'Bitcoin', kind: 'published', metricBasis: 'daily-sum',
      description: 'Flujos netos publicados de ETF spot de Bitcoin de Estados Unidos.',
      points: parsed.points, referenceUniverses:parsed.referenceUniverses, comparisonUniverse:parsed.comparisonUniverse, cutoffDate: parsed.points.at(-1)?.date ?? null, vehicles: parsed.vehicles,
      sources: [{ name: 'The Commoner Bitcoin ETF Tracker by TFTC', url: CAPITAL_FLOW_SOURCES.btc.url },
        { name: 'Licencia CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
        { name: 'Metodología del proveedor', url: 'https://www.tftc.io/bitcoin-etf-flows/methodology' }],
      notes: ['Serie completa de The Commoner Bitcoin ETF Tracker by TFTC, bajo CC BY 4.0. Ventanas, promedios y observaciones calculados por luiguiherrera.com.',
        'Se utiliza netFlowUsd, en USD, que suma las contribuciones publicadas; cuando no hay desglose, el proveedor utiliza su agregado. No se sustituye por vendorNetFlowUsd ni se empalma con el anterior corte de Farside.',
        'TFTC combina su histórico de Farside con informes recientes de SoSoValue y puede revisar las cifras. El conjunto de ETF cambia con sus fechas de lanzamiento.',
        'Se comprueban unidades, calendario, totales y contribuciones. Una fila sin informes no se convierte en flujo cero.'],
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
  const magnitudeReferences=flowMagnitudeReferences(model);
  const safe = { ...model };
  delete safe.observations;
  delete safe.referenceUniverses;
  return { ...safe, points, comparisons, magnitudeReferences, refreshMode: 'automatic', retrievedAt: asOf,
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

export async function fetchCapitalFlowSource(id, { fetcher = fetch, asOf = new Date().toISOString(), minimumCutoffDate } = {}) {
  try {
    const source = CAPITAL_FLOW_SOURCES[id];
    if (!source) throw new CapitalFlowSourceError('Unknown asset');
    const response = await fetcher(source.download ?? source.url, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(18000),
      headers: { 'User-Agent': 'LuiguiHerreraDashboard/1.0 (+https://www.luiguiherrera.com)', Accept: id === 'btc' ? 'application/json' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } });
    const bytes = await boundedBytes(response);
    const model = await buildCapitalFlowModel(id, bytes, asOf);
    // SPY can publish a valid, delayed close. Its retained publication supplies
    // the date floor; freshness is reported separately by the public getter.
    if (id === 'sp500') {
      if (minimumCutoffDate && model.cutoffDate < minimumCutoffDate) {
        throw new CapitalFlowSourceError('SPY source cutoff moved backwards');
      }
    } else if (model.cutoffDate < latestClosedFlowSession(asOf)) {
      throw new CapitalFlowSourceError('Latest closed session not published');
    }
    return model;
  } catch (error) {
    if (error instanceof CapitalFlowSourceError || error instanceof Error && 'digest' in error) throw error;
    throw new CapitalFlowSourceError(`Invalid or unavailable flow source: ${error instanceof Error ? error.message : 'unknown error'}`, { cause: error });
  }
}

