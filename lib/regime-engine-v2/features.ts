import { GROUPS, PRICE_BASIS, REGISTRY, TICKERS } from "./contract.ts";
import { averageCorrelation, correlation, finite, mean, positive, variance } from "./math.ts";
import { monthlyContracts } from "./core.ts";
import { admissible, indexRows, windowRows, windowValues } from "./temporal.ts";
import type { CoreFeatures, CoreInput, FeatureEvidence, Packet, ReplayClass, Row } from "./types.ts";
export function buildEvidence(raw: CoreInput, f: CoreFeatures, btc: Packet | undefined, gld: Packet | undefined, replay: ReplayClass, contexts: { vix?: CoreInput; btc?: CoreInput; gld?: CoreInput } = {}): FeatureEvidence[] {
  const values = new Map<string, unknown>(), reasons = new Map<string, string[]>();
  const set = (key: string, value: unknown, why: string[] = []) => { values.set(key, value); reasons.set(key, why); };
  for (const [id, value] of Object.entries({ eq_returns_5: f.returns_5, eq_returns_21: f.returns_21, eq_positive_5: f.positive_5, eq_positive_21: f.positive_21, eq_growth_21: f.group_returns_21?.growth, eq_cyclical_21: f.group_returns_21?.cyclical, eq_defensive_21: f.group_returns_21?.defensive, eq_leadership_gap: f.leadership_gap, vix_level: f.vix, vix_momentum_1: f.jump_1, vix_momentum_5: f.jump_5, vx_slope_12: f.slope, corr_mean_21: f.rho21, corr_mean_63: f.rho63, corr_window_spread: f.corr_spread })) set(id, value ?? null);
  const panels = (n: number, context = raw): number[][] | null => { const x = TICKERS.map(t => windowValues(raw.equity[t], context, n, "adjusted_close", PRICE_BASIS)); return x.every((v): v is number[] => v !== null) ? x : null; };
  const p64 = panels(64), p200 = panels(200);
  set("eq_returns_63", p64 ? Object.fromEntries(TICKERS.map((t, i) => [t, 100 * (p64[i][63] / p64[i][0] - 1)])) : null);
  set("eq_above_ma200", p200 ? p200.filter(v => v[199] > mean(v)).length : null);
  for (const [id, ticker] of [["eq_rsp_spy_21", "RSP"], ["eq_iwm_spy_21", "IWM"]]) {
    const a = windowValues(raw.equity[ticker], raw, 22, "adjusted_close", PRICE_BASIS), b = windowValues(raw.equity.SPY, raw, 22, "adjusted_close", PRICE_BASIS);
    set(id, a && b ? 100 * ((a[21] / b[21]) / (a[0] / b[0]) - 1) : null);
  }
  for (const [id, v] of [["eq_dispersion_5", f.returns_5], ["eq_dispersion_21", f.returns_21]] as const) set(id, v ? Math.max(...Object.values(v)) - Math.min(...Object.values(v)) : null);
  const vc = contexts.vix ?? raw;
  for (const n of [1, 5, 21]) { const v = windowValues(raw.vix, vc, n + 1, "value"); set(`vix_change_points_${n}`, v ? v[n] - v[0] : null); }
  const start = raw.vix?.declaredStart;
  const prefix = start && vc.expectedSessions.includes(start) ? vc.expectedSessions.filter(d => d >= start) : [];
  const vixPopulation = prefix.length ? windowValues(raw.vix, { ...vc, expectedSessions: prefix }, prefix.length, "value") : null;
  set("vix_percentile", vixPopulation ? 100 * vixPopulation.filter(v => v <= vixPopulation[vixPopulation.length - 1]).length / vixPopulation.length : null, vixPopulation ? [] : ["DECLARED_PREFIX_UNAVAILABLE"]);
  const contracts = monthlyContracts(raw.vx, raw);
  set("vx_contracts", contracts && positive(contracts[0].settlement) && positive(contracts[1].settlement) ? structuredClone(contracts) : null);
  for (const [n, suffix] of [[1, "12"], [2, "13"]] as const) {
    const a = contracts?.[0]?.settlement, b = contracts?.[n]?.settlement;
    set(`vx_spread_${suffix}`, positive(a) && positive(b) ? b - a : null);
    if (n === 2) set("vx_slope_13", positive(a) && positive(b) ? 100 * (b / a - 1) : null);
  }
  const oldContext = { ...raw, targetSession: raw.expectedSessions.at(-22) ?? "", expectedSessions: raw.expectedSessions.slice(0, -21) };
  const old = panels(22, oldContext);
  const oldRho = old ? averageCorrelation(old.map(x => x.slice(1).map((v, i) => v / x[i] - 1))) : null;
  set("corr_change_21", f.rho21 !== null && oldRho !== null ? f.rho21 - oldRho : null);
  if (p64) {
    const r = p64.map(x => x.slice(-22).slice(1).map((v, i) => v / x[i + 42] - 1));
    const group = (tickers: readonly string[]) => Array.from({ length: 21 }, (_, i) => mean(tickers.map(t => r[TICKERS.indexOf(t as typeof TICKERS[number])][i])));
    set("corr_defensive_growth_21", correlation(group(GROUPS.defensive), group(GROUPS.growth)));
  }
  // The full declared common prefix is necessary for a reproducible EWMA seed.
  const starts = TICKERS.map(t => raw.equity[t]?.declaredStart);
  const commonStart = starts.every(Boolean) ? (starts as string[]).sort().at(-1) : undefined;
  const equityPrefix = commonStart && raw.expectedSessions.includes(commonStart) ? raw.expectedSessions.filter(d => d >= commonStart) : [];
  const full = equityPrefix.length >= 22 ? panels(equityPrefix.length, { ...raw, expectedSessions: equityPrefix }) : null;
  if (full) {
    const daily = Array.from({ length: full[0].length - 1 }, (_, i) => mean(full.map(x => x[i + 1] / x[i] - 1)));
    const path: number[] = []; let v = variance(daily.slice(0, 21)); path.push(100 * Math.sqrt(v * 252));
    for (const r of daily.slice(21)) { v = .94 * v + .06 * r * r; path.push(100 * Math.sqrt(v * 252)); }
    set("realized_ewma", path.at(-1)); set("realized_ewma_change", path.length > 21 ? path[path.length - 1] - path[path.length - 22] : null);
  }
  const bc = contexts.btc ?? raw, gc = contexts.gld ?? raw;
  const daily = windowRows(btc, bc, 1)?.[0];
  set("btc_daily", daily && finite(daily.total) ? daily.total : null, daily?.coverage === "PARTIAL" ? ["PARTIAL_FUND_COVERAGE"] : []);
  for (const n of [5, 10, 20]) {
    const rows = windowRows(btc, bc, n);
    set(`btc_rolling_${n}`, rows && rows.every(r => finite(r.total)) ? rows.reduce((s, r) => s + (r.total as number), 0) : null);
  }
  if (daily && btc?.expectedFunds?.length) {
    const funds = (daily.funds && typeof daily.funds === "object" ? daily.funds : {}) as Record<string, unknown>;
    const counts = { positive: 0, negative: 0, zero: 0, missing: 0 };
    for (const fund of btc.expectedFunds) { const v = funds[fund]; counts[!finite(v) ? "missing" : v > 0 ? "positive" : v < 0 ? "negative" : "zero"]++; }
    set("btc_breadth", counts, counts.missing ? ["PARTIAL_FUND_COVERAGE"] : []);
  }
  if (daily && finite(daily.total)) {
    const sign = Math.sign(daily.total); let length = 0, censored = false;
    const streakRows = indexRows(btc, bc, bc.expectedSessions);
    for (let i = bc.expectedSessions.length - 1; i >= 0; i--) {
      const row = streakRows.get(bc.expectedSessions[i]);
      if (!row || !finite(row.total)) { censored = true; break; }
      if (Math.sign(row.total) !== sign || sign === 0) break;
      length++; if (i === 0) censored = true;
    }
    set("btc_streak", { sign, length, censored });
  }
  const firstBtc = btc?.rows.filter(r => admissible(r, btc, bc)).map(r => r.observationDate ?? r.date!).sort()[0];
  const bounded = firstBtc ? bc.expectedSessions.filter(d => d >= firstBtc) : [];
  const cumulative = bounded.length ? windowRows(btc, { ...bc, expectedSessions: bounded }, bounded.length) : null;
  set("btc_cumulative", cumulative?.every(r => finite(r.total)) ? { totalUsdMillions: cumulative.reduce((s, r) => s + (r.total as number), 0), firstSession: bounded[0], lastSession: bounded.at(-1), rows: cumulative.length } : null);
  const native = (r: Row) => positive(r.shares) && positive(r.nav) && positive(r.aum);
  const coherent = (r: Row) => native(r) && Math.abs((r.nav as number) * (r.shares as number) - (r.aum as number)) / (r.aum as number) <= .01;
  const last = windowRows(gld, gc, 1)?.[0];
  const audit = windowRows(gld, gc, 21);
  const coherenceReasons = audit ? audit.every(coherent) ? [] : ["GLD_COHERENCE_DISCREPANCY"] : ["COHERENCE_AUDIT_PARTIAL"];
  set("gld_fund_data", last && native(last) ? { shares: last.shares, nav: last.nav, aum: last.aum, coherenceAudit: coherenceReasons } : null, coherenceReasons);
  for (const n of [1, 5, 20]) {
    const rows = windowRows(gld, gc, n + 1);
    const unitEvent = gld?.unitEventDates?.some(d => d >= (gc.expectedSessions.at(-n - 1) ?? "") && d <= gc.targetSession);
    if (rows && !unitEvent && rows.every(coherent)) {
      const a = rows[0].shares as number, b = rows[n].shares as number;
      set(`gld_shares_change_${n}`, { delta: b - a, fraction: (b - a) / a }, coherenceReasons);
      set(`gld_pressure_usd_${n}`, (b - a) * (rows[n].nav as number), coherenceReasons);
    } else { set(`gld_shares_change_${n}`, null, [unitEvent ? "SHARE_UNIT_EVENT" : "GLD_WINDOW_UNAVAILABLE"]); set(`gld_pressure_usd_${n}`, null, ["PARENT_UNAVAILABLE"]); }
  }
  return REGISTRY.map(def => {
    const excluded = def.role === "PRESENTATION_ONLY", parked = def.role === "RESEARCH_ONLY";
    const value = excluded || parked ? null : values.get(def.id) ?? null;
    return { featureId: def.id, role: def.role, family: def.family, unit: def.unit, value, status: excluded ? "EXCLUDED" : parked ? "PARKED" : value === null ? "UNAVAILABLE" : "AVAILABLE", reasons: excluded ? ["EXCLUDED_FROM_V2"] : parked ? ["RESEARCH_NOT_ACTIVATED"] : reasons.get(def.id)?.length ? reasons.get(def.id)! : value === null ? ["INPUT_OR_WINDOW_UNAVAILABLE"] : [], parents: def.parents, replayClass: excluded || parked ? "UNKNOWN" : replay };
  });
}
