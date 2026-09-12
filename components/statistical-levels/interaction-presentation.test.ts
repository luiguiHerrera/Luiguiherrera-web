import assert from 'node:assert/strict'; import { weeklyReturnDisplay } from '../../scripts/statistical-levels-release/scripts/qa/weekly-return-display-contract.mjs';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement, type ComponentType } from 'react';
import { returnBarGeometry, winRateWidth, nearestObservationIndex, drawdownInspectionText } from './interaction-presentation.ts';

const require = createRequire(import.meta.url);
const cache = new Map<string, { exports: Record<string, unknown> }>();
function component(file: string): Record<string, unknown> {
  const absolute = path.resolve(file);
  if (cache.has(absolute)) return cache.get(absolute)!.exports;
  const loadedModule = { exports: {} };
  cache.set(absolute, loadedModule);
  const code = ts.transpileModule(readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const load = (name: string): unknown => {
    if (!name.startsWith('.') && !name.startsWith('@/')) return require(name);
    const base = name.startsWith('@/') ? path.resolve(name.slice(2)) : path.resolve(path.dirname(absolute), name);
    for (const suffix of ['.ts', '.tsx']) {
      try { return component(base + suffix); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
    throw new Error(`Missing presentation module ${name}`);
  };
  new Function('require', 'module', 'exports', code)(load, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const seasonality = JSON.parse(readFileSync('lib/statistical-levels/generated/seasonality/SPY.json', 'utf8'));
const manifest = JSON.parse(readFileSync('lib/statistical-levels/generated/manifest.json', 'utf8'));
const month = new Date(manifest.generatedAt + 'T00:00:00Z').getUTCMonth() + 1;

test('diverging bars encode geometry with a shared zero without changing source returns', () => {
  assert.deepEqual(returnBarGeometry(-.04, .04), { direction: 'negative', left: 0, width: 50 });
  assert.deepEqual(returnBarGeometry(.02, .04), { direction: 'positive', left: 50, width: 25 });
  assert.equal(returnBarGeometry(.000001, .04).width, 2);
  assert.equal(returnBarGeometry(0, 0).width, 0);
  assert.equal(returnBarGeometry(null, 0).direction, 'unavailable');
  assert.equal(returnBarGeometry(-.000001, .04).left, 48);
});
test('positive-week bar preserves the entire 0–100 scale including null', () => {
  for (const value of [0, .001, .2, .6, .999, 1]) assert.equal(winRateWidth(value), value * 100);
  assert.equal(winRateWidth(null), null);
});
test('both locales preserve each weekly return, win rate, N and limited-sample warning', () => {
  const Component = component('components/statistical-levels/CurrentMonthSeasonality.tsx').CurrentMonthSeasonality as ComponentType<Record<string, unknown>>;
  for (const locale of ['es', 'en']) {
    const html = renderToStaticMarkup(createElement(Component, { data: seasonality, asOf: manifest.generatedAt, locale }));
    for (let week = 1; week <= 5; week++) {
      const cell = seasonality.windows['5Y'].weekly.general.find((c: { month: number; weekOfMonth: number }) => c.month === month && c.weekOfMonth === week);
      const article = html.match(new RegExp(`<article[^>]*data-week="${week}"[\\s\\S]*?</article>`))![0];
      const n = cell?.sampleSize ?? 0;
      const value = n && cell.averageReturn !== null ? weeklyReturnDisplay(cell.averageReturn) : 'n/d';
      assert.ok(article.includes(value));
      assert.ok(article.includes(n && cell.winRate !== null ? `${(cell.winRate * 100).toFixed(0)}%` : 'n/d'));
      assert.ok(article.includes(`N ${n}`));
      assert.equal(article.includes(locale === 'en' ? 'Limited sample' : 'Muestra limitada'), n < 5);
      assert.ok(article.includes(locale === 'en' ? 'Positive weeks' : 'Semanas positivas'));
      assert.ok(article.includes(locale === 'en' ? `Week ${week}` : `Semana ${week}`));
    }
  }
});
test('micro-visuals use one neutral brand color for either direction and reduced low-N prominence', () => {
  const css = readFileSync('components/statistical-levels/statistical-levels.css', 'utf8');
  assert.match(css, /\.sl-return-fill \{[^}]*background:#123b3d/);
  assert.match(css, /\.sl-win-micro > span \{[^}]*background:#123b3d/);
  assert.match(css, /data-limited="true"[^}]*opacity:\.55/);
  const added = css.slice(css.indexOf('/* Supplementary weekly'));
  assert.doesNotMatch(added, /\b(green|red|bullish|bearish|danger)\b/i);
});
test('pointer position selects a real observation, clamps endpoints and supports sparse or singleton series', () => {
  assert.equal(nearestObservationIndex(49, 100, 5), 2);
  assert.equal(nearestObservationIndex(63, 100, 5), 3);
  assert.equal(nearestObservationIndex(-10, 100, 5), 0);
  assert.equal(nearestObservationIndex(120, 100, 5), 4);
  assert.equal(nearestObservationIndex(50, 100, 1), 0);
  assert.equal(nearestObservationIndex(50, 100, 0), null);
  const dates = ['2022-10-03', '2022-10-10', '2022-10-28'];
  assert.equal(dates[nearestObservationIndex(50, 100, dates.length)!], '2022-10-10');
});
test('tooltip formats the actual observation with locale-aware date and percent', () => {
  assert.deepEqual(drawdownInspectionText('2022-10-28', -.184, 'es'), { date: '28 oct 2022', value: '-18,4 %' });
  assert.deepEqual(drawdownInspectionText('2022-10-28', -.184, 'en'), { date: 'Oct 28, 2022', value: '-18.4%' });
});
test('every historical frequency starts expanded with all applicable controls and completed-period context', () => {
  const Component = component('components/statistical-levels/AdvancedSeasonalityPanel.tsx').AdvancedSeasonalityPanel as ComponentType<Record<string, unknown>>;
  for (const locale of ['es', 'en']) for (const frequency of ['daily', 'weekly', 'monthly']) {
    const html = renderToStaticMarkup(createElement(Component, { data: seasonality, frequency, generatedAt: manifest.generatedAt, ticker: 'SPY', locale }));
    assert.ok(html.includes('aria-expanded="true"'));
    assert.equal((html.match(/<select/g) ?? []).length, frequency === 'monthly' ? 3 : 4);
    assert.ok(html.includes(locale === 'en' ? 'Hide context' : 'Ocultar contexto'));
    assert.ok(html.includes(locale === 'en' ? 'completed UTC calendar periods' : 'periodos de calendario UTC completos'));
    for (const value of ['3Y', '5Y', '10Y', 'All', 'midterm', 'medianReturn', 'sampleSize']) assert.ok(html.includes(`value="${value}"`));
  }
});

test('expanded patterns show editable controls once and current average N as inline metadata', () => {
  const Component = component('components/statistical-levels/AdvancedSeasonalityPanel.tsx').AdvancedSeasonalityPanel as ComponentType<Record<string, unknown>>;
  for (const locale of ['es', 'en']) for (const frequency of ['daily', 'weekly', 'monthly']) {
    const html = renderToStaticMarkup(createElement(Component, { data: seasonality, frequency, generatedAt: manifest.generatedAt, ticker: 'SPY', locale }));
    const cells = seasonality.windows['5Y'][frequency].general as Array<{ sampleSize: number }>;
    const averageN = (cells.reduce((sum, cell) => sum + cell.sampleSize, 0) / cells.length).toFixed(0);
    assert.doesNotMatch(html, /data-insight-metrics|data-insight-metric-value/);
    assert.equal((html.match(/<select/g) ?? []).length, frequency === 'monthly' ? 3 : 4);
    const metadata = html.match(/<p class="sl-caption sl-patterns-sample">([\s\S]*?)<\/p>/)![1];
    assert.ok(metadata.includes(`${locale === 'en' ? 'Average N' : 'N promedio'}: ${averageN}`));
    assert.ok(metadata.includes(locale === 'en' ? 'Completed periods only' : 'Solo periodos completos'));
  }
});

test('responsive drawdown copy has desktop keyboard guidance and touch-only mobile wording in both locales', () => {
  const Component = component('components/statistical-levels/DrawdownInspection.tsx').DrawdownInspection as ComponentType<Record<string, unknown>>;
  for (const locale of ['es', 'en']) {
    const html = renderToStaticMarkup(createElement(Component, { series: [{ date: '2022-10-28' }], drawdowns: [-.184], path: '', area: '', minDrawdown: -.184, locale }));
    const desktop = html.match(/<span class="sl-drawdown-help-desktop">([\s\S]*?)<\/span>/)![1];
    const mobile = html.match(/<span class="sl-drawdown-help-mobile">([\s\S]*?)<\/span>/)![1];
    assert.ok(desktop.includes(locale === 'en' ? 'Keyboard: ← →' : 'Teclado: ← →'));
    assert.ok(desktop.includes(locale === 'en' ? 'Home / End' : 'Inicio / Fin'));
    assert.equal(mobile, locale === 'en' ? 'Tap the chart to inspect. Tap outside to close.' : 'Toca el gráfico para inspeccionar. Toca fuera para cerrar.');
    assert.doesNotMatch(mobile, /Keyboard|Teclado|Home|Inicio|Esc/);
    assert.ok(html.includes('role="slider"') && html.includes('tabindex="0"') && html.includes('aria-valuetext='));
  }
});
