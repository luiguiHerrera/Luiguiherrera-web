import type { BtcEtfFlowsDashboardData, RegimeBias, RegimeSignal, RegimeSummary, SectorRotationData, VixDashboardData } from "@/lib/dashboard/types";

type PillarScore = {
  score: number;
  confidencePenalty: number;
  support: RegimeSignal[];
  caution: RegimeSignal[];
};

const CURRENT_WEIGHTS = {
  sectorRotation: 0.45,
  vix: 0.4,
  btcEtfFlows: 0.15,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function sectorScore(data: SectorRotationData | null): PillarScore {
  if (!data) {
    return {
      score: 50,
      confidencePenalty: 18,
      support: [],
      caution: [{ label: "Rotación", detail: "Rotación sectorial no disponible; se reduce la confianza de la lectura compuesta." }],
    };
  }

  const topFive = [...data.sectors].sort((a, b) => b.return1w - a.return1w).slice(0, 5);
  const bottomFive = [...data.sectors].sort((a, b) => a.return1w - b.return1w).slice(0, 5);
  const growthTop = topFive.filter((sector) => sector.group === "growth").length;
  const cyclicalTop = topFive.filter((sector) => sector.group === "cyclical").length;
  const defensiveTop = topFive.filter((sector) => sector.group === "defensive").length;
  const growthBottom = bottomFive.filter((sector) => sector.group === "growth").length;
  const cyclicalBottom = bottomFive.filter((sector) => sector.group === "cyclical").length;
  const defensiveBottom = bottomFive.filter((sector) => sector.group === "defensive").length;

  let score = 50;
  const support: RegimeSignal[] = [];
  const caution: RegimeSignal[] = [];

  if (data.metrics.reading === "growth" || data.metrics.reading === "cíclica") score += 18;
  if (data.metrics.reading === "defensiva") score -= 18;
  if (growthTop + cyclicalTop >= 3 && defensiveBottom >= 2) {
    score += 15;
    support.push({ label: "Rotación", detail: "Sectores growth/cíclicos lideran y defensivos quedan rezagados." });
  }
  if (defensiveTop >= 3 && growthBottom + cyclicalBottom >= 3) {
    score -= 18;
    caution.push({ label: "Rotación", detail: "Defensivos lideran mientras growth/cíclicos quedan débiles." });
  }
  if (data.metrics.reading === "mixta") {
    support.push({ label: "Rotación", detail: "Rotación mixta; no domina una lectura defensiva extrema." });
  }
  if (data.metrics.sectorDispersion1w > 4) {
    score -= 5;
    caution.push({ label: "Dispersión sectorial", detail: `Dispersión 1W de ${formatPercent(data.metrics.sectorDispersion1w)}; reduce la confianza del régimen.` });
  }

  if (support.length === 0 && score > 50) {
    support.push({ label: "Rotación", detail: data.metrics.interpretation });
  }
  if (caution.length === 0 && score < 50) {
    caution.push({ label: "Rotación", detail: data.metrics.interpretation });
  }

  return {
    score: clamp(score, 0, 100),
    confidencePenalty: data.dataStatus === "automated" ? 0 : 12,
    support,
    caution,
  };
}

function vixScore(data: VixDashboardData | null): PillarScore {
  if (!data || data.spot.latestVix === null || data.spot.dataStatus !== "automated") {
    return {
      score: 50,
      confidencePenalty: 18,
      support: [],
      caution: [{ label: "VIX", detail: "VIX no disponible o retrasado; se reduce la confianza de la lectura compuesta." }],
    };
  }

  const spot = data.spot;
  let score = 55;
  const support: RegimeSignal[] = [];
  const caution: RegimeSignal[] = [];

  if (["Complacencia", "Normal bajo", "Normal alto"].includes(spot.vixCompositeLabel) || ["low", "normal"].includes(spot.vixSeverity)) {
    score += 15;
    support.push({ label: "Volatilidad", detail: `${spot.vixCompositeLabel}: presión de volatilidad contenida.` });
  }
  if (spot.vixSeverity === "watch") {
    score -= 8;
    caution.push({ label: "Volatilidad", detail: `${spot.vixCompositeLabel}: zona de vigilancia.` });
  }
  if (spot.vixSeverity === "elevated") {
    score -= 20;
    caution.push({ label: "Volatilidad", detail: "Tensión: volatilidad por encima de rangos normales." });
  }
  if (spot.vixSeverity === "stress" || spot.vixSeverity === "extreme") {
    score -= 35;
    caution.push({ label: "Volatilidad", detail: `${spot.vixCompositeLabel}: el régimen no puede ser constructivo con volatilidad en estrés.` });
  }
  if (spot.vixTrend === "rising_fast") {
    score -= 12;
    caution.push({ label: "Momentum VIX", detail: "VIX subiendo rápido; aumenta la cautela." });
  }
  if (spot.vixTrend === "falling" && spot.vixSeverity !== "stress" && spot.vixSeverity !== "extreme") {
    score += 8;
    support.push({ label: "Momentum VIX", detail: "VIX bajando fuera de zona de estrés." });
  }

  return {
    score: clamp(score, 0, 100),
    confidencePenalty: spot.dataStatus === "automated" ? 0 : 12,
    support,
    caution,
  };
}

function btcScore(data: BtcEtfFlowsDashboardData | null): PillarScore {
  if (!data) {
    return {
      score: 50,
      confidencePenalty: 15,
      support: [],
      caution: [{ label: "BTC ETF flows", detail: "Flujos BTC ETF no disponibles; se reduce la confianza." }],
    };
  }

  const flows = data.flows;
  let score = 50;
  const support: RegimeSignal[] = [];
  const caution: RegimeSignal[] = [];

  if (flows.readingSeverity === "positive") {
    score += 18;
    support.push({ label: "BTC ETF flows", detail: "Entradas sostenidas favorecen apetito por riesgo cripto/institucional." });
  } else if (flows.readingSeverity === "negative") {
    score -= 18;
    caution.push({ label: "BTC ETF flows", detail: "Presión de salidas aumenta la cautela en exposición vía ETFs." });
  } else {
    support.push({ label: "BTC ETF flows", detail: "Flujos mixtos aportan lectura neutral." });
  }

  if (flows.flowStreak.direction === "outflow" && flows.flowStreak.count >= 3) {
    score -= 8;
    caution.push({ label: "Racha BTC ETF", detail: flows.flowStreak.label });
  }
  if (flows.flowStreak.direction === "inflow" && flows.flowStreak.count >= 3) {
    score += 6;
    support.push({ label: "Racha BTC ETF", detail: flows.flowStreak.label });
  }

  const confidencePenalty = flows.dataStatus === "automated" ? (flows.rowsParsed < 10 ? 10 : flows.rowsParsed < 20 ? 6 : 0) : 14;
  return { score: clamp(score, 0, 100), confidencePenalty, support, caution };
}

function hasStressConfirmation(
  score: number,
  vix: VixDashboardData | null,
  sectorRotation: SectorRotationData | null,
  btcEtfFlows: BtcEtfFlowsDashboardData | null,
) {
  const vixSeverity = vix?.spot.vixSeverity;
  const vixRisingFast = vix?.spot.vixTrend === "rising_fast";
  const defensiveRotation = sectorRotation?.metrics.reading === "defensiva";
  const negativeBtcFlows = btcEtfFlows?.flows.readingSeverity === "negative";

  if (vixSeverity === "stress" || vixSeverity === "extreme") return true;
  if (vixSeverity === "elevated" && vixRisingFast && defensiveRotation) return true;
  if (score <= 20 && vixSeverity === "elevated" && defensiveRotation && negativeBtcFlows) return true;

  return false;
}

function labelFromScore(
  score: number,
  vix: VixDashboardData | null,
  sectorRotation: SectorRotationData | null,
  btcEtfFlows: BtcEtfFlowsDashboardData | null,
): RegimeSummary["current"] {
  const stressConfirmed = hasStressConfirmation(score, vix, sectorRotation, btcEtfFlows);

  if (score <= 20) return stressConfirmed ? "Estrés" : "Cautela";
  if (score <= 40) return "Cautela";
  if (score <= 60) return "Neutral / mixto";
  if (score <= 80) return "Risk-on selectivo";
  return "Risk-on constructivo";
}

function biasFromLabel(label: RegimeSummary["current"]): RegimeBias {
  if (label === "Risk-on constructivo" || label === "Risk-on selectivo") return "favorable";
  if (label === "Neutral / mixto") return "neutral";
  if (label === "Cautela") return "cautious";
  return "stress";
}

function interpretationForLabel(label: RegimeSummary["current"]) {
  const weighting = "Ponderación actual: rotación sectorial 45%, VIX 40% y BTC ETF flows 15%.";

  if (label === "Cautela") {
    return `El mercado muestra deterioro en varias lecturas, pero aún no hay confirmación suficiente para clasificarlo como estrés. ${weighting}`;
  }
  if (label === "Estrés") {
    return `Las lecturas de volatilidad y rotación apuntan a un entorno de presión elevada. ${weighting}`;
  }

  return `Lectura compuesta de volatilidad, rotación y flujos. ${weighting}`;
}

export function buildRegimeSummary({
  btcEtfFlows,
  sectorRotation,
  vix,
}: {
  btcEtfFlows: BtcEtfFlowsDashboardData | null;
  sectorRotation: SectorRotationData | null;
  vix: VixDashboardData | null;
}): RegimeSummary {
  const sector = sectorScore(sectorRotation);
  const volatility = vixScore(vix);
  const btc = btcScore(btcEtfFlows);
  let score =
    sector.score * CURRENT_WEIGHTS.sectorRotation +
    volatility.score * CURRENT_WEIGHTS.vix +
    btc.score * CURRENT_WEIGHTS.btcEtfFlows;

  const cautionSignals = [...sector.caution, ...volatility.caution, ...btc.caution];
  const supportSignals = [...sector.support, ...volatility.support, ...btc.support];

  if ((vix?.spot.vixTrend === "rising_fast" && btcEtfFlows?.flows.readingSeverity === "negative") || (sectorRotation?.metrics.reading === "defensiva" && ["elevated", "stress", "extreme"].includes(vix?.spot.vixSeverity ?? ""))) {
    score -= 8;
    cautionSignals.push({ label: "Cruce de riesgo", detail: "Volatilidad/rotación o flujos coinciden en lectura de cautela." });
  }

  const regimeScore = Math.round(clamp(score, 0, 100));
  const label = labelFromScore(regimeScore, vix, sectorRotation, btcEtfFlows);
  const confidence = Math.round(clamp(88 - sector.confidencePenalty - volatility.confidencePenalty - btc.confidencePenalty, 35, 95));

  return {
    current: label,
    bias: biasFromLabel(label),
    confidence,
    regimeScore,
    sourceName: "Rotación sectorial, VIX y BTC ETF flows",
    lastUpdated: "Última actualización disponible por módulo",
    updateFrequency: "Diaria / según disponibilidad de cada fuente",
    dataStatus: sectorRotation?.dataStatus === "automated" && vix?.spot.dataStatus === "automated" && btcEtfFlows?.flows.dataStatus === "automated" ? "automated" : "fallback",
    reliabilityNote: "Este régimen no anticipa el mercado. Organiza lecturas de volatilidad, rotación y flujos para leer el contexto.",
    dataQualityNote: "La confianza se ajusta según la disponibilidad y calidad de rotación sectorial, VIX y BTC ETF flows.",
    interpretation: interpretationForLabel(label),
    whatItDoesNotMean: "No es una recomendación de inversión, no elige activos y no anticipa retornos futuros.",
    riskSupportSignals: supportSignals.slice(0, 5),
    cautionSignals: cautionSignals.slice(0, 6),
  };
}
