export type Point = { x: number; y: number };

export type BandPoint = { x: number; low: number; high: number };

export function linearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
) {
  const [domainMin, domainMax] = domain;
  const [rangeMin, rangeMax] = range;
  const span = domainMax - domainMin;
  if (span === 0) return () => (rangeMin + rangeMax) / 2;
  return (value: number) => rangeMin + ((value - domainMin) / span) * (rangeMax - rangeMin);
}

export function niceStep(rawStep: number) {
  if (rawStep <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step = normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10;
  return step * magnitude;
}

export function niceAxisTicks(min: number, max: number, targetCount = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  const step = niceStep((max - min) / Math.max(targetCount, 1));
  const first = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let value = first; value <= max + step / 1000; value += step) {
    ticks.push(Number(value.toFixed(10)));
  }
  return ticks;
}

export function paddedDomain(
  values: readonly number[],
  { padding = 0.08, includeZero = true }: { padding?: number; includeZero?: boolean } = {},
): [number, number] {
  const finite = values.filter((value) => Number.isFinite(value));
  if (!finite.length) return [0, 1];
  let min = Math.min(...finite);
  let max = Math.max(...finite);
  if (includeZero) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }
  if (min === max) return [min - 1, max + 1];
  const pad = (max - min) * padding;
  return [min - pad, max + pad];
}

export function linePath(points: readonly Point[]) {
  if (points.length < 2) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

export function bandPath(points: readonly BandPoint[]) {
  if (points.length < 2) return "";
  const upper = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.high.toFixed(2)}`)
    .join(" ");
  const lower = [...points]
    .reverse()
    .map((point) => `L${point.x.toFixed(2)} ${point.low.toFixed(2)}`)
    .join(" ");
  return `${upper} ${lower} Z`;
}

export function nearestIndex(values: readonly number[], target: number) {
  if (!values.length) return -1;
  let best = 0;
  let bestDistance = Math.abs(values[0] - target);
  for (let index = 1; index < values.length; index += 1) {
    const distance = Math.abs(values[index] - target);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  }
  return best;
}
