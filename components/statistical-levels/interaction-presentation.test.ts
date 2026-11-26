import assert from 'node:assert/strict'; import { weeklyReturnDisplay } from '../../scripts/statistical-levels-release/scripts/qa/weekly-return-display-contract.mjs';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement, type ComponentType, type ReactNode } from 'react';
import type { PeriodExplorerRow } from '../../lib/statistical-levels/types.ts';
import { returnBarGeometry, winRateWidth, nearestObservationIndex, drawdownInspectionText } from './interaction-presentation.ts';

const require = createRequire(import.meta.url);
const cache = new Map<string, { exports: Record<string, unknown> }>();
function component(file: string): Record<string, unknown> {
  const absolute = path.resolve(file);
  if (cache.has(absolute)) return cache.get(absolute)!.exports;
  const source = readFileSync(absolute, 'utf8');
  const loadedModule = { exports: {} };
  cache.set(absolute, loadedModule);
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const load = (name: string): unknown => {
    if (name.endsWith('.css')) return {};
    if (!name.startsWith('.') && !name.startsWith('@/')) return require(name);
    const base = name.startsWith('@/') ? path.resolve(name.slice(2)) : path.resolve(path.dirname(absolute), name);
    if (base.endsWith('.mjs')) return require(base);
    for (const suffix of existsSync(base) ? [''] : ['.ts', '.tsx']) {
      try { return component(base + suffix); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
    throw new Error(`Missing presentation module ${name}`);
  };
  new Function('require', 'module', 'exports', code)(load, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const spyFixture = JSON.parse(readFileSync('lib/statistical-levels/generated/assets/SPY.json', 'utf8'));
const seasonality = JSON.parse(readFileSync('lib/statistical-levels/generated/seasonality/SPY.json', 'utf8'));
const manifest = JSON.parse(readFileSync('lib/statistical-levels/generated/manifest.json', 'utf8'));
const month = new Date(manifest.generatedAt + 'T00:00:00Z').getUTCMonth() + 1;

test('extension rank 25.3 is placed at 25.3% of its own scale, with exact endpoints and no fabricated missing rank', () => {
  const Component = component('components/statistical-levels/PercentileRangeBar.tsx').PercentileRangeBar as ComponentType<Record<string, unknown>>;
  for (const value of [0, 25.3, 50, 100]) {
    const html = renderToStaticMarkup(createElement(Component, { label: 'Extension vs MA40', value, quartiles: true }));
    assert.ok(html.includes(`style="left:${value}%"`));
    assert.ok(html.includes(`P${value.toFixed(1)}`));
    for (const tick of [0, 25, 50, 75, 100]) assert.ok(html.includes(`>${tick}</span>`));
  }
  for (const value of [null, NaN, Infinity]) {
    const html = renderToStaticMarkup(createElement(Component, { label: 'Extension vs MA40', value, quartiles: true }));
    assert.ok(!html.includes('sl-percentile-current'));
    assert.ok(html.includes('n/d'));
  }
});

test('opening percentile markers use the selected level frequency and stored move quantiles, independently of MA ranks', () => {
  const Component = component('components/statistical-levels/HistoricalRange.tsx').HistoricalRange as ComponentType<Record<string, unknown>>;
  const asset = JSON.parse(readFileSync('lib/statistical-levels/generated/assets/SPY.json', 'utf8'));
  asset.keyStatisticalLevels.weekly.currentOpen = 100;
  asset.frequencies.weekly.changeMoves.lowExtensionFromOpen.p10 = -.1;
  asset.frequencies.weekly.changeMoves.highExtensionFromOpen.p90 = .2;
  asset.frequencies.weekly.windows['5Y'].ma200ExtensionPercentile = 99;
  asset.frequencies.daily.changeMoves.lowExtensionFromOpen.p10 = -.9;
  const originalLevels = ['WALE', 'WAHE'].map(key => asset.keyStatisticalLevels.weekly.levels[key].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const before = JSON.stringify(asset);
  for (const locale of ['es', 'en']) {
    const html = renderToStaticMarkup(createElement(Component, { asset, frequency: 'weekly', locale }));
    assert.ok(html.includes(locale === 'es' ? 'Mínimos desde apertura · P10: 90.00' : 'Lows from open · P10: 90.00'));
    assert.ok(html.includes(locale === 'es' ? 'Máximos desde apertura · P90: 120.00' : 'Highs from open · P90: 120.00'));
    assert.equal((html.match(/class="sl-opening-percentile"/g) ?? []).length, 10);
    assert.ok(originalLevels.every(value => html.includes(value))); // Original mean levels remain intact.
  }
  assert.equal(JSON.stringify(asset), before);
  const originalPricePosition = renderToStaticMarkup(createElement(Component, { asset, frequency: 'weekly', locale: 'es' })).match(/class="sl-marker sl-marker-price" style="([^"]+)"/)![1];
  asset.frequencies.weekly.windows['5Y'].ma200ExtensionPercentile = 25.3;
  const rankChanged = renderToStaticMarkup(createElement(Component, { asset, frequency: 'weekly', locale: 'es' }));
  assert.equal(rankChanged.match(/class="sl-marker sl-marker-price" style="([^"]+)"/)![1], originalPricePosition);
  assert.ok(rankChanged.includes('Escala de precios'));
  asset.frequencies.weekly.changeMoves.lowExtensionFromOpen.p10 = null;
  const missing = renderToStaticMarkup(createElement(Component, { asset, frequency: 'weekly', locale: 'es' }));
  assert.equal((missing.match(/class="sl-opening-percentile"/g) ?? []).length, 9);
  assert.ok(!missing.includes('Mínimos desde apertura · P10:'));
});

test('the mark percentile ranks its opening move in the matching complete low or high sample, separately from MA extension', () => {
  const { currentOpeningPercentile: rank, HistoricalRange: Component } = component('components/statistical-levels/HistoricalRange.tsx') as {
    currentOpeningPercentile: typeof import('./HistoricalRange.tsx').currentOpeningPercentile;
    HistoricalRange: ComponentType<Record<string, unknown>>;
  };
  const asset = JSON.parse(readFileSync('lib/statistical-levels/generated/assets/GLD.json', 'utf8'));
  const data = asset.frequencies.weekly;
  data.periodHistory = undefined;
  data.periods = 5;
  data.recentPeriods = [1, 2, 3, 4].map(move => ({ open: 100, high: 100 + move, low: 100 - move }));
  asset.keyStatisticalLevels.weekly.currentOpen = 100;
  asset.keyStatisticalLevels.weekly.lastClose = 98;
  assert.deepEqual(rank(asset, 'weekly'), { value: 75, distribution: 'low', sample: 4 });
  asset.frequencies.weekly.windows.Full.ma200ExtensionPercentile = 2.4;
  for (const locale of ['es', 'en']) {
    const html = renderToStaticMarkup(createElement(Component, { asset, frequency: 'weekly', locale }));
    assert.ok(html.includes(`≈P75.0 · ${locale === 'es' ? 'mínimos' : 'lows'}`));
    assert.ok(!html.includes('≈P2.4'));
  }
  asset.keyStatisticalLevels.weekly.lastClose = 103;
  assert.deepEqual(rank(asset, 'weekly'), { value: 75, distribution: 'high', sample: 4 });
  asset.keyStatisticalLevels.weekly.lastClose = 105;
  assert.equal(rank(asset, 'weekly')!.value, 100);
  asset.keyStatisticalLevels.weekly.lastClose = 95;
  assert.equal(rank(asset, 'weekly')!.value, 0);
  data.periods = 100;
  assert.equal(rank(asset, 'weekly'), null); // Recent rows do not substitute for complete history.
  data.periods = 5;
  data.recentPeriods[0].low = null;
  assert.equal(rank(asset, 'weekly'), null); // Missing prices are not zeros.
  asset.keyStatisticalLevels.weekly.currentOpen = 0;
  assert.equal(rank(asset, 'weekly'), null);
});

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
    const html = renderToStaticMarkup(createElement(Component, { data: seasonality, asOf: manifest.generatedAt, locale, window: '5Y' }));
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
test('month seasonality uses the requested top-bar horizon and never substitutes a missing 1Y sample', () => {
  const Component = component('components/statistical-levels/CurrentMonthSeasonality.tsx').CurrentMonthSeasonality as ComponentType<Record<string, unknown>>;
  for (const locale of ['es', 'en']) {
    for (const window of ['3Y', '5Y', '10Y', 'Full']) {
      const html = renderToStaticMarkup(createElement(Component, { data: seasonality, asOf: manifest.generatedAt, locale, window }));
      const expected = seasonality.windows[window === 'Full' ? 'All' : window];
      for (let week = 1; week <= 5; week++) {
        const cell = expected.weekly.general.find((c: { month: number; weekOfMonth: number }) => c.month === month && c.weekOfMonth === week);
        const article = html.match(new RegExp(`<article[^>]*data-week="${week}"[\\s\\S]*?</article>`))![0];
        assert.ok(article.includes(`N ${cell?.sampleSize ?? 0}`));
        if (cell?.sampleSize && cell.averageReturn !== null) assert.ok(article.includes(weeklyReturnDisplay(cell.averageReturn)));
      }
      assert.ok(!html.includes('<select'));
    }
    const unavailable = renderToStaticMarkup(createElement(Component, { data: seasonality, asOf: manifest.generatedAt, locale, window: '1Y' }));
    assert.ok(unavailable.includes(locale === 'es' ? 'no está disponible' : 'is unavailable'));
    assert.ok(!unavailable.includes('data-week=') && !unavailable.includes('sl-season-summary'));
    for (const selected of ['1Y', 'YTD']) {
      const available = renderToStaticMarkup(createElement(Component, { data: seasonality, asset: spyFixture, asOf: manifest.generatedAt, locale, window: selected }));
      assert.equal((available.match(/data-week=/g) ?? []).length, 5);
      assert.match(available, /N [01] · (Muestra limitada|Limited sample)/);
      assert.ok(available.includes(selected === 'YTD' ? 'YTD' : locale === 'es' ? '1A' : '1Y'));
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
test('historical patterns expose their controls directly without a second disclosure or duplicated heading', () => {
  const Component = component('components/statistical-levels/AdvancedSeasonalityPanel.tsx').AdvancedSeasonalityPanel as ComponentType<Record<string, unknown>>;
  for (const locale of ['es', 'en']) for (const frequency of ['daily', 'weekly', 'monthly']) {
    const html = renderToStaticMarkup(createElement(Component, { data: seasonality, asset: spyFixture, window: '5Y', frequency, generatedAt: manifest.generatedAt, locale }));
    assert.ok(!html.includes('sl-context-toggle') && !html.includes('Historical calendar patterns') && !html.includes('Patrones históricos por calendario'));
    assert.equal((html.match(/<select/g) ?? []).length, frequency === 'monthly' ? 2 : 3);
    assert.ok(!html.includes(locale === 'en' ? 'Hide context' : 'Ocultar contexto'));
    assert.ok(html.includes(locale === 'en' ? 'completed UTC calendar periods' : 'periodos de calendario UTC completos'));
    assert.ok(!html.includes('value="3Y"') && !html.includes('value="5Y"') && !html.includes('value="10Y"') && !html.includes('value="All"'));
    for (const value of ['midterm', 'medianReturn', 'sampleSize']) assert.ok(html.includes(`value="${value}"`));
  }
});

test('expanded patterns show editable controls once and current average N as inline metadata', () => {
  const Component = component('components/statistical-levels/AdvancedSeasonalityPanel.tsx').AdvancedSeasonalityPanel as ComponentType<Record<string, unknown>>;
  for (const locale of ['es', 'en']) for (const frequency of ['daily', 'weekly', 'monthly']) {
    const html = renderToStaticMarkup(createElement(Component, { data: seasonality, asset: spyFixture, window: '5Y', frequency, generatedAt: manifest.generatedAt, locale }));
    const cells = seasonality.windows['5Y'][frequency].general as Array<{ sampleSize: number }>;
    const averageN = (cells.reduce((sum, cell) => sum + cell.sampleSize, 0) / cells.length).toFixed(0);
    assert.doesNotMatch(html, /data-insight-metrics|data-insight-metric-value/);
    assert.equal((html.match(/<select/g) ?? []).length, frequency === 'monthly' ? 2 : 3);
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

test('period labels keep monthly year/month and use the existing weekly closing-date buckets, including boundaries', () => {
  const { formatExplorerPeriod } = component('components/statistical-levels/PeriodExplorerTable.tsx') as {
    formatExplorerPeriod: (row: PeriodExplorerRow, frequency: string, locale: string) => string;
  };
  const row = JSON.parse(readFileSync('lib/statistical-levels/generated/assets/SPY.json', 'utf8')).frequencies.weekly.recentPeriods[0];
  for (const [day, week] of [[1,1], [7,1], [8,2], [14,2], [15,3], [21,3], [22,4], [28,4], [29,5], [31,5]]) {
    const period = { ...row, periodEnd: `2026-10-${String(day).padStart(2, '0')}` };
    assert.equal(formatExplorerPeriod(period, 'weekly', 'es'), `${week}.ª semana · oct 2026`);
    assert.ok(formatExplorerPeriod(period, 'weekly', 'en').includes('week · Oct 2026'));
    assert.equal(formatExplorerPeriod(period, 'monthly', 'es'), 'oct 2026');
    assert.equal(formatExplorerPeriod(period, 'monthly', 'en'), 'Oct 2026');
    assert.equal(formatExplorerPeriod(period, 'daily', 'es'), row.period);
  }
});

test('period sorting is numeric, keeps nulls last in both directions, and never mutates the snapshot', () => {
  const { selectExplorerRows } = component('components/statistical-levels/PeriodExplorerTable.tsx') as {
    selectExplorerRows: (rows: PeriodExplorerRow[], filter: string, columns: object, sort: object, locale: string) => PeriodExplorerRow[];
  };
  const sample = JSON.parse(readFileSync('lib/statistical-levels/generated/assets/SPY.json', 'utf8')).frequencies.weekly.recentPeriods[0];
  const rows = [100, 9, null, 0, -2].map((close, index) => ({ ...sample, close, periodEnd: `2026-10-${10 + index}` }));
  const before = JSON.stringify(rows);
  assert.deepEqual(selectExplorerRows(rows, 'all', {}, { column: 'close', direction: 'asc' }, 'es').map(row => row.close), [-2, 0, 9, 100, null]);
  assert.deepEqual(selectExplorerRows(rows, 'all', {}, { column: 'close', direction: 'desc' }, 'en').map(row => row.close), [100, 9, 0, -2, null]);
  assert.deepEqual(selectExplorerRows(rows, 'all', { close: { min: '0', max: '9' } }, { column: 'close', direction: 'asc' }, 'es').map(row => row.close), [0, 9]);
  assert.equal(JSON.stringify(rows), before);
});

test('period column filters combine real close dates, classification and percentage units across all available rows', () => {
  const { selectExplorerRows } = component('components/statistical-levels/PeriodExplorerTable.tsx') as {
    selectExplorerRows: (rows: PeriodExplorerRow[], filter: string, columns: object, sort: object, locale: string) => PeriodExplorerRow[];
  };
  const asset = JSON.parse(readFileSync('lib/statistical-levels/generated/assets/SPY.json', 'utf8'));
  for (const frequency of ['daily', 'weekly', 'monthly']) {
    const rows: PeriodExplorerRow[] = asset.frequencies[frequency].recentPeriods;
    const sort = { column: 'period', direction: 'desc' };
    assert.equal(selectExplorerRows(rows, 'all', {}, sort, 'es').length, rows.length); // No old 36-row cap.
    const filters = { period: { min: '2026-01-01', max: '2026-09-30' }, change: { min: '-2', max: '2' }, classification: { value: 'Zona media' } };
    const expected = rows.filter(row => row.periodEnd >= '2026-01-01' && row.periodEnd <= '2026-09-30' && row.change !== null && row.change * 100 >= -2 && row.change * 100 <= 2 && row.classification === 'Zona media');
    assert.deepEqual(selectExplorerRows(rows, 'all', filters, sort, 'es'), expected);
    assert.deepEqual(selectExplorerRows(rows, 'positive_extreme', {}, sort, 'en'), rows.filter(row => row.classification === 'Extensión positiva extrema'));
    assert.deepEqual(selectExplorerRows(rows, 'all', { close: { min: '1000000' } }, sort, 'es'), []);
  }
});

test('period explorer opens directly with extreme positives selected, all columns localized and exact dates retained', () => {
  const Component = component('components/statistical-levels/PeriodExplorerTable.tsx').PeriodExplorerTable as ComponentType<Record<string, unknown>>;
  const asset = JSON.parse(readFileSync('lib/statistical-levels/generated/assets/SPY.json', 'utf8'));
  for (const locale of ['es', 'en']) for (const frequency of ['daily', 'weekly', 'monthly']) {
    const html = renderToStaticMarkup(createElement(Component, { asset, frequency, locale }));
    assert.ok(!html.includes('Ocultar explorador') && !html.includes('Show period explorer') && !html.includes('Focus asset'));
    assert.ok(html.includes(`aria-pressed="true">${locale === 'es' ? 'Extensión positiva extrema' : 'Extreme positive extension'}`));
    assert.equal((html.match(/scope="col"/g) ?? []).length, 10);
    assert.ok(html.includes(locale === 'es' ? 'Ordenar por Apertura' : 'Sort by Open'));
    for (const row of asset.frequencies[frequency].recentPeriods.filter((row: PeriodExplorerRow) => row.classification === 'Extensión positiva extrema').slice(0, 10)) {
      assert.ok(html.includes(`dateTime="${row.periodEnd}"`) || html.includes(`datetime="${row.periodEnd}"`));
      assert.ok(html.includes(`${row.periodStart} → ${row.periodEnd}`));
    }
  }
});

test('drawdown zero baseline starts at the chart edge and preserves the actual negative series', () => {
  const Component = component('components/statistical-levels/UnderwaterDrawdownChart.tsx').UnderwaterDrawdownChart as ComponentType<Record<string, unknown>>;
  const asset = JSON.parse(readFileSync('lib/statistical-levels/generated/assets/SPY.json', 'utf8'));
  asset.frequencies.weekly.drawdownHistory = [{ date: '2026-10-02', close: 100 }, { date: '2026-10-09', close: 80 }, { date: '2026-10-16', close: 90 }];
  asset.frequencies.weekly.windows['5Y'].sessions = 3;
  const html = renderToStaticMarkup(createElement(Component, { asset, frequency: 'weekly', window: '5Y', locale: 'es' }));
  assert.ok(html.includes('M 0.00 0.00 L 50.00 90.00 L 100.00 45.00 L 100 0 L 0 0 Z'));
  assert.ok(html.includes('y1="0" y2="0"'));
});

test('drawdown window average includes highs and dates the first unrounded trough within the selected window', () => {
  const summarize = component('components/statistical-levels/UnderwaterDrawdownChart.tsx').getDrawdownWindow as typeof import('./UnderwaterDrawdownChart.tsx').getDrawdownWindow;
  const data = JSON.parse(readFileSync('lib/statistical-levels/generated/assets/SPY.json', 'utf8')).frequencies.weekly;
  data.drawdownHistory = [100, 80, 90, 100, 80].map((close, index) => ({ date: `2026-10-${String(index + 1).padStart(2, '0')}`, close }));
  data.windows.Full.sessions = 5;
  const full = summarize(data, 'Full');
  assert.ok(Math.abs(full.average! - (-.1)) < 1e-12);
  assert.equal(full.maximumDate, '2026-10-02');
  data.windows['5Y'].sessions = 1;
  const reset = summarize(data, '5Y');
  assert.equal(reset.average, 0);
  assert.equal(reset.maximumDate, null); // The selected window starts its own high-water mark.
  data.windows['5Y'].available = false;
  assert.equal(summarize(data, '5Y').average, null);
  data.windows.Full.sessions = 6;
  assert.equal(summarize(data, 'Full').maximumDate, null);
  assert.equal(summarize(data, 'Full').average, null); // Truncated history is not a complete window.
  assert.equal(summarize(undefined, 'Full').average, null);
});

test('drawdown summaries match the stored SPY daily, weekly and monthly windows without changing the source', () => {
  const summarize = component('components/statistical-levels/UnderwaterDrawdownChart.tsx').getDrawdownWindow as typeof import('./UnderwaterDrawdownChart.tsx').getDrawdownWindow;
  const asset = JSON.parse(readFileSync('lib/statistical-levels/generated/assets/SPY.json', 'utf8'));
  const before = JSON.stringify(asset);
  for (const frequency of ['daily', 'weekly', 'monthly']) {
    const data = asset.frequencies[frequency];
    for (const window of ['1Y', '3Y', '5Y', '10Y', 'Full'] as const) {
      const summary = summarize(data, window);
      const metric = data.windows[window];
      if (!metric.available) { assert.equal(summary.average, null); continue; }
      assert.equal(summary.series.length, metric.sessions);
      assert.equal(Number(Math.min(...summary.drawdowns).toFixed(4)), metric.maxDrawdown);
      assert.ok(summary.average! <= 0 && summary.average! >= metric.maxDrawdown - .00005);
      assert.equal(summary.maximumDate, summary.series[summary.drawdowns.indexOf(Math.min(...summary.drawdowns))].date);
    }
  }
  assert.equal(summarize(asset.frequencies.weekly, 'Full').maximumDate, '2009-03-06');
  assert.equal(JSON.stringify(asset), before);
});

test('level distances distinguish the stored current-price comparison from the level’s move from opening in both locales', () => {
  const Component = component('components/statistical-levels/KeyStatisticalLevelsPanel.tsx').KeyStatisticalLevelsPanel as ComponentType<Record<string, unknown>>;
  const asset = JSON.parse(readFileSync('lib/statistical-levels/generated/assets/GLD.json', 'utf8'));
  const levels = asset.keyStatisticalLevels.weekly;
  levels.currentOpen = 100;
  levels.lastClose = 90;
  levels.levels.WSHE = 120;
  levels.levels.WSLE = 80;
  levels.distances.WSHE = -.25;
  levels.distances.WSLE = .125;
  const before = JSON.stringify(asset);
  for (const locale of ['es', 'en']) {
    const html = renderToStaticMarkup(createElement(Component, { asset, frequency: 'weekly', locale }));
    const format = (value: number) => new Intl.NumberFormat(locale === 'es' ? 'es-ES' : 'en-US', { style: 'percent', signDisplay: 'exceptZero', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
    for (const value of [-.25, .125]) assert.ok(html.includes(`${format(value)}</span> · ${locale === 'es' ? 'precio actual vs. nivel' : 'current price vs. level'}`));
    for (const value of [.2, -.2]) assert.ok(html.includes(`${format(value)}</span> · ${locale === 'es' ? 'nivel desde apertura' : 'level from open'}`));
  }
  assert.equal(JSON.stringify(asset), before);
});

test('movement table keeps every source statistic aligned when minimum moves before P10, across frequencies and locales', () => {
  const Component = component('components/statistical-levels/MovementSummaryTable.tsx').MovementSummaryTable as ComponentType<Record<string, unknown>>;
  const asset = JSON.parse(readFileSync('lib/statistical-levels/generated/assets/GLD.json', 'utf8'));
  const before = JSON.stringify(asset);
  for (const locale of ['es', 'en']) for (const frequency of ['daily', 'weekly', 'monthly']) {
    const html = renderToStaticMarkup(createElement(Component, { asset, frequency, locale }));
    const headers = [...html.matchAll(/<th\b[^>]*>(.*?)<\/th>/g)].map(match => match[1]);
    assert.deepEqual(headers, [locale === 'es' ? 'Métrica' : 'Metric', locale === 'es' ? 'Media' : 'Mean', locale === 'es' ? 'Desv. típica' : 'Std. dev.', locale === 'es' ? 'Mínimo' : 'Minimum', 'p10', 'p25', 'p50', 'p75', 'p90', locale === 'es' ? 'Máximo' : 'Maximum']);
    const rows = [...html.match(/<tbody>([\s\S]*?)<\/tbody>/)![1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)];
    const metrics = Object.keys(asset.frequencies[frequency].changeMoves);
    assert.equal(rows.length, metrics.length);
    for (const [index, row] of rows.entries()) {
      const metric = metrics[index];
      const source = asset.frequencies[frequency].changeMoves[metric];
      const values = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].slice(1).map(match => match[1]);
      assert.deepEqual(values, ['mean', 'std', 'min', 'p10', 'p25', 'p50', 'p75', 'p90', 'max'].map(key => source[key] === null ? 'n/d' : metric === 'closeLocation' ? source[key].toFixed(2) : `${source[key] > 0 ? '+' : ''}${(source[key] * 100).toFixed(2)}%`));
    }
    assert.ok(html.includes('href="#sl-periods-disclosure"'));
  }
  assert.equal(JSON.stringify(asset), before);
});

test('the actual lab sends one selected period to the opened chart, period summary and patterns in ES/EN', () => {
  // Open only the lazy host in this SSR harness; the real lab and every data
  // child still render their actual code and receive the actual selected props.
  const disclosure = component('components/statistical-levels/StatisticalDisclosure.tsx');
  const original = disclosure.StatisticalDisclosure;
  disclosure.StatisticalDisclosure = function OpenSelectedDisclosure({ id, children }: { id: string; children: ReactNode }) {
    return ['sl-quant', 'sl-periods-disclosure', 'sl-calendar-disclosure'].includes(id) ? createElement('section', { id }, children) : null;
  };
  try {
  const Component = component('components/statistical-levels/StatLevelsLab.tsx').StatLevelsLab as ComponentType<Record<string, unknown>>;
  const recordedYear = (spyFixture.currentMark?.date ?? spyFixture.lastDate).slice(0, 4);
  for (const locale of ['es', 'en']) for (const selected of ['3Y', 'YTD']) {
    const frequency = 'weekly';
    const prices = spyFixture.frequencies.weekly.drawdownHistory;
    const visible = selected === '3Y' ? prices.slice(-156) : prices.filter((point: { date: string }) => point.date >= `${recordedYear}-01-01`);
    const html = renderToStaticMarkup(createElement(Component, {
      initial: { asset: spyFixture, manifest, seasonality, selection: { asset: 'SPY', frequency, window: selected } },
      snapshot: { id: 'fixture' }, locale, stale: false,
    }));
    const rendered = html.replace(/<!--[\s\S]*?-->/g, '');
    assert.ok(rendered.includes(`data-window="${selected}" aria-pressed="true"`));
    assert.ok(rendered.includes(`MA40 · ${selected === 'YTD' ? 'YTD' : locale === 'es' ? '3A' : '3Y'} · ${visible[0].date} – ${visible.at(-1).date}`), JSON.stringify(rendered.match(/MA40[^<]{0,180}/g)));
    const summary = rendered.match(/<dl class="sl-explorer-summary">([\s\S]*?)<\/dl>/)![1];
    assert.ok(summary.includes(`${visible.length} ${locale === 'en' ? 'periods' : 'periodos'}`));
    const patterns = rendered.match(/<p class="sl-caption sl-patterns-sample">([\s\S]*?)<\/p>/)![1];
    assert.ok(patterns.includes(selected === 'YTD' ? 'YTD' : locale === 'es' ? '3A' : '3Y'));
    assert.ok(!rendered.includes('El explorador usa su historial disponible, independientemente') && !rendered.includes('The explorer uses its available history, independently'));
  }
  } finally { disclosure.StatisticalDisclosure = original; }
});
