import { createHash } from 'node:crypto';
import { isClosed, isSession, sessionDates } from '../research/mcclellan-core.mjs';
import { compareFlowWindow } from './capital-flow-comparison.mjs';
import { interpretFlows } from './sp500-etf-flows.mjs';

export const EWJ_FLOW_SOURCE = 'https://etfiq.com/data/flows/funds/ewj.json';
export const EWJ_FLOW_PAGE = 'https://etfiq.com/funds/ewj';
export const EWJ_FLOW_METHODOLOGY = 'https://etfiq.com/methodology/flows';
export const EWJ_FLOW_LICENSE = 'https://etfiq.com/license/';
export const EWJ_FLOW_METHOD = 'etfiq-previous-nav-v1';
const MAX_BYTES = 4_000_000;

export class EwjFlowSourceError extends Error {}
function requireValue(value, message) {
  if (!value) throw new EwjFlowSourceError(`EWJ: ${message}`);
}
function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}
function previousSession(date) {
  const day = new Date(`${date}T12:00:00Z`);
  for (let i = 0; i < 14; i++) {
    day.setUTCDate(day.getUTCDate() - 1);
    const previous = day.toISOString().slice(0, 10);
    if (isSession(previous)) return previous;
  }
  throw new EwjFlowSourceError('EWJ: previous session unavailable');
}

/** Read only the provider's daily computed flows. Its monthly N-PORT figures,
 * stated NAV, shares and net-assets fields never enter the published model. */
export function parseEwjFundFeed(data, asOf = new Date().toISOString()) {
  requireValue(Number.isFinite(Date.parse(asOf)), 'invalid acquisition instant');
  const cite = data?.cite;
  requireValue(data?.schemaVersion === 3 && data.ticker === 'EWJ' && data.seriesId === 'S000004249'
    && data.issuer === 'iShares' && data.coverage === 'daily', 'identity or daily schema changed');
  requireValue(cite?.publisher === 'ETFIQ' && cite.page === EWJ_FLOW_PAGE && cite.methodology === EWJ_FLOW_METHODOLOGY
    && cite.class === 'ETFIQ-computed' && cite.license === EWJ_FLOW_LICENSE, 'source attribution or license changed');
  requireValue(validDate(data.asOf) && cite.as_of === data.asOf && Array.isArray(data.daily) && data.daily.length > 0,
    'missing dated daily history');
  requireValue(Array.isArray(data.heartbeats) && data.heartbeats.length === 0
    && Array.isArray(data.splits) && data.splits.length === 0, 'unreviewed heartbeat or split flag');
  const points = [];
  let previous = '';
  for (const row of data.daily) {
    requireValue(validDate(row?.d) && row.d > previous && isSession(row.d) && isClosed(row.d, asOf),
      'duplicate, unordered, non-session or unclosed daily date');
    requireValue(validDate(row.navDate) && row.navDate === previousSession(row.d), 'NAV date is not the prior US session');
    requireValue(row.src === 'history' && row.house === 'iShares', 'daily source or issuer changed');
    requireValue(row.flow === null || typeof row.flow === 'number' && Number.isFinite(row.flow), 'invalid USD flow');
    const complete = row.flow !== null;
    points.push({ date: row.d, flow: row.flow, complete, funds: [] });
    previous = row.d;
  }
  requireValue(data.asOf === points.at(-1).date, 'effective date does not match daily history');
  requireValue(data.windows === undefined || data.windows && typeof data.windows === 'object' && !Array.isArray(data.windows),
    'invalid window metadata');
  const byDate = new Map(points.map(point => [point.date, point]));
  for (const key of ['1D', '1W']) {
    const metric = data.windows?.[key];
    if (metric === undefined) continue;
    requireValue(metric && validDate(metric.from) && validDate(metric.to) && metric.to === data.asOf
      && metric.from <= metric.to && Number.isSafeInteger(metric.days) && metric.days > 0
      && metric.days === metric.of && Number.isFinite(metric.flow), `${key} window metadata changed`);
    requireValue(metric.heartbeat === undefined || metric.heartbeat === 0, `${key} contains unreviewed heartbeat`);
    const dates = sessionDates(metric.from, metric.to);
    requireValue(dates.length === metric.days && (key !== '1D' || dates.length === 1), `${key} session count mismatch`);
    const window = dates.map(date => byDate.get(date));
    requireValue(window.every(point => point?.complete), `${key} contains unavailable daily observations`);
    const total = window.reduce((sum, point) => sum + point.flow, 0);
    requireValue(Math.abs(total - metric.flow) <= dates.length / 2 + 0.5, `${key} total does not reconcile`);
  }
  return points;
}

