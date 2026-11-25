/** Official OFR FSI columns. Numbers remain on the source's original scale. */
export const OFR_SERIES_COLUMNS = {
  fsi: "OFR FSI", credit: "Credit", equityValuation: "Equity valuation",
  safeAssets: "Safe assets", funding: "Funding", volatility: "Volatility",
  unitedStates: "United States", otherAdvancedEconomies: "Other advanced economies", emergingMarkets: "Emerging markets",
} as const;
export const OFR_CATEGORY_KEYS = ["credit", "equityValuation", "funding", "safeAssets", "volatility"] as const;
export const OFR_REGION_KEYS = ["unitedStates", "otherAdvancedEconomies", "emergingMarkets"] as const;
export const OFR_PUBLISHED_DECIMAL_PLACES = 3;
export type OfrSeriesKey = keyof typeof OFR_SERIES_COLUMNS;
export type OfrContributionKey = Exclude<OfrSeriesKey, "fsi">;
export type OfrObservation = { date: string } & Record<OfrSeriesKey, number | null>;
export interface OfrFsiDataset {
  observations: OfrObservation[];
  decimalPlaces: number;
  sourceColumns: string[];
  duplicateDatesRemoved: number;
}
export type OfrDataset = OfrFsiDataset;
export interface OfrFsiSnapshot {
  dataset: OfrFsiDataset;
  retrievedAt: string;
  sourceHash: string;
  refreshStatus: "current" | "retained" | "unavailable";
  lastRefreshError?: string;
}
export type OfrContribution = { key: OfrContributionKey; value: number | null; delta20: number | null };
export type OfrReconciliation = {
  status: "reconciled" | "incomplete" | "mismatch";
  expected: number | null; sum: number | null; residual: number | null;
  tolerance: number; missing: OfrSeriesKey[];
};
export type OfrHistoricalIssue = {
  date: string; dimension: "categories" | "regions"; residual: number; tolerance: number;
};
export interface OfrFsiSummary {
  latest: OfrObservation | null;
  comparison: OfrObservation | null;
  delta20: number | null;
  state: "above" | "below" | "average" | "unavailable";
  trend: "increasing" | "decreasing" | "unchanged" | "unavailable";
  categoryContributions: OfrContribution[];
  regionContributions: OfrContribution[];
  focusCategories: OfrContribution[];
  changeDrivers: { increases: OfrContribution[]; decreases: OfrContribution[] };
  reconciliation: { categories: OfrReconciliation; regions: OfrReconciliation; categoryChanges: OfrReconciliation; regionChanges: OfrReconciliation };
  coverage: { categories: number; regions: number; categoryChanges: number; regionChanges: number };
  historicalIssues: OfrHistoricalIssue[];
}
export class OfrFsiDataError extends Error {
  constructor(message: string) { super(message); this.name = "OfrFsiDataError"; }
}

function csvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false, closedQuote = false;
  const text = input.replace(/^\uFEFF/u, "");
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (quoted) {
      if (character === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { quoted = false; closedQuote = true; }
      } else cell += character;
      continue;
    }
    if (character === ',' || character === '\n' || character === '\r') {
      row.push(cell); cell = ""; closedQuote = false;
      if (character !== ',') {
        if (row.some(value => value.trim() !== "")) rows.push(row);
        row = [];
        if (character === '\r' && text[i + 1] === '\n') i++;
      }
    } else if (character === '"') {
      if (cell.trim() || closedQuote) throw new OfrFsiDataError("Malformed quoted CSV field");
      cell = ""; quoted = true;
    } else {
      if (closedQuote && character.trim()) throw new OfrFsiDataError("Unexpected text after quoted CSV field");
      if (!closedQuote) cell += character;
    }
  }
  if (quoted) throw new OfrFsiDataError("Unterminated quoted CSV field");
  row.push(cell);
  if (row.some(value => value.trim() !== "")) rows.push(row);
  return rows;
}
function normalizedHeader(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]/gu, ""); }
function dateValue(raw: string, row: number) {
  const value = raw.trim();
  const date = new Date(value + "T00:00:00Z");
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new OfrFsiDataError(`Invalid observation date at CSV row ${row}`);
  }
  return value;
}
function numberValue(raw: string, column: string, row: number) {
  const value = raw.trim();
  if (/^(?:|NA|N\/A|NULL|\.|-|—)$/iu.test(value)) return null;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u.test(value)) {
    throw new OfrFsiDataError(`Invalid numeric ${column} at CSV row ${row}`);
  }
  const number = Number(value);
  if (!Number.isFinite(number)) throw new OfrFsiDataError(`Non-finite ${column} at CSV row ${row}`);
  return number;
}

