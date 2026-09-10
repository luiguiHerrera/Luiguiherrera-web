import { C03, DECISION_TABLE, NUMERIC_TOLERANCE, REGISTRY, TICKERS } from "../regime-engine-v2/contract.ts";
import type { RegimeOutput } from "../regime-engine-v2/engine.ts";
import type { FeatureEvidence, Level, Regime } from "../regime-engine-v2/types.ts";

export type RegimeV2Locale = "es" | "en";
export type RegimeV2PillarId = "participation" | "volatility" | "fragility";
export type RegimeV2Claim = {
  id: string; text: string; pillarIds: RegimeV2PillarId[]; featureIds: string[];
  sourceKeys: string[]; evidenceHref: string; ruleId: string;
};
export type RegimeV2Source = {
  key: string; label: string; status: string; statusLabel: string; observationDate: string | null;
  availableAt: string | null; capturedAt: string | null; sourcePublishedAt: string | null;
  sourceId: string | null; sourceVersion: string | null; vintageHash: string | null;
  replayClass: string; availabilityCertainty: string;
};

const text = (locale: RegimeV2Locale, es: string, en: string) => locale === "es" ? es : en;
const featureLabels: Record<string, readonly [string, string]> = {
  eq_positive_5: ["Sectores positivos · 5 sesiones", "Positive sectors · 5 sessions"],
  eq_positive_21: ["Sectores positivos · 21 sesiones", "Positive sectors · 21 sessions"],
  eq_leadership_gap: ["Liderazgo frente a defensivos · 21 sesiones", "Leadership versus defensives · 21 sessions"],
  vix_level: ["Nivel del VIX", "VIX level"],
  vix_momentum_1: ["Cambio del VIX · 1 sesión", "VIX change · 1 session"],
  vix_momentum_5: ["Cambio del VIX · 5 sesiones", "VIX change · 5 sessions"],
  vx_slope_12: ["Pendiente VX · primer y segundo vencimiento", "VX slope · first and second maturities"],
  corr_mean_21: ["Correlación entre sectores · 21 sesiones", "Sector correlation · 21 sessions"],
  corr_mean_63: ["Correlación entre sectores · 63 sesiones", "Sector correlation · 63 sessions"],
  corr_window_spread: ["Diferencia de correlación · 21 menos 63 sesiones", "Correlation difference · 21 minus 63 sessions"],
  btc_daily: ["Flujo neto diario de ETF de BTC", "Daily net BTC ETF flow"],
  btc_rolling_5: ["Flujo neto de ETF de BTC · 5 sesiones", "Net BTC ETF flow · 5 sessions"],
  gld_shares_change_5: ["Cambio en participaciones de GLD · 5 sesiones", "GLD shares change · 5 sessions"],
};
const coreFeatures = ["eq_positive_5", "eq_positive_21", "eq_leadership_gap", "vix_level", "vix_momentum_1", "vix_momentum_5", "vx_slope_12", "corr_mean_21", "corr_mean_63", "corr_window_spread"];
const participationFeatures = coreFeatures.slice(0, 3);
const volatilityFeatures = coreFeatures.slice(3, 7);
const fragilityFeatures = coreFeatures.slice(7);
const reasonLabels: Record<string, readonly [string, string]> = {
  AVAILABLE: ["Disponible", "Available"], UNAVAILABLE: ["No disponible", "Unavailable"],
  MISSING_SOURCE: ["Fuente pendiente", "Source pending"],
  UNKNOWN_CALENDAR: ["Calendario de sesión no verificado", "Session calendar not verified"],
  UNKNOWN_CALENDAR_COVERAGE: ["Cobertura del calendario no verificada", "Calendar coverage not verified"],
  UNKNOWN_PROVENANCE: ["Procedencia de los datos no verificada", "Data provenance not verified"],
  UNKNOWN_REPLAY_CLASS: ["Clase de reconstrucción no verificada", "Replay class not verified"],
  UNKNOWN_CAPTURE_TIME: ["Hora de captura no verificada", "Capture time not verified"],
  STALE_OR_WRONG_SESSION: ["Evidencia de una sesión distinta de la requerida", "Evidence belongs to a different session"],
  INCOMPATIBLE_SOURCE_SESSION: ["Las fuentes no corresponden a la misma sesión", "Sources do not cover the same session"],
  TEMPORALLY_INELIGIBLE: ["Disponibilidad temporal no acreditada para esta lectura", "Availability is not established for this reading"],
  FUTURE_CAPTURE: ["Captura posterior al corte de la lectura", "Capture occurred after the reading cutoff"],
  FUTURE_OBSERVATION: ["Observación posterior a la sesión requerida", "Observation follows the required session"],
  INVALID_OR_TEMPORALLY_INELIGIBLE: ["Observación no admitida por el contrato temporal", "Observation is not admitted by the temporal contract"],
  INVALID_NATIVE_SERIES_OR_UNIT: ["Serie o unidad de la fuente no acreditada", "Source series or unit is not established"],
  INVALID_SESSION_CONTRACT: ["No se ha podido acreditar una sesión cerrada", "A closed session could not be established"],
  INVALID_SESSION_ORDER: ["Secuencia de sesiones no válida", "Session sequence is invalid"],
  EQUITY_22_CLOSES_UNAVAILABLE: ["Faltan cierres ajustados para participación y liderazgo", "Adjusted closes needed for participation and leadership are missing"],
  EQUITY_64_CLOSES_UNAVAILABLE: ["Falta la ventana de cierres ajustados para correlación", "The adjusted-close window needed for correlation is missing"],
  DEGENERATE_CORRELATION: ["La correlación no se puede calcular con esta muestra", "Correlation cannot be calculated from this sample"],
  VIX_WINDOW_UNAVAILABLE: ["La ventana de VIX no está disponible", "The VIX window is unavailable"],
  VX_NEAR_CONTRACTS_UNAVAILABLE: ["Faltan los dos vencimientos mensuales elegibles de VX", "The two eligible monthly VX maturities are missing"],
  INPUT_OR_WINDOW_UNAVAILABLE: ["Dato o ventana requerida no disponible", "Required observation or window is unavailable"],
  DECLARED_PREFIX_UNAVAILABLE: ["Historia declarada de la fuente incompleta", "Declared source history is incomplete"],
  PARTIAL_FUND_COVERAGE: ["Cobertura parcial de los fondos", "Fund coverage is partial"],
  GLD_COHERENCE_DISCREPANCY: ["Los datos del fondo no superan la comprobación de coherencia", "Fund data fails the consistency check"],
  COHERENCE_AUDIT_PARTIAL: ["Comprobación de coherencia del fondo incompleta", "Fund consistency check is incomplete"],
  SHARE_UNIT_EVENT: ["Cambio en la unidad de participaciones pendiente de resolver", "A share-unit event remains unresolved"],
  GLD_WINDOW_UNAVAILABLE: ["Ventana de datos de GLD no disponible", "GLD data window is unavailable"],
  PARENT_UNAVAILABLE: ["Falta un dato necesario para esta medida", "An input needed by this measurement is missing"],
};

