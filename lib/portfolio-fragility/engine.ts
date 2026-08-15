export const WEIGHT_TOLERANCE = 1e-12;
export const CORRELATION_THRESHOLD = 0.7;
export const SCENARIO_REGISTRY_VERSION = "pfl-scenario-registry/0.1.0";

export const HISTORICAL_EPISODES = {
  DOTCOM_TECH_UNWIND: { start: "2000-03-10", end: "2002-10-09", windowType: "BENCHMARK_PEAK_TO_TROUGH" },
  GFC_HOUSING_CREDIT: { start: "2007-10-09", end: "2009-03-09", windowType: "BENCHMARK_PEAK_TO_TROUGH" },
  COVID_CRASH: { start: "2020-02-19", end: "2020-03-23", windowType: "BENCHMARK_PEAK_TO_TROUGH" },
  INFLATION_RATES_2022: {
    start: "2022-01-03", end: "2022-12-30", windowType: "FIXED_CALENDAR_REGIME",
    diagnosticSubwindow: { start: "2022-01-03", end: "2022-10-12", basis: "S&P 500 price peak to trough" },
  },
} as const;

export type EpisodeId = keyof typeof HISTORICAL_EPISODES;
export const HISTORICAL_REPLAY_WINDOWS = {
  ...HISTORICAL_EPISODES,
  "2022_EQUITY_DRAWDOWN_DIAGNOSTIC": {
    start: "2022-01-03", end: "2022-10-12", windowType: "DIAGNOSTIC_SUBWINDOW",
    parentEpisodeId: "INFLATION_RATES_2022",
  },
} as const;
export type ReplayWindowId = keyof typeof HISTORICAL_REPLAY_WINDOWS;
export type ReturnBasis = "TOTAL_RETURN" | "PRICE_RETURN_SPLIT_ADJUSTED" | "UNADJUSTED_PRICE";
export type ReasonCode =
  | "ASSET_NOT_EXIST" | "INSUFFICIENT_OBSERVATIONS" | "MISSING_EPISODE_COVERAGE"
  | "FX_UNAVAILABLE" | "UNADJUSTED_PRICE" | "UNAVAILABLE_PRICE_ONLY" | "GAPPED_SERIES"
  | "ZERO_PORTFOLIO_VOLATILITY" | "INSUFFICIENT_HOLDINGS" | "DEGENERATE_CORRELATION"
  | "UNSUPPORTED_PORTFOLIO" | "INVALID_COUNTERFACTUAL" | "INVALID_INPUT";
export type Unavailable = {
  status: "UNAVAILABLE"; reason_code: ReasonCode; message: string;
  affected_asset_ids: string[]; required: Record<string, unknown>; observed: Record<string, unknown>;
};
export type Holding = { assetId: string; rawWeight: number; currency?: string; returnBasis?: ReturnBasis; bucket?: string };
export type HistoryObservation = {
  assetId: string; date: string; value: number; currency: string; returnBasis: ReturnBasis;
  source: string; provenance: string; inceptionDate?: string;
};
export type Available<T extends object> = { status: "OK"; quality_flags: string[] } & T;

export function unavailable(
  reason_code: ReasonCode, message: string, affected_asset_ids: string[] = [],
  required: Record<string, unknown> = {}, observed: Record<string, unknown> = {},
): Unavailable {
  return { status: "UNAVAILABLE", reason_code, message, affected_asset_ids: [...new Set(affected_asset_ids)].sort(), required, observed };
}

export function neumaierSum(values: Iterable<number>): number {
  let total = 0; let compensation = 0;
  for (const value of values) {
    const next = total + value;
    compensation += Math.abs(total) >= Math.abs(value) ? (total - next) + value : (value - next) + total;
    total = next;
  }
  const result = total + compensation;
  return Object.is(result, -0) ? 0 : result;
}

export function compensatedDot(left: readonly number[], right: readonly number[]): number {
  if (left.length !== right.length) throw new Error("dot-product vectors must have equal length");
  return neumaierSum(left.map((value, index) => value * right[index]));
}

function finite(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }
function canonicalIds(ids: readonly string[]) {
  return ids.length > 0 && ids.every(Boolean) && new Set(ids).size === ids.length &&
    ids.every((id, index) => index === 0 || ids[index - 1] <= id);
}
function validateWeights(ids: readonly string[], weights: readonly number[]): string | null {
  if (!canonicalIds(ids) || ids.length !== weights.length) return "asset_ids must be unique and in canonical order";
  if (weights.some((weight) => !finite(weight) || weight < 0)) return "weights must be finite and non-negative";
  return Math.abs(neumaierSum(weights) - 1) > WEIGHT_TOLERANCE ? "weights must sum to one within 1e-12" : null;
}
function validateMatrix(ids: readonly string[], matrix: readonly (readonly number[])[]): string | null {
  if (!ids.length || matrix.length !== ids.length || matrix.some((row) => row.length !== ids.length)) return "matrix must be square and match asset_ids";
  if (matrix.some((row) => row.some((value) => !finite(value)))) return "matrix values must be finite";
  for (let row = 0; row < ids.length; row += 1) for (let column = row + 1; column < ids.length; column += 1) {
    if (matrix[row][column] !== matrix[column][row]) return "matrix must be symmetric";
  }
  return null;
}

