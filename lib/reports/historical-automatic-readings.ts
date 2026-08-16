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
  }> | null;
  sectors: {
    positiveCount: number;
    totalCount: number;
    negativeCount: number;
    dispersion1w: number;
    leaders: Array<{ ticker: string; name: string; return1w: number }>;
    laggards: Array<{ ticker: string; name: string; return1w: number }>;
    reading: string;
  };
  /** Amplitud relativa publicada por el dashboard al corte. Solo se incluye cuando quedó capturada. */
  breadth?: {
    rspVsSpy1wPp: number | null;
    iwmVsSpy1wPp: number | null;
    qqqVsSpy1wPp: number | null;
    sectorsOverLongAverage: number | null;
    sectorsOverLongAverageTotal: number | null;
    reading: string;
  } | null;
  /** Radar cuantitativo del dashboard al corte. Solo se incluye cuando quedó capturado. */
  quantRadar?: {
    fragilityScore: number;
    fragilityLabel: string;
    ewmaVolAnnualized: number;
    garchVolForecast: number;
    averageCorrelation21d: number;
    sectorDispersion1w: number;
  } | null;
  vix: {
    level: number;
    stateLabel: string;
    status: string;
    momentum: string;
    curve: string;
    curveText: string;
    change1d?: number;
    percentileLabel?: string;
  } | null;
  /** Estructura temporal de futuros del VIX al corte. */
  vixTermStructure?: {
    classification: string;
    vx2MinusVx1: number;
    slopeVx1Vx2Pct: number;
    vx3MinusVx1: number;
  } | null;
  btcEtfFlows: {
    lastDayUsdMillions: number;
    rolling5dUsdMillions: number;
    streakLabel: string;
    reading: string;
  } | null;
  gldFlowPressure: {
    asOf: string;
    sharesChange1dPct?: number;
    sharesChange5dPct: number;
    sharesChange20dPct?: number;
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
  }> | null;
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