export function regimeV2ReasonLabel(reason: string, locale: RegimeV2Locale): string {
  const pair = reasonLabels[reason];
  return pair ? pair[locale === "es" ? 0 : 1] : text(locale, "Evidencia no admitida por el contrato de datos", "Evidence is not admitted by the data contract");
}

function levelLabel(value: Level | null, locale: RegimeV2Locale) {
  return value === "HIGH" ? text(locale, "Alta", "High") : value === "MEDIUM" ? text(locale, "Media", "Medium") : value === "LOW" ? text(locale, "Baja", "Low") : text(locale, "No disponible", "Unavailable");
}
function stateLabel(state: string, locale: RegimeV2Locale) {
  const labels: Record<string, readonly [string, string]> = {
    FAVORABLE: ["Favorable", "Favorable"], MIXED: ["Mixta", "Mixed"], ADVERSE: ["Adversa", "Adverse"],
    BENIGN: ["Benigna", "Benign"], WATCH: ["En vigilancia", "Watch"], STRESS: ["Stress", "Stress"],
    LOW: ["Baja", "Low"], RISING: ["Ascendente", "Rising"], HIGH: ["Alta", "High"],
    UNAVAILABLE: ["No disponible", "Unavailable"],
  };
  return labels[state]?.[locale === "es" ? 0 : 1] ?? text(locale, "No disponible", "Unavailable");
}
function regimeLabel(regime: Regime | null, locale: RegimeV2Locale) {
  if (!regime) return text(locale, "LECTURA INCOMPLETA", "INCOMPLETE READING");
  if (locale === "es") return DECISION_TABLE.labels_es[regime];
  return ({ RISK_ON_BROAD: "BROAD RISK-ON", RISK_ON_SELECTIVE: "SELECTIVE RISK-ON", TRANSITION: "TRANSITION", DEFENSIVE: "DEFENSIVE", STRESS: "STRESS" })[regime];
}
function sourceKeysFor(features: string[]) {
  return [...new Set(features.flatMap(feature => {
    const source = REGISTRY.find(item => item.id === feature)?.source;
    return source === "EQUITY_ADJUSTED" ? [...TICKERS] : source === "VIX_OFFICIAL" ? ["VIX"] : source === "VX_OFFICIAL" ? ["VX"] : source === "BTC_NATIVE" ? ["BTC"] : source === "GLD_NATIVE" ? ["GLD"] : [];
  }))];
}
function formatValue(feature: FeatureEvidence, locale: RegimeV2Locale): string {
  if (feature.status !== "AVAILABLE" || feature.value === null) return text(locale, "No disponible", "Unavailable");
  const number = (value: number, digits = 2) => new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
  if (typeof feature.value === "number") {
    if (feature.unit === "count of 11") return `${number(feature.value, 0)} ${text(locale, "de", "of")} 11`;
    if (feature.unit === "percent") return `${number(feature.value)} %`;
    if (feature.unit === "percentage points") return `${number(feature.value)} ${text(locale, "puntos porcentuales", "percentage points")}`;
    if (feature.unit === "USD millions") return `${number(feature.value)} ${text(locale, "millones USD", "million USD")}`;
    if (feature.unit === "VIX points") return `${number(feature.value)} ${text(locale, "puntos", "points")}`;
    return number(feature.value, 3);
  }
  if (feature.featureId === "gld_shares_change_5" && typeof feature.value === "object" && "delta" in feature.value && typeof feature.value.delta === "number") {
    return `${number(feature.value.delta, 0)} ${text(locale, "participaciones", "shares")}`;
  }
  return text(locale, "Consultar detalle de la fuente", "See source detail");
}

