// Pure calculation and source validation for local research. No I/O.
export const WARMUP = 250;
// ICE/NYSE 2024–2028 calendar, plus the special 2025-01-09 closure.
export const HOLIDAYS = new Set([
  "2024-01-01","2024-01-15","2024-02-19","2024-03-29","2024-05-27",
  "2024-06-19","2024-07-04","2024-09-02","2024-11-28","2024-12-25",
  "2025-01-01","2025-01-09","2025-01-20","2025-02-17","2025-04-18",
  "2025-05-26","2025-06-19","2025-07-04","2025-09-01","2025-11-27","2025-12-25",
  "2026-01-01","2026-01-19","2026-02-16","2026-04-03","2026-05-25",
  "2026-06-19","2026-07-03","2026-09-07","2026-11-26","2026-12-25",
  "2027-01-01","2027-01-18","2027-02-15","2027-03-26","2027-05-31",
  "2027-06-18","2027-07-05","2027-09-06","2027-11-25","2027-12-24",
  "2028-01-17","2028-02-21","2028-04-14","2028-05-29","2028-06-19",
  "2028-07-04","2028-09-04","2028-11-23","2028-12-25",
]);
const EARLY_CLOSE = new Set([
  "2024-07-03","2024-11-29","2024-12-24",
  "2025-07-03","2025-11-28","2025-12-24",
  "2026-11-27","2026-12-24",
  "2027-11-26","2028-07-03","2028-11-24",
]);
const NY_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
function nyParts(instant) {
  const p = Object.fromEntries(NY_FORMAT.formatToParts(new Date(instant)).map(p => [p.type, p.value]));
  return { date: p.year + "-" + p.month + "-" + p.day, minute: Number(p.hour) * 60 + Number(p.minute) };
}
function validDate(date) {
  return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
    && Number.isFinite(Date.parse(date)) && new Date(date + "T12:00Z").toISOString().slice(0, 10) === date;
}
export function isSession(date) {
  if (!validDate(date)) throw new Error("Invalid session date: " + date);
  const year = Number(date.slice(0, 4));
  if (year < 2024 || year > 2028) throw new Error("Research calendar only covers 2024–2028");
  return ![0, 6].includes(new Date(date + "T12:00Z").getUTCDay()) && !HOLIDAYS.has(date);
}
export function sessionDates(start, end) {
  if (!validDate(start) || !validDate(end)) throw new Error("Invalid calendar range");
  const result = [];
  for (let d = new Date(start + "T12:00Z"); d.toISOString().slice(0, 10) <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const date = d.toISOString().slice(0, 10);
    if (isSession(date)) result.push(date);
  }
  return result;
}
export function isClosed(date, instant) {
  if (!isSession(date) || !Number.isFinite(Date.parse(instant))) return false;
  const ny = nyParts(instant);
  // A conservative 60-minute buffer; not a provider guarantee of finality.
  return date < ny.date || (date === ny.date && ny.minute >= (EARLY_CLOSE.has(date) ? 13 : 16) * 60 + 60);
}
function latestClosed(instant) {
  const today = nyParts(instant).date;
  for (let d = new Date(today + "T12:00Z"), n = 0; n < 14; n++, d.setUTCDate(d.getUTCDate() - 1)) {
    const date = d.toISOString().slice(0, 10);
    if (isClosed(date, instant)) return date;
  }
  throw new Error("Could not establish the latest closed session");
}
export function validateRows(snapshot) {
  if (snapshot?.metadata?.universe !== "S&P 500") throw new Error("Unexpected source universe");
  const total = snapshot.metadata.total_stocks;
  if (!Number.isSafeInteger(total) || total <= 0 || !Array.isArray(snapshot.data) || !snapshot.data.length) throw new Error("Invalid source shape");
  let previous = "", cumulative = 0;
  for (const row of snapshot.data) {
    if (!isSession(row.date) || row.date <= previous) throw new Error("Unordered, duplicate or non-session row: " + row.date);
    const { advances: a, declines: d } = row;
    if (![a, d].every(n => Number.isSafeInteger(n) && n >= 0) || a + d <= 0 || a + d > total) throw new Error("Invalid A/D counts: " + row.date);
    if (row.net_advances !== a - d) throw new Error("Net advances mismatch: " + row.date);
    cumulative += a - d;
    if (row.ad_line !== cumulative) throw new Error("Source A/D cumulative mismatch: " + row.date);
    previous = row.date;
  }
  return snapshot.data;
}
export function calculate(rows, warmup = WARMUP) {
  if (!Number.isSafeInteger(warmup) || warmup < 1) throw new Error("Invalid warmup");
  let fast = 0, slow = 0, summation = 0;
  return rows.map((row, i) => {
    const { advances: a, declines: d } = row;
    if (![a, d].every(n => Number.isSafeInteger(n) && n >= 0) || a + d <= 0) throw new Error("Invalid A/D counts");
    const rana = 1000 * (a - d) / (a + d);
    fast = 0.9 * fast + 0.1 * rana;
    slow = 0.95 * slow + 0.05 * rana;
    const oscillator = fast - slow;
    summation += oscillator;
    // Miekka calibration, K=0 for ratio-adjusted SI; verifies the cumulative result.
    const calibratedSummation = 19 * slow - 9 * fast;
    if (Math.abs(summation - calibratedSummation) > 1e-7) throw new Error("Summation calibration failed");
    return { date: row.date, rana, ema19: fast, ema39: slow, oscillator, summation, warmedUp: i + 1 >= warmup };
  });
}
export function compareSnapshots(current, previous) {
  const old = new Map(previous.data.map(row => [row.date, row]));
  const overlap = current.data.filter(row => old.has(row.date));
  const changed = overlap.filter(row => row.advances !== old.get(row.date).advances || row.declines !== old.get(row.date).declines);
  return {
    overlap: overlap.length, changed: changed.length,
    maxAbsoluteNetRevision: Math.max(0, ...overlap.map(row => Math.abs(row.net_advances - old.get(row.date).net_advances))),
    meanAbsoluteNetRevision: overlap.length ? overlap.reduce((sum, row) => sum + Math.abs(row.net_advances - old.get(row.date).net_advances), 0) / overlap.length : null,
  };
}
export function researchSnapshot(snapshot, { asOf = new Date().toISOString() } = {}) {
  const rows = validateRows(snapshot);
  const generatedAt = snapshot.metadata.generated_at;
  if (!Number.isFinite(Date.parse(asOf)) || !Number.isFinite(Date.parse(generatedAt)) || Date.parse(generatedAt) > Date.parse(asOf)) throw new Error("Invalid or future source timestamp");
  const generatedDate = nyParts(generatedAt).date;
  if (rows.at(-1).date > generatedDate) throw new Error("Source contains a future session");
  const dates = new Set(rows.map(row => row.date));
  const expected = sessionDates(rows[0].date, rows.at(-1).date);
  const missingSessions = expected.filter(date => !dates.has(date));
  if (missingSessions.length) throw new Error("Missing sessions; never zero-fill: " + missingSessions.join(", "));
  const closed = rows.filter(row => isClosed(row.date, asOf) && isClosed(row.date, generatedAt));
  if (!closed.length) throw new Error("No closed session candidates");
  const series = calculate(closed);
  const expectedClosedSession = latestClosed(asOf);
  const last = closed.at(-1).date;
  const stale = last !== expectedClosedSession;
  return {
    audit: {
      mode: "LOCAL_RESEARCH_ONLY", universe: "S&P 500; source current-membership reconstruction",
      publicationAllowed: false, dataRights: "NOT_VERIFIED", riskSignalsEnabled: false,
      methodology: "RANA=1000*(A-D)/(A+D); EMA alpha .10/.05; RAMO=EMA19-EMA39; RASI=sum(RAMO), zero seeds, K=0",
      sourceGeneratedAt: generatedAt, asOf, sourceRows: rows.length, sourceStart: rows[0].date, sourceEnd: rows.at(-1).date,
      missingSessions, closedCandidates: closed.length,
      excludedOpenOrUnconfirmed: rows.filter(row => !closed.includes(row)).map(row => row.date),
      latestClosedCandidate: last, expectedClosedSession, stale,
      warmup: WARMUP, usableResearchRows: series.filter(row => row.warmedUp).length,
      observedMovingIssues: { min: Math.min(...rows.map(r => r.advances + r.declines)), max: Math.max(...rows.map(r => r.advances + r.declines)) },
      completeConstituentCoverageVerified: false, pointInTimeMembershipVerified: false,
      warnings: [
        "Historical file omits unchanged/missing counts and per-date constituent lists.",
        "Calendar-closed candidates are not certified final exchange breadth.",
        "Historical data can be recomputed or revised; this is not an immutable backtest dataset.",
        "NYSE/NYMO/NYSI levels and risk thresholds are not applicable to this universe.",
      ],
    },
    series,
  };
}
