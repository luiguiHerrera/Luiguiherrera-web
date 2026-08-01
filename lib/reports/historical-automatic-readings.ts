export type HistoricalAutomaticReadingsSnapshot = {
  dataDate: string;
  regime: {
    label: string;
    score: number | null;
    confidence: number | null;
    bias: string;
    interpretation: string;
    support: string[];
    caution: string[];
    watch: string[];
  };
  indices: Array<{
    ticker: "SPY" | "QQQ" | "DIA" | "IWM";
    return1w: number;
    distanceLongAverage: number;
    distanceFromHigh: number;
  }>;
  sectors: {
    positiveCount: number;
    totalCount: number;
    negativeCount: number;
    dispersion1w: number;
    leaders: Array<{ ticker: string; name: string; return1w: number }>;
    laggards: Array<{ ticker: string; name: string; return1w: number }>;
    reading: string;
  };
  vix: {
    level: number;
    change1d: number;
    stateLabel: string;
    status: string;
    momentum: string;
    curve: string;
    curveText: string;
  } | null;
  btcEtfFlows: {
    lastDayUsdMillions: number;
    rolling5dUsdMillions: number;
    streakLabel: string;
    reading: string;
  } | null;
  gldFlowPressure: {
    asOf: string;
    sharesChange5dPct: number;
    label: string;
    summary: string;
    sourceNote: string;
  } | null;
  statisticalAssets: Array<{
    label: "SPY" | "GLD" | "EWJ" | "FXI" | "BTC" | "ETH";
    symbol?: string;
    percentile: number;
    zScore: number;
    distanceLongAverage: number;
    lastClose: number;
  }>;
};

// Source: immutable Vercel deployment for commit ce32ff886f04d0a1fd36f9f73a0492a5718d2d23.
// Evidence SHA-256: d653ca10148456dcdf565c62aee0956e6005c92e84e5c00737c0aa575b3b9e70.
export const secondJuly2026AutomaticReadings = {
  dataDate: "2026-07-18",
  regime: {
    label: "Cautela",
    score: 36,
    confidence: 58,
    bias: "cautious",
    interpretation:
      "El mercado muestra deterioro en varias lecturas, pero aún no hay confirmación suficiente para clasificarlo como estrés. Ponderación actual: rotación sectorial 45%, VIX 40%, BTC ETF flows 15% y FedWatch 0% mientras esté pendiente.",
    support: [
      "Rotación: Rotación mixta; no domina una lectura defensiva extrema.",
      "BTC ETF flows: Flujos mixtos aportan lectura neutral.",
    ],
    caution: [
      "Rotación: Defensivos lideran mientras growth/cíclicos quedan débiles.",
      "Volatilidad: Vigilancia: zona de vigilancia.",
      "Momentum VIX: VIX subiendo rápido; aumenta la cautela.",
    ],
    watch: [
      "Curva VIX: Contango moderado.",
      "Flujos BTC ETF: Flujos mixtos.",
      "La lectura sugiere una rotación mixta. No implica dirección futura del mercado.",
    ],
  },
  indices: [
    { ticker: "SPY", return1w: -0.8, distanceLongAverage: 7.2, distanceFromHigh: -1.9 },
    { ticker: "QQQ", return1w: -2.3, distanceLongAverage: 8.7, distanceFromHigh: -6.7 },
    { ticker: "DIA", return1w: -0.7, distanceLongAverage: 7.4, distanceFromHigh: -1.7 },
    { ticker: "IWM", return1w: 0.2, distanceLongAverage: 12.0, distanceFromHigh: -2.1 },
  ],
  sectors: {
    positiveCount: 5,
    totalCount: 11,
    negativeCount: 6,
    dispersion1w: 2.6,
    leaders: [
      { ticker: "XLU", name: "Utilities", return1w: 1.2 },
      { ticker: "XLP", name: "Consumo básico/defensivo", return1w: 0.9 },
      { ticker: "XLV", name: "Salud", return1w: 0.7 },
    ],
    laggards: [
      { ticker: "XLK", name: "Tecnología", return1w: -1.4 },
      { ticker: "XLY", name: "Consumo discrecional", return1w: -0.8 },
      { ticker: "XLE", name: "Energía", return1w: -0.5 },
    ],
    reading: "La lectura sugiere una rotación mixta. No implica dirección futura del mercado.",
  },
  vix: {
    level: 18.8,
    change1d: 2.0,
    stateLabel: "Atención",
    status: "Vigilancia",
    momentum: "Subiendo rápido",
    curve: "Contango moderado",
    curveText:
      "Los contratos más largos cotizan por encima del vencimiento cercano. Es una estructura habitual en entornos de volatilidad más ordenada.",
  },
  btcEtfFlows: {
    lastDayUsdMillions: 124,
    rolling5dUsdMillions: -228,
    streakLabel: "Racha de entradas",
    reading: "No hay una dirección dominante clara en los flujos recientes.",
  },
  gldFlowPressure: {
    asOf: "2026-07-17",
    sharesChange5dPct: -0.34,
    label: "Salida neta probable",
    summary:
      "GLD muestra salida neta probable a 5 sesiones, usando cambios en participaciones como proxy de presión de flujos.",
    sourceNote:
      "Cálculo propio con datos diarios de NAV, participaciones y activos netos publicados por State Street. No representa flujos oficiales reportados por el fondo.",
  },
  statisticalAssets: [
    { label: "SPY", percentile: 48.9, zScore: 0.31, distanceLongAverage: 7.2, lastClose: 743.29 },
    { label: "GLD", percentile: 0.7, zScore: -1.99, distanceLongAverage: -10.4, lastClose: 368.41 },
    { label: "EWJ", percentile: 48.9, zScore: 0.19, distanceLongAverage: 5.7, lastClose: 90.49 },
    { label: "FXI", percentile: 22.1, zScore: -0.80, distanceLongAverage: -8.2, lastClose: 34.13 },
    { label: "BTC", symbol: "BTC/USDT", percentile: 18.4, zScore: -0.97, distanceLongAverage: -12.6, lastClose: 63941 },
    { label: "ETH", symbol: "ETH/USDT", percentile: 31.1, zScore: -0.63, distanceLongAverage: -15.8, lastClose: 1844.21 },
  ],
} satisfies HistoricalAutomaticReadingsSnapshot;

