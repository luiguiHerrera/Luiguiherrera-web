// Interpretation layer only. Input: existing, warmed-up, calendar-closed RAMO/RASI.
// Durations and priority below are our editorial operating rules, not McClellan thresholds.
export const READING_POLICY = Object.freeze({
  version: "sp500-reading-v1", minimumHistory: 60, confirmation: 2,
  priorDecline: 3, reboundRise: 3, reboundLookback: 60, lifetime: 5,
});

export const MCCLELLAN_SOURCES = Object.freeze({
  structure: { title: "RASI Stalled at the +500 Level", url: "https://www.mcoscillator.com/learning_center/weekly_chart/rasi_stalled_at_the_500_level/", published: "2026-05-15" },
  zero: { title: "Summation Index and Zero", url: "https://www.mcoscillator.com/learning_center/kb/market_data/summation_index_and_zero/" },
  oscillator: { title: "Oscillator Breaking Zero", url: "https://www.mcoscillator.com/learning_center/kb/mcclellan_oscillator/oscillator_breaking_zero/" },
});

export const SIGN_GUIDE = Object.freeze([
  { key: "++", ramo: "+", rasi: "+", label: "Fortaleza acumulada mejorando" },
  { key: "-+", ramo: "−", rasi: "+", label: "Deterioro reciente con saldo positivo" },
  { key: "+-", ramo: "+", rasi: "−", label: "Recuperación inicial con saldo negativo" },
  { key: "--", ramo: "−", rasi: "−", label: "Debilidad reciente y acumulada" },
]);

export function signQuadrant(point) {
  if (!point || !Number.isFinite(point.oscillator) || !Number.isFinite(point.summation)) return null;
  if (point.oscillator === 0 || point.summation === 0) return null;
  return (point.oscillator > 0 ? "+" : "-") + (point.summation > 0 ? "+" : "-");
}

function validHistory(points) {
  if (!Array.isArray(points) || points.length < READING_POLICY.minimumHistory) return false;
  return points.every((point, i) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(point.date) || !Number.isFinite(Date.parse(point.date))
      || new Date(point.date + "T12:00Z").toISOString().slice(0, 10) !== point.date
      || !Number.isFinite(point.oscillator) || !Number.isFinite(point.summation)) return false;
    const previous = points[i - 1];
    return !previous || (point.date > previous.date
      && Math.abs(point.summation - previous.summation - point.oscillator) < 1e-7);
  });
}

function event(kind, priority, points, index, onset, extra = {}) {
  return {
    kind, priority, confirmedIndex: index, confirmedAt: points[index].date,
    onsetAt: points[onset].date,
    id: `${READING_POLICY.version}:${kind}:${points[onset].date}`,
    ...extra,
  };
}

// Causal scan: a local maximum becomes a confirmed turn only after two later closes.
// A one-session dip can be absorbed by an ongoing rebound; a new higher peak replaces it.
function detectEvents(points) {
  const events = [];
  let negativeRun = 0, positiveRun = 0, rebound = null;
  const runs = { oscillator: 0, summation: 0 };
  for (let i = 0; i < points.length; i++) {
    const point = points[i], previous = points[i - 1];
    const negativeBefore = negativeRun;
    negativeRun = point.oscillator < 0 ? negativeRun + 1 : 0;
    positiveRun = point.oscillator > 0 ? positiveRun + 1 : 0;

    for (const field of ["summation", "oscillator"]) {
      const direction = Math.sign(point[field]);
      runs[field] = previous && direction !== 0 && direction === Math.sign(previous[field]) ? runs[field] + 1 : direction === 0 ? 0 : 1;
      if (runs[field] !== READING_POLICY.confirmation || i < READING_POLICY.minimumHistory - 1) continue;
      const before = points[i - READING_POLICY.confirmation];
      // Touching zero alone is not a sign-to-sign crossing.
      if (!before || Math.sign(before[field]) !== -direction) continue;
      events.push(event(`${field}-${direction > 0 ? "up" : "down"}`, field === "summation" ? 2 : 3,
        points, i, i - READING_POLICY.confirmation + 1, { direction }));
    }

    if (rebound && (i - rebound.trough > READING_POLICY.reboundLookback
      || point.summation < points[rebound.trough].summation)) rebound = null;
    if (!rebound && previous && point.oscillator > 0
      && negativeBefore >= READING_POLICY.priorDecline && previous.summation < 0) {
      rebound = { trough: i - 1, peak: i, riseConfirmed: false };
    }
    if (!rebound) continue;
    if (positiveRun >= READING_POLICY.reboundRise) rebound.riseConfirmed = true;
    if (point.summation >= points[rebound.peak].summation) rebound.peak = i;
    if (rebound.riseConfirmed && negativeRun === READING_POLICY.confirmation
      && rebound.peak === i - READING_POLICY.confirmation
      && i >= READING_POLICY.minimumHistory - 1) {
      const trough = points[rebound.trough], peak = points[rebound.peak];
      const detected = event("rebound-turn", 1, points, i, rebound.peak + 1, {
        trough: { date: trough.date, value: trough.summation },
        peak: { date: peak.date, value: peak.summation },
      });
      detected.id = `${READING_POLICY.version}:rebound-turn:${trough.date}:${peak.date}`;
      events.push(detected);
      rebound = null;
    }
  }
  return events;
}