/** Normalize the complete source file; revisions replace history, rather than append to it. */
export function parseOfrFsiCsv(input: string): OfrFsiDataset {
  const rows = csvRows(input);
  const headers = rows.shift();
  if (!headers || !rows.length) throw new OfrFsiDataError("OFR CSV has no observations");
  const normalized = headers.map(normalizedHeader);
  if (new Set(normalized).size !== normalized.length) throw new OfrFsiDataError("Duplicate CSV column");
  const dateColumn = normalized.indexOf("date");
  const columns = Object.fromEntries(Object.entries(OFR_SERIES_COLUMNS).map(([key, label]) => {
    const index = normalized.indexOf(normalizedHeader(label));
    if (index < 0) throw new OfrFsiDataError(`Missing official CSV column: ${label}`);
    return [key, index];
  })) as Record<OfrSeriesKey, number>;
  if (dateColumn < 0) throw new OfrFsiDataError("Missing official CSV column: Date");
  const observations = new Map<string, OfrObservation>();
  let duplicateDatesRemoved = 0;
  rows.forEach((values, index) => {
    if (values.length !== headers.length) throw new OfrFsiDataError(`Wrong CSV column count at row ${index + 2}`);
    const date = dateValue(values[dateColumn], index + 2);
    const observation = { date, ...Object.fromEntries(Object.entries(columns).map(([key, column]) =>
      [key, numberValue(values[column], OFR_SERIES_COLUMNS[key as OfrSeriesKey], index + 2)])) } as OfrObservation;
    const previous = observations.get(date);
    if (previous) {
      if (Object.keys(OFR_SERIES_COLUMNS).some(key => previous[key as OfrSeriesKey] !== observation[key as OfrSeriesKey])) {
        throw new OfrFsiDataError(`Conflicting observations for ${date}`);
      }
      duplicateDatesRemoved++;
    } else observations.set(date, observation);
  });
  return {
    observations: [...observations.values()].sort((a, b) => a.date.localeCompare(b.date)),
    // The current official publication rounds to three places and omits trailing
    // zeroes. A lexical '0.5' therefore does not justify a one-place tolerance.
    decimalPlaces: OFR_PUBLISHED_DECIMAL_PLACES,
    sourceColumns: headers.map(value => value.trim()),
    duplicateDatesRemoved,
  };
}