export function normalizeWeights(holdings: readonly Holding[]): Available<{
  asset_ids: string[]; normalized_weights: number[]; raw_weight_total: number; normalization_applied: boolean;
}> | Unavailable {
  if (!holdings.length) return unavailable("INVALID_INPUT", "At least one holding is required.", [], { positive_holdings_minimum: 1 }, { holding_count: 0 });
  const invalid: string[] = []; const negative: string[] = []; const seen = new Set<string>();
  for (const holding of holdings) {
    if (!holding.assetId || seen.has(holding.assetId) || !finite(holding.rawWeight)) invalid.push(String(holding.assetId));
    else seen.add(holding.assetId);
    if (finite(holding.rawWeight) && holding.rawWeight < 0) negative.push(holding.assetId);
  }
  if (invalid.length) return unavailable("INVALID_INPUT", "Holding identifiers must be unique non-empty strings and weights must be finite.", invalid, { asset_id: "unique non-empty string", raw_weight: "finite number >= 0" }, { invalid_asset_ids: [...new Set(invalid)].sort() });
  if (negative.length) return unavailable("UNSUPPORTED_PORTFOLIO", "Short or leveraged portfolio weights are unsupported in v0.1.", negative, { raw_weight: "finite number >= 0" }, { negative_weight_asset_ids: negative.sort() });
  const positive = holdings.filter((holding) => holding.rawWeight > 0).map((holding) => [holding.assetId, holding.rawWeight] as const).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  if (!positive.length) return unavailable("INVALID_INPUT", "At least one holding weight must be positive.", holdings.map((holding) => holding.assetId), { positive_holdings_minimum: 1 }, { positive_holdings: 0 });
  const total = neumaierSum(positive.map((row) => row[1]));
  if (!finite(total) || total <= 0) return unavailable("INVALID_INPUT", "The positive weight total must be finite.", positive.map((row) => row[0]));
  const ids = positive.map((row) => row[0]); const weights = positive.map((row) => row[1] / total);
  const residual = 1 - neumaierSum(weights);
  if (Math.abs(residual) > WEIGHT_TOLERANCE) return unavailable("INVALID_INPUT", "Normalized weights did not sum to one within tolerance.", ids);
  if (residual) weights[weights.length - 1] += residual;
  return { status: "OK", asset_ids: ids, normalized_weights: weights, raw_weight_total: total, normalization_applied: Math.abs(total - 1) > WEIGHT_TOLERANCE, quality_flags: [] };
}

export function concentrationMetrics(ids: readonly string[], weights: readonly number[], topN: readonly number[] = []): Available<{
  asset_ids: string[]; normalized_weights: number[]; hhi: number; effective_holdings: number; top_n_concentration?: Record<string, number>;
}> | Unavailable {
  const error = validateWeights(ids, weights);
  if (error) return unavailable("INVALID_INPUT", error, [...ids]);
  const hhi = neumaierSum(weights.map((weight) => weight * weight));
  const result: Available<{ asset_ids: string[]; normalized_weights: number[]; hhi: number; effective_holdings: number; top_n_concentration?: Record<string, number> }> =
    { status: "OK", asset_ids: [...ids], normalized_weights: [...weights], hhi, effective_holdings: 1 / hhi, quality_flags: [] };
  if (topN.length) {
    const descending = [...weights].sort((a, b) => b - a);
    result.top_n_concentration = Object.fromEntries([...new Set(topN)].filter((n) => n > 0).sort((a, b) => a - b).map((n) => [String(n), neumaierSum(descending.slice(0, n))]));
  }
  return result;
}

export function portfolioRisk(ids: readonly string[], weights: readonly number[], covariance: readonly (readonly number[])[]): Available<{
  covariance_times_weights: number[]; portfolio_variance: number; portfolio_volatility: number;
  marginal_contribution: number[]; component_contribution: number[]; percentage_contribution: number[]; diversification_ratio: number;
}> | Unavailable {
  const error = validateWeights(ids, weights) ?? validateMatrix(ids, covariance);
  if (error) return unavailable("INVALID_INPUT", error, [...ids], { covariance: "finite symmetric square matrix", weights_sum: 1 }, { asset_count: ids.length });
  const negative = ids.filter((_, index) => covariance[index][index] < -1e-15);
  if (negative.length) return unavailable("INVALID_INPUT", "Covariance diagonal cannot contain negative variances.", negative);
  const covarianceTimesWeights = covariance.map((row) => compensatedDot(row, weights));
  let variance = compensatedDot(weights, covarianceTimesWeights);
  if (variance < -1e-15) return unavailable("INVALID_INPUT", "The covariance input produces a materially negative portfolio variance.", [...ids]);
  variance = Math.max(variance, 0);
  const volatility = Math.sqrt(variance);
  if (volatility <= 1e-15) return unavailable("ZERO_PORTFOLIO_VOLATILITY", "Risk contributions are unavailable for a zero-volatility portfolio.", [...ids]);
  const marginal = covarianceTimesWeights.map((value) => value / volatility);
  const component = marginal.map((value, index) => weights[index] * value);
  const percentage = component.map((value) => value / volatility);
  const assetVolatility = ids.map((_, index) => Math.sqrt(Math.max(covariance[index][index], 0)));
  return {
    status: "OK", covariance_times_weights: covarianceTimesWeights, portfolio_variance: variance, portfolio_volatility: volatility,
    marginal_contribution: marginal, component_contribution: component, percentage_contribution: percentage,
    diversification_ratio: neumaierSum(weights.map((weight, index) => weight * assetVolatility[index])) / volatility, quality_flags: [],
  };
}

