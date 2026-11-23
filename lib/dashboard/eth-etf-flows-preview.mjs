// Research-only adapter. Published USD flows, not changes in ETH holdings or AUM.
import { isClosed, isSession, sessionDates } from '../research/mcclellan-core.mjs';

export const ETH_FLOW_SOURCE = 'https://farside.co.uk/ethereum-etf-flow-all-data/';
export const ETH_FLOW_FUNDS = ['ETHA', 'ETHB', 'FETH', 'ETHW', 'TETH', 'ETHV', 'QETH', 'EZET', 'MSSE', 'ETHE', 'ETH'];
const months = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06', Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' };

function number(cell) {
  const value = String(cell ?? '').trim().replaceAll(',', '').replaceAll('−', '-');
  if (!value || ['-', '–', '—', 'n/a'].includes(value.toLowerCase())) return null;
  if (!/^(?:-?\d+(?:\.\d+)?|\(\d+(?:\.\d+)?\))$/.test(value)) throw new Error('Unrecognized ETH flow number');
  const parsed = Number(value.startsWith('(') ? `-${value.slice(1, -1)}` : value);
  if (!Number.isFinite(parsed)) throw new Error('Non-finite ETH flow');
  return parsed;
}

export function parseEthFlowRows(rows, asOf) {
  if (!Number.isFinite(Date.parse(asOf))) throw new Error('Invalid acquisition instant');
  const header = rows.find(row => row.at(-1) === 'Total' && row.includes('ETHA'));
  if (!header || JSON.stringify(header.slice(1, -1)) !== JSON.stringify(ETH_FLOW_FUNDS)) throw new Error('ETH fund universe changed: review required');
  const byDate = new Map(), excluded = [];
  for (const cells of rows) {
    const match = /^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})$/.exec(cells[0] ?? '');
    if (!match || !months[match[2]]) continue; // No seed, fee or cumulative rows.
    const date = `${match[3]}-${months[match[2]]}-${match[1].padStart(2, '0')}`;
    if (date < '2024-01-01' || date > '2028-12-31' || !isSession(date) || !isClosed(date, asOf)) {
      excluded.push({ date, reason:'non-session-or-unclosed' }); continue;
    }
    if (cells.length !== header.length) throw new Error(`ETH row width changed: ${date}`);
    const values = cells.slice(1, -1).map(number), total = number(cells.at(-1));
    const reported = values.filter(value => value != null);
    if (!reported.length) { excluded.push({ date, reason:'empty-placeholder' }); continue; }
    if (total == null) throw new Error(`Missing published ETH total: ${date}`);
    // Source rounds each fund and the total to 0.1 M USD; bound the rounding error.
    if (Math.abs(reported.reduce((sum, value) => sum + value, 0) - total) > (reported.length + 1) * .05 + 1e-6) throw new Error(`ETH total does not reconcile: ${date}`);
    const funds = values.map((value, i) => ({ ticker:ETH_FLOW_FUNDS[i], flow:value == null ? null : Math.round(value * 1e6) }));
    const point = { date, flow:reported.length === ETH_FLOW_FUNDS.length ? Math.round(total * 1e6) : null, complete:reported.length === ETH_FLOW_FUNDS.length, funds };
    if (byDate.has(date) && JSON.stringify(byDate.get(date)) !== JSON.stringify(point)) throw new Error(`Conflicting ETH observations: ${date}`);
    byDate.set(date, point);
  }
  const observed = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  const firstComplete = observed.find(point => point.complete), lastComplete = observed.findLast(point => point.complete);
  const points = firstComplete && lastComplete ? sessionDates(firstComplete.date, lastComplete.date).map(date => byDate.get(date) ?? { date, flow:null, complete:false, funds:ETH_FLOW_FUNDS.map(ticker => ({ ticker, flow:null })) }) : [];
  const latest = observed.at(-1);
  return {
    points, excluded, sourceFirstDate:observed[0]?.date ?? null,
    latestPartial:latest && !latest.complete && (!lastComplete || latest.date > lastComplete.date) ? { date:latest.date, reported:latest.funds.filter(fund => fund.flow != null).length, missing:latest.funds.filter(fund => fund.flow == null).map(fund => fund.ticker) } : null,
  };
}

export function buildEthFlowPreview(snapshot) {
  if (snapshot.source !== ETH_FLOW_SOURCE || snapshot.units !== 'USD millions') throw new Error('Unrecognized ETH source or units');
  const parsed = parseEthFlowRows(snapshot.rows, snapshot.retrievedAt);
  const cutoffDate = parsed.points.at(-1)?.date ?? null;
  return {
    id:'eth', title:'Ethereum · Flujos de ETF', eyebrow:'ETHEREUM · ETF SPOT ESTADOUNIDENSES',
    description:'Entradas y salidas netas publicadas para los ETF estadounidenses de Ethereum.',
    cutoffDate, points:parsed.points, metricBasis:'daily-sum', kind:'published', refreshMode:'snapshot',
    retrievedAt:snapshot.retrievedAt, vehicles:[...ETH_FLOW_FUNDS], sources:[{ name:'Farside Investors · Ethereum ETF Flow', url:ETH_FLOW_SOURCE }],
    coverage:{ reported:cutoffDate ? ETH_FLOW_FUNDS.length : 0, expected:ETH_FLOW_FUNDS.length, firstDate:parsed.points[0]?.date ?? null, sourceFirstDate:parsed.sourceFirstDate, latestPartial:parsed.latestPartial, funds:parsed.points.at(-1)?.funds ?? [], updateNote:'Consulta local al abrir el preview, como máximo una vez por hora. La automatización alojada y los permisos de republicación siguen sin validar; no hay una tarea de ETH activada en producción.' },
    notes:[
      'Universo fijo de 11 fondos de la tabla de Farside; no se presenta como la totalidad definitiva de todos los vehículos de Ethereum. Algunos fondos incorporan staking.',
      'Se conserva el total diario publicado, en millones de USD, contrastado con la suma por fondo dentro de su precisión de redondeo. No se vuelve a estimar mediante participaciones × NAV.',
      'El histórico comparable comienza en el primer cierre con cifras explícitas para los 11 fondos. Los guiones anteriores no se interpretan como ceros ni como fechas de lanzamiento verificadas.',
      'Una sesión con un fondo ausente queda incompleta. Una sesión más reciente parcial se identifica aparte; los indicadores terminan en el último cierre completo.',
      'Se excluyen semillas, conversiones iniciales, festivos y sesiones sin cierre confirmado. Los datos son revisables: cada importación reconstruye el histórico sin mezclar proveedores.',
      'No son movimientos on-chain, depósitos en exchanges ni cambios del patrimonio por variaciones del precio. No se dispone aquí de participaciones y NAV históricos oficiales para verificar independientemente el cálculo original de cada fondo.',
    ],
  };
}
