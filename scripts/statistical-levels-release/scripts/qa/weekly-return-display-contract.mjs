// Independent QA specification of the established weekly display contract.
// Decode the binary64 percentage and round its exact rational to cents; do not
// obtain the expected string from the production formatter or locale formatting.
export function weeklyReturnDisplay(value) {
  if (value === null || !Number.isFinite(value)) return 'n/d';
  const percentage = value * 100;
  const positiveSign = value > 0 ? '+' : '';
  // The established fixed-format contract uses ordinary Number spelling outside
  // its fixed-decimal range, including overflow of an otherwise finite input.
  if (!Number.isFinite(percentage) || Math.abs(percentage) >= 1e21) return positiveSign + String(percentage) + '%';
  const data = new DataView(new ArrayBuffer(8));
  data.setFloat64(0, Math.abs(percentage), false);
  const bits = data.getBigUint64(0, false);
  const exponent = Number((bits >> 52n) & 0x7ffn);
  const fraction = bits & ((1n << 52n) - 1n);
  const significand = exponent === 0 ? fraction : (1n << 52n) | fraction;
  const binaryPower = exponent === 0 ? -1074 : exponent - 1023 - 52;
  let numerator = significand * 100n, denominator = 1n;
  if (binaryPower < 0) denominator <<= BigInt(-binaryPower);
  else numerator <<= BigInt(binaryPower);
  const quotient = numerator / denominator, remainder = numerator % denominator;
  // Magnitude rounds to nearest cent; an exact halfway remainder rounds up.
  const cents = quotient + (2n * remainder >= denominator ? 1n : 0n);
  const digits = String(cents).padStart(3, '0');
  const sign = percentage < 0 ? '-' : positiveSign;
  return sign + digits.slice(0, -2) + '.' + digits.slice(-2) + '%';
}