export function simpleReturns(dates: readonly string[], values: readonly (readonly number[])[], excludeGaps = true): Available<{ dates: string[]; returns: number[][]; excluded_gap_end_dates: string[] }> | Unavailable {
  if (dates.length !== values.length || dates.length < 2) return unavailable("INSUFFICIENT_OBSERVATIONS", "At least two aligned valuation dates are required.", [], { aligned_valuations_minimum: 2 }, { aligned_valuations: dates.length });
  const width = values[0]?.length ?? 0;
  if (!width || values.some((row) => row.length !== width)) return unavailable("INVALID_INPUT", "Aligned values must be a non-empty rectangular matrix.");
  const returns: number[][] = []; const outputDates: string[] = []; const excluded: string[] = [];
  for (let index = 1; index < dates.length; index += 1) {
    const gap = daysBetween(dates[index - 1], dates[index]);
    if (!finite(gap) || gap <= 0) return unavailable("INVALID_INPUT", "Dates must be unique and strictly ascending.");
    if (gap > 7 && excludeGaps) { excluded.push(dates[index]); continue; }
    if (values[index].some((value, column) => !finite(value) || !finite(values[index - 1][column]) || value <= 0 || values[index - 1][column] <= 0)) return unavailable("INVALID_INPUT", "Aligned values must be finite and positive.");
    returns.push(values[index].map((value, column) => value / values[index - 1][column] - 1)); outputDates.push(dates[index]);
  }
  return { status: "OK", dates: outputDates, returns, excluded_gap_end_dates: excluded, quality_flags: excluded.length ? ["GAPPED_SERIES"] : [] };
}

export function sampleCovariance(ids: readonly string[], returns: readonly (readonly number[])[], minimum = 60, maximum = 252): Available<{
  asset_ids: string[]; means_daily: number[]; covariance_daily: number[][]; covariance_annual: number[][]; volatility_annual: number[]; observation_count: number;
}> | Unavailable {
  if (!canonicalIds(ids)) return unavailable("INVALID_INPUT", "Asset identifiers must be unique and in canonical order.", [...ids]);
  const selected = returns.slice(-maximum); const width = ids.length;
  if (selected.some((row) => row.length !== width || row.some((value) => !finite(value)))) return unavailable("INVALID_INPUT", "Return observations must be a finite rectangular matrix matching asset identifiers.", [...ids]);
  if (selected.length < Math.max(2, minimum)) return unavailable("INSUFFICIENT_OBSERVATIONS", "Insufficient aligned returns for sample risk statistics.", [...ids], { aligned_returns_minimum: Math.max(2, minimum) }, { aligned_returns: selected.length });
  const columns = ids.map((_, column) => selected.map((row) => row[column]));
  const means = columns.map((column) => neumaierSum(column) / selected.length);
  const daily = ids.map(() => ids.map(() => 0));
  for (let row = 0; row < width; row += 1) for (let column = row; column < width; column += 1) {
    const value = neumaierSum(columns[row].map((item, index) => (item - means[row]) * (columns[column][index] - means[column]))) / (selected.length - 1);
    daily[row][column] = value; daily[column][row] = value;
  }
  const annual = daily.map((row) => row.map((value) => value * 252));
  return { status: "OK", asset_ids: [...ids], means_daily: means, covariance_daily: daily, covariance_annual: annual, volatility_annual: ids.map((_, index) => Math.sqrt(Math.max(annual[index][index], 0))), observation_count: selected.length, quality_flags: selected.length <= 251 ? ["LOW_SAMPLE"] : [] };
}

export function correlationFromCovariance(ids: readonly string[], covariance: readonly (readonly number[])[]): Available<{ asset_ids: string[]; correlation: number[][] }> | Unavailable {
  const error = !canonicalIds(ids) ? "Asset identifiers must be unique and in canonical order." : validateMatrix(ids, covariance);
  if (error) return unavailable("INVALID_INPUT", error, [...ids]);
  const deviations = ids.map((_, index) => Math.sqrt(Math.max(covariance[index][index], 0)));
  const degenerate = ids.filter((_, index) => deviations[index] <= 1e-15);
  if (degenerate.length) return unavailable("DEGENERATE_CORRELATION", "Correlation is unavailable for zero-volatility assets.", degenerate);
  const correlation = ids.map((_, row) => ids.map((__, column) => row === column ? 1 : covariance[row][column] / (deviations[row] * deviations[column])));
  if (correlation.some((row) => row.some((value) => value < -1 - 1e-12 || value > 1 + 1e-12))) return unavailable("INVALID_INPUT", "Covariance implies a correlation outside [-1, 1].", [...ids]);
  return { status: "OK", asset_ids: [...ids], correlation: correlation.map((row) => row.map((value) => Math.max(-1, Math.min(1, value)))), quality_flags: [] };
}

