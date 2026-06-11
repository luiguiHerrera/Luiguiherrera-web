export function mean(values: number[]) {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return null;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

export function sampleVariance(values: number[]) {
  const avg = mean(values);
  if (avg === null || values.length < 2) return null;
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1);
  return Number.isFinite(variance) ? variance : null;
}

export function correlation(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length);
  if (length < 3) return null;

  const x = left.slice(0, length);
  const y = right.slice(0, length);
  const xMean = mean(x);
  const yMean = mean(y);

  if (xMean === null || yMean === null) return null;

  let numerator = 0;
  let xSum = 0;
  let ySum = 0;

  for (let index = 0; index < length; index += 1) {
    const xDiff = x[index] - xMean;
    const yDiff = y[index] - yMean;
    numerator += xDiff * yDiff;
    xSum += xDiff ** 2;
    ySum += yDiff ** 2;
  }

  const denominator = Math.sqrt(xSum * ySum);
  if (denominator === 0) return null;
  return numerator / denominator;
}

export function ewmaAnnualizedVolatility(returns: number[], lambda = 0.94) {
  if (returns.length < 21) return null;

  const seed = sampleVariance(returns.slice(0, 21));
  if (seed === null) return null;

  let variance = seed;
  for (const dailyReturn of returns.slice(21)) {
    variance = lambda * variance + (1 - lambda) * dailyReturn ** 2;
  }

  return Math.sqrt(variance * 252);
}

export function garchOneOneForecast(returns: number[]) {
  if (returns.length < 63) return null;

  const longRunVariance = sampleVariance(returns);
  if (longRunVariance === null) return null;

  const alpha = 0.06;
  const beta = 0.9;
  const omega = Math.max(longRunVariance * (1 - alpha - beta), 0);
  let variance = longRunVariance;

  for (const dailyReturn of returns) {
    variance = omega + alpha * dailyReturn ** 2 + beta * variance;
  }

  return Math.sqrt(variance * 252);
}

export function averageCorrelation(series: number[][], window: number) {
  const correlations: number[] = [];

  for (let leftIndex = 0; leftIndex < series.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < series.length; rightIndex += 1) {
      const value = correlation(series[leftIndex].slice(-window), series[rightIndex].slice(-window));
      if (value !== null) correlations.push(value);
    }
  }

  return mean(correlations);
}
