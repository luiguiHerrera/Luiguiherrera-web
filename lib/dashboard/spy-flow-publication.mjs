import { CapitalFlowSourceError, fetchCapitalFlowSource, latestClosedFlowSession } from './capital-flows-source.mjs';
import { sessionDates } from '../research/mcclellan-core.mjs';

const RETENTION_DAYS = 90;
const HOUR = 3_600_000;

// Each effective date has its own slot. A delayed response can never erase a
// newer slot, even when two instances finish their downloads out of order.
export function createSpyFlowPublisher({ cache, seed, fetchSource = fetchCapitalFlowSource, now = Date.now }) {
  let pending;
  async function latest(asOf) {
    const lower = new Date(Date.parse(asOf) - RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10);
    const dates = sessionDates(lower > seed.cutoffDate ? lower : seed.cutoffDate, latestClosedFlowSession(asOf)).reverse();
    for (const date of dates) {
      const model = await cache.get(`cut:${date}`);
      if (model?.id === 'sp500' && model.cutoffDate === date && model.points?.length === 400
        && model.sourceHash && model.retrievedAt) return model;
    }
    return seed;
  }
  async function publish(force) {
    const asOf = new Date(now()).toISOString();
    const previous = await latest(asOf);
    const attempt = await cache.get('last-attempt');
    if (!force && attempt && now() - Date.parse(attempt.at) < (attempt.error ? 60_000 : HOUR)) {
      return attempt.error ? { ...previous, lastRefreshError: attempt.error } : previous;
    }
    let error;
    try {
      const candidate = await fetchSource('sp500', { asOf, minimumCutoffDate: previous.cutoffDate });
      if (!candidate.cutoffDate || candidate.cutoffDate < previous.cutoffDate) {
        throw new CapitalFlowSourceError('SPY source cutoff moved backwards');
      }
      await cache.set(`cut:${candidate.cutoffDate}`, candidate, { ttl: RETENTION_DAYS * 86_400 });
    } catch (failure) {
      if (!(failure instanceof CapitalFlowSourceError)) throw failure;
      error = failure.message;
    }
    await cache.set('last-attempt', { at: asOf, error }, { ttl: 3600 });
    const retained = await latest(asOf);
    return error ? { ...retained, lastRefreshError: error } : retained;
  }
  return function getPublication(force = false) {
    if (pending) return pending;
    pending = publish(force).finally(() => { pending = undefined; });
    return pending;
  };
}