export function behaviourClusters(ids: readonly string[], weights: readonly number[], correlation: readonly (readonly number[])[], observationCount: number): Available<{
  holding_count: number; cluster_count: number; largest_cluster_capital_share: number; clusters: { cluster_id: string; asset_ids: string[]; capital_weight: number }[];
}> | Unavailable {
  const error = validateWeights(ids, weights) ?? validateMatrix(ids, correlation);
  if (error) return unavailable("INVALID_INPUT", error, [...ids]);
  if (ids.length < 3) return unavailable("INSUFFICIENT_HOLDINGS", "Behaviour clustering requires at least three positive-weight holdings.", [...ids], { positive_weight_holdings_minimum: 3 }, { positive_weight_holdings: ids.length });
  if (observationCount < 60) return unavailable("INSUFFICIENT_OBSERVATIONS", "Behaviour clustering requires at least 60 aligned returns.", [...ids], { aligned_returns_minimum: 60 }, { aligned_returns: observationCount });
  if (correlation.some((row, index) => Math.abs(row[index] - 1) > 1e-12 || row.some((value) => value < -1 - 1e-12 || value > 1 + 1e-12))) return unavailable("INVALID_INPUT", "Correlation must have a unit diagonal and values in [-1, 1].", [...ids]);
  const positions = new Map(ids.map((id, index) => [id, index])); let clusters = ids.map((id) => [id]);
  for (;;) {
    const candidates: { distance: number; left: string[]; right: string[]; li: number; ri: number }[] = [];
    for (let li = 0; li < clusters.length; li += 1) for (let ri = li + 1; ri < clusters.length; ri += 1) {
      const left = clusters[li]; const right = clusters[ri];
      if (left.every((a) => right.every((b) => correlation[positions.get(a)!][positions.get(b)!] >= CORRELATION_THRESHOLD))) {
        const distance = Math.max(...left.flatMap((a) => right.map((b) => Math.sqrt(0.5 * (1 - Math.max(-1, Math.min(1, correlation[positions.get(a)!][positions.get(b)!])))))));
        candidates.push({ distance, left, right, li, ri });
      }
    }
    if (!candidates.length) break;
    candidates.sort((a, b) => a.distance - b.distance || a.left.join("|").localeCompare(b.left.join("|")) || a.right.join("|").localeCompare(b.right.join("|")));
    const selected = candidates[0];
    clusters = clusters.filter((_, index) => index !== selected.li && index !== selected.ri);
    clusters.push([...selected.left, ...selected.right].sort()); clusters.sort((a, b) => a.join("|").localeCompare(b.join("|")));
  }
  const weightByAsset = new Map(ids.map((id, index) => [id, weights[index]]));
  const weighted = clusters.map((cluster) => ({ cluster, weight: neumaierSum(cluster.map((id) => weightByAsset.get(id)!)) })).sort((a, b) => b.weight - a.weight || a.cluster.join("|").localeCompare(b.cluster.join("|")));
  const output = weighted.map((item, index) => ({ cluster_id: "BEHAVIOUR_GROUP_" + (index + 1), asset_ids: item.cluster, capital_weight: item.weight }));
  return { status: "OK", holding_count: ids.length, cluster_count: output.length, largest_cluster_capital_share: output[0].capital_weight, clusters: output, quality_flags: observationCount <= 251 ? ["LOW_SAMPLE"] : [] };
}

function validDates(dates: readonly string[]) {
  return dates.every((day, index) => /^\d{4}-\d{2}-\d{2}$/.test(day) && finite(Date.parse(day + "T00:00:00Z")) && (index === 0 || day > dates[index - 1]));
}
function daysBetween(start: string, end: string) { return (Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) / 86_400_000; }

export function drawdownAnalysis(dates: readonly string[], wealth: readonly number[]): Available<Record<string, unknown>> | Unavailable {
  if (dates.length !== wealth.length || dates.length < 3) return unavailable("INSUFFICIENT_OBSERVATIONS", "Drawdown analysis requires at least three aligned values.", [], { aligned_values_minimum: 3 }, { aligned_values: wealth.length });
  if (!validDates(dates)) return unavailable("INVALID_INPUT", "Dates must be strictly ascending.");
  if (wealth.some((value) => !finite(value) || value <= 0)) return unavailable("INVALID_INPUT", "Wealth values must be finite and positive.");
  const peaks: number[] = []; let peak = wealth[0];
  for (const value of wealth) { peak = Math.max(peak, value); peaks.push(peak); }
  const drawdown = wealth.map((value, index) => value / peaks[index] - 1); const minimum = Math.min(...drawdown);
  const trough = drawdown.findIndex((value) => Math.abs(value - minimum) <= 1e-12); const associatedPeak = peaks[trough]; let peakIndex = 0;
  for (let index = 0; index <= trough; index += 1) if (Math.abs(wealth[index] - associatedPeak) <= 1e-12 * Math.abs(associatedPeak)) peakIndex = index;
  const recovery = wealth.findIndex((value, index) => index > trough && value >= associatedPeak * (1 - 1e-12));
  const periods: Record<string, unknown>[] = []; let cursor = 0;
  while (cursor < wealth.length) {
    if (wealth[cursor] >= peaks[cursor] * (1 - 1e-12)) { cursor += 1; continue; }
    const start = cursor; const origin = peaks[start]; let originIndex = 0;
    for (let index = 0; index < start; index += 1) if (Math.abs(wealth[index] - origin) <= 1e-12 * Math.abs(origin)) originIndex = index;
    let end = -1; for (let index = start + 1; index < wealth.length; index += 1) if (wealth[index] >= origin * (1 - 1e-12)) { end = index; break; }
    const terminal = end >= 0 ? end : wealth.length - 1; const localMinimum = Math.min(...drawdown.slice(start, terminal + 1));
    const localTrough = drawdown.findIndex((value, index) => index >= start && index <= terminal && Math.abs(value - localMinimum) <= 1e-12);
    periods.push({ originating_peak_date: dates[originIndex], start_date: dates[start], trough_date: dates[localTrough], end_date: end >= 0 ? dates[end] : null, depth: localMinimum, underwater_calendar_days_from_start: daysBetween(dates[start], dates[terminal]), underwater_observations_from_start: terminal - start });
    cursor = end >= 0 ? terminal + 1 : wealth.length;
  }
  const result: Record<string, unknown> = {
    status: "OK", drawdown, maximum_drawdown: minimum, peak_date: dates[peakIndex], trough_date: dates[trough],
    time_to_trough_calendar_days: daysBetween(dates[peakIndex], dates[trough]), time_to_trough_observations: trough - peakIndex,
    recovery_status: recovery >= 0 ? "RECOVERED" : "NOT_RECOVERED_BY_AS_OF", recovery_date: recovery >= 0 ? dates[recovery] : null,
    underwater_periods: periods, quality_flags: [],
  };
  if (recovery >= 0) { result.recovery_time_calendar_days = daysBetween(dates[trough], dates[recovery]); result.recovery_time_observations = recovery - trough; }
  else { result.duration_so_far_calendar_days = daysBetween(dates[trough], dates.at(-1)!); result.duration_so_far_observations = wealth.length - 1 - trough; }
  return result as Available<Record<string, unknown>>;
}

