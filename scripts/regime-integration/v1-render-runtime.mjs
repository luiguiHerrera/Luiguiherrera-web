// Integration-only Node SSR support. The application's resolver and rendering are unchanged.
import { createRequire, registerHooks } from 'node:module';
import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
export const root = realpathSync(process.env.REGIME_INTEGRATION_ROOT ?? fileURLToPath(new URL('../../', import.meta.url)));
const require = createRequire(path.join(root, 'package.json'));
export const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server'), ts = require('typescript');
const fixtures = { react: React, 'react/jsx-runtime': require('react/jsx-runtime'), 'react/jsx-dev-runtime': require('react/jsx-dev-runtime') };
globalThis.__REGIME_V1_REACT = fixtures;
globalThis.__REGIME_V1_PATHNAME = '/dashboard';
registerHooks({
  resolve(specifier, context, next) {
    if (Object.hasOwn(fixtures, specifier)) return { url: 'v1-integration:' + specifier, shortCircuit: true };
    if (specifier === 'next/navigation' || specifier === 'next/link' || specifier === 'next/cache' || specifier === 'next/cache.js' || specifier === 'server-only') return { url: 'v1-integration:' + specifier, shortCircuit: true };
    if (context.parentURL?.includes('/node_modules/')) return next(specifier, context);
    if (specifier.startsWith('@/')) specifier = pathToFileURL(path.join(root, specifier.slice(2))).href;
    if (specifier.startsWith('.') && context.parentURL) specifier = new URL(specifier, context.parentURL).href;
    if (specifier.startsWith('file:')) for (const suffix of ['', '.ts', '.tsx', '.mjs', '.json']) if (existsSync(fileURLToPath(specifier) + suffix)) return next(pathToFileURL(fileURLToPath(specifier) + suffix).href, context);
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith('v1-integration:') && Object.hasOwn(fixtures, url.slice(15))) {
      const name = url.slice(15), keys = Object.keys(fixtures[name]).filter(key => /^[A-Za-z_$][\w$]*$/.test(key) && key !== 'default');
      return { format: 'module', source: `const value=globalThis.__REGIME_V1_REACT[${JSON.stringify(name)}];export default value;` + keys.map(key => `export const ${key}=value.${key};`).join(''), shortCircuit: true };
    }
    if (url === 'v1-integration:next/navigation') return { format: 'module', source: "export function usePathname(){return globalThis.__REGIME_V1_PATHNAME;} export function notFound(){throw new Error('NEXT_NOT_FOUND');}", shortCircuit: true };
    if (url === 'v1-integration:next/link') return { format: 'module', source: "const React=globalThis.__REGIME_V1_REACT.react;export default function Link(props){return React.createElement('a',props);}", shortCircuit: true };
    if (url === 'v1-integration:server-only') return { format: 'module', source: 'export {};', shortCircuit: true };
    if (url === 'v1-integration:next/cache' || url === 'v1-integration:next/cache.js') return { format: 'module', source: 'export function unstable_cache(fn){return fn;}', shortCircuit: true };
    if (url.startsWith(pathToFileURL(root + path.sep).href) && !url.includes('/node_modules/')) {
      if (url.endsWith('.module.css')) {
        const source = readFileSync(new URL(url), 'utf8'), names = Object.fromEntries([...source.matchAll(/\.([A-Za-z_][\w-]*)/g)].map(row => [row[1], row[1]]));
        return { format: 'module', source: 'export default ' + JSON.stringify(names) + ';', shortCircuit: true };
      }
      if (url.endsWith('.json')) return { format: 'module', source: 'export default ' + readFileSync(new URL(url), 'utf8') + ';', shortCircuit: true };
      if (url.endsWith('.tsx')) return { format: 'module', source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText, shortCircuit: true };
    }
    return next(url, context);
  },
});
export const importFromRoot = file => import(pathToFileURL(path.join(root, file)).href);
export async function componentFromSource(source, exportedName) {
  const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return (await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64')))[exportedName];
}
export function renderComponent(component, props, locale) {
  globalThis.__REGIME_V1_PATHNAME = locale === 'en' ? '/en/dashboard' : '/dashboard';
  return renderToStaticMarkup(React.createElement(component, props));
}
// Read only the text inside the renderer's actual metric group, including nested badge spans.
export function metricValues(html, attribute) {
  const start = html.indexOf(attribute);
  if (start < 0) throw new Error('Metric group absent: ' + attribute);
  const open = html.lastIndexOf('<div', start), tokens = html.slice(open).match(/<[^>]*>|[^<]+/g) ?? [];
  let depth = 0, text = []; const values = [];
  for (const token of tokens) {
    if (/^<div(?:\s|>)/.test(token)) { depth++; if (depth === 2) text = []; }
    else if (token === '</div>') {
      if (depth === 2) values.push(text.slice(1).join(' '));
      if (--depth === 0) break;
    } else if (!token.startsWith('<') && token.trim()) text.push(token.trim().replaceAll('&amp;', '&').replaceAll('&#x27;', "'"));
  }
  if (values.length !== 4) throw new Error('Unexpected metric group shape: ' + JSON.stringify(values));
  return values;
}