// Captura complementaria ejecutada el 2026-08-03; se incorporaron únicamente módulos con datos verificables.
// Corte del informe: 2026-07-31. Cada módulo conserva la fecha propia de su último dato disponible.
// Régimen integrado fijado desde el dashboard publicado el 2026-08-03: Risk-on selectivo, Favorable, 70/100 y 62% de confianza.
export const firstAugust2026AutomaticReadings = {
  dataDate: "2026-07-31",
  regime: {
    label: "Risk-on selectivo",
    score: 70,
    confidence: 62,
    bias: "Favorable",
    interpretation:
      "Lectura compuesta de volatilidad, rotación y flujos. Ponderación actual: rotación sectorial 45%, VIX 40% y BTC ETF flows 15%.",
    support: [
      "SPY, QQQ y DIA conservaron retorno semanal positivo.",
      "La curva del VIX cerró en fuerte contango al 31 de julio.",
    ],
    caution: [
      "La dispersión sectorial semanal alcanzó 7,65 puntos porcentuales.",
      "IWM quedó rezagado y seis sectores cerraron en negativo.",
    ],
    watch: [
      "BTC ETF: +329 M USD en el último día disponible y -261 M USD en cinco días.",
      "GLD: presión neutral al 31 de julio, con -0.23 % en participaciones durante cinco sesiones.",
    ],
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
  vix: {
    level: 17.09,
    change1d: -3.5700000000000003,
    stateLabel: "Normal alto",
    status: "Normal alto",
    momentum: "Estable",
    curve: "Fuerte contango",
    curveText: "Los contratos más largos cotizan por encima del vencimiento cercano. Es una estructura habitual en entornos de volatilidad más ordenada.",
  },
  btcEtfFlows: {
    lastDayUsdMillions: 328.8,
    rolling5dUsdMillions: -261,
    streakLabel: "Racha de entradas",
    reading: "El último día disponible mostró entradas netas de 328.8 M USD, mientras el acumulado de cinco días permaneció en -261 M USD. La señal reciente es mixta.",
  },
  gldFlowPressure: {
    asOf: "2026-07-31",
    sharesChange5dPct: -0.23,
    label: "Presión neutral",
    summary: "GLD muestra presión neutral o señales contrapuestas, usando cambios en participaciones como proxy de presión de flujos.",
    sourceNote: "Cálculo propio con datos diarios de NAV, participaciones y activos netos publicados por State Street. No representa flujos oficiales reportados por el fondo.",
  },
  statisticalAssets: [
    { label: "SPY", percentile: 48.3, zScore: 0.28, distanceLongAverage: 7.12, lastClose: 747.03 },
    { label: "GLD", percentile: 1.6, zScore: -1.88, distanceLongAverage: -9.79, lastClose: 371.54 },
    { label: "EWJ", percentile: 58.8, zScore: 0.35, distanceLongAverage: 7.05, lastClose: 92.39 },
    { label: "FXI", percentile: 44.6, zScore: -0.23, distanceLongAverage: -1.22, lastClose: 36.50 },
    { label: "BTC", symbol: "BTC/USDT", percentile: 19.3, zScore: -0.92, distanceLongAverage: -11.73, lastClose: 62932.64 },
    { label: "ETH", symbol: "ETH/USDT", percentile: 40.2, zScore: -0.48, distanceLongAverage: -11.42, lastClose: 1862.55 },
  ],
} satisfies HistoricalAutomaticReadingsSnapshot;

// Captura del dashboard público ejecutada el 2026-08-16 sobre el corte de datos del 2026-08-14.
// Solo se registraron los módulos visibles en esa captura: régimen, rotación y amplitud, radar
// cuantitativo, VIX con su estructura temporal, presión de flujos en GLD y flujos de ETFs de BTC.
// Los bloques de índices vía ETF y posición técnica por activo no quedaron capturados a esa fecha y
// permanecen en null: el snapshot histórico no se completa con datos vivos posteriores.
export const secondAugust2026AutomaticReadings = {
  dataDate: "2026-08-14",
  regime: {
    label: "Risk-on selectivo",
    score: 61,
    confidence: 66,
    bias: "Favorable",
    interpretation:
      "Lectura compuesta de volatilidad, rotación y flujos. Ponderación actual: rotación sectorial 45%, VIX 40% y BTC ETF flows 15%.",
    support: [
      "Sectores: 9 de 11 cerraron la semana en positivo y 8 de 11 quedaron sobre su media larga.",
      "Curva del VIX: fuerte contango, con VX2 - VX1 en +2,36 puntos al corte.",
      "Radar cuantitativo: fragilidad 20/100 y correlación promedio de 0,11.",
    ],
    caution: [
      "La dispersión sectorial semanal alcanzó 9,1 puntos porcentuales.",
      "La amplitud relativa siguió negativa: RSP/SPY -1,1 pp e IWM/SPY -1,7 pp.",
      "BTC ETF: -123 M USD en el último día disponible y -229 M USD en cinco sesiones.",
    ],
    watch: [
      "VIX en 17,8, clasificado como normal alto y con momentum estable (percentil 42).",
      "GLD: entrada neta probable, con +0,59 % en participaciones durante cinco sesiones.",
      "QQQ/SPY aparecía como pendiente en el dashboard al corte.",
    ],
  },
  indices: null,
  sectors: {
    positiveCount: 9,
    totalCount: 11,
    negativeCount: 2,
    dispersion1w: 9.1,
    leaders: [{ ticker: "XLE", name: "Energía", return1w: 7.7 }],
    laggards: [{ ticker: "XLY", name: "Consumo discrecional", return1w: -1.4 }],
    reading:
      "Nueve de once sectores cerraron la semana en positivo, pero la dispersión de 9,1 puntos porcentuales entre líder y rezagado indica que el índice no describe por sí solo la experiencia interna del mercado.",
  },
  breadth: {
    rspVsSpy1wPp: -1.1,
    iwmVsSpy1wPp: -1.7,
    qqqVsSpy1wPp: null,
    sectorsOverLongAverage: 8,
    sectorsOverLongAverageTotal: 11,
    reading:
      "El equal weight y las small caps quedaron por detrás del índice ponderado por capitalización durante la semana. QQQ/SPY aparecía como pendiente en el dashboard al corte y no se completa con datos posteriores.",
  },
  quantRadar: {
    fragilityScore: 20,
    fragilityLabel: "Baja",
    ewmaVolAnnualized: 7.7,
    garchVolForecast: 8.0,
    averageCorrelation21d: 0.11,
    sectorDispersion1w: 9.1,
  },
  vix: {
    level: 17.8,
    stateLabel: "Normal alto",
    status: "Normal alto",
    momentum: "Estable",
    curve: "Fuerte contango",
    curveText:
      "Los contratos más largos cotizan por encima del vencimiento cercano. Es una estructura habitual en entornos de volatilidad más ordenada.",
    percentileLabel: "p42 · rango habitual",
  },
  vixTermStructure: {
    classification: "Fuerte contango",
    vx2MinusVx1: 2.36,
    slopeVx1Vx2Pct: 15.2,
    vx3MinusVx1: 4.02,
  },
  btcEtfFlows: {
    lastDayUsdMillions: -123,
    rolling5dUsdMillions: -229,
    streakLabel: "Racha de salidas · 2 días",
    reading:
      "El último día disponible registró salidas netas de 123 M USD y el acumulado de cinco sesiones quedó en -229 M USD. La señal permanece mixta.",
  },
  gldFlowPressure: {
    asOf: "2026-08-14",
    sharesChange1dPct: 0.03,
    sharesChange5dPct: 0.59,
    sharesChange20dPct: 2.49,
    label: "Entrada neta probable",
    summary:
      "GLD muestra entrada neta probable, usando cambios en participaciones como proxy de presión de flujos: +0,03 % en una sesión, +0,59 % en cinco y +2,49 % en veinte.",
    sourceNote:
      "Cálculo propio con datos diarios de NAV, participaciones y activos netos publicados por State Street. No representa flujos oficiales reportados por el fondo.",
  },
  statisticalAssets: null,
} satisfies HistoricalAutomaticReadingsSnapshot;

const historicalSnapshots = new Map<string, HistoricalAutomaticReadingsSnapshot>([
  ["segundo-informe-julio-2026", secondJuly2026AutomaticReadings],
  ["primer-informe-agosto-2026", firstAugust2026AutomaticReadings],
  ["segundo-informe-agosto-2026", secondAugust2026AutomaticReadings],
]);

export function getHistoricalAutomaticReadings(reportId: string) {
  return historicalSnapshots.get(reportId) ?? null;
}
