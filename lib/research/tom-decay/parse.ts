import type {
  AdjacentRegimeTest,
  CalendarPairwiseTest,
  CumulativeBreakTest,
  DatasetProvenance,
  ExploratoryBreakpoint,
  PressureReversal,
  RegimeEstimate,
  RollingPoint,
  TomBreakId,
  TomCalendarGroupId,
  TomDatasetId,
  TomDecayDataset,
  TomRegimeId,
} from "./types.ts";

export class TomDecayDataError extends Error {
  constructor(message: string) {
    super(`Frozen TOM decay data is invalid: ${message}`);
    this.name = "TomDecayDataError";
  }
}

export const BPS_PER_UNIT = 10_000;

const regimeIds: readonly TomRegimeId[] = [
  "PRE_PUBLICATION",
  "PUBLISHED_PRE_DECIMAL",
  "POST_DECIMAL_PRE_T2",
  "T2",
  "T1",
];

const breakIds: readonly TomBreakId[] = [
  "PUBLICATION_ERA_1987",
  "SETTLEMENT_T5_TO_T3_1995",
  "DECIMALIZATION_2001",
  "SETTLEMENT_T3_TO_T2_2017",
  "SETTLEMENT_T2_TO_T1_2024",
];

const calendarGroupIds: readonly TomCalendarGroupId[] = ["REGULAR", "QUARTER_ONLY", "SEMI_YEAR"];

export type CsvRow = Record<string, string>;

export function parseCsv(text: string, label: string): CsvRow[] {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) throw new TomDecayDataError(`${label} has no data rows`);

  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line, index) => {
    const cells = line.split(",");
    if (cells.length !== headers.length) {
      throw new TomDecayDataError(
        `${label} row ${index + 1} has ${cells.length} cells, expected ${headers.length}`,
      );
    }
    return Object.fromEntries(headers.map((header, cell) => [header, cells[cell].trim()]));
  });
}

export function requireColumns(rows: CsvRow[], label: string, columns: readonly string[]) {
  const present = new Set(Object.keys(rows[0] ?? {}));
  const missing = columns.filter((column) => !present.has(column));
  if (missing.length) {
    throw new TomDecayDataError(`${label} is missing column(s): ${missing.join(", ")}`);
  }
}

export function numeric(row: CsvRow, column: string, label: string): number {
  const raw = row[column];
  if (raw === undefined || raw === "") throw new TomDecayDataError(`${label}.${column} is empty`);
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new TomDecayDataError(`${label}.${column} is not finite: ${raw}`);
  return value;
}

export function probability(row: CsvRow, column: string, label: string): number {
  const value = numeric(row, column, label);
  if (value < 0 || value > 1) throw new TomDecayDataError(`${label}.${column} is not a p-value: ${value}`);
  return value;
}

export function count(row: CsvRow, column: string, label: string): number {
  const value = numeric(row, column, label);
  if (!Number.isInteger(value) || value < 0) {
    throw new TomDecayDataError(`${label}.${column} is not a non-negative integer: ${value}`);
  }
  return value;
}

function enumeration<T extends string>(
  row: CsvRow,
  column: string,
  label: string,
  allowed: readonly T[],
): T {
  const raw = row[column];
  if (!allowed.includes(raw as T)) {
    throw new TomDecayDataError(`${label}.${column} is not one of ${allowed.join("|")}: ${raw}`);
  }
  return raw as T;
}

function isoDate(row: CsvRow, column: string, label: string): string {
  const raw = row[column];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw ?? "")) {
    throw new TomDecayDataError(`${label}.${column} is not an ISO date: ${raw}`);
  }
  return raw;
}

function toBps(value: number) {
  return value * BPS_PER_UNIT;
}

export function parseRegimeSummary(text: string, label: string): RegimeEstimate[] {
  const rows = parseCsv(text, label);
  requireColumns(rows, label, [
    "regime",
    "observations",
    "tom_days",
    "tom_minus_all_other_daily",
    "hac_se",
    "hac_p",
    "hac_lags",
  ]);

  const estimates = rows.map((row) => {
    const premiumDaily = numeric(row, "tom_minus_all_other_daily", label);
    return {
      regime: enumeration(row, "regime", label, regimeIds),
      observations: count(row, "observations", label),
      tomDays: count(row, "tom_days", label),
      premiumDaily,
      premiumBps: toBps(premiumDaily),
      hacSe: numeric(row, "hac_se", label),
      hacP: probability(row, "hac_p", label),
      hacLags: count(row, "hac_lags", label),
    } satisfies RegimeEstimate;
  });

  const found = estimates.map((estimate) => estimate.regime);
  const missing = regimeIds.filter((regime) => !found.includes(regime));
  if (missing.length) throw new TomDecayDataError(`${label} is missing regime(s): ${missing.join(", ")}`);

  return regimeIds.map((regime) => estimates.find((estimate) => estimate.regime === regime)!);
}

