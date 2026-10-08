import { evaluateRegime } from "./engine.ts";
import type { RegimeOutput } from "./engine.ts";
import type { EngineInput } from "./types.ts";
export async function runShadow<V1>(loadV1: () => Promise<V1>, loadV2: (() => Promise<EngineInput>) | null) {
  // Both tasks start independently. Failure/disablement of V2 cannot fail V1.
  const v2 = loadV2 ? Promise.resolve().then(loadV2).then(evaluateRegime).then(value => ({ status: "AVAILABLE" as const, value, error: null })).catch(error => ({ status: "FAILED" as const, value: null, error: error instanceof Error ? error.message : String(error) })) : Promise.resolve({ status: "DISABLED" as const, value: null, error: null });
  const v1 = await loadV1();
  return { v1, v2: await v2 };
}
export function observeTransition(previous: RegimeOutput | null, current: RegimeOutput, previousDurationSessions?: number, previousDurationCensored = true) {
  const sessions = current.diagnostics.calendarStatus.equity.sessions;
  const adjacent = !!previous && previous.observationDate === sessions.at(-2) && previous.engineVersion === current.engineVersion && previous.parameterSet === current.parameterSet && JSON.stringify(previous.versions) === JSON.stringify(current.versions);
  const same = adjacent && current.regime !== null && current.regime === previous?.regime;
  const validDuration = previousDurationSessions !== undefined && Number.isSafeInteger(previousDurationSessions) && previousDurationSessions >= 1 && previousDurationSessions < Number.MAX_SAFE_INTEGER;
  return { observationDate: current.observationDate, asOf: current.asOf, inputHash: current.diagnostics.inputHash, replayClass: current.replayClass,
    regimeTransition: adjacent && previous?.regime !== current.regime ? { from: previous?.regime, to: current.regime } : null,
    pillarTransitions: Object.entries(current.pillarStates).filter(([k, v]) => adjacent && previous?.pillarStates[k as keyof typeof current.pillarStates] !== v).map(([pillar, to]) => ({ pillar, from: previous?.pillarStates[pillar as keyof typeof current.pillarStates], to })),
    durationSessions: current.regime === null ? null : same ? (validDuration ? previousDurationSessions + 1 : 2) : 1,
    durationCensored: current.regime === null || !adjacent || previous?.regime === null || (same && (!validDuration || previousDurationCensored)), dataQualityChange: adjacent && previous?.dataQuality !== current.dataQuality ? { from: previous?.dataQuality, to: current.dataQuality } : null,
    reasonCode: current.diagnostics.ruleId, missingReasons: current.diagnostics.missingReasons, dependencyContributions: current.diagnostics.dependencyContributions };
}
