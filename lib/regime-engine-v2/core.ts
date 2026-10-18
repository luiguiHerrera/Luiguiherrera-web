// Internal numeric kernel. The public engine fixes C03; explicit parameter vectors
// here exist solely to exercise the six already-frozen P8 conformance candidates.
import { C03, DECISION_TABLE, GROUPS, PRICE_BASIS, TICKERS } from "./contract.ts";
import { averageCorrelation, finite, freeze, ge, le, mean, positive, variance } from "./math.ts";
import { admissible, validDate, windowValues } from "./temporal.ts";
import type { CoreFeatures, CoreInput, Direction, Fragility, Level, NumericParameters, Pillars, Regime, VxPacket, Volatility } from "./types.ts";
freeze(C03); freeze(DECISION_TABLE);
export function monthlyContracts(packet: VxPacket | undefined, raw: CoreInput) {
  if (!packet || packet.seriesType !== "OFFICIAL_MONTHLY_VX_SETTLEMENT" || packet.observationDate !== raw.targetSession || !admissible({ observationDate: packet.observationDate }, packet, raw)) return null;
  const contracts = (packet.contracts ?? []).filter(row => /^VX\/[FGHJKMNQUVXZ]\d$/.test(row.symbol) && validDate(row.expirationDate) && row.expirationDate > raw.targetSession).sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));
  const expected = packet.expectedContracts ?? [];
  if (contracts.length < 2 || expected.length < 2 || new Set(contracts.map(r => r.expirationDate)).size !== contracts.length || contracts.slice(0, 2).some((r, i) => r.symbol !== expected[i].symbol || r.expirationDate !== expected[i].expirationDate)) return null;
  // Preserve maturity slots even when a later diagnostic contract is ineligible.
  return contracts.map(row => admissible({ ...row, observationDate: packet.observationDate }, packet, raw) ? row : { ...row, settlement: null });
}
export function extractCore(raw: CoreInput): { features: CoreFeatures; missingReasons: string[] } {
  const f: CoreFeatures = { positive_5: null, positive_21: null, leadership_gap: null, rho21: null, rho63: null, corr_spread: null, vix: null, jump_1: null, jump_5: null, slope: null, realized_vol_21: null };
  const reasons: string[] = [];
  if (!validDate(raw.targetSession) || !raw.expectedSessions.length || raw.expectedSessions[raw.expectedSessions.length - 1] !== raw.targetSession) return { features: f, missingReasons: ["INVALID_SESSION_CONTRACT"] };
  if (raw.expectedSessions.join() !== [...new Set(raw.expectedSessions)].sort().join()) return { features: f, missingReasons: ["INVALID_SESSION_ORDER"] };
  const panels = (n: number) => TICKERS.map(t => windowValues(raw.equity[t], raw, n, "adjusted_close", PRICE_BASIS));
  const short = panels(22);
  if (short.every((v): v is number[] => v !== null)) {
    const r5 = short.map(x => (x[21] / x[16] - 1) * 100), r21 = short.map(x => (x[21] / x[0] - 1) * 100);
    f.positive_5 = r5.filter(v => v > 0).length; f.positive_21 = r21.filter(v => v > 0).length;
    f.returns_5 = Object.fromEntries(TICKERS.map((t, i) => [t, r5[i]])); f.returns_21 = Object.fromEntries(TICKERS.map((t, i) => [t, r21[i]]));
    f.group_returns_21 = Object.fromEntries(Object.entries(GROUPS).map(([group, members]) => [group, mean(members.map(t => f.returns_21![t]))]));
    f.leadership_gap = Math.max(f.group_returns_21.growth, f.group_returns_21.cyclical) - f.group_returns_21.defensive;
  } else reasons.push("EQUITY_22_CLOSES_UNAVAILABLE");
  const long = panels(64);
  if (long.every((v): v is number[] => v !== null)) {
    const returns = long.map(x => x.slice(1).map((v, i) => v / x[i] - 1));
    const rho21 = averageCorrelation(returns.map(x => x.slice(-21))), rho63 = averageCorrelation(returns);
    if (rho21 !== null && rho63 !== null) {
      f.rho21 = rho21; f.rho63 = rho63; f.corr_spread = rho21 - rho63;
      f.realized_vol_21 = Math.sqrt(variance(Array.from({ length: 21 }, (_, i) => mean(returns.map(r => r[i + 42]))))) * Math.sqrt(252) * 100;
    } else reasons.push("DEGENERATE_CORRELATION");
  } else reasons.push("EQUITY_64_CLOSES_UNAVAILABLE");
  const v = windowValues(raw.vix, raw, 6, "value");
  if (v && raw.vix?.seriesType === "OFFICIAL_VIX_INDEX") { f.vix = v[5]; f.jump_1 = (v[5] / v[4] - 1) * 100; f.jump_5 = (v[5] / v[0] - 1) * 100; }
  else reasons.push("VIX_WINDOW_UNAVAILABLE");
  const contracts = monthlyContracts(raw.vx, raw);
  if (contracts && positive(contracts[0].settlement) && positive(contracts[1].settlement)) f.slope = (contracts[1].settlement / contracts[0].settlement - 1) * 100;
  if (f.slope === null) reasons.push("VX_NEAR_CONTRACTS_UNAVAILABLE");
  return { features: f, missingReasons: reasons };
}
export function equityState(a: Direction, b: Direction): Direction {
  if (a === "UNAVAILABLE" || b === "UNAVAILABLE") return "UNAVAILABLE";
  if (a === "FAVORABLE" && b === "FAVORABLE") return "FAVORABLE";
  return (a === "ADVERSE" || b === "ADVERSE") && a !== "FAVORABLE" && b !== "FAVORABLE" ? "ADVERSE" : "MIXED";
}
export function decide(states: Pillars): { regime: Regime | null; systemState: "COMPLETE" | "INCOMPLETE"; ruleId: string } {
  for (const rule of DECISION_TABLE.rules) {
    const match = Object.entries(rule.when).every(([field, allowed]) => field === "any_unavailable" ? (allowed as readonly string[]).some((key: string) => states[key as keyof Pillars] === "UNAVAILABLE") : (allowed as readonly string[]).includes(states[field as keyof Pillars]));
    if (match) return { regime: rule.regime, systemState: rule.reading_status, ruleId: rule.id };
  }
  throw new Error("Uncovered frozen decision table");
}
export function classifyCore(f: CoreFeatures, p: NumericParameters = C03) {
  const participation: Direction = f.positive_5 === null || f.positive_21 === null ? "UNAVAILABLE" : Math.min(f.positive_5, f.positive_21) >= p.k_broad ? "FAVORABLE" : Math.max(f.positive_5, f.positive_21) <= p.k_weak ? "ADVERSE" : "MIXED";
  const leadership: Direction = f.leadership_gap === null ? "UNAVAILABLE" : ge(f.leadership_gap, p.leadership_gap) ? "FAVORABLE" : le(f.leadership_gap, -p.leadership_gap) ? "ADVERSE" : "MIXED";
  let volatility: Volatility = "UNAVAILABLE";
  if ([f.vix, f.jump_1, f.jump_5, f.slope].every(finite)) {
    const fast = ge(f.jump_1!, p.jump_1) || ge(f.jump_5!, p.jump_5), inverted = le(f.slope!, -p.curve_adverse);
    volatility = ge(f.vix!, p.v_stress) || (ge(f.vix!, p.v_adverse) && fast && inverted) ? "STRESS" : ge(f.vix!, p.v_adverse) || inverted ? "ADVERSE" : ge(f.vix!, p.v_watch) || fast || le(f.slope!, p.curve_flat) ? "WATCH" : "BENIGN";
  }
  const fragility: Fragility = f.rho21 === null || f.rho63 === null || f.corr_spread === null ? "UNAVAILABLE" : ge(f.rho21, p.rho_high) ? "HIGH" : ge(f.rho21, p.rho_floor) && ge(f.corr_spread, p.delta_rising) ? "RISING" : "LOW";
  const a = equityState(participation, leadership);
  const states: Pillars = { participation, leadership, volatility, fragility, equity: a };
  const eq: Exclude<Direction, "UNAVAILABLE"> | null = a === "UNAVAILABLE" || fragility === "UNAVAILABLE" ? null : a === "FAVORABLE" && fragility === "HIGH" ? "MIXED" : a === "ADVERSE" || fragility === "HIGH" ? "ADVERSE" : a === "FAVORABLE" && fragility === "LOW" ? "FAVORABLE" : "MIXED";
  const vol: Exclude<Direction, "UNAVAILABLE"> | null = volatility === "UNAVAILABLE" ? null : volatility === "BENIGN" ? "FAVORABLE" : volatility === "WATCH" ? "MIXED" : "ADVERSE";
  const concordance: Level | null = eq === null || vol === null ? null : eq === "MIXED" || vol === "MIXED" ? "MEDIUM" : eq === vol ? "HIGH" : "LOW";
  const plausible = new Set<Regime>();
  if (![participation, leadership, volatility, fragility].includes("UNAVAILABLE")) {
    const pa: Direction[] = participation === "MIXED" ? ["FAVORABLE", "MIXED", "ADVERSE"] : [participation];
    const la: Direction[] = leadership === "MIXED" ? ["FAVORABLE", "MIXED", "ADVERSE"] : [leadership];
    const va: Volatility[] = volatility === "WATCH" ? ["BENIGN", "WATCH", "ADVERSE"] : [volatility];
    const ca: Fragility[] = fragility === "RISING" ? ["LOW", "RISING", "HIGH"] : [fragility];
    for (const pp of pa) for (const ll of la) for (const vv of va) for (const cc of ca) {
      const result = decide({ participation: pp, leadership: ll, volatility: vv, fragility: cc, equity: equityState(pp, ll) });
      if (result.regime) plausible.add(result.regime);
    }
  }
  const plausibleRegimes = DECISION_TABLE.regime_vocabulary.filter(s => plausible.has(s));
  const uncertainty: Level | null = plausible.size === 0 ? null : plausible.size === 1 ? "LOW" : plausible.size === 2 ? "MEDIUM" : "HIGH";
  return { ...decide(states), pillarStates: states, concordance, uncertainty, plausibleRegimes,
    dependencyUnits: { equity_price_complex: eq, implied_volatility_complex: vol }, coreFamilyCount: Number(eq !== null) + Number(vol !== null) };
}
export function evaluateCore(raw: CoreInput, parameters: NumericParameters = C03) {
  const extracted = extractCore(raw);
  return { ...classifyCore(extracted.features, parameters), ...extracted };
}