export function selectMcClellanReading(points, { cutoffDate, stale = false } = {}) {
  if (stale || !validHistory(points)) return null;
  const latest = points.at(-1);
  if (!cutoffDate || latest.date !== cutoffDate) return null;
  const active = detectEvents(points).filter(candidate => {
    if (points.length - 1 - candidate.confirmedIndex >= READING_POLICY.lifetime) return false;
    const since = points.slice(candidate.confirmedIndex);
    if (candidate.kind === "rebound-turn") {
      return since.every(point => point.oscillator < 0 && point.summation < candidate.peak.value);
    }
    const field = candidate.kind.startsWith("summation") ? "summation" : "oscillator";
    return since.every(point => Math.sign(point[field]) === candidate.direction);
  });
  active.sort((a, b) => a.priority - b.priority || b.confirmedIndex - a.confirmedIndex);
  const selected = active[0];
  if (!selected) return null;
  const common = { ...selected, asOf: latest.date };
  if (selected.kind === "rebound-turn") return {
    ...common, title: "El rebote de la amplitud ha girado a la baja",
    body: latest.summation > 0
      ? "Tras la recuperación desde un saldo negativo, el RASI ha marcado un máximo local y ha descendido después. Conserva saldo positivo, con deterioro del impulso reciente."
      : latest.summation < 0
        ? "Tras la recuperación desde un saldo negativo, el RASI ha marcado un máximo local y ha descendido después. El saldo acumulado continúa en terreno negativo."
        : "Tras la recuperación desde un saldo negativo, el RASI ha marcado un máximo local y ha descendido después. El saldo acumulado ha vuelto a cero.",
    criterion: "Regla propia: caída previa de al menos 3 cierres, rebote con al menos 3 RAMO positivos consecutivos y giro posterior con 2 negativos. Se admite un retroceso aislado si después se supera el máximo. No se utiliza el nivel +500 de la NYSE.",
    source: MCCLELLAN_SOURCES.structure,
  };
  if (selected.kind.startsWith("summation")) return {
    ...common, title: selected.direction > 0 ? "El saldo acumulado ha pasado a positivo" : "El saldo acumulado ha pasado a negativo",
    body: selected.direction > 0
      ? "El RASI ha cruzado cero y acumula al menos dos cierres del lado positivo. La recuperación de la amplitud ya se refleja en el saldo acumulado."
      : "El RASI ha cruzado cero y acumula al menos dos cierres del lado negativo. El deterioro reciente ya se refleja en el saldo acumulado.",
    criterion: "Regla propia: cruce de signo del RASI y 2 cierres consecutivos del nuevo lado de cero. El cero es la referencia de la versión ajustada; la confirmación temporal es nuestra.",
    source: MCCLELLAN_SOURCES.zero,
  };
  return {
    ...common, title: selected.direction > 0 ? "El impulso reciente ha pasado a positivo" : "El impulso reciente ha pasado a negativo",
    body: (selected.direction > 0
      ? "El RAMO ha cruzado cero y acumula al menos dos cierres positivos; el RASI vuelve a aumentar. "
      : "El RAMO ha cruzado cero y acumula al menos dos cierres negativos; el RASI vuelve a disminuir. ")
      + (latest.summation > 0 ? "El saldo acumulado sigue siendo positivo." : latest.summation < 0 ? "El saldo acumulado sigue siendo negativo." : "El saldo acumulado está en cero."),
    criterion: "Regla propia: cruce de signo del RAMO y 2 cierres consecutivos del nuevo lado de cero. El contexto del RASI matiza el cruce; no implica por sí solo un cambio del precio.",
    source: MCCLELLAN_SOURCES.oscillator,
  };
}
