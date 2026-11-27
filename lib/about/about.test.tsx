import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { aboutContent, aboutLinks } from './content';
import { getTranslatedPathname } from '../i18n/language-pairs.ts';
import { getRouteMetadata } from '../seo/site.ts';

// Render the real page; adapt only the framework image binding and CSS for Node.
const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../../components/about/AboutPage.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const loaded = { exports: {} as { AboutPage?: React.ComponentType<{ locale: 'es' | 'en' }> } };
new Function('require', 'module', 'exports', compiled)((name: string) => {
  if (name === 'next/image') return { default: ({ src, alt }: { src: string; alt: string }) => React.createElement('img', { src, alt }) };
  if (name.endsWith('.module.css')) return { default: {} };
  if (name === '@/lib/about/content') return { aboutContent, aboutLinks };
  return require(name);
}, loaded, loaded.exports);
const AboutPage = loaded.exports.AboutPage!;

const approvedSpanish = [
  'Mi nombre es Luigui Herrera.',
  'Ingeniero químico, máster en Economía, Finanzas y Computación y doctorando.',
  'Veo los mercados como una figura de muchas dimensiones. Cada variable que calculo me da información sobre alguna de sus caras. El juego consiste en acercarme lo más posible a reconocer qué forma tiene la figura en ese momento de tiempo.',
  'Aquí comparto mis observaciones, el análisis que hay detrás y las herramientas que voy construyendo para ver esas caras con más claridad y poner mis ideas a prueba.',
  'Antes de sacar conclusiones, busco entender qué está pasando, qué puede aclararlo, qué información me falta y cuál es la manera más simple de explicarlo.',
  'Cuando una idea me parece buena, tengo que tener más cuidado. Intento separarla de mis sesgos y preferencias personales. Para eso me pregunto qué podría estar pasando por alto, qué estoy dando por hecho y qué tendría que cambiar para replantearla.',
  'Me ocupa entender con claridad qué estoy arriesgando, de dónde viene ese riesgo y qué margen tengo si las cosas no salen como esperaba.',
  'Busco reunir en un mismo lugar lo que uso para hacer seguimiento a mis inversiones: análisis cuantitativo, escenarios y herramientas que voy investigando y construyendo para reconocer patrones en el mercado y entender cómo encajan las distintas caras de esa figura.',
  'También quiero que se entienda de forma sencilla cómo llego a cada observación: qué datos la sostienen, qué límites tiene y qué me llevaría a revisarla.',
];
function text(html: string) { return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/\s+/g, ' ').trim(); }

test('The Spanish page renders every approved paragraph verbatim, with the requested heading hierarchy', () => {
  const html = renderToStaticMarkup(<AboutPage locale="es" />);
  const rendered = text(html);
  for (const paragraph of approvedSpanish) assert.ok(rendered.includes(paragraph), paragraph);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.equal((html.match(/<h2\b/g) ?? []).length, 2);
  assert.equal((html.match(/<h3\b/g) ?? []).length, 3);
  assert.doesNotMatch(html, /me preocupa|Lo que comparto|Entender antes de decidir/);
});

for (const locale of ['es', 'en'] as const) {
  test(`The ${locale} page uses the exact external destinations with new-tab safety and localized descriptions`, () => {
    const html = renderToStaticMarkup(<AboutPage locale={locale} />);
    for (const link of aboutLinks) {
      assert.ok(html.includes(`href="${link.href}"`));
      assert.ok(html.includes(aboutContent[locale].linkCaptions[link.id]));
      assert.match(html, new RegExp(`href="${link.href}"[^>]*target="_blank"[^>]*rel="noopener noreferrer"`));
    }
    assert.equal((html.match(/<a\b/g) ?? []).length, 2);
    assert.ok(html.includes(aboutContent[locale].newTab));
    assert.match(html, /\/images\/about\/many-faces.webp/);
    assert.doesNotMatch(html, /<canvas|<iframe/);
    if (locale === 'en') {
      assert.match(text(html), /doctoral student/);
      assert.doesNotMatch(text(html), /doctorando|Cómo pienso|Trayectoria y formación|Me ocupa/);
    }
  });
}

test('Language switching and canonical metadata map directly to the equivalent About page', () => {
  assert.equal(getTranslatedPathname('/sobre-mi', 'en'), '/en/about');
  assert.equal(getTranslatedPathname('/en/about', 'es'), '/sobre-mi');
  for (const path of ['/sobre-mi', '/en/about']) {
    const metadata = getRouteMetadata(path);
    assert.equal(metadata.alternates?.canonical, 'https://www.luiguiherrera.com' + path);
    assert.deepEqual(metadata.alternates?.languages, { es: 'https://www.luiguiherrera.com/sobre-mi', en: 'https://www.luiguiherrera.com/en/about', 'x-default': 'https://www.luiguiherrera.com/sobre-mi' });
  }
});