export const firstAugust2026AutomaticReadings = {
  dataDate: "2026-07-31",
  regime: {
    label: "Lectura parcial al cierre",
    score: null,
    confidence: null,
    bias: "selectivo",
    interpretation: "El snapshot congelado confirma dispersión elevada y fortaleza desigual. No se publica un score ni una confianza agregada porque al corte faltaban flujos archivados de BTC y GLD; las métricas disponibles no se completan con datos posteriores.",
    support: ["Cinco de once sectores cerraron con retorno semanal positivo.", "SPY, QQQ y DIA conservaron retorno semanal positivo."],
    caution: ["La dispersión sectorial semanal alcanzó 7,65 puntos porcentuales.", "IWM quedó rezagado y seis sectores cerraron en negativo."],
    watch: ["VIX spot disponible con último cierre oficial del 30 de julio; curva no disponible al cierre.", "Flujos de BTC y presión de flujos en GLD: No disponible al cierre."],
  },
  indices: [
    { ticker: "SPY", return1w: 1.07, distanceLongAverage: 7.12, distanceFromHigh: -1.40 },
    { ticker: "QQQ", return1w: 0.86, distanceLongAverage: 6.86, distanceFromHigh: -7.69 },
    { ticker: "DIA", return1w: 0.59, distanceLongAverage: 7.48, distanceFromHigh: -1.06 },
    { ticker: "IWM", return1w: -0.58, distanceLongAverage: 9.92, distanceFromHigh: -3.08 },
  ],
  sectors: {
    positiveCount: 5, totalCount: 11, negativeCount: 6, dispersion1w: 7.65,
    leaders: [{ ticker: "XLY", name: "Consumo discrecional", return1w: 4.74 }, { ticker: "XLE", name: "Energía", return1w: 2.04 }, { ticker: "XLK", name: "Tecnología", return1w: 0.60 }],
    laggards: [{ ticker: "XLU", name: "Utilities", return1w: -2.91 }, { ticker: "XLB", name: "Materiales", return1w: -1.87 }, { ticker: "XLI", name: "Industriales", return1w: -1.83 }],
    reading: "La amplitud sectorial fue negativa y la dispersión alta: el índice no describió por sí solo la experiencia interna del mercado.",
  },
  vix: { level: 17.09, change1d: -3.57, stateLabel: "Normal", status: "Ordenado", momentum: "Bajando rápido", curve: "No disponible al cierre", curveText: "El spot procede del último cierre disponible en FRED al 30 de julio. La curva no se completa con observaciones posteriores." },
  btcEtfFlows: null,
  gldFlowPressure: null,
  statisticalAssets: [
    { label: "SPY", percentile: 48.3, zScore: 0.28, distanceLongAverage: 7.12, lastClose: 747.03 },
    { label: "GLD", percentile: 1.6, zScore: -1.88, distanceLongAverage: -9.79, lastClose: 371.54 },
    { label: "EWJ", percentile: 58.8, zScore: 0.35, distanceLongAverage: 7.05, lastClose: 92.39 },
    { label: "FXI", percentile: 44.6, zScore: -0.23, distanceLongAverage: -1.22, lastClose: 36.50 },
    { label: "BTC", symbol: "BTC/USDT", percentile: 19.3, zScore: -0.92, distanceLongAverage: -11.73, lastClose: 62932.64 },
    { label: "ETH", symbol: "ETH/USDT", percentile: 40.2, zScore: -0.48, distanceLongAverage: -11.42, lastClose: 1862.55 },
  ],
} satisfies HistoricalAutomaticReadingsSnapshot;

const historicalSnapshots = new Map<string, HistoricalAutomaticReadingsSnapshot>([
  ["segundo-informe-julio-2026", secondJuly2026AutomaticReadings],
  ["primer-informe-agosto-2026", firstAugust2026AutomaticReadings],
]);

export function getHistoricalAutomaticReadings(reportId: string) {
  return historicalSnapshots.get(reportId) ?? null;
}