export function staticSharePath(ids: readonly string[], weights: readonly number[], dates: readonly string[], values: readonly (readonly number[])[], includeDrawdown = true): Available<Record<string, unknown>> | Unavailable {
  const error = validateWeights(ids, weights);
  if (error) return unavailable("INVALID_INPUT", error, [...ids]);
  if (dates.length !== values.length || dates.length < 2 || values.some((row) => row.length !== ids.length)) return unavailable("INSUFFICIENT_OBSERVATIONS", "Static-share paths require at least two aligned rectangular value rows.", [...ids]);
  if (!validDates(dates) || values.some((row) => row.some((value) => !finite(value) || value <= 0))) return unavailable("INVALID_INPUT", "Static-share dates must ascend and values must be finite and positive.", [...ids]);
  const quantities = weights.map((weight, index) => weight / values[0][index]);
  const wealth = values.map((row) => neumaierSum(row.map((value, index) => value * quantities[index])));
  const result: Record<string, unknown> = { status: "OK", quantities, wealth, period_returns: wealth.slice(1).map((value, index) => value / wealth[index] - 1), total_return: wealth.at(-1)! - 1 };
  if (includeDrawdown && wealth.length >= 3) {
    const drawdown = drawdownAnalysis(dates, wealth);
    if (drawdown.status === "OK") Object.assign(result, { maximum_drawdown: drawdown.maximum_drawdown, peak_date: drawdown.peak_date, trough_date: drawdown.trough_date, recovery_date: drawdown.recovery_date });
  }
  result.quality_flags = []; return result as Available<Record<string, unknown>>;
}

function finishWeights(weights: number[]) {
  const residual = 1 - neumaierSum(weights); const positive = weights.map((weight, index) => weight > 0 ? index : -1).filter((index) => index >= 0);
  if (Math.abs(residual) > WEIGHT_TOLERANCE || !positive.length) throw new Error("counterfactual weights do not normalize within tolerance");
  weights[positive.at(-1)!] += residual; return weights;
}
export function removeHolding(ids: readonly string[], weights: readonly number[], assetId: string): Available<{ asset_ids: string[]; normalized_weights: number[] }> | Unavailable {
  const error = validateWeights(ids, weights); if (error) return unavailable("INVALID_INPUT", error, [...ids]);
  const selected = ids.indexOf(assetId); if (selected < 0) return unavailable("INVALID_COUNTERFACTUAL", "Cannot remove unknown holding " + assetId + ".", [assetId]);
  const otherTotal = neumaierSum(weights.filter((weight, index) => index !== selected && weight > 0));
  if (!otherTotal) return unavailable("INVALID_COUNTERFACTUAL", "A sole holding cannot be removed without another explicit holding.", [assetId]);
  return { status: "OK", asset_ids: [...ids], normalized_weights: finishWeights(weights.map((weight, index) => index === selected ? 0 : weight / otherTotal)), quality_flags: [] };
}
export function changeHolding(ids: readonly string[], weights: readonly number[], assetId: string, target: number): Available<{ asset_ids: string[]; normalized_weights: number[] }> | Unavailable {
  const error = validateWeights(ids, weights); if (error) return unavailable("INVALID_INPUT", error, [...ids]);
  const selected = ids.indexOf(assetId);
  if (selected < 0 || !finite(target) || target < 0 || target > 1) return unavailable("INVALID_COUNTERFACTUAL", "The holding must exist and its target normalized weight must lie in [0, 1].", [assetId]);
  const otherTotal = neumaierSum(weights.filter((weight, index) => index !== selected && weight > 0));
  if (!otherTotal && target < 1) return unavailable("INVALID_COUNTERFACTUAL", "A sole holding cannot be reduced without another explicit holding.", [assetId]);
  return { status: "OK", asset_ids: [...ids], normalized_weights: finishWeights(weights.map((weight, index) => index === selected ? target : otherTotal ? weight * (1 - target) / otherTotal : weight)), quality_flags: [] };
}

