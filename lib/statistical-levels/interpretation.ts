import type { StatisticalFrequency, StatisticalWindow, WindowMetric } from './types.ts';

type Locale = 'es' | 'en';
export const frequencyName = (frequency: StatisticalFrequency, locale: Locale) => ({
  es: { daily: 'Diaria', weekly: 'Semanal', monthly: 'Mensual' },
  en: { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' },
})[locale][frequency];
export const windowName = (window: StatisticalWindow, locale: Locale) => window === 'Full'
  ? locale === 'es' ? 'Todo el historial' : 'Full history'
  : locale === 'es' ? window.replace('Y', 'A') : window;
export const percent = (value: number | null, digits = 1) => value === null || !Number.isFinite(value)
  ? 'n/d' : `${value > 0 ? '+' : ''}${(value * 100).toFixed(digits)}%`;
export const number = (value: number | null, digits = 2) => value === null || !Number.isFinite(value)
  ? 'n/d' : value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

// Counts the same rolling-MA observations as buildWindowMetric, not the price periods.
export function extensionSample(metric: WindowMetric, frequency: StatisticalFrequency) {
  return metric.available ? Math.max(0, metric.sessions - ({ daily: 200, weekly: 40, monthly: 12 }[frequency]) + 1) : 0;
}

export function historicalInterpretation(ticker: string, metric: WindowMetric, frequency: StatisticalFrequency, locale: Locale) {
  const n = extensionSample(metric, frequency);
  const usable = metric.available && n >= 2 && metric.ma200ExtensionPercentile !== null && metric.ma200ExtensionZScore !== null
    && Number.isFinite(metric.ma200ExtensionPercentile) && Number.isFinite(metric.ma200ExtensionZScore);
  if (!usable) return locale === 'es'
    ? `No hay historial suficiente para interpretar la extensión de ${ticker} en esta ventana.`
    : `There is not enough history to interpret ${ticker}'s extension in this window.`;
  // Use the generator's stored label: its thresholds ran BEFORE percentile rounding.
  const bands: Record<WindowMetric['extensionPercentileLabel'], [string, string]> = {
    'Zona históricamente baja': ['zona históricamente baja', 'historically low zone'],
    'Zona baja': ['zona baja', 'low zone'],
    'Zona media': ['zona media', 'middle zone'],
    'Zona alta': ['zona alta', 'high zone'],
    'Zona históricamente alta': ['zona históricamente alta', 'historically high zone'],
  };
  const band = bands[metric.extensionPercentileLabel];
  if (!band) return locale === 'es' ? 'Interpretación no disponible.' : 'Interpretation unavailable.';
  return locale === 'es'
    ? `La extensión de ${ticker} está en la ${band[0]} de su historia.`
    : `${ticker}'s extension is in the ${band[1]} of its history.`;
}

export function percentileTranslation(value: number | null, locale: Locale) {
  if (value === null || !Number.isFinite(value)) return locale === 'es' ? 'Percentil no disponible para esta muestra.' : 'Percentile unavailable for this sample.';
  const above = (100 - value).toFixed(1);
  return locale === 'es' ? `El ${above}% de las extensiones históricas estuvo por encima.` : `${above}% of historical extensions were above this reading.`;
}
export function zTranslation(value: number | null, locale: Locale) {
  if (value === null || !Number.isFinite(value)) return locale === 'es' ? 'Z-score no disponible para esta muestra.' : 'Z-score unavailable for this sample.';
  if (value === 0) return locale === 'es' ? 'La extensión coincide con su media histórica al redondeo mostrado.' : 'The extension matches its historical mean at the displayed precision.';
  return locale === 'es'
    ? `La extensión está ${Math.abs(value).toFixed(2)} desviaciones estándar ${value > 0 ? 'por encima' : 'por debajo'} de su media histórica.`
    : `The extension is ${Math.abs(value).toFixed(2)} standard deviations ${value > 0 ? 'above' : 'below'} its historical mean.`;
}
