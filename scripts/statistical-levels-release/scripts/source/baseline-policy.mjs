// Versioned authority policy shared by the final candidate and its legacy counterfactual.
// Current marks never enter the completed historical input through this boundary.
export function completedDailyRows(rows, metadata, cutoff) {
  const instant = Date.parse(cutoff);
  if (!Number.isFinite(instant) || metadata.dataGranularity !== '1d') throw new Error('Invalid cutoff or raw daily-bar provenance');
  const day = cutoff.slice(0, 10);
  if (!['UTC', 'America/New_York'].includes(metadata.exchangeTimezoneName)) throw new Error('Unqualified exchange calendar');
  return rows.filter(row => {
    if (row.date < day) return true;
    if (row.date > day || metadata.exchangeTimezoneName === 'UTC') return false;
    const session = metadata.currentTradingPeriod?.regular;
    return Number.isFinite(session?.end) && new Date(session.start * 1000).toISOString().slice(0, 10) === row.date && session.end * 1000 <= instant;
  });
}

export function completedPeriod(date, frequency, cutoff) {
  if (frequency === 'daily') return true; // Daily admission is checked against provider/session semantics first.
  const key = value => {
    if (frequency === 'monthly') return value.slice(0, 7);
    const day = new Date(value.slice(0, 10) + 'T00:00:00Z');
    day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
    return day.toISOString().slice(0, 10);
  };
  return key(date) < key(cutoff);
}
