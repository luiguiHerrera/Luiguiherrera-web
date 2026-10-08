// Synthetic null/correlation inputs rendered by the actual approved components.
// These files are QA evidence only; no route, snapshot or application file changes.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as fixes from './source/defect-repairs.mjs';

export async function renderFixtures(codeRoot, out) {
  const require = createRequire(path.join(codeRoot, 'package.json'));
  const ts = require('typescript'), React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const options = { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true, target: ts.ScriptTarget.ES2022 };
  const input = await fs.readFile(path.join(codeRoot, 'components/statistical-levels/OpeningLocationPanel.tsx'), 'utf8');
  const sandboxModule = { exports: {} };
  const req = id => id === 'react' ? { ...React, useState: initial => [initial === 'opening' ? 'close' : initial, () => {}] }
    : id.includes('defect-repairs') ? fixes : require(id);
  new Function('require', 'module', 'exports', ts.transpileModule(input, { compilerOptions: options }).outputText)(req, sandboxModule, sandboxModule.exports);
  const spy = JSON.parse(await fs.readFile(path.join(codeRoot, 'lib/statistical-levels/generated/assets/SPY.json'), 'utf8'));
  spy.frequencies.weekly.recentPeriods = spy.frequencies.weekly.recentPeriods.slice(0, 2).map(row => ({ ...row, closeLocation: null }));
  const source = await fs.readFile(path.join(codeRoot, 'components/statistical-levels/StatLevelsLab.tsx'), 'utf8');
  const ast = ts.createSourceFile('lab.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = ['CorrelationHeatmap', 'RowCells', 'formatCorrelation', 'correlationColor'];
  const selected = ast.statements.filter(n => ts.isFunctionDeclaration(n) && names.includes(n.name.text));
  assert.equal(selected.length, names.length);
  const matrixModule = { exports: {} };
  const code = ts.transpileModule('const displayStatTicker = t => t;\n' + selected.map(n => n.getText()).join('\n') + '\nexports.CorrelationHeatmap = CorrelationHeatmap;' , { compilerOptions: options }).outputText;
  new Function('require', 'exports', code)(require, matrixModule.exports);
  for (const locale of ['es', 'en']) {
    const html = renderToStaticMarkup(React.createElement(sandboxModule.exports.OpeningLocationPanel, { asset: spy, frequency: 'weekly', locale }));
    assert.ok(html.includes('N 0')); assert.ok(!html.includes('Close in the middle zone') && !html.includes('Cierre en zona media'));
    await fs.writeFile(path.join(out, `null-fixture-${locale}.html`), html);
    const matrix = { alignment: 'canonical_calendar_date', tickers: ['A', 'B'], minObservations: 20,
      values: { A: { A: 1, B: null }, B: { A: null, B: 1 } }, matchedObservations: { A: { A: 20, B: 11 }, B: { A: 11, B: 20 } } };
    const corr = renderToStaticMarkup(React.createElement(matrixModule.exports.CorrelationHeatmap,
      { matrix, selectedTickers: ['A', 'B'], emptyLabel: locale === 'en' ? 'Correlation unavailable' : 'Correlación no disponible' }));
    assert.ok(corr.includes('N 11') && corr.includes('n/d'));
    await fs.writeFile(path.join(out, `correlation-fixture-${locale}.html`), corr);
  }
}