export function parseAdjacentTests(text: string, label: string): AdjacentRegimeTest[] {
  const rows = parseCsv(text, label);
  requireColumns(rows, label, [
    "regime_a",
    "regime_b",
    "tom_premium_a",
    "tom_premium_b",
    "change_b_minus_a",
    "change_hac_p",
  ]);

  return rows.map((row) => {
    const changeDaily = numeric(row, "change_b_minus_a", label);
    return {
      from: enumeration(row, "regime_a", label, regimeIds),
      to: enumeration(row, "regime_b", label, regimeIds),
      premiumFromBps: toBps(numeric(row, "tom_premium_a", label)),
      premiumToBps: toBps(numeric(row, "tom_premium_b", label)),
      changeDaily,
      changeBps: toBps(changeDaily),
      changeHacP: probability(row, "change_hac_p", label),
    } satisfies AdjacentRegimeTest;
  });
}

export function parseBreakTests(text: string, label: string): CumulativeBreakTest[] {
  const rows = parseCsv(text, label);
  requireColumns(rows, label, [
    "break_name",
    "cutoff",
    "tom_premium_pre",
    "tom_premium_post",
    "change_post_minus_pre",
    "change_hac_p",
  ]);

  return rows.map((row) => ({
    breakId: enumeration(row, "break_name", label, breakIds),
    cutoff: isoDate(row, "cutoff", label),
    premiumPreBps: toBps(numeric(row, "tom_premium_pre", label)),
    premiumPostBps: toBps(numeric(row, "tom_premium_post", label)),
    changeBps: toBps(numeric(row, "change_post_minus_pre", label)),
    changeHacP: probability(row, "change_hac_p", label),
  } satisfies CumulativeBreakTest));
}

export function parseRollingPremium(
  text: string,
  label: string,
  dataEnd: string,
): RollingPoint[] {
  const rows = parseCsv(text, label);
  requireColumns(rows, label, [
    "window_end",
    "window_start",
    "years",
    "observations",
    "tom_days",
    "tom_premium_daily",
    "ci95_lo",
    "ci95_hi",
    "hac_p",
  ]);

  const points = rows.map((row) => {
    const windowEnd = isoDate(row, "window_end", label);
    const ci95LoBps = toBps(numeric(row, "ci95_lo", label));
    const ci95HiBps = toBps(numeric(row, "ci95_hi", label));
    if (ci95HiBps < ci95LoBps) {
      throw new TomDecayDataError(`${label} window ${windowEnd} has an inverted 95% interval`);
    }
    const observations = count(row, "observations", label);
    return {
      windowEnd,
      windowStart: isoDate(row, "window_start", label),
      year: Number(windowEnd.slice(0, 4)),
      years: count(row, "years", label),
      observations,
      tomDays: count(row, "tom_days", label),
      premiumBps: toBps(numeric(row, "tom_premium_daily", label)),
      ci95LoBps,
      ci95HiBps,
      hacP: probability(row, "hac_p", label),
      isPartialWindow: windowEnd > dataEnd,
    } satisfies RollingPoint;
  });

  if (points.length < 2) throw new TomDecayDataError(`${label} needs at least two rolling windows`);
  for (let index = 1; index < points.length; index += 1) {
    if (points[index].year <= points[index - 1].year) {
      throw new TomDecayDataError(`${label} rolling windows are not in ascending year order`);
    }
  }

  return points;
}

export function parseCalendarPairwise(text: string, label: string): CalendarPairwiseTest[] {
  const rows = parseCsv(text, label);
  requireColumns(rows, label, [
    "group_a",
    "group_b",
    "months",
    "difference_b_minus_a",
    "difference_hac_p",
  ]);

  return rows.map((row) => ({
    groupA: enumeration(row, "group_a", label, calendarGroupIds),
    groupB: enumeration(row, "group_b", label, calendarGroupIds),
    months: count(row, "months", label),
    differenceBps: toBps(numeric(row, "difference_b_minus_a", label)),
    differenceHacP: probability(row, "difference_hac_p", label),
  } satisfies CalendarPairwiseTest));
}

type JsonRecord = Record<string, unknown>;

function record(value: unknown, label: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TomDecayDataError(`${label} is not an object`);
  }
  return value as JsonRecord;
}

function text(source: JsonRecord, key: string, label: string): string {
  const value = source[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new TomDecayDataError(`${label}.${key} is not a non-empty string`);
  }
  return value;
}

function optionalText(source: JsonRecord, key: string): string | undefined {
  const value = source[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function jsonNumber(source: JsonRecord, key: string, label: string): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TomDecayDataError(`${label}.${key} is not a finite number`);
  }
  return value;
}

function jsonProbability(source: JsonRecord, key: string, label: string): number {
  const value = jsonNumber(source, key, label);
  if (value < 0 || value > 1) throw new TomDecayDataError(`${label}.${key} is not a p-value: ${value}`);
  return value;
}

export type ParsedResearchReport = {
  toolVersion: string;
  symbol: string;
  source: string;
  start: string;
  end: string;
  rollingYears: number;
  canonicalTomDays: number[];
  provenance: DatasetProvenance;
  pressureReversal: PressureReversal;
  exploratoryBreakpoint: ExploratoryBreakpoint;
};

