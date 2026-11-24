// Development must catch provider failures in the request, not in Next's SWR
// background task (which reports even expected publication delays as dev errors).
// Production continues to use its existing persistent stale-while-revalidate cache.
export function createDevelopmentSourceCache({ load, readPrevious, isSourceError, now = Date.now }) {
  const entries = new Map();
  return function getSource(key) {
    const entry = entries.get(key) ?? {};
    if (entry.pending) return entry.pending;
    if (entry.value !== undefined && now() < entry.retryAt) return Promise.resolve(entry.value);
    entries.set(key, entry);
    entry.pending = (async () => {
      try {
        const value = await load(key);
        entry.value = value;
        entry.retryAt = now() + 3_600_000;
        return value;
      } catch (error) {
        if (!isSourceError(error)) throw error;
        // Only read the persistent cache after a failed fetch. Its development
        // reader has no time expiry, so this cannot launch another background task.
        // Never write an older source or the bundled fallback over a good entry.
        const previous = entry.value ?? await readPrevious(key);
        entry.value = previous;
        entry.retryAt = now() + 60_000;
        return previous;
      } finally {
        entry.pending = undefined;
      }
    })();
    return entry.pending;
  };
}
