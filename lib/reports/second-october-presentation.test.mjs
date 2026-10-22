// Real HTML from the report components, with all external transport blocked.
// Check the revised public copy, preserved V2 structure and historical report HTML.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const req = createRequire(path.join(root, 'package.json'));
const ts = req('typescript'), React = req('react');
const { renderToStaticMarkup } = req('react-dom/server');
const base = '3a7f8fd98599066774e2cf08124808a84910c8db';
function compile(source, filename, require) {
  const compiledModule = { exports: {} };
  const code = ts.transpileModule(source.replaceAll('import.meta.url', JSON.stringify(pathToFileURL(filename).href)), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  new Function('require', 'module', 'exports', code)(require, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const oldSources = new Map();
function presentation(locale, { before = false } = {}) {
  const modules = new Map();
  function load(relative) {
    let filename = path.resolve(root, relative);
    if (!path.extname(filename)) filename += fs.existsSync(filename + '.ts') ? '.ts' : '.tsx';
    relative = path.relative(root, filename);
    if (modules.has(filename)) return modules.get(filename);
    const localRequire = name => {
      if (name === 'next/navigation') return { usePathname: () => locale === 'en' ? '/en/dashboard' : '/dashboard' };
      if (name === 'next/link') return { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) };
      if (name.startsWith('@/')) return load(name.slice(2));
      if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), name)));
      return req(name);
    };
    if (before && !oldSources.has(relative)) oldSources.set(relative, execFileSync('git', ['show', `${base}:${relative}`], { cwd: root, encoding: 'utf8' }));
    const source = before ? oldSources.get(relative) : fs.readFileSync(filename, 'utf8');
    const exports = filename.endsWith('.json') ? JSON.parse(source) : compile(source, filename, localRequire);
    modules.set(filename, exports); return exports;
  }
  return load;
}

let transportAttempts = 0;
const blocked = () => { transportAttempts++; throw new Error('External transport blocked in report presentation test'); };
globalThis.fetch = blocked;
for (const [name, methods] of [['node:http', ['request', 'get']], ['node:https', ['request', 'get']], ['node:net', ['connect', 'createConnection']], ['node:tls', ['connect']]]) {
  for (const method of methods) req(name)[method] = blocked;
}
const current = presentation('es');
const previous = presentation('es', { before: true });
const report = current('lib/reports/second-october-2026.ts').secondOctober2026Report;
function render(load, slug, override) {
  const reports = load('lib/reports/market-reports.ts');
  const r = override ?? reports.getMarketReportBySlug(slug);
  const adjacent = reports.getAdjacentReports(slug);
  return renderToStaticMarkup(React.createElement(load('components/reports/MarketReportContent.tsx').MarketReportContent, {
    report: r, ...adjacent, automaticReadings: load('lib/reports/historical-automatic-readings.ts').getHistoricalAutomaticReadings(slug),
  }));
}
const html = render(current, report.id);
const plain = value => value.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, '');
const text = plain(html);
const markdown = value => plain(value.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1').replace(/\*/g, ''));

test('native October: title, frozen cutoffs, one market heading and all downloads', () => {
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.equal(plain(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1]), markdown('La amplitud mejora, pero los líderes empiezan a fallar'));
  const hero = html.slice(0, html.indexOf('<nav aria-label="Secciones del informe"'));
  assert(plain(hero.slice(0, hero.indexOf('<h1'))).includes(markdown('Segundo informe de octubre de 2026')));
  assert.equal(plain(hero).split(markdown(report.subtitle)).length - 1, 1, 'Headline must not repeat as subtitle');
  assert(plain(hero).includes(markdown(report.summary)), 'Approved summary is the introduction');
  assert.match(html, /Datos congelados/);
  assert.match(html, /16 de octubre de 2026/);
  assert.match(html, /19 de octubre/);
  assert.match(html, /22 de octubre de 2026/);
  assert.equal((html.match(/>Lecturas de mercado al cierre<\/h2>/g) ?? []).length, 1);
  assert.doesNotMatch(html, /La página web es la edición principal|Lo primero es comparar ambos cortes|Datos de esta edición|(?:La lectura principal\.?|Mi lectura|Mi conclusión:)(?:<\/strong>|<\/h[1-6]>)|\bCDI\b|\bdashboard\b/i);
  const old = render(previous, report.id);
  for (const link of old.matchAll(/href="([^"]*segundo-informe-octubre-2026\.(?:pdf|html|md|ics))"/g)) assert(html.includes(link[0]));
});

