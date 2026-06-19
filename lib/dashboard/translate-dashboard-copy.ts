import type { DataStatus, RegimeBias } from "@/lib/dashboard/types";

const phraseMap: Array<[RegExp, string]> = [
  [/Defensivos lideran mientras growth\/cíclicos quedan débiles\./g, "Defensives lead while growth/cyclical sectors remain weak."],
  [/Defensivos lideran mientras growth\/cíclicos quedan débiles/g, "Defensives lead while growth/cyclical sectors remain weak"],
  [/Defensivos lideran mientras growth\/cíclicos quedan rezagados\.?/g, "Defensives lead while growth/cyclical sectors lag."],
  [/Datos automáticos no disponibles temporalmente\. Datos demo mantienen activa la estructura visual\./g, "Automated data temporarily unavailable. Demo data keeps the visual structure active."],
  [/Racha de (\d+) días de salidas/g, "$1-day outflow streak"],
  [/No hay una dirección dominante clara en los flujos recientes\./g, "Recent flows do not show a clear dominant direction."],
  [/Volatilidad implícita pendiente de actualización\./g, "Implied volatility pending update."],
  [/Referencia amplia de mercado; lectura contextual, no señal operativa\./g, "Broad market reference; contextual reading, not an execution signal."],
  [/Punto de partida para observar concentración temática y exposición institucional diferida\./g, "Starting point to observe thematic concentration and delayed institutional exposure."],
  [/Lectura parcial de exposición vía ETF spot de Bitcoin; no implica dirección de precio\./g, "Partial exposure read through a spot Bitcoin ETF; it does not imply price direction."],
  [/Los contratos más largos cotizan por encima[^.]*\./g, "Longer contracts trade above the near-term contract. This is a common structure in calmer volatility regimes."],
  [/La lectura sugiere una rotación mixta\.?/g, "The reading suggests mixed rotation."],
  [/Volatilidad: vigilancia: zona de vigilancia\.?/gi, "Volatility: watch zone."],
  [/Momentum VIX: VIX subiendo rápido; aumenta la cautela\.?/gi, "VIX momentum: VIX rising fast; caution increases."],
  [/Curva VIX: Fuerte contango/g, "VIX curve: strong contango"],
  [/Flujos BTC ETF: Flujos mixtos/g, "BTC ETF flows: mixed flows"],
  [/BTC ETF flows: Flujos mixtos aportan lectura neutral\./g, "BTC ETF flows: mixed flows add a neutral read."],
  [/Rotación: Rotación mixta; no domina una lectura defensiva extrema\./g, "Rotation: mixed rotation; no extreme defensive reading dominates."],
  [/Cautela/g, "Caution"],
  [/Neutral \/ mixto/g, "Neutral / mixed"],
  [/Estrés/g, "Stress"],
  [/Expansivo/g, "Expansion"],
  [/Defensivo/g, "Defensive"],
  [/Vigilancia/g, "Watch"],
  [/zona de vigilancia/gi, "watch zone"],
  [/Rotación sectorial/g, "Sector rotation"],
  [/Rotación mixta/g, "Mixed rotation"],
  [/rotación mixta/gi, "mixed rotation"],
  [/Rotación/g, "Rotation"],
  [/Volatilidad/g, "Volatility"],
  [/Curva VIX/g, "VIX curve"],
  [/Flujos BTC ETF/g, "BTC ETF flows"],
  [/Flujos mixtos/g, "Mixed flows"],
  [/Fuerte contango/g, "Strong contango"],
  [/No implica dirección futura del mercado\./g, "It does not imply future market direction."],
  [/Datos automatizados/g, "Automated data"],
  [/Datos demo/g, "Demo data"],
  [/Datos manuales/g, "Manual data"],
  [/Actualización pendiente/g, "Update pending"],
  [/Pendiente de automatización/g, "Automation pending"],
  [/Ponderación actual/g, "Current weighting"],
  [/ponderación actual/g, "current weighting"],
  [/Confianza/g, "Confidence"],
  [/Sesgo/g, "Bias"],
  [/Régimen actual/g, "Current regime"],
  [/Tecnología/g, "Technology"],
  [/Salud/g, "Health Care"],
  [/Energía/g, "Energy"],
  [/Financieras/g, "Financials"],
  [/Industriales/g, "Industrials"],
  [/Materiales/g, "Materials"],
  [/Inmobiliario/g, "Real Estate"],
  [/Comunicación/g, "Communication Services"],
  [/Consumo básico\/defensivo/g, "Consumer Staples / defensive"],
  [/Consumo discrecional/g, "Consumer Discretionary"],
  [/Defensivos/g, "Defensives"],
  [/semana/g, "week"],
  [/Subiendo rápido/g, "Rising fast"],
  [/Subiendo/g, "Rising"],
  [/Bajando/g, "Falling"],
  [/Estable/g, "Stable"],
  [/Pendiente/g, "Pending"],
  [/Racha pendiente/g, "Streak pending"],
  [/Último cierre/g, "Latest close"],
  [/Dato pendiente/g, "Pending data"],
  [/Fuente temporalmente no disponible/g, "Source temporarily unavailable"],
  [/historial insuficiente/gi, "not enough history"],
  [/Fragilidad/g, "Fragility"],
  [/fragilidad/g, "fragility"],
  [/Baja/g, "Low"],
  [/Media/g, "Medium"],
  [/Alta/g, "High"],
  [/Alerta/g, "Alert"],
  [/Normal/g, "Normal"],
  [/Mixto/g, "Mixed"],
  [/sin entradas positivas/gi, "no positive inflows"],
  [/sin salidas negativas/gi, "no negative outflows"],
  [/entrada fuerte/gi, "strong inflow"],
  [/entrada moderada/gi, "moderate inflow"],
  [/salida moderada/gi, "moderate outflow"],
  [/salida fuerte/gi, "strong outflow"],
  [/datos pendientes/gi, "pending data"],
  [/acumulación sostenida/gi, "sustained accumulation"],
  [/entradas moderadas/gi, "moderate inflows"],
  [/salidas moderadas/gi, "moderate outflows"],
  [/presión de salidas/gi, "outflow pressure"],
  [/positivo/gi, "positive"],
  [/negativo/gi, "negative"],
];

export function translateDashboardText(value: string | null | undefined) {
  if (!value) return value ?? "";
  return phraseMap.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

export function translateRegimeLabel(value: string) {
  return translateDashboardText(value);
}

export function translateBiasLabel(value: RegimeBias) {
  const labels: Record<RegimeBias, string> = {
    favorable: "Favorable",
    neutral: "Neutral",
    cautious: "Cautious",
    stress: "Stress",
  };
  return labels[value];
}

export function translateDataStatusLabel(label: string | DataStatus) {
  return translateDashboardText(label);
}
