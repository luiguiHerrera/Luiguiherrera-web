import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HomeDashboardPreview } from '../../components/home/HomeDashboardPreview.tsx';
import { buildOfrFsiSummary } from './ofr-fsi.ts';
import { metricAt } from './capital-flow-comparison.mjs';
import { formatFlowAmount } from './dashboard-overview.ts';

function inputs() {
  const observations = Array.from({ length: 21 }, (_, i) => ({
    date: new Date(Date.UTC(2026, 10, 3 + i)).toISOString().slice(0, 10),
    fsi: -.4 + i * .01, credit: -.1, equityValuation: -.1, funding: 0,
    safeAssets: 0, volatility: -.2 + i * .01,
    unitedStates: -.2 + i * .01, otherAdvancedEconomies: -.1, emergingMarkets: -.1,
  }));
  return {
    financialEnvironment: { dataset: { observations, decimalPlaces: 3, sourceColumns: [], duplicateDatesRemoved: 0 },
      refreshStatus: 'current', retrievedAt: '2026-11-27T02:00:00Z', sourceHash: 'fixture' },
    flows: [{ id: 'sp500', cutoffDate: '2026-11-24', vehicles: ['SPY', 'IVV', 'VOO'], refreshStatus: 'delayed',
      points: [{ date: '2026-11-24', flow: 1975900000, complete: true, funds: [] }] }],
    vix: { spot: {
      dataStatus: 'automated', latestVix: 26.62, lastObservationDate: '2026-11-25',
      vixSeverity: 'elevated', vixCompositeLabel: 'Tensión',
    } },
    vixTermStructure: {
      classification: 'Plano', lastUpdated: '2026-11-25',
      points: [{ label: 'VX1', value: 25.0258 }, { label: 'VX2', value: 24.2921 }],
    },
  };
}
const render = (data, locale) => renderToStaticMarkup(React.createElement(HomeDashboardPreview, { ...data, locale }));

for (const locale of ['es', 'en']) {
  test(`Home uses the Dashboard's OFR, flow calculation and independently dated risk data in ${locale}`, () => {
    const data = inputs();
    const financial = buildOfrFsiSummary(data.financialEnvironment.dataset);
    const flow = metricAt(data.flows[0].points, 1);
    const html = render(data, locale);
    const nf = new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    assert.ok(html.includes(nf.format(financial.latest.fsi)));
    assert.ok(html.includes('+' + nf.format(financial.delta20)));
    assert.ok(html.includes(formatFlowAmount(flow, locale)));
    assert.match(html, locale === 'es' ? /Por debajo del promedio histórico/ : /Below its historical average/);
    assert.match(html, locale === 'es' ? /26,62/ : /26\.62/);
    assert.match(html, locale === 'es' ? /Datos retrasados/ : /Delayed data/);
    for (const date of ['2026-11-23', '2026-11-24', '2026-11-25']) assert.match(html, new RegExp(`<time dateTime="${date}">`, 'i'));
    assert.match(html, /technical-surface|data-home-product-composition/);
    assert.match(html, /VX1|VX2/);
    assert.doesNotMatch(html, /Régimen integrado|Integrated regime|Score|Confidence|Confianza|\/100/);
  });

  test(`Home preserves independent modules and never substitutes zeroes or dates for missing data in ${locale}`, () => {
    const data = inputs();
    const html = render({ ...data, financialEnvironment: null, flows: [], vix: null, vixTermStructure: null }, locale);
    assert.match(html, locale === 'es' ? /No disponible/ : /Unavailable/);
    assert.doesNotMatch(html, /<time|NaN|undefined|Infinity|26[.,]62|1[.,]975/);
    const independent = render({ ...data, financialEnvironment: null, flows: [] }, locale);
    assert.match(independent, locale === 'es' ? /26,62/ : /26\.62/);
    assert.match(independent, /VX1/);
  });
}

test('Home retains the OFR source date and labels retained data without treating it as a new observation', () => {
  const data = inputs();
  data.financialEnvironment.refreshStatus = 'retained';
  const html = render(data, 'es');
  assert.match(html, /Corte conservado/);
  assert.match(html, /dateTime="2026-11-23"/);
  assert.doesNotMatch(html, /dateTime="2026-11-27"/);
});

test('Home does not borrow a previous or partial ETF observation when the declared cutoff lacks a complete flow', () => {
  for (const latest of [
    { date: '2026-11-24', flow: null, complete: false, funds: [] },
    { date: '2026-11-24', flow: 123, complete: false, funds: [] },
    { date: '2026-11-23', flow: 123, complete: true, funds: [] },
  ]) {
    const data = inputs();
    data.flows[0].points = [{ date: '2026-11-20', flow: 999000000, complete: true, funds: [] }, latest];
    const html = render(data, 'es');
    assert.match(html, /data-home-sp500-flow="true">No disponible/);
    assert.doesNotMatch(html, /999,0 M USD|dateTime="2026-11-24"/);
  }
});

test('Home omits malformed source dates instead of inventing a valid observation', () => {
  const data = inputs();
  data.vixTermStructure.lastUpdated = '2026-02-30';
  const html = render(data, 'es');
  assert.match(html, /2026-11-25/);
  assert.doesNotMatch(html, /2026-02-30|2026-03-02/);
});
