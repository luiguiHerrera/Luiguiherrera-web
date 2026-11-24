import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HomeDashboardPreview } from '../../components/home/HomeDashboardPreview.tsx';
import { IntegratedRegimeModule } from '../../components/dashboard/IntegratedRegimeModule.tsx';

function inputs() {
  return {
    regimeSummary: {
      current: 'Cautela', bias: 'cautious', regimeScore: 25, confidence: 74,
      dataStatus: 'automated', lastUpdated: 'Última actualización disponible por módulo',
      interpretation: '', riskSupportSignals: [], cautionSignals: [],
    },
    sectorRotation: { metrics: { reading: 'defensiva' }, lastUpdated: '2026-11-20' },
    vix: { spot: {
      dataStatus: 'automated', latestVix: 26.62, lastObservationDate: '2026-11-23',
      vixSeverity: 'elevated', vixCompositeLabel: 'Tensión',
    } },
    vixTermStructure: {
      classification: 'Plano', lastUpdated: '2026-11-24',
      points: [{ label: 'VX1', value: 23.98 }, { label: 'VX2', value: 23.5 }],
    },
  };
}

for (const locale of ['es', 'en']) {
  test(`Home and integrated dashboard retain the same regime values in ${locale}`, () => {
    const data = inputs();
    const home = renderToStaticMarkup(React.createElement(HomeDashboardPreview, { ...data, locale }));
    const dashboard = renderToStaticMarkup(React.createElement(IntegratedRegimeModule, {
      data: data.regimeSummary, locale, provenance: [],
    }));
    for (const html of [home, dashboard]) {
      assert.match(html, /25\/100/);
      assert.match(html, /74%/);
      assert.match(html, locale === 'es' ? /Cautela/ : /Caution/);
    }
    assert.match(home, locale === 'es' ? /26,62/ : /26\.62/);
    for (const date of ['2026-11-20', '2026-11-23', '2026-11-24']) assert.match(home, new RegExp(`<time dateTime="${date}">`, 'i'));
    assert.match(home, locale === 'es' ? /Corte:/ : /Data through:/);
    assert.doesNotMatch(home, /Última actualización disponible por módulo/);
  });

  test(`Home preserves missing values and never fabricates a cut in ${locale}`, () => {
    const data = inputs();
    const html = renderToStaticMarkup(React.createElement(HomeDashboardPreview, {
      ...data, locale,
      regimeSummary: { ...data.regimeSummary, current: 'Incompleto', bias: 'unavailable', regimeScore: null, confidence: null },
      sectorRotation: null, vix: null, vixTermStructure: null,
    }));
    assert.match(html, locale === 'es' ? /No disponible/ : /Unavailable/);
    assert.doesNotMatch(html, /<time|NaN|undefined|>0\/100<|>0%<|26[.,]62/);
  });
}

test('Home omits malformed source dates instead of inventing a valid observation', () => {
  const data = inputs();
  data.sectorRotation.lastUpdated = '2026-02-30';
  data.vixTermStructure.lastUpdated = 'Actualización pendiente';
  const html = renderToStaticMarkup(React.createElement(HomeDashboardPreview, { ...data, locale: 'es' }));
  assert.match(html, /2026-11-23/);
  assert.doesNotMatch(html, /2026-02-30|2026-03-02|Actualización pendiente/);
});