async function boundedBytes(response) {
  requireValue(response.ok && !response.redirected && response.body, `source HTTP ${response.status} or redirect`);
  requireValue((response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase() === 'application/json',
    'source is not JSON');
  const declared = response.headers.get('content-length');
  requireValue(declared === null || Number(declared) <= MAX_BYTES, 'response too large');
  const reader = response.body.getReader(), chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      requireValue(size <= MAX_BYTES, 'response too large');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  requireValue(size > 0, 'empty response');
  return Buffer.concat(chunks);
}

export async function fetchEwjFundFeed({ fetcher = fetch, asOf = new Date().toISOString() } = {}) {
  try {
    requireValue(Number.isFinite(Date.parse(asOf)), 'invalid acquisition instant');
    const response = await fetcher(EWJ_FLOW_SOURCE, { method: 'GET', cache: 'no-store', redirect: 'error',
      signal: AbortSignal.timeout(18000),
      headers: { Accept: 'application/json', 'User-Agent': 'LuiguiHerreraDashboard/1.0 (+https://www.luiguiherrera.com)' } });
    const bytes = await boundedBytes(response);
    const data = JSON.parse(bytes.toString('utf8'));
    parseEwjFundFeed(data, asOf);
    return { data, sourceHash: createHash('sha256').update(bytes).digest('hex'), retrievedAt: asOf };
  } catch (error) {
    if (error instanceof EwjFlowSourceError || error instanceof Error && 'digest' in error) throw error;
    throw new EwjFlowSourceError(`EWJ: invalid or unavailable source: ${error instanceof Error ? error.message : 'unknown error'}`, { cause: error });
  }
}

/** Dated persistent history can be clipped for archive entries. A stale feed
 * cannot erase a later valid cut; missing sessions remain explicit gaps. */
export function mergeEwjFlowHistory(previous, feed, asOf, through = '9999-12-31') {
  requireValue(validDate(through) && feed && /^[a-f0-9]{64}$/.test(feed.sourceHash ?? '')
    && Number.isFinite(Date.parse(feed.retrievedAt)), 'invalid retrieval metadata');
  requireValue(previous == null || Array.isArray(previous.points), 'invalid retained history');
  requireValue(!previous?.points.length || previous.methodology === EWJ_FLOW_METHOD, 'retained history uses another method');
  requireValue(!previous?.cutoffDate || validDate(previous.cutoffDate)
    && previous.cutoffDate === previous.points.findLast(point => point.complete)?.date, 'retained cutoff does not match history');
  requireValue(!previous?.cutoffDate || previous.cutoffDate > through || feed.data?.asOf >= previous.cutoffDate,
    'provider cutoff moved backwards');
  const fresh = parseEwjFundFeed(feed.data, asOf).filter(point => point.date <= through);
  const retained = (previous?.points ?? []).filter(point => point.date <= through);
  let previousDate = '';
  for (const point of retained) {
    requireValue(validDate(point.date) && point.date > previousDate && isSession(point.date) && isClosed(point.date, asOf),
      'invalid retained date');
    requireValue(point.flow === null ? point.complete === false : Number.isFinite(point.flow) && point.complete === true,
      'invalid retained observation');
    previousDate = point.date;
  }
  const previousCut = retained.findLast(point => point.complete)?.date ?? null;
  requireValue(!previousCut || fresh.at(-1)?.date >= previousCut, 'provider cutoff moved backwards');
  const byDate = new Map(retained.map(({ date, flow, complete }) => [date, { date, flow, complete, funds: [] }]));
  // Explicit missing revisions stay missing. They invalidate the candidate
  // model as a whole; the persistent cache retains its prior valid model.
  for (const point of fresh) byDate.set(point.date, point);
  const dates = [...byDate.keys()].sort();
  requireValue(dates.length > 0, 'no history at the archive cutoff');
  const points = sessionDates(dates[0], dates.at(-1)).map(date => byDate.get(date)
    ?? { date, flow: null, complete: false, funds: [] }).slice(-400);
  return { points, cutoffDate: points.findLast(point => point.complete)?.date ?? null,
    retrievedAt: feed.retrievedAt, sourceHash: feed.sourceHash, methodology: EWJ_FLOW_METHOD };
}

export function buildEwjAutomaticModel(previous, feed, asOf) {
  const fresh = parseEwjFundFeed(feed.data, asOf).slice(-400);
  requireValue(fresh.length === 400 && fresh.every(point => point.complete && Number.isFinite(point.flow))
    && sessionDates(fresh[0].date, fresh.at(-1).date).length === 400,
  'fresh 400 complete contiguous daily flow sessions are required');
  const history = mergeEwjFlowHistory(previous, feed, asOf);
  const points = history.points;
  requireValue(points.length === 400 && points.every(point => point.complete && Number.isFinite(point.flow)),
    '400 complete daily flow sessions are required');
  const comparisons = [1, 5, 20].map(sessions => ({ sessions, ...compareFlowWindow(points, sessions) }));
  requireValue(comparisons.every(metric => Number.isFinite(metric.current) && Number.isFinite(metric.average) && metric.samples === 252),
    '252 prior comparison windows are required');
  return {
    id: 'ewj', title: 'Japón · Flujos de EWJ', eyebrow: 'RENTA VARIABLE JAPONESA',
    description: 'Flujos netos diarios de EWJ calculados y publicados por ETFIQ, expresados en USD.',
    kind: 'published', metricBasis: 'daily-sum', cutoffDate: history.cutoffDate, points,
    vehicles: ['EWJ'], comparisons,
    interpretations: Object.fromEntries([5, 20, 60].map(window => [window, interpretFlows(points, window)])),
    refreshMode: 'automatic', retrievedAt: history.retrievedAt, sourceHash: history.sourceHash, methodology: EWJ_FLOW_METHOD,
    sources: [{ name: 'ETFIQ · Flujos de EWJ', url: EWJ_FLOW_PAGE },
      { name: 'ETFIQ · Metodología', url: EWJ_FLOW_METHODOLOGY },
      { name: 'ETFIQ · Licencia de reutilización', url: EWJ_FLOW_LICENSE }],
    notes: [
      'Universo fijo EWJ, ETF estadounidense de renta variable japonesa. Sus flujos no representan todos los vehículos ni el total de capital hacia Japón; las creaciones y los reembolsos pueden realizarse en especie.',
      'ETFIQ calcula el cambio entre dos recuentos de participaciones multiplicado por el NAV del recuento anterior y lo fecha en el día del recuento posterior. Se utilizan sus flujos diarios calculados, en USD, no el precio de mercado, el volumen ni la variación del patrimonio.',
      'Esta serie completa de ETFIQ sustituye el corte importado que valoraba el cambio de participaciones al NAV de la misma sesión. No se empalman ambas convenciones. Las diferencias frente al corte anterior pueden responder al cambio de metodología y a revisiones del proveedor.',
      'Los importes de 5 y 20 sesiones suman flujos diarios de la misma serie. El mes del proveedor puede incluir un número distinto de sesiones y no sustituye nuestra ventana de 20 sesiones. Se exigen 400 sesiones completas y 252 ventanas previas para las comparaciones.',
      'Datos calculados por ETFIQ, reutilizados con atribución, fecha efectiva y enlace conforme a su licencia. Los titulares, medias e interpretaciones de estas ventanas son cálculos del dashboard sobre esa serie. ETFIQ no ha avalado ni verificado esta aplicación.',
      'La descarga se comprueba mediante la operación diaria alojada y la caché del sitio. Una sesión ausente no se convierte en cero; un fallo conserva el último corte válido con su fecha original. Un posible split o una marca no reconocida del proveedor bloquea el candidato hasta verificarlo.',
    ],
  };
}
