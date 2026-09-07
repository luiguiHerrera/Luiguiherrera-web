// Geometry and display formatting only. The source observations remain authoritative.
export function returnBarGeometry(value: number | null, scale: number) {
  const direction = value === null ? 'unavailable' : value < 0 ? 'negative' : value > 0 ? 'positive' : 'zero';
  const width = value === null || value === 0 ? 0 : Math.min(50, Math.max(2, Math.abs(value) / Math.max(scale, Math.abs(value)) * 50));
  return { direction, left: direction === 'negative' ? 50 - width : 50, width };
}

export function winRateWidth(value: number | null) {
  return value === null ? null : Math.max(0, Math.min(100, value * 100));
}

// Match the chart's existing equally spaced observation geometry; never interpolate values.
export function nearestObservationIndex(x: number, width: number, count: number) {
  if (count < 1) return null;
  if (width <= 0 || count === 1) return 0;
  return Math.round(Math.max(0, Math.min(1, x / width)) * (count - 1));
}

export function drawdownInspectionText(date: string, value: number, locale: 'es' | 'en') {
  const language = locale === 'en' ? 'en-US' : 'es-ES';
  return {
    date: new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`)),
    value: new Intl.NumberFormat(language, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value),
  };
}
