import 'server-only';
import { unstable_cache } from 'next/cache';
import seed from './ewj-etf-flows-published.json';
import { fetchEwjFundFeed, mergeEwjFlowHistory, buildEwjAutomaticModel } from './ewj-capital-flows-source.mjs';
import type { EwjHistory } from './ewj-capital-flows-source.mjs';
import { CapitalFlowSourceError, latestClosedFlowSession } from './capital-flows-source.mjs';

export const EWJ_ARCHIVE_TAG = 'dashboard-ewj-etfiq-flow-archive-v1';
const BOOTSTRAP_DAY = '2026-11-26';
const previousDay = (day: string) => new Date(Date.parse(`${day}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
const getArchiveFeed = unstable_cache(() => fetchEwjFundFeed(), [EWJ_ARCHIVE_TAG, 'feed'], { revalidate: 86400 });

// Reuse the dated persistent archive pattern already used by ETH. Stored
// history and a same-method seed protect against provider date rollbacks.
const getEwjArchive = unstable_cache(async (day: string): Promise<EwjHistory> => {
  const boundary = new Date(Date.now() - 35 * 86_400_000).toISOString().slice(0, 10);
  if (day < BOOTSTRAP_DAY || day < boundary) return seed as unknown as EwjHistory;
  const previous = await getEwjArchive(previousDay(day));
  const feed = await getArchiveFeed();
  return mergeEwjFlowHistory(previous, feed, new Date().toISOString(), day);
}, [EWJ_ARCHIVE_TAG, 'day'], { revalidate: false });

export async function getEwjAutomaticModel() {
  try {
    const asOf = new Date().toISOString();
    const [previous, feed] = await Promise.all([
      getEwjArchive(previousDay(asOf.slice(0, 10))), fetchEwjFundFeed(),
    ]);
    const model = buildEwjAutomaticModel(previous, feed, asOf);
    // Dated archives need not contain the newest outer cache publication.
    // Admit only the due session, so an older but valid provider response cannot
    // resolve successfully and replace a more recent retained model.
    if (!model.cutoffDate || model.cutoffDate < latestClosedFlowSession(asOf)) {
      throw new CapitalFlowSourceError('Latest closed EWJ session not published');
    }
    return model;
  } catch (error) {
    if (error instanceof Error && 'digest' in error) throw error;
    if (error instanceof CapitalFlowSourceError) throw error;
    throw new CapitalFlowSourceError(`EWJ source unavailable: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}