export function directStress(ids: readonly string[], weights: readonly number[], shocks: readonly number[]): Available<{ asset_contributions: number[]; portfolio_stress_return: number; stressed_portfolio_value_per_unit: number }> | Unavailable {
  const error = validateWeights(ids, weights);
  if (error || shocks.length !== ids.length || shocks.some((shock) => !finite(shock) || shock < -1)) return unavailable("INVALID_INPUT", error ?? "Resolved direct shocks must match assets and be finite values at least -1.", [...ids]);
  const contributions = weights.map((weight, index) => weight * shocks[index]); const stressReturn = neumaierSum(contributions);
  return { status: "OK", asset_contributions: contributions, portfolio_stress_return: stressReturn, stressed_portfolio_value_per_unit: 1 + stressReturn, quality_flags: [] };
}
export function covarianceStress(ids: readonly string[], weights: readonly number[], volatility: readonly number[], correlation: readonly (readonly number[])[], multipliers: readonly number[], lambda: number): Available<Record<string, unknown>> | Unavailable {
  const error = validateWeights(ids, weights) ?? validateMatrix(ids, correlation);
  if (error || volatility.length !== ids.length || multipliers.length !== ids.length || volatility.some((value) => !finite(value) || value < 0) || multipliers.some((value) => !finite(value) || value < 0) || !finite(lambda) || lambda < 0 || lambda > 1) return unavailable("INVALID_INPUT", error ?? "Volatility stress inputs are invalid.", [...ids]);
  const stressedVolatility = volatility.map((value, index) => value * multipliers[index]);
  const stressedCorrelation = correlation.map((row, rowIndex) => row.map((value, columnIndex) => rowIndex === columnIndex ? 1 : (1 - lambda) * value + lambda));
  const stressedCovariance = stressedCorrelation.map((row, rowIndex) => row.map((value, columnIndex) => stressedVolatility[rowIndex] * value * stressedVolatility[columnIndex]));
  const variance = Math.max(0, compensatedDot(weights, stressedCovariance.map((row) => compensatedDot(row, weights))));
  return { status: "OK", stressed_asset_volatility: stressedVolatility, stressed_correlation: stressedCorrelation, stressed_covariance: stressedCovariance, stressed_portfolio_variance: variance, stressed_portfolio_volatility: Math.sqrt(variance), quality_flags: [] };
}

export function historicalAssetAvailability(ids: string[], inceptionDates: Record<string, string>, episodeId: string, proxyOptIn: boolean): Available<{ asset_ids: string[] }> | Unavailable {
  const window = HISTORICAL_EPISODES[episodeId as EpisodeId];
  if (!window) return unavailable("INVALID_INPUT", "Unknown historical episode " + episodeId + ".");
  if (ids.some((id) => !inceptionDates[id] || !finite(Date.parse(inceptionDates[id] + "T00:00:00Z")))) return unavailable("INVALID_INPUT", "Every positive-weight asset requires a valid inception date.", ids);
  const missing = ids.filter((id) => inceptionDates[id] > window.start).sort();
  if (missing.length && proxyOptIn) return unavailable("INVALID_INPUT", "Proxy opt-in alone is insufficient without an explicit identity mapping and metadata.", missing, { proxy_asset_id: "present and distinct", requested_asset_id: "present", episode_context: episodeId, proxy_metadata: "complete" }, { proxy_opt_in: true, proxy_metadata: false });
  if (missing.length) return unavailable("ASSET_NOT_EXIST", missing[0] + " did not exist during " + episodeId + "; no proxy was authorized.", missing, { coverage_start: window.start, coverage_end: window.end, proxy_rule: "EXPLICIT_USER_OPT_IN" }, { inception_date: inceptionDates[missing[0]], proxy_opt_in: false });
  return { status: "OK", asset_ids: [...ids].sort(), quality_flags: [] };
}

