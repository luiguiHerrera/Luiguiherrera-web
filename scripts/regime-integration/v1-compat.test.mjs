import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { root, React, importFromRoot, renderComponent, metricValues } from './v1-render-runtime.mjs';
const oracle = JSON.parse(readFileSync(new URL('./v1-reference.json', import.meta.url), 'utf8'));
const sha = value => createHash('sha256').update(value).digest('hex');
const { DashboardRegimeV1 } = await importFromRoot('components/dashboard/DashboardRegimeV1.tsx');
for (const row of oracle.rows) test(`RI-BUILD-001 ${row.id} ${row.locale}: private V1 values match the independently captured remote renderer`, () => {
  const html = renderComponent(DashboardRegimeV1, { regimeSummary: row.summary, locale: row.locale }, row.locale);
  assert.deepEqual(metricValues(html, 'data-insight-metrics'), row.remoteValues);
  assert.doesNotMatch(html, /null\/100|null%|undefined/);
  if (row.legacyMarkupMustRemainIdentical) assert.equal(sha(html), row.legacyHtmlSha256, 'All original normal/zero markup must remain byte-identical');
  if (row.id === 'zero') assert.deepEqual(row.remoteValues.slice(2), ['0/100', '0%']);
  if (row.id === 'unavailable' || row.id === 'provider-error-fallback') {
    assert.equal(row.summary.bias, 'unavailable'); assert.equal(row.summary.regimeScore, null); assert.equal(row.summary.confidence, null);
    assert.notEqual(row.remoteValues[1], 'Neutral');
  }
});
for (const locale of ['es','en']) test(`RI-BUILD-001 expanded ${locale}: inner cards preserve unavailable and zero semantics`, () => {
  const rows = oracle.rows.filter(row => row.locale === locale && ['unavailable','zero'].includes(row.id));
  for (const row of rows) {
    const tree = DashboardRegimeV1({ regimeSummary: row.summary, locale });
    function open(element) {
      if (!React.isValidElement(element)) return element;
      const children = React.Children.map(element.props.children, open);
      return React.cloneElement(element, { ...(element.type?.name === 'ExpandableInsightCard' ? { defaultOpen: true } : {}), children });
    }
    const Wrapper = () => open(tree), html = renderComponent(Wrapper, {}, locale);
    assert.doesNotMatch(html, /null\/100|null%|undefined/);
    for (const value of row.remoteValues.slice(1)) assert.ok(html.includes(value));
    assert.ok(html.includes('data-insight-metric-value'));
    assert.ok(html.includes('mt-2 text-xl font-semibold leading-none'), 'Actual MetricCard children are rendered in the expanded state');
  }
});
test('RI-BUILD-001 authority binding and repair contain no casts, domain narrowing or V2 fallback', () => {
  for (const [file, expected] of Object.entries(oracle.sourceHashes)) if (!file.endsWith('@RC2')) assert.equal(sha(readFileSync(path.join(root, file))), expected, file);
  const source = readFileSync(path.join(root, 'components/dashboard/DashboardRegimeV1.tsx'), 'utf8');
  assert.doesNotMatch(source, /as any|as unknown as|Exclude<|regime-engine-v2|evaluateRegime|\w+!\s*[.[;]/);
  assert.match(source, /Record<RegimeBias, string>/);
  assert.equal(oracle.realNetworkRequests, 0); assert.equal(oracle.simulatedProviderRequests, 1);
});
