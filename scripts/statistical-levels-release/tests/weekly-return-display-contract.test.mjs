import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { weeklyReturnDisplay } from '../scripts/qa/weekly-return-display-contract.mjs';

// Literal goldens specify the published binary multiplication/fixed-decimal
// policy independently of both product implementation and Intl's decimal ties.
function nextNumber(value, towardPositive) {
  if (value === 0) return towardPositive ? Number.MIN_VALUE : -Number.MIN_VALUE;
  const view = new DataView(new ArrayBuffer(8)); view.setFloat64(0, value, false);
  const step = (value > 0) === towardPositive ? 1n : -1n;
  view.setBigUint64(0, view.getBigUint64(0, false) + step, false);
  return view.getFloat64(0, false);
}
const cases = [
  ['positive exact binary midpoint', 0.03125, '+3.13%'],
  ['negative exact binary midpoint', -0.03125, '-3.13%'],
  ['positive input immediately below midpoint', nextNumber(0.03125, false), '+3.12%'],
  ['positive input immediately above midpoint', nextNumber(0.03125, true), '+3.13%'],
  ['negative input immediately below midpoint', nextNumber(-0.03125, false), '-3.13%'],
  ['negative input immediately above midpoint', nextNumber(-0.03125, true), '-3.12%'],
  ['exact authoritative SPY September week5 regression', -0.01805, '-1.80%'],
  ['positive zero', 0, '0.00%'],
  ['negative zero', -0, '0.00%'],
  ['positive exact hundredth', 0.0125, '+1.25%'],
  ['negative exact hundredth', -0.0125, '-1.25%'],
  ['ordinary positive', 0.01234, '+1.23%'],
  ['ordinary negative', -0.01234, '-1.23%'],
  ['positive value rounded to zero preserves positive input sign', 0.000001, '+0.00%'],
  ['negative value rounded to zero preserves negative input sign', -0.000001, '-0.00%'],
  ['smallest positive subnormal input', Number.MIN_VALUE, '+0.00%'],
  ['smallest negative subnormal input', -Number.MIN_VALUE, '-0.00%'],
  ['carry into next integer percentage', 0.09999, '+10.00%'],
  ['negative carry into next integer percentage', -0.09999, '-10.00%'],
  ['positive binary fraction below apparent decimal midpoint', 0.02565, '+2.56%'],
  ['negative binary fraction below apparent decimal midpoint', -0.00575, '-0.57%'],
  ['null', null, 'n/d'],
  ['NaN', NaN, 'n/d'],
  ['positive infinity', Infinity, 'n/d'],
  ['negative infinity', -Infinity, 'n/d'],
  ['positive scientific-format threshold', 1e19, '+1e+21%'],
  ['negative scientific-format threshold', -1e19, '-1e+21%'],
  ['positive percentage overflow from finite input', Number.MAX_VALUE, '+Infinity%'],
  ['negative percentage overflow from finite input', -Number.MAX_VALUE, '-Infinity%']
];
for (const locale of ['es', 'en']) for (const [name, value, expected] of cases) {
  test(locale + ' weekly contract: ' + name, () => assert.equal(weeklyReturnDisplay(value), expected));
}
test('weekly oracle remains locale-independent and does not import the production implementation', () => {
  const source = readFileSync(new URL('../scripts/qa/weekly-return-display-contract.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\bimport\b|\brequire\s*\(|\.toFixed\s*\(|\.toLocaleString\s*\(|\bIntl\b|Math\.round/);
  assert.match(source, /DataView/); assert.match(source, /getBigUint64/);
});
test('the stale decimal-Intl oracle is rejected by the authoritative regression golden', () => {
  const value = -0.01805;
  const stale = (value * 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  assert.equal(stale, '-1.81%'); assert.equal(weeklyReturnDisplay(value), '-1.80%');
  assert.notEqual(weeklyReturnDisplay(value), stale);
});