type AlignedHistory = Available<{
  dates: string[];
  valuesByAsset: Map<string, Map<string, number>>;
}>;

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateAndAlignHistory(
  ids: readonly string[],
  history: readonly HistoryObservation[],
  window?: { start: string; end: string },
): AlignedHistory | Unavailable {
  const relevant = history.filter((row) => ids.includes(row.assetId));
  const missingAssets = ids.filter((id) => !relevant.some((row) => row.assetId === id));
  if (missingAssets.length) {
    return unavailable(
      "MISSING_EPISODE_COVERAGE",
      "Historical data is missing for one or more positive-weight holdings; no asset was excluded and weights were not renormalized.",
      missingAssets,
      { positive_weight_asset_series: "complete" },
      { missing_asset_ids: missingAssets },
    );
  }
  if (relevant.some((row) => !finite(row.value) || row.value <= 0 || !isIsoDate(row.date))) {
    return unavailable(
      "INVALID_INPUT",
      "Historical dates and values must be valid, finite, and positive.",
      [...ids],
      { date: "valid YYYY-MM-DD", value: "finite number > 0" },
      { invalid_history_row: true },
    );
  }

  const valuesByAsset = new Map<string, Map<string, number>>();
  const dateGridByAsset = new Map<string, string[]>();
  for (const id of ids) {
    const rows = relevant.filter((row) => row.assetId === id);
    const seen = new Set<string>();
    let previousDate: string | undefined;
    for (const row of rows) {
      if (seen.has(row.date)) {
        return unavailable(
          "INVALID_INPUT",
          "Historical series contain a duplicate asset/date observation.",
          [id],
          { asset_date: "unique" },
          { duplicate_asset_dates: [{ asset_id: id, date: row.date }] },
        );
      }
      if (previousDate !== undefined && row.date <= previousDate) {
        return unavailable(
          "INVALID_INPUT",
          "Historical observations for each asset must be strictly ascending.",
          [id],
          { date_order: "strictly ascending within each asset" },
          { previous_date: previousDate, observed_date: row.date },
        );
      }
      seen.add(row.date);
      previousDate = row.date;
    }
    const selectedRows = window
      ? rows.filter((row) => row.date >= window.start && row.date <= window.end)
      : rows;
    dateGridByAsset.set(id, selectedRows.map((row) => row.date));
    valuesByAsset.set(id, new Map(selectedRows.map((row) => [row.date, row.value])));
  }

  const unionDates = [...new Set([...dateGridByAsset.values()].flat())].sort();
  const missingDatesByAsset = ids
    .map((id) => ({
      asset_id: id,
      missing_dates: unionDates.filter((date) => !valuesByAsset.get(id)!.has(date)),
    }))
    .filter((item) => item.missing_dates.length > 0);
  if (missingDatesByAsset.length) {
    return unavailable(
      "MISSING_EPISODE_COVERAGE",
      "A required observation is missing from at least one positive-weight asset; no date, asset, or weight was silently excluded.",
      missingDatesByAsset.map((item) => item.asset_id),
      { valuation_date_grid: "identical across positive-weight assets" },
      { missing_dates_by_asset: missingDatesByAsset },
    );
  }
  return { status: "OK", dates: unionDates, valuesByAsset, quality_flags: [] };
}

export type Analysis = {
  status: "OK"; normalization: ReturnType<typeof normalizeWeights>; concentration: ReturnType<typeof concentrationMetrics>;
  history: ({ status: "OK"; dates: string[]; values: number[][]; covariance: ReturnType<typeof sampleCovariance>;
    correlation: ReturnType<typeof correlationFromCovariance>; risk: ReturnType<typeof portfolioRisk>;
    clustering: ReturnType<typeof behaviourClusters>; path: ReturnType<typeof staticSharePath>;
    drawdown: ReturnType<typeof drawdownAnalysis>; currency: string; returnBasis: ReturnBasis; }) | Unavailable;
};

export function analyzePortfolio(holdings: readonly Holding[], history: readonly HistoryObservation[]): Analysis | Unavailable {
  const normalization = normalizeWeights(holdings); if (normalization.status !== "OK") return normalization;
  const concentration = concentrationMetrics(normalization.asset_ids, normalization.normalized_weights, [1, 2, 3]);
  if (concentration.status !== "OK") return concentration;
  if (!history.length) return { status: "OK", normalization, concentration, history: unavailable("MISSING_EPISODE_COVERAGE", "No local historical behavior data was supplied.", normalization.asset_ids, { history: "local total-return series" }, { history_supplied: false }) };
  const relevant = history.filter((row) => normalization.asset_ids.includes(row.assetId));
  const aligned = validateAndAlignHistory(normalization.asset_ids, history);
  if (aligned.status !== "OK") {
    return aligned.reason_code === "INVALID_INPUT"
      ? aligned
      : { status: "OK", normalization, concentration, history: aligned };
  }
  const currencies = new Set(relevant.map((row) => row.currency)); const bases = new Set(relevant.map((row) => row.returnBasis));
  if (currencies.size !== 1) return { status: "OK", normalization, concentration, history: unavailable("FX_UNAVAILABLE", "Historical series use different currencies and no explicit FX series was supplied.", normalization.asset_ids, { reporting_currency: "one consistent currency" }, { currencies: [...currencies].sort() }) };
  if (bases.has("UNADJUSTED_PRICE")) return { status: "OK", normalization, concentration, history: unavailable("UNADJUSTED_PRICE", "Unadjusted price history is not eligible for portfolio analysis.", normalization.asset_ids) };
  if (bases.size !== 1 || !bases.has("TOTAL_RETURN")) return { status: "OK", normalization, concentration, history: unavailable("UNAVAILABLE_PRICE_ONLY", "Price-only or mixed-basis history is not treated as total-return history without explicit consent.", normalization.asset_ids) };
  const dates = aligned.dates.slice(-253);
  const values = dates.map((date) => normalization.asset_ids.map((id) => aligned.valuesByAsset.get(id)!.get(date)!));
  const returns = simpleReturns(dates, values); if (returns.status !== "OK") return { status: "OK", normalization, concentration, history: returns };
  const covariance = sampleCovariance(normalization.asset_ids, returns.returns); if (covariance.status !== "OK") return { status: "OK", normalization, concentration, history: covariance };
  const correlation = correlationFromCovariance(normalization.asset_ids, covariance.covariance_daily); if (correlation.status !== "OK") return { status: "OK", normalization, concentration, history: correlation };
  const risk = portfolioRisk(normalization.asset_ids, normalization.normalized_weights, covariance.covariance_annual);
  const clustering = behaviourClusters(normalization.asset_ids, normalization.normalized_weights, correlation.correlation, covariance.observation_count);
  const path = staticSharePath(normalization.asset_ids, normalization.normalized_weights, dates, values);
  const drawdown = path.status === "OK" ? drawdownAnalysis(dates, path.wealth as number[]) : path;
  return { status: "OK", normalization, concentration, history: { status: "OK", dates, values, covariance, correlation, risk, clustering, path, drawdown, currency: [...currencies][0], returnBasis: "TOTAL_RETURN" } };
}