function available(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
function difference(current: number | null | undefined, previous: number | null | undefined) {
  return available(current) && available(previous) ? current - previous : null;
}
/** Rounding budget only; this is not a threshold for financial stress. */
export function ofrReconciliationTolerance(componentCount: number, decimalPlaces = OFR_PUBLISHED_DECIMAL_PLACES, differences = false) {
  return (componentCount + 1) * 0.5 * 10 ** -decimalPlaces * (differences ? 2 : 1);
}
function reconcile(expected: number | null, values: Array<{ key: OfrSeriesKey; value: number | null }>, decimalPlaces: number, differences = false): OfrReconciliation {
  const tolerance = ofrReconciliationTolerance(values.length, decimalPlaces, differences);
  const missing: OfrSeriesKey[] = values.filter(item => !available(item.value)).map(item => item.key);
  if (!available(expected)) missing.unshift("fsi");
  if (missing.length) return { status: "incomplete", expected, sum: null, residual: null, tolerance, missing };
  const sum = values.reduce((total, item) => total + item.value!, 0);
  const residual = sum - expected!;
  const slack = Number.EPSILON * Math.max(1, Math.abs(sum), Math.abs(expected!)) * (values.length + 1) * 4;
  return { status: Math.abs(residual) <= tolerance + slack ? "reconciled" : "mismatch", expected, sum, residual, tolerance, missing };
}
export function reconcileOfrFsiObservation(observation: OfrObservation | null, keys: readonly OfrContributionKey[], decimalPlaces = OFR_PUBLISHED_DECIMAL_PLACES) {
  return reconcile(observation?.fsi ?? null, keys.map(key => ({ key, value: observation?.[key] ?? null })), decimalPlaces);
}

export function getOfrDelta20(dataset: OfrFsiDataset, observationIndex: number, key: OfrSeriesKey = "fsi") {
  if (!Number.isInteger(observationIndex) || observationIndex < 20) return null;
  return difference(dataset.observations[observationIndex]?.[key], dataset.observations[observationIndex - 20]?.[key]);
}

export function buildOfrFsiSummary(dataset: OfrFsiDataset): OfrFsiSummary {
  const latest = dataset.observations.at(-1) ?? null;
  // Twenty published intervals require twenty-one distinct published rows. Never
  // skip a missing cell to substitute another observation or interpolate a date.
  const comparison = dataset.observations.at(-21) ?? null;
  const delta20 = getOfrDelta20(dataset, dataset.observations.length - 1);
  const contribution = (key: OfrContributionKey): OfrContribution => ({
    key, value: latest?.[key] ?? null, delta20: getOfrDelta20(dataset, dataset.observations.length - 1, key),
  });
  const categoryContributions = OFR_CATEGORY_KEYS.map(contribution);
  const regionContributions = OFR_REGION_KEYS.map(contribution);
  const reconcileChanges = (items: OfrContribution[]) => reconcile(delta20,
    items.map(item => ({ key: item.key, value: item.delta20 })), dataset.decimalPlaces, true);
  const historicalIssues: OfrHistoricalIssue[] = [];
  for (const observation of dataset.observations) {
    for (const [dimension, keys] of [["categories", OFR_CATEGORY_KEYS], ["regions", OFR_REGION_KEYS]] as const) {
      const result = reconcileOfrFsiObservation(observation, keys, dataset.decimalPlaces);
      if (result.status === "mismatch") historicalIssues.push({ date: observation.date, dimension, residual: result.residual!, tolerance: result.tolerance });
    }
  }
  return {
    latest, comparison, delta20,
    state: !available(latest?.fsi) ? "unavailable" : latest.fsi > 0 ? "above" : latest.fsi < 0 ? "below" : "average",
    trend: delta20 === null ? "unavailable" : delta20 > 0 ? "increasing" : delta20 < 0 ? "decreasing" : "unchanged",
    categoryContributions, regionContributions,
    focusCategories: categoryContributions.filter(item => available(item.value) && item.value > 0).sort((a, b) => b.value! - a.value!).slice(0, 2),
    changeDrivers: {
      increases: categoryContributions.filter(item => available(item.delta20) && item.delta20 > 0).sort((a, b) => b.delta20! - a.delta20!),
      decreases: categoryContributions.filter(item => available(item.delta20) && item.delta20 < 0).sort((a, b) => a.delta20! - b.delta20!),
    },
    reconciliation: {
      categories: reconcileOfrFsiObservation(latest, OFR_CATEGORY_KEYS, dataset.decimalPlaces),
      regions: reconcileOfrFsiObservation(latest, OFR_REGION_KEYS, dataset.decimalPlaces),
      categoryChanges: reconcileChanges(categoryContributions), regionChanges: reconcileChanges(regionContributions),
    },
    coverage: {
      categories: categoryContributions.filter(item => available(item.value)).length,
      regions: regionContributions.filter(item => available(item.value)).length,
      categoryChanges: categoryContributions.filter(item => available(item.delta20)).length,
      regionChanges: regionContributions.filter(item => available(item.delta20)).length,
    },
    historicalIssues,
  };
}

function csvCell(value: string | number | null) {
  if (value === null) return "";
  const text = typeof value === "number" && Object.is(value, -0) ? "-0" : String(value);
  return /[",\r\n]/u.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
}
/** Export the displayed rows, retaining source precision and identifying every derived column. */
export function exportOfrFsiCsv(dataset: OfrFsiDataset, observations: readonly OfrObservation[] = dataset.observations) {
  const keys = Object.keys(OFR_SERIES_COLUMNS) as OfrSeriesKey[];
  const header = ["Date", ...keys.map(key => OFR_SERIES_COLUMNS[key]), "Derived comparison date (20 published sessions earlier)",
    ...keys.map(key => `Derived Delta20 ${OFR_SERIES_COLUMNS[key]} (index points)`)];
  const indices = new Map(dataset.observations.map((row, index) => [row.date, index]));
  const rows = observations.map(selected => {
    const index = indices.get(selected.date);
    if (index === undefined) throw new OfrFsiDataError(`Export date is outside source dataset: ${selected.date}`);
    const row = dataset.observations[index];
    const comparison = index >= 20 ? dataset.observations[index - 20] : null;
    return [row.date, ...keys.map(key => row[key]), comparison?.date ?? "", ...keys.map(key => {
      const delta = getOfrDelta20(dataset, index, key);
      // CSV is presentation too: keep the published precision, not floating-point noise.
      return delta === null ? null : delta.toFixed(dataset.decimalPlaces);
    })];
  });
  return [header, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
