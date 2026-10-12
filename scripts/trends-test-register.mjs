// JSX/CSS/Next link adapter for Node's native test runner, without a new SDK.
import './report-node-register.mjs';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only' || specifier === 'next/link' || specifier.endsWith('.module.css')) return { url: `trends-test:${specifier}`, shortCircuit: true };
    if (specifier.startsWith(".") && context.parentURL) {
      for (const extension of [".ts", ".tsx"]) {
        const url = new URL(specifier + extension, context.parentURL);
        if (existsSync(url)) return nextResolve(url.href, context);
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === 'trends-test:server-only') return { format: 'module', source: 'export {};', shortCircuit: true };
    if (url.endsWith('.module.css')) return { format: 'module', source: 'export default {page:"trends-page"};', shortCircuit: true };
    if (url === 'trends-test:next/link') return { format: 'module', source: `import React from ${JSON.stringify(new URL('../node_modules/react/index.js', import.meta.url).href)}; export default function Link(props) { return React.createElement('a', props); }`, shortCircuit: true };
    if (url.endsWith('.json')) return { format: 'module', source: `export default ${readFileSync(new URL(url), 'utf8')};`, shortCircuit: true };
    if (url.endsWith('.tsx')) return { format: 'module', source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText, shortCircuit: true };
    return nextLoad(url, context);
  },
});