test('all substantive approved paragraphs and table values survive the presentation', () => {
  const omitted = [
    'La tabla recoge medidas homogéneas',
    'Las encuestas de sentimiento y posicionamiento',
    '**Referencias públicas:**',
  ];
  for (const section of report.editorialSections) for (const block of section.blocks) {
    if (block.kind === 'heading' || block.kind === 'table' || omitted.some(prefix => block.text.startsWith(prefix))) continue;
    const normalized = block.text;
    assert(text.includes(markdown(normalized)), `Missing approved paragraph: ${block.text.slice(0, 100)}`);
  }
  const tables = report.editorialSections.find(s => s.id === 'lecturas-mercado-cierre').blocks.filter(b => b.kind === 'table');
  for (const table of tables) for (const cell of table.rows.flat()) assert(text.includes(markdown(cell)), `Missing market cell: ${cell}`);
});

test('sector and Halloween figures are limited to the approved numerical summary', () => {
  const authority = fs.readFileSync(path.join(root, 'docs/reports/segundo-informe-octubre-2026/approved.md'), 'utf8');
  for (const value of ['5,02 %', '4,86 %', '3,45 %', '7,70 %', '24 años positivos y 9 negativos', '6 de 10 años', '+1,67 %', '+0,50 %', '+1,07 %']) assert(authority.includes(value));
  assert.match(html, /cuatro sectores destacados, no el universo completo/);
  assert.match(html, /24 de 33 años positivos · 9 negativos/);
  assert.match(html, /6 de 10 años positivos · 4 no positivos/);
  assert.match(html, /no una serie anual reconstruida/);
  assert.match(html, /no como una invitación a operar SPY u opciones/);
  const market = html.slice(html.indexOf('id="lecturas-mercado-cierre"'), html.indexOf('id="lectura-seguimiento"'));
  assert.doesNotMatch(market, /Broadcom|Nvidia|Tesla|CoreWeave/);
  assert.match(html, /Empresas, bancos y analistas · BofA y J.P. Morgan/);
  assert.equal((html.match(/Broadcom/g) ?? []).length, 1);
});

