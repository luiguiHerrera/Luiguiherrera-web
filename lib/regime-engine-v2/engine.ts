import { C03, CONTRACT_HASHES, ENGINE_VERSION, INITIAL_OPTIONALS, REGISTRY, TICKERS } from "./contract.ts";
import { evaluateCore } from "./core.ts";
import { buildEvidence } from "./features.ts";
import { canonical, freeze, hash } from "./math.ts";
import { admissible, instant, resolveCalendar, temporalEligible, validDate, weakest } from "./temporal.ts";
import type { CoreInput, Packet, ReplayClass, Temporal, VxPacket } from "./types.ts";
import { assertEngineInput } from "./boundary.ts";
export { RegimeInputError } from "./boundary.ts";
freeze(REGISTRY); freeze(CONTRACT_HASHES);
function sourceProblem(packet: Temporal | undefined, source: string, asOf: string, mode: ReplayClass): string | null {
  if (!packet) return "MISSING_SOURCE";
  if (packet.sourceId !== source || !packet.sourceVersion || !/^[a-f0-9]{64}$/.test(packet.vintageHash ?? "")) return "UNKNOWN_PROVENANCE";
  if (packet.status && packet.status !== "AVAILABLE") return packet.status;
  if (mode === "R2") return packet.replayClass === "UNKNOWN" || !packet.replayClass ? "UNKNOWN_REPLAY_CLASS" : null;
  if (instant(packet.capturedAt) === null) return "UNKNOWN_CAPTURE_TIME";
  if (!temporalEligible(packet, asOf, mode, false)) return "TEMPORALLY_INELIGIBLE";
  if (mode === "R0" && instant(packet.capturedAt)! > instant(asOf)!) return "FUTURE_CAPTURE";
  return null;
}
function orderedPacket(packet: Packet | undefined) {
  return packet ? { ...packet, rows: [...packet.rows].sort((a, b) => canonical(a).localeCompare(canonical(b), "en")) } : null;
}
/** Public production entry: pure, server-side, C03 only, with no fetch or wall clock. */
export function evaluateRegime(input: unknown) {
  assertEngineInput(input);
  const calendars = Object.fromEntries((["equity", "vix", "vx", "btc", "gld"] as const).map(key => [key, resolveCalendar(input.calendars[key], input.asOf, input.mode)]));
  const target = calendars.equity.target ?? "";
  const sourceStatus: Record<string, { status: string; observationDate: string | null; sourcePublishedAt: string | null; availableAt: string | null; capturedAt: string | null; availabilityCertainty: string; replayClass: ReplayClass; sourceId: string | null; sourceVersion: string | null; vintageHash: string | null; rows: number; rejectedObservations: { date: string | null; reason: string }[] }> = {};
  const raw: CoreInput = { mode: input.mode, asOf: input.asOf, targetSession: target, expectedSessions: calendars.equity.sessions, equity: {} };
  const statusFor = (key: string, packet: Packet | VxPacket | undefined, source: string, calKey: string) => {
    const calendar = calendars[calKey];
    const rows = packet && "rows" in packet ? packet.rows : [];
    const rowDates = rows.map(row => row.observationDate ?? row.date).filter((date): date is string => validDate(date) && date <= target).sort();
    const latest = packet?.observationDate ?? rowDates.at(-1) ?? null;
    const nativeContractProblem = packet && "rows" in packet && ((source === "BTC_NATIVE" && (packet.seriesType !== "REPORTED_ETF_NET_FLOW" || packet.currency !== "USD_MILLIONS")) || (source === "GLD_NATIVE" && (packet.seriesType !== "FUND_SHARES_NAV_AUM" || (packet.currency !== undefined && packet.currency !== "USD")))) ? "INVALID_NATIVE_SERIES_OR_UNIT" : null;
    const problem = calendar.reason ?? (calendar.target !== target ? "INCOMPATIBLE_SOURCE_SESSION" : null) ?? sourceProblem(packet, source, input.asOf, input.mode) ?? nativeContractProblem ?? (latest !== target ? "STALE_OR_WRONG_SESSION" : null);
    const rejectedObservations = rows.filter(row => !admissible(row, packet ?? {}, raw)).map(row => ({ date: row.observationDate ?? row.date ?? null, reason: (row.observationDate ?? row.date ?? "") > target ? "FUTURE_OBSERVATION" : "INVALID_OR_TEMPORALLY_INELIGIBLE" }));
    sourceStatus[key] = { status: problem ?? "AVAILABLE", observationDate: latest, sourcePublishedAt: packet?.sourcePublishedAt ?? null, availableAt: packet?.availableAt ?? null, capturedAt: packet?.capturedAt ?? null, availabilityCertainty: packet?.availabilityCertainty ?? "UNKNOWN", replayClass: packet?.replayClass ?? "UNKNOWN", sourceId: packet?.sourceId ?? null, sourceVersion: packet?.sourceVersion ?? null, vintageHash: packet?.vintageHash ?? null, rows: rows.length, rejectedObservations };
    return problem;
  };
  for (const ticker of [...TICKERS, "SPY", "RSP", "IWM"]) {
    const packet = input.equity[ticker], problem = statusFor(ticker, packet, "EQUITY_ADJUSTED", "equity");
    raw.equity[ticker] = packet ? { ...packet, status: problem ?? packet.status } : undefined;
  }
  const vixProblem = statusFor("VIX", input.vix, "VIX_OFFICIAL", "vix"), vxProblem = statusFor("VX", input.vx, "VX_OFFICIAL", "vx");
  raw.vix = input.vix ? { ...input.vix, status: vixProblem ?? input.vix.status } : undefined;
  raw.vx = input.vx ? { ...input.vx, status: vxProblem ?? input.vx.status } : undefined;
  const btcProblem = statusFor("BTC", input.btc, "BTC_NATIVE", "btc"), gldProblem = statusFor("GLD", input.gld, "GLD_NATIVE", "gld");
  const btc = input.btc ? { ...input.btc, status: btcProblem ?? input.btc.status } : undefined, gld = input.gld ? { ...input.gld, status: gldProblem ?? input.gld.status } : undefined;
  const coreSources = [...TICKERS.map(t => input.equity[t]), input.vix, input.vx];
  const replayClass = weakest([input.mode, ...coreSources.map(s => s?.replayClass), ...["equity", "vix", "vx"].map(k => input.calendars[k as "equity"]?.replayClass)]);
  const core = evaluateCore(raw, C03);
  const evidence = buildEvidence(raw, core.features, btc, gld, replayClass, { vix: { ...raw, expectedSessions: calendars.vix.sessions }, btc: { ...raw, expectedSessions: calendars.btc.sessions }, gld: { ...raw, expectedSessions: calendars.gld.sessions } });
  // Evidence replay is per lineage; satellites never upgrade or downgrade core.
  for (const item of evidence) {
    if (item.status === "EXCLUDED" || item.status === "PARKED") continue;
    const source = REGISTRY.find(r => r.id === item.featureId)!.source;
    item.replayClass = source === "BTC_NATIVE" ? weakest([input.mode, input.btc?.replayClass, input.calendars.btc?.replayClass]) : source === "GLD_NATIVE" ? weakest([input.mode, input.gld?.replayClass, input.calendars.gld?.replayClass]) : source === "VIX_OFFICIAL" ? weakest([input.mode, input.vix?.replayClass, input.calendars.vix?.replayClass]) : source === "VX_OFFICIAL" ? weakest([input.mode, input.vx?.replayClass, input.calendars.vx?.replayClass]) : weakest([input.mode, ...TICKERS.map(t => input.equity[t]?.replayClass), input.calendars.equity?.replayClass]);
  }
  const optionals = [...new Set(input.optionalFeatures ?? INITIAL_OPTIONALS)].sort();
  const optionalProblems = optionals.filter(id => { const feature = evidence.find(e => e.featureId === id); return !feature || feature.status !== "AVAILABLE" || feature.reasons.length > 0; });
  const dataQuality = core.systemState === "INCOMPLETE" ? "INSUFFICIENT" : optionalProblems.length ? "PARTIAL" : "COMPLETE";
  const normalizedIdentity = { mode: input.mode, asOf: input.asOf, calendars: Object.fromEntries(Object.entries(input.calendars).sort().map(([k, c]) => [k, c ? { ...c, sessions: [...c.sessions].sort((a, b) => a.session.localeCompare(b.session)) } : null])), equity: Object.fromEntries(Object.entries(input.equity).sort().map(([t, p]) => [t, orderedPacket(p)])), vix: orderedPacket(input.vix), vx: input.vx ? { ...input.vx, contracts: [...input.vx.contracts].sort((a, b) => a.expirationDate.localeCompare(b.expirationDate)) } : null, btc: orderedPacket(input.btc), gld: orderedPacket(input.gld), optionals };
  return freeze({ engineVersion: ENGINE_VERSION, architecture: "EVIDENCE_STATE_ENGINE" as const, parameterSet: "C03" as const, versions: CONTRACT_HASHES,
    asOf: input.asOf, observationDate: target || null, regime: core.regime, systemState: core.systemState, pillarStates: core.pillarStates, evidence,
    concordance: core.concordance, uncertainty: core.uncertainty, plausibleRegimes: core.plausibleRegimes, dataQuality, sourceStatus, replayClass,
    diagnostics: { ruleId: core.ruleId, coreFeatures: core.features, missingReasons: core.missingReasons, optionalProblems, profile: optionals, dependencyContributions: core.dependencyUnits, coreFamilyCount: core.coreFamilyCount, independenceClaim: "ECONOMIC_LINEAGE_ONLY_NOT_STATISTICAL_INDEPENDENCE", calendarStatus: calendars, inputHash: hash(normalizedIdentity), pointInTimeOosClaim: false } });
}
export type RegimeOutput = ReturnType<typeof evaluateRegime>;
