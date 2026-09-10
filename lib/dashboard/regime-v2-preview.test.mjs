import '../../scripts/trends-test-register.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';

let previewResolutions = 0;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'next/navigation') return { url: 'regime-designer-guard:next/navigation', shortCircuit: true };
    if (specifier === '@/components/dashboard/RegimeV2Preview') {
      previewResolutions++;
      return { url: 'regime-designer-guard:preview', shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === 'regime-designer-guard:next/navigation') return {
      format: 'module', source: "export function notFound() { throw new Error('DESIGN_PREVIEW_NOT_FOUND'); }", shortCircuit: true,
    };
    if (url === 'regime-designer-guard:preview') return {
      format: 'module', source: 'export function RegimeV2Preview(props) { return props; }', shortCircuit: true,
    };
    return nextLoad(url, context);
  },
});
const routes = [
  ['es', '../../app/(es)/internal/regime-v2/page.tsx'],
  ['en', '../../app/en/internal/regime-v2/page.tsx'],
];
for (const [locale, relative] of routes) {
  const url = new URL(relative, import.meta.url);
  const Page = (await import(url.href)).default;
  test(`${locale} places its development guard before the only dynamic preview import`, () => {
    const source = readFileSync(url, 'utf8');
    const guard = 'if (process.env.NODE_ENV !== "development") notFound();';
    const importExpression = 'await import("@/components/dashboard/RegimeV2Preview")';
    assert.equal(source.split(guard).length - 1, 1);
    assert.equal(source.split(importExpression).length - 1, 1);
    assert.ok(source.indexOf(guard) < source.indexOf(importExpression));
    assert.doesNotMatch(source, /import\s+[^;]+\s+from\s+["'][^"']*RegimeV2Preview["']/);
  });
  for (const environment of ['production', 'test']) test(`${locale} refuses ${environment} before resolving the preview module or query`, async () => {
    const before = process.env.NODE_ENV;
    const resolutionsBefore = previewResolutions;
    let queryReads = 0;
    process.env.NODE_ENV = environment;
    try {
      await assert.rejects(Page({ searchParams: { then() { queryReads++; throw Error('QUERY_READ_BEFORE_GUARD'); } } }), /DESIGN_PREVIEW_NOT_FOUND/);
      assert.equal(queryReads, 0);
      assert.equal(previewResolutions, resolutionsBefore);
    } finally { if (before === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = before; }
  });
  test(`${locale} permits the local development surface with explicit query unchanged`, async () => {
    const before = process.env.NODE_ENV; process.env.NODE_ENV = 'development';
    try {
      const query = { preview: 'v2', fixture: 'incomplete-unknown-calendar' };
      const element = await Page({ searchParams: Promise.resolve(query) });
      assert.equal(element.props.locale, locale); assert.deepEqual(element.props.query, query);
    } finally { if (before === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = before; }
  });
}