export function parseResearchReport(json: string, label: string): ParsedResearchReport {
  let decoded: unknown;
  try {
    decoded = JSON.parse(json);
  } catch {
    throw new TomDecayDataError(`${label} is not valid JSON`);
  }

  const report = record(decoded, label);
  const provenance = record(report.source_provenance, `${label}.source_provenance`);
  const pressure = record(report.pressure_reversal, `${label}.pressure_reversal`);
  const breakpoint = record(report.exploratory_breakpoint, `${label}.exploratory_breakpoint`);

  const canonicalTomDays = report.canonical_tom_days;
  if (
    !Array.isArray(canonicalTomDays)
    || canonicalTomDays.length === 0
    || !canonicalTomDays.every((day) => Number.isInteger(day))
  ) {
    throw new TomDecayDataError(`${label}.canonical_tom_days is not a list of integers`);
  }

  const selectedYear = jsonNumber(breakpoint, "selected_year", `${label}.exploratory_breakpoint`);
  if (!Number.isInteger(selectedYear)) {
    throw new TomDecayDataError(`${label}.exploratory_breakpoint.selected_year is not a year`);
  }

  return {
    toolVersion: text(report, "version", label),
    symbol: text(report, "symbol", label),
    source: text(report, "source", label),
    start: text(report, "start", label),
    end: text(report, "end", label),
    rollingYears: jsonNumber(report, "rolling_years", label),
    canonicalTomDays: canonicalTomDays as number[],
    provenance: {
      provider: text(provenance, "provider", `${label}.source_provenance`),
      dataset: optionalText(provenance, "dataset"),
      symbol: optionalText(provenance, "symbol") ?? text(report, "symbol", label),
      returnDefinition:
        optionalText(provenance, "return_definition")
        ?? text(provenance, "market_return_definition", `${label}.source_provenance`),
      downloadUrl: optionalText(provenance, "download_url"),
      downloadSha256: optionalText(provenance, "download_sha256"),
    },
    pressureReversal: {
      months: jsonNumber(pressure, "months", `${label}.pressure_reversal`),
      correlation: jsonNumber(pressure, "pressure_reversal_corr", `${label}.pressure_reversal`),
      afterNegativePressureBps:
        jsonNumber(pressure, "reversal_after_negative_pressure_mean", `${label}.pressure_reversal`)
        * BPS_PER_UNIT,
      afterNonNegativePressureBps:
        jsonNumber(pressure, "reversal_after_nonnegative_pressure_mean", `${label}.pressure_reversal`)
        * BPS_PER_UNIT,
      differenceBps:
        jsonNumber(pressure, "difference_negative_minus_nonnegative", `${label}.pressure_reversal`)
        * BPS_PER_UNIT,
      differenceHacP: jsonProbability(pressure, "difference_hac_p", `${label}.pressure_reversal`),
    },
    exploratoryBreakpoint: {
      status: text(breakpoint, "status", `${label}.exploratory_breakpoint`),
      selectedYear,
      premiumPreBps:
        jsonNumber(breakpoint, "tom_premium_pre", `${label}.exploratory_breakpoint`) * BPS_PER_UNIT,
      premiumPostBps:
        jsonNumber(breakpoint, "tom_premium_post", `${label}.exploratory_breakpoint`) * BPS_PER_UNIT,
      changeBps:
        jsonNumber(breakpoint, "change_post_minus_pre", `${label}.exploratory_breakpoint`)
        * BPS_PER_UNIT,
      naiveHacPUnadjusted: jsonProbability(
        breakpoint,
        "naive_hac_p_unadjusted",
        `${label}.exploratory_breakpoint`,
      ),
    },
  };
}

export type FrozenDatasetSources = {
  publicationRegimeSummary: string;
  publicationAdjacentTests: string;
  breakTests: string;
  rollingPremium: string;
  calendarPairwiseTests: string;
  researchReport: string;
};

export function buildDataset(
  id: TomDatasetId,
  sources: FrozenDatasetSources,
): TomDecayDataset {
  const report = parseResearchReport(sources.researchReport, `${id}/research_report.json`);

  return {
    id,
    toolVersion: report.toolVersion,
    source: report.source,
    start: report.start,
    end: report.end,
    rollingYears: report.rollingYears,
    canonicalTomDays: report.canonicalTomDays,
    provenance: report.provenance,
    regimes: parseRegimeSummary(
      sources.publicationRegimeSummary,
      `${id}/publication_regime_summary.csv`,
    ),
    adjacentTests: parseAdjacentTests(
      sources.publicationAdjacentTests,
      `${id}/publication_adjacent_tests.csv`,
    ),
    breakTests: parseBreakTests(sources.breakTests, `${id}/break_tests.csv`),
    rolling: parseRollingPremium(sources.rollingPremium, `${id}/rolling_premium.csv`, report.end),
    calendarPairwise: parseCalendarPairwise(
      sources.calendarPairwiseTests,
      `${id}/calendar_pairwise_tests.csv`,
    ),
    pressureReversal: report.pressureReversal,
    exploratoryBreakpoint: report.exploratoryBreakpoint,
  };
}