test('calendar, eleven linked watch items, conditional scenarios and all source groups', () => {
  for (const event of report.calendar) assert(html.includes(event.event), `Missing calendar event: ${event.event}`);
  assert.match(html, /continuidad en noviembre/);
  assert.match(html, /Fecha prevista editorial no confirmada/);
  assert.doesNotMatch(html, /Fecha y hora confirmadas por fuente primaria/);
  assert.equal((html.match(/aria-label="Ver contexto de /g) ?? []).length, 11);
  for (const link of html.matchAll(/href="#([^"]+)"/g)) assert(html.includes(`id="${link[1]}"`), `Broken anchor ${link[1]}`);
  for (const id of ['spy', 'gld', 'fxi', 'ewj', 'btc', 'eth', 'stock-picking']) assert(html.includes(`id="octubre-${id}"`));
  for (const label of ['Base', 'Favorable', 'Adverso', 'sin probabilidades asignadas', 'Precios y amplitud', 'Economía y calendario', 'Sentimiento y flujos', 'Crédito, energía y cripto']) assert(html.includes(label));
  for (const source of report.editorialSections.find(s => s.id === 'fuentes-y-aviso').blocks.filter(b => b.kind === 'source')) assert(text.includes(markdown(source.text)));
});

test('unavailable statistics stay omitted; existing quantitative panels remain supported', () => {
  assert.equal(report.marketClose, undefined);
  assert(report.assetReadings.every(asset => !asset.quantitativePanels?.length));
  assert.doesNotMatch(html, /<t[dh][^>]*>[^<]*(?:EWMA|GARCH|WSLE|WALE|WAHE|WSHE)/);
  const fixture = structuredClone(report);
  fixture.assetReadings[0].quantitativePanels = [{ title: 'Synthetic panel fixture', intro: '', headers: ['Metric', 'Value'], rows: [['Synthetic statistic', 'Test only']], notes: [] }];
  assert.match(render(current, report.id, fixture), /Synthetic statistic/);
  assert.doesNotMatch(html, /Synthetic statistic|Test only/);
});

test('watchlist: eleven initially closed disclosures retain ordered content and separate context links', () => {
  const watchBlock = output => output.slice(output.indexOf('id="lista-control"'), output.indexOf('id="fuentes-y-aviso"'));
  const watch = watchBlock(html), before = watchBlock(render(previous, report.id));
  const disclosures = [...watch.matchAll(/<details\b([^>]*)>([\s\S]*?)<\/details>/g)];
  assert.equal(disclosures.length, 11);
  disclosures.forEach(([, attributes, content], index) => {
    assert.doesNotMatch(attributes, /\sopen(?:\s|=|$)/);
    const summary = content.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/)[1];
    assert.equal(plain(summary.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/)[1]), markdown(report.watchlist[index].name));
    assert.match(summary, /Seguimiento condicional/);
    assert.match(summary, /class="details-open-label">Abrir/);
    assert.match(summary, /class="details-close-label">Cerrar/);
    assert.doesNotMatch(summary, /<a\b/);
    const body = content.slice(content.indexOf('</summary>') + '</summary>'.length);
    assert(plain(body).includes(markdown(report.watchlist[index].whatLooksAt)));
    assert(plain(body).includes(markdown(report.watchlist[index].whatWouldChange)));
    assert.match(body, /Señal a seguir/);
    assert.match(body, /Qué cambiaría la lectura/);
    assert.match(body, /Ver contexto ↑/);
  });
  const links = output => [...output.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(links(watch), links(before));
});

test('V2 layout, hero, scenarios, watchlist, navigation and accessibility structure are preserved', () => {
  const before = render(previous, report.id);
  const structure = output => output.replace(/<\/?(?:strong|em)\b[^>]*>/g, '').match(/<[^>]*>/g);
  assert.deepEqual(structure(html), structure(before), 'Editorial changes retain the same presentation markup');
  const slice = (output, start, end) => output.slice(output.indexOf(start), output.indexOf(end));
  assert.equal(slice(html, '<article', '<nav aria-label="Secciones del informe"'), slice(before, '<article', '<nav aria-label="Secciones del informe"'));
  assert.equal(slice(html, 'id="rutas-probables"', 'id="lista-control"'), slice(before, 'id="rutas-probables"', 'id="lista-control"'));
  const links = output => [...output.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(links(html), links(before));
  assert.doesNotMatch(html, /tabla recibida|semanal recibida|otra infografía|material (?:aportado|de BofA recibido)|que revisamos|recibimos estudios|snapshot|regenerar|borrador|estudio aportado|material atribuido|me preocupa/i);
  for (const passage of ['Entre 1993 y 2025', 'Son resultados de periodos distintos, no dos estimaciones para la misma muestra.', 'no cuentan con una verificación independiente', 'no acreditan la verificación independiente de los documentos originales']) assert(text.includes(markdown(passage)), passage);
});

test('historical September and first October render byte-identically to the direct parent', () => {
  for (const slug of ['segundo-informe-septiembre-2026', 'primer-informe-octubre-2026']) assert.equal(render(current, slug), render(previous, slug), slug);
});

test.after(() => {
  assert.equal(transportAttempts, 0, 'No source or provider access is permitted');
  console.log(JSON.stringify({ reportPresentationTransportAttempts: transportAttempts, completedExternalCalls: 0 }));
});