export function historicalReplay(holdings: readonly Holding[], history: readonly HistoryObservation[], replayWindowId: ReplayWindowId): Available<Record<string, unknown>> | Unavailable {
  const normalized = normalizeWeights(holdings); if (normalized.status !== "OK") return normalized;
  const window = HISTORICAL_REPLAY_WINDOWS[replayWindowId];
  const episodeId: EpisodeId = replayWindowId === "2022_EQUITY_DRAWDOWN_DIAGNOSTIC" ? "INFLATION_RATES_2022" : replayWindowId;
  const relevant = history.filter((row) => normalized.asset_ids.includes(row.assetId));
  const aligned = validateAndAlignHistory(normalized.asset_ids, history, window);
  if (aligned.status !== "OK") return aligned;
  const inceptions = Object.fromEntries(normalized.asset_ids.map((id) => [id, relevant.find((row) => row.assetId === id)?.inceptionDate ?? relevant.filter((row) => row.assetId === id).map((row) => row.date).sort()[0]]));
  const availability = historicalAssetAvailability(normalized.asset_ids, inceptions, episodeId, false); if (availability.status !== "OK") return availability;
  const currencies = new Set(relevant.map((row) => row.currency)); const bases = new Set(relevant.map((row) => row.returnBasis));
  if (currencies.size !== 1) return unavailable("FX_UNAVAILABLE", "Historical replay requires a consistent reporting currency or explicit FX series.", normalized.asset_ids);
  if (bases.size !== 1 || !bases.has("TOTAL_RETURN")) return unavailable("UNAVAILABLE_PRICE_ONLY", "Historical replay requires one documented total-return basis; no approximation was authorized.", normalized.asset_ids);
  const nearStart = aligned.dates.find((day) => daysBetween(window.start, day) >= 0 && daysBetween(window.start, day) <= 5);
  const nearEnd = [...aligned.dates].reverse().find((day) => daysBetween(day, window.end) >= 0 && daysBetween(day, window.end) <= 5);
  if (!nearStart || !nearEnd || nearStart >= nearEnd) return unavailable("MISSING_EPISODE_COVERAGE", "Complete-case data does not cover both boundaries of " + episodeId + ".", normalized.asset_ids, { start: window.start, end: window.end, boundary_alignment_calendar_days: 5 }, { first_complete_case_date: aligned.dates[0] ?? null, last_complete_case_date: aligned.dates.at(-1) ?? null });
  const dates = aligned.dates.filter((day) => day >= nearStart && day <= nearEnd); const gaps = dates.slice(1).filter((day, index) => daysBetween(dates[index], day) > 7);
  if (gaps.length) return unavailable("GAPPED_SERIES", "Historical replay " + episodeId + " contains a valuation gap over seven calendar days.", normalized.asset_ids, { maximum_gap_calendar_days: 7 }, { gap_end_dates: gaps });
  const values = dates.map((day) => normalized.asset_ids.map((id) => aligned.valuesByAsset.get(id)!.get(day)!));
  const path = staticSharePath(normalized.asset_ids, normalized.normalized_weights, dates, values, false); if (path.status !== "OK") return path;
  const drawdown = drawdownAnalysis(dates, path.wealth as number[]); if (drawdown.status !== "OK") return drawdown;
  return {
    status: "OK", semantics: "HISTORICAL_REPLAY", scenario_registry_version: SCENARIO_REGISTRY_VERSION, episode_id: episodeId, replay_window_id: replayWindowId,
    requested_window: { start: window.start, end: window.end }, aligned_window: { start: nearStart, end: nearEnd },
    asset_ids: normalized.asset_ids, normalized_weights: normalized.normalized_weights, dates, wealth: path.wealth, period_returns: path.period_returns,
    total_return: path.total_return, drawdown, observation_count: dates.length, date_range: [dates[0], dates.at(-1)],
    units: { wealth: "per_initial_portfolio_unit", period_returns: "simple_arithmetic_return", total_return: "simple_arithmetic_return", drawdown: "simple_arithmetic_return" },
    return_basis: "TOTAL_RETURN", reporting_currency: [...currencies][0],
    limitations: ["Bundled demonstration data is deterministic and is not current market data."],
    provenance: Object.fromEntries(normalized.asset_ids.map((id) => [id, relevant.find((row) => row.assetId === id)!.provenance])),
    proxy_metadata: [], quality_flags: nearStart !== window.start || nearEnd !== window.end ? ["BOUNDARY_ALIGNED"] : [],
  };
}