/** Presentation only: translates the frozen output, without re-adjudicating its state. */
export function buildRegimeV2View(output: RegimeOutput, locale: RegimeV2Locale) {
  const t = (es: string, en: string) => text(locale, es, en);
  const technical = output.systemState === "INCOMPLETE";
  const state = technical ? "INCOMPLETE" as const : output.regime!;
  const p = output.pillarStates;
  const claim = (id: string, copy: string, pillarIds: RegimeV2PillarId[], featureIds: string[]): RegimeV2Claim => ({
    id, text: copy, pillarIds, featureIds, sourceKeys: sourceKeysFor(featureIds),
    evidenceHref: featureIds.length ? `#v2-measurement-${featureIds[0]}` : "#v2-data-status", ruleId: output.diagnostics.ruleId,
  });
  const sources: RegimeV2Source[] = Object.entries(output.sourceStatus).map(([key, source]) => ({
    key, label: key === "VIX" ? "Cboe · VIX" : key === "VX" ? t("CFE · liquidaciones mensuales VX", "CFE · monthly VX settlements") : key === "BTC" ? t("ETF de BTC · flujos nativos", "BTC ETFs · native flows") : key === "GLD" ? t("GLD · datos nativos del fondo", "GLD · native fund data") : `${key} · ${t("cierre ajustado", "adjusted close")}`,
    ...source, statusLabel: regimeV2ReasonLabel(source.status, locale),
  }));
  const measurements = [...coreFeatures, "btc_daily", "btc_rolling_5", "gld_shares_change_5"].flatMap(id => {
    const evidence = output.evidence.find(item => item.featureId === id);
    if (!evidence) return [];
    const pair = featureLabels[id];
    return [{
      id: `v2-measurement-${id}`, featureId: id, label: pair[locale === "es" ? 0 : 1],
      value: formatValue(evidence, locale), rawValue: evidence.value, unit: evidence.unit,
      status: evidence.status, statusLabel: regimeV2ReasonLabel(evidence.status, locale),
      role: evidence.role, replayClass: evidence.replayClass, parents: [...evidence.parents],
      reasons: evidence.reasons.map(code => ({ code, text: regimeV2ReasonLabel(code, locale) })),
      sources: sources.filter(source => sourceKeysFor([id]).includes(source.key)),
      asOf: output.asOf, observationDate: output.observationDate,
    }];
  });
  const participationCopy = p.participation === "FAVORABLE" ? t("Avances extendidos a 5 y 21 sesiones.", "Gains extend across sectors over 5 and 21 sessions.") : p.participation === "ADVERSE" ? t("Pocos sectores avanzan en ambas ventanas.", "Few sectors advance in either window.") : p.participation === "MIXED" ? t("La participación aún no cumple la condición de amplitud.", "Participation does not meet the broad condition.") : t("Falta evidencia de participación.", "Participation evidence is missing.");
  const leadershipCopy = p.leadership === "FAVORABLE" ? t("Crecimiento o cíclicos lideran frente a defensivos.", "Growth or cyclicals lead defensives.") : p.leadership === "ADVERSE" ? t("Los defensivos superan a crecimiento y cíclicos.", "Defensives lead both growth and cyclicals.") : p.leadership === "MIXED" ? t("El liderazgo no define una dirección favorable o adversa.", "Leadership has no favorable or adverse direction.") : t("Falta evidencia de liderazgo.", "Leadership evidence is missing.");
  const stressFromLevel = p.volatility === "STRESS" && output.diagnostics.coreFeatures.vix !== null && output.diagnostics.coreFeatures.vix >= C03.v_stress - NUMERIC_TOLERANCE;
  const volatilityCopy = p.volatility === "STRESS" ? stressFromLevel ? t("El nivel del VIX activa STRESS.", "The VIX level activates STRESS.") : t("Coinciden VIX adverso, salto rápido e inversión de curva.", "Adverse VIX, a fast jump and an inverted curve coincide.") : p.volatility === "ADVERSE" ? t("El nivel del VIX o la curva de futuros es adverso.", "The VIX level or futures curve is adverse.") : p.volatility === "WATCH" ? t("El nivel o cambio del VIX, o la curva, activan vigilancia.", "The VIX level or change, or the curve, activates watch.") : p.volatility === "BENIGN" ? t("VIX y curva sin alerta del motor.", "VIX and the curve trigger no engine alert.") : t("Falta evidencia de VIX o de su curva.", "VIX or curve evidence is missing.");
  const fragilityCopy = p.fragility === "HIGH" ? t("La correlación reciente entre sectores es alta.", "Recent sector correlation is high.") : p.fragility === "RISING" ? t("La correlación reciente supera la de la ventana larga.", "Recent correlation exceeds the long-window correlation.") : p.fragility === "LOW" ? t("La fragilidad no alcanza un estado alto ni ascendente.", "Fragility reaches neither the high nor rising state.") : t("Falta la ventana necesaria para evaluar fragilidad.", "The window needed to assess fragility is missing.");
  const participation = claim("participation", participationCopy, ["participation"], ["eq_positive_5", "eq_positive_21"]);
  const leadership = claim("leadership", leadershipCopy, ["participation"], ["eq_leadership_gap"]);
  const volatility = claim("volatility", volatilityCopy, ["volatility"], volatilityFeatures);
  const fragility = claim("fragility", fragilityCopy, ["fragility"], fragilityFeatures);
  const candidates = [
    { item: participation, favorable: p.participation === "FAVORABLE", available: p.participation !== "UNAVAILABLE" },
    { item: leadership, favorable: p.leadership === "FAVORABLE", available: p.leadership !== "UNAVAILABLE" },
    { item: volatility, favorable: p.volatility === "BENIGN", available: p.volatility !== "UNAVAILABLE" },
    { item: fragility, favorable: p.fragility === "LOW", available: p.fragility !== "UNAVAILABLE" },
  ];
  const supports = technical ? [] : candidates.filter(item => item.available && item.favorable).slice(0, 3).map(item => item.item);
  // Put the adjudicating adverse family first; never turn a missing input into a market brake.
  const adverseOrder = state === "STRESS" || output.diagnostics.ruleId === "R03" ? [volatility, fragility, participation, leadership] : [participation, leadership, volatility, fragility];
  const brakes = technical ? [] : adverseOrder.filter(item => candidates.some(candidate => candidate.item.id === item.id && candidate.available && !candidate.favorable)).slice(0, 3);
  const pending = sources.filter(source => source.status !== "AVAILABLE").map(source => ({ id: `source-${source.key}`, sourceKeys: [source.key], code: source.status, text: `${source.label}: ${source.statusLabel}`, core: [...TICKERS, "VIX", "VX"].includes(source.key) }));
  const groupedPending = [...new Set(pending.filter(item => item.core).map(item => item.code))].map(code => ({
    code, text: regimeV2ReasonLabel(code, locale), sourceKeys: pending.filter(item => item.core && item.code === code).flatMap(item => item.sourceKeys),
  }));
  const watch: RegimeV2Claim[] = technical ? groupedPending.slice(0, 2).map((item, index) => ({ ...claim(`pending-${index}`, item.text, [], []), sourceKeys: item.sourceKeys })) : state === "RISK_ON_SELECTIVE" ? [claim("watch-amplitude", t("Si la participación pasa a favorable y los demás pilares mantienen su estado.", "Whether participation becomes favorable while the other pillars retain their state."), ["participation"], participationFeatures)] : state === "RISK_ON_BROAD" ? [claim("watch-breadth", t("Si participación o liderazgo dejan de ser favorables.", "Whether participation or leadership ceases to be favorable."), ["participation"], participationFeatures)] : state === "STRESS" ? [claim("watch-stress", t("Si el bloque de volatilidad sigue cumpliendo las condiciones de STRESS.", "Whether the volatility block continues to meet the STRESS conditions."), ["volatility"], volatilityFeatures)] : state === "DEFENSIVE" ? [claim("watch-defensive", output.diagnostics.ruleId === "R02" ? t("Si cambia el bloque adverso de participación y liderazgo o la volatilidad en vigilancia/adversa.", "Whether the adverse participation and leadership block or watch/adverse volatility changes.") : t("Si cambian la volatilidad adversa o la fragilidad alta.", "Whether adverse volatility or high fragility changes."), output.diagnostics.ruleId === "R02" ? ["participation", "volatility"] : ["volatility", "fragility"], output.diagnostics.ruleId === "R02" ? [...participationFeatures, ...volatilityFeatures] : [...volatilityFeatures, ...fragilityFeatures])] : [
    claim("watch-equity", t("Si cambia la combinación de participación y liderazgo.", "Whether the participation and leadership combination changes."), ["participation"], participationFeatures),
    claim("watch-volatility", t("Si cambia la combinación de volatilidad y fragilidad que limita la adjudicación.", "Whether the volatility and fragility combination limiting adjudication changes."), ["volatility", "fragility"], [...volatilityFeatures, ...fragilityFeatures]),
  ];
  if (technical && watch.length === 0) watch.push(claim("watch-window", t("Completar las ventanas de datos que necesita el motor.", "Complete the data windows required by the engine."), [], []));
  const interpretation = technical ? t("Falta evidencia suficiente para adjudicar un régimen con las reglas V2.", "There is not enough evidence to assign a regime under the V2 rules.") : state === "RISK_ON_BROAD" ? t("Participación amplia y liderazgo favorable, con volatilidad benigna y fragilidad baja.", "Broad participation and favorable leadership, with benign volatility and low fragility.") : state === "RISK_ON_SELECTIVE" ? t("El liderazgo es favorable; la participación aún no es suficientemente amplia.", "Leadership is favorable; participation is not yet broad enough.") : state === "STRESS" ? t("La volatilidad activa la regla de STRESS, con prioridad sobre los demás pilares.", "Volatility activates the STRESS rule, taking precedence over the other pillars.") : state === "DEFENSIVE" ? output.diagnostics.ruleId === "R02" ? t("El bloque de participación y liderazgo es adverso, con volatilidad en vigilancia o adversa.", "The participation and leadership block is adverse, with watch or adverse volatility.") : t("Volatilidad adversa junto con fragilidad alta.", "Adverse volatility combines with high fragility.") : t(`Participación ${stateLabel(p.participation, locale).toLowerCase()} y volatilidad ${stateLabel(p.volatility, locale).toLowerCase()}: la combinación no cumple una adjudicación más específica.`, `${stateLabel(p.participation, locale)} participation and ${stateLabel(p.volatility, locale).toLowerCase()} volatility: this combination does not meet a more specific adjudication.`);
  const pillars = [
    { id: "participation" as const, label: t("Participación", "Participation"), fullLabel: t("Participación y liderazgo / Equity internals", "Participation and leadership / Equity internals"), state: p.equity, stateLabel: stateLabel(p.equity, locale), summary: `${participationCopy} ${leadershipCopy}`, featureIds: participationFeatures },
    { id: "volatility" as const, label: t("Volatilidad", "Volatility"), fullLabel: t("Volatilidad y estructura", "Volatility and structure"), state: p.volatility, stateLabel: stateLabel(p.volatility, locale), summary: volatilityCopy, featureIds: volatilityFeatures },
    { id: "fragility" as const, label: t("Fragilidad", "Fragility"), fullLabel: t("Fragilidad / Co-movement", "Fragility / Co-movement"), state: p.fragility, stateLabel: stateLabel(p.fragility, locale), summary: fragilityCopy, featureIds: fragilityFeatures },
  ].map(pillar => ({ ...pillar, evidenceHref: `#v2-pillar-${pillar.id}` }));
  return {
    locale, state, technical, title: regimeLabel(technical ? null : output.regime, locale), interpretation,
    asOf: output.asOf, observationDate: output.observationDate, ruleId: output.diagnostics.ruleId,
    concordance: { code: output.concordance, label: t("Concordancia", "Concordance"), value: levelLabel(output.concordance, locale), description: t("Acuerdo direccional entre las dos familias de evidencia del motor; no es una probabilidad.", "Directional agreement between the engine’s two evidence families; it is not a probability.") },
    uncertainty: { code: output.uncertainty, label: t("Incertidumbre", "Uncertainty"), value: levelLabel(output.uncertainty, locale), description: t("Diversidad de regímenes plausibles al expandir los estados intermedios; no es probabilidad de caída.", "Diversity of plausible regimes when intermediate states are expanded; it is not a probability of decline."), plausibleRegimes: output.plausibleRegimes.map(regime => regimeLabel(regime, locale)) },
    dataQuality: { code: output.dataQuality, label: t("Calidad de datos", "Data quality"), value: output.dataQuality === "COMPLETE" ? t("Completa", "Complete") : output.dataQuality === "PARTIAL" ? t("Parcial", "Partial") : t("Insuficiente", "Insufficient"), prominent: output.dataQuality !== "COMPLETE", description: output.dataQuality === "INSUFFICIENT" ? t("La evidencia necesaria es insuficiente. No se adjudica un régimen económico.", "Required evidence is insufficient. No economic regime is assigned.") : output.dataQuality === "PARTIAL" ? t("La evidencia necesaria permite la lectura, pero faltan datos opcionales o tienen incidencias.", "Required evidence supports the reading, but optional data is missing or has issues.") : t("Datos requeridos y opcionales del perfil disponibles; no representa confianza estadística.", "Required and selected optional data is available; this does not represent statistical confidence.") },
    supports, brakes, watch, pillars, measurements, sources, pending, groupedPending,
    missingReasons: output.diagnostics.missingReasons.map(code => ({ code, text: regimeV2ReasonLabel(code, locale) })),
    optionalProblems: output.diagnostics.optionalProblems.map(id => ({ featureId: id, label: featureLabels[id]?.[locale === "es" ? 0 : 1] ?? id })),
    satellites: { label: t("Contexto adicional", "Additional context"), role: "CONTEXTUAL_ONLY" as const, votes: 0 as const, description: t("BTC y GLD aportan contexto. Tienen cero votos y no adjudican el régimen.", "BTC and GLD provide context. They have zero votes and do not assign the regime."), featureIds: ["btc_daily", "btc_rolling_5", "gld_shares_change_5"] },
    methodology: {
      title: "Regime Engine V2", architecture: "Evidence State Engine", parameterSet: output.parameterSet,
      engineVersion: output.engineVersion, ruleVersion: DECISION_TABLE.version, ruleId: output.diagnostics.ruleId,
      replayClass: output.replayClass, versions: output.versions,
      paragraphs: [
        t("El motor adjudica un estado mediante reglas con precedencia. Usa dos familias económicas: precios de equity y volatilidad implícita. Compartir linaje no equivale a independencia estadística.", "The engine assigns a state through ordered rules. It uses two economic families: equity prices and implied volatility. Economic lineage does not establish statistical independence."),
        t("Concordancia no es probabilidad. Incertidumbre no es probabilidad de caída. Calidad de datos no es confianza estadística.", "Concordance is not probability. Uncertainty is not a probability of decline. Data quality is not statistical confidence."),
        t("El histórico aceptado es una reconstrucción R2. No constituye una prueba fuera de muestra point-in-time desde 2019. Hoy no existe una captura real V2 completa; los estados completos de esta preview son fixtures de diseño y prueba.", "The accepted history is an R2 reconstruction. It is not a point-in-time out-of-sample test since 2019. No complete real V2 capture exists today; complete states in this preview are design and test fixtures."),
        t("La fecha de sesión se conserva junto al corte de evaluación. La disponibilidad, la captura y la versión de fuente se muestran sin atribuir horas de publicación desconocidas. Datos ausentes o antiguos no se convierten en señales de mercado.", "The session date is retained alongside the evaluation cutoff. Availability, capture and source version are shown without assigning unknown publication times. Missing or stale data does not become a market signal."),
        t("BTC y GLD son contexto con cero votos. La persistencia es solo un diagnóstico histórico y no modifica la adjudicación. El régimen describe evidencia, no rendimientos futuros ni una acción de cartera.", "BTC and GLD are context with zero votes. Persistence is historical context only and does not modify adjudication. The regime describes evidence, not future returns or a portfolio action."),
      ],
      rules: [
        t(`Participación: favorable con al menos ${C03.k_broad} de 11 sectores positivos a 5 y 21 sesiones; adversa con como máximo ${C03.k_weak} en ambas ventanas.`, `Participation: favorable with at least ${C03.k_broad} of 11 sectors positive over both 5 and 21 sessions; adverse with at most ${C03.k_weak} in both windows.`),
        t(`Liderazgo: el máximo entre crecimiento y cíclicos menos defensivos, a 21 sesiones; favorable desde +${C03.leadership_gap} punto porcentual, adverso desde −${C03.leadership_gap}.`, `Leadership: the stronger of growth and cyclicals minus defensives over 21 sessions; favorable from +${C03.leadership_gap} percentage point, adverse from −${C03.leadership_gap}.`),
        t(`Volatilidad: VIX ${C03.v_watch} / ${C03.v_adverse} / ${C03.v_stress}; salto rápido de ${C03.jump_1}% en 1 sesión o ${C03.jump_5}% en 5. Pendiente VX = (segundo / primero − 1) × 100; plana hasta ${C03.curve_flat}%, adversa hasta −${C03.curve_adverse}%.`, `Volatility: VIX ${C03.v_watch} / ${C03.v_adverse} / ${C03.v_stress}; a fast jump of ${C03.jump_1}% in 1 session or ${C03.jump_5}% in 5. VX slope = (second / first − 1) × 100; flat at or below ${C03.curve_flat}%, adverse at or below −${C03.curve_adverse}%.`),
        t("STRESS se activa por VIX ≥35, o por VIX ≥25 junto con salto rápido y pendiente VX ≤−5%. Si no hay STRESS, VIX ≥25 o pendiente ≤−5% es adverso. Si tampoco es adverso, VIX ≥20, salto rápido o pendiente ≤2% activa vigilancia. El resto es benigno.", "STRESS activates at VIX ≥35, or VIX ≥25 together with a fast jump and VX slope ≤−5%. Outside STRESS, VIX ≥25 or slope ≤−5% is adverse. Otherwise, VIX ≥20, a fast jump or slope ≤2% activates watch. The remaining state is benign."),
        t(`Fragilidad: alta desde correlación de 21 sesiones ${C03.rho_high}; ascendente desde ${C03.rho_floor} con diferencia 21−63 de al menos ${C03.delta_rising}.`, `Fragility: high from a 21-session correlation of ${C03.rho_high}; rising from ${C03.rho_floor} with a 21−63 difference of at least ${C03.delta_rising}.`),
        t("Precedencia: falta evidencia necesaria → lectura incompleta; volatilidad STRESS → STRESS; equity adverso con volatilidad WATCH/ADVERSE, o volatilidad ADVERSE con fragilidad HIGH → DEFENSIVO; combinación amplia → RISK-ON AMPLIO; participación mixta con liderazgo favorable, volatilidad benigna y fragilidad baja → RISK-ON SELECTIVO; restantes combinaciones completas → TRANSICIÓN.", "Precedence: missing required evidence → incomplete reading; STRESS volatility → STRESS; adverse equity with WATCH/ADVERSE volatility, or ADVERSE volatility with HIGH fragility → DEFENSIVE; broad combination → BROAD RISK-ON; mixed participation with favorable leadership, benign volatility and low fragility → SELECTIVE RISK-ON; remaining complete combinations → TRANSITION."),
      ],
    },
    labels: {
      supports: state === "STRESS" ? t("Evidencia favorable", "Favorable evidence") : t("Qué impulsa", "What supports it"), brakes: state === "STRESS" ? t("Evidencia adversa", "Adverse evidence") : t("Qué frena", "What holds it back"), watch: t("Qué vigilar", "What to watch"),
      evidence: t("Ver evidencia", "View evidence"), methodology: t("Cómo se calcula", "How it is calculated"),
      evidenceTitle: t("La evidencia detrás de la lectura", "The evidence behind the reading"),
      pending: t("Datos pendientes", "Pending data"), dataStatus: t("Estado de datos", "Data status"),
      latestEvidence: t("Última evidencia disponible", "Latest available evidence"),
      asOf: t("Corte de evaluación", "Evaluation cutoff"), session: t("Sesión de referencia", "Reference session"),
      source: t("Fuente", "Source"), measurement: t("Medida", "Measurement"), status: t("Estado", "Status"),
      availableAt: t("Disponible desde", "Available from"), capturedAt: t("Captura", "Captured"), publishedAt: t("Publicación", "Published"),
      unknown: t("No acreditada", "Not established"), technical: t("Estado técnico · sin régimen adjudicado", "Technical status · no regime assigned"),
      fixture: t("PREVIEW INTERNA · FIXTURE DE DISEÑO", "INTERNAL PREVIEW · DESIGN FIXTURE"),
      fixtureNote: t("Escenario determinístico de prueba. No es una lectura del mercado actual.", "Deterministic test scenario. This is not a current market reading."),
    },
  };
}

export type RegimeV2View = ReturnType<typeof buildRegimeV2View>;
